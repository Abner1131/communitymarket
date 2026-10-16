// "Read and agree" block for the Marketer Terms / Manager Terms.
//
// Key points first (plain words), the full text one tap away, then a tick box.
// The parent keeps the ticked state and keeps its own button disabled until
// it is ticked. Used when linking a marketer code, when a manager makes his
// own code, and when the Terms change.

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius } from "../theme";
import {
  marketerTermsBody,
  MARKETER_TERMS_UPDATED,
  termsKeyPoints,
  termsTitle,
  type PayNumbers,
  type TermsKind,
} from "../data/marketerTerms";
import { Icon } from "./Icon";
import { PolicyText } from "./PolicyText";

export function MarketerTermsAgree({
  kind,
  settings,
  agreed,
  onChange,
}: {
  kind: TermsKind;
  settings?: Partial<PayNumbers> | null;
  agreed: boolean;
  onChange: (value: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const title = termsTitle(kind);
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{title}, in short</Text>
      {termsKeyPoints(kind, settings).map((point) => (
        <View key={point} style={styles.point}>
          <Icon name="check" size={15} color={colors.green} style={{ marginTop: 3 }} />
          <Text style={styles.pointText}>{point}</Text>
        </View>
      ))}

      <Pressable style={styles.readRow} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.readText}>{open ? `Hide the full ${title}` : `Read the full ${title}`}</Text>
        <Icon name="chevron-right" size={18} color={colors.faint} style={open ? { transform: [{ rotate: "90deg" }] } : undefined} />
      </Pressable>
      {open ? (
        <View style={styles.full}>
          <Text style={styles.updated}>Last updated {MARKETER_TERMS_UPDATED}</Text>
          <PolicyText body={marketerTermsBody(kind, settings)} />
        </View>
      ) : null}

      <Pressable
        style={styles.tickRow}
        onPress={() => onChange(!agreed)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        accessibilityLabel={`I have read and agree to the ${title}`}
      >
        <View style={[styles.box, agreed && styles.boxOn]}>
          {agreed ? <Icon name="check" size={15} color="#ffffff" /> : null}
        </View>
        <Text style={styles.tickText}>I have read and agree to the {title}, and I am 18 or older.</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  heading: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.ink, marginBottom: 8 },
  point: { flexDirection: "row", gap: 8, marginBottom: 7 },
  pointText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink2 },
  readRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    height: 48,
    paddingHorizontal: 14,
    marginTop: 6,
  },
  readText: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.ink },
  full: { marginTop: 10, paddingTop: 4 },
  updated: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginBottom: 8 },
  tickRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 16 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.faint,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  boxOn: { backgroundColor: colors.green, borderColor: colors.green },
  tickText: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.ink },
});
