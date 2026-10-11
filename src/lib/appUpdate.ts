import * as Updates from "expo-updates";

// Gets the newest version of the app screens (published with `eas update`)
// as soon as the app opens, instead of waiting for the next restart.
// No internet / any problem -> the app simply keeps the version it has.

let lastCheckMs = 0;
const RECHECK_MS = 30 * 60 * 1000; // when coming back to the app

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

// Returns true when a newer version is waiting (call fetchAndRestart next).
export async function isUpdateWaiting(force = false): Promise<boolean> {
  if (__DEV__ || !Updates.isEnabled) return false;
  if (!force && Date.now() - lastCheckMs < RECHECK_MS) return false;
  lastCheckMs = Date.now();
  try {
    const result = await withTimeout(Updates.checkForUpdateAsync(), 8000);
    return result.isAvailable;
  } catch {
    return false;
  }
}

// Downloads it and restarts the app with it. False if that failed.
export async function fetchAndRestart(): Promise<boolean> {
  try {
    const fetched = await withTimeout(Updates.fetchUpdateAsync(), 45000);
    if (!fetched.isNew) return false;
    await Updates.reloadAsync();
    return true;
  } catch {
    return false;
  }
}
