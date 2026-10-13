import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandLoader } from "../components/Brand";
import { Icon } from "../components/Icon";
import { Notice, ScreenHeader, SectionCard, SummaryRow } from "../components/ui";
import { colors, fonts, radius, text, ui } from "../theme";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { payForOrder, previewWallet, type WalletPreview } from "../lib/pay";
import DeliveryCodeCard, { shouldShowDeliveryCode } from "../components/DeliveryCodeCard";

type OrderData = {
  subtotal: number;
  deliveryFee: number; // delivery + service fee + small-order fee
  deliveryParts?: { delivery: number; service: number; smallOrder: number };
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
  const insets = useSafeAreaInsets();

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

  const naira = (n: number) => `₦${n.toLocaleString()}`;

  if (!orderId) {
    return (
      <View style={[ui.screen, styles.center]}>
        <Text style={styles.emptyText}>No order to pay for.</Text>
        <Pressable style={[ui.primaryButton, { alignSelf: "stretch" }]} onPress={() => router.replace("/")}>
          <Text style={ui.primaryButtonText}>Return to the market</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[ui.screen, styles.center]}>
        <BrandLoader />
        <Text style={styles.loadingText}>Loading order...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[ui.screen, styles.center]}>
        <Text style={styles.emptyText}>{errorMessage || "Order not found."}</Text>
        <Pressable style={[ui.primaryButton, { alignSelf: "stretch" }]} onPress={() => router.replace("/")}>
          <Text style={ui.primaryButtonText}>Return to the market</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={ui.screen}>
      <View style={ui.glow} pointerEvents="none" />
      <ScreenHeader title={isPaid ? "Order paid" : "Payment"} subtitle={`Order #${orderId}`} />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}>
        {(order.status === "expired" || order.status === "cancelled") && (
          <Notice
            tone="error"
            title={`This order was ${order.status}`}
            text="Any wallet money used has gone back to your wallet. Please check out again."
          />
        )}

        {isPaid && (
          <View style={styles.paidBanner}>
            <View style={styles.paidIcon}>
              <Icon name="check" size={22} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paidBannerText}>Payment confirmed</Text>
              <Text style={styles.paidBannerSub}>We are getting your order ready.</Text>
            </View>
          </View>
        )}

        {shouldShowDeliveryCode(order.status, order.deliveryCode) && (
          <DeliveryCodeCard code={order.deliveryCode} status={order.status} />
        )}

        <SectionCard icon="bag" title="Order items">
          {order.sellerBreakdown.map((seller) => (
            <View key={seller.sellerId}>
              {seller.items.map((item, i) => (
                <View key={`${seller.sellerId}-${i}`} style={styles.row}>
                  <Text style={styles.label}>
                    {item.name} <Text style={styles.qty}>× {item.quantity}</Text>
                  </Text>
                  <Text style={styles.value}>{naira(item.unitPrice * item.quantity)}</Text>
                </View>
              ))}
            </View>
          ))}
        </SectionCard>

        <SectionCard icon="receipt" title="Summary">
          <SummaryRow label="Subtotal" value={naira(order.subtotal)} />
          <SummaryRow
            label={`Delivery (${order.vehicle}, ${order.distanceKm.toFixed(1)} km)`}
            value={naira(order.deliveryParts ? order.deliveryParts.delivery : order.deliveryFee)}
          />
          {order.deliveryParts && order.deliveryParts.service > 0 ? (
            <SummaryRow label="Service fee" value={naira(order.deliveryParts.service)} />
          ) : null}
          {order.deliveryParts && order.deliveryParts.smallOrder > 0 ? (
            <SummaryRow label="Small-order fee" value={naira(order.deliveryParts.smallOrder)} />
          ) : null}
          <View style={styles.divider} />
          <SummaryRow label="Total" value={naira(order.total)} strong />
        </SectionCard>

        {order.status === "created" && wallet?.hasWallet ? (
          <SectionCard icon="wallet" title="Your wallet">
            {walletApplied > 0 ? (
              <Text style={styles.label}>
                {naira(walletApplied)} from your wallet is already applied to this order. Pay the remaining{" "}
                {naira(toPayOnPaystack)} below. (If the order expires, it goes back to your wallet.)
              </Text>
            ) : wallet.walletCanCover > 0 ? (
              <>
                <View style={[styles.row, { alignItems: "center" }]}>
                  <Text style={styles.label}>Use my wallet ({naira(wallet.walletAvailable)} available)</Text>
                  <Switch
                    value={useWallet}
                    onValueChange={setUseWallet}
                    trackColor={{ true: colors.green, false: "#d6d3cb" }}
                    thumbColor="#ffffff"
                  />
                </View>
                {useWallet ? (
                  <>
                    <SummaryRow label="From wallet" value={`− ${naira(walletWillTake)}`} />
                    <SummaryRow label="Left to pay" value={naira(toPayOnPaystack)} />
                  </>
                ) : null}
              </>
            ) : (
              <Text style={styles.label}>
                Your wallet has no cleared money to spend yet. New earnings can be spent once they clear.
              </Text>
            )}
          </SectionCard>
        ) : null}

        {errorMessage ? <Notice tone="error" text={errorMessage} /> : null}

        {order.status === "created" && (
          <Pressable
            style={({ pressed }) => [
              ui.primaryButton,
              styles.payButton,
              pressed && { backgroundColor: colors.greenPressed },
              starting && styles.payButtonDisabled,
            ]}
            onPress={handlePay}
            disabled={starting}
          >
            <Text style={ui.primaryButtonText}>
              {starting
                ? "Please wait..."
                : toPayOnPaystack === 0 && walletWillTake > 0
                  ? `Pay ${naira(walletWillTake)} from wallet`
                  : `Pay ${naira(toPayOnPaystack)}`}
            </Text>
          </Pressable>
        )}

        {isPaid ? (
          <Pressable
            style={({ pressed }) => [ui.secondaryButton, { marginTop: 4 }, pressed && { opacity: 0.7 }]}
            onPress={() => router.replace("/orders")}
          >
            <Text style={ui.secondaryButtonText}>Track my orders</Text>
          </Pressable>
        ) : null}

        <View style={styles.securityRow}>
          <Icon name="lock" size={13} color={colors.muted} />
          <Text style={styles.securityText}>
            Payment is checked directly with Paystack. This screen updates by itself once payment is confirmed.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, paddingTop: 4 },
  center: { justifyContent: "center", alignItems: "center", padding: 24 },
  loadingText: { ...text.small, marginTop: 12 },
  emptyText: { ...text.body, color: colors.muted, textAlign: "center", marginBottom: 18 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, gap: 10 },
  label: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink2, flexShrink: 1 },
  qty: { fontFamily: fonts.semibold, color: colors.muted },
  value: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.line, marginTop: 2, marginBottom: 12 },
  payButton: { height: 56, borderRadius: 28, marginTop: 4 },
  payButtonDisabled: { opacity: 0.6 },
  securityRow: { flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 16, paddingHorizontal: 10 },
  securityText: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12, lineHeight: 17, textAlign: "center", flexShrink: 1 },
  paidBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.greenSoft,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 14,
  },
  paidIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  paidBannerText: { fontFamily: fonts.bold, fontSize: 16, color: colors.green },
  paidBannerSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink2, marginTop: 2 },
});
