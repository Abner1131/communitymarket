import { StyleSheet, Text, View } from "react-native";

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
      <Text style={styles.label}>
        {onTheWay ? "🛵 Your rider is on the way" : "Delivery code"}
      </Text>
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
    backgroundColor: "#eef6ff",
    borderColor: "#90b8e6",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  cardActive: { backgroundColor: "#e8f5e9", borderColor: "#66bb6a" },
  cardCompact: { padding: 12, marginTop: 12 },
  label: { fontSize: 12, fontWeight: "800", color: "#37474f", textTransform: "uppercase", letterSpacing: 0.5 },
  code: { fontSize: 38, fontWeight: "900", letterSpacing: 6, color: "#111", marginVertical: 6 },
  codeCompact: { fontSize: 30, letterSpacing: 5 },
  help: { fontSize: 12, color: "#555", textAlign: "center", lineHeight: 17 },
});
