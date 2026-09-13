import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error';
import type { MaritimePortDocument } from '../../models/maritime-port.model';
import type { MarketObservationDocument } from '../../models/market-observation.model';
import type { MarketObservation } from '../../models/market-observation.model';
import type { PortObservationDocument } from '../../models/port-observation.model';
import type { MaritimeVesselDocument } from '../../models/vessel.model';
import type { VesselPositionDocument } from '../../models/vessel-position.model';
import { maritimeRepository } from '../../repositories/maritime.repository';
import type { MarketRateType, VesselClass, VesselNavigationStatus } from '../../types/maritime';

export class MaritimeIntelligenceService {
  public async dashboard(): Promise<unknown> {
    const [ports, vessels, currentMarket] = await Promise.all([
      maritimeRepository.findPorts({ limit: 8 }),
      maritimeRepository.findVessels({}),
      maritimeRepository.findLatestMarketObservation({}),
    ]);
    const [portObservations, positions] = await Promise.all([
      maritimeRepository.findLatestPortObservations(ports.map((port) => port._id)),
      maritimeRepository.findLatestVesselPositions(vessels.map((vessel) => vessel._id)),
    ]);

    const portObservationById = indexById(portObservations, (item) => item.portId);
    const positionByVesselId = indexById(positions, (item) => item.vesselId);
    const vesselViews = vessels.slice(0, 8).map((vessel) => this.toVesselView(vessel, positionByVesselId.get(vessel.id)));

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        trackedVessels: vessels.length,
        operationalPorts: ports.filter((port) => port.operationalStatus === 'OPERATIONAL').length,
        latestMarketRate: currentMarket ? this.toMarketView(currentMarket) : null,
      },
      vessels: vesselViews,
      ports: ports.map((port) => this.toPortView(port, portObservationById.get(port.id))),
      dataStatus: {
        vesselPositions: latestTimestamp(positions),
        portObservations: latestTimestamp(portObservations),
        marketObservations: currentMarket?.asOf.toISOString() ?? null,
      },
    };
  }

  public async listVessels(options: { search?: string; vesselClass?: VesselClass; status?: VesselNavigationStatus; page: number; limit: number }) {
    const vessels = await maritimeRepository.findVessels(options);
    const positions = await maritimeRepository.findLatestVesselPositions(vessels.map((vessel) => vessel._id));
    const positionByVesselId = indexById(positions, (item) => item.vesselId);
    const filtered = options.status
      ? vessels.filter((vessel) => positionByVesselId.get(vessel.id)?.navigationStatus === options.status)
      : vessels;
    const start = (options.page - 1) * options.limit;

    return {
      items: filtered.slice(start, start + options.limit).map((vessel) => this.toVesselView(vessel, positionByVesselId.get(vessel.id))),
      pagination: {
        page: options.page,
        limit: options.limit,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / options.limit)),
      },
    };
  }

  public async getVessel(vesselId: string) {
    const vessel = await maritimeRepository.findVesselById(vesselId);
    if (!vessel) throw new AppError(404, 'NOT_FOUND', 'Vessel not found');
    const [position] = await maritimeRepository.findLatestVesselPositions([vessel._id]);
    return this.toVesselView(vessel, position);
  }

  public async vesselTrack(vesselId: string, from: Date, to: Date, limit: number) {
    const vessel = await maritimeRepository.findVesselById(vesselId);
    if (!vessel) throw new AppError(404, 'NOT_FOUND', 'Vessel not found');
    const positions = await maritimeRepository.findVesselTrack(vesselId, from, to, limit);
    return {
      vesselId: vessel.id,
      from: from.toISOString(),
      to: to.toISOString(),
      points: positions.map((position) => ({
        longitude: position.location.coordinates[0],
        latitude: position.location.coordinates[1],
        speedKnots: position.speedKnots ?? null,
        courseDegrees: position.courseDegrees ?? null,
        headingDegrees: position.headingDegrees ?? null,
        navigationStatus: position.navigationStatus,
        observedAt: position.observedAt.toISOString(),
        source: position.source,
        isEstimated: position.isEstimated,
        qualityStatus: position.qualityStatus,
      })),
    };
  }

  public async listPorts(search: string | undefined, limit: number) {
    const ports = await maritimeRepository.findPorts({ search, limit });
    const observations = await maritimeRepository.findLatestPortObservations(ports.map((port) => port._id));
    const observationByPortId = indexById(observations, (item) => item.portId);
    return ports.map((port) => this.toPortView(port, observationByPortId.get(port.id)));
  }

  public async getPort(portId: string) {
    const port = await maritimeRepository.findPortById(portId);
    if (!port) throw new AppError(404, 'NOT_FOUND', 'Port not found');
    const [observation] = await maritimeRepository.findLatestPortObservations([port._id]);
    return this.toPortView(port, observation);
  }

  public async portHistory(portId: string, from: Date, to: Date) {
    const port = await maritimeRepository.findPortById(portId);
    if (!port) throw new AppError(404, 'NOT_FOUND', 'Port not found');
    const observations = await maritimeRepository.findPortObservationHistory(portId, from, to);
    return observations.map((observation) => ({
      observedAt: observation.observedAt.toISOString(),
      congestionLevel: observation.congestionLevel,
      waitingVessels: observation.waitingVessels ?? null,
      anchoredVessels: observation.anchoredVessels ?? null,
      berthOccupancyPercent: observation.berthOccupancyPercent ?? null,
      averageWaitDays: observation.averageWaitDays ?? null,
      averageTurnaroundDays: observation.averageTurnaroundDays ?? null,
      source: observation.source,
      isEstimated: observation.isEstimated,
      qualityStatus: observation.qualityStatus,
    }));
  }

  public async marketSeries(filters: { cargoType?: string; vesselClass?: VesselClass; rateType?: MarketRateType; unit?: 'USD_PER_DAY' | 'USD_PER_MT'; from: Date; to: Date; limit: number }) {
    const records = await maritimeRepository.findMarketSeries(filters);
    return records.map((record) => this.toMarketView(record));
  }

  public async importMarketObservations(records: Array<Omit<MarketObservation, 'ingestedAt'>>) {
    const imported = await maritimeRepository.insertMarketObservations(records);
    return {
      imported: imported.length,
      firstAsOf: imported.length ? imported.reduce((first, item) => item.asOf < first ? item.asOf : first, imported[0].asOf).toISOString() : null,
      lastAsOf: imported.length ? imported.reduce((last, item) => item.asOf > last ? item.asOf : last, imported[0].asOf).toISOString() : null,
    };
  }

  private toVesselView(vessel: MaritimeVesselDocument, position?: VesselPositionDocument) {
    return {
      id: vessel.id,
      name: vessel.name,
      imo: vessel.imo ?? null,
      mmsi: vessel.mmsi ?? null,
      vesselClass: vessel.vesselClass,
      deadweightTonnes: vessel.deadweightTonnes ?? null,
      dimensions: {
        lengthOverallMeters: vessel.lengthOverallMeters ?? null,
        beamMeters: vessel.beamMeters ?? null,
        maxDraftMeters: vessel.maxDraftMeters ?? null,
      },
      flag: vessel.flag ?? null,
      operator: vessel.operator ?? null,
      position: position
        ? {
            longitude: position.location.coordinates[0],
            latitude: position.location.coordinates[1],
            speedKnots: position.speedKnots ?? null,
            courseDegrees: position.courseDegrees ?? null,
            headingDegrees: position.headingDegrees ?? null,
            navigationStatus: position.navigationStatus,
            observedAt: position.observedAt.toISOString(),
            source: position.source,
            isEstimated: position.isEstimated,
            qualityStatus: position.qualityStatus,
          }
        : null,
      source: vessel.source,
      observedAt: vessel.observedAt.toISOString(),
    };
  }

  private toPortView(port: MaritimePortDocument, observation?: PortObservationDocument) {
    return {
      id: port.id,
      name: port.name,
      unlocode: port.unlocode,
      country: port.country,
      region: port.region ?? null,
      latitude: port.latitude,
      longitude: port.longitude,
      constraints: {
        maxDraftMeters: port.maxDraftMeters ?? null,
        maxLoaMeters: port.maxLoaMeters ?? null,
        maxBeamMeters: port.maxBeamMeters ?? null,
        channelDepthMeters: port.channelDepthMeters ?? null,
        berthCount: port.berthCount ?? null,
      },
      handlingCapabilities: port.handlingCapabilities,
      operationalStatus: observation?.operationalStatus ?? port.operationalStatus,
      observation: observation
        ? {
            congestionLevel: observation.congestionLevel,
            waitingVessels: observation.waitingVessels ?? null,
            anchoredVessels: observation.anchoredVessels ?? null,
            berthOccupancyPercent: observation.berthOccupancyPercent ?? null,
            averageWaitDays: observation.averageWaitDays ?? null,
            averageTurnaroundDays: observation.averageTurnaroundDays ?? null,
            windSpeedKnots: observation.windSpeedKnots ?? null,
            visibilityKm: observation.visibilityKm ?? null,
            source: observation.source,
            observedAt: observation.observedAt.toISOString(),
            isEstimated: observation.isEstimated,
            qualityStatus: observation.qualityStatus,
          }
        : null,
      source: port.source,
      observedAt: port.observedAt.toISOString(),
    };
  }

  private toMarketView(record: MarketObservationDocument) {
    return {
      id: record.id,
      market: record.market,
      cargoType: record.cargoType,
      vesselClass: record.vesselClass,
      rateType: record.rateType,
      value: record.value,
      currency: record.currency,
      unit: record.unit,
      asOf: record.asOf.toISOString(),
      availableAt: record.availableAt.toISOString(),
      source: record.source,
      sourceReference: record.sourceReference ?? null,
      isEstimated: record.isEstimated,
      qualityStatus: record.qualityStatus,
    };
  }
}

function indexById<T>(items: T[], getId: (item: T) => Types.ObjectId): Map<string, T> {
  return new Map(items.map((item) => [getId(item).toString(), item]));
}

function latestTimestamp<T extends { observedAt: Date }>(items: T[]): string | null {
  if (!items.length) return null;
  return items.reduce((latest, item) => (item.observedAt > latest ? item.observedAt : latest), items[0].observedAt).toISOString();
}

export const maritimeIntelligenceService = new MaritimeIntelligenceService();
