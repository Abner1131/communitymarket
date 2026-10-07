import { calculateDistanceKm } from "./location";

export type Rider = {
  id: string;
  name: string;

  latitude: number;
  longitude: number;

  vehicle: "bike" | "keke";

  isOnline: boolean;
  isAvailable: boolean;

  currentOrderId?: string;

  rating: number;
};

export type DispatchPickupStop = {
  sellerId: string;
  sellerName: string;

  latitude: number;
  longitude: number;
};

export type DispatchOrder = {
  orderId: string;

  pickupStops: DispatchPickupStop[];

  customerLocation: {
    latitude: number;
    longitude: number;
  };

  vehicle: "bike" | "keke";
};

export type RiderDispatchScore = {
  rider: Rider;

  firstPickupDistanceKm: number;

  totalRouteDistanceKm: number;

  score: number;

  suitable: boolean;
};

export type DispatchResult = {
  selectedRider?: Rider;

  selectedScore?: RiderDispatchScore;

  rankedRiders: RiderDispatchScore[];
};

// --------------------------------------------------
// CALCULATE ROUTE
// --------------------------------------------------

export function calculateRouteDistance(
  rider: Rider,

  pickupStops: DispatchPickupStop[],

  customerLocation: {
    latitude: number;
    longitude: number;
  }
): number {
  if (pickupStops.length === 0) {
    return calculateDistanceKm(
      {
        latitude: rider.latitude,
        longitude: rider.longitude,
      },
      customerLocation
    );
  }

  let totalDistance = 0;

  let currentLocation = {
    latitude: rider.latitude,
    longitude: rider.longitude,
  };

  const remainingStops = [
    ...pickupStops,
  ];

  while (remainingStops.length > 0) {
    let closestIndex = 0;

    let closestDistance = Infinity;

    remainingStops.forEach(
      (stop, index) => {
        const distance =
          calculateDistanceKm(
            currentLocation,
            {
              latitude: stop.latitude,
              longitude: stop.longitude,
            }
          );

        if (
          distance < closestDistance
        ) {
          closestDistance =
            distance;

          closestIndex = index;
        }
      }
    );

    const nextStop =
      remainingStops.splice(
        closestIndex,
        1
      )[0];

    totalDistance +=
      closestDistance;

    currentLocation = {
      latitude: nextStop.latitude,
      longitude: nextStop.longitude,
    };
  }

  totalDistance +=
    calculateDistanceKm(
      currentLocation,
      customerLocation
    );

  return totalDistance;
}

// --------------------------------------------------
// SCORE RIDER
// --------------------------------------------------

export function calculateRiderScore(
  rider: Rider,

  order: DispatchOrder
): RiderDispatchScore {
  const firstPickup =
    order.pickupStops[0];

  const firstPickupDistanceKm =
    firstPickup
      ? calculateDistanceKm(
          {
            latitude:
              rider.latitude,
            longitude:
              rider.longitude,
          },
          {
            latitude:
              firstPickup.latitude,
            longitude:
              firstPickup.longitude,
          }
        )
      : 999;

  const totalRouteDistanceKm =
    calculateRouteDistance(
      rider,
      order.pickupStops,
      order.customerLocation
    );

  const vehicleSuitable =
    rider.vehicle ===
    order.vehicle;

  const availabilitySuitable =
    rider.isOnline &&
    rider.isAvailable &&
    !rider.currentOrderId;

  const suitable =
    vehicleSuitable &&
    availabilitySuitable;

  /*
   * Lower score = better rider.
   *
   * Route distance is the strongest factor.
   * Rider rating provides a small quality bonus.
   */

  let score =
    totalRouteDistanceKm * 100;

  score -=
    rider.rating * 5;

  if (!vehicleSuitable) {
    score += 10000;
  }

  if (!availabilitySuitable) {
    score += 10000;
  }

  return {
    rider,

    firstPickupDistanceKm,

    totalRouteDistanceKm,

    score,

    suitable,
  };
}

// --------------------------------------------------
// FIND BEST RIDER
// --------------------------------------------------

export function findBestRider(
  riders: Rider[],
  order: DispatchOrder
): DispatchResult {
  const rankedRiders =
    riders
      .map((rider) =>
        calculateRiderScore(
          rider,
          order
        )
      )
      .sort(
        (a, b) =>
          a.score - b.score
      );

  const selectedScore =
    rankedRiders.find(
      (result) =>
        result.suitable
    );

  return {
    selectedRider:
      selectedScore?.rider,

    selectedScore,

    rankedRiders,
  };
}