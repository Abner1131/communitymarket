import { Image } from "expo-image";
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

import { WalletCard } from "../components/WalletCard";
import { pickProductPhoto, type PickedPhoto } from "../lib/photoPick";
import {
  sellerAction,
  SellerApiError,
  SEARCH_LANGS,
  type AiSuggestion,
  type SearchLang,
  type SellerOrder,
  type SellerPhoto,
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
  pending: PickedPhoto[]; // new photos, uploaded when the seller taps Save
  specs: { label: string; value: string }[];
  searchWords: Partial<Record<SearchLang, string[]>>;
  hint: string; // optional words for the AI, e.g. "5kg bag"
  aiNotes: string[]; // photo tips from the AI
};

const EMPTY_DRAFT: Draft = {
  productId: null,
  name: "",
  category: "Groceries",
  price: "",
  stock: "",
  description: "",
  active: true,
  pending: [],
  specs: [],
  searchWords: {},
  hint: "",
  aiNotes: [],
};

function specsToObject(specs: Draft["specs"]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of specs) {
    const label = s.label.trim();
    const value = s.value.trim();
    if (label && value) out[label] = value;
  }
  return out;
}

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
        <Text style={styles.item}>Sale</Text>
        <Text style={styles.item}>{money(order.subtotal)}</Text>
      </View>
      {order.commission > 0 ? (
        <View style={styles.rowBetween}>
          <Text style={styles.muted}>CommunityMarket commission</Text>
          <Text style={styles.muted}>− {money(order.commission)}</Text>
        </View>
      ) : null}
      <View style={[styles.rowBetween, { marginTop: 4 }]}>
        <Text style={styles.value}>You get</Text>
        <Text style={styles.value}>{money(order.earning ?? order.subtotal)}</Text>
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
function PhotoTile({
  uri,
  cover,
  onCover,
  onRemove,
  disabled,
}: {
  uri: string;
  cover: boolean;
  onCover?: () => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.photoTile}>
      <Image source={{ uri }} style={styles.photoImg} contentFit="cover" cachePolicy="memory-disk" />
      {cover ? (
        <View style={styles.coverBadge}>
          <Text style={styles.coverText}>COVER</Text>
        </View>
      ) : onCover ? (
        <Pressable style={styles.coverButton} onPress={onCover} disabled={disabled} hitSlop={6}>
          <Text style={styles.coverButtonText}>Make cover</Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.removeButton} onPress={onRemove} disabled={disabled} hitSlop={8}>
        <Text style={styles.removeText}>{"✕"}</Text>
      </Pressable>
    </View>
  );
}

function ProductForm({
  draft,
  existing,
  maxPhotos,
  categories,
  rates,
  saving,
  photoBusy,
  aiBusy,
  ai,
  progress,
  error,
  onChange,
  onPickPhoto,
  onAiFill,
  onRemoveExisting,
  onCoverExisting,
  onSave,
  onCancel,
}: {
  draft: Draft;
  existing: SellerPhoto[];
  maxPhotos: number;
  categories: string[];
  rates: Record<string, number>;
  saving: boolean;
  photoBusy: boolean;
  aiBusy: boolean;
  ai: { available: boolean; usesLeftToday: number } | undefined;
  progress: string;
  error: string;
  onChange: (d: Draft) => void;
  onPickPhoto: (source: "camera" | "library") => void;
  onAiFill: () => void;
  onRemoveExisting: (photoId: string) => void;
  onCoverExisting: (photoId: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const room = maxPhotos - existing.length - draft.pending.length;
  const busy = saving || photoBusy || aiBusy;
  const photoCount = existing.length + draft.pending.length;
  const wordCount = SEARCH_LANGS.reduce((n, l) => n + (draft.searchWords[l.code]?.length || 0), 0);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{draft.productId ? "Edit product" : "New product"}</Text>

      <Text style={styles.label}>
        Photos ({existing.length + draft.pending.length}/{maxPhotos})
      </Text>
      <View style={styles.photoRow}>
        {existing.map((p, i) => (
          <PhotoTile
            key={p.id}
            uri={p.thumbUrl}
            cover={i === 0}
            onCover={() => onCoverExisting(p.id)}
            onRemove={() => onRemoveExisting(p.id)}
            disabled={busy}
          />
        ))}
        {draft.pending.map((p, i) => (
          <PhotoTile
            key={p.uri}
            uri={p.uri}
            cover={existing.length === 0 && i === 0}
            onRemove={() => onChange({ ...draft, pending: draft.pending.filter((_, k) => k !== i) })}
            disabled={busy}
          />
        ))}
      </View>
      {room > 0 ? (
        <View style={styles.twoCol}>
          <Pressable style={[styles.smallButton, { flex: 1 }]} disabled={busy} onPress={() => onPickPhoto("camera")}>
            <Text style={[styles.smallButtonText, { textAlign: "center" }]}>📷 Take photo</Text>
          </Pressable>
          <Pressable style={[styles.smallButton, { flex: 1 }]} disabled={busy} onPress={() => onPickPhoto("library")}>
            <Text style={[styles.smallButtonText, { textAlign: "center" }]}>🖼 From gallery</Text>
          </Pressable>
        </View>
      ) : null}
      <Text style={styles.hint}>
        Good light, plain background, product filling the frame. The first photo shows on Home.
        {draft.pending.length ? " New photos upload when you tap Save." : ""}
      </Text>

      {ai?.available && photoCount > 0 ? (
        <View style={styles.aiBox}>
          <TextInput
            style={[styles.input, { backgroundColor: "#fff" }]}
            value={draft.hint}
            onChangeText={(hint) => onChange({ ...draft, hint: hint.slice(0, 100) })}
            placeholder="Optional: a few words, e.g. 5kg bag, size 42"
            editable={!busy}
          />
          <Pressable
            style={[styles.aiButton, (busy || ai.usesLeftToday <= 0) && { opacity: 0.5 }]}
            disabled={busy || ai.usesLeftToday <= 0}
            onPress={onAiFill}
          >
            <Text style={styles.aiButtonText}>{aiBusy ? "AI is looking at your photos..." : "✨ Fill details with AI"}</Text>
          </Pressable>
          <Text style={styles.hint}>
            AI suggests the name, category, description, details and search words. Check them before saving. You
            set the price. {ai.usesLeftToday} use(s) left today.
          </Text>
        </View>
      ) : null}

      {draft.aiNotes.length ? (
        <View style={styles.aiNotes}>
          {draft.aiNotes.map((n, i) => (
            <Text key={i} style={styles.aiNoteText}>
              {"•"} {n}
            </Text>
          ))}
        </View>
      ) : null}

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

      {rates[draft.category] !== undefined ? (
        <Text style={styles.hint}>
          CommunityMarket commission on {draft.category}: {rates[draft.category]}%
          {(() => {
            const p = parseInt(draft.price, 10);
            return Number.isInteger(p) && p > 0
              ? ` · you get ${money(p - Math.round((p * rates[draft.category]) / 100))} per item`
              : "";
          })()}
        </Text>
      ) : null}

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

      <Text style={styles.label}>Details (optional)</Text>
      {draft.specs.map((s, i) => (
        <View key={i} style={[styles.twoCol, { marginBottom: 6, alignItems: "center" }]}>
          <TextInput
            style={[styles.input, { flex: 2, paddingVertical: 9 }]}
            value={s.label}
            placeholder="e.g. Brand"
            onChangeText={(label) =>
              onChange({ ...draft, specs: draft.specs.map((x, k) => (k === i ? { ...x, label: label.slice(0, 30) } : x)) })
            }
          />
          <TextInput
            style={[styles.input, { flex: 3, paddingVertical: 9 }]}
            value={s.value}
            placeholder="e.g. Mama Gold"
            onChangeText={(value) =>
              onChange({ ...draft, specs: draft.specs.map((x, k) => (k === i ? { ...x, value: value.slice(0, 60) } : x)) })
            }
          />
          <Pressable
            onPress={() => onChange({ ...draft, specs: draft.specs.filter((_, k) => k !== i) })}
            hitSlop={8}
            disabled={busy}
          >
            <Text style={styles.removeSpec}>{"✕"}</Text>
          </Pressable>
        </View>
      ))}
      {draft.specs.length < 8 ? (
        <Pressable
          onPress={() => onChange({ ...draft, specs: [...draft.specs, { label: "", value: "" }] })}
          disabled={busy}
        >
          <Text style={styles.linkText}>+ Add detail</Text>
        </Pressable>
      ) : null}

      {wordCount ? (
        <View style={{ marginTop: 12 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Customers can find it by</Text>
            <Pressable onPress={() => onChange({ ...draft, searchWords: {} })} disabled={busy} hitSlop={8}>
              <Text style={styles.linkText}>Clear</Text>
            </Pressable>
          </View>
          {SEARCH_LANGS.filter((l) => draft.searchWords[l.code]?.length).map((l) => (
            <Text key={l.code} style={styles.wordsLine}>
              <Text style={{ fontWeight: "700" }}>{l.name}: </Text>
              {(draft.searchWords[l.code] || []).join(", ")}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={[styles.rowBetween, { marginTop: 14 }]}>
        <Text style={styles.value}>Show to customers</Text>
        <Switch value={draft.active} onValueChange={(active) => onChange({ ...draft, active })} />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {progress ? <Text style={styles.progressText}>{progress}</Text> : null}

      <View style={styles.twoCol}>
        <Pressable style={[styles.secondaryButton, { flex: 1 }]} onPress={onCancel} disabled={busy}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryButton, { flex: 1, marginTop: 12 }, busy && { opacity: 0.6 }]}
          onPress={onSave}
          disabled={busy}
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
  const [tab, setTab] = useState<"orders" | "products" | "money">("orders");
  const [working, setWorking] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState("");
  const [progress, setProgress] = useState("");
  const [notice, setNotice] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
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

  // Wallet actions report their own errors inside the wallet card.
  async function walletAction(action: "setBank" | "withdraw", extra: Record<string, unknown>) {
    try {
      const next = await sellerAction(action, extra);
      if (mounted.current) setState(next);
      return null;
    } catch (e: any) {
      return (e?.message as string) || "Something went wrong.";
    }
  }

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
      pending: [],
      specs: Object.entries(p.specs || {}).map(([label, value]) => ({ label, value: String(value) })),
      searchWords: p.searchWords || {},
      hint: "",
      aiNotes: [],
    });
  }

  // AI looks at the photos and fills the form. The seller checks, sets the price, saves.
  async function aiFill() {
    if (!draft) return;
    setFormError("");
    setAiBusy(true);
    try {
      const next = await sellerAction("aiSuggest", {
        productId: draft.productId || undefined,
        images: draft.pending.map((p) => p.base64),
        hint: draft.hint.trim(),
      });
      if (!mounted.current) return;
      setState(next);
      const s: AiSuggestion | null | undefined = next.aiSuggestion;
      if (!s) return;
      setDraft((d) => {
        if (!d) return d;
        // New photos: drop ones that break the rules, put the best one first.
        const blockedNew = new Set(
          s.photos.filter((p) => p.source === "new" && p.blocking).map((p) => p.index as number),
        );
        let pending = d.pending.filter((_, i) => !blockedNew.has(i));
        if (s.bestPhoto?.source === "new" && typeof s.bestPhoto.index === "number" && !blockedNew.has(s.bestPhoto.index)) {
          const best = d.pending[s.bestPhoto.index];
          pending = [best, ...pending.filter((p) => p !== best)];
        }
        const notes = s.photos
          .filter((p) => p.problem)
          .map((p) => {
            const which = p.source === "new" ? `New photo ${(p.index ?? 0) + 1}` : "A saved photo";
            return p.blocking ? `${which} was removed: ${p.tip}` : `${which}: ${p.tip}`;
          });
        return {
          ...d,
          pending,
          name: s.name || d.name,
          category: s.category || d.category,
          description: s.description || d.description,
          specs: Object.keys(s.specs).length
            ? Object.entries(s.specs).map(([label, value]) => ({ label, value }))
            : d.specs,
          searchWords: s.searchWords,
          aiNotes: notes,
        };
      });
      setNotice("AI filled the details. Check them, add the price and stock, then tap Save.");
    } catch (e: any) {
      if (mounted.current) setFormError(e?.message || "The AI could not help right now. You can type the details.");
    } finally {
      if (mounted.current) setAiBusy(false);
    }
  }

  async function pickPhoto(source: "camera" | "library") {
    if (!draft) return;
    setFormError("");
    setPhotoBusy(true);
    try {
      const photo = await pickProductPhoto(source);
      if (photo && mounted.current) {
        setDraft((d) => (d ? { ...d, pending: [...d.pending, photo] } : d));
      }
    } catch (e: any) {
      setFormError(e?.message || "Could not open the camera or gallery.");
    } finally {
      if (mounted.current) setPhotoBusy(false);
    }
  }

  // Remove / reorder photos already saved on the product.
  async function changeSavedPhoto(action: "removePhoto" | "setCover", photoId: string) {
    if (!draft?.productId) return;
    setFormError("");
    setPhotoBusy(true);
    try {
      const next = await sellerAction(action, { productId: draft.productId, photoId });
      if (mounted.current) setState(next);
    } catch (e: any) {
      setFormError(e?.message || "Could not change the photo.");
    } finally {
      if (mounted.current) setPhotoBusy(false);
    }
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
      specs: specsToObject(draft.specs),
      searchWords: draft.searchWords,
    });
    if (!result) return;
    const productId = result.savedProductId || draft.productId;

    // Then upload new photos one by one (small, so this is quick).
    const failed: PickedPhoto[] = [];
    const tips: string[] = [];
    let lastError = "";
    if (productId && draft.pending.length) {
      setWorking("save");
      for (let i = 0; i < draft.pending.length; i++) {
        setProgress(`Uploading photo ${i + 1} of ${draft.pending.length}...`);
        try {
          const next = await sellerAction("addPhoto", { productId, image: draft.pending[i].base64 });
          if (mounted.current) setState(next);
          tips.push(...(next.photoWarnings || []));
        } catch (e: any) {
          failed.push(draft.pending[i]);
          lastError = e?.message || "Upload failed.";
        }
      }
      if (mounted.current) {
        setWorking(null);
        setProgress("");
      }
    }
    if (!mounted.current) return;
    if (failed.length) {
      // Product is saved; keep the form open so the seller can retry the photos.
      setDraft({ ...draft, productId, pending: failed });
      setFormError(`Product saved, but ${failed.length} photo(s) did not upload: ${lastError} Tap Save to try again.`);
      return;
    }
    setDraft(null);
    setNotice(
      tips.length
        ? `Saved. Photo tip: ${[...new Set(tips)].join(" ")}`
        : draft.pending.length
          ? "Saved with photos."
          : "Saved.",
    );
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
        {notice ? (
          <Pressable style={styles.noticeBox} onPress={() => setNotice("")}>
            <Text style={styles.noticeText}>{notice}</Text>
          </Pressable>
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
          {(["orders", "products", "money"] as const).map((t) => (
            <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === "orders" ? `Orders (${orders.length})` : t === "products" ? `Products (${products.length})` : "Wallet"}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === "money" ? (
          state.wallet ? (
            <WalletCard
              wallet={state.wallet}
              onSaveBank={async (bank) => walletAction("setBank", { bank })}
              onWithdraw={async (amount) => walletAction("withdraw", { amount })}
            />
          ) : null
        ) : tab === "orders" ? (
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
                existing={(draft.productId && products.find((p) => p.id === draft.productId)?.photos) || []}
                maxPhotos={state.maxPhotos || 3}
                categories={state.categories}
                rates={state.commissionRates || {}}
                saving={working === "save"}
                photoBusy={photoBusy}
                aiBusy={aiBusy}
                ai={state.ai}
                onAiFill={() => void aiFill()}
                progress={progress}
                error={formError}
                onChange={setDraft}
                onPickPhoto={(source) => void pickPhoto(source)}
                onRemoveExisting={(id) => void changeSavedPhoto("removePhoto", id)}
                onCoverExisting={(id) => void changeSavedPhoto("setCover", id)}
                onSave={() => void saveDraft()}
                onCancel={() => {
                  setDraft(null);
                  setProgress("");
                }}
              />
            ) : (
              <Pressable
                style={[styles.primaryButton, { marginTop: 0, marginBottom: 12 }]}
                onPress={() => {
                  setFormError("");
                  setNotice("");
                  setDraft({ ...EMPTY_DRAFT, category: state.categories[0] || "Groceries" });
                }}
              >
                <Text style={styles.primaryButtonText}>+ Add product</Text>
              </Pressable>
            )}

            {products.map((p) => (
              <Pressable key={p.id} style={[styles.card, !p.active && { opacity: 0.55 }]} onPress={() => editProduct(p)}>
                <View style={styles.rowBetween}>
                  {p.photos && p.photos[0] ? (
                    <Image
                      source={{ uri: p.photos[0].thumbUrl }}
                      style={styles.listThumb}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={[styles.listThumb, styles.noPhoto]}>
                      <Text style={styles.noPhotoText}>No photo</Text>
                    </View>
                  )}
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
  noticeBox: { backgroundColor: "#e8f5e9", borderRadius: 12, padding: 12, marginBottom: 12 },
  noticeText: { color: "#1b5e20", fontWeight: "600" },
  progressText: { color: "#1565c0", fontWeight: "700", marginTop: 8 },
  photoRow: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  photoTile: { width: 92, height: 92, borderRadius: 10, overflow: "hidden", backgroundColor: "#eee" },
  photoImg: { width: "100%", height: "100%" },
  coverBadge: {
    position: "absolute",
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(30,125,50,0.9)",
    paddingVertical: 3,
    alignItems: "center",
  },
  coverText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  coverButton: {
    position: "absolute",
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 3,
    alignItems: "center",
  },
  coverButtonText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  aiBox: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: "#f3eefe", borderWidth: 1, borderColor: "#d9ccf7" },
  aiButton: { marginTop: 10, backgroundColor: "#5b2bd6", borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  aiButtonText: { color: "#fff", fontWeight: "800" },
  aiNotes: { marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: "#fff8e1" },
  aiNoteText: { color: "#6d4c00", fontSize: 13, marginTop: 2 },
  removeSpec: { color: "#b00020", fontWeight: "800", fontSize: 16, paddingHorizontal: 4 },
  linkText: { color: "#1565c0", fontWeight: "700", marginTop: 4 },
  wordsLine: { color: "#444", fontSize: 13, marginTop: 3 },
  listThumb: { width: 54, height: 54, borderRadius: 10, marginRight: 12, backgroundColor: "#f0f0f0" },
  noPhoto: { alignItems: "center", justifyContent: "center" },
  noPhotoText: { fontSize: 9, color: "#999", fontWeight: "700", textAlign: "center" },
});
