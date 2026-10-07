import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getSellerById } from "../data/sellers";

import { useAuth } from "../context/AuthContext";
import { useOrders } from "../context/OrderContext";
import CustomerOrdersList from "../components/CustomerOrdersList";
import { getUserRoleEntity } from "../services/roleOnboardingService";

type OrderWithCustomerIdentity = {
  customerId?: string;
};

export default function OrdersScreen() {
  const { user } = useAuth();

  const {
    orders,
    isLoadingOrders,
  } = useOrders();

  const [linkedEntityId, setLinkedEntityId] =
    useState<string | null>(null);

  const [loadingLink, setLoadingLink] =
    useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }

    const currentUser = user;

    let active = true;

    async function loadRoleLink() {
      try {
        const link =
          await getUserRoleEntity(currentUser.id);

        if (active) {
          setLinkedEntityId(
            link?.entityId ?? null,
          );
        }
      } catch (error) {
        console.error(
          "ORDER ROLE LINK LOAD ERROR:",
          error,
        );
      } finally {
        if (active) {
          setLoadingLink(false);
        }
      }
    }

    void loadRoleLink();

    return () => {
      active = false;
    };
  }, [user]);

  const visibleOrders = useMemo(() => {
    if (!user) {
      return [];
    }

    if (user.role === "admin") {
      return orders;
    }

    if (user.role === "customer") {
      return orders.filter((order) => {
        const orderWithIdentity =
          order as typeof order &
            OrderWithCustomerIdentity;

        return (
          orderWithIdentity.customerId ===
          user.id
        );
      });
    }

    if (
      user.role === "seller" &&
      linkedEntityId
    ) {
      const linkedSeller =
        getSellerById(linkedEntityId);

      const linkedSellerName =
        linkedSeller?.name;

      return orders.filter((order) =>
        order.items.some(
          (item) =>
            item.sellerId === linkedEntityId ||
            item.sellerId === linkedSellerName ||
            item.sellerName === linkedSellerName,
        ),
      );
    }

    if (
      user.role === "rider" &&
      linkedEntityId
    ) {
      return orders.filter(
        (order) =>
          order.assignedRiderId ===
          linkedEntityId,
      );
    }

    return [];
  }, [
    orders,
    user,
    linkedEntityId,
  ]);

  // Customers see their real orders from the server (Firestore).
  if (user?.role === "customer") {
    return <CustomerOrdersList />;
  }

  if (
    isLoadingOrders ||
    loadingLink
  ) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading orders...
        </Text>
      </SafeAreaView>
    );
  }

  const pageTitle =
    user?.role === "seller"
      ? "Seller Orders"
      : user?.role === "rider"
      ? "Assigned Orders"
      : user?.role === "admin"
      ? "All Orders"
      : "My Orders";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.replace("/")}
          >
            <Text style={styles.backText}>
              ← Home
            </Text>
          </Pressable>

          <Text style={styles.title}>
            {pageTitle}
          </Text>

          <Text style={styles.subtitle}>
            {visibleOrders.length} order(s)
          </Text>
        </View>

        {visibleOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              📦
            </Text>

            <Text style={styles.emptyTitle}>
              No Orders Yet
            </Text>

            <Text style={styles.emptyText}>
              {user?.role === "rider"
                ? "No delivery orders are currently assigned to you."
                : user?.role === "seller"
                ? "No orders currently contain products from your seller profile."
                : "Your completed orders will appear here."}
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                router.replace("/")
              }
            >
              <Text
                style={styles.primaryButtonText}
              >
                Continue Shopping
              </Text>
            </Pressable>
          </View>
        ) : (
          visibleOrders.map((order) => (
            <Pressable
              key={order.orderId}
              disabled={
                user?.role !== "seller" &&
                user?.role !== "customer"
              }
              onPress={() => {
                if (user?.role === "seller") {
                  router.push({
                    pathname:
                      "/seller-order-details",
                    params: {
                      orderId:
                        order.orderId,
                    },
                  } as any)

                  return
                }

                if (user?.role === "customer") {
                  router.push({
                    pathname:
                      "/customer-order-details",
                    params: {
                      orderId:
                        order.orderId,
                    },
                  } as any)
                }
              }}
              style={styles.orderCard}
            >
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderId}>
                    {order.orderId}
                  </Text>

                  <Text style={styles.orderDate}>
                    {new Date(
                      order.createdAt,
                    ).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {order.status
                      .replace("_", " ")
                      .toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.label}>
                Customer
              </Text>

              <Text style={styles.value}>
                {order.customerName}
              </Text>

              <Text style={styles.label}>
                Items
              </Text>

              <Text style={styles.value}>
                {order.items.length} item(s)
              </Text>

              <Text style={styles.label}>
                Total
              </Text>

              <Text style={styles.total}>
                ₦{order.total.toLocaleString()}
              </Text>

              <Text style={styles.label}>
                Vehicle
              </Text>

              <Text style={styles.value}>
                {order.vehicle.toUpperCase()}
              </Text>

              {(user?.role === "rider" ||
                user?.role === "admin") &&
                order.status !==
                  "delivered" &&
                order.status !==
                  "cancelled" && (
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() =>
                      router.push({
                        pathname: "/rider",
                        params: {
                          orderId:
                            order.orderId,
                        },
                      } as any)
                    }
                  >
                    <Text
                      style={
                        styles.primaryButtonText
                      }
                    >
                      Open Delivery
                    </Text>
                  </Pressable>
                )}
            </Pressable>
          ))
        )}

        <View style={{ height: 30 }} />
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

        <Pressable>
          <Text style={styles.navIcon}>
            📦
          </Text>

          <Text style={styles.navText}>
            Orders
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/wallet")}
        >
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

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
  },

  header: {
    marginBottom: 20,
  },

  backText: {
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
  },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },

  emptyIcon: {
    fontSize: 50,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
  },

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

  orderId: {
    fontSize: 16,
    fontWeight: "800",
  },

  orderDate: {
    color: "#777",
    fontSize: 11,
    marginTop: 4,
  },

  statusBadge: {
    backgroundColor: "#222",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 14,
  },

  label: {
    fontSize: 12,
    color: "#777",
    fontWeight: "700",
    marginTop: 8,
  },

  value: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 3,
  },

  total: {
    fontSize: 21,
    fontWeight: "900",
    marginTop: 3,
  },

  primaryButton: {
    marginTop: 16,
    width: "100%",
    backgroundColor: "#222",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
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



