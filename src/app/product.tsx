import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { useCart } from "../context/CartContext";
import type { Product } from "../data/products";
import { emojiFor, photosFrom } from "../lib/catalog";
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
  const stockNow = product ? (withOptions ? (variant ? variant.stock : product.stock) : product.stock) : 0;

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
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={10}>
          <Text style={styles.back}>{"←"} Back</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/cart")} hitSlop={10}>
          <Text style={styles.back}>🛒 Cart{items.length ? ` (${items.length})` : ""}</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 60 }} />
      ) : missing || !product ? (
        <View style={styles.center}>
          <Text style={styles.missingTitle}>This product is not available</Text>
          <Text style={styles.muted}>The seller may have hidden it or it sold out.</Text>
          <Pressable style={styles.button} onPress={() => router.replace("/")}>
            <Text style={styles.buttonText}>Back to the market</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: 110 }}>
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
                      style={{ width: pageWidth, height: pageWidth, backgroundColor: "#fff" }}
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
              <View style={[styles.emojiBox, { height: pageWidth * 0.7 }]}>
                <Text style={styles.emoji}>{product.emoji}</Text>
              </View>
            )}

            <View style={styles.body}>
              <Text style={styles.category}>{product.category}</Text>
              <Text style={styles.name}>{product.name}</Text>
              <Text style={styles.price}>
                {showFrom ? "from " : ""}
                {NAIRA}
                {shownPrice.toLocaleString()}
              </Text>
              <Text style={styles.muted}>
                Sold by {product.seller} {"·"}{" "}
                {stockNow > 0
                  ? variant
                    ? `${variant.stock} left in ${variantLabel(product, variant)}`
                    : `${product.stock} in stock`
                  : variant
                    ? `${variantLabel(product, variant)} is sold out`
                    : "Out of stock"}
              </Text>

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
        <View style={styles.bottomBar}>
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
            style={[styles.button, styles.addButton, stockNow <= 0 && { opacity: 0.4 }]}
            disabled={stockNow <= 0}
            onPress={() => void add()}
          >
            <Text style={styles.buttonText}>
              {stockNow <= 0
                ? "Sold out"
                : added
                  ? "✓ Added"
                  : withOptions && !variant && missingOption
                    ? `Choose ${missingOption.name.toLowerCase()}`
                    : "+ Add to cart"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f6f8" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  back: { fontWeight: "700", fontSize: 15 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  missingTitle: { fontSize: 18, fontWeight: "800", marginBottom: 6, textAlign: "center" },
  dots: { flexDirection: "row", justifyContent: "center", paddingVertical: 8, backgroundColor: "#fff" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ccc", marginHorizontal: 4 },
  dotActive: { backgroundColor: "#222", width: 18 },
  emojiBox: { backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 110 },
  body: { padding: 16 },
  category: { color: "#1565c0", fontWeight: "800", fontSize: 12, textTransform: "uppercase" },
  name: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  price: { fontSize: 24, fontWeight: "900", marginTop: 8 },
  muted: { color: "#777", marginTop: 4 },
  section: { fontSize: 15, fontWeight: "800", marginTop: 20, marginBottom: 6 },
  text: { fontSize: 15, lineHeight: 22, color: "#333" },
  specs: { backgroundColor: "#fff", borderRadius: 12, overflow: "hidden" },
  specRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  specLabel: { width: "40%", color: "#777", fontWeight: "700" },
  specValue: { flex: 1, color: "#222" },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingBottom: 22,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  bottomPrice: { fontSize: 20, fontWeight: "900" },
  button: {
    backgroundColor: "#222",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  addButton: { marginTop: 0, backgroundColor: "#1e7d32" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minWidth: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cfd3da",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  chipActive: { borderColor: "#1e7d32", backgroundColor: "#1e7d32" },
  chipOut: { backgroundColor: "#f1f1f1", borderColor: "#e3e3e3" },
  chipText: { fontWeight: "700", color: "#222" },
  chipTextActive: { color: "#fff" },
  chipTextOut: { color: "#aaa", textDecorationLine: "line-through" },
  chosenValue: { fontWeight: "600", color: "#1e7d32" },
  hintText: { color: "#b26a00", fontWeight: "700", marginTop: 10 },
  buttonText: { color: "#fff", fontWeight: "800" },
});
