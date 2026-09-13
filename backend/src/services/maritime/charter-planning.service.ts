import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error';
import { CharterPlanModel, type CharterPlanStatus } from '../../models/charter-plan.model';
import { maritimeRepository } from '../../repositories/maritime.repository';
import type { MaritimePortDocument } from '../../models/maritime-port.model';
import type { MaritimeVesselDocument } from '../../models/vessel.model';
import type { VesselClass, VesselNavigationStatus } from '../../types/maritime';

type CharterInput = {
  requestedBy: string;
  cargoType: string;
  quantityMt: number;
  originPortId: string;
  destinationPortId: string;
  preferredVesselClass: VesselClass;
  targetLoadingDate: Date;
};

const profileByClass: Record<VesselClass, { dwt: number; draft: number; loa: number }> = {
  HANDYSIZE: { dwt: 38_000, draft: 10.5, loa: 180 },
  SUPRAMAX: { dwt: 58_000, draft: 12.2, loa: 200 },
  PANAMAX: { dwt: 75_000, draft: 13.8, loa: 225 },
  CAPESIZE: { dwt: 180_000, draft: 17.5, loa: 290 },
  OTHER: { dwt: 50_000, draft: 11.5, loa: 195 },
};

export class CharterPlanningService {
  public async listPlans(requestedBy: string, limit: number) {
    const plans = await CharterPlanModel.find({ requestedBy: new Types.ObjectId(requestedBy) })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    return plans.map((plan) => ({
      id: plan._id.toString(),
      status: plan.status,
      cargoType: plan.cargoType,
      quantityMt: plan.quantityMt,
      originPortId: plan.originPortId.toString(),
      destinationPortId: plan.destinationPortId.toString(),
      preferredVesselClass: plan.preferredVesselClass,
      selectedVesselId: plan.selectedVesselId.toString(),
      targetLoadingDate: plan.targetLoadingDate.toISOString(),
      estimatedTransitDays: plan.estimatedTransitDays,
      estimatedDailyRateUsd: plan.estimatedDailyRateUsd,
      estimatedCharterCostUsd: plan.estimatedCharterCostUsd,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    }));
  }

  public async getOptions(input: CharterInput) {
    if (input.originPortId === input.destinationPortId) throw new AppError(400, 'VALIDATION_ERROR', 'Origin and destination ports must be different.');
    const [latestForecast, originPort, destinationPort, vessels] = await Promise.all([
      maritimeRepository.findLatestForecastRun(input.requestedBy),
      maritimeRepository.findPortById(input.originPortId),
      maritimeRepository.findPortById(input.destinationPortId),
      maritimeRepository.findVessels({}),
    ]);
    if (!latestForecast) throw new AppError(409, 'FORECAST_REQUIRED', 'Run Freight Forecast before creating a charter plan.');
    if (!originPort || !destinationPort) throw new AppError(404, 'NOT_FOUND', 'One or more selected ports were not found.');
    if (originPort.operationalStatus !== 'OPERATIONAL' || destinationPort.operationalStatus !== 'OPERATIONAL') {
      throw new AppError(409, 'PORT_NOT_OPERATIONAL', 'A selected port is not operational. Choose another route.');
    }

    const [positions, portObservations] = await Promise.all([
      maritimeRepository.findLatestVesselPositions(vessels.map((vessel) => vessel._id)),
      maritimeRepository.findLatestPortObservations([originPort._id, destinationPort._id]),
    ]);
    const positionByVesselId = new Map(positions.map((position) => [position.vesselId.toString(), position]));
    const observationByPortId = new Map(portObservations.map((observation) => [observation.portId.toString(), observation]));
    const originObservation = observationByPortId.get(originPort.id);
    const destinationObservation = observationByPortId.get(destinationPort.id);
    const distanceNm = nauticalDistance(originPort, destinationPort);
    const vesselClasses = [...new Set(vessels.map((vessel) => vessel.vesselClass))];
    const marketRates = await Promise.all(vesselClasses.map(async (vesselClass) => [
      vesselClass,
      await maritimeRepository.findLatestMarketObservation({
        cargoType: resolveMarketCargo(input.cargoType), vesselClass, rateType: 'TIME_CHARTER', unit: 'USD_PER_DAY',
      }),
    ] as const));
    const marketRateByClass = new Map(marketRates);
    const modelRate = latestForecast.forecast.find((point) => Math.round((point.targetAt.getTime() - latestForecast.createdAt.getTime()) / 86_400_000) === 30)?.p50
      ?? latestForecast.forecast[0]?.p50
      ?? latestForecast.historical.at(-1)?.value
      ?? 0;

    const options = vessels.map((vessel) => {
      const profile = profileFor(vessel);
      const position = positionByVesselId.get(vessel.id);
      const compatibility = compatibleWithPorts(profile, originPort, destinationPort);
      const capacityRatio = input.quantityMt / profile.dwt;
      const cargoFits = capacityRatio <= 0.92;
      const currentSpeed = position?.speedKnots && position.speedKnots > 1 ? position.speedKnots : 11.5;
      const portWaitDays = (originObservation?.averageWaitDays ?? 0) + (destinationObservation?.averageWaitDays ?? 0);
      const transitDays = Math.ceil(distanceNm / (currentSpeed * 24) + portWaitDays + 1);
      const marketRate = marketRateByClass.get(vessel.vesselClass);
      const dailyRate = marketRate?.value ?? Math.round(modelRate * Math.min(input.quantityMt, profile.dwt * 0.92) / Math.max(transitDays, 1));
      const availabilityDays = availabilityDaysFor(position?.navigationStatus);
      const classScore = vessel.vesselClass === input.preferredVesselClass ? 32 : 12;
      const capacityScore = cargoFits ? Math.max(0, 38 - Math.abs(0.82 - capacityRatio) * 90) : 0;
      const availabilityScore = Math.max(0, 20 - availabilityDays * 2);
      const score = Math.round((compatibility.isCompatible && cargoFits ? classScore + capacityScore + availabilityScore + 10 : 0) * 10) / 10;
      const reasons = [
        cargoFits ? `Carries ${Math.round(profile.dwt * 0.92).toLocaleString()} MT usable capacity` : `Cargo exceeds usable capacity of ${Math.round(profile.dwt * 0.92).toLocaleString()} MT`,
        compatibility.isCompatible ? 'Meets origin and destination port limits' : compatibility.reasons[0],
        vessel.vesselClass === input.preferredVesselClass ? 'Matches preferred vessel class' : `Alternative ${titleCase(vessel.vesselClass)} class`,
        availabilityDays === 0 ? 'Position status supports immediate consideration' : `Availability indicator: ${availabilityDays} days`,
      ];
      return {
        vesselId: vessel.id,
        vesselName: vessel.name,
        vesselClass: vessel.vesselClass,
        deadweightTonnes: vessel.deadweightTonnes ?? profile.dwt,
        navigationStatus: position?.navigationStatus ?? 'UNKNOWN',
        availabilityDays,
        eligible: cargoFits && compatibility.isCompatible,
        score,
        reasons,
        estimatedTransitDays: transitDays,
        estimatedDailyRateUsd: dailyRate,
        estimatedCharterCostUsd: Math.round(dailyRate * transitDays),
        marketRateSource: marketRate?.source ?? latestForecast.model.name,
        isEstimated: marketRate?.isEstimated ?? true,
      };
    });
    const sortedOptions = options.sort((left, right) => Number(right.eligible) - Number(left.eligible) || right.score - left.score || left.estimatedCharterCostUsd - right.estimatedCharterCostUsd);
    return {
      generatedAt: new Date().toISOString(),
      forecast: {
        id: latestForecast.id,
        cargoType: latestForecast.cargoType,
        vesselClass: latestForecast.vesselClass,
        createdAt: latestForecast.createdAt.toISOString(),
        model: latestForecast.model.name,
        qualityStatus: latestForecast.qualityStatus,
        rateUsdMt: modelRate,
      },
      route: {
        origin: portView(originPort, originObservation),
        destination: portView(destinationPort, destinationObservation),
        distanceNm,
        estimatedTransitDays: Math.ceil(distanceNm / (11.5 * 24) + (originObservation?.averageWaitDays ?? 0) + (destinationObservation?.averageWaitDays ?? 0) + 1),
      },
      options: sortedOptions,
      warnings: [
        latestForecast.qualityStatus !== 'FRESH' ? 'The supporting forecast contains estimated or unverified input data.' : '',
        ...latestForecast.warnings,
      ].filter(Boolean),
    };
  }

  public async savePlan(input: CharterInput & { selectedVesselId: string; status: CharterPlanStatus }) {
    const optionsResult = await this.getOptions(input);
    const selected = optionsResult.options.find((option) => option.vesselId === input.selectedVesselId);
    if (!selected) throw new AppError(404, 'NOT_FOUND', 'Selected vessel was not found.');
    if (!selected.eligible) throw new AppError(409, 'VESSEL_INELIGIBLE', 'This vessel does not meet the selected cargo or port constraints.');
    const plan = await CharterPlanModel.create({
      requestedBy: new Types.ObjectId(input.requestedBy),
      cargoType: input.cargoType,
      quantityMt: input.quantityMt,
      originPortId: new Types.ObjectId(input.originPortId),
      destinationPortId: new Types.ObjectId(input.destinationPortId),
      preferredVesselClass: input.preferredVesselClass,
      selectedVesselId: new Types.ObjectId(input.selectedVesselId),
      targetLoadingDate: input.targetLoadingDate,
      forecastRunId: new Types.ObjectId(optionsResult.forecast.id),
      estimatedTransitDays: selected.estimatedTransitDays,
      estimatedDailyRateUsd: selected.estimatedDailyRateUsd,
      estimatedCharterCostUsd: selected.estimatedCharterCostUsd,
      status: input.status,
    });
    return {
      id: plan.id,
      status: plan.status,
      cargoType: plan.cargoType,
      quantityMt: plan.quantityMt,
      originPortId: plan.originPortId.toString(),
      destinationPortId: plan.destinationPortId.toString(),
      preferredVesselClass: plan.preferredVesselClass,
      selectedVesselId: plan.selectedVesselId.toString(),
      targetLoadingDate: plan.targetLoadingDate.toISOString(),
      estimatedTransitDays: plan.estimatedTransitDays,
      estimatedDailyRateUsd: plan.estimatedDailyRateUsd,
      estimatedCharterCostUsd: plan.estimatedCharterCostUsd,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }
}

function profileFor(vessel: MaritimeVesselDocument) {
  const fallback = profileByClass[vessel.vesselClass];
  return {
    dwt: vessel.deadweightTonnes ?? fallback.dwt,
    draft: vessel.maxDraftMeters ?? fallback.draft,
    loa: vessel.lengthOverallMeters ?? fallback.loa,
  };
}

function compatibleWithPorts(vessel: { draft: number; loa: number }, origin: MaritimePortDocument, destination: MaritimePortDocument) {
  const reasons: string[] = [];
  for (const [label, port] of [['origin', origin], ['destination', destination]] as const) {
    if (port.maxDraftMeters !== undefined && vessel.draft > port.maxDraftMeters) reasons.push(`${titleCase(label)} draft limit is ${port.maxDraftMeters} m`);
    if (port.maxLoaMeters !== undefined && vessel.loa > port.maxLoaMeters) reasons.push(`${titleCase(label)} LOA limit is ${port.maxLoaMeters} m`);
  }
  return { isCompatible: reasons.length === 0, reasons };
}

function availabilityDaysFor(status: VesselNavigationStatus | undefined): number {
  if (status === 'AT_PORT' || status === 'MOORED') return 0;
  if (status === 'AT_ANCHOR') return 2;
  if (status === 'UNDER_WAY') return 5;
  return 7;
}

function resolveMarketCargo(cargo: string) {
  return cargo.trim().toLowerCase() === 'thermal coal' ? 'Thermal coal' : 'Thermal coal';
}

function nauticalDistance(origin: MaritimePortDocument, destination: MaritimePortDocument): number {
  const radians = Math.PI / 180;
  const latitudeDelta = (destination.latitude - origin.latitude) * radians;
  const longitudeDelta = (destination.longitude - origin.longitude) * radians;
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(origin.latitude * radians) * Math.cos(destination.latitude * radians) * Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(3440.065 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function portView(port: MaritimePortDocument, observation: { averageWaitDays?: number | null; congestionLevel?: string; source?: string; isEstimated?: boolean } | undefined) {
  return {
    id: port.id,
    name: port.name,
    country: port.country,
    maxDraftMeters: port.maxDraftMeters ?? null,
    maxLoaMeters: port.maxLoaMeters ?? null,
    handlingCapabilities: port.handlingCapabilities,
    averageWaitDays: observation?.averageWaitDays ?? null,
    congestionLevel: observation?.congestionLevel ?? 'UNKNOWN',
    source: observation?.source ?? port.source,
    isEstimated: observation?.isEstimated ?? false,
  };
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase().replace('_', ' ');
}

export const charterPlanningService = new CharterPlanningService();
