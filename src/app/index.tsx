import { router } from "expo-router";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark, BrandWordmark } from "../components/Brand";
import { HomeWalletCard } from "../components/HomeWalletCard";
import { Icon, categoryIcon, type IconName } from "../components/Icon";
import PoweredByGreenFusion from "../components/PoweredByGreenFusion";
import { TAB_BAR_SPACE, TabBar } from "../components/TabBar";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { products } from "../data/products";
import { subscribeCatalog } from "../lib/catalog";
import { hasOptions, optionSummary, priceRange } from "../lib/variants";
import { categoryTint, colors, fonts, radius, shadow, text, ui } from "../theme";

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
 * Existing products.ts does not contain isActive.
 * This local type adds the marketplace status without
 * changing your existing products.ts structure.
 */
type MarketplaceProduct = (typeof products)[number] & {
  isActive: boolean;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const naira = (n: number) => `₦${n.toLocaleString()}`;

export default function HomeScreen() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [marketProducts, setMarketProducts] = useState<MarketplaceProduct[]>([]);

  const { cartCount, cartTotal, addToCart } = useCart();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - 40 - 12) / 2);

  /*
   * Live catalogue from the database: every customer sees the same
   * products, and sellers' changes appear instantly.
   */
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogError, setCatalogError] = useState("");

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
  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return marketProducts.filter((product) => {
      if (product.isActive === false || product.stock <= 0) {
        return false;
      }

      const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;

      // Name, category, description and the search words in
      // English, Hausa, Pidgin, Yoruba and Igbo.
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.category.toLowerCase().includes(normalizedSearch) ||
        (product.description || "").toLowerCase().includes(normalizedSearch) ||
        (product.searchWords || []).some(
          (w) => w.includes(normalizedSearch) || (w.length >= 3 && normalizedSearch.includes(w)),
        );

      return matchesCategory && matchesSearch;
    });
  }, [marketProducts, selectedCategory, search]);

  const canAccessDelivery = user?.role === "rider" || user?.role === "admin";
  const isSeller = user?.role === "seller";
  const isCustomer = user?.role === "customer";
  const firstName = (user?.name || "").trim().split(/\s+/)[0];

  return (
    <View style={ui.screen}>
      <View style={ui.glow} pointerEvents="none" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.logoRow} accessible accessibilityRole="header" accessibilityLabel="CommunityMarket">
          <BrandMark size={30} />
          <BrandWordmark height={18} />
        </View>

        <Pressable
          style={({ pressed }) => [ui.iconButton, pressed && styles.pressed]}
          onPress={() => router.push("/account")}
          accessibilityLabel="Account"
        >
          {firstName ? (
            <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
          ) : (
            <Icon name="user" size={20} color={colors.ink} />
          )}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* GREETING */}
        <View style={styles.greeting}>
          <Text style={text.small}>
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </Text>
          <Text style={text.hero}>What do you need today?</Text>
        </View>

        {/* SEARCH */}
        <View style={styles.search}>
          <Icon name="search" size={19} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search rice, phones, fabric…"
            placeholderTextColor={colors.faint}
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Search products"
            returnKeyType="search"
          />
          {search ? (
            <Pressable onPress={() => setSearch("")} hitSlop={10} accessibilityLabel="Clear search">
              <Icon name="x" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {/* STAFF SHORTCUTS */}
        {user?.role === "admin" && (
          <Shortcut
            icon="shield"
            tint={colors.dangerSoft}
            iconColor={colors.danger}
            title="Admin Dashboard"
            subtitle="Applications, today's numbers, live trips"
            onPress={() => router.push("/admin" as any)}
          />
        )}

        {canAccessDelivery && (
          <Shortcut
            icon="bike"
            title="Rider / Delivery"
            subtitle="Open the delivery dashboard"
            onPress={() => router.push("/rider" as any)}
          />
        )}

        {isSeller && (
          <>
            <Shortcut
              icon="store"
              title="Seller Dashboard"
              subtitle="Manage your seller profile and account"
              onPress={() => router.push("/account")}
            />
            <Shortcut
              icon="package"
              tint={colors.goldSoft}
              iconColor={colors.goldText}
              title="My Products"
              subtitle="View your catalog products, prices and stock"
              onPress={() => router.push("/seller" as any)}
            />
          </>
        )}

        {/* WALLET */}
        <HomeWalletCard />

        {/* CATEGORIES */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryRow}
        >
          {categories.map((category) => {
            const on = selectedCategory === category;
            return (
              <Pressable
                key={category}
                onPress={() => setSelectedCategory(category)}
                style={styles.category}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={category}
              >
                <View style={[styles.categoryTile, on && styles.categoryTileOn]}>
                  <Icon name={categoryIcon(category)} size={24} color={on ? "#ffffff" : colors.ink} />
                </View>
                <Text style={[styles.categoryText, on && styles.categoryTextOn]} numberOfLines={1}>
                  {category === "Agriculture" ? "Farm" : category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* PRODUCTS HEADER */}
        <View style={styles.productHeader}>
          <Text style={text.section}>{selectedCategory === "All" ? "Popular products" : selectedCategory}</Text>
          <Text style={text.small}>
            {filteredProducts.length} {filteredProducts.length === 1 ? "item" : "items"}
          </Text>
        </View>

        {/* PRODUCTS */}
        {!catalogLoaded ? (
          <Text style={styles.note}>Loading products...</Text>
        ) : catalogError ? (
          <Text style={[styles.note, { color: colors.danger }]}>{catalogError}</Text>
        ) : filteredProducts.length === 0 ? (
          <Text style={styles.note}>No products found.</Text>
        ) : null}

        <View style={styles.products}>
          {filteredProducts.map((product) => {
            const tint = categoryTint(product.category);
            const range = priceRange(product);
            const options = hasOptions(product);
            const open = () =>
              router.push({
                pathname: "/product",
                params: { id: String(product.id) },
              } as any);
            return (
              <View key={product.id} style={[styles.productCard, { width: cardWidth }]}>
                <Pressable onPress={open} accessibilityLabel={`Open ${product.name}`}>
                  {product.thumbUrl ? (
                    <Image
                      source={{ uri: product.thumbUrl }}
                      style={styles.productPhoto}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={150}
                    />
                  ) : (
                    <View style={[styles.productPhoto, styles.productTile, { backgroundColor: tint.bg }]}>
                      <Icon name={categoryIcon(product.category)} size={44} color={tint.icon} />
                    </View>
                  )}

                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <Text style={styles.seller} numberOfLines={1}>
                      {product.seller}
                    </Text>
                    {options ? (
                      <Text style={styles.optionText} numberOfLines={1}>
                        {optionSummary(product)}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>

                <View style={styles.priceRow}>
                  <Text style={styles.productPrice} numberOfLines={1}>
                    {options && range.min !== range.max ? <Text style={styles.from}>from </Text> : null}
                    {naira(range.min)}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [styles.addButton, pressed && { backgroundColor: colors.greenPressed }]}
                    onPress={() => {
                      // Sizes / colours are chosen on the product page.
                      if (options) {
                        open();
                        return;
                      }
                      addToCart(product);
                    }}
                    accessibilityLabel={
                      options
                        ? `Choose ${((product.options || [])[0]?.name || "option").toLowerCase()} for ${product.name}`
                        : `Add ${product.name} to cart`
                    }
                    hitSlop={6}
                  >
                    <Icon name={options ? "chevron-right" : "plus"} size={18} color="#ffffff" />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {/* CART SUMMARY */}
        {cartCount > 0 && (
          <View style={styles.cartSummary}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cartLabel}>
                {cartCount} {cartCount === 1 ? "item" : "items"} in your cart
              </Text>
              <Text style={styles.cartTotal}>{naira(cartTotal)}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.cartButton, pressed && { opacity: 0.85 }]}
              onPress={() => router.push("/checkout")}
            >
              <Text style={styles.cartButtonText}>Review & checkout</Text>
            </Pressable>
          </View>
        )}

        {/* SELLER CTA FOR CUSTOMERS */}
        {isCustomer && (
          <View style={styles.sellerBox}>
            <View style={styles.sellerIcon}>
              <Icon name="store" size={22} color={colors.green} />
            </View>
            <Text style={styles.sellerTitle}>Sell on CommunityMarket</Text>
            <Text style={text.small}>List your products and reach customers in your community.</Text>
            <Pressable
              style={({ pressed }) => [styles.sellerButton, pressed && styles.pressed]}
              onPress={() => router.push("/account")}
            >
              <Text style={styles.sellerButtonText}>Become a seller</Text>
            </Pressable>
          </View>
        )}

        <PoweredByGreenFusion />
        <View style={{ height: TAB_BAR_SPACE }} />
      </ScrollView>

      <TabBar active="home" />
    </View>
  );
}

function Shortcut({
  icon,
  title,
  subtitle,
  onPress,
  tint = colors.greenSoft,
  iconColor = colors.green,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  tint?: string;
  iconColor?: string;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]} onPress={onPress}>
      <View style={[styles.shortcutIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={21} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={text.bodyStrong}>{title}</Text>
        <Text style={text.small}>{subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={20} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarText: { fontFamily: fonts.bold, fontSize: 16, color: colors.green },
  pressed: { opacity: 0.7 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  greeting: { gap: 4, marginBottom: 16 },

  search: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    ...shadow.card,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, paddingVertical: 0 },

  shortcut: {
    ...ui.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    marginBottom: 12,
  },
  shortcutIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },

  categoryScroll: { marginHorizontal: -20, marginTop: 4, marginBottom: 18 },
  categoryRow: { paddingHorizontal: 20, gap: 10, paddingVertical: 6 },
  category: { width: 66, alignItems: "center", gap: 7 },
  categoryTile: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  categoryTileOn: { backgroundColor: colors.green, ...shadow.button },
  categoryText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink2 },
  categoryTextOn: { color: colors.ink },

  productHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  note: { ...text.small, paddingVertical: 12 },

  products: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  productCard: { ...ui.card, padding: 8, gap: 8 },
  productPhoto: { width: "100%", height: 124, borderRadius: 14, backgroundColor: colors.chip },
  productTile: { alignItems: "center", justifyContent: "center" },
  productInfo: { paddingHorizontal: 4, paddingTop: 8, gap: 2 },
  productName: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, color: colors.ink },
  seller: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  optionText: { fontFamily: fonts.medium, fontSize: 12, color: colors.goldText },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 4,
    gap: 6,
  },
  productPrice: { ...text.price, flexShrink: 1 },
  from: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },

  cartSummary: {
    marginTop: 20,
    borderRadius: radius.xl,
    backgroundColor: colors.green,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...shadow.button,
  },
  cartLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.onGreenMuted },
  cartTotal: { fontFamily: fonts.display, fontSize: 24, color: colors.gold, marginTop: 2 },
  cartButton: { height: 44, borderRadius: 22, backgroundColor: colors.cream, paddingHorizontal: 16, justifyContent: "center" },
  cartButtonText: { fontFamily: fonts.bold, fontSize: 14, color: colors.green },

  sellerBox: { ...ui.card, marginTop: 20, padding: 18, gap: 6 },
  sellerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  sellerTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.ink },
  sellerButton: {
    marginTop: 10,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  sellerButtonText: { fontFamily: fonts.bold, fontSize: 15, color: colors.green },
});
