// Admin -> Records -> Downloads: spreadsheets (CSV) for audits and records.
// Each tap makes a one-time link that works for 5 minutes and opens it in the
// phone's browser, which saves the file. Every download is recorded in the
// Activity log. Admins only (the server checks).

import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { getExportLink, type ExportReport } from "../lib/adminApi";
import { colors, fonts, radius, text, ui } from "../theme";
import { Icon, type IconName } from "./Icon";

const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type Preset = "this_month" | "last_month" | "last_30" | "custom";

const REPORTS: { key: ExportReport; title: string; note: string; icon: IconName; ranged: boolean }[] = [
  { key: "orders", title: "Orders", note: "Every order: shop, items, fees, total, status, rider", icon: "package", ranged: true },
  { key: "payments", title: "Payments", note: "Paystack payments, to match your Paystack statement", icon: "card", ranged: true },
  { key: "profit", title: "Your profit by day", note: "Commission, delivery fees, rider pay, what you kept", icon: "chart", ranged: true },
  { key: "seller_earnings", title: "Seller earnings", note: "Each shop's sales, commission, paid out, balance", icon: "store", ranged: true },
  { key: "rider_earnings", title: "Rider earnings", note: "Each rider's trips, pay, paid out, balance", icon: "bike", ranged: true },
  { key: "payouts", title: "Payouts sent", note: "Withdrawals: who, amount, bank (last 4 digits), reference", icon: "arrow-up-right", ranged: true },
  { key: "problems", title: "Refunds and problems", note: "Customer complaints and how each was settled", icon: "alert", ranged: true },
  { key: "applications", title: "Applications and marketer codes", note: "Who each marketer brought in, who was approved", icon: "megaphone", ranged: true },
  { key: "onboarding_fees", title: "Registration fees collected", note: "Each ₦500 taken from a new seller or rider, with a total to move to your fees account", icon: "receipt", ranged: true },
  { key: "marketer_pay", title: "Marketer pay statements", note: "Closed weeks: each person, amount, bank (last 4), paid", icon: "megaphone", ranged: true },
  { key: "marketer_earnings", title: "Marketer earnings detail", note: "Every order that earned marketer pay, and its status", icon: "megaphone", ranged: true },
  { key: "activity", title: "Activity log", note: "Who did what, and when", icon: "list", ranged: true },
  { key: "shops", title: "Shops", note: "All shops: owner phone, status, products, joined", icon: "store", ranged: false },
  { key: "riders", title: "Riders", note: "All riders: vehicle, status, joined", icon: "bike", ranged: false },
  { key: "customers", title: "Customers", note: "Names, contacts, joined, number of orders", icon: "users", ranged: false },
  { key: "terms", title: "Terms agreements", note: "Who agreed to which policies, and when", icon: "file", ranged: false },
];

/** Lagos midnight of a calendar day, as a timestamp. */
function lagosMidnight(y: number, m: number, d: number) {
  return Date.UTC(y, m, d) - LAGOS_OFFSET_MS;
}

function lagosToday() {
  const d = new Date(Date.now() + LAGOS_OFFSET_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() };
}

function parseDay(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const t = lagosMidnight(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isFinite(t) ? t : null;
}

function dayText(msValue: number) {
  return new Date(msValue + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

export function rangeFor(preset: Preset, from: string, to: string): { fromMs: number; toMs: number } | string {
  const t = lagosToday();
  const tomorrow = lagosMidnight(t.y, t.m, t.d + 1);
  if (preset === "this_month") return { fromMs: lagosMidnight(t.y, t.m, 1), toMs: tomorrow };
  if (preset === "last_month") return { fromMs: lagosMidnight(t.y, t.m - 1, 1), toMs: lagosMidnight(t.y, t.m, 1) };
  if (preset === "last_30") return { fromMs: tomorrow - 30 * DAY_MS, toMs: tomorrow };
  const a = parseDay(from);
  const b = parseDay(to);
  if (a === null || b === null) return "Type both dates like 2026-10-01.";
  if (b < a) return "The end date must be on or after the start date.";
  return { fromMs: a, toMs: b + DAY_MS };
}

/** Make a link and open it in the browser. Returns a message to show. */
export async function downloadReport(report: ExportReport, range: { fromMs: number; toMs: number } | null) {
  const { url } = await getExportLink(report, range ? range.fromMs : null, range ? range.toMs : null);
  await Linking.openURL(url);
  return "Opening in your browser. The file saves to your Downloads.";
}

/** Small "Download" button for a list (last `days` days for dated reports, 30 by default). */
export function DownloadButton({ report, label = "Download", days = 30 }: { report: ExportReport; label?: string; days?: number }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const ranged = REPORTS.find((r) => r.key === report)?.ranged ?? true;
  return (
    <View style={{ alignItems: "flex-end" }}>
      <Pressable
        style={({ pressed }) => [styles.smallDownload, (pressed || busy) && { opacity: 0.6 }]}
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setMsg("");
          try {
            const last30 = rangeFor("last_30", "", "") as { fromMs: number; toMs: number };
            const range = ranged ? { fromMs: last30.toMs - days * DAY_MS, toMs: last30.toMs } : null;
            await downloadReport(report, range);
          } catch (e: any) {
            setMsg(e?.message || "Could not download.");
          } finally {
            setBusy(false);
          }
        }}
        accessibilityLabel={`${label}${ranged ? `, last ${days} days` : ""}`}
      >
        <Icon name="download" size={15} color={colors.green} />
        <Text style={styles.smallDownloadText}>{busy ? "..." : label}</Text>
      </Pressable>
      {msg ? <Text style={styles.errorSmall}>{msg}</Text> : null}
    </View>
  );
}

export function AdminDownloads() {
  const [preset, setPreset] = useState<Preset>("this_month");
  const t = lagosToday();
  const [from, setFrom] = useState(dayText(lagosMidnight(t.y, t.m, 1)));
  const [to, setTo] = useState(dayText(lagosMidnight(t.y, t.m, t.d)));
  const [busy, setBusy] = useState<ExportReport | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const range = rangeFor(preset, from, to);
  const rangeLabel =
    typeof range === "string" ? range : `${dayText(range.fromMs)} to ${dayText(range.toMs - DAY_MS)}`;

  async function go(report: ExportReport, ranged: boolean) {
    setMessage("");
    setError("");
    if (ranged && typeof range === "string") return setError(range);
    setBusy(report);
    try {
      setMessage(await downloadReport(report, ranged && typeof range !== "string" ? range : null));
    } catch (e: any) {
      setError(e?.message || "Could not download.");
    } finally {
      setBusy(null);
    }
  }

  const row = (r: (typeof REPORTS)[number]) => (
    <Pressable
      key={r.key}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.chip }]}
      onPress={() => void go(r.key, r.ranged)}
      disabled={busy !== null}
      accessibilityLabel={`Download ${r.title}`}
    >
      <View style={styles.rowIcon}>
        <Icon name={r.icon} size={18} color={colors.green} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{r.title}</Text>
        <Text style={styles.rowNote}>{r.note}</Text>
      </View>
      <View style={styles.dlBadge}>
        <Icon name="download" size={16} color={busy === r.key ? colors.faint : colors.green} />
      </View>
    </Pressable>
  );

  return (
    <View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dates</Text>
        <View style={styles.chips}>
          {(
            [
              ["this_month", "This month"],
              ["last_month", "Last month"],
              ["last_30", "Last 30 days"],
              ["custom", "Pick dates"],
            ] as [Preset, string][]
          ).map(([k, label]) => (
            <Pressable
              key={k}
              style={[styles.chip, preset === k && styles.chipOn]}
              onPress={() => setPreset(k)}
              accessibilityRole="radio"
              accessibilityState={{ selected: preset === k }}
            >
              <Text style={[styles.chipText, preset === k && styles.chipTextOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {preset === "custom" ? (
          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>From</Text>
              <TextInput style={ui.input} value={from} onChangeText={setFrom} placeholder="2026-10-01" placeholderTextColor={colors.faint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>To</Text>
              <TextInput style={ui.input} value={to} onChangeText={setTo} placeholder="2026-10-31" placeholderTextColor={colors.faint} />
            </View>
          </View>
        ) : null}
        <View style={styles.rangeRow}>
          <Icon name="calendar" size={15} color={colors.muted} />
          <Text style={styles.rangeText}>{rangeLabel} (Nigerian time)</Text>
        </View>
      </View>

      {message ? (
        <View style={[styles.note, { backgroundColor: colors.greenSoft }]}>
          <Icon name="check" size={16} color={colors.green} />
          <Text style={[styles.noteText, { color: colors.green }]}>{message}</Text>
        </View>
      ) : null}
      {error ? (
        <View style={[styles.note, { backgroundColor: colors.dangerSoft }]}>
          <Icon name="alert" size={16} color={colors.danger} />
          <Text style={[styles.noteText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}

      <Text style={styles.groupTitle}>For the dates above</Text>
      <View style={styles.group}>{REPORTS.filter((r) => r.ranged).map(row)}</View>

      <Text style={styles.groupTitle}>Everything to date</Text>
      <View style={styles.group}>{REPORTS.filter((r) => !r.ranged).map(row)}</View>

      <View style={styles.privacy}>
        <Icon name="lock" size={14} color={colors.muted} />
        <Text style={styles.privacyText}>
          Each link works once, for 5 minutes. Every download is recorded in the Activity log. Bank account numbers
          show only the last 4 digits. Keep downloaded files private: they hold customers' details.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...ui.card, padding: 16, marginBottom: 12 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(23,33,27,0.12)",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.greenSoft, borderColor: colors.green, borderWidth: 1.5 },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink2 },
  chipTextOn: { fontFamily: fonts.bold, color: colors.green },
  dateRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  label: { ...ui.label },
  rangeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  rangeText: { ...text.small, fontSize: 12.5 },
  note: { flexDirection: "row", gap: 8, alignItems: "center", padding: 12, borderRadius: radius.md, marginBottom: 12 },
  noteText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13 },
  groupTitle: { ...text.label, marginTop: 8, marginBottom: 8, marginLeft: 4 },
  group: { ...ui.card, overflow: "hidden", marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.ink },
  rowNote: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 1, lineHeight: 16 },
  dlBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.chip,
    alignItems: "center",
    justifyContent: "center",
  },
  privacy: { flexDirection: "row", gap: 8, paddingHorizontal: 4, marginBottom: 12 },
  privacyText: { ...text.small, fontSize: 12, flex: 1, lineHeight: 17 },
  smallDownload: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: colors.greenSoft,
  },
  smallDownloadText: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.green },
  errorSmall: { fontFamily: fonts.semibold, fontSize: 12, color: colors.danger, marginTop: 4 },
});
