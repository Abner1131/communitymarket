import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { AdminPayoutSettings, AdminState, AdminWithdrawalRequest } from "../lib/adminApi";

// Admin "Money" tab: withdrawal requests to pay, money held in wallets,
// payment history and commission rates.

const NAIRA = "₦";
const money = (n: number) => `${NAIRA}${Math.round(n).toLocaleString()}`;
const METHODS = ["bank transfer", "cash"] as const;

function ago(msValue: number | null) {
  if (!msValue) return "";
  const minutes = Math.max(0, Math.round((Date.now() - msValue) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
}

function RequestCard({
  req,
  busy,
  onPay,
  onReject,
}: {
  req: AdminWithdrawalRequest;
  busy: boolean;
  onPay: (method: string, reference: string) => void;
  onReject: (reason: string) => void;
}) {
  const [method, setMethod] = useState<(typeof METHODS)[number]>("bank transfer");
  const [reference, setReference] = useState("");
  const [armed, setArmed] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function pressPay() {
    if (!armed) {
      setArmed(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setArmed(false), 5000);
      return;
    }
    setArmed(false);
    onPay(method, reference.trim());
  }

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.cardTitle}>{req.name}</Text>
          <Text style={styles.muted}>
            {req.partyId} {"·"} asked {ago(req.requestedAtMs)}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: req.partyType === "rider" ? "#1565c0" : "#6a1b9a" }]}>
          <Text style={styles.badgeText}>{req.partyType.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.label}>Send</Text>
      <Text style={styles.amount}>{money(req.netAmount)}</Text>
      <Text style={styles.hint}>
        Withdrawal {money(req.amount)} − fee {money(req.fee)} (your income) {"·"} left in their wallet{" "}
        {money(req.balanceLeft)}
      </Text>

      {req.bank ? (
        <View style={styles.bankBox}>
          <Text style={styles.bankLine} selectable>
            {req.bank.accountNumber}
          </Text>
          <Text style={styles.muted} selectable>
            {req.bank.bankName} {"·"} {req.bank.accountName}
          </Text>
        </View>
      ) : (
        <Text style={styles.warnText}>No bank details on this request.</Text>
      )}

      {rejecting ? (
        <>
          <TextInput
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder="Reason (they will see it)"
            maxLength={200}
          />
          <View style={styles.twoCol}>
            <Pressable style={[styles.outlineButton, { flex: 1 }]} onPress={() => setRejecting(false)} disabled={busy}>
              <Text style={styles.outlineText}>Back</Text>
            </Pressable>
            <Pressable
              style={[styles.redButton, { flex: 1 }, busy && { opacity: 0.5 }]}
              disabled={busy}
              onPress={() => onReject(reason.trim())}
            >
              <Text style={styles.whiteText}>{busy ? "Saving..." : "Reject"}</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>The full amount (fee included) goes back into their wallet.</Text>
        </>
      ) : (
        <>
          <View style={[styles.chips, { marginTop: 12 }]}>
            {METHODS.map((m) => (
              <Pressable key={m} style={[styles.chip, method === m && styles.chipActive]} onPress={() => setMethod(m)}>
                <Text style={[styles.chipText, method === m && styles.chipTextActive]}>{m}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={reference}
            onChangeText={setReference}
            placeholder="Transfer reference (optional)"
            maxLength={60}
          />
          <Pressable
            style={[styles.payButton, armed && { backgroundColor: "#0d5a1f" }, busy && { opacity: 0.5 }]}
            disabled={busy}
            onPress={pressPay}
          >
            <Text style={styles.whiteText}>
              {busy ? "Saving..." : armed ? "Tap again: I have sent the money" : `Mark ${money(req.netAmount)} sent`}
            </Text>
          </Pressable>
          <Pressable style={styles.textButton} onPress={() => setRejecting(true)} disabled={busy}>
            <Text style={styles.rejectText}>Reject this withdrawal</Text>
          </Pressable>
          <Text style={styles.hint}>Send the money first (bank app or Opay), then record it here.</Text>
        </>
      )}
    </View>
  );
}

function CommissionEditor({
  commission,
  saving,
  onSave,
}: {
  commission: AdminState["commission"];
  saving: boolean;
  onSave: (rates: Record<string, number>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(commission.categories.map((c) => [c, String(commission.rates[c] ?? 0)])),
  );
  const [error, setError] = useState("");

  function save() {
    const rates: Record<string, number> = {};
    for (const c of commission.categories) {
      const n = Number(values[c]);
      if (values[c] === "" || !Number.isFinite(n) || n < 0 || n > commission.maxRate || Math.round(n * 10) !== n * 10) {
        setError(`${c}: enter 0 to ${commission.maxRate} (one decimal place at most).`);
        return;
      }
      rates[c] = n;
    }
    setError("");
    onSave(rates);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Commission by category</Text>
      <Text style={styles.muted}>
        Percent you keep from the seller's goods money. Customers pay the same price; new rates apply to new
        orders only.
      </Text>
      <View style={styles.divider} />
      {commission.categories.map((c) => (
        <View key={c} style={[styles.rowBetween, { marginTop: 6 }]}>
          <Text style={styles.item}>{c}</Text>
          <View style={styles.rateBox}>
            <TextInput
              style={styles.rateInput}
              value={values[c]}
              onChangeText={(t) => setValues({ ...values, [c]: t.replace(/[^0-9.]/g, "").slice(0, 4) })}
              keyboardType="decimal-pad"
            />
            <Text style={styles.value}>%</Text>
          </View>
        </View>
      ))}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Pressable style={[styles.darkButton, saving && { opacity: 0.5 }]} disabled={saving} onPress={save}>
        <Text style={styles.whiteText}>{saving ? "Saving..." : "Save rates"}</Text>
      </Pressable>
    </View>
  );
}

const SETTING_FIELDS: { key: keyof AdminPayoutSettings; label: string; unit: string }[] = [
  { key: "clearanceWorkingDays", label: "Clearing time (working days after payment)", unit: "days" },
  { key: "clearanceHour", label: "Clears from (hour of day, 0–23)", unit: ":00" },
  { key: "feeUpTo5k", label: "Fee: withdrawals up to ₦5,000", unit: "₦" },
  { key: "feeUpTo50k", label: "Fee: up to ₦50,000", unit: "₦" },
  { key: "feeAbove50k", label: "Fee: above ₦50,000", unit: "₦" },
];

function PayoutSettingsEditor({
  settings,
  saving,
  onSave,
}: {
  settings: AdminPayoutSettings;
  saving: boolean;
  onSave: (s: AdminPayoutSettings) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(SETTING_FIELDS.map((f) => [f.key, String(settings[f.key])])),
  );
  const [error, setError] = useState("");

  function save() {
    const out = {} as AdminPayoutSettings;
    for (const f of SETTING_FIELDS) {
      const n = parseInt(values[f.key], 10);
      if (!Number.isInteger(n) || n < 0) return setError(`${f.label}: enter a whole number.`);
      out[f.key] = n;
    }
    setError("");
    onSave(out);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Withdrawals</Text>
      <Text style={styles.muted}>
        Money becomes withdrawable after Paystack settles it to you. Paystack usually pays the next working day;
        use 2 days if it is often later. Weekends are skipped, public holidays are not.
      </Text>
      <View style={styles.divider} />
      {SETTING_FIELDS.map((f) => (
        <View key={f.key} style={[styles.rowBetween, { marginTop: 6 }]}>
          <Text style={[styles.item, { flex: 1, paddingRight: 8, fontSize: 14 }]}>{f.label}</Text>
          <View style={styles.rateBox}>
            {f.unit === "₦" ? <Text style={styles.value}>₦</Text> : null}
            <TextInput
              style={styles.rateInput}
              value={values[f.key]}
              onChangeText={(t) => setValues({ ...values, [f.key]: t.replace(/[^0-9]/g, "").slice(0, 4) })}
              keyboardType="number-pad"
            />
            {f.unit !== "₦" ? <Text style={styles.value}>{f.unit}</Text> : null}
          </View>
        </View>
      ))}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Pressable style={[styles.darkButton, saving && { opacity: 0.5 }]} disabled={saving} onPress={save}>
        <Text style={styles.whiteText}>{saving ? "Saving..." : "Save withdrawal settings"}</Text>
      </Pressable>
    </View>
  );
}

export function AdminMoney({
  state,
  working,
  onPay,
  onReject,
  onSaveRates,
  onSaveSettings,
}: {
  state: AdminState;
  working: string | null;
  onPay: (req: AdminWithdrawalRequest, method: string, reference: string) => void;
  onReject: (req: AdminWithdrawalRequest, reason: string) => void;
  onSaveRates: (rates: Record<string, number>) => void;
  onSaveSettings: (settings: AdminPayoutSettings) => void;
}) {
  const { wallets, commission } = state;
  const [showWallets, setShowWallets] = useState(false);

  return (
    <>
      <View style={styles.statsRow}>
        <View style={[styles.stat, wallets.totalRequested > 0 && { backgroundColor: "#fff4e5" }]}>
          <Text style={styles.statNumber}>{money(wallets.totalRequested)}</Text>
          <Text style={styles.statLabel}>To send now</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{money(wallets.totalBalance)}</Text>
          <Text style={styles.statLabel}>In wallets (you owe)</Text>
        </View>
      </View>
      <Text style={styles.hint}>
        {money(wallets.totalClearing)} of the wallet money is still clearing from Paystack. Keep the rest available:
        sellers and riders can withdraw it at any time.
      </Text>

      <Text style={styles.sectionTitle}>Withdrawal requests ({wallets.requests.length})</Text>
      {wallets.requests.length === 0 ? (
        <Text style={[styles.muted, { marginBottom: 12 }]}>No one is waiting for money.</Text>
      ) : (
        wallets.requests.map((r) => (
          <RequestCard
            key={r.id}
            req={r}
            busy={working === `wd-${r.id}`}
            onPay={(method, reference) => onPay(r, method, reference)}
            onReject={(reason) => onReject(r, reason)}
          />
        ))
      )}

      <Pressable style={styles.rowBetween} onPress={() => setShowWallets(!showWallets)}>
        <Text style={styles.sectionTitle}>Wallet balances ({wallets.list.length})</Text>
        <Text style={styles.link}>{showWallets ? "Hide" : "Show"}</Text>
      </Pressable>
      {showWallets ? (
        <View style={styles.card}>
          {wallets.list.length === 0 ? (
            <Text style={styles.muted}>All wallets are empty.</Text>
          ) : (
            wallets.list.map((w) => (
              <View key={`${w.partyType}:${w.partyId}`} style={[styles.rowBetween, { marginBottom: 8 }]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.value}>{w.name}</Text>
                  <Text style={styles.muted}>
                    {w.partyType} {"·"} {money(w.available)} ready {"·"} {money(w.clearing)} clearing
                  </Text>
                </View>
                <Text style={styles.value}>{money(w.balance)}</Text>
              </View>
            ))
          )}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Sent in the last 30 days</Text>
      {wallets.recentPaid.length === 0 ? (
        <Text style={[styles.muted, { marginBottom: 12 }]}>Nothing sent yet.</Text>
      ) : (
        <View style={styles.card}>
          {wallets.recentPaid.map((p) => (
            <View key={p.id} style={[styles.rowBetween, { marginBottom: 8 }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.value}>{p.name}</Text>
                <Text style={styles.muted}>
                  {new Date(p.paidAtMs).toLocaleDateString()} {"·"} {p.method} {"·"} fee {money(p.fee)}
                  {p.reference ? ` · ref ${p.reference}` : ""}
                </Text>
              </View>
              <Text style={styles.value}>{money(p.netAmount)}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Settings</Text>
      <PayoutSettingsEditor
        key={JSON.stringify(wallets.settings)}
        settings={wallets.settings}
        saving={working === "payoutSettings"}
        onSave={onSaveSettings}
      />

      <CommissionEditor
        key={JSON.stringify(commission.rates)}
        commission={commission}
        saving={working === "rates"}
        onSave={onSaveRates}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#555", marginTop: 10, marginBottom: 8 },
  muted: { color: "#666", marginTop: 3, fontSize: 13 },
  hint: { color: "#888", fontSize: 12, marginTop: 6 },
  value: { fontWeight: "700" },
  item: { color: "#333", fontSize: 15 },
  link: { color: "#1565c0", fontWeight: "700", marginTop: 2 },
  amount: { fontSize: 28, fontWeight: "900" },
  label: { fontSize: 12, fontWeight: "700", color: "#666", marginTop: 12 },
  warnText: { color: "#b26a00", fontWeight: "700", marginTop: 10 },
  errorText: { color: "#b00020", marginTop: 10 },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  twoCol: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  badge: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  statsRow: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 8, alignItems: "center" },
  statNumber: { fontSize: 17, fontWeight: "900" },
  statLabel: { color: "#666", fontSize: 12, marginTop: 2, textAlign: "center" },
  bankBox: { backgroundColor: "#f5f6f8", borderRadius: 10, padding: 12, marginTop: 12 },
  bankLine: { fontSize: 20, fontWeight: "900", letterSpacing: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderColor: "#ccc", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: "#222", borderColor: "#222" },
  chipText: { fontSize: 13, color: "#444", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  input: { borderWidth: 1, borderColor: "#d0d4db", borderRadius: 10, padding: 12, backgroundColor: "#fff", marginTop: 10 },
  payButton: { marginTop: 12, backgroundColor: "#1e7d32", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  redButton: { marginTop: 12, backgroundColor: "#b00020", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  darkButton: { marginTop: 14, backgroundColor: "#222", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  outlineButton: { marginTop: 12, borderWidth: 1, borderColor: "#222", paddingVertical: 13, borderRadius: 10, alignItems: "center" },
  outlineText: { fontWeight: "700" },
  whiteText: { color: "#fff", fontWeight: "800" },
  textButton: { alignItems: "center", paddingVertical: 10 },
  rejectText: { color: "#b00020", fontWeight: "700" },
  rateBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  rateInput: {
    borderWidth: 1,
    borderColor: "#d0d4db",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    width: 64,
    textAlign: "right",
    backgroundColor: "#fff",
  },
});
