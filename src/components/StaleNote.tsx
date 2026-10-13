// Small note at the top of a screen showing saved data:
// "Updating…" while refreshing, or "Offline: showing last saved" if the
// refresh failed. Shows nothing once fresh data has arrived.

import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "../theme";

import { savedAgo } from "../lib/screenCache";

export function StaleNote({
  fromCache,
  failed,
  savedAtMs,
}: {
  fromCache: boolean;
  failed: boolean;
  savedAtMs: number | null;
}) {
  if (!fromCache) return null;
  const when = savedAgo(savedAtMs);
  return (
    <View style={[styles.box, failed ? styles.offline : styles.updating]}>
      <Text style={[styles.text, failed ? styles.offlineText : styles.updatingText]}>
        {failed
          ? `Offline: showing last saved${when ? ` (${when})` : ""}. Pull down to try again.`
          : "Updating…"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 12, alignSelf: "flex-start" },
  updating: { backgroundColor: colors.greenSoft },
  offline: { backgroundColor: colors.goldSoft },
  text: { fontSize: 12, fontFamily: fonts.bold },
  updatingText: { color: colors.green },
  offlineText: { color: colors.goldText },
});
