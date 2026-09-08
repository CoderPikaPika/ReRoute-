import type { ShipmentDocument } from '../../models/shipment.model';
import type { VehicleType } from '../../types/domain';
import { userRepository } from '../../repositories/user.repository';
import { vehicleRepository } from '../../repositories/vehicle.repository';
import { haversineDistanceKm } from '../map/mock-map.service';
import { estimateCost } from '../pricing/pricing.service';

const compatibleVehicleTypes = {
  MINI_TRUCK: ['MINI_TRUCK', 'MEDIUM_TRUCK', 'HEAVY_TRUCK'],
  MEDIUM_TRUCK: ['MEDIUM_TRUCK', 'HEAVY_TRUCK'],
  HEAVY_TRUCK: ['HEAVY_TRUCK', 'TRAILER'],
  TRAILER: ['TRAILER'],
  REFRIGERATED: ['REFRIGERATED'],
} as const;

export interface MatchResult {
  vehicleId: string;
  transporterId: string;
  vehicle: {
    registrationNumber: string;
    vehicleType: VehicleType;
    capacityWeight: number;
    capacityVolume?: number;
  };
  transporter: {
    name: string;
    phone: string;
  };
  score: number;
  estimatedDistanceToPickup: number;
  capacityUtilization: number;
  estimatedCost: number;
  reasons: string[];
}

export function isVehicleTypeCompatible(
  requiredType: keyof typeof compatibleVehicleTypes,
  vehicleType: string,
): boolean {
  return (compatibleVehicleTypes[requiredType] as readonly string[]).includes(vehicleType);
}

export class MatchingService {
  public async findMatches(shipment: ShipmentDocument): Promise<MatchResult[]> {
    const candidates = await vehicleRepository.findAllAvailable(shipment.weight, shipment.volume);
    const results: Array<MatchResult | null> = await Promise.all(
      candidates
        .filter((vehicle) => isVehicleTypeCompatible(shipment.vehicleTypeRequired, vehicle.vehicleType))
        .map(async (vehicle) => {
          const transporter = await userRepository.findActiveById(vehicle.transporterId.toString());

          if (!transporter || transporter.role !== 'TRANSPORTER') {
            return null;
          }

          const pickupDistance = Math.round(haversineDistanceKm(vehicle.currentLocation, shipment.source));
          const capacityUtilization = shipment.weight / vehicle.capacityWeight;
          const capacityScore = Math.min(100, capacityUtilization * 100);
          const distanceScore = Math.max(0, 100 - (pickupDistance / 500) * 100);
          const vehicleTypeScore = vehicle.vehicleType === shipment.vehicleTypeRequired ? 100 : 70;
          const score = Math.round(
            capacityScore * 0.35 + distanceScore * 0.3 + 100 * 0.2 + vehicleTypeScore * 0.15,
          );
          const reasons = ['Available for assignment', 'Sufficient capacity'];

          if (pickupDistance <= 100) {
            reasons.push('Close to pickup location');
          }

          if (vehicle.vehicleType === shipment.vehicleTypeRequired) {
            reasons.push('Exact vehicle type match');
          } else {
            reasons.push('Vehicle type compatible');
          }

          const result: MatchResult = {
            vehicleId: vehicle.id,
            transporterId: transporter.id,
            vehicle: {
              registrationNumber: vehicle.registrationNumber,
              vehicleType: vehicle.vehicleType,
              capacityWeight: vehicle.capacityWeight,
              capacityVolume: vehicle.capacityVolume,
            },
            transporter: {
              name: transporter.name,
              phone: transporter.phone,
            },
            score,
            estimatedDistanceToPickup: pickupDistance,
            capacityUtilization: Math.round(capacityUtilization * 100) / 100,
            estimatedCost: estimateCost(shipment.estimatedDistance ?? 0, shipment.weight),
            reasons,
          };

          return result;
        }),
    );

    return results
      .filter((result): result is MatchResult => result !== null)
      .sort(
        (first, second) =>
          second.score - first.score ||
          first.estimatedDistanceToPickup - second.estimatedDistanceToPickup,
      );
  }
}

export const matchingService = new MatchingService();
