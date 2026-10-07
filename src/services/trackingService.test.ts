import { persistLocationUpdate, getLatestRiderLocation, getRiderLocationHistory } from "./trackingService";

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
  const first = await persistLocationUpdate({
    riderId: "R001",
    location: {
      latitude: 9.0765,
      longitude: 7.3986,
    },
  });

  const second = await persistLocationUpdate({
    riderId: "R001",
    location: {
      latitude: 9.0865,
      longitude: 7.4086,
    },
  });

  const latest = await getLatestRiderLocation("R001");
  const history = await getRiderLocationHistory("R001");

  if (!latest) {
    throw new Error("Latest rider location was not found.");
  }

  if (history.length !== 2) {
    throw new Error(`Expected 2 history entries, got ${history.length}.`);
  }

  if (latest.location.latitude !== second.location.latitude) {
    throw new Error("Latest location is incorrect.");
  }

  console.log("FIRST UPDATE:", first.location.latitude, first.location.longitude);
  console.log("LATEST UPDATE:", latest.location.latitude, latest.location.longitude);
  console.log("HISTORY COUNT:", history.length);
  console.log("=== 6F.6 TEST PASSED ===");
}

run().catch((error) => {
  console.error("=== 6F.6 TEST FAILED ===");
  console.error(error);
  process.exit(1);
});
