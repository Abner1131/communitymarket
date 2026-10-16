import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark, BrandWordmark } from "../components/Brand";
import { Icon } from "../components/Icon";
import { colors, fonts, radius, shadow, text, ui } from "../theme";
import { PasswordInput } from "../components/PasswordInput";

import { friendlyAuthError, useAuth } from "../context/AuthContext";
import { normalizePhone, PHONE_MESSAGE } from "../lib/phone";
import { setSignInIntent, takeSignInNotice } from "../lib/signInIntent";
import { applyInviteCode } from "../lib/walletApi";

// The one sign-in screen for everybody: customers, sellers, riders, admin.
// Navigation after sign-in is handled by the AuthGate in _layout.tsx.
export default function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<"signin" | "signup" | "admin">("signin");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(true);

  // A message left by the app, e.g. "not an admin account".
  useEffect(() => {
    const notice = takeSignInNotice();
    if (notice) {
      setMessage(notice);
      setIsError(true);
    }
  }, []);

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
      if (!normalizePhone(phone)) return show(PHONE_MESSAGE);
    }

    setBusy(true);
    try {
      if (mode === "signin" || mode === "admin") {
        // "Admin sign in" goes straight to the Admin dashboard (checked in _layout).
        setSignInIntent(mode === "admin" ? "admin" : null);
        await signIn(email, password);
      } else {
        await signUp({ name, phone: normalizePhone(phone) || phone, email, password });
        // Optional invite code: saved in the background. If it's wrong, it can
        // be entered again later in Wallet.
        if (inviteCode.trim()) {
          applyInviteCode(inviteCode.trim()).catch(() => undefined);
        }
      }
    } catch (e) {
      setSignInIntent(null);
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
    <View style={ui.screen}>
      <View style={[ui.glow, { height: 420 }]} pointerEvents="none" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandBox} accessible accessibilityRole="header" accessibilityLabel="CommunityMarket">
            <BrandMark size={76} style={styles.mark} />
            <BrandWordmark height={27} />
          </View>
          <Text style={styles.tagline}>Your market, at your door.</Text>

          {mode === "admin" ? (
            <View style={styles.adminBanner}>
              <View style={styles.adminTitleRow}>
                <Icon name="lock" size={17} color={colors.danger} />
                <Text style={styles.adminTitle}>Staff sign in</Text>
              </View>
              <Text style={styles.adminText}>For CommunityMarket staff only. Every sign-in is recorded.</Text>
            </View>
          ) : null}

          {mode !== "admin" ? (
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
          ) : null}

          <View style={styles.card}>
            {mode === "signup" && (
              <>
                <Text style={styles.label}>Full name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Amina Bello"
                  placeholderTextColor={colors.faint}
                  autoCapitalize="words"
                  value={name}
                  onChangeText={setName}
                />
                <Text style={styles.label}>Phone number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="08012345678"
                  placeholderTextColor={colors.faint}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
                <Text style={styles.label}>Invite code (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="From a friend, e.g. AMINA4K2"
                  placeholderTextColor={colors.faint}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                />
              </>
            )}

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
                  placeholderTextColor={colors.faint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Password</Text>
            <PasswordInput
              style={styles.passwordBox}
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
            />

            {message ? (
              <Text style={[styles.message, !isError && styles.messageOk]}>{message}</Text>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                ui.primaryButton,
                styles.primaryButton,
                pressed && { backgroundColor: colors.greenPressed },
                busy && { opacity: 0.6 },
              ]}
              disabled={busy}
              onPress={handleSubmit}
            >
              <Text style={ui.primaryButtonText}>
                {busy ? "Please wait..." : mode === "signup" ? "Create account" : mode === "admin" ? "Sign in to Admin" : "Sign in"}
              </Text>
            </Pressable>

            {mode !== "signup" ? (
              <Pressable disabled={busy} onPress={handleReset}>
                <Text style={styles.link}>Forgot password?</Text>
              </Pressable>
            ) : (
              <>
                <Text style={styles.agree}>
                  By creating an account you confirm you are 18 or older and agree to our{" "}
                  <Text style={styles.agreeLink} onPress={() => router.push("/policies?tab=terms" as any)}>
                    Terms of Use
                  </Text>{" "}
                  and{" "}
                  <Text style={styles.agreeLink} onPress={() => router.push("/policies?tab=privacy" as any)}>
                    Privacy Policy
                  </Text>
                  .
                </Text>
                <Text style={styles.note}>
                  Want to sell or ride with us? Create your account first, then apply from the
                  Account page.
                </Text>
              </>
            )}
          </View>
          <Pressable
            style={styles.adminLink}
            disabled={busy}
            onPress={() => {
              setMessage("");
              setMode(mode === "admin" ? "signin" : "admin");
            }}
          >
            <Text style={styles.adminLinkText}>{mode === "admin" ? "← Back to customer sign in" : "Staff sign in (admin and marketing)"}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24 },
  brandBox: { alignItems: "center", gap: 14 },
  mark: { borderRadius: 22, ...shadow.button },
  tagline: { ...text.small, fontSize: 15, textAlign: "center", marginTop: 8, marginBottom: 28 },
  tabs: {
    flexDirection: "row",
    backgroundColor: "rgba(23,33,27,0.06)",
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: 16,
  },
  tab: { flex: 1, height: 42, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: colors.card, ...shadow.card },
  tabText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  tabTextActive: { fontFamily: fonts.bold, color: colors.ink },
  card: { ...ui.card, padding: 20 },
  label: { ...ui.label },
  input: { ...ui.input },
  passwordBox: { ...ui.inputBox },
  message: { fontFamily: fonts.semibold, color: colors.danger, marginTop: 14, lineHeight: 20 },
  messageOk: { color: colors.green },
  primaryButton: { marginTop: 20 },
  link: { marginTop: 16, textAlign: "center", color: colors.green, fontFamily: fonts.bold },
  note: { ...text.small, marginTop: 14, textAlign: "center", lineHeight: 19 },
  agree: { ...text.small, fontSize: 12.5, marginTop: 14, textAlign: "center", lineHeight: 19 },
  agreeLink: { color: colors.green, fontFamily: fonts.bold, textDecorationLine: "underline" },
  adminBanner: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: 14, marginBottom: 16 },
  adminTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  adminTitle: { fontFamily: fonts.bold, color: colors.danger, fontSize: 16 },
  adminText: { fontFamily: fonts.regular, color: "#7a2a33", textAlign: "center", marginTop: 4, fontSize: 12.5 },
  adminLink: { marginTop: 22, alignItems: "center", paddingVertical: 10 },
  adminLinkText: { fontFamily: fonts.semibold, color: colors.faint, fontSize: 13 },
});
