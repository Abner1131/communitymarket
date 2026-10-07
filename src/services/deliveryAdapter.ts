import {
    createDelivery,
} from "./deliveryService";

import type {
    CommunityOrder,
    Delivery,
} from "../types/community";

/**
 * Stage 6E
 *
 * Controlled adapter between the application
 * order flow and the new Delivery Service.
 *
 * The adapter receives a canonical CommunityOrder
 * and creates its corresponding canonical Delivery.
 */
export function createDeliveryForOrder(
  order: CommunityOrder
): Delivery {
  if (!order) {
    throw new Error(
      "Order is required."
    );
  }

  return createDelivery({
    orderId:
      order.id,

    vehicle:
      order.vehicle,

    pickupStops:
      order.pickupStops,

    customerLocation:
      order.customerLocation,

    distanceKm:
      order.distanceKm,

    deliveryFee:
      order.deliveryFee,
  });
}