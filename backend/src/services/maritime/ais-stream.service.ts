import WebSocket, { type RawData } from 'ws';

import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { maritimeRepository } from '../../repositories/maritime.repository';
import type { VesselNavigationStatus } from '../../types/maritime';

const RECONNECT_DELAY_MS = 5000;
const MINIMUM_PERSIST_INTERVAL_MS = 60 * 1000;

interface AisEnvelope {
  MessageType?: string;
  Error?: string;
  MetaData?: { MMSI?: number | string; ShipName?: string; Latitude?: number; Longitude?: number };
  Message?: {
    PositionReport?: {
      UserID?: number | string;
      Latitude?: number;
      Longitude?: number;
      Sog?: number;
      Cog?: number;
      TrueHeading?: number;
      NavigationalStatus?: number;
      PositionAccuracy?: boolean;
    };
  };
}

export class AisStreamService {
  private socket?: WebSocket;
  private reconnectTimer?: NodeJS.Timeout;
  private started = false;
  private status: 'DISABLED' | 'CONNECTING' | 'CONNECTED' | 'MISCONFIGURED' | 'RECONNECTING' | 'ERROR' = 'DISABLED';
  private lastPersistedByMmsi = new Map<string, { timestamp: number; latitude: number; longitude: number }>();
  private receivedMessages = 0;
  private savedPositions = 0;
  private lastMessageAt?: Date;
  private lastMessageType?: string;
  private lastError?: string;

  public start(): void {
    this.started = true;
    if (!env.AISSTREAM_API_KEY) {
      this.status = 'DISABLED';
      logger.info('AIS stream is disabled because no server-side API key is configured');
      return;
    }
    this.connect();
  }

  public stop(): void {
    this.started = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.socket?.close();
    this.socket = undefined;
    this.status = 'DISABLED';
  }

  public getStatus() {
    return {
      status: this.status,
      configured: Boolean(env.AISSTREAM_API_KEY),
      provider: 'AISSTREAM',
      persistenceThrottleSeconds: MINIMUM_PERSIST_INTERVAL_MS / 1000,
      receivedMessages: this.receivedMessages,
      savedPositions: this.savedPositions,
      lastMessageAt: this.lastMessageAt?.toISOString() ?? null,
      lastMessageType: this.lastMessageType ?? null,
      lastError: this.lastError ?? null,
    };
  }

  private connect(): void {
    const subscription = this.subscription();
    if (!subscription) return;

    this.status = 'CONNECTING';
    const socket = new WebSocket('wss://stream.aisstream.io/v0/stream', { perMessageDeflate: true });
    this.socket = socket;

    socket.on('open', () => {
      this.status = 'CONNECTED';
      this.lastError = undefined;
      socket.send(JSON.stringify(subscription));
      logger.info({ boundingBoxes: subscription.BoundingBoxes.length, mmsiFilterCount: subscription.FilterShipMMSI?.length ?? 0 }, 'AIS stream connected');
    });
    socket.on('message', (raw) => {
      void this.consume(raw);
    });
    socket.on('error', (error) => {
      logger.warn({ err: error }, 'AIS stream connection error');
    });
    socket.on('close', () => {
      if (!this.started) return;
      this.status = 'RECONNECTING';
      this.scheduleReconnect();
    });
  }

  private subscription(): { APIKey: string; BoundingBoxes: number[][][]; FilterShipMMSI?: string[]; FilterMessageTypes: string[] } | undefined {
    if (!env.AISSTREAM_API_KEY) return undefined;
    const boundingBoxes = parseBoundingBoxes(env.AISSTREAM_BOUNDING_BOXES);
    if (!boundingBoxes) {
      this.status = 'MISCONFIGURED';
      logger.error('AIS stream is disabled because AISSTREAM_BOUNDING_BOXES is missing or invalid');
      return undefined;
    }
    const mmsi = env.AISSTREAM_MMSI_FILTER?.split(',').map((value) => value.trim()).filter((value) => /^\d{9}$/.test(value));
    return {
      APIKey: env.AISSTREAM_API_KEY,
      BoundingBoxes: boundingBoxes,
      ...(mmsi?.length ? { FilterShipMMSI: mmsi.slice(0, 200) } : {}),
      FilterMessageTypes: ['PositionReport'],
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (this.started) this.connect();
    }, RECONNECT_DELAY_MS);
  }

  private async consume(raw: RawData): Promise<void> {
    try {
      const message = JSON.parse(raw.toString()) as AisEnvelope;
      this.receivedMessages += 1;
      this.lastMessageAt = new Date();
      this.lastMessageType = message.MessageType ?? (message.Error ? 'Error' : 'Unknown');
      if (message.Error) {
        this.status = 'ERROR';
        this.lastError = message.Error.slice(0, 300);
        logger.error({ aisError: this.lastError }, 'AIS stream rejected the subscription');
        this.socket?.close();
        return;
      }
      if (message.MessageType !== 'PositionReport') return;

      const position = message.Message?.PositionReport;
      const mmsi = String(message.MetaData?.MMSI ?? position?.UserID ?? '');
      const latitude = message.MetaData?.Latitude ?? position?.Latitude;
      const longitude = message.MetaData?.Longitude ?? position?.Longitude;
      if (!/^\d{9}$/.test(mmsi) || typeof latitude !== 'number' || typeof longitude !== 'number' || !isCoordinate(latitude, longitude)) return;

      if (this.shouldSkip(mmsi, latitude, longitude)) return;
      const observedAt = new Date();
      const vessel = await maritimeRepository.upsertAisVessel({ mmsi, name: message.MetaData?.ShipName, observedAt });
      await maritimeRepository.createVesselPosition({
        vesselId: vessel._id,
        location: { type: 'Point', coordinates: [longitude, latitude] },
        speedKnots: finite(position?.Sog),
        courseDegrees: degrees(position?.Cog),
        headingDegrees: degrees(position?.TrueHeading),
        navigationStatus: navigationStatus(position?.NavigationalStatus),
        source: 'AISSTREAM',
        isEstimated: false,
        qualityStatus: position?.PositionAccuracy === false ? 'PARTIAL' : 'FRESH',
        sourceReceivedAt: observedAt,
        observedAt,
      });
      this.lastPersistedByMmsi.set(mmsi, { timestamp: observedAt.getTime(), latitude, longitude });
      this.savedPositions += 1;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message.slice(0, 300) : 'Unable to process an AIS stream message';
      logger.warn({ err: error }, 'Unable to process an AIS position message');
    }
  }

  private shouldSkip(mmsi: string, latitude: number, longitude: number): boolean {
    const previous = this.lastPersistedByMmsi.get(mmsi);
    if (!previous) return false;
    const elapsed = Date.now() - previous.timestamp;
    const moved = Math.abs(previous.latitude - latitude) > 0.002 || Math.abs(previous.longitude - longitude) > 0.002;
    return elapsed < MINIMUM_PERSIST_INTERVAL_MS && !moved;
  }
}

function parseBoundingBoxes(value: string | undefined): number[][][] | undefined {
  if (!value) return undefined;
  const simpleCoordinates = value.split(',').map((coordinate) => Number(coordinate.trim()));
  if (simpleCoordinates.length === 4 && simpleCoordinates.every(Number.isFinite)) {
    const [southLatitude, westLongitude, northLatitude, eastLongitude] = simpleCoordinates;
    const simpleBox = [[[southLatitude, westLongitude], [northLatitude, eastLongitude]]];
    return isValidBoundingBoxes(simpleBox) ? simpleBox : undefined;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return isValidBoundingBoxes(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isValidBoundingBoxes(value: unknown): value is number[][][] {
  return Array.isArray(value) && value.length > 0 && value.every((box) => Array.isArray(box) && box.length === 2 && box.every((point) => Array.isArray(point) && point.length === 2 && typeof point[0] === 'number' && typeof point[1] === 'number' && point[0] >= -90 && point[0] <= 90 && point[1] >= -180 && point[1] <= 180));
}

function isCoordinate(latitude: unknown, longitude: unknown): latitude is number {
  return typeof latitude === 'number' && typeof longitude === 'number' && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function degrees(value: unknown): number | undefined {
  const parsed = finite(value);
  return parsed !== undefined && parsed >= 0 && parsed <= 360 ? parsed : undefined;
}

function navigationStatus(value: number | undefined): VesselNavigationStatus {
  if (value === 0 || value === 8) return 'UNDER_WAY';
  if (value === 1) return 'AT_ANCHOR';
  if (value === 5) return 'MOORED';
  return 'UNKNOWN';
}

export const aisStreamService = new AisStreamService();
