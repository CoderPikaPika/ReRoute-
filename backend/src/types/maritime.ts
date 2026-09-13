export const MARITIME_DATA_SOURCES = [
  'AISSTREAM',
  'OPEN_METEO',
  'UN_COMTRADE',
  'DATA_GOV_IN',
  'BALTIC',
  'ADMIN_IMPORT',
  'SIMULATION',
] as const;

export type MaritimeDataSource = (typeof MARITIME_DATA_SOURCES)[number];

export const VESSEL_CLASSES = ['HANDYSIZE', 'SUPRAMAX', 'PANAMAX', 'CAPESIZE', 'OTHER'] as const;
export type VesselClass = (typeof VESSEL_CLASSES)[number];

export const VESSEL_NAVIGATION_STATUSES = [
  'UNDER_WAY',
  'AT_ANCHOR',
  'MOORED',
  'AT_PORT',
  'UNKNOWN',
] as const;
export type VesselNavigationStatus = (typeof VESSEL_NAVIGATION_STATUSES)[number];

export const PORT_OPERATIONAL_STATUSES = ['OPERATIONAL', 'RESTRICTED', 'CLOSED', 'UNKNOWN'] as const;
export type PortOperationalStatus = (typeof PORT_OPERATIONAL_STATUSES)[number];

export const CONGESTION_LEVELS = ['LOW', 'MODERATE', 'HIGH', 'UNKNOWN'] as const;
export type CongestionLevel = (typeof CONGESTION_LEVELS)[number];

export const MARKET_RATE_TYPES = ['SPOT', 'TIME_CHARTER', 'FORWARD', 'BUNKER'] as const;
export type MarketRateType = (typeof MARKET_RATE_TYPES)[number];

export interface SourceMetadata {
  source: MaritimeDataSource;
  observedAt: Date;
  ingestedAt: Date;
  isEstimated: boolean;
  qualityStatus: 'FRESH' | 'STALE' | 'PARTIAL' | 'UNVERIFIED';
  sourceReference?: string;
}

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}
