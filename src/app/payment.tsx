import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { payForOrder, previewWallet, type WalletPreview } from "../lib/pay";
import DeliveryCodeCard, { shouldShowDeliveryCode } from "../components/DeliveryCodeCard";

type OrderData = {
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  vehicle: string;
  distanceKm: number;
  deliveryCode?: string;
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
  const [wallet, setWallet] = useState<WalletPreview | null>(null);
  const [useWallet, setUseWallet] = useState(true);

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

  // Sellers and riders can pay from their wallet: see what it can cover.
  const orderStatus = order?.status;
  useEffect(() => {
    if (!orderId || orderStatus !== "created") return;
    previewWallet(orderId)
      .then(setWallet)
      .catch(() => setWallet(null));
  }, [orderId, orderStatus]);

  // Paid and beyond (finding rider, on the way, delivered...).
  const isPaid = !!order && !["created", "expired", "cancelled"].includes(order.status);
  const walletApplied = wallet?.walletApplied ?? 0;
  const walletWillTake = walletApplied > 0 ? 0 : useWallet ? (wallet?.walletCanCover ?? 0) : 0;
  const toPayOnPaystack = order ? Math.max(0, order.total - walletApplied - walletWillTake) : 0;

  async function handlePay() {
    if (!orderId || starting) return;
    setErrorMessage("");
    setStarting(true);
    try {
      const result = await payForOrder(orderId, walletWillTake > 0);
      if (result.paidWithWallet) {
        setWallet(null); // the order screen updates to "paid" by itself
      } else if (result.authorizationUrl) {
        await Linking.openURL(result.authorizationUrl);
        previewWallet(orderId).then(setWallet).catch(() => undefined);
      }
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

        {(order.status === "expired" || order.status === "cancelled") && (
          <Text style={styles.errorText}>
            This order was {order.status}. Any wallet money used has gone back to your wallet. Please check out
            again.
          </Text>
        )}

        {isPaid && (
          <View style={styles.paidBanner}>
            <Text style={styles.paidBannerText}>Payment confirmed</Text>
          </View>
        )}

        {shouldShowDeliveryCode(order.status, order.deliveryCode) && (
          <DeliveryCodeCard code={order.deliveryCode} status={order.status} />
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

        {order.status === "created" && wallet?.hasWallet ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Your wallet</Text>
            {walletApplied > 0 ? (
              <Text style={styles.label}>
                NGN {walletApplied.toLocaleString()} from your wallet is already applied to this order. Pay the
                remaining NGN {toPayOnPaystack.toLocaleString()} below. (If the order expires, it goes back to
                your wallet.)
              </Text>
            ) : wallet.walletCanCover > 0 ? (
              <>
                <View style={styles.row}>
                  <Text style={styles.label}>
                    Use my wallet (NGN {wallet.walletAvailable.toLocaleString()} available)
                  </Text>
                  <Switch value={useWallet} onValueChange={setUseWallet} />
                </View>
                {useWallet ? (
                  <>
                    <View style={styles.row}>
                      <Text style={styles.label}>From wallet</Text>
                      <Text style={styles.value}>− NGN {walletWillTake.toLocaleString()}</Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.label}>Left to pay</Text>
                      <Text style={styles.value}>NGN {toPayOnPaystack.toLocaleString()}</Text>
                    </View>
                  </>
                ) : null}
              </>
            ) : (
              <Text style={styles.label}>
                Your wallet has no cleared money to spend yet. New earnings can be spent once they clear.
              </Text>
            )}
          </View>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {order.status === "created" && (
          <Pressable
            style={[styles.payButton, starting && styles.payButtonDisabled]}
            onPress={handlePay}
            disabled={starting}
          >
            <Text style={styles.payButtonText}>
              {starting
                ? "Please wait..."
                : toPayOnPaystack === 0 && walletWillTake > 0
                  ? `Pay NGN ${walletWillTake.toLocaleString()} from wallet`
                  : `Pay NGN ${toPayOnPaystack.toLocaleString()}`}
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
