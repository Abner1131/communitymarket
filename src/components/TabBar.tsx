// Floating glass tab bar at the bottom of Home, Cart, Orders, Wallet and Account.
// The open tab is a green pill with its name; the others are icons only.

import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCart } from "../context/CartContext";
import { colors, fonts, shadow } from "../theme";
import { Icon, type IconName } from "./Icon";

export type TabKey = "home" | "cart" | "orders" | "wallet" | "account";

const TABS: { key: TabKey; label: string; icon: IconName; path: string }[] = [
  { key: "home", label: "Home", icon: "home", path: "/" },
  { key: "cart", label: "Cart", icon: "bag", path: "/cart" },
  { key: "orders", label: "Orders", icon: "package", path: "/orders" },
  { key: "wallet", label: "Wallet", icon: "wallet", path: "/wallet" },
  { key: "account", label: "Account", icon: "user", path: "/account" },
];

// Space a screen should leave at the bottom so the bar never covers content.
export const TAB_BAR_SPACE = 110;

export function TabBar({ active }: { active: TabKey }) {
  const insets = useSafeAreaInsets();
  const { cartCount } = useCart();

  return (
    <View style={[styles.bar, { bottom: 14 + Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const on = tab.key === active;
        const badge = tab.key === "cart" && cartCount > 0 ? cartCount : 0;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={badge ? `${tab.label}, ${badge} items` : tab.label}
            onPress={() => {
              if (on) return;
              if (tab.key === "home") router.replace("/");
              else router.push(tab.path as any);
            }}
            style={({ pressed }) => [on ? styles.activeTab : styles.tab, pressed && !on && styles.pressed]}
            hitSlop={4}
          >
            <Icon name={tab.icon} size={21} color={on ? "#ffffff" : colors.ink2} />
            {on ? <Text style={styles.activeLabel}>{tab.label}</Text> : null}
            {badge ? (
              <View style={[styles.badge, on && styles.badgeOnGreen]}>
                <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 66,
    borderRadius: 33,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    ...shadow.float,
  },
  tab: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  pressed: { backgroundColor: colors.chip },
  activeTab: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: colors.green,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activeLabel: { color: "#ffffff", fontFamily: fonts.bold, fontSize: 13 },
  badge: {
    position: "absolute",
    top: 5,
    right: 3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  badgeOnGreen: { backgroundColor: colors.goldDeep },
  badgeText: { color: "#ffffff", fontFamily: fonts.bold, fontSize: 10 },
});
