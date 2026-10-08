import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";

const ROLE_COLOR: Record<string, string> = {
  customer: "#555",
  seller: "#6a1b9a",
  rider: "#1565c0",
  admin: "#b00020",
};

export default function AccountScreen() {
  const { user, signOut, updateMyProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  if (!user) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  function startEdit() {
    if (!user) return;
    setName(user.name);
    setPhone(user.phone);
    setMessage("");
    setEditing(true);
  }

  async function save() {
    if (!name.trim()) return setMessage("Name can't be empty.");
    if (phone.trim() && !/^[0-9+\s-]{7,20}$/.test(phone.trim())) {
      return setMessage("Enter a valid phone number.");
    }
    setSaving(true);
    try {
      await updateMyProfile({ name, phone });
      setEditing(false);
    } catch (e: any) {
      setMessage(e?.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/auth" as any);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.replace("/")}>
          <Text style={styles.backText}>{"←"} Home</Text>
        </Pressable>
        <Text style={styles.title}>Account</Text>

        {/* PROFILE */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name.trim().charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.muted}>{user.email}</Text>
              <Text style={styles.muted}>{user.phone || "No phone number yet"}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: ROLE_COLOR[user.role] || "#555" }]}>
              <Text style={styles.roleBadgeText}>{user.role.toUpperCase()}</Text>
            </View>
          </View>

          {editing ? (
            <>
              <Text style={styles.label}>Full name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} />
              <Text style={styles.label}>Phone number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="08012345678"
              />
              {message ? <Text style={styles.error}>{message}</Text> : null}
              <View style={styles.buttonRow}>
                <Pressable style={[styles.secondaryButton, { flex: 1 }]} onPress={() => setEditing(false)}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, { flex: 1, marginTop: 12 }]}
                  disabled={saving}
                  onPress={save}
                >
                  <Text style={styles.primaryButtonText}>{saving ? "Saving..." : "Save"}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Pressable style={styles.secondaryButton} onPress={startEdit}>
              <Text style={styles.secondaryButtonText}>Edit profile</Text>
            </Pressable>
          )}
        </View>

        {/* ADMIN */}
        {user.role === "admin" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Admin</Text>
            <Text style={styles.description}>
              Approve riders and sellers, see today's numbers and fix stuck orders.
            </Text>
            <Pressable
              style={[styles.primaryButton, { backgroundColor: "#b00020" }]}
              onPress={() => router.push("/admin" as any)}
            >
              <Text style={styles.primaryButtonText}>Open Admin Dashboard</Text>
            </Pressable>
          </View>
        )}

        {/* ORDERS (everyone can shop) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>My shopping</Text>
          <Text style={styles.description}>Track your orders and deliveries.</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push("/orders")}>
            <Text style={styles.primaryButtonText}>View My Orders</Text>
          </Pressable>
        </View>

        {/* CUSTOMER -> apply */}
        {user.role === "customer" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Work with CommunityMarket</Text>
            <Text style={styles.description}>
              Earn by delivering orders as a rider, or sell your products to customers near you.
            </Text>
            <Pressable style={styles.secondaryButton} onPress={() => router.push("/apply" as any)}>
              <Text style={styles.secondaryButtonText}>Apply to be a rider or seller</Text>
            </Pressable>
          </View>
        )}

        {/* RIDER */}
        {(user.role === "rider" || user.role === "admin") && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Rider</Text>
            <Text style={styles.description}>
              Go online, see your trip, collect from sellers and confirm deliveries.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push("/rider" as any)}>
              <Text style={styles.primaryButtonText}>Open Rider Dashboard</Text>
            </Pressable>
          </View>
        )}

        {/* SELLER */}
        {(user.role === "seller" || user.role === "admin") && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Seller</Text>
            <Text style={styles.description}>
              Prepare paid orders for pickup and manage your products.
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push("/seller" as any)}
            >
              <Text style={styles.primaryButtonText}>Open Seller Dashboard</Text>
            </Pressable>
          </View>
        )}

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>

        <View style={{ height: 30 }} />
      </ScrollView>

      <View style={styles.bottomNav}>
        {[
          { icon: "\u{1F3E0}", text: "Home", go: () => router.replace("/") },
          { icon: "\u{1F6D2}", text: "Cart", go: () => router.push("/cart") },
          { icon: "\u{1F4E6}", text: "Orders", go: () => router.push("/orders") },
          { icon: "\u{1F4B0}", text: "Wallet", go: () => router.push("/wallet") },
          { icon: "\u{1F464}", text: "Account", go: undefined },
        ].map((tab) => (
          <Pressable key={tab.text} onPress={tab.go}>
            <Text style={styles.navIcon}>{tab.icon}</Text>
            <Text style={styles.navText}>{tab.text}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f6f8" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 20, paddingBottom: 100 },
  backText: { fontWeight: "700", marginBottom: 14 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 16 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 14 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  profileName: { fontSize: 18, fontWeight: "800" },
  muted: { color: "#666", marginTop: 3 },
  roleBadge: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, alignSelf: "flex-start" },
  roleBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  description: { color: "#666", marginTop: 6, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: "700", color: "#444", marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#d0d4db",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
  },
  error: { color: "#b00020", marginTop: 10 },
  buttonRow: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  primaryButton: {
    marginTop: 16,
    backgroundColor: "#222",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryButtonText: { fontWeight: "700" },
  signOutButton: {
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#b00020",
  },
  signOutText: { color: "#b00020", fontWeight: "800" },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navIcon: { textAlign: "center", fontSize: 20 },
  navText: { fontSize: 11, textAlign: "center", marginTop: 3 },
});
