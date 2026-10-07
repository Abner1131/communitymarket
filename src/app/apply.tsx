import { router } from "expo-router";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
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
import { db } from "../lib/firebase";

type Application = {
  id: string;
  requestedRole: "rider" | "seller";
  status: "pending" | "approved" | "rejected";
  vehicle?: string | null;
  businessName?: string | null;
  createdAt: Date | null;
  adminNote?: string | null;
};

const STATUS_STYLE: Record<string, { text: string; color: string }> = {
  pending: { text: "UNDER REVIEW", color: "#b26a00" },
  approved: { text: "APPROVED", color: "#1e7d32" },
  rejected: { text: "NOT APPROVED", color: "#b00020" },
};

// Customers apply here to become a rider or a seller. The admin approves
// applications with the server's manage-roles.js script.
export default function ApplyScreen() {
  const { user } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"rider" | "seller">("rider");
  const [vehicle, setVehicle] = useState<"bike" | "keke">("bike");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "roleApplications"), where("uid", "==", user.id));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const data = d.data();
            const ts = data.createdAt as Timestamp | null | undefined;
            return {
              id: d.id,
              requestedRole: data.requestedRole,
              status: data.status,
              vehicle: data.vehicle ?? null,
              businessName: data.businessName ?? null,
              adminNote: data.adminNote ?? null,
              createdAt: ts && typeof ts.toDate === "function" ? ts.toDate() : null,
            } as Application;
          })
          .sort((a, b) => (b.createdAt?.getTime() ?? Date.now()) - (a.createdAt?.getTime() ?? Date.now()));
        setApplications(list);
        setLoading(false);
      },
      (err) => {
        console.warn("APPLICATIONS LOAD FAILED:", err);
        setLoading(false);
      },
    );
  }, [user]);

  if (!user) return null;

  const pending = applications.find((a) => a.status === "pending");
  const alreadyRole = user.role === "rider" || user.role === "seller" || user.role === "admin";

  async function submit() {
    setMessage("");
    if (!user) return;
    if (!user.phone) {
      setMessage("Add your phone number on the Account page first.");
      return;
    }
    if (role === "seller" && (!businessName.trim() || !businessAddress.trim())) {
      setMessage("Enter your shop name and address.");
      return;
    }
    setBusy(true);
    try {
      await addDoc(collection(db, "roleApplications"), {
        uid: user.id,
        name: user.name,
        email: user.email ?? null,
        phone: user.phone,
        requestedRole: role,
        vehicle: role === "rider" ? vehicle : null,
        businessName: role === "seller" ? businessName.trim().slice(0, 100) : null,
        businessAddress: role === "seller" ? businessAddress.trim().slice(0, 200) : null,
        note: note.trim().slice(0, 500),
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setNote("");
    } catch (e: any) {
      setMessage(e?.message || "Could not send your application.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>{"←"} Back</Text>
        </Pressable>
        <Text style={styles.title}>Work with us</Text>
        <Text style={styles.subtitle}>
          Apply to deliver as a rider or to sell your products on CommunityMarket.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 30 }} />
        ) : (
          <>
            {applications.map((a) => {
              const s = STATUS_STYLE[a.status] ?? { text: a.status, color: "#222" };
              return (
                <View key={a.id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle}>
                      {a.requestedRole === "rider" ? "Rider" : "Seller"} application
                    </Text>
                    <View style={[styles.badge, { backgroundColor: s.color }]}>
                      <Text style={styles.badgeText}>{s.text}</Text>
                    </View>
                  </View>
                  <Text style={styles.muted}>
                    {a.requestedRole === "rider"
                      ? `Vehicle: ${(a.vehicle || "").toUpperCase()}`
                      : `Shop: ${a.businessName || ""}`}
                  </Text>
                  {a.createdAt ? (
                    <Text style={styles.muted}>Sent {a.createdAt.toLocaleDateString()}</Text>
                  ) : null}
                  {a.adminNote ? <Text style={styles.muted}>Note: {a.adminNote}</Text> : null}
                  {a.status === "approved" && (
                    <Text style={styles.ok}>
                      You're approved. Your new tools are on the Account page.
                    </Text>
                  )}
                </View>
              );
            })}

            {alreadyRole ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Your account is already a {user.role}.</Text>
              </View>
            ) : pending ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>We're reviewing your application</Text>
                <Text style={styles.muted}>
                  You'll get your new tools on the Account page as soon as it's approved.
                </Text>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>New application</Text>

                <Text style={styles.label}>I want to</Text>
                <View style={styles.choiceRow}>
                  {(["rider", "seller"] as const).map((r) => (
                    <Pressable
                      key={r}
                      style={[styles.choice, role === r && styles.choiceActive]}
                      onPress={() => setRole(r)}
                    >
                      <Text style={[styles.choiceText, role === r && styles.choiceTextActive]}>
                        {r === "rider" ? "Deliver (Rider)" : "Sell (Seller)"}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {role === "rider" ? (
                  <>
                    <Text style={styles.label}>My vehicle</Text>
                    <View style={styles.choiceRow}>
                      {(["bike", "keke"] as const).map((v) => (
                        <Pressable
                          key={v}
                          style={[styles.choice, vehicle === v && styles.choiceActive]}
                          onPress={() => setVehicle(v)}
                        >
                          <Text style={[styles.choiceText, vehicle === v && styles.choiceTextActive]}>
                            {v === "bike" ? "Motorbike" : "Keke"}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>Shop name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Amina Foods"
                      value={businessName}
                      onChangeText={setBusinessName}
                    />
                    <Text style={styles.label}>Shop address</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Market, street, landmark"
                      value={businessAddress}
                      onChangeText={setBusinessAddress}
                    />
                  </>
                )}

                <Text style={styles.label}>Anything else? (optional)</Text>
                <TextInput
                  style={[styles.input, { minHeight: 70 }]}
                  multiline
                  textAlignVertical="top"
                  placeholder="Experience, area you cover, etc."
                  value={note}
                  onChangeText={setNote}
                />

                <Text style={styles.muted}>
                  We'll contact you on {user.phone || "your phone number"}.
                </Text>

                {message ? <Text style={styles.error}>{message}</Text> : null}

                <Pressable
                  style={[styles.primaryButton, busy && { opacity: 0.6 }]}
                  disabled={busy}
                  onPress={submit}
                >
                  <Text style={styles.primaryButtonText}>
                    {busy ? "Sending..." : "Send application"}
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f6f8" },
  container: { padding: 20, paddingBottom: 60 },
  backText: { fontWeight: "700", marginBottom: 14 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { color: "#666", marginTop: 6, marginBottom: 18, lineHeight: 20 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: "800" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  muted: { color: "#666", marginTop: 6 },
  ok: { color: "#1e7d32", fontWeight: "700", marginTop: 8 },
  label: { fontSize: 13, fontWeight: "700", color: "#444", marginTop: 14, marginBottom: 6 },
  choiceRow: { flexDirection: "row", gap: 8 },
  choice: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  choiceActive: { borderColor: "#222", backgroundColor: "#222" },
  choiceText: { fontWeight: "700", color: "#444" },
  choiceTextActive: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: "#d0d4db",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
  },
  error: { color: "#b00020", marginTop: 12 },
  primaryButton: {
    marginTop: 18,
    backgroundColor: "#222",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "800" },
});
