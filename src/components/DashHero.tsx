// The green summary card at the top of the Seller, Rider and Marketing dashboards.

import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius, shadow } from "../theme";

export function DashHero({
  eyebrow,
  title,
  bigLabel,
  big,
  pills,
}: {
  eyebrow: string;
  title: string;
  bigLabel: string;
  big: string;
  pills: { label: string; value: string }[];
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <View style={styles.hero}>
        <Text style={styles.bigLabel}>{bigLabel}</Text>
        <Text style={styles.big} numberOfLines={1} adjustsFontSizeToFit>
          {big}
        </Text>
        <View style={styles.pills}>
          {pills.map((p) => (
            <View key={p.label} style={styles.pill}>
              <Text style={styles.pillLabel}>{p.label}</Text>
              <Text style={styles.pillValue} numberOfLines={1} adjustsFontSizeToFit>
                {p.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  eyebrow: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  title: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.8, color: colors.ink, marginTop: 2, marginBottom: 14 },
  hero: { backgroundColor: colors.green, borderRadius: 24, padding: 20, ...shadow.button },
  bigLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.onGreenMuted },
  big: { fontFamily: fonts.display, fontSize: 34, letterSpacing: -1, color: colors.gold, marginTop: 4, marginBottom: 14 },
  pills: { flexDirection: "row", gap: 10 },
  pill: { flex: 1, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12 },
  pillLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.onGreenMuted },
  pillValue: { fontFamily: fonts.bold, fontSize: 17, color: "#ffffff", marginTop: 2 },
});
