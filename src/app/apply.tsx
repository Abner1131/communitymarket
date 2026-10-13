import { router } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BrandLoader } from "../components/Brand";
import { Icon, type IconName } from "../components/Icon";
import { ScreenHeader } from "../components/ui";
import { colors, fonts, radius, text, ui } from "../theme";

import { useAuth } from "../context/AuthContext";
import { POLICIES_VERSION } from "../data/policies";
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

const STATUS_STYLE: Record<string, { text: string; bg: string; fg: string }> = {
  pending: { text: "Under review", bg: colors.goldSoft, fg: colors.goldText },
  approved: { text: "Approved", bg: colors.greenSoft, fg: colors.green },
  rejected: { text: "Not approved", bg: colors.dangerSoft, fg: colors.danger },
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
  // Optional code of the marketer who helped them sign up (e.g. MUSA01).
  const [marketerCode, setMarketerCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [agreed, setAgreed] = useState(false);

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
    const code = marketerCode.trim().toUpperCase();
    if (code) {
      if (!/^[A-Z0-9]{3,10}$/.test(code)) {
        setMessage("The marketer code is 3 to 10 letters or numbers. Leave it empty if you don't have one.");
        return;
      }
      try {
        const snap = await getDoc(doc(db, "marketerCodes", code));
        if (!snap.exists() || snap.data().active !== true) {
          setMessage(`Marketer code ${code} was not found. Check it with your marketer, or leave it empty.`);
          return;
        }
      } catch {
        setMessage("Could not check the marketer code. Check your internet and try again.");
        return;
      }
    }
    if (!agreed) {
      setMessage(`Tick the box to agree to the ${role === "seller" ? "seller" : "rider"} rules in our Terms of Use.`);
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
        // The tick box: which rules they agreed to, and when (Google's clock).
        termsAccepted: { version: POLICIES_VERSION, at: serverTimestamp() },
        ...(code ? { marketerCode: code } : {}),
      });
      setNote("");
      setMarketerCode("");
    } catch (e: any) {
      setMessage(e?.message || "Could not send your application.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={ui.screen}>
      <View style={ui.glow} pointerEvents="none" />
      <ScreenHeader title="Work with us" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>
          Apply to deliver as a rider or to sell your products on CommunityMarket.
        </Text>

        {loading ? (
          <BrandLoader style={{ marginTop: 30 }} />
        ) : (
          <>
            {applications.map((a) => {
              const s = STATUS_STYLE[a.status] ?? { text: a.status, bg: colors.chip, fg: colors.ink2 };
              return (
                <View key={a.id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle}>
                      {a.requestedRole === "rider" ? "Rider" : "Seller"} application
                    </Text>
                    <View style={[styles.badge, { backgroundColor: s.bg }]}>
                      <Text style={[styles.badgeText, { color: s.fg }]}>{s.text}</Text>
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
                    <Choice
                      key={r}
                      on={role === r}
                      icon={r === "rider" ? "bike" : "store"}
                      label={r === "rider" ? "Deliver" : "Sell"}
                      sub={r === "rider" ? "As a rider" : "As a seller"}
                      onPress={() => setRole(r)}
                    />
                  ))}
                </View>

                {role === "rider" ? (
                  <>
                    <Text style={styles.label}>My vehicle</Text>
                    <View style={styles.choiceRow}>
                      {(["bike", "keke"] as const).map((v) => (
                        <Choice
                          key={v}
                          on={vehicle === v}
                          icon={v === "bike" ? "bike" : "truck"}
                          label={v === "bike" ? "Motorbike" : "Keke"}
                          onPress={() => setVehicle(v)}
                        />
                      ))}
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>Shop name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Amina Foods"
                    placeholderTextColor={colors.faint}
                      value={businessName}
                      onChangeText={setBusinessName}
                    />
                    <Text style={styles.label}>Shop address</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Market, street, landmark"
                    placeholderTextColor={colors.faint}
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
                    placeholderTextColor={colors.faint}
                  value={note}
                  onChangeText={setNote}
                />

                <Text style={styles.label}>Marketer code (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. MUSA01, if a marketer helped you"
                    placeholderTextColor={colors.faint}
                  autoCapitalize="characters"
                  value={marketerCode}
                  onChangeText={(t) => setMarketerCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  maxLength={10}
                />

                <Text style={styles.muted}>
                  We'll contact you on {user.phone || "your phone number"}.
                </Text>

                <Pressable style={styles.agreeRow} onPress={() => setAgreed((a) => !a)} hitSlop={6}>
                  <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
                    {agreed ? <Icon name="check" size={14} color="#ffffff" /> : null}
                  </View>
                  <Text style={styles.agreeText}>
                    I have read and agree to the {role === "seller" ? "seller" : "rider"} rules in the{" "}
                    <Text style={styles.agreeLink} onPress={() => router.push("/policies?tab=terms" as any)}>
                      Terms of Use
                    </Text>
                    , including the{" "}
                    <Text style={styles.agreeLink} onPress={() => router.push("/policies?tab=refunds" as any)}>
                      Refund Policy
                    </Text>
                    .
                  </Text>
                </Pressable>

                {message ? <Text style={styles.error}>{message}</Text> : null}

                <Pressable
                  style={({ pressed }) => [
                    ui.primaryButton,
                    styles.primaryButton,
                    pressed && { backgroundColor: colors.greenPressed },
                    (busy || !agreed) && { opacity: 0.6 },
                  ]}
                  disabled={busy}
                  onPress={submit}
                >
                  <Text style={ui.primaryButtonText}>
                    {busy ? "Sending..." : "Send application"}
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Choice({
  on,
  icon,
  label,
  sub,
  onPress,
}: {
  on: boolean;
  icon: IconName;
  label: string;
  sub?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.choice, on && styles.choiceActive]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
    >
      <Icon name={icon} size={24} color={on ? colors.green : colors.ink2} />
      <Text style={[styles.choiceText, on && styles.choiceTextActive]}>{label}</Text>
      {sub ? <Text style={styles.choiceSub}>{sub}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 2, paddingBottom: 60 },
  subtitle: { ...text.small, fontSize: 14.5, lineHeight: 21, marginBottom: 16 },
  card: { ...ui.card, padding: 18, marginBottom: 12 },
  cardTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.ink },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontFamily: fonts.bold, fontSize: 12 },
  muted: { ...text.small, marginTop: 6 },
  ok: { fontFamily: fonts.bold, color: colors.green, marginTop: 8 },
  label: { ...ui.label, marginTop: 14 },
  choiceRow: { flexDirection: "row", gap: 10 },
  choice: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(23,33,27,0.10)",
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.card,
  },
  choiceActive: { borderColor: colors.green, borderWidth: 1.5, backgroundColor: "#f6faf7" },
  choiceText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink2 },
  choiceTextActive: { color: colors.green },
  choiceSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  input: { ...ui.input },
  error: { fontFamily: fonts.semibold, color: colors.danger, marginTop: 12 },
  agreeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 16 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.faint,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: colors.green, borderColor: colors.green },
  agreeText: { flex: 1, fontFamily: fonts.regular, color: colors.ink2, lineHeight: 20 },
  agreeLink: { color: colors.green, fontFamily: fonts.bold, textDecorationLine: "underline" },
  primaryButton: { marginTop: 18 },
});
