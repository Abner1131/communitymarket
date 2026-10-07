import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
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
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password (6+ characters)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Pressable style={styles.primaryButton} disabled={busy} onPress={() => go("signin")}>
        <Text style={styles.primaryButtonText}>{busy ? "Please wait..." : "Sign in"}</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} disabled={busy} onPress={() => go("create")}>
        <Text style={styles.secondaryButtonText}>New here? Create account</Text>
      </Pressable>
      <Pressable disabled={busy} onPress={() => go("reset")}>
        <Text style={styles.link}>Forgot password?</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { color: "#666", marginTop: 6, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    backgroundColor: "#fff",
  },
  message: { color: "#b00020", marginTop: 10 },
  primaryButton: {
    marginTop: 16,
    backgroundColor: "#222",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  secondaryButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryButtonText: { fontWeight: "700" },
  link: { marginTop: 14, textAlign: "center", color: "#1565c0", fontWeight: "600" },
});
