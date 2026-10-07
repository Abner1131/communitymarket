import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { payForOrder } from "../lib/pay";

type OrderData = {
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  vehicle: string;
  distanceKm: number;
  sellerBreakdown: {
    sellerId: string;
    items: { name: string; unitPrice: number; quantity: number }[];
  }[];
};

export default function PaymentScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!orderId) return;
    const unsubscribe = onSnapshot(
      doc(db, "orders", orderId),
      (snap) => {
        setLoading(false);
        if (!snap.exists()) {
          setErrorMessage("Order not found.");
          return;
        }
        const data = snap.data() as OrderData;
        setOrder(data);
      },
      (err) => {
        setLoading(false);
        setErrorMessage(err.message);
      }
    );
    return unsubscribe;
  }, [orderId]);

  async function handlePay() {
    if (!orderId || starting) return;
    setErrorMessage("");
    setStarting(true);
    try {
      const { authorizationUrl } = await payForOrder(orderId);
      await Linking.openURL(authorizationUrl);
    } catch (error: any) {
      setErrorMessage(error.message || "Could not start payment.");
    } finally {
      setStarting(false);
    }
  }

  if (!orderId) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No order to pay for.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace("/")}>
          <Text style={styles.primaryButtonText}>Return to Marketplace</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading order...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{errorMessage || "Order not found."}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Payment</Text>
        <Text style={styles.subtitle}>Order #{orderId}</Text>

        {order.status === "paid" && (
          <View style={styles.paidBanner}>
            <Text style={styles.paidBannerText}>Payment confirmed</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.sellerBreakdown.map((seller) => (
            <View key={seller.sellerId} style={{ marginBottom: 10 }}>
              {seller.items.map((item, i) => (
                <View key={`${seller.sellerId}-${i}`} style={styles.row}>
                  <Text style={styles.label}>
                    {item.name} x {item.quantity}
                  </Text>
                  <Text style={styles.value}>
                    NGN {(item.unitPrice * item.quantity).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Subtotal</Text>
            <Text style={styles.value}>NGN {order.subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>
              Delivery ({order.vehicle}, {order.distanceKm.toFixed(1)} km)
            </Text>
            <Text style={styles.value}>NGN {order.deliveryFee.toLocaleString()}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>NGN {order.total.toLocaleString()}</Text>
          </View>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {order.status !== "paid" && (
          <Pressable
            style={[styles.payButton, starting && styles.payButtonDisabled]}
            onPress={handlePay}
            disabled={starting}
          >
            <Text style={styles.payButtonText}>
              {starting ? "Opening payment page..." : "Pay Now"}
            </Text>
          </Pressable>
        )}

        <Text style={styles.securityText}>
          Payment is verified directly with Paystack. This screen updates
          automatically once payment is confirmed.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7f5" },
  scrollContent: { padding: 20, paddingTop: 60, paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#666", marginBottom: 20 },
  loadingText: { marginTop: 12, color: "#666" },
  emptyText: { color: "#666", textAlign: "center", marginBottom: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e4e7e4",
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  label: { color: "#555", flexShrink: 1, paddingRight: 10 },
  value: { fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#ddd", marginVertical: 8 },
  totalLabel: { fontSize: 17, fontWeight: "900" },
  totalValue: { fontSize: 20, fontWeight: "900", color: "#2e7d32" },
  errorText: { color: "#c62828", marginBottom: 12, textAlign: "center" },
  payButton: {
    backgroundColor: "#2e7d32",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 5,
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  securityText: { textAlign: "center", color: "#777", fontSize: 12, marginTop: 15 },
  paidBanner: {
    backgroundColor: "#e8f5e9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    alignItems: "center",
  },
  paidBannerText: { color: "#2e7d32", fontWeight: "800" },
  primaryButton: {
    backgroundColor: "#2e7d32",
    paddingHorizontal: 25,
    paddingVertical: 14,
    borderRadius: 10,
  },
  primaryButtonText: { color: "#fff", fontWeight: "800" },
});
