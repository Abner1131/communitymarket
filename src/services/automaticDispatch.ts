import {
    dispatchMultipleOrders,
    type MultiDispatchAssignment,
} from "./multiDispatchEngine";

import type {
    CommunityOrder,
} from "../context/OrderContext";

import type { Rider } from "./dispatchEngine";

export type AutomaticDispatchResult = {
  assignments: MultiDispatchAssignment[];
  assignedOrders: CommunityOrder[];
  unassignedOrders: CommunityOrder[];
};

export function automaticallyDispatchOrders(
  orders: CommunityOrder[],
  riders: Rider[]
): AutomaticDispatchResult {
  const dispatchableOrders =
    orders.filter(
      (order) =>
        order.status === "pending" ||
        order.status === "dispatching"
    );

  const dispatchOrders =
    dispatchableOrders.map(
      (order) => ({
        orderId:
          order.orderId,

        pickupStops:
          order.pickupStops.map(
            (stop) => ({
              sellerId:
                stop.sellerId,

              sellerName:
                stop.sellerName,

              latitude:
                stop.latitude,

              longitude:
                stop.longitude,
            })
          ),

        customerLocation: {
          latitude:
            order.customerLocation
              .latitude,

          longitude:
            order.customerLocation
              .longitude,
        },

        vehicle:
          order.vehicle,
      })
    );

  const dispatchResult =
    dispatchMultipleOrders(
      dispatchOrders,
      riders
    );

  const assignedOrderIds =
    new Set(
      dispatchResult.assignments
        .filter(
          (assignment) =>
            assignment.assigned
        )
        .map(
          (assignment) =>
            assignment.orderId
        )
    );

  const assignedOrders =
    dispatchableOrders.filter(
      (order) =>
        assignedOrderIds.has(
          order.orderId
        )
    );

  const unassignedOrders =
    dispatchableOrders.filter(
      (order) =>
        !assignedOrderIds.has(
          order.orderId
        )
    );

  return {
    assignments:
      dispatchResult.assignments,

    assignedOrders,

    unassignedOrders,
  };
}