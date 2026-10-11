import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { checkDeletion, deleteMyAccount, type DeletionCheck } from "../lib/supportApi";

const naira = (n: number) => `₦${Math.round(n).toLocaleString()}`;

// Account -> Delete my account. Locks the account at once; it is erased
// after 7 days (CommunityMarket can restore it before then).
export function DeleteAccountCard({ onDeleted }: { onDeleted: (eraseAfterMs: number) => void }) {
  const [open, setOpen] = useState(false);
  const [check, setCheck] = useState<DeletionCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setOpen(true);
    setError("");
    setTyped("");
    setLoading(true);
    try {
      setCheck(await checkDeletion());
    } catch (e: any) {
      setError(e?.message || "Could not check your account. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (typed.trim().toUpperCase() !== "DELETE") return setError("Type DELETE to confirm.");
    setBusy(true);
    setError("");
    try {
      const r = await deleteMyAccount((check?.loss || 0) > 0);
      onDeleted(r.eraseAfterMs);
    } catch (e: any) {
      setError(e?.message || "Could not delete the account. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Pressable style={styles.link} onPress={() => void start()}>
        <Text style={styles.linkText}>Delete my account</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Delete my account</Text>
      {loading ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
      {check && check.blockers.length ? (
        <>
          <Text style={styles.text}>Before your account can be deleted:</Text>
          {check.blockers.map((b) => (
            <Text key={b} style={styles.blocker}>
              • {b}
            </Text>
          ))}
        </>
      ) : check ? (
        <>
          <Text style={styles.text}>
            • You are signed out and can't sign in again.{"\n"}• After {check.waitDays} days your name, phone, email,
            addresses, bank details and photos are erased for good.{"\n"}• Changed your mind? Contact CommunityMarket
            within {check.waitDays} days and we can restore it.{"\n"}• Order and payment records are kept without your
            name, as the law requires for accounts.
          </Text>
          {check.loss > 0 ? (
            <Text style={styles.warn}>You still have {naira(check.loss)} to spend in the app. It will be lost.</Text>
          ) : null}
          <Text style={styles.label}>Type DELETE to confirm</Text>
          <TextInput
            style={styles.input}
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            placeholder="DELETE"
            placeholderTextColor="#999"
          />
          <Pressable
            style={[styles.danger, (busy || typed.trim().toUpperCase() !== "DELETE") && { opacity: 0.5 }]}
            onPress={() => void confirm()}
            disabled={busy}
          >
            <Text style={styles.dangerText}>{busy ? "Deleting..." : "Delete my account"}</Text>
          </Pressable>
        </>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.cancel} onPress={() => setOpen(false)} disabled={busy}>
        <Text style={styles.cancelText}>Keep my account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  link: { alignItems: "center", paddingVertical: 14 },
  linkText: { color: "#999", fontWeight: "700", textDecorationLine: "underline" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: "#f3c2c8" },
  title: { fontSize: 16, fontWeight: "800", color: "#b00020" },
  text: { color: "#444", marginTop: 8, lineHeight: 21 },
  blocker: { color: "#b26a00", fontWeight: "700", marginTop: 6 },
  warn: { color: "#b00020", fontWeight: "700", marginTop: 10 },
  label: { fontSize: 13, fontWeight: "700", color: "#444", marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#d0d4db", borderRadius: 10, padding: 12, backgroundColor: "#fff", color: "#111" },
  danger: { marginTop: 12, backgroundColor: "#b00020", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  dangerText: { color: "#fff", fontWeight: "800" },
  cancel: { marginTop: 10, alignItems: "center", paddingVertical: 10 },
  cancelText: { fontWeight: "700", color: "#222" },
  error: { color: "#b00020", marginTop: 10 },
});
