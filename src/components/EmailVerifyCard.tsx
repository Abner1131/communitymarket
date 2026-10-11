import { sendEmailVerification } from "firebase/auth";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { auth } from "../lib/firebase";

// "Verify your email": invite codes and referral rewards need it (stops fake
// accounts). onVerified runs after the user confirms it in their inbox.
export function EmailVerifyCard({ reason, onVerified }: { reason?: string; onVerified?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(Boolean(auth.currentUser?.emailVerified));

  // Verified in the email app while we were away? Pick it up quietly.
  useEffect(() => {
    let alive = true;
    const u = auth.currentUser;
    if (!u) return;
    u.reload()
      .then(async () => {
        if (!alive || !auth.currentUser) return;
        if (auth.currentUser.emailVerified) {
          await auth.currentUser.getIdToken(true);
          if (!alive) return;
          setVerified(true);
          onVerified?.();
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!auth.currentUser || verified) return null;

  async function send() {
    if (!auth.currentUser) return;
    setBusy(true);
    setMessage("");
    try {
      await sendEmailVerification(auth.currentUser);
      setMessage(`Link sent to ${auth.currentUser.email}. Open it, then tap "I've verified". Check spam too.`);
    } catch (e: any) {
      setMessage(
        String(e?.code || "").includes("too-many-requests")
          ? "A link was sent a moment ago. Check your inbox (and spam), or try again in a few minutes."
          : "Could not send the link. Check your internet and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function done() {
    if (!auth.currentUser) return;
    setBusy(true);
    setMessage("");
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        await auth.currentUser.getIdToken(true); // the server sees it at once
        setVerified(true);
        onVerified?.();
      } else {
        setMessage("Not verified yet. Open the link in the email first.");
      }
    } catch {
      setMessage("Could not check. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>📧 Verify your email</Text>
      <Text style={styles.text}>{reason || "Verify your email to use invite codes and earn referral rewards."}</Text>
      <View style={styles.row}>
        <Pressable style={[styles.button, busy && { opacity: 0.6 }]} onPress={send} disabled={busy}>
          <Text style={styles.buttonText}>Send link</Text>
        </Pressable>
        <Pressable style={[styles.outline, busy && { opacity: 0.6 }]} onPress={done} disabled={busy}>
          <Text style={styles.outlineText}>I've verified</Text>
        </Pressable>
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: "#fff8e6", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#f0c36b" },
  title: { fontWeight: "800", fontSize: 15, color: "#5c4300" },
  text: { color: "#6b5a2e", marginTop: 4, fontSize: 13 },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  button: { flex: 1, backgroundColor: "#222", borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "800" },
  outline: { flex: 1, borderWidth: 1, borderColor: "#222", borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  outlineText: { fontWeight: "800", color: "#222" },
  message: { marginTop: 10, color: "#333", fontSize: 13 },
});
