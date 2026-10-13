import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, fonts, ui } from "../theme";

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
            placeholderTextColor={colors.faint}
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
  linkText: { fontFamily: fonts.semibold, color: colors.faint, fontSize: 13, textDecorationLine: "underline" },
  card: { ...ui.card, padding: 18, marginTop: 4, marginBottom: 14, borderWidth: 1, borderColor: "#f3c2c8" },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.danger },
  text: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink2, marginTop: 8, lineHeight: 21 },
  blocker: { fontFamily: fonts.bold, color: colors.goldText, marginTop: 6 },
  warn: { fontFamily: fonts.bold, color: colors.danger, marginTop: 10 },
  label: { ...ui.label, marginTop: 14 },
  input: { ...ui.input },
  danger: {
    marginTop: 12,
    backgroundColor: colors.danger,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerText: { color: "#ffffff", fontFamily: fonts.bold, fontSize: 15 },
  cancel: { marginTop: 10, alignItems: "center", paddingVertical: 10 },
  cancelText: { fontFamily: fonts.bold, color: colors.ink },
  error: { fontFamily: fonts.semibold, color: colors.danger, marginTop: 10 },
});
