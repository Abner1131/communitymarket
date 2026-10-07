import {
    findBestRider,
    type DispatchOrder,
    type Rider,
} from "./dispatchEngine";

export type MultiDispatchAssignment = {
  orderId: string;
  riderId?: string;
  riderName?: string;
  assigned: boolean;
  reason?: string;
};

export type MultiDispatchResult = {
  assignments: MultiDispatchAssignment[];
  remainingRiders: Rider[];
};

export function dispatchMultipleOrders(
  orders: DispatchOrder[],
  riders: Rider[]
): MultiDispatchResult {
  const availableRiders = riders.map(
    (rider) => ({
      ...rider,
    })
  );

  const assignments: MultiDispatchAssignment[] =
    [];

  for (const order of orders) {
    const result = findBestRider(
      availableRiders,
      order
    );

    if (!result.selectedRider) {
      assignments.push({
        orderId: order.orderId,
        assigned: false,
        reason:
          "No suitable available rider.",
      });

      continue;
    }

    const selectedRider =
      result.selectedRider;

    assignments.push({
      orderId: order.orderId,
      riderId: selectedRider.id,
      riderName: selectedRider.name,
      assigned: true,
    });

    const riderIndex =
      availableRiders.findIndex(
        (rider) =>
          rider.id === selectedRider.id
      );

    if (riderIndex !== -1) {
      availableRiders[
        riderIndex
      ] = {
        ...availableRiders[
          riderIndex
        ],

        isAvailable: false,

        currentOrderId:
          order.orderId,
      };
    }
  }

  return {
    assignments,
    remainingRiders:
      availableRiders,
  };
}