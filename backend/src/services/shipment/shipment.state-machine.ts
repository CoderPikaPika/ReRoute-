import { AppError } from '../../errors/app-error';
import type { ShipmentStatus } from '../../types/domain';

const allowedTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
  CREATED: ['MATCHED', 'CANCELLED'],
  MATCHED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['PICKED_UP', 'CANCELLED', 'MATCHED'],
  PICKED_UP: ['IN_TRANSIT'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function assertShipmentTransition(from: ShipmentStatus, to: ShipmentStatus): void {
  if (!allowedTransitions[from].includes(to)) {
    throw new AppError(
      409,
      'INVALID_SHIPMENT_TRANSITION',
      'Cannot transition shipment from ' + from + ' to ' + to,
    );
  }
}
