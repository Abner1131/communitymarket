import { useEffect, useRef, useState } from "react";
import { AppState, Platform, StyleSheet, Text, View } from "react-native";

import { BrandLoader } from "./Brand";

import { fetchAndRestart, isUpdateWaiting } from "../lib/appUpdate";

// On opening the app (and when coming back to it after a while), looks for a
// newer version. If there is one: "Updating CommunityMarket…" for a few
// seconds, then the app restarts with it. Otherwise nothing is shown.
export function UpdateGate() {
  const [updating, setUpdating] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") return;

    async function check(force: boolean) {
      if (busy.current) return;
      busy.current = true;
      try {
        if (await isUpdateWaiting(force)) {
          setUpdating(true);
          const restarted = await fetchAndRestart();
          if (!restarted) setUpdating(false); // keep using this version
        }
      } finally {
        busy.current = false;
      }
    }

    void check(true);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void check(false);
    });
    return () => sub.remove();
  }, []);

  if (!updating) return null;
  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.box}>
        <BrandLoader />
        <Text style={styles.title}>Updating CommunityMarket…</Text>
        <Text style={styles.text}>Getting the newest version. This takes a few seconds.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(245,246,248,0.97)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    elevation: 1000,
  },
  box: { alignItems: "center", padding: 24 },
  title: { marginTop: 16, fontSize: 18, fontWeight: "800", color: "#111" },
  text: { marginTop: 6, color: "#666", textAlign: "center" },
});
