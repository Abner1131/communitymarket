import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import PoweredByGreenFusion from "../components/PoweredByGreenFusion";

import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/community";

type Mode = "signin" | "signup";

const roles: { value: UserRole; label: string }[] = [
  { value: "customer", label: "Customer" },
  { value: "seller", label: "Seller" },
  { value: "rider", label: "Rider" },
];

export default function AuthScreen() {
  const router = useRouter();
  const { user, isLoading, signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!user || !needsOnboarding) return;

    if (user.role === "seller" || user.role === "rider") {
      router.replace("/role-onboarding" as any);
    } else {
      router.replace("/");
    }

    setNeedsOnboarding(false);
  }, [user, needsOnboarding, router]);

  async function handleSubmit() {
    setError("");

    const normalizedPhone = phone.trim();

    if (!normalizedPhone) {
      setError("Enter your phone number.");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setError("Enter your name.");
      return;
    }

    try {
      setSubmitting(true);

      if (mode === "signin") {
        await signIn(normalizedPhone);
        return;
      }

      await signUp({
        name: name.trim(),
        phone: normalizedPhone,
        role,
      });

      setNeedsOnboarding(role === "seller" || role === "rider");
    } catch (submitError) {
      console.error("AUTH ERROR:", submitError);

      const message =
        submitError instanceof Error
          ? submitError.message
          : "Authentication failed.";

      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading account...</Text>
      </SafeAreaView>
    );
  }

  if (user) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Opening CommunityMarket...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>CommunityMarket</Text>
        <Text style={styles.subtitle}>
          {mode === "signin"
            ? "Sign in to continue"
            : "Create your CommunityMarket account"}
        </Text>

        {mode === "signup" && (
          <>
            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              style={styles.input}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Account Role</Text>

            <View style={styles.roleRow}>
              {roles.map((item) => {
                const selected = role === item.value;

                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setRole(item.value)}
                    style={[
                      styles.roleButton,
                      selected && styles.roleButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        selected && styles.roleButtonTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="08000000000"
          style={styles.input}
          keyboardType="phone-pad"
          autoCapitalize="none"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={[
            styles.primaryButton,
            submitting && styles.primaryButtonDisabled,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {mode === "signin" ? "Sign In" : "Create Account"}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setError("");
            setMode((current) =>
              current === "signin" ? "signup" : "signin",
            );
          }}
          style={styles.switchButton}
        >
          <Text style={styles.switchText}>
            {mode === "signin"
              ? "Need an account? Sign up"
              : "Already have an account? Sign in"}
          </Text>
        </Pressable>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Prototype authentication</Text>
          <Text style={styles.noticeText}>
            This local prototype uses phone-based authentication and
            AsyncStorage. Production authentication should later use a secure
            backend and proper credentials.
          </Text>
        </View>
      </View>
      <PoweredByGreenFusion />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 28,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d0d0d0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    marginBottom: 18,
    backgroundColor: "#fff",
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  roleButton: {
    borderWidth: 1,
    borderColor: "#d0d0d0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  roleButtonSelected: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  roleButtonTextSelected: {
    color: "#fff",
  },
  error: {
    color: "#c62828",
    marginBottom: 14,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: "#111",
    borderRadius: 12,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  switchButton: {
    alignItems: "center",
    paddingVertical: 18,
  },
  switchText: {
    fontSize: 14,
    fontWeight: "600",
  },
  notice: {
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f4f4f4",
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 5,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#666",
  },
});