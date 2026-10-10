import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
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

import { db } from "../lib/firebase";
import { pickProductPhoto, type PickedPhoto } from "../lib/photoPick";
import {
  getMyReport,
  REPORT_REASONS,
  REPORT_WINDOW_HOURS,
  reportProblem,
  type MyReport,
  type ReportReason,
} from "../lib/supportApi";

const NAIRA = "₦";
const MAX_PHOTOS = 2;

type Line = { productId: string; name: string; unitPrice: number; quantity: number };
type OrderInfo = {
  status: string;
  deliveredAtMs: number | null;
  lines: Line[];
  issueStatus: string | null;
};

function money(n: number) {
  return `${NAIRA}${Math.round(n).toLocaleString()}`;
}

// Report a problem with a delivered order, or see the outcome of a report.
export default function ReportScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [report, setReport] = useState<MyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) return;
    return onSnapshot(
      doc(db, "orders", String(orderId)),
      (snap) => {
        const o = snap.data();
        if (!o) {
          setLoading(false);
          return;
        }
        const lines: Line[] = [];
        for (const b of Array.isArray(o.sellerBreakdown) ? o.sellerBreakdown : []) {
          for (const it of Array.isArray(b.items) ? b.items : []) {
            lines.push({
              productId: String(it.productId),
              name: String(it.name || "Item"),
              unitPrice: Number(it.unitPrice) || 0,
              quantity: Number(it.quantity) || 0,
            });
          }
        }
        setOrder({
          status: String(o.status || ""),
          deliveredAtMs: o.deliveredAt && typeof o.deliveredAt.toMillis === "function" ? o.deliveredAt.toMillis() : null,
          lines,
          issueStatus: o.issue && typeof o.issue.status === "string" ? o.issue.status : null,
        });
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [orderId]);

  // Already reported: load the details and outcome.
  const issueStatus = order?.issueStatus;
  useEffect(() => {
    if (!orderId || !issueStatus) return;
    getMyReport(String(orderId))
      .then(setReport)
      .catch(() => undefined);
  }, [orderId, issueStatus]);

  async function addPhoto(source: "camera" | "library") {
    setError("");
    try {
      const p = await pickProductPhoto(source);
      if (p) setPhotos((list) => [...list, p].slice(0, MAX_PHOTOS));
    } catch (e: any) {
      setError(e?.message || "Could not open the camera.");
    }
  }

  async function submit() {
    if (!orderId || !reason || !order) return;
    setError("");
    const items =
      reason === "not_received"
        ? []
        : Object.entries(picked)
            .filter(([, q]) => q > 0)
            .map(([productId, quantity]) => ({ productId, quantity }));
    if (reason !== "not_received" && items.length === 0) return setError("Tick the item(s) with the problem.");
    if (reason === "other" && note.trim().length < 5) return setError("Please describe the problem.");
    setBusy(true);
    try {
      const r = await reportProblem({
        orderId: String(orderId),
        reason,
        items,
        note: note.trim(),
        photos: photos.map((p) => p.base64),
      });
      setReport(r);
    } catch (e: any) {
      setError(e?.message || "Could not send your report.");
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <View style={styles.topBar}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/orders" as any))} hitSlop={10}>
        <Text style={styles.back}>{"←"} Back</Text>
      </Pressable>
      <Text style={styles.topTitle}>Order #{String(orderId || "").slice(0, 8).toUpperCase()}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <ActivityIndicator size="large" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  // ----- outcome view -----
  if (report || order?.issueStatus) {
    const r = report;
    const status = r?.status || order?.issueStatus;
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <ScrollView contentContainerStyle={styles.container}>
          <View
            style={[
              styles.statusCard,
              status === "refunded" ? styles.okCard : status === "rejected" ? styles.badCard : styles.waitCard,
            ]}
          >
            <Text style={styles.statusTitle}>
              {status === "refunded"
                ? `✓ ${money(r?.amount || 0)} refunded to your wallet`
                : status === "rejected"
                  ? "Report not accepted"
                  : "We're checking your report"}
            </Text>
            <Text style={styles.statusText}>
              {status === "refunded"
                ? "You can spend it on your next order. See Wallet → Funds."
                : status === "rejected"
                  ? r?.rejectReason || "We could not confirm the problem."
                  : "The shop has been told. We'll notify you when it's settled, usually within 24 hours."}
            </Text>
          </View>
          {r ? (
            <View style={styles.card}>
              <Text style={styles.label}>{r.reason}</Text>
              {r.items.map((i, k) => (
                <Text key={k} style={styles.item}>
                  {"•"} {i.quantity} × {i.name}
                </Text>
              ))}
              {r.note ? <Text style={[styles.item, { marginTop: 8 }]}>“{r.note}”</Text> : null}
              {r.photos.length ? (
                <View style={styles.photoRow}>
                  {r.photos.map((p) => (
                    <Image key={p.url} source={{ uri: p.thumbUrl }} style={styles.photo} contentFit="cover" />
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <ActivityIndicator style={{ marginTop: 20 }} />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ----- can't report -----
  const closesAtMs = order?.deliveredAtMs ? order.deliveredAtMs + REPORT_WINDOW_HOURS * 3600 * 1000 : null;
  if (!order || order.status !== "delivered" || (closesAtMs !== null && Date.now() > closesAtMs)) {
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reporting is not available</Text>
            <Text style={styles.muted}>
              {!order
                ? "Order not found."
                : order.status !== "delivered"
                  ? "You can report a problem once the order is delivered."
                  : `Problems must be reported within ${REPORT_WINDOW_HOURS} hours of delivery.`}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ----- report form -----
  const refundEstimate =
    reason === "not_received"
      ? order.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
      : order.lines.reduce((s, l) => s + l.unitPrice * (picked[l.productId] || 0), 0);

  return (
    <SafeAreaView style={styles.safe}>
      {header}
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Report a problem</Text>
        {closesAtMs ? (
          <Text style={styles.muted}>You can report until {new Date(closesAtMs).toLocaleString()}.</Text>
        ) : null}

        <Text style={styles.section}>What went wrong?</Text>
        {REPORT_REASONS.map((r) => (
          <Pressable
            key={r.code}
            style={[styles.option, reason === r.code && styles.optionActive]}
            onPress={() => setReason(r.code)}
          >
            <Text style={[styles.optionTitle, reason === r.code && { color: "#fff" }]}>{r.label}</Text>
            <Text style={[styles.optionHint, reason === r.code && { color: "#ddd" }]}>{r.hint}</Text>
          </Pressable>
        ))}

        {reason && reason !== "not_received" ? (
          <>
            <Text style={styles.section}>Which item(s)?</Text>
            {order.lines.map((l) => {
              const q = picked[l.productId] || 0;
              return (
                <View key={l.productId} style={[styles.card, styles.lineRow]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{l.name}</Text>
                    <Text style={styles.muted}>
                      You got {l.quantity} · {money(l.unitPrice)} each
                    </Text>
                  </View>
                  <View style={styles.stepper}>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => setPicked((p) => ({ ...p, [l.productId]: Math.max(0, q - 1) }))}
                    >
                      <Text style={styles.stepText}>−</Text>
                    </Pressable>
                    <Text style={styles.stepCount}>{q}</Text>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => setPicked((p) => ({ ...p, [l.productId]: Math.min(l.quantity, q + 1) }))}
                    >
                      <Text style={styles.stepText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </>
        ) : null}

        {reason ? (
          <>
            <Text style={styles.section}>Photos (optional, up to {MAX_PHOTOS})</Text>
            <View style={styles.photoRow}>
              {photos.map((p, i) => (
                <Pressable key={p.uri} onPress={() => setPhotos((list) => list.filter((_, k) => k !== i))}>
                  <Image source={{ uri: p.uri }} style={styles.photo} contentFit="cover" />
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              ))}
            </View>
            {photos.length < MAX_PHOTOS ? (
              <View style={styles.twoCol}>
                <Pressable style={styles.smallButton} onPress={() => void addPhoto("camera")} disabled={busy}>
                  <Text style={styles.smallButtonText}>📷 Take photo</Text>
                </Pressable>
                <Pressable style={styles.smallButton} onPress={() => void addPhoto("library")} disabled={busy}>
                  <Text style={styles.smallButtonText}>🖼 From gallery</Text>
                </Pressable>
              </View>
            ) : null}
            <Text style={styles.hint}>A clear photo of the problem helps us settle it faster.</Text>

            <Text style={styles.section}>Tell us more {reason === "other" ? "" : "(optional)"}</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={(t) => setNote(t.slice(0, 500))}
              multiline
              textAlignVertical="top"
              placeholder="What happened?"
            />

            {refundEstimate > 0 ? (
              <Text style={styles.hint}>
                If we confirm the problem, up to {money(refundEstimate)} goes back to your wallet.
              </Text>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={[styles.button, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => void submit()}>
              <Text style={styles.buttonText}>{busy ? "Sending..." : "Send report"}</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f6f8" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  back: { fontWeight: "700", fontSize: 15 },
  topTitle: { fontWeight: "700", color: "#555" },
  container: { padding: 16, paddingBottom: 60 },
  title: { fontSize: 24, fontWeight: "800" },
  section: { fontSize: 15, fontWeight: "800", marginTop: 20, marginBottom: 8 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: "800" },
  muted: { color: "#666", marginTop: 3 },
  hint: { color: "#888", fontSize: 12, marginTop: 8 },
  label: { fontSize: 15, fontWeight: "800", marginBottom: 6 },
  item: { color: "#333", marginTop: 3 },
  option: { backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#e3e3e3" },
  optionActive: { backgroundColor: "#222", borderColor: "#222" },
  optionTitle: { fontWeight: "800", fontSize: 15 },
  optionHint: { color: "#777", fontSize: 12, marginTop: 2 },
  lineRow: { flexDirection: "row", alignItems: "center" },
  stepper: { flexDirection: "row", alignItems: "center" },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#eee", alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 20, fontWeight: "800" },
  stepCount: { width: 32, textAlign: "center", fontWeight: "800", fontSize: 16 },
  photoRow: { flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 6, flexWrap: "wrap" },
  photo: { width: 96, height: 96, borderRadius: 10, backgroundColor: "#eee" },
  removeText: { color: "#b00020", fontSize: 11, textAlign: "center", marginTop: 2, fontWeight: "700" },
  twoCol: { flexDirection: "row", gap: 10 },
  smallButton: { flex: 1, borderWidth: 1, borderColor: "#222", borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  smallButtonText: { fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#d0d4db",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
    minHeight: 80,
  },
  error: { color: "#b00020", marginTop: 10, fontWeight: "600" },
  button: { marginTop: 16, backgroundColor: "#b00020", paddingVertical: 15, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  statusCard: { borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1 },
  okCard: { backgroundColor: "#e8f5e9", borderColor: "#81c784" },
  badCard: { backgroundColor: "#fdecea", borderColor: "#f5c2c0" },
  waitCard: { backgroundColor: "#fff8e1", borderColor: "#ffe082" },
  statusTitle: { fontSize: 17, fontWeight: "800" },
  statusText: { color: "#444", marginTop: 6, lineHeight: 20 },
});
