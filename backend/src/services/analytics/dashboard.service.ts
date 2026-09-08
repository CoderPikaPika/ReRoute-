import { ShipmentModel } from '../../models/shipment.model';
import { UserModel } from '../../models/user.model';
import { VehicleModel } from '../../models/vehicle.model';

export class DashboardService {
  public async shipperDashboard(shipperId: string) {
    const [total, active, pending, delivered, recentShipments] = await Promise.all([
      ShipmentModel.countDocuments({ shipperId }),
      ShipmentModel.countDocuments({ shipperId, status: { $in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] } }),
      ShipmentModel.countDocuments({ shipperId, status: { $in: ['CREATED', 'MATCHED'] } }),
      ShipmentModel.countDocuments({ shipperId, status: 'DELIVERED' }),
      ShipmentModel.find({ shipperId }).sort({ updatedAt: -1 }).limit(6).exec(),
    ]);

    return { metrics: { total, active, pending, delivered }, recentShipments };
  }

  public async transporterDashboard(transporterId: string) {
    const [totalVehicles, availableVehicles, activeShipments, completedShipments, recentShipments] =
      await Promise.all([
        VehicleModel.countDocuments({ transporterId }),
        VehicleModel.countDocuments({ transporterId, status: 'AVAILABLE', isAvailable: true }),
        ShipmentModel.countDocuments({
          assignedTransporterId: transporterId,
          status: { $in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] },
        }),
        ShipmentModel.countDocuments({ assignedTransporterId: transporterId, status: 'DELIVERED' }),
        ShipmentModel.find({ assignedTransporterId: transporterId })
          .sort({ updatedAt: -1 })
          .limit(6)
          .exec(),
      ]);

    return {
      metrics: { totalVehicles, availableVehicles, activeShipments, completedShipments },
      recentShipments,
    };
  }

  public async adminDashboard() {
    const [totalUsers, transporters, vehicles, activeShipments, inTransit, delivered, statusBreakdown] =
      await Promise.all([
        UserModel.countDocuments({}),
        UserModel.countDocuments({ role: 'TRANSPORTER', isActive: true }),
        VehicleModel.countDocuments({}),
        ShipmentModel.countDocuments({ status: { $in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] } }),
        ShipmentModel.countDocuments({ status: 'IN_TRANSIT' }),
        ShipmentModel.countDocuments({ status: 'DELIVERED' }),
        ShipmentModel.aggregate([
          { $group: { _id: '$status', value: { $sum: 1 } } },
          { $project: { _id: 0, label: '$_id', value: 1 } },
          { $sort: { label: 1 } },
        ]),
      ]);

    return {
      metrics: { totalUsers, transporters, vehicles, activeShipments, inTransit, delivered },
      statusBreakdown,
    };
  }
}

export const dashboardService = new DashboardService();
