import { useIsFocused } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

/**
 * Calls `refresh` every `everyMs`, but only while this screen is on top and
 * the app is open in front of the user. When they come back (switch tabs back,
 * or reopen the app), it refreshes straight away if the data is older than
 * `everyMs`. This keeps the database bill small: nothing is read while the
 * phone is in a pocket or another screen is showing.
 *
 * The first load is still the screen's own job.
 */
export function useLiveRefresh(refresh: () => void, everyMs: number, enabled = true) {
  const focused = useIsFocused();
  const fn = useRef(refresh);
  fn.current = refresh;
  const lastRun = useRef(Date.now());
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!enabled || !focused) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      lastRun.current = Date.now();
      fn.current();
    };
    const start = () => {
      if (timer) return;
      if (Date.now() - lastRun.current >= everyMs) tick();
      timer = setInterval(tick, everyMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    if (appState.current === "active" || appState.current == null) start();
    const sub = AppState.addEventListener("change", (next) => {
      appState.current = next;
      if (next === "active") start();
      else stop();
    });
    return () => {
      stop();
      sub.remove();
    };
  }, [enabled, focused, everyMs]);
}
