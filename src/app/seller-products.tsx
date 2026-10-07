import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
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
import { getSellerById } from "../data/sellers";
import { getProductsBySellerWithOverrides } from "../services/productStorage";

const ROLE_LINKS_STORAGE_KEY =
  "@communitymarket/role-links";

type StoredRoleLink = {
  userId?: string;
  role?: string;
  entityId?: string;
};

function findSellerId(
  storedValue: unknown,
  userId: string
): string | null {
  if (!storedValue) {
    return null;
  }

  if (Array.isArray(storedValue)) {
    const link = storedValue.find(
      (item: StoredRoleLink) =>
        item?.userId === userId &&
        item?.role === "seller" &&
        typeof item?.entityId === "string"
    );

    return link?.entityId ?? null;
  }

  if (
    typeof storedValue === "object" &&
    storedValue !== null
  ) {
    const value = storedValue as Record<
      string,
      unknown
    >;

    if (
      value.userId === userId &&
      value.role === "seller" &&
      typeof value.entityId === "string"
    ) {
      return value.entityId;
    }

    const directLink = value[userId];

    if (
      typeof directLink === "object" &&
      directLink !== null
    ) {
      const link =
        directLink as StoredRoleLink;

      if (
        link.role === "seller" &&
        typeof link.entityId === "string"
      ) {
        return link.entityId;
      }
    }

    if (Array.isArray(value.links)) {
      const link = value.links.find(
        (item: StoredRoleLink) =>
          item?.userId === userId &&
          item?.role === "seller" &&
          typeof item?.entityId === "string"
      );

      return link?.entityId ?? null;
    }
  }

  return null;
}

export default function SellerProductsScreen() {
  const { user } = useAuth();

  const [linkedSellerId, setLinkedSellerId] =
    useState<string | null>(null);

  const [loadingLink, setLoadingLink] =
    useState(true);

  const [products, setProducts] =
    useState<any[]>([]);

  const [loadingProducts, setLoadingProducts] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function loadSellerLink() {
      if (!user || user.role !== "seller") {
        if (active) {
          setLoadingLink(false);
        }
        return;
      }

      try {
        const storedValue =
          await AsyncStorage.getItem(
            ROLE_LINKS_STORAGE_KEY
          );

        const parsedValue = storedValue
          ? JSON.parse(storedValue)
          : null;

        const sellerId = findSellerId(
          parsedValue,
          user.id
        );

        console.log(
          "SELLER PRODUCT LINK:",
          sellerId
        );

        if (active) {
          setLinkedSellerId(sellerId);
        }
      } catch (error) {
        console.error(
          "SELLER PRODUCT LINK ERROR:",
          error
        );

        if (active) {
          setLinkedSellerId(null);
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

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      if (!linkedSellerId) {
        if (active) {
          setProducts([]);
        }
        return;
      }

      try {
        setLoadingProducts(true);

        const sellerProducts =
          await getProductsBySellerWithOverrides(
            linkedSellerId
          );

        if (active) {
          setProducts(sellerProducts);
        }
      } catch (error) {
        console.error(
          "SELLER PRODUCTS LOAD ERROR:",
          error
        );

        if (active) {
          setProducts([]);
        }
      } finally {
        if (active) {
          setLoadingProducts(false);
        }
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, [linkedSellerId]);

  const seller = useMemo(() => {
    if (!linkedSellerId) {
      return undefined;
    }

    return getSellerById(linkedSellerId);
  }, [linkedSellerId]);

  if (!user || user.role !== "seller") {
    return null;
  }

  if (loadingLink || loadingProducts) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.loadingText}>
          Loading your products...
        </Text>
      </SafeAreaView>
    );
  }

  if (!linkedSellerId || !seller) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorTitle}>
          Seller profile not linked
        </Text>

        <Text style={styles.errorText}>
          Your seller account is not linked to a seller
          profile yet.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            router.replace("/")
          }
        >
          <Text style={styles.primaryButtonText}>
            Back to Home
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Pressable
          style={styles.backButton}
          onPress={() =>
            router.replace("/")
          }
        >
          <Text style={styles.backButtonText}>
            ← Seller Dashboard
          </Text>
        </Pressable>

        <View style={styles.headerCard}>
          <Text style={styles.title}>
            My Products
          </Text>

          <Text style={styles.sellerName}>
            {seller.name}
          </Text>

          <Text style={styles.sellerId}>
            Seller ID: {seller.id}
          </Text>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {seller.isActive
                ? "ACTIVE"
                : "INACTIVE"}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>
            {products.length}
          </Text>

          <Text style={styles.summaryLabel}>
            Product(s)
          </Text>
        </View>

        {products.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              No products yet
            </Text>

            <Text style={styles.emptyText}>
              Your seller profile currently has no
              products in the catalog.
            </Text>
          </View>
        ) : (
          products.map((product) => (
            <Pressable
              key={product.id}
              style={({ pressed }) => [
                styles.productCard,
                pressed && styles.productCardPressed,
              ]}
              onPress={() =>
                router.push({
                  pathname:
                    "/seller-product-edit",
                  params: {
                    productId:
                      product.id,
                  },
                })
              }
            >
              <View style={styles.productTop}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>
                    {product.name}
                  </Text>

                  <Text style={styles.productCategory}>
                    {product.category}
                  </Text>
                </View>

                <View
                  style={[
                    styles.productStatus,
                    product.isActive
                      ? styles.activeStatus
                      : styles.inactiveStatus,
                  ]}
                >
                  <Text style={styles.productStatusText}>
                    {product.isActive
                      ? "ACTIVE"
                      : "INACTIVE"}
                  </Text>
                </View>
              </View>

              <Text style={styles.description}>
                {product.description}
              </Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Price
                </Text>

                <Text style={styles.detailValue}>
                  NGN
                  {product.price.toLocaleString()}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Stock
                </Text>

                <Text style={styles.detailValue}>
                  {product.stock}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Product ID
                </Text>

                <Text style={styles.detailValue}>
                  {product.id}
                </Text>
              </View>

              <Text style={styles.editHint}>
                Tap to edit
              </Text>
            </Pressable>
          ))
        )}

        <Pressable
          style={styles.ordersButton}
          onPress={() =>
            router.push("/orders")
          }
        >
          <Text style={styles.ordersButtonText}>
            View Seller Orders
          </Text>
        </Pressable>

        <Pressable
          style={styles.bottomBackButton}
          onPress={() =>
            router.replace("/")
          }
        >
          <Text style={styles.bottomBackText}>
            Back to Seller Dashboard
          </Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f5f6f8",
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f5f6f8",
  },

  content: {
    padding: 20,
  },

  backButton: {
    marginBottom: 14,
  },

  backButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },

  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
  },

  sellerName: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "700",
  },

  sellerId: {
    marginTop: 4,
    color: "#777",
    fontSize: 13,
  },

  statusBadge: {
    alignSelf: "flex-start",
    marginTop: 12,
    backgroundColor: "#222",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },

  statusText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },

  summaryCard: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },

  summaryNumber: {
    fontSize: 30,
    fontWeight: "800",
  },

  summaryLabel: {
    marginTop: 4,
    color: "#777",
  },

  productCard: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
  },

  productCardPressed: {
    opacity: 0.7,
  },

  productTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  productInfo: {
    flex: 1,
    paddingRight: 10,
  },

  productName: {
    fontSize: 18,
    fontWeight: "800",
  },

  productCategory: {
    marginTop: 4,
    color: "#777",
  },

  productStatus: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  activeStatus: {
    backgroundColor: "#e8f5e9",
  },

  inactiveStatus: {
    backgroundColor: "#eeeeee",
  },

  productStatusText: {
    fontSize: 10,
    fontWeight: "800",
  },

  description: {
    marginTop: 12,
    color: "#555",
    lineHeight: 20,
  },

  detailRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  detailLabel: {
    color: "#777",
  },

  detailValue: {
    fontWeight: "700",
  },

  editHint: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },

  emptyCard: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
  },

  emptyText: {
    marginTop: 8,
    color: "#666",
    lineHeight: 20,
  },

  ordersButton: {
    marginTop: 20,
    backgroundColor: "#222",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },

  ordersButtonText: {
    color: "#fff",
    fontWeight: "700",
  },

  bottomBackButton: {
    marginTop: 12,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  bottomBackText: {
    fontWeight: "700",
  },

  primaryButton: {
    marginTop: 20,
    backgroundColor: "#222",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 10,
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },

  loadingText: {
    color: "#555",
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
  },

  errorText: {
    marginTop: 8,
    color: "#666",
    textAlign: "center",
  },
});