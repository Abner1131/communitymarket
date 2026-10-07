import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    router,
    useLocalSearchParams,
} from "expo-router";

import { useOrders } from "../context/OrderContext";

export default function OrderConfirmationScreen() {
  const {
    orderId,
  } =
    useLocalSearchParams<{
      orderId?: string | string[];
    }>();

  const { getOrderById } =
    useOrders();

  const normalizedOrderId =
    Array.isArray(orderId)
      ? orderId[0]
      : orderId;

  const order =
    normalizedOrderId
      ? getOrderById(
          normalizedOrderId
        )
      : undefined;

  if (!order) {
    return (
      <View
        style={styles.errorContainer}
      >
        <Text
          style={styles.errorEmoji}
        >
          ⚠️
        </Text>

        <Text
          style={styles.errorTitle}
        >
          Order not found
        </Text>

        <Text
          style={styles.errorText}
        >
          We could not load this order.
        </Text>

        <Pressable
          style={styles.button}
          onPress={() =>
            router.replace("/")
          }
        >
          <Text
            style={styles.buttonText}
          >
            Back to Marketplace
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text
          style={styles.successIcon}
        >
          ✓
        </Text>

        <Text
          style={styles.successTitle}
        >
          Order Confirmed!
        </Text>

        <Text
          style={styles.successText}
        >
          Your CommunityMarket order has
          been successfully created.
        </Text>

        <View
          style={styles.orderCard}
        >
          <Text
            style={styles.orderLabel}
          >
            Order ID
          </Text>

          <Text
            style={styles.orderId}
          >
            {order.orderId}
          </Text>

          <View
            style={styles.divider}
          />

          <View
            style={styles.row}
          >
            <Text
              style={styles.label}
            >
              Items
            </Text>

            <Text
              style={styles.value}
            >
              {order.items.reduce(
                (total, item) =>
                  total +
                  item.quantity,
                0
              )}
            </Text>
          </View>

          <View
            style={styles.row}
          >
            <Text
              style={styles.label}
            >
              Sellers
            </Text>

            <Text
              style={styles.value}
            >
              {order.pickupStops.length}
            </Text>
          </View>

          <View
            style={styles.row}
          >
            <Text
              style={styles.label}
            >
              Delivery
            </Text>

            <Text
              style={styles.value}
            >
              {order.distanceKm.toFixed(
                1
              )}{" "}
              km
            </Text>
          </View>

          <View
            style={styles.row}
          >
            <Text
              style={styles.label}
            >
              Payment
            </Text>

            <Text
              style={styles.paid}
            >
              ✓ Confirmed
            </Text>
          </View>

          <View
            style={styles.divider}
          />

          <View
            style={styles.totalRow}
          >
            <Text
              style={styles.totalLabel}
            >
              Total
            </Text>

            <Text
              style={styles.total}
            >
              ₦
              {order.total.toLocaleString()}
            </Text>
          </View>
        </View>

        <View
          style={styles.statusCard}
        >
          <Text
            style={styles.statusTitle}
          >
            🚚 Preparing for Dispatch
          </Text>

          <Text
            style={styles.statusText}
          >
            CommunityMarket will now look
            for an available rider for your
            order.
          </Text>
        </View>

        <Pressable
          style={styles.trackButton}
          onPress={() =>
            router.replace({
              pathname: "/delivery",
              params: {
                orderId:
                  order.orderId,
              },
            })
          }
        >
          <Text
            style={styles.trackButtonText}
          >
            🚚 Track My Order
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() =>
            router.replace("/")
          }
        >
          <Text
            style={
              styles.secondaryButtonText
            }
          >
            Continue Shopping
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f5f7",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },

  successIcon: {
    alignSelf: "center",
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#2e7d32",
    color: "#fff",
    textAlign: "center",
    lineHeight: 76,
    fontSize: 45,
    fontWeight: "900",
    overflow: "hidden",
  },

  successTitle: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 18,
  },

  successText: {
    textAlign: "center",
    color: "#666",
    marginTop: 8,
    lineHeight: 20,
  },

  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 17,
    padding: 20,
    marginTop: 25,
  },

  orderLabel: {
    textAlign: "center",
    color: "#777",
    fontSize: 12,
    fontWeight: "700",
  },

  orderId: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 5,
  },

  divider: {
    height: 1,
    backgroundColor: "#e5e5e5",
    marginVertical: 14,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
  },

  label: {
    color: "#666",
  },

  value: {
    fontWeight: "800",
  },

  paid: {
    color: "#2e7d32",
    fontWeight: "800",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  totalLabel: {
    fontSize: 18,
    fontWeight: "800",
  },

  total: {
    fontSize: 24,
    fontWeight: "900",
  },

  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 17,
    marginTop: 14,
  },

  statusTitle: {
    fontSize: 16,
    fontWeight: "800",
  },

  statusText: {
    color: "#666",
    lineHeight: 19,
    marginTop: 5,
  },

  trackButton: {
    backgroundColor: "#111",
    borderRadius: 13,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 18,
  },

  trackButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
  },

  secondaryButtonText: {
    fontWeight: "800",
  },

  errorContainer: {
    flex: 1,
    backgroundColor: "#f4f5f7",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  errorEmoji: {
    fontSize: 55,
  },

  errorTitle: {
    fontSize: 23,
    fontWeight: "800",
    marginTop: 15,
  },

  errorText: {
    color: "#666",
    marginVertical: 12,
  },

  button: {
    backgroundColor: "#111",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "800",
  },
});