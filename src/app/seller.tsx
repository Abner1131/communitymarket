import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  sellerAction,
  SellerApiError,
  type SellerOrder,
  type SellerProduct,
  type SellerState,
} from "../lib/sellerApi";
import { getCurrentUserLocation } from "../services/location";

const NAIRA = "₦";
const REFRESH_EVERY_MS = 20000;

const ORDER_STATUS: Record<string, { text: string; color: string }> = {
  paid: { text: "NEW · PAID", color: "#b26a00" },
  dispatching: { text: "NEW · PAID", color: "#b26a00" },
  assigned: { text: "RIDER ASSIGNED", color: "#1565c0" },
  picked_up: { text: "COLLECTED", color: "#6a1b9a" },
  delivered: { text: "DELIVERED", color: "#1e7d32" },
};

type Draft = {
  productId: string | null;
  name: string;
  category: string;
  price: string;
  stock: string;
  description: string;
  active: boolean;
};

const EMPTY_DRAFT: Draft = {
  productId: null,
  name: "",
  category: "Groceries",
  price: "",
  stock: "",
  description: "",
  active: true,
};

function money(n: number) {
  return `${NAIRA}${n.toLocaleString()}`;
}

// ---------- order card ----------
function OrderCard({
  order,
  busy,
  onReady,
}: {
  order: SellerOrder;
  busy: boolean;
  onReady: () => void;
}) {
  const s = ORDER_STATUS[order.status] ?? { text: order.status.toUpperCase(), color: "#222" };
  const canMarkReady = !order.ready && ["paid", "dispatching", "assigned"].includes(order.status);
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.cardTitle}>#{order.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.muted}>
            {order.customerFirstName}
            {order.createdAtMs ? ` · ${new Date(order.createdAtMs).toLocaleString()}` : ""}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: s.color }]}>
          <Text style={styles.badgeText}>{s.text}</Text>
        </View>
      </View>

      <View style={styles.divider} />
      {order.items.map((item, i) => (
        <View key={i} style={styles.rowBetween}>
          <Text style={styles.item}>
            {item.quantity} {"×"} {item.name}
          </Text>
          <Text style={styles.item}>{money(item.unitPrice * item.quantity)}</Text>
        </View>
      ))}
      <View style={[styles.rowBetween, { marginTop: 8 }]}>
        <Text style={styles.value}>Your sale</Text>
        <Text style={styles.value}>{money(order.subtotal)}</Text>
      </View>
      {order.riderName ? <Text style={styles.muted}>Rider: {order.riderName}</Text> : null}

      {canMarkReady ? (
        <Pressable style={[styles.primaryButton, busy && { opacity: 0.6 }]} disabled={busy} onPress={onReady}>
          <Text style={styles.primaryButtonText}>{busy ? "Saving..." : "Packed — mark ready for pickup"}</Text>
        </Pressable>
      ) : order.ready && order.status !== "picked_up" && order.status !== "delivered" ? (
        <Text style={styles.okText}>{"✓"} Ready — waiting for the rider</Text>
      ) : null}
    </View>
  );
}

// ---------- product form ----------
function ProductForm({
  draft,
  categories,
  saving,
  error,
  onChange,
  onSave,
  onCancel,
}: {
  draft: Draft;
  categories: string[];
  saving: boolean;
  error: string;
  onChange: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{draft.productId ? "Edit product" : "New product"}</Text>

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={draft.name}
        onChangeText={(name) => onChange({ ...draft, name })}
        placeholder="e.g. Local rice 50kg"
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.chips}>
        {categories.map((c) => (
          <Pressable
            key={c}
            style={[styles.chip, draft.category === c && styles.chipActive]}
            onPress={() => onChange({ ...draft, category: c })}
          >
            <Text style={[styles.chipText, draft.category === c && styles.chipTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.twoCol}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Price ({NAIRA})</Text>
          <TextInput
            style={styles.input}
            value={draft.price}
            onChangeText={(price) => onChange({ ...draft, price: price.replace(/[^0-9]/g, "") })}
            keyboardType="number-pad"
            placeholder="25000"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>In stock</Text>
          <TextInput
            style={styles.input}
            value={draft.stock}
            onChangeText={(stock) => onChange({ ...draft, stock: stock.replace(/[^0-9]/g, "") })}
            keyboardType="number-pad"
            placeholder="10"
          />
        </View>
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { minHeight: 70 }]}
        value={draft.description}
        onChangeText={(description) => onChange({ ...draft, description })}
        multiline
        textAlignVertical="top"
        placeholder="Size, brand, quality..."
      />

      <View style={[styles.rowBetween, { marginTop: 14 }]}>
        <Text style={styles.value}>Show to customers</Text>
        <Switch value={draft.active} onValueChange={(active) => onChange({ ...draft, active })} />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.twoCol}>
        <Pressable style={[styles.secondaryButton, { flex: 1 }]} onPress={onCancel} disabled={saving}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryButton, { flex: 1, marginTop: 12 }, saving && { opacity: 0.6 }]}
          onPress={onSave}
          disabled={saving}
        >
          <Text style={styles.primaryButtonText}>{saving ? "Saving..." : "Save"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------- screen ----------
export default function SellerScreen() {
  const [state, setState] = useState<SellerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [notLinked, setNotLinked] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [tab, setTab] = useState<"orders" | "products">("orders");
  const [working, setWorking] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState("");
  const mounted = useRef(true);

  const run = useCallback(
    async (label: string | null, action: Parameters<typeof sellerAction>[0], extra = {}) => {
      if (label) setWorking(label);
      setErrorMessage("");
      try {
        const next = await sellerAction(action, extra);
        if (mounted.current) setState(next);
        return next;
      } catch (e: any) {
        if (!mounted.current) return null;
        if (e instanceof SellerApiError && e.notLinked) setNotLinked(true);
        else if (action === "saveProduct") setFormError(e?.message || "Could not save.");
        else setErrorMessage(e?.message || "Something went wrong.");
        return null;
      } finally {
        if (mounted.current) {
          setWorking(null);
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    mounted.current = true;
    void run(null, "me");
    const timer = setInterval(() => void run(null, "me"), REFRESH_EVERY_MS);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [run]);

  function editProduct(p: SellerProduct) {
    setFormError("");
    setDraft({
      productId: p.id,
      name: p.name,
      category: p.category,
      price: String(p.price),
      stock: String(p.stock),
      description: p.description,
      active: p.active,
    });
  }

  async function saveDraft() {
    if (!draft) return;
    setFormError("");
    const price = parseInt(draft.price, 10);
    const stock = parseInt(draft.stock, 10);
    if (!draft.name.trim()) return setFormError("Enter a product name.");
    if (!Number.isInteger(price)) return setFormError("Enter a price.");
    if (!Number.isInteger(stock)) return setFormError("Enter how many are in stock.");
    const result = await run("save", "saveProduct", {
      productId: draft.productId,
      name: draft.name.trim(),
      category: draft.category,
      price,
      stock,
      description: draft.description.trim(),
      active: draft.active,
    });
    if (result) setDraft(null);
  }

  async function useMyLocation() {
    setErrorMessage("");
    setWorking("location");
    try {
      const location = await getCurrentUserLocation();
      await run("location", "setLocation", { location });
    } catch (e: any) {
      setErrorMessage(e?.message || "Could not get your location.");
      setWorking(null);
    }
  }

  const header = (
    <>
      <Pressable onPress={() => router.replace("/")}>
        <Text style={styles.backText}>{"←"} Home</Text>
      </Pressable>
      <Text style={styles.title}>{state ? state.seller.name : "Seller"}</Text>
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {header}
          <ActivityIndicator size="large" style={{ marginTop: 40 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (notLinked || !state) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {header}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {notLinked ? "No shop linked to this account yet" : "Could not load your shop"}
            </Text>
            <Text style={styles.muted}>
              {notLinked
                ? "Once the CommunityMarket admin approves your seller application, your shop appears here."
                : errorMessage}
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => void run("me", "me")}>
              <Text style={styles.primaryButtonText}>Check again</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const { stats, orders, products, seller } = state;
  const toPrepare = orders.filter((o) => !o.ready && ["paid", "dispatching", "assigned"].includes(o.status));
  const others = orders.filter((o) => !toPrepare.includes(o));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void run(null, "me")} />}
      >
        {header}

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <View style={[styles.stat, stats.toPrepare > 0 && { backgroundColor: "#fff4e5" }]}>
            <Text style={styles.statNumber}>{stats.toPrepare}</Text>
            <Text style={styles.statLabel}>To prepare</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{stats.deliveredOrders}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{money(stats.deliveredSales)}</Text>
            <Text style={styles.statLabel}>Sales</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.value}>Pickup location</Text>
              <Text style={styles.muted}>
                {seller.location
                  ? `${seller.location.latitude.toFixed(4)}, ${seller.location.longitude.toFixed(4)}`
                  : "Not set"}
              </Text>
            </View>
            <Pressable style={styles.smallButton} disabled={working !== null} onPress={useMyLocation}>
              <Text style={styles.smallButtonText}>
                {working === "location" ? "Saving..." : "Use my location"}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>Stand at your shop and tap this so riders find you.</Text>
        </View>

        <View style={styles.tabs}>
          {(["orders", "products"] as const).map((t) => (
            <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === "orders" ? `Orders (${orders.length})` : `Products (${products.length})`}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === "orders" ? (
          orders.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No orders yet</Text>
              <Text style={styles.muted}>Paid orders for your shop appear here automatically.</Text>
            </View>
          ) : (
            <>
              {toPrepare.length > 0 && <Text style={styles.sectionTitle}>To prepare</Text>}
              {toPrepare.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  busy={working === `ready-${o.id}`}
                  onReady={() => void run(`ready-${o.id}`, "markReady", { orderId: o.id })}
                />
              ))}
              {others.length > 0 && <Text style={styles.sectionTitle}>Recent</Text>}
              {others.map((o) => (
                <OrderCard key={o.id} order={o} busy={false} onReady={() => undefined} />
              ))}
            </>
          )
        ) : (
          <>
            {draft ? (
              <ProductForm
                draft={draft}
                categories={state.categories}
                saving={working === "save"}
                error={formError}
                onChange={setDraft}
                onSave={() => void saveDraft()}
                onCancel={() => setDraft(null)}
              />
            ) : (
              <Pressable
                style={[styles.primaryButton, { marginTop: 0, marginBottom: 12 }]}
                onPress={() => {
                  setFormError("");
                  setDraft({ ...EMPTY_DRAFT, category: state.categories[0] || "Groceries" });
                }}
              >
                <Text style={styles.primaryButtonText}>+ Add product</Text>
              </Pressable>
            )}

            {products.map((p) => (
              <Pressable key={p.id} style={[styles.card, !p.active && { opacity: 0.55 }]} onPress={() => editProduct(p)}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.cardTitle}>{p.name}</Text>
                    <Text style={styles.muted}>
                      {p.category} {"·"} {p.stock} in stock
                    </Text>
                  </View>
                  <Text style={styles.value}>{money(p.price)}</Text>
                </View>
                {!p.active ? <Text style={styles.hiddenText}>Hidden from customers</Text> : null}
                {p.active && p.stock === 0 ? <Text style={styles.hiddenText}>Out of stock</Text> : null}
                <Text style={styles.hint}>Tap to edit</Text>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f6f8" },
  container: { padding: 20, paddingBottom: 60 },
  backText: { fontWeight: "700", marginBottom: 14 },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 14 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#555", marginTop: 6, marginBottom: 8 },
  muted: { color: "#666", marginTop: 3 },
  hint: { color: "#888", fontSize: 12, marginTop: 8 },
  value: { fontWeight: "700" },
  item: { marginTop: 4 },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  twoCol: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  badge: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  okText: { color: "#1e7d32", fontWeight: "800", marginTop: 12 },
  hiddenText: { color: "#b00020", fontWeight: "700", marginTop: 6, fontSize: 12 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12, alignItems: "center" },
  statNumber: { fontSize: 17, fontWeight: "900" },
  statLabel: { color: "#666", fontSize: 12, marginTop: 2 },
  tabs: { flexDirection: "row", backgroundColor: "#e7e9ee", borderRadius: 12, padding: 4, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center" },
  tabActive: { backgroundColor: "#fff" },
  tabText: { fontWeight: "700", color: "#666" },
  tabTextActive: { color: "#111" },
  label: { fontSize: 13, fontWeight: "700", color: "#444", marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#d0d4db", borderRadius: 10, padding: 12, backgroundColor: "#fff" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderColor: "#ccc", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: "#222", borderColor: "#222" },
  chipText: { fontSize: 13, color: "#444", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  smallButton: { borderWidth: 1, borderColor: "#222", borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
  smallButtonText: { fontWeight: "700", fontSize: 13 },
  primaryButton: {
    marginTop: 14,
    backgroundColor: "#222",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "800" },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryButtonText: { fontWeight: "700" },
  errorBox: { backgroundColor: "#fdecea", borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { color: "#b00020", marginTop: 8 },
});
