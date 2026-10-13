import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { getMyWallet, type MyWallet } from "../lib/walletApi";
import { colors, fonts, radius, shadow } from "../theme";
import { Icon, type IconName } from "./Icon";

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
      <View style={styles.ring} pointerEvents="none" />
      <Pressable onPress={() => router.push("/wallet")} accessibilityLabel={`Wallet balance ${money(wallet.total)}`}>
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
          {wallet.rewards?.points ? `  ·  ${wallet.rewards.points} points` : ""}
        </Text>
      </Pressable>

      <View style={styles.buttons}>
        {wallet.funding.enabled ? (
          <WalletButton icon="plus" label="Fund" onPress={() => router.push({ pathname: "/wallet", params: { fund: "1" } })} />
        ) : null}
        {isEarner ? <WalletButton icon="arrow-up-right" label="Withdraw" onPress={() => router.push(earnerRoute as any)} /> : null}
        <WalletButton icon="list" label="History" onPress={() => router.push("/wallet")} />
      </View>
    </View>
  );
}

function WalletButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]} onPress={onPress}>
      <Icon name={icon} size={16} color={colors.cream} />
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wallet: {
    marginBottom: 16,
    padding: 20,
    borderRadius: radius.xl,
    backgroundColor: colors.green,
    overflow: "hidden",
    ...shadow.button,
  },
  ring: {
    position: "absolute",
    right: -44,
    top: -44,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 18,
    borderColor: "rgba(242,179,61,0.16)",
  },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.onGreenMuted },
  amount: { fontFamily: fonts.display, fontSize: 32, letterSpacing: -0.6, color: colors.gold, marginTop: 4 },
  sub: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.onGreenMuted, marginTop: 4 },
  buttons: { flexDirection: "row", gap: 8, marginTop: 16, flexWrap: "wrap" },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  buttonText: { fontFamily: fonts.bold, fontSize: 13, color: colors.cream },
});
