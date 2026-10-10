import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { getAdminLogs, type AdminLogLine, type AdminLogs as Logs, type AdminLogType } from "../lib/adminApi";

// Admin -> Logs: who opened Admin, from which device, what they changed,
// who had admin rights. The server writes these lines; nobody can edit them.

const LAGOS_OFFSET_MS = 60 * 60 * 1000; // Nigeria is UTC+1 all year
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function lagos(ms: number) {
  return new Date(ms + LAGOS_OFFSET_MS);
}
function two(n: number) {
  return String(n).padStart(2, "0");
}
function timeText(ms: number) {
  const d = lagos(ms);
  return `${two(d.getUTCHours())}:${two(d.getUTCMinutes())}:${two(d.getUTCSeconds())}`;
}
function dayText(ms: number) {
  const d = lagos(ms);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
function shortDay(ms: number) {
  const d = lagos(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
function dateTimeText(ms: number | null) {
  return ms ? `${shortDay(ms)}, ${timeText(ms).slice(0, 5)}` : "—";
}
function valueText(v: unknown) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "ON" : "OFF";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const PERIODS: { label: string; daysAgo: number; days: number }[] = [
  { label: "Today", daysAgo: 0, days: 1 },
  { label: "Yesterday", daysAgo: 1, days: 1 },
  { label: "7 days", daysAgo: 0, days: 7 },
  { label: "30 days", daysAgo: 0, days: 30 },
];

const TYPES: { code: AdminLogType | null; label: string }[] = [
  { code: null, label: "All" },
  { code: "access", label: "Visits" },
  { code: "action", label: "Changes" },
  { code: "rights", label: "Admin rights" },
  { code: "denied", label: "Blocked" },
];

const ICONS: Record<AdminLogType, string> = { access: "🔑", action: "✏️", rights: "🛡️", denied: "⛔" };

function LogRow({ line, showDay }: { line: AdminLogLine; showDay: boolean }) {
  const [open, setOpen] = useState(false);
  const failed = line.type === "action" && !line.ok;
  const where = [line.device, line.place, line.ip].filter(Boolean).join(" · ");
  const hasMore = Boolean((line.changes && line.changes.length) || (line.details && Object.keys(line.details).length));
  return (
    <Pressable
      style={[styles.row, failed && styles.rowFailed, line.type === "denied" && styles.rowDenied]}
      onPress={() => hasMore && setOpen(!open)}
    >
      <View style={styles.rowTop}>
        <Text style={styles.time}>
          {showDay ? `${shortDay(line.atMs)} ` : ""}
          {timeText(line.atMs)}
        </Text>
        {line.newDevice ? (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW DEVICE</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.summary, failed && styles.failedText]}>
        {ICONS[line.type]} {line.summary}
        {line.count && line.count > 1 ? ` (${line.count} tries, last ${timeText(line.lastAtMs || line.atMs).slice(0, 5)})` : ""}
      </Text>
      <Text style={styles.who}>
        {line.whoName ? `${line.whoName} · ` : ""}
        {line.who || "—"}
      </Text>
      {where ? <Text style={styles.where}>{where}</Text> : null}
      {open && line.changes && line.changes.length ? (
        <View style={styles.more}>
          {line.changes.map((c) => (
            <Text key={c.field} style={styles.change}>
              {c.field}: {valueText(c.from)} → {valueText(c.to)}
            </Text>
          ))}
        </View>
      ) : null}
      {open && line.details && Object.keys(line.details).length ? (
        <View style={styles.more}>
          {Object.entries(line.details).map(([k, v]) => (
            <Text key={k} style={styles.detail}>
              {k}: {valueText(v)}
            </Text>
          ))}
        </View>
      ) : null}
      {hasMore && !open ? <Text style={styles.tapHint}>Tap for details</Text> : null}
    </Pressable>
  );
}

export function AdminLogs() {
  const [period, setPeriod] = useState({ daysAgo: 0, days: 1 });
  const [type, setType] = useState<AdminLogType | null>(null);
  const [person, setPerson] = useState<string | null>(null);
  const [logs, setLogs] = useState<Logs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    getAdminLogs({ ...period, type, person })
      .then((l) => {
        if (alive) setLogs(l);
      })
      .catch((e) => {
        if (alive) setError(e?.message || "Could not load the log.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [period, type, person, reload]);

  const multiDay = period.days > 1;
  const rangeText = logs
    ? multiDay
      ? `${shortDay(logs.fromMs)} – ${shortDay(logs.toMs - 1)}`
      : dayText(logs.fromMs)
    : "";

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Admin log</Text>
        <Text style={styles.muted}>
          Every visit to Admin, every change, and every blocked attempt. Written by the server — nobody can edit or
          delete it. Kept for {logs ? logs.keepMonths : 12} months.
        </Text>

        <Text style={styles.label}>Period</Text>
        <View style={styles.chips}>
          {PERIODS.map((p) => {
            const active = p.daysAgo === period.daysAgo && p.days === period.days;
            return (
              <Pressable
                key={p.label}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setPeriod({ daysAgo: p.daysAgo, days: p.days })}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.stepper}>
          <Pressable
            style={styles.stepButton}
            onPress={() => setPeriod({ daysAgo: Math.min(366, period.daysAgo + period.days), days: period.days })}
          >
            <Text style={styles.stepText}>‹ Earlier</Text>
          </Pressable>
          <Text style={styles.rangeText}>{rangeText}</Text>
          <Pressable
            style={[styles.stepButton, period.daysAgo === 0 && styles.stepDisabled]}
            disabled={period.daysAgo === 0}
            onPress={() => setPeriod({ daysAgo: Math.max(0, period.daysAgo - period.days), days: period.days })}
          >
            <Text style={styles.stepText}>Later ›</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Show</Text>
        <View style={styles.chips}>
          {TYPES.map((t) => {
            const active = t.code === type;
            return (
              <Pressable key={t.label} style={[styles.chip, active && styles.chipActive]} onPress={() => setType(t.code)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {logs && (logs.people.length > 1 || person) ? (
          <>
            <Text style={styles.label}>Person</Text>
            <View style={styles.chips}>
              {[null, ...(person && !logs.people.includes(person) ? [person, ...logs.people] : logs.people)].map((p) => {
                const active = p === person;
                return (
                  <Pressable key={p || "all"} style={[styles.chip, active && styles.chipActive]} onPress={() => setPerson(p)}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{p || "Everyone"}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <Pressable style={styles.refresh} onPress={() => setReload(reload + 1)}>
          <Text style={styles.refreshText}>{loading ? "Loading..." : "↻ Refresh"}</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {logs ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🛡️ Who had admin rights</Text>
          <Text style={styles.muted}>During {multiDay ? "this period" : "this day"}:</Text>
          {logs.adminsInRange.map((a) => (
            <Text key={a.uid} style={styles.item}>
              • {a.email || a.uid}
            </Text>
          ))}
          <Text style={[styles.muted, { marginTop: 10 }]}>Right now:</Text>
          {logs.adminsNow.map((a) => (
            <Text key={a.uid} style={styles.item}>
              • {a.name ? `${a.name} · ` : ""}
              {a.email || a.uid}
            </Text>
          ))}
          {logs.oldestMs && logs.oldestMs > logs.fromMs ? (
            <Text style={styles.hint}>The log starts on {dayText(logs.oldestMs)}. Nothing before that was recorded.</Text>
          ) : null}
        </View>
      ) : null}

      {loading && !logs ? <ActivityIndicator size="large" style={{ marginTop: 20 }} /> : null}

      {logs ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {logs.lines.length} line{logs.lines.length === 1 ? "" : "s"}
          </Text>
          {logs.full ? (
            <Text style={styles.warnText}>Showing the newest {logs.lines.length}. Pick a shorter period to see older lines.</Text>
          ) : null}
          {logs.lines.length === 0 ? <Text style={styles.muted}>Nothing recorded in this period.</Text> : null}
          {logs.lines.map((l) => (
            <LogRow key={l.id} line={l} showDay={multiDay} />
          ))}
        </View>
      ) : null}

      {logs && logs.devices.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📱 Devices that opened Admin</Text>
          {logs.devices.map((d, i) => (
            <View key={i} style={styles.device}>
              <Text style={styles.deviceName}>{d.deviceName}</Text>
              <Text style={styles.where}>{d.email}</Text>
              <Text style={styles.where}>
                First: {dateTimeText(d.firstSeenMs)} · Last: {dateTimeText(d.lastSeenMs)}
              </Text>
              {d.lastPlace || d.lastIp ? (
                <Text style={styles.where}>{[d.lastPlace, d.lastIp].filter(Boolean).join(" · ")}</Text>
              ) : null}
            </View>
          ))}
          <Text style={styles.hint}>Don't recognise a device? Change your password at once.</Text>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  muted: { color: "#666", marginTop: 3, fontSize: 13 },
  hint: { color: "#888", fontSize: 12, marginTop: 8 },
  item: { marginTop: 5, color: "#333" },
  label: { fontSize: 13, fontWeight: "700", color: "#444", marginTop: 12, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderColor: "#ccc", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: "#222", borderColor: "#222" },
  chipText: { fontSize: 12, color: "#444", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  stepButton: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#f1f2f5" },
  stepDisabled: { opacity: 0.4 },
  stepText: { fontWeight: "700", fontSize: 12 },
  rangeText: { fontWeight: "800", fontSize: 13, flex: 1, textAlign: "center" },
  refresh: { marginTop: 12, alignSelf: "flex-start" },
  refreshText: { fontWeight: "700", color: "#1565c0" },
  row: { borderTopWidth: 1, borderTopColor: "#eee", paddingVertical: 10 },
  rowFailed: { backgroundColor: "#fff5f5" },
  rowDenied: { backgroundColor: "#fff8ec" },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  time: { fontWeight: "800", fontSize: 12, color: "#444" },
  newBadge: { backgroundColor: "#b26a00", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  newBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  summary: { marginTop: 4, color: "#111", fontWeight: "600" },
  failedText: { color: "#b00020" },
  who: { marginTop: 3, color: "#333", fontSize: 12 },
  where: { marginTop: 2, color: "#777", fontSize: 11 },
  more: { marginTop: 6, backgroundColor: "#f6f7f9", borderRadius: 8, padding: 8 },
  change: { fontSize: 12, color: "#222", marginTop: 2 },
  detail: { fontSize: 11, color: "#555", marginTop: 2 },
  tapHint: { fontSize: 11, color: "#1565c0", marginTop: 4 },
  device: { borderTopWidth: 1, borderTopColor: "#eee", paddingVertical: 8, marginTop: 6 },
  deviceName: { fontWeight: "700" },
  warnText: { color: "#b26a00", fontWeight: "700", marginTop: 8 },
  errorBox: { backgroundColor: "#fdecea", borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { color: "#b00020" },
});
