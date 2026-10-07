import { createRiderTrackingUpdate } from "./trackingAdapter";
import { getTrackingUpdates, getLatestTrackingUpdate, saveTrackingUpdate } from "./trackingStorage";

// Node/tsx test shim for AsyncStorage web implementation.
const storage = new Map<string, string>();

globalThis.window = {
  localStorage: {
    getItem: (key: string) =>
      storage.has(key) ? storage.get(key)! : null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  },
} as any;

async function run() {
  const update = createRiderTrackingUpdate({
    riderId: "R001",
    location: {
      latitude: 9.0765,
      longitude: 7.3986,
    },
    speedKmh: 28,
    heading: 90,
    accuracyMeters: 8,
  });

  await saveTrackingUpdate(update);

  const all = await getTrackingUpdates();
  const latest = await getLatestTrackingUpdate("R001");

  if (!latest) {
    throw new Error("Latest tracking update was not persisted.");
  }

  if (latest.location.latitude !== 9.0765) {
    throw new Error("Latitude was not persisted correctly.");
  }

  if (latest.location.longitude !== 7.3986) {
    throw new Error("Longitude was not persisted correctly.");
  }

  console.log("TRACKING SAVED:", update.riderId);
  console.log("TRACKING UPDATES:", all.length);
  console.log("LATEST RIDER:", latest.riderId);
  console.log("LATEST LAT:", latest.location.latitude);
  console.log("LATEST LNG:", latest.location.longitude);
  console.log("=== 6F.5 TEST PASSED ===");
}

run().catch((error) => {
  console.error("=== 6F.5 TEST FAILED ===");
  console.error(error);
  process.exit(1);
});
