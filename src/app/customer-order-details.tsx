import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { useOrders } from "../context/OrderContext";

export default function CustomerOrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const { user } = useAuth();
  const { orders, isLoadingOrders } = useOrders();

  const orderId = Array.isArray(params.orderId)
    ? params.orderId[0]
    : params.orderId;

  const order = useMemo(
    () => orders.find((item) => item.orderId === orderId),
    [orders, orderId],
  );

  const hasAccess =
    user?.role === "customer" &&
    !!user.id &&
    !!order?.customerId &&
    order.customerId === user.id;

  if (isLoadingOrders) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.muted}>Loading order...</Text>
      </SafeAreaView>
    );
  }

  if (!order || !hasAccess) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>Order Access</Text>
        <Text style={styles.message}>
          This order is not available in your customer account.
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => router.replace("/orders")}
        >
          <Text style={styles.buttonText}>Back to My Orders</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.replace("/orders")}>
          <Text style={styles.back}>← My Orders</Text>
        </Pressable>

        <Text style={styles.title}>Customer Order Details</Text>
        <Text style={styles.orderId}>{order.orderId}</Text>

        <View style={styles.card}>
          <Text style={styles.section}>Order Information</Text>
          <Row
            label="Date"
            value={new Date(order.createdAt).toLocaleString()}
          />
          <Row label="Status" value={order.status} />
          <Row label="Delivery" value={order.status} />
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Rider & Delivery</Text>
          <Row
            label="Rider"
            value={
              order.assignedRiderName ??
              "Waiting for rider assignment"
            }
          />
          <Row label="Vehicle" value={String(order.vehicle)} />
          <Row
            label="Distance"
            value={`${Number(
              order.distanceKm ?? 0,
            ).toFixed(2)} km`}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Customer Details</Text>
          <Text style={styles.detail}>
            {order.customerName}
          </Text>
          <Text style={styles.detail}>{order.phone}</Text>
          <Text style={styles.detail}>{order.address}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Items</Text>

          {order.items.map((item, index) => (
            <View
              key={`${item.productId}-${index}`}
              style={styles.itemRow}
            >
              <View style={styles.flex}>
                <Text style={styles.itemName}>
                  {item.productName}
                </Text>

                <Text style={styles.muted}>
                  {item.sellerName} • Qty: {item.quantity}
                </Text>
              </View>

              <Text style={styles.itemTotal}>
                ₦
                {(
                  item.quantity * item.unitPrice
                ).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Pickup Stops</Text>

          {order.pickupStops.length === 0 ? (
            <Text style={styles.muted}>
              No pickup stops recorded.
            </Text>
          ) : (
            order.pickupStops.map((stop, index) => (
              <View
                key={`${stop.sellerId}-${index}`}
                style={styles.stop}
              >
                <Text style={styles.itemName}>
                  {stop.sellerName}
                </Text>

                {stop.items.map((item, itemIndex) => (
                  <Text
                    key={`${item.productId}-${itemIndex}`}
                    style={styles.detail}
                  >
                    {item.productName} × {item.quantity}
                  </Text>
                ))}
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Order Summary</Text>

          <Row
            label="Subtotal"
            value={`₦${order.subtotal.toLocaleString()}`}
          />

          <Row
            label="Delivery Fee"
            value={`₦${order.deliveryFee.toLocaleString()}`}
          />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Order Total
            </Text>

            <Text style={styles.totalValue}>
              ₦{order.total.toLocaleString()}
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.button}
          onPress={() => router.replace("/orders")}
        >
          <Text style={styles.buttonText}>
            Back to My Orders
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f5f7f5",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f5f7f5",
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  back: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
  },

  orderId: {
    marginTop: 6,
    marginBottom: 16,
    color: "#666",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },

  section: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    gap: 12,
  },

  label: {
    flex: 1,
    color: "#666",
  },

  value: {
    flex: 1,
    textAlign: "right",
    fontWeight: "600",
  },

  detail: {
    marginBottom: 7,
    color: "#333",
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },

  flex: {
    flex: 1,
  },

  itemName: {
    fontWeight: "700",
  },

  itemTotal: {
    fontWeight: "800",
  },

  stop: {
    backgroundColor: "#f6f8f6",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },

  muted: {
    color: "#666",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },

  totalLabel: {
    fontSize: 17,
    fontWeight: "800",
  },

  totalValue: {
    fontSize: 20,
    fontWeight: "900",
  },

  button: {
    backgroundColor: "#111",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "800",
  },

  message: {
    textAlign: "center",
    color: "#666",
    marginTop: 10,
    marginBottom: 20,
  },
});
