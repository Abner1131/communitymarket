import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

// Wallet for sellers and riders: money lands here as soon as an order is
// delivered. It can be withdrawn once Paystack has settled the customer's
// payment ("clearing"), less a small withdrawal fee.

export type BankInput = { bankName: string; accountNumber: string; accountName: string };

export type WalletSummary = {
  balance: number;
  available: number; // can be withdrawn now
  clearing: number; // still being settled by Paystack
  nextClearAtMs: number | null;
  clearanceWorkingDays: number;
  fees: { upTo5k: number; upTo50k: number; above50k: number };
  pendingWithdrawal: number;
  totalEarned: number;
  totalWithdrawn: number;
  totalSpent: number; // paid for their own orders
  minWithdrawal: number;
  bank: { bankName: string; accountName: string; accountNumberMasked: string } | null;
  pendingRequest: { id: string; amount: number; fee: number; netAmount: number; requestedAtMs: number | null } | null;
  activity: {
    id: string;
    type: "credit" | "withdrawal" | "purchase";
    kind: string;
    label: string;
    amount: number;
    commission: number;
    atMs: number | null;
    clearsAtMs: number | null;
  }[];
};

const NAIRA = "₦";
const money = (n: number) => `${NAIRA}${Math.round(n).toLocaleString()}`;

function feeFor(amount: number, fees: WalletSummary["fees"]) {
  if (amount <= 5000) return fees.upTo5k;
  if (amount <= 50000) return fees.upTo50k;
  return fees.above50k;
}

function when(msValue: number) {
  return new Date(msValue).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

// onAction returns an error message, or null when it worked.
export function WalletCard({
  wallet,
  onSaveBank,
  onWithdraw,
}: {
  wallet: WalletSummary;
  onSaveBank: (bank: BankInput) => Promise<string | null>;
  onWithdraw: (amount: number) => Promise<string | null>;
}) {
  const [editingBank, setEditingBank] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  function startBank() {
    setBankName(wallet.bank?.bankName || "");
    setAccountName(wallet.bank?.accountName || "");
    setAccountNumber("");
    setError("");
    setEditingBank(true);
  }

  async function saveBank() {
    if (bankName.trim().length < 2) return setError("Enter your bank's name.");
    if (!/^\d{10}$/.test(accountNumber)) return setError("Account number must be exactly 10 digits.");
    if (accountName.trim().length < 3) return setError("Enter the name on the account.");
    setBusy(true);
    const err = await onSaveBank({ bankName: bankName.trim(), accountNumber, accountName: accountName.trim() });
    setBusy(false);
    if (err) setError(err);
    else {
      setEditingBank(false);
      setError("");
    }
  }

  function startWithdraw() {
    setAmount(String(Math.floor(wallet.available)));
    setError("");
    setDone("");
    setWithdrawing(true);
  }

  async function withdraw() {
    const n = parseInt(amount, 10);
    if (!Number.isInteger(n) || n < wallet.minWithdrawal) {
      return setError(`The smallest withdrawal is ${money(wallet.minWithdrawal)}.`);
    }
    if (n > wallet.available) return setError(`You can withdraw at most ${money(wallet.available)} now.`);
    setBusy(true);
    const err = await onWithdraw(n);
    setBusy(false);
    if (err) setError(err);
    else {
      setWithdrawing(false);
      setError("");
      setDone(`${money(n - feeFor(n, wallet.fees))} is on its way to your bank account.`);
    }
  }

  const canWithdraw = !wallet.pendingRequest && wallet.available >= wallet.minWithdrawal;
  const typed = parseInt(amount, 10);
  const typedFee = Number.isInteger(typed) && typed > 0 ? feeFor(typed, wallet.fees) : null;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Wallet balance</Text>
      <Text style={styles.balance}>{money(wallet.balance)}</Text>
      <View style={styles.splitRow}>
        <View style={[styles.split, { backgroundColor: "#e8f5e9" }]}>
          <Text style={styles.splitNumber}>{money(wallet.available)}</Text>
          <Text style={styles.splitLabel}>Can withdraw now</Text>
        </View>
        <View style={styles.split}>
          <Text style={styles.splitNumber}>{money(wallet.clearing)}</Text>
          <Text style={styles.splitLabel}>Clearing</Text>
        </View>
      </View>
      {wallet.clearing > 0 && wallet.nextClearAtMs ? (
        <Text style={styles.hint}>
          Clearing money is being settled by our payment provider. Next amount ready {when(wallet.nextClearAtMs)}.
        </Text>
      ) : null}
      <Text style={styles.muted}>
        Earned {money(wallet.totalEarned)} {"·"} Withdrawn {money(wallet.totalWithdrawn)}
        {wallet.totalSpent > 0 ? ` · Spent in app ${money(wallet.totalSpent)}` : ""}
      </Text>

      {wallet.pendingRequest ? (
        <View style={styles.pendingBox}>
          <Text style={styles.pendingText}>
            {money(wallet.pendingRequest.netAmount)} is being sent to your bank (withdrawal of{" "}
            {money(wallet.pendingRequest.amount)} less {money(wallet.pendingRequest.fee)} fee).
          </Text>
        </View>
      ) : null}
      {done && !wallet.pendingRequest ? <Text style={styles.okText}>{done}</Text> : null}

      {/* withdraw */}
      {withdrawing ? (
        <>
          <Text style={[styles.label, { marginTop: 14 }]}>Amount to withdraw ({NAIRA})</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
          />
          {typedFee !== null ? (
            <View style={styles.feeBox}>
              <View style={styles.rowBetween}>
                <Text style={styles.muted}>Withdrawal fee</Text>
                <Text style={styles.muted}>− {money(typedFee)}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.value}>You receive</Text>
                <Text style={styles.value}>{money(Math.max(0, typed - typedFee))}</Text>
              </View>
            </View>
          ) : null}
          {wallet.bank ? (
            <Text style={styles.hint}>
              To {wallet.bank.accountName} {"·"} {wallet.bank.bankName} {wallet.bank.accountNumberMasked}
            </Text>
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.twoCol}>
            <Pressable style={[styles.secondaryButton, { flex: 1 }]} onPress={() => setWithdrawing(false)} disabled={busy}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.greenButton, { flex: 1 }, busy && { opacity: 0.6 }]} onPress={withdraw} disabled={busy}>
              <Text style={styles.primaryButtonText}>{busy ? "Sending..." : "Withdraw"}</Text>
            </Pressable>
          </View>
        </>
      ) : !editingBank ? (
        wallet.bank ? (
          <Pressable
            style={[styles.greenButton, !canWithdraw && { opacity: 0.4 }]}
            disabled={!canWithdraw}
            onPress={startWithdraw}
          >
            <Text style={styles.primaryButtonText}>Withdraw to bank</Text>
          </Pressable>
        ) : null
      ) : null}
      {!withdrawing && !wallet.pendingRequest && wallet.bank && wallet.available < wallet.minWithdrawal ? (
        <Text style={styles.hint}>
          You can withdraw once at least {money(wallet.minWithdrawal)} has cleared.
        </Text>
      ) : null}
      {!withdrawing ? (
        <Text style={styles.hintSmall}>
          Fees: {money(wallet.fees.upTo5k)} up to {money(5000)} {"·"} {money(wallet.fees.upTo50k)} up to{" "}
          {money(50000)} {"·"} {money(wallet.fees.above50k)} above
        </Text>
      ) : null}

      {/* bank account */}
      <View style={styles.divider} />
      <Text style={styles.label}>Bank account</Text>
      {editingBank ? (
        <>
          <TextInput
            style={styles.input}
            value={bankName}
            onChangeText={setBankName}
            placeholder="Bank (e.g. Opay, GTBank, Moniepoint)"
          />
          <TextInput
            style={styles.input}
            value={accountNumber}
            onChangeText={(t) => setAccountNumber(t.replace(/[^0-9]/g, "").slice(0, 10))}
            placeholder="10-digit account number"
            keyboardType="number-pad"
          />
          <TextInput style={styles.input} value={accountName} onChangeText={setAccountName} placeholder="Name on the account" />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.twoCol}>
            <Pressable style={[styles.secondaryButton, { flex: 1 }]} onPress={() => setEditingBank(false)} disabled={busy}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.primaryButton, { flex: 1 }, busy && { opacity: 0.6 }]} onPress={saveBank} disabled={busy}>
              <Text style={styles.primaryButtonText}>{busy ? "Saving..." : "Save"}</Text>
            </Pressable>
          </View>
        </>
      ) : wallet.bank ? (
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.value}>{wallet.bank.accountName}</Text>
            <Text style={styles.muted}>
              {wallet.bank.bankName} {"·"} {wallet.bank.accountNumberMasked}
            </Text>
          </View>
          <Pressable style={styles.smallButton} onPress={startBank}>
            <Text style={styles.smallButtonText}>Change</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={styles.warnText}>Add your bank account so you can withdraw.</Text>
          <Pressable style={styles.primaryButton} onPress={startBank}>
            <Text style={styles.primaryButtonText}>Add bank account</Text>
          </Pressable>
        </>
      )}

      {/* history */}
      {wallet.activity.length > 0 ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.label}>History</Text>
          {wallet.activity.map((a) => {
            const isCredit = a.type === "credit";
            const rejected = a.kind === "rejected";
            return (
              <View key={a.id} style={styles.activityRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.activityLabel}>{a.label}</Text>
                  <Text style={styles.hintSmall}>
                    {a.atMs ? new Date(a.atMs).toLocaleString() : ""}
                    {isCredit && a.commission > 0 ? ` · after ${money(a.commission)} commission` : ""}
                    {a.clearsAtMs ? ` · clears ${when(a.clearsAtMs)}` : ""}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.value,
                    { color: isCredit ? "#1e7d32" : rejected ? "#888" : "#222" },
                    rejected && { textDecorationLine: "line-through" },
                  ]}
                >
                  {isCredit ? "+" : "−"}
                  {money(a.amount)}
                </Text>
              </View>
            );
          })}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "700", color: "#444", marginBottom: 6 },
  balance: { fontSize: 32, fontWeight: "900", color: "#111" },
  value: { fontWeight: "700" },
  muted: { color: "#666", marginTop: 3, fontSize: 13 },
  hint: { color: "#888", fontSize: 12, marginTop: 8 },
  hintSmall: { color: "#888", fontSize: 11, marginTop: 2 },
  okText: { color: "#1e7d32", fontWeight: "700", marginTop: 10 },
  warnText: { color: "#b26a00", fontWeight: "700" },
  errorText: { color: "#b00020", marginTop: 8 },
  splitRow: { flexDirection: "row", gap: 8, marginTop: 10, marginBottom: 6 },
  split: { flex: 1, backgroundColor: "#f5f6f8", borderRadius: 12, padding: 10, alignItems: "center" },
  splitNumber: { fontSize: 16, fontWeight: "900" },
  splitLabel: { color: "#666", fontSize: 12, marginTop: 2 },
  feeBox: { backgroundColor: "#f5f6f8", borderRadius: 10, padding: 10, marginTop: 10, gap: 4 },
  pendingBox: { backgroundColor: "#fff4e5", borderRadius: 10, padding: 10, marginTop: 12 },
  pendingText: { color: "#8a5200", fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 14 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  activityRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7 },
  activityLabel: { fontSize: 14, color: "#222" },
  twoCol: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  input: {
    borderWidth: 1,
    borderColor: "#d0d4db",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
    marginTop: 8,
  },
  smallButton: { borderWidth: 1, borderColor: "#222", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  smallButtonText: { fontWeight: "700", fontSize: 13 },
  primaryButton: { marginTop: 12, backgroundColor: "#222", paddingVertical: 13, borderRadius: 10, alignItems: "center" },
  greenButton: { marginTop: 14, backgroundColor: "#1e7d32", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "800" },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryButtonText: { fontWeight: "700" },
});
