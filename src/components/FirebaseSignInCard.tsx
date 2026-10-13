import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { PasswordInput } from "./PasswordInput";
import { colors, fonts, text, ui } from "../theme";

import { auth } from "../lib/firebase";

function friendlyError(e: any): string {
  const code: string = e?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "Wrong email or password.";
  }
  if (code.includes("email-already-in-use")) return "An account with this email already exists. Sign in instead.";
  if (code.includes("invalid-email")) return "That email address doesn't look right.";
  if (code.includes("weak-password")) return "Use a password of at least 6 characters.";
  if (code.includes("network")) return "No internet connection. Please try again.";
  return e?.message || "Could not sign in.";
}

// Email + password sign-in used for checkout, My Orders and payments.
export default function FirebaseSignInCard({
  title = "Sign in",
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function go(mode: "signin" | "create" | "reset") {
    setMessage("");
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setMessage("Enter your email address.");
      return;
    }
    if (mode !== "reset" && password.length < 6) {
      setMessage("Enter a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "create") {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await sendEmailVerification(cred.user).catch(() => undefined);
      } else if (mode === "signin") {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        await sendPasswordResetEmail(auth, cleanEmail);
        setMessage("Password reset email sent. Check your inbox.");
      }
    } catch (e) {
      setMessage(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.faint}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <PasswordInput
        style={styles.passwordBox}
        placeholder="Password (6+ characters)"
        value={password}
        onChangeText={setPassword}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Pressable
        style={({ pressed }) => [ui.primaryButton, styles.primaryButton, pressed && { backgroundColor: colors.greenPressed }]}
        disabled={busy}
        onPress={() => go("signin")}
      >
        <Text style={ui.primaryButtonText}>{busy ? "Please wait..." : "Sign in"}</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [ui.secondaryButton, styles.secondaryButton, pressed && { opacity: 0.7 }]}
        disabled={busy}
        onPress={() => go("create")}
      >
        <Text style={ui.secondaryButtonText}>New here? Create account</Text>
      </Pressable>
      <Pressable disabled={busy} onPress={() => go("reset")}>
        <Text style={styles.link}>Forgot password?</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...ui.card, padding: 20, marginBottom: 14 },
  title: { ...text.title, fontSize: 20 },
  subtitle: { ...text.small, fontSize: 14, marginTop: 6, lineHeight: 20 },
  input: { ...ui.input, marginTop: 12 },
  passwordBox: { ...ui.inputBox, marginTop: 12 },
  message: { fontFamily: fonts.semibold, color: colors.danger, marginTop: 10 },
  primaryButton: { marginTop: 16 },
  secondaryButton: { marginTop: 10 },
  link: { marginTop: 14, textAlign: "center", color: colors.green, fontFamily: fonts.bold },
});
