import { router } from "expo-router";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";

export default function WalletScreen() {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
      >
        <Pressable
          onPress={() => router.replace("/")}
        >
          <Text style={styles.backText}>
            ← Home
          </Text>
        </Pressable>

        <Text style={styles.title}>
          Wallet
        </Text>

        <Text style={styles.subtitle}>
          {user?.name}
        </Text>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>
            Available Balance
          </Text>

          <Text style={styles.balanceAmount}>
            ₦0.00
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.actionCard}>
            <Text style={styles.actionIcon}>
              💳
            </Text>

            <Text style={styles.actionTitle}>
              Pay
            </Text>

            <Text style={styles.actionText}>
              Payment wallet integration
            </Text>
          </Pressable>

          <Pressable style={styles.actionCard}>
            <Text style={styles.actionIcon}>
              💰
            </Text>

            <Text style={styles.actionTitle}>
              Receive
            </Text>

            <Text style={styles.actionText}>
              Receive community payments
            </Text>
          </Pressable>

          <Pressable style={styles.actionCard}>
            <Text style={styles.actionIcon}>
              ↗
            </Text>

            <Text style={styles.actionTitle}>
              Withdraw
            </Text>

            <Text style={styles.actionText}>
              Withdraw available funds
            </Text>
          </Pressable>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Wallet Status
          </Text>

          <Text style={styles.infoText}>
            Your wallet currently starts at ₦0.00.
            Payment and withdrawal processing will
            be connected to the wallet service in the
            financial stage.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <Pressable
          onPress={() => router.replace("/")}
        >
          <Text style={styles.navIcon}>
            🏠
          </Text>

          <Text style={styles.navText}>
            Home
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/cart")}
        >
          <Text style={styles.navIcon}>
            🛒
          </Text>

          <Text style={styles.navText}>
            Cart
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/orders")}
        >
          <Text style={styles.navIcon}>
            📦
          </Text>

          <Text style={styles.navText}>
            Orders
          </Text>
        </Pressable>

        <Pressable>
          <Text style={styles.navIcon}>
            💰
          </Text>

          <Text style={styles.navText}>
            Wallet
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            router.push("/account")
          }
        >
          <Text style={styles.navIcon}>
            👤
          </Text>

          <Text style={styles.navText}>
            Account
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f5f6f8",
  },

  container: {
    padding: 20,
    paddingBottom: 100,
  },

  backText: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 14,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
  },

  subtitle: {
    color: "#777",
    marginTop: 5,
    marginBottom: 20,
  },

  balanceCard: {
    backgroundColor: "#222",
    borderRadius: 18,
    padding: 24,
  },

  balanceLabel: {
    color: "#aaa",
    fontSize: 13,
  },

  balanceAmount: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 8,
  },

  actions: {
    marginTop: 16,
  },

  actionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },

  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },

  actionTitle: {
    fontSize: 17,
    fontWeight: "800",
  },

  actionText: {
    color: "#777",
    marginTop: 4,
  },

  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginTop: 4,
  },

  infoTitle: {
    fontSize: 17,
    fontWeight: "800",
  },

  infoText: {
    color: "#666",
    lineHeight: 21,
    marginTop: 8,
  },

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

  navIcon: {
    textAlign: "center",
    fontSize: 20,
  },

  navText: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 3,
  },
});