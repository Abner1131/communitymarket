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

import { colors, fonts, radius, shadow, text, ui } from "../theme";
import { BrandMark } from "./Brand";
import { Icon } from "./Icon";

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
      <Icon name="chevron-right" size={18} color={colors.faint} />
    </Pressable>
  );

  return (
    <View style={styles.overlay}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <BrandMark size={52} style={{ marginBottom: 16 }} />
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
              <ActivityIndicator color="#ffffff" />
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
    backgroundColor: colors.bg,
    zIndex: 1000,
    elevation: 1000,
  },
  container: { flexGrow: 1, justifyContent: "center", padding: 20, paddingTop: 60 },
  card: { ...ui.card, ...shadow.raised, padding: 22, borderRadius: radius.xl },
  title: { ...text.title, fontSize: 24, marginBottom: 10 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.ink2, marginBottom: 16 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  linkText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  small: { ...text.small, fontSize: 12.5, marginTop: 10 },
  error: { fontFamily: fonts.semibold, color: colors.danger, marginTop: 12 },
  primaryButton: { ...ui.primaryButton, marginTop: 16 },
  primaryButtonText: ui.primaryButtonText,
  signOut: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  signOutText: { fontFamily: fonts.semibold, color: colors.faint },
});
