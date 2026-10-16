// Admin -> Money -> Marketer pay, and Admin -> Settings -> Marketer pay rules.
//
// Pay is weekly (Monday to Sunday). The app works out what every marketer (and
// the manager) earned from the shops and riders they signed up. From Monday,
// close last week, pay everyone by Friday, then tap "Mark paid". Loads only
// when opened (no automatic refresh), to keep database reads low.

import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  marketerPayAction,
  type MarketerPayLine,
  type MarketerPaySettings,
  type MarketerPayStatement,
} from "../lib/adminApi";
import { colors, fonts, radius, text, ui } from "../theme";
import { DownloadButton } from "./AdminDownloads";
import { BrandLoader } from "./Brand";
import { Icon } from "./Icon";

const LAGOS_OFFSET_MS = 60 * 60 * 1000;

function money(n: number) {
  return `₦${Math.round(n || 0).toLocaleString()}`;
}

// The Monday ("YYYY-MM-DD", Nigeria time) of the week `back` weeks ago. This is
// the key the server uses for a pay week.
function monthKeyAgo(back: number) {
  const d = new Date(Date.now() + LAGOS_OFFSET_MS);
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysSinceMonday - 7 * back));
  return monday.toISOString().slice(0, 10);
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// "Week of 12 Oct"
function shortMonth(key: string) {
  return `Week of ${Number(key.slice(8, 10))} ${MONTH_SHORT[Number(key.slice(5, 7)) - 1]}`;
}

function dueText(ms: number | null | undefined) {
  if (!ms) return "";
  const d = new Date(ms + LAGOS_OFFSET_MS);
  return `${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]}`;
}

export function AdminMarketerPay() {
  const months = [0, 1, 2, 3].map(monthKeyAgo);
  const [month, setMonth] = useState(months[1]);
  const [st, setSt] = useState<MarketerPayStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (m: string) => {
    setLoading(true);
    setError("");
    try {
      const r = await marketerPayAction("marketerPay", { month: m });
      setSt(r.statement);
    } catch (e: any) {
      setError(e?.message || "Could not load marketer pay.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setArmed(false);
    setMessage("");
    void load(month);
  }, [month, load]);

  async function act(label: string, action: "closeMarketerMonth" | "markMarketerPaid", extra: Record<string, unknown>) {
    setBusy(label);
    setError("");
    setMessage("");
    try {
      const r = await marketerPayAction(action, { month, ...extra });
      setSt(r.statement);
      if (r.message) setMessage(r.message);
      setArmed(false);
      return true;
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  const t = st?.totals;
  const isCurrent = month === months[0];

  return (
    <View>
      <View style={styles.headRow}>
        <Text style={styles.sectionTitle}>Marketer pay</Text>
        <DownloadButton report="marketer_pay" label="Statements" days={365} />
      </View>

      <View style={styles.chips}>
        {months.map((m, i) => (
          <Pressable
            key={m}
            style={[styles.chip, month === m && styles.chipOn]}
            onPress={() => setMonth(m)}
            accessibilityRole="radio"
            accessibilityState={{ selected: month === m }}
          >
            <Text style={[styles.chipText, month === m && styles.chipTextOn]}>{i === 0 ? "This week" : i === 1 ? "Last week" : shortMonth(m)}</Text>
          </Pressable>
        ))}
      </View>

      {message ? (
        <Pressable style={[styles.note, { backgroundColor: colors.greenSoft }]} onPress={() => setMessage("")}>
          <Icon name="check" size={16} color={colors.green} />
          <Text style={[styles.noteText, { color: colors.green }]}>{message}</Text>
        </Pressable>
      ) : null}
      {error ? (
        <View style={[styles.note, { backgroundColor: colors.dangerSoft }]}>
          <Icon name="alert" size={16} color={colors.danger} />
          <Text style={[styles.noteText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}

      {loading && !st ? (
        <BrandLoader style={{ marginVertical: 24 }} />
      ) : st && t ? (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>
              {st.closed ? `${st.monthName} · closed` : isCurrent ? `This week so far · ${st.monthName}` : `${st.monthName} · not closed yet`}
            </Text>
            <Text style={styles.heroAmount}>{money(t.pay)}</Text>
            <Text style={styles.heroSub}>
              {t.people} person(s) · {t.payPct}% of {money(t.base)} their sign-ups earned us (limit {t.capPct}%)
            </Text>
            {t.reduced ? <Text style={styles.heroWarn}>Pay was reduced to stay inside the {t.capPct}% limit.</Text> : null}
            {st.closed ? (
              <View style={styles.heroRow}>
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillText}>Paid {money(t.paid)}</Text>
                </View>
                <View style={[styles.heroPill, t.unpaid > 0 && { backgroundColor: colors.gold }]}>
                  <Text style={[styles.heroPillText, t.unpaid > 0 && { color: colors.ink }]}>
                    To send {money(t.unpaid)}
                    {t.unpaid > 0 && st.payByMs ? ` by Fri ${dueText(st.payByMs)}` : ""}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          {!st.closed && st.canClose ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Close {st.monthName}</Text>
              <Text style={styles.muted}>
                Fixes these amounts so you can pay them on Friday. Shops still waiting to become active carry over to
                the week they count. You can't change a closed week.
              </Text>
              <Pressable
                style={[armed ? styles.dangerButton : styles.darkButton, busy === "close" && { opacity: 0.5 }]}
                disabled={busy !== null}
                onPress={() => (armed ? void act("close", "closeMarketerMonth", {}) : setArmed(true))}
              >
                <Text style={styles.whiteText}>
                  {busy === "close" ? "Closing..." : armed ? `Tap again to close ${shortMonth(month)}` : `Close ${shortMonth(month)}`}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {isCurrent ? (
            <Text style={styles.hint}>This week is still running. Close it from Monday, and pay everyone on Friday.</Text>
          ) : null}

          {st.lines.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.muted}>Nothing earned in this week yet.</Text>
            </View>
          ) : (
            st.lines.map((l) => (
              <PayLine
                key={l.code}
                line={l}
                closed={st.closed}
                busy={busy === `pay-${l.code}`}
                disabled={busy !== null}
                onPaid={(reference) => act(`pay-${l.code}`, "markMarketerPaid", { code: l.code, reference })}
              />
            ))
          )}

          {st.selfReferrals.length > 0 ? (
            <View style={[styles.card, { backgroundColor: colors.goldSoft }]}>
              <Text style={styles.cardTitle}>Not paid: own shops</Text>
              <Text style={styles.muted}>
                These have the marketer's own phone, login or bank account, so they earn nothing.
              </Text>
              {[...new Set(st.selfReferrals.map((x) => `${x.partyName} (${x.code})`))].map((x) => (
                <Text key={x} style={styles.item}>
                  {"•"} {x}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.rulesRow}>
            <Icon name="info" size={14} color={colors.muted} />
            <Text style={styles.rulesText}>
              Rules: {st.settings.marketerPct}% of commission (shops) and delivery profit (riders) for {st.settings.months} months,
              after {st.settings.shopActiveOrders} orders / {st.settings.riderActiveTrips} trips. Manager also gets{" "}
              {st.settings.managerTeamPct}% of what his team earns. Change them in Settings.
            </Text>
          </View>
          <View style={{ alignItems: "flex-start", marginBottom: 12 }}>
            <DownloadButton report="marketer_earnings" label="Every order (last 30 days)" />
          </View>
        </>
      ) : null}
    </View>
  );
}

function PayLine({
  line,
  closed,
  busy,
  disabled,
  onPaid,
}: {
  line: MarketerPayLine;
  closed: boolean;
  busy: boolean;
  disabled: boolean;
  onPaid: (reference: string) => Promise<boolean>;
}) {
  const [paying, setPaying] = useState(false);
  const [reference, setReference] = useState("");
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{line.name}</Text>
          <Text style={styles.small}>
            {line.code} · {line.kind === "manager" ? "Manager" : line.managerCode ? `Team of ${line.managerCode}` : "Marketer"}
          </Text>
        </View>
        <Text style={styles.amount}>{money(line.amount)}</Text>
      </View>

      <View style={styles.divider} />
      <Row label="Their sign-ups earned us" value={money(line.base)} />
      <Row label="Own share" value={money(line.direct)} />
      {line.team > 0 ? <Row label="Team share" value={money(line.team)} /> : null}
      {line.carried < 0 ? <Row label="Refunds still to take back" value={money(line.carried)} /> : null}

      {line.waiting.length > 0 ? (
        <View style={styles.waitBox}>
          <Text style={styles.waitTitle}>Waiting to become active ({money(line.waitingBase)} so far)</Text>
          {line.waiting.map((w) => (
            <Text key={`${w.partyType}-${w.partyName}`} style={styles.waitText}>
              {w.partyName}: {w.done}/{w.need} {w.partyType === "rider" ? "trips" : "orders"}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.bankRow}>
        <Icon name="card" size={15} color={line.bank ? colors.green : colors.goldText} />
        <Text style={[styles.small, { flex: 1 }]}>
          {line.bank
            ? `${line.bank.accountName} · ${line.bank.bankName} ${line.bank.accountNumberMasked}${line.bank.verified ? "" : " (not checked)"}`
            : line.bankWaiting
              ? "Bank name did not match: check with them before paying"
              : line.linked
                ? "No bank account yet: ask them to add it in the app"
                : "Not linked in the app yet (no bank account)"}
        </Text>
      </View>

      {closed && line.amount > 0 ? (
        line.paid ? (
          <View style={styles.paidRow}>
            <Icon name="check" size={16} color={colors.green} />
            <Text style={styles.paidText}>
              Paid{line.reference ? ` · ref ${line.reference}` : ""}
            </Text>
          </View>
        ) : paying ? (
          <>
            <Text style={styles.label}>Transfer reference (optional)</Text>
            <TextInput
              style={ui.input}
              value={reference}
              onChangeText={setReference}
              placeholder="e.g. the bank's transaction ID"
              placeholderTextColor={colors.faint}
              maxLength={80}
            />
            <View style={styles.buttonRow}>
              <Pressable style={[styles.ghostButton, { flex: 1 }]} onPress={() => setPaying(false)} disabled={busy}>
                <Text style={styles.ghostText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.darkButton, { flex: 1, marginTop: 0 }, busy && { opacity: 0.5 }]}
                disabled={disabled}
                onPress={async () => {
                  if (await onPaid(reference.trim())) setPaying(false);
                }}
              >
                <Text style={styles.whiteText}>{busy ? "Saving..." : `I sent ${money(line.amount)}`}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable style={styles.darkButton} disabled={disabled} onPress={() => setPaying(true)}>
            <Text style={styles.whiteText}>Mark paid</Text>
          </Pressable>
        )
      ) : null}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.rowBetween, { marginTop: 4 }]}>
      <Text style={styles.item}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

// ---------- Settings -> Marketer pay rules ----------

const FIELDS: { key: keyof MarketerPaySettings; label: string; unit: string; decimals?: boolean }[] = [
  { key: "marketerPct", label: "Marketer's share of what their sign-ups earn us", unit: "%", decimals: true },
  { key: "managerTeamPct", label: "Manager's share of what each marketer earns", unit: "%", decimals: true },
  { key: "months", label: "Paid for", unit: "months" },
  { key: "shopActiveOrders", label: "A shop counts after", unit: "orders" },
  { key: "riderActiveTrips", label: "A rider counts after", unit: "trips" },
  { key: "capPct", label: "All marketing pay never above", unit: "%", decimals: true },
];

export function MarketerPaySettingsCard({
  settings,
  saving,
  onSave,
}: {
  settings: MarketerPaySettings;
  saving: boolean;
  onSave: (s: MarketerPaySettings) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, String(settings[f.key])])),
  );
  const [error, setError] = useState("");
  const num = (k: keyof MarketerPaySettings) => Number(values[k]);
  const worst = Math.round(num("marketerPct") * (1 + num("managerTeamPct") / 100) * 100) / 100;
  const over = Number.isFinite(worst) && worst > num("capPct");

  function save() {
    const out = {} as MarketerPaySettings;
    for (const f of FIELDS) {
      const n = Number(values[f.key]);
      if (!Number.isFinite(n) || n < 0 || values[f.key].trim() === "") return setError(`${f.label}: enter a number.`);
      out[f.key] = n;
    }
    setError("");
    onSave(out);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Marketer pay</Text>
      <Text style={styles.muted}>
        What the marketing team earns from the shops and riders they sign up. Shops: from our commission. Riders: from
        our delivery profit (fee minus rider pay).
      </Text>
      <View style={styles.divider} />
      {FIELDS.map((f) => (
        <View key={f.key} style={[styles.rowBetween, { marginTop: 6 }]}>
          <Text style={[styles.item, { flex: 1, paddingRight: 8 }]}>{f.label}</Text>
          <View style={styles.rateBox}>
            <TextInput
              style={styles.rateInput}
              value={values[f.key]}
              onChangeText={(t) =>
                setValues({ ...values, [f.key]: t.replace(f.decimals ? /[^0-9.]/g : /[^0-9]/g, "").slice(0, 5) })
              }
              keyboardType={f.decimals ? "decimal-pad" : "number-pad"}
              accessibilityLabel={f.label}
            />
            <Text style={styles.value}>{f.unit}</Text>
          </View>
        </View>
      ))}
      <View style={[styles.note, { backgroundColor: over ? colors.dangerSoft : colors.greenSoft, marginTop: 12, marginBottom: 0 }]}>
        <Icon name={over ? "alert" : "check"} size={16} color={over ? colors.danger : colors.green} />
        <Text style={[styles.noteText, { color: over ? colors.danger : colors.green }]}>
          At most {Number.isFinite(worst) ? worst : "?"}% goes to marketing, limit {values.capPct || "?"}%.
        </Text>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Pressable style={[styles.darkButton, (saving || over) && { opacity: 0.5 }]} disabled={saving || over} onPress={save}>
        <Text style={styles.whiteText}>{saving ? "Saving..." : "Save marketer pay"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 8 },
  sectionTitle: { ...text.label, marginLeft: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(23,33,27,0.12)",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.greenSoft, borderColor: colors.green, borderWidth: 1.5 },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink2 },
  chipTextOn: { fontFamily: fonts.bold, color: colors.green },
  hero: { backgroundColor: colors.green, borderRadius: radius.lg, padding: 18, marginBottom: 12 },
  heroLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.onGreenMuted },
  heroAmount: { fontFamily: fonts.display, fontSize: 34, color: "#fff", marginTop: 4 },
  heroSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.onGreenMuted, marginTop: 4, lineHeight: 18 },
  heroWarn: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.gold, marginTop: 6 },
  heroRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  heroPill: { backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  heroPillText: { fontFamily: fonts.bold, fontSize: 12.5, color: "#fff" },
  card: { ...ui.card, padding: 16, marginBottom: 12 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.ink },
  muted: { ...text.small, fontSize: 13, lineHeight: 19, marginTop: 4 },
  hint: { ...text.small, fontSize: 12.5, marginBottom: 12, marginLeft: 2 },
  small: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  item: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.ink2, lineHeight: 19 },
  value: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.ink },
  amount: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.green },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  divider: { height: 1, backgroundColor: colors.hairline, marginVertical: 10 },
  waitBox: { backgroundColor: colors.chip, borderRadius: radius.md, padding: 10, marginTop: 10 },
  waitTitle: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.ink2, marginBottom: 2 },
  waitText: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  bankRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  paidRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  paidText: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.green },
  label: { ...ui.label },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  darkButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingHorizontal: 16,
  },
  dangerButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingHorizontal: 16,
  },
  whiteText: { fontFamily: fonts.bold, fontSize: 14.5, color: "#fff" },
  ghostButton: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostText: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.green },
  note: { flexDirection: "row", gap: 8, alignItems: "center", padding: 12, borderRadius: radius.md, marginBottom: 12 },
  noteText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13 },
  rulesRow: { flexDirection: "row", gap: 8, paddingHorizontal: 4, marginBottom: 10 },
  rulesText: { ...text.small, fontSize: 12, flex: 1, lineHeight: 17 },
  rateBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(23,33,27,0.10)",
    borderRadius: 12,
    paddingHorizontal: 10,
    backgroundColor: "#fbfaf6",
  },
  rateInput: { minWidth: 44, height: 40, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, textAlign: "right" },
  errorText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.danger, marginTop: 8 },
});
