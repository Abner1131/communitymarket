import { router } from "expo-router";
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, categoryIcon } from "../components/Icon";
import { TAB_BAR_SPACE, TabBar } from "../components/TabBar";
import { lineKey, linePrice, useCart } from "../context/CartContext";
import { categoryTint, colors, fonts, radius, text, ui } from "../theme";

const naira = (n: number) => `₦${n.toLocaleString()}`;

export default function CartScreen() {
  const { items, cartCount, cartTotal } = useCart();
  const insets = useSafeAreaInsets();

  return (
    <View style={ui.screen}>
      <View style={ui.glow} pointerEvents="none" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={text.title}>My cart</Text>
        <Text style={text.small}>
          {cartCount} {cartCount === 1 ? "item" : "items"}
        </Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="bag" size={30} color={colors.green} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>Add products from the marketplace to get started.</Text>
          <Pressable
            style={({ pressed }) => [ui.primaryButton, styles.shopButton, pressed && { backgroundColor: colors.greenPressed }]}
            onPress={() => router.replace("/")}
          >
            <Text style={ui.primaryButtonText}>Continue shopping</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {/* CART ITEMS */}
          <View style={styles.itemsCard}>
            {items.map((item, index) => {
              const tint = categoryTint(item.product.category);
              return (
                <View key={lineKey(item)} style={[styles.cartItem, index > 0 && styles.divider]}>
                  {item.product.thumbUrl ? (
                    <Image
                      source={{ uri: item.product.thumbUrl }}
                      style={styles.thumb}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={[styles.thumb, styles.thumbTile, { backgroundColor: tint.bg }]}>
                      <Icon name={categoryIcon(item.product.category)} size={26} color={tint.icon} />
                    </View>
                  )}

                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.product.name}
                    </Text>
                    {item.variant ? <Text style={styles.variantText}>{item.variant.label}</Text> : null}
                    <Text style={styles.seller} numberOfLines={1}>
                      {item.product.seller}
                    </Text>
                    <Text style={styles.quantity}>
                      {naira(linePrice(item))} × {item.quantity}
                    </Text>
                  </View>

                  <Text style={styles.itemTotal}>{naira(linePrice(item) * item.quantity)}</Text>
                </View>
              );
            })}
          </View>

          {/* TOTAL */}
          <View style={styles.summary}>
            <View style={styles.totalRow}>
              <Text style={styles.summaryTitle}>Cart total</Text>
              <Text style={styles.total}>{naira(cartTotal)}</Text>
            </View>
            <Text style={text.small}>Delivery is worked out at checkout.</Text>

            <Pressable
              style={({ pressed }) => [ui.primaryButton, styles.checkoutButton, pressed && { backgroundColor: colors.greenPressed }]}
              onPress={() => router.push("/checkout")}
            >
              <Text style={ui.primaryButtonText}>Review & checkout</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.continueButton, pressed && { opacity: 0.7 }]}
              onPress={() => router.replace("/")}
            >
              <Text style={styles.continueText}>Continue shopping</Text>
            </Pressable>
          </View>

          <View style={{ height: TAB_BAR_SPACE }} />
        </ScrollView>
      )}

      <TabBar active="cart" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  list: { paddingHorizontal: 20, paddingTop: 4 },

  itemsCard: { ...ui.card, paddingHorizontal: 14 },
  cartItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  thumb: { width: 60, height: 60, borderRadius: 14 },
  thumbTile: { alignItems: "center", justifyContent: "center" },
  productInfo: { flex: 1, gap: 2 },
  productName: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 19, color: colors.ink },
  variantText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.green },
  seller: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  quantity: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink2, marginTop: 2 },
  itemTotal: { ...text.price, fontSize: 16 },

  summary: { ...ui.card, marginTop: 14, padding: 18, gap: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  summaryTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  total: { ...text.priceLarge },
  checkoutButton: { marginTop: 16 },
  continueButton: {
    marginTop: 10,
    height: 48,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.chip,
  },
  continueText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },

  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 35, paddingBottom: 80 },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { ...text.title, marginTop: 18 },
  emptyText: { ...text.small, fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 },
  shopButton: { marginTop: 22, alignSelf: "stretch" },
});
