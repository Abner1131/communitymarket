// A category page (like a Jumia / Konga department): the category's name and
// description, its sub-groups as filter chips, a search box, a sort, and the
// products. Opened from the "Shop by category" tiles on Home:
//   /category?name=Groceries

import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";

import { Icon } from "../components/Icon";
import { ProductCard } from "../components/ProductCard";
import { ScreenHeader } from "../components/ui";
import { useCart } from "../context/CartContext";
import { categoryDef } from "../data/categories";
import type { Product } from "../data/products";
import { subscribeCatalog } from "../lib/catalog";
import { priceRange } from "../lib/variants";
import { colors, fonts, radius, shadow, text, ui } from "../theme";

type Sort = "az" | "low" | "high";
const SORTS: { key: Sort; label: string }[] = [
  { key: "az", label: "A to Z" },
  { key: "low", label: "Price: low to high" },
  { key: "high", label: "Price: high to low" },
];

const naira = (n: number) => `₦${n.toLocaleString()}`;

export default function CategoryScreen() {
  const params = useLocalSearchParams<{ name?: string }>();
  const key = String(params.name || "Other");
  const def = categoryDef(key);
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - 40 - 12) / 2);
  const { cartCount, cartTotal } = useCart();

  const [all, setAll] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [group, setGroup] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("az");

  useEffect(() => {
    return subscribeCatalog(
      (list) => {
        setAll(list);
        setLoaded(true);
        setError("");
      },
      () => {
        setLoaded(true);
        setError("Could not load products. Check your internet connection.");
      },
    );
  }, []);

  // Everything in this category that can be bought right now.
  const inCategory = useMemo(
    () => all.filter((p) => p.category === key && (p as { isActive?: boolean }).isActive !== false && p.stock > 0),
    [all, key],
  );

  // Only show a group chip if something is in it, with how many.
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of inCategory) if (p.subcategory) c[p.subcategory] = (c[p.subcategory] || 0) + 1;
    return c;
  }, [inCategory]);
  const groups = (def?.subs ?? []).filter((s) => counts[s]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = inCategory.filter((p) => {
      if (group !== "All" && p.subcategory !== group) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.subcategory || "").toLowerCase().includes(q) ||
        (p.searchWords || []).some((w) => w.includes(q) || (w.length >= 3 && q.includes(w)))
      );
    });
    return [...list].sort((a, b) =>
      sort === "az"
        ? a.name.localeCompare(b.name)
        : sort === "low"
          ? priceRange(a).min - priceRange(b).min
          : priceRange(b).min - priceRange(a).min,
    );
  }, [inCategory, group, search, sort]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  return (
    <View style={ui.screen}>
      <View style={ui.glow} pointerEvents="none" />
      <ScreenHeader title={def?.label ?? key} subtitle={loaded ? `${inCategory.length} ${inCategory.length === 1 ? "item" : "items"}` : undefined} onBack={goBack} />

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {def ? (
          <View style={[styles.banner, { backgroundColor: def.tint.bg }]}>
            <View style={styles.bannerIcon}>
              <Icon name={def.icon} size={28} color={def.tint.icon} />
            </View>
            <Text style={[styles.bannerText, { color: def.tint.icon }]}>{def.blurb}</Text>
          </View>
        ) : null}

        <View style={styles.search}>
          <Icon name="search" size={19} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search in ${def?.label ?? key}`}
            placeholderTextColor={colors.faint}
            value={search}
            onChangeText={setSearch}
            accessibilityLabel={`Search in ${def?.label ?? key}`}
            returnKeyType="search"
          />
        </View>

        {groups.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
            {["All", ...groups].map((g) => {
              const on = group === g;
              return (
                <Pressable
                  key={g}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => setGroup(g)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {g}
                    {g !== "All" ? ` (${counts[g]})` : ""}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
          {SORTS.map((s) => {
            const on = sort === s.key;
            return (
              <Pressable key={s.key} style={[styles.sortChip, on && styles.sortChipOn]} onPress={() => setSort(s.key)} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[styles.sortText, on && styles.sortTextOn]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {!loaded ? (
          <Text style={styles.note}>Loading products...</Text>
        ) : error ? (
          <Text style={[styles.note, { color: colors.danger }]}>{error}</Text>
        ) : shown.length === 0 ? (
          <View style={styles.empty}>
            <Text style={text.section}>{search.trim() || group !== "All" ? "Nothing matches" : "No products here yet"}</Text>
            <Text style={styles.note}>
              {search.trim() || group !== "All"
                ? "Try another group or a different word."
                : "Sellers are adding products. Check back soon."}
            </Text>
          </View>
        ) : null}

        <View style={styles.products}>
          {shown.map((product) => (
            <ProductCard key={product.id} product={product} width={cardWidth} />
          ))}
        </View>

        <View style={{ height: cartCount > 0 ? 110 : 40 }} />
      </ScrollView>

      {cartCount > 0 ? (
        <View style={styles.cartBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cartLabel}>
              {cartCount} {cartCount === 1 ? "item" : "items"} in your cart
            </Text>
            <Text style={styles.cartTotal}>{naira(cartTotal)}</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.cartButton, pressed && { opacity: 0.85 }]} onPress={() => router.push("/checkout")}>
            <Text style={styles.cartButtonText}>Review & checkout</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8 },
  banner: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.lg, padding: 14, marginBottom: 14 },
  bannerIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center" },
  bannerText: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  search: {
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
    ...shadow.card,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, paddingVertical: 0 },
  chipScroll: { marginHorizontal: -20, marginBottom: 10 },
  chipRow: { paddingHorizontal: 20, gap: 8 },
  chip: { paddingHorizontal: 14, height: 38, borderRadius: 19, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", ...shadow.card },
  chipOn: { backgroundColor: colors.green },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink2 },
  chipTextOn: { color: "#ffffff" },
  sortChip: { paddingHorizontal: 12, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  sortChipOn: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  sortText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  sortTextOn: { color: colors.green, fontFamily: fonts.bold },
  note: { ...text.small, paddingVertical: 8 },
  empty: { paddingVertical: 24, alignItems: "center", gap: 4 },
  products: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 },
  cartBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: radius.xl,
    backgroundColor: colors.green,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...shadow.button,
  },
  cartLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.onGreenMuted },
  cartTotal: { fontFamily: fonts.display, fontSize: 24, color: colors.gold, marginTop: 2 },
  cartButton: { height: 44, borderRadius: 22, backgroundColor: colors.cream, paddingHorizontal: 16, justifyContent: "center" },
  cartButtonText: { fontFamily: fonts.bold, fontSize: 14, color: colors.green },
});
