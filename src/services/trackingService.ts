import {
  getLatestTrackingUpdate,
  getTrackingUpdatesByRiderId,
  saveTrackingUpdate,
} from "./trackingStorage";
import type {
    GPSLocation,
    RiderLocation,
} from "../types/community";

export type LocationUpdateInput = {
  riderId: string;
  location: GPSLocation;
  speedKmh?: number;
  heading?: number;
  accuracyMeters?: number;
};

function assertValidRiderId(
  riderId: string
): void {
  if (
    typeof riderId !== "string" ||
    riderId.trim().length === 0
  ) {
    throw new Error(
      "Rider ID is required."
    );
  }
}

function validateLocation(
  location: GPSLocation
): void {
  if (
    !location ||
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude)
  ) {
    throw new Error(
      "Invalid GPS location."
    );
  }

  if (
    location.latitude < -90 ||
    location.latitude > 90
  ) {
    throw new Error(
      "Invalid latitude."
    );
  }

  if (
    location.longitude < -180 ||
    location.longitude > 180
  ) {
    throw new Error(
      "Invalid longitude."
    );
  }
}

function validateOptionalNumber(
  value: number | undefined,
  fieldName: string
): void {
  if (
    value !== undefined &&
    (
      !Number.isFinite(value) ||
      value < 0
    )
  ) {
    throw new Error(
      `${fieldName} must be a valid non-negative number.`
    );
  }
}

export function validateLocationUpdate(
  input: LocationUpdateInput
): void {
  if (!input) {
    throw new Error(
      "Location update is required."
    );
  }

  assertValidRiderId(
    input.riderId
  );

  validateLocation(
    input.location
  );

  validateOptionalNumber(
    input.speedKmh,
    "Speed"
  );

  validateOptionalNumber(
    input.heading,
    "Heading"
  );

  validateOptionalNumber(
    input.accuracyMeters,
    "Accuracy"
  );

  if (
    input.heading !== undefined &&
    input.heading > 360
  ) {
    throw new Error(
      "Heading must be between 0 and 360 degrees."
    );
  }
}

export function createLocationUpdate(
  input: LocationUpdateInput
): RiderLocation {
  validateLocationUpdate(
    input
  );

  return {
    riderId:
      input.riderId,

    location:
      input.location,

    speedKmh:
      input.speedKmh,

    heading:
      input.heading,

    accuracyMeters:
      input.accuracyMeters,

    timestamp:
      new Date().toISOString(),
  };
}

export function isLocationAccurateEnough(
  accuracyMeters: number | undefined,
  maximumAccuracyMeters = 100
): boolean {
  if (
    accuracyMeters === undefined
  ) {
    return true;
  }

  return (
    accuracyMeters >= 0 &&
    accuracyMeters <=
      maximumAccuracyMeters
  );
}

export async function persistLocationUpdate(
  input: LocationUpdateInput
): Promise<RiderLocation> {
  const update = createLocationUpdate(input);
  await saveTrackingUpdate(update);
  return update;
}

export async function getLatestRiderLocation(
  riderId: string
): Promise<RiderLocation | undefined> {
  if (!riderId.trim()) {
    throw new Error("Rider ID is required.");
  }

  return getLatestTrackingUpdate(riderId);
}

export async function getRiderLocationHistory(
  riderId: string
): Promise<RiderLocation[]> {
  if (!riderId.trim()) {
    throw new Error("Rider ID is required.");
  }

  return getTrackingUpdatesByRiderId(riderId);
}
