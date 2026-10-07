import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import { useEffect, useMemo, useState } from "react";

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

import {
  getUserRoleEntity,
} from "../services/roleOnboardingService";



import {
  getSellerById,
} from "../data/sellers";

export default function SellerOrderDetailsScreen() {
  const router = useRouter();

  const {
    orderId,
  } = useLocalSearchParams<{
    orderId?: string;
  }>();

  const {
    user,
  } = useAuth();

  const {
    orders,
    isLoadingOrders,
  } = useOrders();

  const [
    linkedEntityId,
    setLinkedEntityId,
  ] = useState<string | null>(null);

  const [
    loadingLink,
    setLoadingLink,
  ] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSellerLink() {
      if (!user) {
        if (active) {
          setLoadingLink(false);
        }
        return;
      }

      try {
        const link =
          await getUserRoleEntity(user.id);

        if (active) {
          setLinkedEntityId(
            link?.entityId ?? null
          );
        }
      } catch (error) {
        console.error(
          "SELLER DETAILS LINK LOAD ERROR:",
          error
        );

        if (active) {
          setLinkedEntityId(null);
        }
      } finally {
        if (active) {
          setLoadingLink(false);
        }
      }
    }

    loadSellerLink();

    return () => {
      active = false;
    };
  }, [user]);

  const order = useMemo(() => {
    if (!orderId) {
      return undefined;
    }

    return orders.find(
      (item) =>
        item.orderId === orderId
    );
  }, [orders, orderId]);

  const linkedSeller = useMemo(() => {
    if (!linkedEntityId) {
      return undefined;
    }

    return getSellerById(
      linkedEntityId
    );
  }, [linkedEntityId]);

  const sellerName =
    linkedSeller?.name;

  const sellerItems = useMemo(() => {
    if (!order) {
      return [];
    }

    if (!linkedEntityId) {
      return [];
    }

    return order.items.filter(
      (item) =>
        item.sellerId ===
          linkedEntityId ||
        item.sellerId ===
          sellerName ||
        item.sellerName ===
          sellerName
    );
  }, [
    order,
    linkedEntityId,
    sellerName,
  ]);

  const sellerItemsTotal =
    sellerItems.reduce(
      (sum, item) =>
        sum +
        item.quantity *
          item.unitPrice,
      0
    );

  if (
    isLoadingOrders ||
    loadingLink
  ) {
    return (
      <SafeAreaView
        style={styles.safe}
      >
        <View style={styles.center}>
          <Text style={styles.loading}>
            Loading order...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView
        style={styles.safe}
      >
        <View style={styles.center}>
          <Text
            style={styles.title}
          >
            Order Not Found
          </Text>

          <Text
            style={styles.message}
          >
            This order could not be
            found in your seller
            orders.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              router.replace(
                "/orders"
              )
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Back to Seller Orders
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (
    user?.role !== "seller" ||
    !linkedEntityId ||
    sellerItems.length === 0
  ) {
    return (
      <SafeAreaView
        style={styles.safe}
      >
        <View style={styles.center}>
          <Text
            style={styles.title}
          >
            Order Access
          </Text>

          <Text
            style={styles.message}
          >
            This order does not
            contain products from
            your seller profile.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              router.replace(
                "/orders"
              )
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Back to Seller Orders
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safe}
    >
      <ScrollView
        contentContainerStyle={
          styles.container
        }
      >
        <Pressable
          onPress={() =>
            router.replace(
              "/orders"
            )
          }
          style={styles.backButton}
        >
          <Text style={styles.backText}>
            Back to Seller Orders
          </Text>
        </Pressable>

        <Text style={styles.title}>
          Seller Order Details
        </Text>

        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View
              style={styles.headerText}
            >
              <Text
                style={styles.orderId}
              >
                {order.orderId}
              </Text>

              <Text
                style={styles.date}
              >
                {new Date(
                  order.createdAt
                ).toLocaleString()}
              </Text>
            </View>

            <Text
              style={[
                styles.status,
                order.status ===
                  "delivered" &&
                  styles.statusDelivered,
              ]}
            >
              {order.status
                .replace(
                  "_",
                  " "
                )
                .toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text
            style={styles.sectionTitle}
          >
            Customer
          </Text>

          <Text style={styles.label}>
            Name
          </Text>

          <Text style={styles.value}>
            {order.customerName}
          </Text>

          <Text style={styles.label}>
            Phone
          </Text>

          <Text style={styles.value}>
            {order.phone}
          </Text>

          <Text style={styles.label}>
            Address
          </Text>

          <Text style={styles.value}>
            {order.address}
          </Text>
        </View>

        <View style={styles.card}>
          <Text
            style={styles.sectionTitle}
          >
            Your Items
          </Text>

          {sellerItems.map(
            (item) => (
              <View
                key={
                  item.productId
                }
                style={styles.itemRow}
              >
                <View
                  style={
                    styles.itemText
                  }
                >
                  <Text
                    style={
                      styles.itemName
                    }
                  >
                    {item.productName}
                  </Text>

                  <Text
                    style={
                      styles.itemMeta
                    }
                  >
                    Qty {item.quantity}
                    {" x "}
                    NGN
                    {item.unitPrice.toLocaleString()}
                  </Text>
                </View>

                <Text
                  style={styles.itemTotal}
                >
                  NGN
                  {(
                    item.quantity *
                    item.unitPrice
                  ).toLocaleString()}
                </Text>
              </View>
            )
          )}

          <View
            style={styles.totalRow}
          >
            <Text
              style={styles.totalLabel}
            >
              Your Items Total
            </Text>

            <Text
              style={styles.totalValue}
            >
              NGN
              {sellerItemsTotal.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text
            style={styles.sectionTitle}
          >
            Order Summary
          </Text>

          <Text style={styles.label}>
            Subtotal
          </Text>

          <Text style={styles.value}>
            NGN
            {order.subtotal.toLocaleString()}
          </Text>

          <Text style={styles.label}>
            Delivery Fee
          </Text>

          <Text style={styles.value}>
            NGN
            {order.deliveryFee.toLocaleString()}
          </Text>

          <Text style={styles.label}>
            Order Total
          </Text>

          <Text
            style={styles.orderTotal}
          >
            NGN
            {order.total.toLocaleString()}
          </Text>

          <Text style={styles.label}>
            Vehicle
          </Text>

          <Text style={styles.value}>
            {order.vehicle.toUpperCase()}
          </Text>

          <Text style={styles.label}>
            Distance
          </Text>

          <Text style={styles.value}>
            {order.distanceKm.toFixed(2)}
            {" km"}
          </Text>
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            router.replace(
              "/orders"
            )
          }
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            Back to Seller Orders
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },

  container: {
    padding: 16,
    gap: 12,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loading: {
    fontSize: 16,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
  },

  backText: {
    fontSize: 15,
    fontWeight: "600",
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },

  message: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e3e7eb",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  headerText: {
    flex: 1,
  },

  orderId: {
    fontSize: 19,
    fontWeight: "700",
  },

  date: {
    fontSize: 13,
    marginTop: 4,
  },

  status: {
    fontSize: 13,
    fontWeight: "700",
  },

  statusDelivered: {
    fontWeight: "800",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },

  value: {
    fontSize: 16,
    lineHeight: 22,
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e7eaee",
  },

  itemText: {
    flex: 1,
  },

  itemName: {
    fontSize: 16,
    fontWeight: "600",
  },

  itemMeta: {
    fontSize: 13,
    marginTop: 3,
  },

  itemTotal: {
    fontSize: 15,
    fontWeight: "700",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
  },

  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
  },

  totalValue: {
    fontSize: 17,
    fontWeight: "700",
  },

  orderTotal: {
    fontSize: 20,
    fontWeight: "800",
  },

  primaryButton: {
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: "center",
    marginTop: 4,
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});



