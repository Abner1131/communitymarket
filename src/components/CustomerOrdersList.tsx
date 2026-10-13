import { router } from "expo-router";
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  where,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { useScreenCache } from "../lib/screenCache";
import { StaleNote } from "./StaleNote";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { TAB_BAR_SPACE, TabBar } from "./TabBar";

import { BrandLoader } from "./Brand";
import { Icon } from "./Icon";
import { ScreenHeader } from "./ui";
import { colors, fonts, radius, text, ui } from "../theme";

import { auth, db } from "../lib/firebase";
import DeliveryCodeCard, { shouldShowDeliveryCode } from "./DeliveryCodeCard";
import FirebaseSignInCard from "./FirebaseSignInCard";

// Shape of an order document written by the server (/api/checkout).
type ServerOrder = {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  vehicle: string;
  createdAt: Date | null;
  itemCount: number;
  sellerCount: number;
  riderName: string | null;
  riderVehicle: string | null;
  deliveryCode: string | null;
  deliveredAtMs: number | null;
  issue: { status: string; amount: number | null } | null;
};

const REPORT_WINDOW_MS = 48 * 60 * 60 * 1000;

const NAIRA = "₦";

const PROGRESS = { bg: "#e7eef8", fg: "#1f4f8a" };
const STATUS_LABELS: Record<string, { text: string; bg: string; fg: string }> = {
  created: { text: "Awaiting payment", bg: colors.goldSoft, fg: colors.goldText },
  paid: { text: "Paid", bg: colors.greenSoft, fg: colors.green },
  expired: { text: "Expired", bg: colors.chip, fg: colors.muted },
  cancelled: { text: "Cancelled", bg: colors.dangerSoft, fg: colors.danger },
  dispatching: { text: "Finding rider", ...PROGRESS },
  assigned: { text: "Rider assigned", ...PROGRESS },
  picked_up: { text: "On the way", ...PROGRESS },
  delivered: { text: "Delivered", bg: colors.greenSoft, fg: colors.green },
};

function statusLabel(status: string) {
  return (
    STATUS_LABELS[status] ?? {
      text: status.replace(/_/g, " "),
      bg: colors.chip,
      fg: colors.ink2,
    }
  );
}

function toServerOrder(id: string, data: any): ServerOrder {
  const breakdown: any[] = Array.isArray(data.sellerBreakdown)
    ? data.sellerBreakdown
    : [];
  const itemCount = breakdown.reduce(
    (sum, seller) =>
      sum +
      (Array.isArray(seller.items)
        ? seller.items.reduce(
            (n: number, item: any) => n + (Number(item.quantity) || 0),
            0,
          )
        : 0),
    0,
  );
  const createdAt = data.createdAt as Timestamp | null | undefined;
  return {
    id,
    status: typeof data.status === "string" ? data.status : "created",
    total: Number(data.total) || 0,
    subtotal: Number(data.subtotal) || 0,
    deliveryFee: Number(data.deliveryFee) || 0,
    vehicle: typeof data.vehicle === "string" ? data.vehicle : "",
    createdAt: createdAt && typeof createdAt.toDate === "function"
      ? createdAt.toDate()
      : null,
    itemCount,
    sellerCount: breakdown.length,
    riderName:
      data.rider && typeof data.rider.name === "string" ? data.rider.name : null,
    riderVehicle:
      data.rider && typeof data.rider.vehicle === "string" ? data.rider.vehicle : null,
    deliveryCode: typeof data.deliveryCode === "string" ? data.deliveryCode : null,
    deliveredAtMs:
      data.deliveredAt && typeof data.deliveredAt.toMillis === "function" ? data.deliveredAt.toMillis() : null,
    issue:
      data.issue && typeof data.issue.status === "string"
        ? { status: data.issue.status, amount: Number(data.issue.amount) || null }
        : null,
  };
}

// The customer's real orders, read live from Firestore.
// Firestore rules only allow a customer to read their own orders.
export default function CustomerOrdersList() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(
    auth.currentUser,
  );
  const [authChecked, setAuthChecked] = useState(false);
  // Opens instantly with the last saved list, then the live list replaces it.
  // Delivery codes are never saved on the phone: they only show from live data.
  const ordersCache = useScreenCache<ServerOrder[]>("orders", {
    toStore: (list) =>
      list.map((o) => ({ ...o, deliveryCode: null, createdAt: o.createdAt ? o.createdAt.getTime() : null })),
    fromStore: (raw: any[]) =>
      raw.map((o) => ({ ...o, createdAt: typeof o.createdAt === "number" ? new Date(o.createdAt) : null })),
  });
  const orders = ordersCache.value ?? [];
  const setOrders = ordersCache.setFresh;
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!firebaseUser) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    // Single equality filter: needs no extra index. Sorted on the phone.
    const q = query(
      collection(db, "orders"),
      where("customerId", "==", firebaseUser.uid),
    );

    // No answer within 12 s (no internet): say we're showing the saved list.
    const slow = setTimeout(() => setLoadFailed(true), 12000);
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        clearTimeout(slow);
        const list = snap.docs
          .map((d) => toServerOrder(d.id, d.data()))
          .sort(
            (a, b) =>
              (b.createdAt?.getTime() ?? Date.now()) -
              (a.createdAt?.getTime() ?? Date.now()),
          );
        setOrders(list);
        setLoadFailed(false);
        setLoading(false);
      },
      (err) => {
        console.error("CUSTOMER ORDERS LOAD ERROR:", err);
        setErrorMessage(
          ordersCache.fromCache ? "" : "Could not load your orders. Please try again.",
        );
        setLoadFailed(true);
        setLoading(false);
      },
    );
    return () => {
      clearTimeout(slow);
      unsubscribe();
    };
  }, [firebaseUser]);

  if ((!authChecked || loading) && !ordersCache.value) {
    return (
      <View style={[ui.screen, styles.centered]}>
        <BrandLoader />
        <Text style={styles.loadingText}>Loading your orders...</Text>
      </View>
    );
  }

  return (
    <View style={ui.screen}>
      <View style={ui.glow} pointerEvents="none" />
      <ScreenHeader
        title="My orders"
        subtitle={`${orders.length} ${orders.length === 1 ? "order" : "orders"}`}
        onBack={() => router.replace("/")}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <StaleNote fromCache={ordersCache.fromCache} failed={loadFailed} savedAtMs={ordersCache.savedAtMs} />
        {firebaseUser ? (
          <Text style={styles.signedIn}>
            Signed in as {firebaseUser.email}
            {"  \u00B7  "}
            <Text style={styles.signOutLink} onPress={() => void signOut(auth)}>
              Sign out
            </Text>
          </Text>
        ) : null}

        {!firebaseUser ? (
          <FirebaseSignInCard
            title="Sign in to see your orders"
            subtitle="Use the same email you used at checkout."
          />
        ) : errorMessage ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Something went wrong</Text>
            <Text style={styles.emptyText}>{errorMessage}</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Icon name="package" size={30} color={colors.green} />
            </View>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyText}>Orders you place will appear here.</Text>
            <Pressable
              style={({ pressed }) => [ui.primaryButton, styles.fullButton, pressed && { backgroundColor: colors.greenPressed }]}
              onPress={() => router.replace("/")}
            >
              <Text style={ui.primaryButtonText}>Start shopping</Text>
            </Pressable>
          </View>
        ) : (
          orders.map((order) => {
            const label = statusLabel(order.status);
            return (
              <Pressable
                key={order.id}
                style={({ pressed }) => [styles.orderCard, pressed && { opacity: 0.85 }]}
                onPress={() =>
                  router.push({
                    pathname: "/payment",
                    params: { orderId: order.id },
                  } as any)
                }
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderIcon}>
                    <Icon name="package" size={20} color={colors.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderId} numberOfLines={1}>
                      #{order.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <Text style={styles.orderDate}>
                      {order.createdAt ? order.createdAt.toLocaleString() : "Just now"}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: label.bg }]}>
                    <Text style={[styles.statusText, { color: label.fg }]}>{label.text}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.row}>
                  <Text style={styles.label}>Items</Text>
                  <Text style={styles.value}>
                    {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                    {order.sellerCount > 1 ? ` from ${order.sellerCount} sellers` : ""}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Delivery</Text>
                  <Text style={styles.value}>
                    {order.vehicle ? order.vehicle.charAt(0).toUpperCase() + order.vehicle.slice(1) : ""} {"·"} {NAIRA}
                    {order.deliveryFee.toLocaleString()}
                  </Text>
                </View>
                {order.riderName && ["assigned", "picked_up", "delivered"].includes(order.status) && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Rider</Text>
                    <Text style={styles.value}>
                      {order.riderName}
                      {order.riderVehicle ? ` (${order.riderVehicle})` : ""}
                    </Text>
                  </View>
                )}
                <View style={[styles.row, { marginTop: 10 }]}>
                  <Text style={styles.label}>Total</Text>
                  <Text style={styles.total}>
                    {NAIRA}
                    {order.total.toLocaleString()}
                  </Text>
                </View>

                {shouldShowDeliveryCode(order.status, order.deliveryCode) && (
                  <DeliveryCodeCard code={order.deliveryCode} status={order.status} compact />
                )}

                {order.issue ? (
                  <Pressable
                    style={[
                      styles.issueBox,
                      order.issue.status === "refunded"
                        ? { backgroundColor: colors.greenSoft }
                        : order.issue.status === "rejected"
                          ? { backgroundColor: colors.dangerSoft }
                          : { backgroundColor: colors.goldSoft },
                    ]}
                    onPress={() => router.push({ pathname: "/report", params: { orderId: order.id } } as any)}
                  >
                    <Text style={styles.issueText}>
                      {order.issue.status === "refunded"
                        ? `Problem settled: ${NAIRA}${(order.issue.amount || 0).toLocaleString()} refunded to your wallet`
                        : order.issue.status === "rejected"
                          ? "Problem report not accepted · tap for details"
                          : "Problem reported, we're checking · tap for details"}
                    </Text>
                  </Pressable>
                ) : order.status === "delivered" &&
                  order.deliveredAtMs !== null &&
                  Date.now() - order.deliveredAtMs < REPORT_WINDOW_MS ? (
                  <Pressable
                    style={({ pressed }) => [styles.reportButton, pressed && { opacity: 0.7 }]}
                    onPress={() => router.push({ pathname: "/report", params: { orderId: order.id } } as any)}
                  >
                    <Icon name="alert" size={16} color={colors.danger} />
                    <Text style={styles.reportButtonText}>Report a problem</Text>
                  </Pressable>
                ) : null}

                {order.status === "created" && (
                  <View style={styles.hintRow}>
                    <Text style={styles.hint}>Tap to complete payment</Text>
                    <Icon name="chevron-right" size={16} color={colors.goldText} />
                  </View>
                )}
              </Pressable>
            );
          })
        )}

        <View style={{ height: 10 }} />
      </ScrollView>

      <TabBar active="orders" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: TAB_BAR_SPACE },
  centered: { alignItems: "center", justifyContent: "center" },
  loadingText: { ...text.small, marginTop: 10 },
  signedIn: { ...text.small, fontSize: 12, marginBottom: 14 },
  signOutLink: { fontFamily: fonts.bold, color: colors.green },
  emptyCard: { ...ui.card, padding: 24, alignItems: "center" },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { ...text.title, fontSize: 20, textAlign: "center" },
  emptyText: { ...text.small, fontSize: 14, textAlign: "center", lineHeight: 21, marginTop: 8 },
  fullButton: { marginTop: 18, alignSelf: "stretch" },
  orderCard: { ...ui.card, padding: 16, marginBottom: 12 },
  orderHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  orderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  orderId: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  orderDate: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12, marginTop: 2 },
  statusBadge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontFamily: fonts.bold, fontSize: 12 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  label: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  value: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  total: { ...text.price, fontSize: 19 },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12 },
  hint: { fontFamily: fonts.bold, color: colors.goldText, fontSize: 13 },
  issueBox: { marginTop: 12, borderRadius: radius.sm, padding: 12 },
  issueText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink2 },
  reportButton: {
    marginTop: 12,
    flexDirection: "row",
    gap: 6,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  reportButtonText: { fontFamily: fonts.bold, fontSize: 14, color: colors.danger },
});
