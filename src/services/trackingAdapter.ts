import {
  createLocationUpdate,
} from "./trackingService";

import type {
  GPSLocation,
  RiderLocation,
} from "../types/community";

export type CreateRiderTrackingInput = {
  riderId: string;
  location: GPSLocation;
  speedKmh?: number;
  heading?: number;
  accuracyMeters?: number;
};

/**
 * Controlled adapter between RiderContext
 * and the canonical Tracking Service.
 */
export function createRiderTrackingUpdate(
  input: CreateRiderTrackingInput
): RiderLocation {
  return createLocationUpdate(input);
}
