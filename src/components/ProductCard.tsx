// One product tile, shared by Home and the category pages.

import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useCart } from "../context/CartContext";
import type { Product } from "../data/products";
import { hasOptions, optionSummary, priceRange } from "../lib/variants";
import { categoryTint, colors, fonts, text, ui } from "../theme";
import { Icon, categoryIcon } from "./Icon";

const naira = (n: number) => `₦${n.toLocaleString()}`;

export function ProductCard({ product, width }: { product: Product; width: number }) {
  const { addToCart } = useCart();
      const tint = categoryTint(product.category);
      const range = priceRange(product);
      const options = hasOptions(product);
      const closed = product.madeToOrder === true && product.shopOpen === false;
      const open = () =>
        router.push({
          pathname: "/product",
          params: { id: String(product.id) },
        } as any);
      return (
        <View style={[styles.productCard, { width }]}>
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
              {product.madeToOrder ? (
                <Text style={[styles.optionText, closed && { color: colors.danger }]} numberOfLines={1}>
                  {closed ? "Closed right now" : product.prepTime ? `Ready in ${product.prepTime}` : "Cooked to order"}
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
                // Sizes / colours are chosen on the product page. A closed
                // restaurant can't be added to the cart: show the page instead.
                if (options || closed) {
                  open();
                  return;
                }
                addToCart(product);
              }}
              accessibilityLabel={
                options
                  ? `Choose ${((product.options || [])[0]?.name || "option").toLowerCase()} for ${product.name}`
                  : closed
                    ? `${product.name}: restaurant is closed`
                    : `Add ${product.name} to cart`
              }
              hitSlop={6}
            >
              <Icon name={options || closed ? "chevron-right" : "plus"} size={18} color="#ffffff" />
            </Pressable>
          </View>
        </View>
      );
}

const styles = StyleSheet.create({
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
});
