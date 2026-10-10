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
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  created: { text: "AWAITING PAYMENT", color: "#b26a00" },
  paid: { text: "PAID", color: "#1e7d32" },
  expired: { text: "EXPIRED", color: "#888888" },
  cancelled: { text: "CANCELLED", color: "#b00020" },
  dispatching: { text: "FINDING RIDER", color: "#1565c0" },
  assigned: { text: "RIDER ASSIGNED", color: "#1565c0" },
  picked_up: { text: "ON THE WAY", color: "#1565c0" },
  delivered: { text: "DELIVERED", color: "#1e7d32" },
};

function statusLabel(status: string) {
  return (
    STATUS_LABELS[status] ?? {
      text: status.replace(/_/g, " ").toUpperCase(),
      color: "#222222",
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
  const [orders, setOrders] = useState<ServerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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

    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => toServerOrder(d.id, d.data()))
          .sort(
            (a, b) =>
              (b.createdAt?.getTime() ?? Date.now()) -
              (a.createdAt?.getTime() ?? Date.now()),
          );
        setOrders(list);
        setLoading(false);
      },
      (err) => {
        console.error("CUSTOMER ORDERS LOAD ERROR:", err);
        setErrorMessage("Could not load your orders. Please try again.");
        setLoading(false);
      },
    );
  }, [firebaseUser]);

  if (!authChecked || loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading your orders...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.replace("/")}>
            <Text style={styles.backText}>{"←"} Home</Text>
          </Pressable>
          <Text style={styles.title}>My Orders</Text>
          <Text style={styles.subtitle}>{orders.length} order(s)</Text>
          {firebaseUser ? (
            <Text style={styles.signedIn}>
              Signed in as {firebaseUser.email}
              {"  \u00B7  "}
              <Text style={styles.signOutLink} onPress={() => void signOut(auth)}>
                Sign out
              </Text>
            </Text>
          ) : null}
        </View>

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
            <Text style={styles.emptyIcon}>{"\u{1F4E6}"}</Text>
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptyText}>
              Orders you place will appear here.
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.replace("/")}
            >
              <Text style={styles.primaryButtonText}>Continue Shopping</Text>
            </Pressable>
          </View>
        ) : (
          orders.map((order) => {
            const label = statusLabel(order.status);
            return (
              <Pressable
                key={order.id}
                style={styles.orderCard}
                onPress={() =>
                  router.push({
                    pathname: "/payment",
                    params: { orderId: order.id },
                  } as any)
                }
              >
                <View style={styles.orderHeader}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.orderId} numberOfLines={1}>
                      #{order.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <Text style={styles.orderDate}>
                      {order.createdAt
                        ? order.createdAt.toLocaleString()
                        : "Just now"}
                    </Text>
                  </View>
                  <View
                    style={[styles.statusBadge, { backgroundColor: label.color }]}
                  >
                    <Text style={styles.statusText}>{label.text}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.row}>
                  <Text style={styles.label}>Items</Text>
                  <Text style={styles.value}>
                    {order.itemCount} item(s)
                    {order.sellerCount > 1
                      ? ` from ${order.sellerCount} sellers`
                      : ""}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Delivery</Text>
                  <Text style={styles.value}>
                    {order.vehicle.toUpperCase()} {"·"} {NAIRA}
                    {order.deliveryFee.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Total</Text>
                  <Text style={styles.total}>
                    {NAIRA}
                    {order.total.toLocaleString()}
                  </Text>
                </View>

                {order.riderName &&
                  ["assigned", "picked_up", "delivered"].includes(order.status) && (
                    <View style={styles.row}>
                      <Text style={styles.label}>Rider</Text>
                      <Text style={styles.value}>
                        {order.riderName}
                        {order.riderVehicle ? ` (${order.riderVehicle})` : ""}
                      </Text>
                    </View>
                  )}

                {shouldShowDeliveryCode(order.status, order.deliveryCode) && (
                  <DeliveryCodeCard code={order.deliveryCode} status={order.status} compact />
                )}

                {order.issue ? (
                  <Pressable
                    style={[
                      styles.issueBox,
                      order.issue.status === "refunded"
                        ? { backgroundColor: "#e8f5e9" }
                        : order.issue.status === "rejected"
                          ? { backgroundColor: "#fdecea" }
                          : { backgroundColor: "#fff8e1" },
                    ]}
                    onPress={() => router.push({ pathname: "/report", params: { orderId: order.id } } as any)}
                  >
                    <Text style={styles.issueText}>
                      {order.issue.status === "refunded"
                        ? `✓ Problem settled: ${NAIRA}${(order.issue.amount || 0).toLocaleString()} refunded to your wallet`
                        : order.issue.status === "rejected"
                          ? "Problem report not accepted · tap for details"
                          : "Problem reported — we're checking · tap for details"}
                    </Text>
                  </Pressable>
                ) : order.status === "delivered" &&
                  order.deliveredAtMs !== null &&
                  Date.now() - order.deliveredAtMs < REPORT_WINDOW_MS ? (
                  <Pressable
                    style={styles.reportButton}
                    onPress={() => router.push({ pathname: "/report", params: { orderId: order.id } } as any)}
                  >
                    <Text style={styles.reportButtonText}>Report a problem</Text>
                  </Pressable>
                ) : null}

                {order.status === "created" && (
                  <Text style={styles.hint}>
                    Tap to complete payment
                  </Text>
                )}
              </Pressable>
            );
          })
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      <View style={styles.bottomNav}>
        {[
          { icon: "\u{1F3E0}", text: "Home", go: () => router.replace("/") },
          { icon: "\u{1F6D2}", text: "Cart", go: () => router.push("/cart") },
          { icon: "\u{1F4E6}", text: "Orders", go: undefined },
          { icon: "\u{1F4B0}", text: "Wallet", go: () => router.push("/wallet") },
          { icon: "\u{1F464}", text: "Account", go: () => router.push("/account") },
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 10 },
  header: { marginBottom: 20 },
  backText: { fontWeight: "700", marginBottom: 14 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { color: "#777", marginTop: 5 },
  signedIn: { color: "#777", marginTop: 6, fontSize: 12 },
  signOutLink: { color: "#1565c0", fontWeight: "700" },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  emptyText: {
    color: "#666",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderId: { fontSize: 16, fontWeight: "800" },
  orderDate: { color: "#777", fontSize: 11, marginTop: 4 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
  statusText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 14 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  label: { fontSize: 12, color: "#777", fontWeight: "700" },
  value: { fontSize: 14, fontWeight: "600" },
  total: { fontSize: 19, fontWeight: "900" },
  hint: { marginTop: 12, color: "#b26a00", fontWeight: "700", fontSize: 12 },
  issueBox: { marginTop: 12, borderRadius: 10, padding: 10 },
  issueText: { fontWeight: "700", fontSize: 13, color: "#333" },
  reportButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#b00020",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  reportButtonText: { color: "#b00020", fontWeight: "800" },
  primaryButton: {
    marginTop: 16,
    width: "100%",
    backgroundColor: "#222",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
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
