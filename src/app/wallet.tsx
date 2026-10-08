import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { applyInviteCode, getMyWallet, redeemPoints, startTopup, type MyWallet } from "../lib/walletApi";

const money = (n: number) => `₦${Math.round(n).toLocaleString()}`;
const QUICK_AMOUNTS = [1000, 2000, 5000, 10000];

// My wallet: funds I added (spend-only, used at checkout) and, for sellers
// and riders, a summary of earnings (withdrawn from their dashboards).
export default function WalletScreen() {
  const params = useLocalSearchParams<{ fund?: string }>();
  const [wallet, setWallet] = useState<MyWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [funding, setFunding] = useState(params.fund === "1");
  const [amount, setAmount] = useState("");
  const [starting, setStarting] = useState(false);
  const [fundError, setFundError] = useState("");
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  const balanceBefore = useRef<number | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [rewardsBusy, setRewardsBusy] = useState<string | null>(null);
  const [rewardsMsg, setRewardsMsg] = useState("");
  const [rewardsErr, setRewardsErr] = useState("");

  async function rewardsAction(label: string, fn: () => Promise<MyWallet>) {
    setRewardsBusy(label);
    setRewardsErr("");
    setRewardsMsg("");
    try {
      const w = await fn();
      setWallet(w);
      if (w.message) setRewardsMsg(w.message);
    } catch (e: any) {
      setRewardsErr(e?.message || "Something went wrong.");
    } finally {
      setRewardsBusy(null);
    }
  }

  async function shareCode(code: string, w: MyWallet) {
    const r = w.rewards.referral;
    await Share.share({
      message:
        `Shop on CommunityMarket with my invite code ${code}` +
        (r.enabled ? ` and get ₦${r.newUserCredit.toLocaleString()} credit after your first delivery!` : "!"),
    }).catch(() => undefined);
  }

  const load = useCallback(async () => {
    try {
      const w = await getMyWallet();
      setWallet(w);
      setError("");
      // Payment confirmed by Paystack: the balance went up.
      if (balanceBefore.current !== null && w.funds.balance > balanceBefore.current) {
        balanceBefore.current = null;
        setWaitingForPayment(false);
        setFunding(false);
        setAmount("");
      }
      return w;
    } catch (e: any) {
      setError(e?.message || "Could not load your wallet.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Coming back from the Paystack page: check again, then a few more times
  // (the webhook usually lands within seconds).
  useEffect(() => {
    if (!waitingForPayment) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void load();
    });
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      void load();
      if (tries >= 24) {
        clearInterval(timer);
        setWaitingForPayment(false);
      }
    }, 5000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [waitingForPayment, load]);

  async function fund() {
    if (!wallet) return;
    const n = parseInt(amount, 10);
    const f = wallet.funding;
    setFundError("");
    if (!Number.isInteger(n)) return setFundError("Enter an amount.");
    if (n < f.minTopup) return setFundError(`The smallest top-up is ${money(f.minTopup)}.`);
    if (n > f.maxTopup) return setFundError(`The largest top-up is ${money(f.maxTopup)}.`);
    if (n > f.roomLeft) return setFundError(`You can add at most ${money(f.roomLeft)} now.`);
    setStarting(true);
    try {
      const { authorizationUrl } = await startTopup(n);
      balanceBefore.current = wallet.funds.balance;
      setWaitingForPayment(true);
      await Linking.openURL(authorizationUrl);
    } catch (e: any) {
      setFundError(e?.message || "Could not start the payment.");
    } finally {
      setStarting(false);
    }
  }

  const header = (
    <>
      <Pressable onPress={() => router.replace("/")}>
        <Text style={styles.backText}>{"←"} Home</Text>
      </Pressable>
      <Text style={styles.title}>Wallet</Text>
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}
      >
        {header}

        {loading && !wallet ? (
          <ActivityIndicator size="large" style={{ marginTop: 40 }} />
        ) : !wallet ? (
          <View style={styles.card}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.darkButton} onPress={() => void load()}>
              <Text style={styles.whiteText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* TOTAL */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Total balance</Text>
              <Text style={styles.balanceAmount}>{money(wallet.total)}</Text>
              <Text style={styles.balanceSub}>
                Pay for orders with it: turn on "Use my wallet" on the payment screen. Rewards are used first.
              </Text>
            </View>

            {/* REWARDS */}
            {wallet.rewards ? (
              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.cardTitle}>Rewards</Text>
                    <Text style={styles.muted}>Credit for shopping · used first at checkout</Text>
                  </View>
                  <Text style={styles.bigValue}>{money(wallet.rewards.credit)}</Text>
                </View>
                {wallet.rewards.credit > 0 && wallet.rewards.creditExpiresAtMs ? (
                  <Text style={styles.hint}>
                    Use it before {new Date(wallet.rewards.creditExpiresAtMs).toLocaleDateString()} (credit lasts{" "}
                    {wallet.rewards.creditExpiryDays} days).
                  </Text>
                ) : null}

                {/* points */}
                {wallet.rewards.pointsRule.enabled || wallet.rewards.points > 0 ? (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.rowBetween}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.value}>⭐ {wallet.rewards.points} points</Text>
                        <Text style={styles.hintSmall}>
                          1 point per {money(wallet.rewards.pointsRule.nairaPerPoint)} spent · 100 points ={" "}
                          {money(wallet.rewards.pointsRule.nairaPer100Points)}
                        </Text>
                      </View>
                      {wallet.rewards.points >= wallet.rewards.pointsRule.minRedeemPoints ? (
                        <Pressable
                          style={[styles.smallButton, rewardsBusy !== null && { opacity: 0.5 }]}
                          disabled={rewardsBusy !== null}
                          onPress={() => {
                            const pts = Math.floor(wallet.rewards.points / 100) * 100;
                            void rewardsAction("redeem", () => redeemPoints(pts));
                          }}
                        >
                          <Text style={styles.smallButtonText}>
                            {rewardsBusy === "redeem"
                              ? "..."
                              : `Redeem ${Math.floor(wallet.rewards.points / 100) * 100} → ${money(
                                  (Math.floor(wallet.rewards.points / 100) * wallet.rewards.pointsRule.nairaPer100Points),
                                )}`}
                          </Text>
                        </Pressable>
                      ) : (
                        <Text style={styles.hintSmall}>
                          Redeem from {wallet.rewards.pointsRule.minRedeemPoints}
                        </Text>
                      )}
                    </View>
                  </>
                ) : null}

                {/* my invite code */}
                {wallet.rewards.referral.enabled || wallet.rewards.referral.partnerEnabled ? (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.value}>Invite friends</Text>
                    <Text style={styles.hintSmall}>
                      {wallet.rewards.referral.enabled
                        ? `They get ${money(wallet.rewards.referral.newUserCredit)} after their first delivery; you get ${money(
                            wallet.rewards.referral.inviterCredit,
                          )} when that first order is at least ${money(wallet.rewards.referral.minOrder)}.`
                        : ""}
                      {wallet.rewards.referral.partnerEnabled
                        ? ` Invite riders or sellers: ${money(wallet.rewards.referral.partnerBonus)} when they reach ${
                            wallet.rewards.referral.partnerTarget
                          } deliveries.`
                        : ""}
                    </Text>
                    <View style={[styles.rowBetween, { marginTop: 10 }]}>
                      <Text style={styles.codeText} selectable>
                        {wallet.rewards.code}
                      </Text>
                      <Pressable style={styles.smallButton} onPress={() => void shareCode(wallet.rewards.code, wallet)}>
                        <Text style={styles.smallButtonText}>Share</Text>
                      </Pressable>
                    </View>
                    {wallet.rewards.invited.total > 0 ? (
                      <Text style={styles.hintSmall}>
                        {wallet.rewards.invited.total} joined with your code · {wallet.rewards.invited.rewarded} completed a
                        first order
                      </Text>
                    ) : null}
                  </>
                ) : null}

                {/* enter someone's code */}
                {wallet.rewards.canEnterCode ? (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.value}>Got an invite code?</Text>
                    <View style={[styles.twoCol, { alignItems: "center" }]}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={codeInput}
                        onChangeText={(t) => setCodeInput(t.toUpperCase())}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        placeholder="e.g. AMINA4K2"
                      />
                      <Pressable
                        style={[styles.smallButton, { marginTop: 10 }, (rewardsBusy !== null || !codeInput.trim()) && { opacity: 0.5 }]}
                        disabled={rewardsBusy !== null || !codeInput.trim()}
                        onPress={() => void rewardsAction("code", () => applyInviteCode(codeInput.trim()))}
                      >
                        <Text style={styles.smallButtonText}>{rewardsBusy === "code" ? "..." : "Apply"}</Text>
                      </Pressable>
                    </View>
                  </>
                ) : wallet.rewards.referredBy ? (
                  <Text style={styles.hintSmall}>Invited with code {wallet.rewards.referredBy}.</Text>
                ) : null}

                {rewardsMsg ? <Text style={styles.okText}>{rewardsMsg}</Text> : null}
                {rewardsErr ? <Text style={styles.errorText}>{rewardsErr}</Text> : null}

                {wallet.rewards.activity.length > 0 ? (
                  <>
                    <View style={styles.divider} />
                    {wallet.rewards.activity.map((a) => (
                      <View key={a.id} style={styles.activityRow}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.activityLabel}>{a.label}</Text>
                          {a.expiresAtMs ? (
                            <Text style={styles.hintSmall}>Expires {new Date(a.expiresAtMs).toLocaleDateString()}</Text>
                          ) : null}
                        </View>
                        <Text style={[styles.value, { color: "#1e7d32" }]}>{money(a.amount)}</Text>
                      </View>
                    ))}
                  </>
                ) : null}
              </View>
            ) : null}

            {/* FUNDS */}
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.cardTitle}>Funds</Text>
                  <Text style={styles.muted}>Money you added · for shopping only</Text>
                </View>
                <Text style={styles.bigValue}>{money(wallet.funds.balance)}</Text>
              </View>

              {waitingForPayment ? (
                <View style={styles.pendingBox}>
                  <ActivityIndicator size="small" />
                  <Text style={styles.pendingText}>
                    Waiting for Paystack to confirm your payment. This page updates by itself.
                  </Text>
                </View>
              ) : null}

              {!wallet.funding.enabled ? (
                <Text style={styles.hint}>Adding money is not available right now.</Text>
              ) : funding ? (
                <>
                  <Text style={styles.label}>Amount to add</Text>
                  <View style={styles.chips}>
                    {QUICK_AMOUNTS.filter((q) => q >= wallet.funding.minTopup && q <= wallet.funding.roomLeft).map((q) => (
                      <Pressable
                        key={q}
                        style={[styles.chip, amount === String(q) && styles.chipActive]}
                        onPress={() => setAmount(String(q))}
                      >
                        <Text style={[styles.chipText, amount === String(q) && styles.chipTextActive]}>{money(q)}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    placeholder={`${wallet.funding.minTopup} – ${Math.min(wallet.funding.maxTopup, wallet.funding.roomLeft)}`}
                  />
                  {fundError ? <Text style={styles.errorText}>{fundError}</Text> : null}
                  <View style={styles.twoCol}>
                    <Pressable style={[styles.outlineButton, { flex: 1 }]} onPress={() => setFunding(false)} disabled={starting}>
                      <Text style={styles.outlineText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.greenButton, { flex: 1 }, starting && { opacity: 0.6 }]}
                      onPress={() => void fund()}
                      disabled={starting}
                    >
                      <Text style={styles.whiteText}>{starting ? "Opening Paystack..." : "Pay with Paystack"}</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.hint}>
                    Funds can be spent on orders in CommunityMarket. They can't be withdrawn to a bank. Paystack's
                    small fee is added at payment.
                  </Text>
                </>
              ) : (
                <Pressable style={styles.greenButton} onPress={() => setFunding(true)}>
                  <Text style={styles.whiteText}>＋ Fund wallet</Text>
                </Pressable>
              )}
            </View>

            {/* EARNINGS (sellers / riders) */}
            {wallet.earnings.map((e) => (
              <View key={`${e.partyType}:${e.partyId}`} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.cardTitle}>Earnings · {e.name}</Text>
                    <Text style={styles.muted}>
                      {money(e.available)} can withdraw · {money(e.clearing)} clearing
                    </Text>
                  </View>
                  <Text style={styles.bigValue}>{money(e.balance)}</Text>
                </View>
                <Pressable
                  style={styles.darkButton}
                  onPress={() => router.push((e.partyType === "rider" ? "/rider" : "/seller") as any)}
                >
                  <Text style={styles.whiteText}>
                    {e.partyType === "rider" ? "Open rider wallet (withdraw)" : "Open shop wallet (withdraw)"}
                  </Text>
                </Pressable>
              </View>
            ))}

            {/* HISTORY */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Funds history</Text>
              {wallet.funds.activity.length === 0 ? (
                <Text style={styles.muted}>Nothing yet.</Text>
              ) : (
                wallet.funds.activity.map((a) => {
                  const minus = a.type === "purchase";
                  return (
                    <View key={a.id} style={styles.activityRow}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.activityLabel}>{a.label}</Text>
                        <Text style={styles.hintSmall}>{a.atMs ? new Date(a.atMs).toLocaleString() : ""}</Text>
                      </View>
                      <Text style={[styles.value, { color: minus ? "#222" : "#1e7d32" }]}>
                        {minus ? "−" : "+"}
                        {money(a.amount)}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.bottomNav}>
        {[
          { icon: "🏠", text: "Home", go: () => router.replace("/") },
          { icon: "🛒", text: "Cart", go: () => router.push("/cart") },
          { icon: "📦", text: "Orders", go: () => router.push("/orders") },
          { icon: "💰", text: "Wallet", go: undefined },
          { icon: "👤", text: "Account", go: () => router.push("/account") },
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
  container: { padding: 20, paddingBottom: 100 },
  backText: { fontSize: 14, fontWeight: "700", marginBottom: 14 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 14 },
  balanceCard: { backgroundColor: "#222", borderRadius: 18, padding: 20, marginBottom: 14 },
  balanceLabel: { color: "#aaa" },
  balanceAmount: { color: "#fff", fontSize: 32, fontWeight: "900", marginTop: 4 },
  balanceSub: { color: "#bbb", fontSize: 12, marginTop: 6 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  muted: { color: "#666", marginTop: 3, fontSize: 13 },
  hint: { color: "#888", fontSize: 12, marginTop: 10 },
  hintSmall: { color: "#888", fontSize: 11, marginTop: 2 },
  label: { fontSize: 13, fontWeight: "700", color: "#444", marginTop: 14, marginBottom: 8 },
  value: { fontWeight: "700" },
  bigValue: { fontSize: 20, fontWeight: "900" },
  errorText: { color: "#b00020", marginTop: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  twoCol: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderColor: "#ccc", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: "#222", borderColor: "#222" },
  chipText: { fontSize: 13, color: "#444", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  input: { borderWidth: 1, borderColor: "#d0d4db", borderRadius: 10, padding: 12, backgroundColor: "#fff", marginTop: 10 },
  pendingBox: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: "#fff4e5", borderRadius: 10, padding: 10, marginTop: 12 },
  pendingText: { color: "#8a5200", flex: 1, fontWeight: "600" },
  greenButton: { marginTop: 14, backgroundColor: "#1e7d32", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  darkButton: { marginTop: 12, backgroundColor: "#222", paddingVertical: 13, borderRadius: 10, alignItems: "center" },
  outlineButton: { marginTop: 14, borderWidth: 1, borderColor: "#222", paddingVertical: 13, borderRadius: 10, alignItems: "center" },
  outlineText: { fontWeight: "700" },
  whiteText: { color: "#fff", fontWeight: "800" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 12 },
  smallButton: { borderWidth: 1, borderColor: "#222", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  smallButtonText: { fontWeight: "700", fontSize: 13 },
  codeText: { fontSize: 22, fontWeight: "900", letterSpacing: 2 },
  okText: { color: "#1e7d32", fontWeight: "700", marginTop: 10 },
  activityRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7 },
  activityLabel: { fontSize: 14, color: "#222" },
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
