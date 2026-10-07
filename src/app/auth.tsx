import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { friendlyAuthError, useAuth } from "../context/AuthContext";

// The one sign-in screen for everybody: customers, sellers, riders, admin.
// Navigation after sign-in is handled by the AuthGate in _layout.tsx.
export default function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(true);

  function show(text: string, error = true) {
    setMessage(text);
    setIsError(error);
  }

  async function handleSubmit() {
    setMessage("");
    if (!email.trim()) return show("Enter your email address.");
    if (password.length < 6) return show("Enter a password of at least 6 characters.");
    if (mode === "signup") {
      if (!name.trim()) return show("Enter your full name.");
      if (!/^[0-9+\s-]{7,20}$/.test(phone.trim())) return show("Enter a valid phone number.");
    }

    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp({ name, phone, email, password });
      }
    } catch (e) {
      show(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!email.trim()) return show("Type your email above first, then tap Forgot password.");
    setBusy(true);
    try {
      await resetPassword(email);
      show("Password reset email sent. Check your inbox.", false);
    } catch (e) {
      show(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>CommunityMarket</Text>
          <Text style={styles.tagline}>Shop local. Delivered fast.</Text>

          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, mode === "signin" && styles.tabActive]}
              onPress={() => {
                setMode("signin");
                setMessage("");
              }}
            >
              <Text style={[styles.tabText, mode === "signin" && styles.tabTextActive]}>Sign in</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, mode === "signup" && styles.tabActive]}
              onPress={() => {
                setMode("signup");
                setMessage("");
              }}
            >
              <Text style={[styles.tabText, mode === "signup" && styles.tabTextActive]}>
                Create account
              </Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            {mode === "signup" && (
              <>
                <Text style={styles.label}>Full name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Amina Bello"
                  autoCapitalize="words"
                  value={name}
                  onChangeText={setName}
                />
                <Text style={styles.label}>Phone number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="08012345678"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </>
            )}

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {message ? (
              <Text style={[styles.message, !isError && styles.messageOk]}>{message}</Text>
            ) : null}

            <Pressable
              style={[styles.primaryButton, busy && { opacity: 0.6 }]}
              disabled={busy}
              onPress={handleSubmit}
            >
              <Text style={styles.primaryButtonText}>
                {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
              </Text>
            </Pressable>

            {mode === "signin" ? (
              <Pressable disabled={busy} onPress={handleReset}>
                <Text style={styles.link}>Forgot password?</Text>
              </Pressable>
            ) : (
              <Text style={styles.note}>
                Want to sell or ride with us? Create your account first, then apply from the
                Account page.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f6f8" },
  container: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  brand: { fontSize: 30, fontWeight: "900", textAlign: "center" },
  tagline: { color: "#666", textAlign: "center", marginTop: 6, marginBottom: 28 },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#e7e9ee",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center" },
  tabActive: { backgroundColor: "#fff" },
  tabText: { fontWeight: "700", color: "#666" },
  tabTextActive: { color: "#111" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  label: { fontSize: 13, fontWeight: "700", color: "#444", marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#d0d4db",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
    fontSize: 15,
  },
  message: { color: "#b00020", marginTop: 14 },
  messageOk: { color: "#1e7d32" },
  primaryButton: {
    marginTop: 20,
    backgroundColor: "#222",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  link: { marginTop: 16, textAlign: "center", color: "#1565c0", fontWeight: "600" },
  note: { marginTop: 16, color: "#666", textAlign: "center", lineHeight: 20, fontSize: 13 },
});
