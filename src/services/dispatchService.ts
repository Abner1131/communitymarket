import type {
  CommunityOrder,
  DispatchAssignment,
  Rider,
} from "../types/community";

import {
  findBestRider,
  type DispatchOrder,
  type Rider as EngineRider,
} from "./dispatchEngine";

export type DispatchInput = {
  order: CommunityOrder;
  riders: Rider[];
};

function assertValidOrder(
  order: CommunityOrder
): void {
  if (!order) {
    throw new Error(
      "Order is required for dispatch."
    );
  }

  if (
    typeof order.id !== "string" ||
    order.id.trim().length === 0
  ) {
    throw new Error(
      "Order ID is required for dispatch."
    );
  }

  if (
    !Array.isArray(order.pickupStops) ||
    order.pickupStops.length === 0
  ) {
    throw new Error(
      "Order must have at least one pickup stop."
    );
  }
}

function assertValidRiders(
  riders: Rider[]
): void {
  if (!Array.isArray(riders)) {
    throw new Error(
      "Rider list is required."
    );
  }
}

function toEngineRider(
  rider: Rider
): EngineRider {
  return {
    id: rider.id,
    name: rider.name,
    latitude:
      rider.location.latitude,
    longitude:
      rider.location.longitude,
    vehicle: rider.vehicle,
    isOnline:
      rider.availability !== "offline",
    isAvailable:
      rider.availability === "available",
    rating: rider.rating,
    currentOrderId:
      rider.currentOrderId,
  };
}

function toDispatchOrder(
  order: CommunityOrder
): DispatchOrder {
  return {
    orderId:
      order.id,

    pickupStops:
  order.pickupStops.map(
    (stop) => ({
      id: stop.id,
      sellerId:
        stop.sellerId,
      sellerName:
        stop.sellerName,
      latitude:
        stop.location.latitude,
      longitude:
        stop.location.longitude,
    })
  ),

    customerLocation: {
      latitude:
        order.customerLocation.latitude,
      longitude:
        order.customerLocation.longitude,
    },

    vehicle:
      order.vehicle,
  };
}

export function dispatchOrder(
  input: DispatchInput
): DispatchAssignment | null {
  assertValidOrder(
    input.order
  );

  assertValidRiders(
    input.riders
  );

  const engineRiders =
    input.riders.map(
      toEngineRider
    );

  const dispatchOrderData =
    toDispatchOrder(
      input.order
    );

  const result =
    findBestRider(
      engineRiders,
      dispatchOrderData
    );

  if (
    !result.selectedRider ||
    !result.selectedScore
  ) {
    return null;
  }

  return {
    id:
      `DISP${Date.now()}`,

    orderId:
      input.order.id,

    riderId:
      result.selectedRider.id,

    score:
      result.selectedScore.score,

    assignedAt:
      new Date().toISOString(),

    status:
      "assigned",
  };
}