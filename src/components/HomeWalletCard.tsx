import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { getMyWallet, type MyWallet } from "../lib/walletApi";

const money = (n: number) => `₦${Math.round(n).toLocaleString()}`;

// The wallet block on the Home page: real balance and quick actions.
export function HomeWalletCard() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<MyWallet | null>(null);

  // Refresh every time Home comes back into view.
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      getMyWallet()
        .then((w) => active && setWallet(w))
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, [user?.id]),
  );

  if (!user || !wallet) return null;

  const isEarner = wallet.earnings.length > 0;
  const withdrawable = wallet.earnings.reduce((s, e) => s + e.available, 0);
  // Plain customer with nothing in the wallet and funding switched off: hide.
  if (!isEarner && wallet.total === 0 && !wallet.funding.enabled) return null;

  const earnerRoute = wallet.earnings[0]?.partyType === "rider" ? "/rider" : "/seller";

  return (
    <View style={styles.wallet}>
      <Pressable onPress={() => router.push("/wallet")}>
        <Text style={styles.label}>Wallet balance</Text>
        <Text style={styles.amount}>{money(wallet.total)}</Text>
        <Text style={styles.sub}>
          {[
            wallet.rewards?.credit ? `${money(wallet.rewards.credit)} rewards` : null,
            `${money(wallet.funds.balance)} funds`,
            isEarner ? `${money(withdrawable)} earnings you can withdraw` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          {wallet.rewards?.points ? `  ·  ⭐ ${wallet.rewards.points} points` : ""}
        </Text>
      </Pressable>

      <View style={styles.buttons}>
        {wallet.funding.enabled ? (
          <Pressable style={styles.button} onPress={() => router.push({ pathname: "/wallet", params: { fund: "1" } })}>
            <Text style={styles.buttonText}>＋ Fund</Text>
          </Pressable>
        ) : null}
        {isEarner ? (
          <Pressable style={styles.button} onPress={() => router.push(earnerRoute as any)}>
            <Text style={styles.buttonText}>↗ Withdraw</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.button} onPress={() => router.push("/wallet")}>
          <Text style={styles.buttonText}>☰ History</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wallet: { marginHorizontal: 20, padding: 20, borderRadius: 18, backgroundColor: "#222" },
  label: { color: "#aaa" },
  amount: { color: "#fff", fontSize: 30, fontWeight: "800", marginTop: 5 },
  sub: { color: "#bbb", fontSize: 12, marginTop: 4 },
  buttons: { flexDirection: "row", gap: 8, marginTop: 16, flexWrap: "wrap" },
  button: { backgroundColor: "#fff", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  buttonText: { fontWeight: "700", color: "#222" },
});
