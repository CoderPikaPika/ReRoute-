import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/env';
import { MarketObservationModel } from '../models/market-observation.model';
import { MaritimePortModel } from '../models/maritime-port.model';
import { PortObservationModel } from '../models/port-observation.model';
import { MaritimeVesselModel } from '../models/vessel.model';
import { VesselPositionModel, type VesselPosition } from '../models/vessel-position.model';

const ports = [
  { name: 'Hay Point', unlocode: 'AUHPT', country: 'Australia', region: 'Queensland', latitude: -21.271, longitude: 149.295, maxDraftMeters: 16, maxLoaMeters: 300, berthCount: 4, handlingCapabilities: ['Thermal coal', 'Metallurgical coal'], operationalStatus: 'OPERATIONAL' as const },
  { name: 'Newcastle', unlocode: 'AUNTL', country: 'Australia', region: 'New South Wales', latitude: -32.928, longitude: 151.78, maxDraftMeters: 15.2, maxLoaMeters: 300, berthCount: 8, handlingCapabilities: ['Thermal coal', 'Metallurgical coal'], operationalStatus: 'OPERATIONAL' as const },
  { name: 'Paradip', unlocode: 'INPRT', country: 'India', region: 'Odisha', latitude: 20.264, longitude: 86.67, maxDraftMeters: 14.5, maxLoaMeters: 289, berthCount: 25, handlingCapabilities: ['Thermal coal', 'Iron ore', 'Fertilizer'], operationalStatus: 'OPERATIONAL' as const },
  { name: 'Visakhapatnam', unlocode: 'INVTZ', country: 'India', region: 'Andhra Pradesh', latitude: 17.686, longitude: 83.293, maxDraftMeters: 16.5, maxLoaMeters: 300, berthCount: 24, handlingCapabilities: ['Coal', 'Iron ore', 'Containers'], operationalStatus: 'OPERATIONAL' as const },
  { name: 'Gangavaram', unlocode: 'INGGV', country: 'India', region: 'Andhra Pradesh', latitude: 17.623, longitude: 83.233, maxDraftMeters: 21, maxLoaMeters: 315, berthCount: 9, handlingCapabilities: ['Coal', 'Iron ore'], operationalStatus: 'OPERATIONAL' as const },
  { name: 'Gopalpur', unlocode: 'INGOP', country: 'India', region: 'Odisha', latitude: 19.278, longitude: 84.894, maxDraftMeters: 14.5, maxLoaMeters: 250, berthCount: 3, handlingCapabilities: ['Coal', 'Limestone'], operationalStatus: 'OPERATIONAL' as const },
  { name: 'Dhamra', unlocode: 'INDHM', country: 'India', region: 'Odisha', latitude: 20.781, longitude: 86.948, maxDraftMeters: 18, maxLoaMeters: 300, berthCount: 12, handlingCapabilities: ['Coal', 'Iron ore', 'Fertilizer'], operationalStatus: 'OPERATIONAL' as const },
  { name: 'Haldia', unlocode: 'INHAL', country: 'India', region: 'West Bengal', latitude: 22.025, longitude: 88.055, maxDraftMeters: 8.5, maxLoaMeters: 210, berthCount: 14, handlingCapabilities: ['Coal', 'Containers', 'Fertilizer'], operationalStatus: 'OPERATIONAL' as const },
];

const vessels = [
  { name: 'MV Ocean Pride', mmsi: '900000001', imo: '9000001', vesselClass: 'PANAMAX' as const, deadweightTonnes: 82341, latitude: -6.2, longitude: 100.1, speedKnots: 12.4, navigationStatus: 'UNDER_WAY' as const },
  { name: 'Cape Harmony', mmsi: '900000002', imo: '9000002', vesselClass: 'CAPESIZE' as const, deadweightTonnes: 180000, latitude: -18.4, longitude: 112.3, speedKnots: 10.8, navigationStatus: 'AT_ANCHOR' as const },
  { name: 'Eastern Star', mmsi: '900000003', imo: '9000003', vesselClass: 'SUPRAMAX' as const, deadweightTonnes: 56743, latitude: -10.2, longitude: 91.6, speedKnots: 11.2, navigationStatus: 'UNDER_WAY' as const },
  { name: 'Sea Voyager', mmsi: '900000004', imo: '9000004', vesselClass: 'HANDYSIZE' as const, deadweightTonnes: 32500, latitude: 7.8, longitude: 82.1, speedKnots: 0, navigationStatus: 'AT_PORT' as const },
  { name: 'Northern Light', mmsi: '900000005', imo: '9000005', vesselClass: 'PANAMAX' as const, deadweightTonnes: 79000, latitude: -14.4, longitude: 107.2, speedKnots: 12.1, navigationStatus: 'UNDER_WAY' as const },
  { name: 'Iron Horizon', mmsi: '900000006', imo: '9000006', vesselClass: 'CAPESIZE' as const, deadweightTonnes: 176000, latitude: -25.3, longitude: 150.2, speedKnots: 9.6, navigationStatus: 'UNDER_WAY' as const },
];

async function seedMaritime(): Promise<void> {
  if (env.NODE_ENV === 'production') throw new Error('Demo seed scripts cannot run in production');
  await connectDatabase();
  const now = new Date();

  await Promise.all(ports.map((port) => MaritimePortModel.updateOne(
    { unlocode: port.unlocode },
    { $set: { ...port, source: 'SIMULATION', sourceReference: 'seed:maritime', observedAt: now } },
    { upsert: true, runValidators: true },
  )));
  const savedPorts = await MaritimePortModel.find({ unlocode: { $in: ports.map((port) => port.unlocode) } }).exec();
  const portByCode = new Map(savedPorts.map((port) => [port.unlocode, port]));

  await PortObservationModel.deleteMany({ source: 'SIMULATION', portId: { $in: savedPorts.map((port) => port._id) } }).exec();
  await PortObservationModel.insertMany(savedPorts.map((port, index) => ({
    portId: port._id,
    operationalStatus: 'OPERATIONAL',
    congestionLevel: index === 2 || index === 6 ? 'MODERATE' : 'LOW',
    waitingVessels: 4 + index * 2,
    anchoredVessels: 2 + (index % 4),
    berthOccupancyPercent: 52 + index * 4,
    averageWaitDays: Number((1.1 + index * 0.22).toFixed(1)),
    averageTurnaroundDays: Number((1.8 + index * 0.15).toFixed(1)),
    source: 'SIMULATION',
    sourceReference: 'seed:maritime',
    isEstimated: true,
    qualityStatus: 'UNVERIFIED',
    observedAt: now,
  })));

  await Promise.all(vessels.map((vessel) => MaritimeVesselModel.updateOne(
    { mmsi: vessel.mmsi },
    { $set: { name: vessel.name, imo: vessel.imo, mmsi: vessel.mmsi, vesselClass: vessel.vesselClass, deadweightTonnes: vessel.deadweightTonnes, source: 'SIMULATION', sourceReference: 'seed:maritime', observedAt: now } },
    { upsert: true, runValidators: true },
  )));
  const savedVessels = await MaritimeVesselModel.find({ mmsi: { $in: vessels.map((vessel) => vessel.mmsi) } }).exec();
  const vesselByMmsi = new Map(savedVessels.map((vessel) => [vessel.mmsi, vessel]));
  await VesselPositionModel.deleteMany({ source: 'SIMULATION', vesselId: { $in: savedVessels.map((vessel) => vessel._id) } }).exec();
  const simulatedPositions: Array<Omit<VesselPosition, 'ingestedAt'>> = vessels.flatMap((vessel): Array<Omit<VesselPosition, 'ingestedAt'>> => {
    const vesselId = vesselByMmsi.get(vessel.mmsi)!._id;
    if (vessel.navigationStatus !== 'UNDER_WAY') {
      return [{ vesselId, location: { type: 'Point' as const, coordinates: [vessel.longitude, vessel.latitude] }, speedKnots: vessel.speedKnots, courseDegrees: 45, headingDegrees: 45, navigationStatus: vessel.navigationStatus, source: 'SIMULATION' as const, isEstimated: true, qualityStatus: 'UNVERIFIED' as const, observedAt: now }];
    }
    return Array.from({ length: 7 }, (_, index) => {
      const ageHours = (6 - index) * 8;
      const progress = index / 6;
      return {
        vesselId,
        location: { type: 'Point' as const, coordinates: [Number((vessel.longitude - (1 - progress) * 7.2).toFixed(4)), Number((vessel.latitude - (1 - progress) * 3.8).toFixed(4))] },
        speedKnots: vessel.speedKnots,
        courseDegrees: 45,
        headingDegrees: 45,
        navigationStatus: vessel.navigationStatus,
        source: 'SIMULATION' as const,
        isEstimated: true,
        qualityStatus: 'UNVERIFIED' as const,
        observedAt: new Date(now.getTime() - ageHours * 60 * 60 * 1000),
      };
    });
  });
  await VesselPositionModel.insertMany(simulatedPositions);

  await MarketObservationModel.deleteMany({ source: 'SIMULATION' }).exec();
  const marketRecords = [];
  const classes = [
    { vesselClass: 'HANDYSIZE' as const, base: 14200 },
    { vesselClass: 'SUPRAMAX' as const, base: 17200 },
    { vesselClass: 'PANAMAX' as const, base: 21300 },
    { vesselClass: 'CAPESIZE' as const, base: 29400 },
  ];
  for (let month = 6; month >= 0; month -= 1) {
    const asOf = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - month, 1));
    for (const item of classes) {
      marketRecords.push({
        market: 'Australia to India East Coast',
        originPortId: portByCode.get('AUHPT')!._id,
        destinationPortId: portByCode.get('INPRT')!._id,
        cargoType: 'Thermal coal',
        vesselClass: item.vesselClass,
        rateType: 'TIME_CHARTER' as const,
        value: item.base + (6 - month) * 350 + (month % 2 ? -180 : 120),
        currency: 'USD',
        unit: 'USD_PER_DAY' as const,
        source: 'SIMULATION' as const,
        sourceReference: 'seed:maritime',
        isEstimated: true,
        qualityStatus: 'UNVERIFIED' as const,
        asOf,
        availableAt: asOf,
      });
    }
  }
  for (const item of classes) {
    marketRecords.push({
      market: 'Australia to India East Coast', originPortId: portByCode.get('AUHPT')!._id, destinationPortId: portByCode.get('INPRT')!._id,
      cargoType: 'Thermal coal', vesselClass: item.vesselClass, rateType: 'SPOT' as const, value: Number((item.base / 1000).toFixed(2)), currency: 'USD', unit: 'USD_PER_MT' as const,
      source: 'SIMULATION' as const, sourceReference: 'seed:maritime', isEstimated: true, qualityStatus: 'UNVERIFIED' as const, asOf: now, availableAt: now,
    });
    marketRecords.push({
      market: 'Marine fuel proxy', originPortId: portByCode.get('AUHPT')!._id, destinationPortId: portByCode.get('INPRT')!._id,
      cargoType: 'Thermal coal', vesselClass: item.vesselClass, rateType: 'BUNKER' as const, value: 92, currency: 'USD', unit: 'USD_PER_MT' as const,
      source: 'SIMULATION' as const, sourceReference: 'seed:maritime', isEstimated: true, qualityStatus: 'UNVERIFIED' as const, asOf: now, availableAt: now,
    });
  }
  await MarketObservationModel.insertMany(marketRecords);

  console.log(`Maritime demo data ready: ${savedPorts.length} ports, ${savedVessels.length} vessels, ${marketRecords.length} rate observations.`);
}

void seedMaritime()
  .catch((error: unknown) => { console.error('Maritime seed failed:', error); process.exitCode = 1; })
  .finally(async () => { await disconnectDatabase(); });
