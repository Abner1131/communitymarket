// One-time "We've updated our policies" screen.
//
// Shown over the app to a signed-in user whose saved agreement is missing or
// older than POLICIES_VERSION (existing accounts now, and everyone after a
// policy change). They can read each policy, then tap "I agree" (saved with
// Google's time) or sign out. Not shown while reading /policies, and never
// when the profile couldn't load (e.g. offline) - we only ask when we know.

import { router, usePathname } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { POLICIES_UPDATED, POLICIES_VERSION } from "../data/policies";

export function PolicyGate() {
  const { user, acceptPolicies, signOut } = useAuth();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!user || !user.policiesKnown) return null;
  if (user.policiesVersion === POLICIES_VERSION) return null;
  if (pathname === "/policies" || pathname === "/auth") return null;

  const firstTime = !user.policiesVersion;

  async function agree() {
    setBusy(true);
    setError("");
    try {
      await acceptPolicies(); // the profile updates live and this screen closes
    } catch (e: any) {
      setError(
        e?.code?.includes?.("unavailable") || e?.message?.includes?.("offline")
          ? "No internet connection. Please try again."
          : "Could not save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const link = (tab: string, label: string) => (
    <Pressable style={styles.linkRow} onPress={() => router.push(`/policies?tab=${tab}` as any)}>
      <Text style={styles.linkText}>{label}</Text>
      <Text style={styles.linkArrow}>{"›"}</Text>
    </Pressable>
  );

  return (
    <View style={styles.overlay}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {firstTime ? "Our policies" : "We've updated our policies"}
          </Text>
          <Text style={styles.body}>
            {firstTime
              ? "Before you continue, please read and agree to how CommunityMarket works: our Terms of Use, Privacy Policy, and Refund and Cancellation Policy."
              : `Our policies changed on ${POLICIES_UPDATED}. Please read them and agree to continue using CommunityMarket.`}
          </Text>

          {link("terms", "Terms of Use")}
          {link("privacy", "Privacy Policy")}
          {link("refunds", "Refund and Cancellation Policy")}

          <Text style={styles.small}>
            By tapping "I agree" you confirm you are 18 or older and accept these policies.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryButton, busy && { opacity: 0.6 }]}
            disabled={busy}
            onPress={agree}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>I agree</Text>
            )}
          </Pressable>

          <Pressable style={styles.signOut} disabled={busy} onPress={() => void signOut()}>
            <Text style={styles.signOutText}>I don't agree - sign me out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#f5f6f8",
    zIndex: 1000,
    elevation: 1000,
  },
  container: { flexGrow: 1, justifyContent: "center", padding: 20, paddingTop: 60 },
  card: { backgroundColor: "#fff", borderRadius: 18, padding: 22 },
  title: { fontSize: 24, fontWeight: "800", color: "#111", marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 22, color: "#444", marginBottom: 16 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f5f6f8",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  linkText: { fontSize: 15, fontWeight: "700", color: "#111" },
  linkArrow: { fontSize: 22, color: "#888", fontWeight: "700" },
  small: { fontSize: 12.5, color: "#666", lineHeight: 18, marginTop: 10 },
  error: { color: "#b00020", marginTop: 12 },
  primaryButton: {
    backgroundColor: "#111",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 16,
  },
  primaryButtonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  signOut: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  signOutText: { color: "#888", fontWeight: "700" },
});
