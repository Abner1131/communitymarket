import type { Rider } from "./dispatchEngine";

export type GPSPoint = {
  latitude: number;
  longitude: number;
};

export function moveRiderToward(
  rider: Rider,
  destination: GPSPoint,
  stepKm: number = 0.5
): Rider {
  const current = {
    latitude: rider.latitude,
    longitude: rider.longitude,
  };

  const latDifference =
    destination.latitude -
    current.latitude;

  const lonDifference =
    destination.longitude -
    current.longitude;

  const distanceDegrees = Math.sqrt(
    latDifference ** 2 +
      lonDifference ** 2
  );

  if (distanceDegrees === 0) {
    return rider;
  }

  const kmPerDegree = 111;

  const distanceKm =
    distanceDegrees * kmPerDegree;

  if (distanceKm <= stepKm) {
    return {
      ...rider,
      latitude:
        destination.latitude,
      longitude:
        destination.longitude,
    };
  }

  const ratio =
    stepKm / distanceKm;

  return {
    ...rider,

    latitude:
      current.latitude +
      latDifference * ratio,

    longitude:
      current.longitude +
      lonDifference * ratio,
  };
}

export function isRiderNearDestination(
  rider: Rider,
  destination: GPSPoint,
  thresholdKm: number = 0.1
): boolean {
  const latDifference =
    destination.latitude -
    rider.latitude;

  const lonDifference =
    destination.longitude -
    rider.longitude;

  const distanceDegrees =
    Math.sqrt(
      latDifference ** 2 +
        lonDifference ** 2
    );

  const distanceKm =
    distanceDegrees * 111;

  return distanceKm <= thresholdKm;
}