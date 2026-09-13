import { Types } from 'mongoose';

import { MaritimePortModel, type MaritimePortDocument } from '../models/maritime-port.model';
import { MarineWeatherSnapshotModel, type MarineWeatherSnapshot, type MarineWeatherSnapshotDocument } from '../models/marine-weather-snapshot.model';
import { MarketObservationModel, type MarketObservationDocument } from '../models/market-observation.model';
import { PortObservationModel, type PortObservationDocument } from '../models/port-observation.model';
import { MaritimeVesselModel, type MaritimeVesselDocument } from '../models/vessel.model';
import { VesselPositionModel, type VesselPosition, type VesselPositionDocument } from '../models/vessel-position.model';
import type { MarketRateType, VesselClass } from '../types/maritime';

export class MaritimeRepository {
  public countPorts(): Promise<number> {
    return MaritimePortModel.countDocuments().exec();
  }

  public findPorts(options: { search?: string; limit: number }): Promise<MaritimePortDocument[]> {
    const filter = options.search
      ? { $or: [{ name: new RegExp(escapeRegex(options.search), 'i') }, { unlocode: new RegExp(escapeRegex(options.search), 'i') }, { country: new RegExp(escapeRegex(options.search), 'i') }] }
      : {};
    return MaritimePortModel.find(filter).sort({ name: 1 }).limit(options.limit).exec();
  }

  public findPortById(portId: string): Promise<MaritimePortDocument | null> {
    return MaritimePortModel.findById(portId).exec();
  }

  public findLatestPortObservations(portIds: Types.ObjectId[]): Promise<PortObservationDocument[]> {
    if (!portIds.length) return Promise.resolve([]);
    return PortObservationModel.aggregate<PortObservationDocument>([
      { $match: { portId: { $in: portIds } } },
      { $sort: { observedAt: -1 } },
      { $group: { _id: '$portId', observation: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$observation' } },
    ]).exec();
  }

  public findPortObservationHistory(portId: string, from: Date, to: Date): Promise<PortObservationDocument[]> {
    return PortObservationModel.find({ portId, observedAt: { $gte: from, $lte: to } })
      .sort({ observedAt: 1 })
      .exec();
  }

  public findLatestMarineWeather(portId: string): Promise<MarineWeatherSnapshotDocument | null> {
    return MarineWeatherSnapshotModel.findOne({ portId }).sort({ observedAt: -1 }).exec();
  }

  public createMarineWeather(snapshot: Omit<MarineWeatherSnapshot, 'ingestedAt'>): Promise<MarineWeatherSnapshotDocument> {
    return MarineWeatherSnapshotModel.create(snapshot);
  }

  public countVessels(): Promise<number> {
    return MaritimeVesselModel.countDocuments().exec();
  }

  public findVessels(options: { search?: string; vesselClass?: VesselClass }): Promise<MaritimeVesselDocument[]> {
    const filter: Record<string, unknown> = {};
    if (options.search) {
      const query = new RegExp(escapeRegex(options.search), 'i');
      filter.$or = [{ name: query }, { imo: query }, { mmsi: query }];
    }
    if (options.vesselClass) filter.vesselClass = options.vesselClass;
    return MaritimeVesselModel.find(filter).sort({ name: 1 }).exec();
  }

  public findVesselById(vesselId: string): Promise<MaritimeVesselDocument | null> {
    return MaritimeVesselModel.findById(vesselId).exec();
  }

  public upsertAisVessel(input: { mmsi: string; name?: string; observedAt: Date }): Promise<MaritimeVesselDocument> {
    return MaritimeVesselModel.findOneAndUpdate(
      { mmsi: input.mmsi },
      {
        $set: {
          name: input.name?.trim() || `AIS vessel ${input.mmsi}`,
          source: 'AISSTREAM',
          observedAt: input.observedAt,
        },
        $setOnInsert: { vesselClass: 'OTHER' },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    ).exec();
  }

  public findLatestVesselPositions(vesselIds: Types.ObjectId[]): Promise<VesselPositionDocument[]> {
    if (!vesselIds.length) return Promise.resolve([]);
    return VesselPositionModel.aggregate<VesselPositionDocument>([
      { $match: { vesselId: { $in: vesselIds } } },
      { $sort: { observedAt: -1 } },
      { $group: { _id: '$vesselId', position: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$position' } },
    ]).exec();
  }

  public findVesselTrack(vesselId: string, from: Date, to: Date, limit: number): Promise<VesselPositionDocument[]> {
    return VesselPositionModel.find({ vesselId, observedAt: { $gte: from, $lte: to } })
      .sort({ observedAt: 1 })
      .limit(limit)
      .exec();
  }

  public createVesselPosition(position: Omit<VesselPosition, 'ingestedAt'>): Promise<VesselPositionDocument> {
    return VesselPositionModel.create(position);
  }

  public findLatestMarketObservation(filters: { cargoType?: string; vesselClass?: VesselClass; rateType?: MarketRateType; unit?: 'USD_PER_DAY' | 'USD_PER_MT' }): Promise<MarketObservationDocument | null> {
    const filter: Record<string, unknown> = {};
    if (filters.cargoType) filter.cargoType = filters.cargoType;
    if (filters.vesselClass) filter.vesselClass = filters.vesselClass;
    if (filters.rateType) filter.rateType = filters.rateType;
    if (filters.unit) filter.unit = filters.unit;
    return MarketObservationModel.findOne(filter).sort({ asOf: -1 }).exec();
  }

  public findMarketSeries(filters: { cargoType?: string; vesselClass?: VesselClass; rateType?: MarketRateType; unit?: 'USD_PER_DAY' | 'USD_PER_MT'; from: Date; to: Date; limit: number }): Promise<MarketObservationDocument[]> {
    const filter: Record<string, unknown> = { asOf: { $gte: filters.from, $lte: filters.to } };
    if (filters.cargoType) filter.cargoType = filters.cargoType;
    if (filters.vesselClass) filter.vesselClass = filters.vesselClass;
    if (filters.rateType) filter.rateType = filters.rateType;
    if (filters.unit) filter.unit = filters.unit;
    return MarketObservationModel.find(filter).sort({ asOf: 1 }).limit(filters.limit).exec();
  }

  public insertMarketObservations(records: Array<Omit<import('../models/market-observation.model').MarketObservation, 'ingestedAt'>>): Promise<MarketObservationDocument[]> {
    return MarketObservationModel.insertMany(records);
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const maritimeRepository = new MaritimeRepository();
