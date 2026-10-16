// A restaurant's daily controls on the Seller screen: open / closed, how long
// a dish takes, and opening hours. Customers see all three on the dishes.
// (Normal shops don't get this card.)

import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import type { SellerState } from "../lib/sellerApi";

export type ShopInfo = { open?: boolean; prepMin?: number; prepMax?: number; hours?: string };

export function RestaurantCard({
  seller,
  busy,
  onSave,
}: {
  seller: SellerState["seller"];
  busy: boolean;
  onSave: (info: ShopInfo) => Promise<boolean>;
}) {
  const open = seller.open !== false;
  const [min, setMin] = useState(seller.prepMin ? String(seller.prepMin) : "");
  const [max, setMax] = useState(seller.prepMax ? String(seller.prepMax) : "");
  const [hours, setHours] = useState(seller.hours || "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Follow the saved values (after a refresh or a save).
  useEffect(() => {
    setMin(seller.prepMin ? String(seller.prepMin) : "");
    setMax(seller.prepMax ? String(seller.prepMax) : "");
    setHours(seller.hours || "");
  }, [seller.prepMin, seller.prepMax, seller.hours]);

  async function saveDetails() {
    setError("");
    setSaved(false);
    const prepMin = parseInt(min, 10);
    const prepMax = parseInt(max, 10);
    if (!Number.isInteger(prepMin) || !Number.isInteger(prepMax)) {
      return setError("Enter the shortest and longest time in minutes, e.g. 20 and 30.");
    }
    if (prepMin < 5 || prepMax > 180 || prepMin > prepMax) {
      return setError("Times must be from 5 to 180 minutes, shortest first.");
    }
    if (await onSave({ prepMin, prepMax, hours: hours.trim() })) setSaved(true);
  }

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.title}>{open ? "Open for orders" : "Closed"}</Text>
          <Text style={styles.muted}>
            {open
              ? "Customers can order from your menu now."
              : "Customers can see your menu but cannot order until you open."}
          </Text>
        </View>
        <Switch
          value={open}
          disabled={busy}
          onValueChange={(value) => void onSave({ open: value })}
          accessibilityLabel="Open for orders"
        />
      </View>

      <View style={styles.divider} />

      <Text style={styles.label}>How long does a dish take? (minutes)</Text>
      <View style={styles.twoCol}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={min}
          onChangeText={(t) => {
            setMin(t.replace(/\D/g, "").slice(0, 3));
            setSaved(false);
          }}
          keyboardType="number-pad"
          placeholder="From, e.g. 20"
        />
        <Text style={styles.to}>to</Text>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={max}
          onChangeText={(t) => {
            setMax(t.replace(/\D/g, "").slice(0, 3));
            setSaved(false);
          }}
          keyboardType="number-pad"
          placeholder="To, e.g. 30"
        />
      </View>

      <Text style={styles.label}>Opening hours (optional)</Text>
      <TextInput
        style={styles.input}
        value={hours}
        onChangeText={(t) => {
          setHours(t.slice(0, 40));
          setSaved(false);
        }}
        placeholder="e.g. 8am - 10pm"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {saved ? <Text style={styles.ok}>Saved. Customers see this on your dishes.</Text> : null}
      <Pressable style={[styles.button, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => void saveDetails()}>
        <Text style={styles.buttonText}>{busy ? "Saving..." : "Save"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 16, fontWeight: "800" },
  muted: { color: "#666", marginTop: 3 },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 12 },
  label: { fontSize: 13, fontWeight: "700", color: "#444", marginTop: 10, marginBottom: 6 },
  twoCol: { flexDirection: "row", gap: 10, alignItems: "center" },
  to: { color: "#666", fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#d0d4db", borderRadius: 10, padding: 12, backgroundColor: "#fff" },
  error: { color: "#b00020", marginTop: 8 },
  ok: { color: "#1e7d32", fontWeight: "700", marginTop: 8 },
  button: { marginTop: 14, backgroundColor: "#222", paddingVertical: 13, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "800" },
});
