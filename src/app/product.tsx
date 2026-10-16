import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandLoader } from "../components/Brand";
import { Icon, categoryIcon } from "../components/Icon";
import { categoryLabel } from "../data/categories";
import { categoryTint, colors, fonts, radius, shadow, text, ui } from "../theme";

import { useCart } from "../context/CartContext";
import type { Product } from "../data/products";
import { dishFrom, emojiFor, photosFrom } from "../lib/catalog";
import { db } from "../lib/firebase";
import {
  findVariant,
  hasOptions,
  priceRange,
  valueExists,
  valueInStock,
  variantLabel,
  variantPrice,
  variantsFrom,
} from "../lib/variants";

const NAIRA = "₦";
const MAX_WIDTH = 520; // keeps the page tidy on tablets / web

type ProductPage = Product & { specs: { label: string; value: string }[] };

function specsFrom(value: unknown): { label: string; value: string }[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => typeof v === "string" || typeof v === "number")
    .map(([label, v]) => ({ label, value: String(v) }))
    .slice(0, 12);
}

// One product: swipe through its photos, read the details, add to cart.
export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width, MAX_WIDTH);
  const { addToCart, items } = useCart();
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState<ProductPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [added, setAdded] = useState(false);
  const [chosen, setChosen] = useState<(string | null)[]>([]);
  const [chooseHint, setChooseHint] = useState("");

  useEffect(() => {
    if (!id) return;
    return onSnapshot(
      doc(db, "products", String(id)),
      (snap) => {
        setLoading(false);
        const p = snap.data();
        if (!snap.exists() || !p || p.active !== true) {
          setMissing(true);
          return;
        }
        const category = typeof p.category === "string" ? p.category : "Other";
        setMissing(false);
        setProduct({
          id: snap.id,
          name: typeof p.name === "string" ? p.name : "Product",
          category,
          subcategory: typeof p.subcategory === "string" ? p.subcategory : "",
          price: Number(p.price) || 0,
          emoji: emojiFor(snap.id, category),
          description: typeof p.description === "string" ? p.description : "",
          seller: typeof p.sellerName === "string" ? p.sellerName : "CommunityMarket seller",
          stock: Number(p.stock) || 0,
          thumbUrl: typeof p.thumbUrl === "string" ? p.thumbUrl : null,
          imageUrl: typeof p.imageUrl === "string" ? p.imageUrl : null,
          photos: photosFrom(p.photos),
          specs: specsFrom(p.specs),
          ...variantsFrom(p.options, p.variants),
          ...dishFrom(p),
        });
      },
      () => {
        setLoading(false);
        setMissing(true);
      },
    );
  }, [id]);

  function onSwipe(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (i !== photoIndex) setPhotoIndex(i);
  }

  const withOptions = product ? hasOptions(product) : false;
  const options = product?.options ?? [];
  // A value with only one choice is picked for the buyer.
  const picks = options.map((o, i) => {
    if (chosen[i]) return chosen[i];
    const existing = product ? o.values.filter((v) => valueExists(product, i, v)) : [];
    return existing.length === 1 ? existing[0] : null;
  });
  const variant = product && withOptions ? findVariant(product, picks) : null;
  const missingOption = withOptions ? options.find((_, i) => !picks[i]) : undefined;
  const range = product ? priceRange(product) : { min: 0, max: 0 };
  const shownPrice = product ? (variant ? variantPrice(product, variant) : range.min) : 0;
  const showFrom = withOptions && !variant && range.min !== range.max;
  // A dish has no stock count: it is open, sold out today, or the restaurant is closed.
  const dish = Boolean(product?.madeToOrder);
  const closed = dish && product?.shopOpen === false;
  const stockNow = product
    ? closed
      ? 0
      : withOptions
        ? variant
          ? variant.stock
          : product.stock
        : product.stock
    : 0;

  function choose(optionIndex: number, value: string) {
    const next = options.map((_, i) => picks[i] ?? null);
    next[optionIndex] = next[optionIndex] === value ? null : value;
    setChosen(next);
    setChooseHint("");
  }

  async function add() {
    if (!product) return;
    if (withOptions) {
      if (!variant) {
        setChooseHint(missingOption ? `Choose a ${missingOption.name.toLowerCase()} first.` : "That combination is not available.");
        return;
      }
      if (variant.stock <= 0) return;
      await addToCart(product, variant);
    } else {
      if (product.stock <= 0) return;
      await addToCart(product);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  const inCart = product ? items.filter((i) => i.product.id === product.id).reduce((n, i) => n + i.quantity, 0) : 0;
  const photos = product?.photos ?? [];

  return (
    <View style={ui.screen}>
      {loading ? (
        <BrandLoader style={{ marginTop: insets.top + 120 }} />
      ) : missing || !product ? (
        <View style={styles.center}>
          <View style={styles.missingIcon}>
            <Icon name="package" size={28} color={colors.muted} />
          </View>
          <Text style={styles.missingTitle}>This product is not available</Text>
          <Text style={styles.muted}>The seller may have hidden it or it sold out.</Text>
          <Pressable style={styles.button} onPress={() => router.replace("/")}>
            <Text style={styles.buttonText}>Back to the market</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: 130 + insets.bottom }}>
          <View style={{ width: pageWidth }}>
            {photos.length ? (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={onSwipe}
                  onScroll={onSwipe}
                  scrollEventThrottle={64}
                >
                  {photos.map((p, i) => (
                    <Image
                      key={p.id}
                      source={{ uri: p.url }}
                      placeholder={{ uri: p.thumbUrl }}
                      style={{ width: pageWidth, height: pageWidth, backgroundColor: "#ffffff" }}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                      transition={150}
                      accessibilityLabel={`${product.name} photo ${i + 1} of ${photos.length}`}
                    />
                  ))}
                </ScrollView>
                {photos.length > 1 ? (
                  <View style={styles.dots}>
                    {photos.map((p, i) => (
                      <View key={p.id} style={[styles.dot, i === photoIndex && styles.dotActive]} />
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <View
                style={[styles.emojiBox, { height: pageWidth * 0.82, backgroundColor: categoryTint(product.category).bg }]}
              >
                <Icon name={categoryIcon(product.category)} size={110} color={categoryTint(product.category).icon} />
              </View>
            )}

            <View style={styles.body}>
              <View style={styles.categoryChip}>
                <Icon name={categoryIcon(product.category)} size={14} color={colors.green} />
                <Text style={styles.category}>
                  {categoryLabel(product.category)}
                  {product.subcategory ? ` · ${product.subcategory}` : ""}
                </Text>
              </View>
              <Text style={styles.name}>{product.name}</Text>
              <Text style={styles.price}>
                {showFrom ? "from " : ""}
                {NAIRA}
                {shownPrice.toLocaleString()}
              </Text>
              <View style={styles.sellerRow}>
                <Icon name="store" size={16} color={colors.muted} />
                <Text style={[styles.muted, { marginTop: 0, flex: 1 }]}>
                Sold by {product.seller} {"·"}{" "}
                {dish
                  ? closed
                    ? "Closed right now"
                    : stockNow > 0
                      ? product.prepTime
                        ? `Ready in ${product.prepTime}`
                        : "Cooked when you order"
                      : "Sold out today"
                  : stockNow > 0
                    ? variant
                      ? `${variant.stock} left in ${variantLabel(product, variant)}`
                      : `${product.stock} in stock`
                    : variant
                      ? `${variantLabel(product, variant)} is sold out`
                      : "Out of stock"}
                {dish && product.shopHours ? ` ${"·"} Open ${product.shopHours}` : ""}
                </Text>
              </View>

              {withOptions
                ? options.map((o, i) => (
                    <View key={o.name}>
                      <Text style={styles.section}>
                        {o.name}
                        {picks[i] ? <Text style={styles.chosenValue}>: {picks[i]}</Text> : null}
                      </Text>
                      <View style={styles.chips}>
                        {o.values
                          .filter((v) => valueExists(product, i, v))
                          .map((v) => {
                            const active = picks[i] === v;
                            const available = valueInStock(product, i, v, picks.map((c, j) => (j === i ? null : c)));
                            return (
                              <Pressable
                                key={v}
                                style={[styles.chip, active && styles.chipActive, !available && styles.chipOut]}
                                onPress={() => choose(i, v)}
                                accessibilityLabel={`${o.name} ${v}${available ? "" : ", sold out"}`}
                              >
                                <Text
                                  style={[styles.chipText, active && styles.chipTextActive, !available && styles.chipTextOut]}
                                >
                                  {v}
                                </Text>
                              </Pressable>
                            );
                          })}
                      </View>
                    </View>
                  ))
                : null}
              {chooseHint ? <Text style={styles.hintText}>{chooseHint}</Text> : null}

              {product.description ? (
                <>
                  <Text style={styles.section}>Description</Text>
                  <Text style={styles.text}>{product.description}</Text>
                </>
              ) : null}

              {product.specs.length ? (
                <>
                  <Text style={styles.section}>Details</Text>
                  <View style={styles.specs}>
                    {product.specs.map((s) => (
                      <View key={s.label} style={styles.specRow}>
                        <Text style={styles.specLabel}>{s.label}</Text>
                        <Text style={styles.specValue}>{s.value}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </View>
          </View>
        </ScrollView>
      )}

      {product && !missing ? (
        <View style={[styles.bottomBar, { paddingBottom: 14 + Math.max(insets.bottom, 10) }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bottomPrice}>
              {showFrom ? "from " : ""}
              {NAIRA}
              {shownPrice.toLocaleString()}
            </Text>
            {variant ? <Text style={styles.muted}>{variantLabel(product, variant)}</Text> : null}
            {inCart ? <Text style={styles.muted}>{inCart} in your cart</Text> : null}
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.addButton,
              added && styles.addedButton,
              pressed && { backgroundColor: colors.greenPressed },
              stockNow <= 0 && { opacity: 0.4 },
            ]}
            disabled={stockNow <= 0}
            onPress={() => void add()}
          >
            <Text style={styles.buttonText}>
              {closed
                ? "Closed right now"
                : stockNow <= 0
                  ? dish
                    ? "Sold out today"
                    : "Sold out"
                  : added
                  ? "Added ✓"
                  : withOptions && !variant && missingOption
                    ? `Choose ${missingOption.name.toLowerCase()}`
                    : "Add to cart"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Floating buttons over the photo */}
      <View style={[styles.topBar, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [ui.iconButton, styles.floatButton, pressed && { opacity: 0.7 }]}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          hitSlop={6}
          accessibilityLabel="Back"
        >
          <Icon name="chevron-left" size={22} color={colors.ink} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [ui.iconButton, styles.floatButton, pressed && { opacity: 0.7 }]}
          onPress={() => router.push("/cart")}
          hitSlop={6}
          accessibilityLabel={items.length ? `Cart, ${items.length} items` : "Cart"}
        >
          <Icon name="bag" size={20} color={colors.ink} />
          {items.length ? (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{items.length}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  floatButton: { backgroundColor: "rgba(255,255,255,0.92)", ...shadow.card },
  cartBadge: {
    position: "absolute",
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  cartBadgeText: { color: "#ffffff", fontFamily: fonts.bold, fontSize: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  missingIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.chip,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  missingTitle: { ...text.title, fontSize: 20, marginBottom: 6, textAlign: "center" },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 30,
    backgroundColor: "#ffffff",
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(23,33,27,0.22)", marginHorizontal: 3 },
  dotActive: { backgroundColor: colors.ink, width: 18 },
  emojiBox: { alignItems: "center", justifyContent: "center", paddingBottom: 20 },
  body: {
    padding: 20,
    paddingTop: 24,
    marginTop: -24,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  categoryChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.greenSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  category: { fontFamily: fonts.bold, color: colors.green, fontSize: 12 },
  name: { ...text.hero, fontSize: 27, lineHeight: 31, marginTop: 10 },
  price: { ...text.priceLarge, fontSize: 26, marginTop: 8 },
  sellerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  muted: { ...text.small, marginTop: 4 },
  section: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, marginTop: 22, marginBottom: 10 },
  text: { ...text.body, color: colors.ink2, lineHeight: 23 },
  specs: { ...ui.card, overflow: "hidden" },
  specRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  specLabel: { width: "40%", fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  specValue: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: "rgba(246,243,236,0.97)",
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  bottomPrice: { ...text.priceLarge, fontSize: 22 },
  button: { ...ui.primaryButton, marginTop: 18 },
  addButton: { marginTop: 0, minWidth: 170, height: 54, borderRadius: 27 },
  addedButton: { backgroundColor: colors.goldDeep },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minWidth: 52,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(23,33,27,0.12)",
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { borderColor: colors.green, borderWidth: 1.5, backgroundColor: colors.greenSoft },
  chipOut: { backgroundColor: colors.chip, borderColor: "transparent" },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  chipTextActive: { fontFamily: fonts.bold, color: colors.green },
  chipTextOut: { color: colors.faint, textDecorationLine: "line-through" },
  chosenValue: { fontFamily: fonts.semibold, color: colors.green },
  hintText: { fontFamily: fonts.bold, color: colors.goldText, marginTop: 12 },
  buttonText: ui.primaryButtonText,
});
