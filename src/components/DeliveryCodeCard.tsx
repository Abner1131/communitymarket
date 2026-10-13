import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius } from "../theme";
import { Icon } from "./Icon";

// Statuses where the order is paid but not yet handed over.
const SHOW_FOR = ["paid", "dispatching", "assigned", "picked_up"];

export function shouldShowDeliveryCode(status: string, code: unknown): code is string {
  return typeof code === "string" && code.length > 0 && SHOW_FOR.includes(status);
}

// The customer's delivery code. The rider types it in to confirm delivery,
// so it is only given out once the items are in the customer's hands.
export default function DeliveryCodeCard({
  code,
  status,
  compact = false,
}: {
  code: string;
  status: string;
  compact?: boolean;
}) {
  const onTheWay = status === "picked_up";
  return (
    <View style={[styles.card, onTheWay && styles.cardActive, compact && styles.cardCompact]}>
      <View style={styles.labelRow}>
        <Icon name={onTheWay ? "bike" : "key"} size={15} color={onTheWay ? colors.green : colors.goldText} />
        <Text style={[styles.label, onTheWay && { color: colors.green }]}>
          {onTheWay ? "Your rider is on the way" : "Delivery code"}
        </Text>
      </View>
      <Text
        style={[styles.code, compact && styles.codeCompact]}
        accessibilityLabel={`Delivery code ${code.split("").join(" ")}`}
        selectable
      >
        {code.split("").join(" ")}
      </Text>
      <Text style={styles.help}>
        Give this code to the rider only when you have received your items. Never share it on a call
        before delivery.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    backgroundColor: colors.goldSoft,
    borderRadius: radius.lg,
    padding: 16,
    alignItems: "center",
  },
  cardActive: { backgroundColor: colors.greenSoft },
  cardCompact: { padding: 14, marginTop: 12 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontFamily: fonts.bold, fontSize: 12, color: colors.goldText, textTransform: "uppercase", letterSpacing: 0.6 },
  code: { fontFamily: fonts.display, fontSize: 40, letterSpacing: 8, color: colors.ink, marginVertical: 6 },
  codeCompact: { fontSize: 32, letterSpacing: 6 },
  help: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink2, textAlign: "center", lineHeight: 17 },
});
