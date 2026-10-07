import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RiderLocation } from "../types/community";

const TRACKING_STORAGE_KEY = "@communitymarket/rider-tracking";

export async function getTrackingUpdates(): Promise<RiderLocation[]> {
  const raw = await AsyncStorage.getItem(TRACKING_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export async function saveTrackingUpdate(
  update: RiderLocation
): Promise<RiderLocation> {
  if (!update) {
    throw new Error(
      "Tracking update is required."
    );
  }

  const updates = await getTrackingUpdates();

  updates.push(update);

  await AsyncStorage.setItem(
    TRACKING_STORAGE_KEY,
    JSON.stringify(updates)
  );

  return update;
}

export async function getTrackingUpdatesByRiderId(
  riderId: string
): Promise<RiderLocation[]> {
  const updates = await getTrackingUpdates();

  return updates.filter(
    (item) => item.riderId === riderId
  );
}

export async function getLatestTrackingUpdate(
  riderId: string
): Promise<RiderLocation | undefined> {
  const updates = await getTrackingUpdatesByRiderId(riderId);

  return updates.reduce<RiderLocation | undefined>(
    (latest, current) => {
      if (!latest) {
        return current;
      }

      return current.timestamp >= latest.timestamp
        ? current
        : latest;
    },
    undefined
  );
}
