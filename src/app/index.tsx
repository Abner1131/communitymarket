
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import PoweredByGreenFusion from "../components/PoweredByGreenFusion";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { products } from "../data/products";
import { emojiFor, subscribeCatalog } from "../lib/catalog";
const categories = [
  "All",
  "Groceries",
  "Phones",
  "Electronics",
  "Fashion",
  "Household",
  "Agriculture",
  "Beauty",
  "Food",
  "Health",
  "Other",
];

/*
 * ASCII-safe symbol definitions.
 * Unicode is represented by escape sequences so
 * the source file itself cannot become mojibake.
 */
const UI = {
  bullet: "\u2022",
  naira: "\u20A6",

  cart: "\u{1F6D2}",
  person: "\u{1F464}",
  products: "\u{1F4E6}",
  wallet: "\u{1F4B0}",
  card: "\u{1F4B3}",
  shop: "\u{1F3EA}",
  delivery: "\u{1F69A}",
  search: "\u{1F50D}",

  rice: "\u{1F35A}",
  cookingOil: "\u{1F6E2}\uFE0F",
  phone: "\u{1F4F1}",
  earbuds: "\u{1F3A7}",
  detergent: "\u{1F9F4}",
  sneakers: "\u{1F45F}",
  maize: "\u{1F33D}",
  lotion: "\u{1F9F4}",

  home: "\u2302",
  back: "\u2190",
  forward: "\u203A",
  withdraw: "\u2197",
} as const;

/*
 * Existing products.ts does not contain isActive.
 * This local type adds the marketplace status without
 * changing your existing products.ts structure.
 */
type MarketplaceProduct =
  (typeof products)[number] & {
    isActive: boolean;
  };

/*
 * Product emojis are defined safely here instead of
 * relying on the currently corrupted emoji values in
 * src/data/products.ts.
 */
const productEmojiById: Record<
  string,
  string
> = {
  "1": UI.rice,
  "2": UI.cookingOil,
  "3": UI.phone,
  "4": UI.earbuds,
  "5": UI.detergent,
  "6": UI.sneakers,
  "7": UI.maize,
  "8": UI.lotion,
};

export default function HomeScreen() {
  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [search, setSearch] =
    useState("");

  const [marketProducts, setMarketProducts] =
    useState<MarketplaceProduct[]>([]);

  const {
    cartCount,
    cartTotal,
    addToCart,
  } = useCart();

  const { user } =
    useAuth();

  /*
   * Live catalogue from the database: every customer sees the same
   * products, and sellers' changes appear instantly.
   */
  const [catalogLoaded, setCatalogLoaded] =
    useState(false);
  const [catalogError, setCatalogError] =
    useState("");

  useEffect(() => {
    return subscribeCatalog(
      (liveProducts) => {
        setMarketProducts(liveProducts);
        setCatalogLoaded(true);
        setCatalogError("");
      },
      (error) => {
        console.error("CATALOG LOAD ERROR:", error);
        setCatalogLoaded(true);
        setCatalogError("Could not load products. Check your internet connection.");
      },
    );
  }, []);

  /*
   * Only active products with stock available
   * are shown to customers.
   */
  const filteredProducts =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return marketProducts.filter(
        (product) => {
          if (
            product.isActive ===
              false ||
            product.stock <= 0
          ) {
            return false;
          }

          const matchesCategory =
            selectedCategory ===
              "All" ||
            product.category ===
              selectedCategory;

          const matchesSearch =
            product.name
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            product.category
              .toLowerCase()
              .includes(
                normalizedSearch
              );

          return (
            matchesCategory &&
            matchesSearch
          );
        }
      );
    }, [
      marketProducts,
      selectedCategory,
      search,
    ]);

  const canAccessDelivery =
    user?.role === "rider" ||
    user?.role === "admin";

  const isSeller =
    user?.role === "seller";

  const isCustomer =
    user?.role === "customer";

  return (
    <View
      style={styles.container}
    >
      {/* HEADER */}
      <View
        style={styles.header}
      >
        <View
          style={styles.headerLeft}
        >
          <Text
            style={styles.logo}
          >
            CommunityMarket
          </Text>

          <Text
            style={styles.subtitle}
          >
            Buy {UI.bullet} Sell{" "}
            {UI.bullet} Connect{" "}
            {UI.bullet} Grow
          </Text>

          {user && (
            <Text
              style={
                styles.welcomeText
              }
            >
              Welcome, {user.name}
            </Text>
          )}
        </View>

        <View
          style={
            styles.headerActions
          }
        >
          <Pressable
            style={
              styles.cartBadge
            }
            onPress={() =>
              router.push("/cart")
            }
          >
            <Text
              style={
                styles.cartBadgeText
              }
            >
              {UI.cart} {cartCount}
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.accountButton
            }
            onPress={() =>
              router.push(
                "/account"
              )
            }
          >
            <Text
              style={
                styles.accountButtonText
              }
            >
              {UI.person}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {/* ACCOUNT INFO */}
        {user && (
          <View
            style={
              styles.accountBar
            }
          >
            <View>
              <Text
                style={
                  styles.accountName
                }
              >
                {user.name}
              </Text>

              <Text
                style={
                  styles.accountPhone
                }
              >
                {user.phone}
              </Text>
            </View>

            <View
              style={
                styles.roleBadge
              }
            >
              <Text
                style={
                  styles.roleBadgeText
                }
              >
                {user.role.toUpperCase()}
              </Text>
            </View>
          </View>
        )}

        {/* SEARCH */}
        <TextInput
          style={styles.search}
          placeholder={`${UI.search} Search products...`}
          value={search}
          onChangeText={
            setSearch
          }
        />

        {/* RIDER / DELIVERY */}
        {canAccessDelivery && (
          <Pressable
            style={
              styles.riderButton
            }
            onPress={() =>
              router.push(
                "/rider" as any
              )
            }
          >
            <Text
              style={styles.riderIcon}
            >
              {UI.delivery}
            </Text>

            <View
              style={styles.riderInfo}
            >
              <Text
                style={styles.riderTitle}
              >
                Rider / Delivery
              </Text>

              <Text
                style={
                  styles.riderSubtitle
                }
              >
                Open the delivery
                dashboard
              </Text>
            </View>

            <Text
              style={styles.riderArrow}
            >
              {UI.forward}
            </Text>
          </Pressable>
        )}

        {/* SELLER DASHBOARD */}
        {isSeller && (
          <>
            <Pressable
              style={
                styles.roleActionCard
              }
              onPress={() =>
                router.push(
                  "/account"
                )
              }
            >
              <Text
                style={
                  styles.roleActionIcon
                }
              >
                {UI.shop}
              </Text>

              <View
                style={
                  styles.roleActionInfo
                }
              >
                <Text
                  style={
                    styles.roleActionTitle
                  }
                >
                  Seller Dashboard
                </Text>

                <Text
                  style={
                    styles.roleActionSubtitle
                  }
                >
                  Manage your seller
                  profile and account
                </Text>
              </View>

              <Text
                style={
                  styles.roleActionArrow
                }
              >
                {UI.forward}
              </Text>
            </Pressable>

            <Pressable
              style={
                styles.roleActionCard
              }
              onPress={() =>
                router.push(
                  "/seller" as any
                )
              }
            >
              <Text
                style={
                  styles.roleActionIcon
                }
              >
                {UI.products}
              </Text>

              <View
                style={
                  styles.roleActionInfo
                }
              >
                <Text
                  style={
                    styles.roleActionTitle
                  }
                >
                  My Products
                </Text>

                <Text
                  style={
                    styles.roleActionSubtitle
                  }
                >
                  View your catalog
                  products, prices
                  and stock
                </Text>
              </View>

              <Text
                style={
                  styles.roleActionArrow
                }
              >
                {UI.forward}
              </Text>
            </Pressable>
          </>
        )}

        {/* WALLET */}
        <Pressable
          style={styles.wallet}
          onPress={() =>
            router.push(
              "/wallet"
            )
          }
        >
          <Text
            style={styles.walletLabel}
          >
            Wallet Balance
          </Text>

          <Text
            style={styles.walletAmount}
          >
            {UI.naira}0.00
          </Text>

          <View
            style={
              styles.walletButtons
            }
          >
            <View
              style={
                styles.walletButton
              }
            >
              <Text>
                {UI.card} Pay
              </Text>
            </View>

            <View
              style={
                styles.walletButton
              }
            >
              <Text>
                {UI.wallet} Receive
              </Text>
            </View>

            <View
              style={
                styles.walletButton
              }
            >
              <Text>
                {UI.withdraw} Withdraw
              </Text>
            </View>
          </View>
        </Pressable>

        {/* CATEGORIES */}
        <Text
          style={styles.title}
        >
          Categories
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          style={
            styles.categoryScroll
          }
        >
          {categories.map(
            (category) => (
              <Pressable
                key={category}
                onPress={() =>
                  setSelectedCategory(
                    category
                  )
                }
                style={[
                  styles.categoryButton,
                  selectedCategory ===
                    category &&
                    styles.categoryButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory ===
                      category &&
                      styles.categoryTextActive,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            )
          )}
        </ScrollView>

        {/* PRODUCTS HEADER */}
        <View
          style={
            styles.productHeader
          }
        >
          <Text style={styles.title}>
            {selectedCategory ===
            "All"
              ? "Popular Products"
              : selectedCategory}
          </Text>

          <Text
            style={
              styles.productCount
            }
          >
            {filteredProducts.length}{" "}
            items
          </Text>
        </View>

        {/* PRODUCTS */}
        <View
          style={styles.products}
        >
          {!catalogLoaded ? (
            <Text style={{ color: "#777", padding: 12 }}>
              Loading products...
            </Text>
          ) : catalogError ? (
            <Text style={{ color: "#b00020", padding: 12 }}>
              {catalogError}
            </Text>
          ) : filteredProducts.length === 0 ? (
            <Text style={{ color: "#777", padding: 12 }}>
              No products found.
            </Text>
          ) : null}

          {filteredProducts.map(
            (product) => (
              <View
                key={product.id}
                style={
                  styles.productCard
                }
              >
                <Text
                  style={
                    styles.productEmoji
                  }
                >
                  {emojiFor(
                    String(product.id),
                    product.category
                  )}
                </Text>

                <Text
                  style={
                    styles.productName
                  }
                >
                  {product.name}
                </Text>

                <Text
                  style={styles.seller}
                >
                  {product.seller}
                </Text>

                <Text
                  style={
                    styles.productPrice
                  }
                >
                  {UI.naira}
                  {product.price.toLocaleString()}
                </Text>

                <Text
                  style={
                    styles.productStock
                  }
                >
                  {product.stock}{" "}
                  in stock
                </Text>

                <Pressable
                  style={[
                    styles.addButton,
                    product.stock <=
                      0 &&
                      styles.addButtonDisabled,
                  ]}
                  onPress={() => {
                    if (
                      product.stock <=
                      0
                    ) {
                      return;
                    }

                    addToCart(
                      product
                    );
                  }}
                  disabled={
                    product.stock <=
                    0
                  }
                >
                  <Text
                    style={
                      styles.addButtonText
                    }
                  >
                    {product.stock >
                    0
                      ? "+ Add to Cart"
                      : "Out of Stock"}
                  </Text>
                </Pressable>
              </View>
            )
          )}
        </View>

        {/* CART SUMMARY */}
        {cartCount > 0 && (
          <View
            style={
              styles.cartSummary
            }
          >
            <Text
              style={
                styles.cartTitle
              }
            >
              {UI.cart} Your Cart
            </Text>

            <Text>
              {cartCount} item(s)
            </Text>

            <Text
              style={
                styles.cartTotal
              }
            >
              {UI.naira}
              {cartTotal.toLocaleString()}
            </Text>

            <Pressable
              style={
                styles.checkoutButton
              }
              onPress={() =>
                router.push(
                  "/checkout"
                )
              }
            >
              <Text
                style={
                  styles.checkoutText
                }
              >
                Review & Checkout
              </Text>
            </Pressable>
          </View>
        )}

        {/* SELLER CTA FOR CUSTOMERS */}
        {isCustomer && (
          <View
            style={
              styles.sellerBox
            }
          >
            <Text
              style={
                styles.sellerTitle
              }
            >
              {UI.shop} Sell on
              CommunityMarket
            </Text>

            <Text
              style={
                styles.sellerDescription
              }
            >
              List your products and
              reach customers in your
              community.
            </Text>

            <Pressable
              style={
                styles.sellerButton
              }
              onPress={() =>
                router.push(
                  "/account"
                )
              }
            >
              <Text
                style={
                  styles.sellerButtonText
                }
              >
                Become a Seller
              </Text>
            </Pressable>
          </View>
        )}

        <PoweredByGreenFusion />

<View
  style={{ height: 80 }}
/>
      </ScrollView>

      {/* BOTTOM NAVIGATION */}
      <View
        style={styles.bottomNav}
      >
        <Pressable
          onPress={() =>
            router.replace("/")
          }
        >
          <Text
            style={styles.navIcon}
          >
            {UI.home}
          </Text>

          <Text
            style={styles.navText}
          >
            Home
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            router.push("/cart")
          }
        >
          <Text
            style={styles.navIcon}
          >
            {UI.cart}
          </Text>

          <Text
            style={styles.navText}
          >
            Cart
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            router.push("/orders")
          }
        >
          <Text
            style={styles.navIcon}
          >
            {UI.products}
          </Text>

          <Text
            style={styles.navText}
          >
            Orders
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            router.push("/wallet")
          }
        >
          <Text
            style={styles.navIcon}
          >
            {UI.wallet}
          </Text>

          <Text
            style={styles.navText}
          >
            Wallet
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            router.push("/account")
          }
        >
          <Text
            style={styles.navIcon}
          >
            {UI.person}
          </Text>

          <Text
            style={styles.navText}
          >
            Account
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6f8",
  },

  scrollContent: {
    paddingBottom: 20,
  },

  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  logo: {
    fontSize: 24,
    fontWeight: "800",
  },

  subtitle: {
    color: "#666",
    marginTop: 4,
  },

  welcomeText: {
    color: "#444",
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
  },

  cartBadge: {
    backgroundColor: "#eeeeee",
    padding: 10,
    borderRadius: 20,
  },

  cartBadgeText: {
    fontWeight: "700",
  },

  accountButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eeeeee",
    alignItems: "center",
    justifyContent: "center",
  },

  accountButtonText: {
    fontSize: 18,
  },

  accountBar: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  accountName: {
    fontSize: 17,
    fontWeight: "800",
  },

  accountPhone: {
    marginTop: 4,
    fontSize: 13,
    color: "#777",
  },

  roleBadge: {
    backgroundColor: "#222",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },

  roleBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },

  search: {
    margin: 20,
    marginBottom: 12,
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },

  riderButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },

  riderIcon: {
    fontSize: 34,
    marginRight: 12,
  },

  riderInfo: {
    flex: 1,
  },

  riderTitle: {
    fontSize: 17,
    fontWeight: "800",
  },

  riderSubtitle: {
    marginTop: 4,
    color: "#777",
    fontSize: 12,
  },

  riderArrow: {
    fontSize: 32,
    color: "#2e7d32",
    marginLeft: 8,
  },

  roleActionCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },

  roleActionIcon: {
    fontSize: 32,
    marginRight: 12,
  },

  roleActionInfo: {
    flex: 1,
  },

  roleActionTitle: {
    fontSize: 17,
    fontWeight: "800",
  },

  roleActionSubtitle: {
    marginTop: 4,
    color: "#777",
    fontSize: 12,
  },

  roleActionArrow: {
    fontSize: 32,
    color: "#2e7d32",
  },

  wallet: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#222",
  },

  walletLabel: {
    color: "#aaa",
  },

  walletAmount: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 5,
  },

  walletButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },

  walletButton: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    marginLeft: 20,
    marginTop: 25,
    marginBottom: 12,
  },

  categoryScroll: {
    paddingLeft: 15,
  },

  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginRight: 8,
  },

  categoryButtonActive: {
    backgroundColor: "#222",
  },

  categoryText: {
    fontWeight: "600",
  },

  categoryTextActive: {
    color: "#fff",
  },

  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  productCount: {
    marginRight: 20,
    marginTop: 20,
    color: "#777",
  },

  products: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
  },

  productCard: {
    width: "46%",
    margin: "2%",
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
  },

  productEmoji: {
    fontSize: 45,
    textAlign: "center",
    paddingVertical: 10,
  },

  productName: {
    fontWeight: "700",
    marginTop: 5,
  },

  seller: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },

  productPrice: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 8,
  },

  productStock: {
    fontSize: 12,
    color: "#777",
    marginTop: 5,
  },

  addButton: {
    marginTop: 10,
    backgroundColor: "#222",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },

  addButtonDisabled: {
    opacity: 0.45,
  },

  addButtonText: {
    color: "#fff",
    fontWeight: "700",
  },

  cartSummary: {
    margin: 20,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
  },

  cartTitle: {
    fontSize: 18,
    fontWeight: "800",
  },

  cartTotal: {
    fontSize: 24,
    fontWeight: "800",
    marginTop: 8,
  },

  checkoutButton: {
    marginTop: 15,
    backgroundColor: "#222",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  checkoutText: {
    color: "#fff",
    fontWeight: "700",
  },

  sellerBox: {
    margin: 20,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
  },

  sellerTitle: {
    fontSize: 19,
    fontWeight: "800",
  },

  sellerDescription: {
    color: "#666",
    marginTop: 8,
    lineHeight: 20,
  },

  sellerButton: {
    marginTop: 15,
    backgroundColor: "#222",
    padding: 13,
    borderRadius: 10,
    alignItems: "center",
  },

  sellerButtonText: {
    color: "#fff",
    fontWeight: "700",
  },

  bottomNav: {
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

