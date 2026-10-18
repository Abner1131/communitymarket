import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DeliveryMap from "../components/DeliveryMap";
import { Icon, categoryIcon } from "../components/Icon";
import { Notice, ScreenHeader, SectionCard, SummaryRow } from "../components/ui";
import { categoryTint, colors, fonts, radius, text, ui } from "../theme";
import { lineKey, linePrice, useCart } from "../context/CartContext";
import { useCheckout } from "../context/CheckoutContext";
import { sellers } from "../data/sellers";
import { quoteCheckout, submitCheckout, type CheckoutQuote } from "../lib/checkout";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import FirebaseSignInCard from "../components/FirebaseSignInCard";
import { auth } from "../lib/firebase";
import { normalizePhone, PHONE_MESSAGE } from "../lib/phone";

import { type DeliveryVehicle } from "../services/deliveryPricing";

import { getCurrentUserLocation, type UserLocation } from "../services/location";

export default function CheckoutScreen() {
  const {
    items,
    cartCount,
    cartTotal,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const { saveCheckoutDraft } = useCheckout();
  const insets = useSafeAreaInsets();

  // Payment needs a signed-in account (the server checks it).
  const [firebaseUser, setFirebaseUser] =
    useState<FirebaseUser | null>(auth.currentUser);
  useEffect(() => onAuthStateChanged(auth, setFirebaseUser), []);

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [customerLocation, setCustomerLocation] =
    useState<UserLocation | null>(null);

  const [loadingLocation, setLoadingLocation] =
    useState(false);

  const [processingPayment, setProcessingPayment] =
    useState(false);

  const [selectedVehicle, setSelectedVehicle] =
    useState<DeliveryVehicle>("bike");

  const [errorMessage, setErrorMessage] =
    useState("");

  // Main market: shown on the map until we know the shop's location.
  const marketplaceLocation: UserLocation = {
    latitude: 10.3158,
    longitude: 9.8442,
  };

  // The delivery fee comes from the server (measured from the seller's shop
  // to you), so what you see here is exactly what you will pay.
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const cartKey = items.map((i) => `${lineKey(i)}:${i.quantity}`).join(",");

  useEffect(() => {
    if (!customerLocation || items.length === 0 || !firebaseUser) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    setQuoteError("");
    const timer = setTimeout(() => {
      quoteCheckout({
        items: items.map((item) => ({ productId: item.product.id, variantId: item.variant?.id ?? null, quantity: item.quantity })),
        deliveryAddress: { latitude: customerLocation.latitude, longitude: customerLocation.longitude },
        vehiclePreference: selectedVehicle,
      })
        .then((q) => {
          if (!cancelled) setQuote(q);
        })
        .catch((e: any) => {
          if (!cancelled) {
            setQuote(null);
            setQuoteError(e?.message || "Could not work out the delivery fee.");
          }
        })
        .finally(() => {
          if (!cancelled) setQuoteLoading(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerLocation, selectedVehicle, cartKey, firebaseUser?.uid]);

  const distanceKm = quote?.distanceKm ?? 0;
  const deliveryFee = quote?.deliveryFee ?? 0;
  const shopLocation = quote?.shops[0]?.location ?? marketplaceLocation;
  // Delivery alone; service and small-order fees show as their own lines.
  const parts = quote?.deliveryParts;
  const deliveryOnly = parts ? parts.delivery : deliveryFee;
  const feeText = quoteLoading ? "Calculating..." : quote ? `₦${deliveryOnly.toLocaleString()}` : "—";

  const heavyLoad = Boolean(quote && quote.weight && quote.weight !== "light");
  const shownVehicle = heavyLoad ? "keke" : selectedVehicle;

  const grandTotal = quote ? quote.total : cartTotal + deliveryFee;

  async function handleGetLocation() {
    setErrorMessage("");
    try {
      setLoadingLocation(true);
      const location = await getCurrentUserLocation();
      setCustomerLocation(location);
    } catch (error) {
      console.error("LOCATION ERROR:", error);
      setErrorMessage(
        "We could not access your location. Please allow location permission and try again."
      );
    } finally {
      setLoadingLocation(false);
    }
  }

  async function handlePayment() {
    if (processingPayment) {
      return;
    }

    setErrorMessage("");

    if (items.length === 0) {
      setErrorMessage("Your cart is empty. Please add a product before proceeding.");
      return;
    }
    if (!customerName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) {
      setErrorMessage(PHONE_MESSAGE);
      return;
    }
    if (!address.trim()) {
      setErrorMessage("Please enter your delivery address.");
      return;
    }
    if (!customerLocation) {
      setErrorMessage("Please use your current location before proceeding.");
      return;
    }

    setProcessingPayment(true);

    try {
      const result = await submitCheckout({
        items: items.map((item) => ({
          productId: item.product.id,
          variantId: item.variant?.id ?? null,
          quantity: item.quantity,
        })),
        deliveryAddress: {
          latitude: customerLocation.latitude,
          longitude: customerLocation.longitude,
        },
        vehiclePreference: selectedVehicle,
        customerName: customerName.trim(),
        phone: cleanPhone,
        address: address.trim(),
      });

      clearCart();

      router.push({
        pathname: "/payment",
        params: { orderId: result.orderId },
      });
    } catch (error: any) {
      setErrorMessage(error.message || "Something went wrong while placing your order.");
    } finally {
      setProcessingPayment(false);
    }
  }

  if (items.length === 0) {
    return (
      <View style={[ui.screen, styles.emptyContainer]}>
        <View style={styles.emptyIcon}>
          <Icon name="bag" size={30} color={colors.green} />
        </View>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptyText}>Add products before checking out.</Text>
        <Pressable
          style={({ pressed }) => [ui.primaryButton, { alignSelf: "stretch" }, pressed && { backgroundColor: colors.greenPressed }]}
          onPress={() => router.replace("/")}
        >
          <Text style={ui.primaryButtonText}>Continue shopping</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={ui.screen}>
      <View style={ui.glow} pointerEvents="none" />
      <ScreenHeader title="Checkout" subtitle={`${cartCount} ${cartCount === 1 ? "item" : "items"}`} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {errorMessage ? <Notice tone="error" title="Please check" text={errorMessage} /> : null}

        <SectionCard icon="user" title="Your details">
          <Text style={[ui.label, { marginTop: 0 }]}>Full name</Text>
          <TextInput
            style={ui.input}
            placeholder="Enter your full name"
            placeholderTextColor={colors.faint}
            value={customerName}
            onChangeText={setCustomerName}
            autoCapitalize="words"
          />
          <Text style={ui.label}>Phone number</Text>
          <TextInput
            style={ui.input}
            placeholder="08012345678"
            placeholderTextColor={colors.faint}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Text style={ui.label}>Delivery address</Text>
          <TextInput
            style={[ui.input, styles.addressInput]}
            placeholder="House number, street, landmark..."
            placeholderTextColor={colors.faint}
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </SectionCard>

        <SectionCard icon="map-pin" title="Delivery location">
          <Pressable
            style={({ pressed }) => [
              styles.locationButton,
              customerLocation && styles.locationButtonDone,
              loadingLocation && styles.locationButtonDisabled,
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleGetLocation}
            disabled={loadingLocation}
          >
            <Icon name={customerLocation ? "check" : "navigation"} size={18} color={customerLocation ? colors.green : "#ffffff"} />
            <Text style={[styles.locationButtonText, customerLocation && { color: colors.green }]}>
              {loadingLocation
                ? "Finding your location..."
                : customerLocation
                  ? "Location found. Tap to refresh"
                  : "Use my current location"}
            </Text>
          </Pressable>

          {customerLocation && (
            <>
              <View style={styles.mapContainer}>
                <DeliveryMap customerLocation={customerLocation} marketplaceLocation={shopLocation} />
              </View>
              <View style={styles.distanceCard}>
                <Text style={styles.distanceLabel}>
                  Distance{quote && quote.shops.length > 1 ? ` (${quote.shops.length} shops)` : " from the shop"}
                </Text>
                <Text style={styles.distanceValue}>
                  {quoteLoading ? "..." : quote ? `${distanceKm.toFixed(1)} km` : "—"}
                </Text>
              </View>
              <Text style={styles.coordinates}>
                GPS {customerLocation.latitude.toFixed(5)}, {customerLocation.longitude.toFixed(5)}
              </Text>
              {quoteError ? <Notice tone="error" text={quoteError} style={{ marginTop: 12, marginBottom: 0 }} /> : null}
            </>
          )}
        </SectionCard>

        <SectionCard icon="bike" title="Delivery vehicle">
          {heavyLoad ? (
            <Notice
              tone="info"
              text="Your cart has a heavy item, so it goes by keke and is delivered on its own. A small heavy-load fee is added."
              style={{ marginBottom: 12 }}
            />
          ) : null}
          <View style={styles.vehicleRow}>
            {(
              [
                { key: "bike", icon: "bike", name: "Bike", note: "Small & fast" },
                { key: "keke", icon: "truck", name: "Keke", note: "Larger orders" },
              ] as const
            ).map((v) => {
              const on = shownVehicle === v.key;
              return (
                <Pressable
                  key={v.key}
                  style={[styles.vehicleCard, on && styles.vehicleSelected]}
                  onPress={() => (heavyLoad ? undefined : setSelectedVehicle(v.key))}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <View style={styles.vehicleTop}>
                    <Icon name={v.icon} size={26} color={on ? colors.green : colors.ink2} />
                    {on ? (
                      <View style={styles.vehicleCheck}>
                        <Icon name="check" size={12} color="#ffffff" />
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.vehicleName}>{v.name}</Text>
                  <Text style={styles.vehicleDescription}>{v.note}</Text>
                </Pressable>
              );
            })}
          </View>

          {customerLocation && (
            <View style={styles.deliveryEstimate}>
              <Text style={styles.estimateLabel}>Delivery</Text>
              <Text style={styles.estimateValue}>{feeText}</Text>
            </View>
          )}
        </SectionCard>

        <SectionCard icon="bag" title="Your items">
          {items.map((item, index) => {
            const itemTotal = linePrice(item) * item.quantity;
            const key = lineKey(item);
            const tint = categoryTint(item.product.category);
            return (
              <View key={key} style={[styles.productCard, index > 0 && styles.productDivider]}>
                <View style={styles.productTop}>
                  {item.product.thumbUrl ? (
                    <Image
                      source={{ uri: item.product.thumbUrl }}
                      style={styles.thumb}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={[styles.thumb, styles.thumbTile, { backgroundColor: tint.bg }]}>
                      <Icon name={categoryIcon(item.product.category)} size={24} color={tint.icon} />
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.product.name}
                    </Text>
                    {item.variant ? <Text style={styles.variantText}>{item.variant.label}</Text> : null}
                    <Text style={styles.seller} numberOfLines={1}>
                      {item.product.seller} · ₦{linePrice(item).toLocaleString()} each
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>₦{itemTotal.toLocaleString()}</Text>
                </View>

                <View style={styles.quantityRow}>
                  <Pressable
                    style={({ pressed }) => [styles.removeButton, pressed && { opacity: 0.7 }]}
                    onPress={() => removeFromCart(key)}
                    accessibilityLabel={`Remove ${item.product.name}`}
                  >
                    <Icon name="trash" size={16} color={colors.danger} />
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                  <View style={styles.quantityControls}>
                    <Pressable
                      style={({ pressed }) => [styles.quantityButton, pressed && { opacity: 0.6 }]}
                      onPress={() => decreaseQuantity(key)}
                      accessibilityLabel="One less"
                    >
                      <Icon name="minus" size={16} color={colors.ink} />
                    </Pressable>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <Pressable
                      style={({ pressed }) => [styles.quantityButton, pressed && { opacity: 0.6 }]}
                      onPress={() => increaseQuantity(key)}
                      accessibilityLabel="One more"
                    >
                      <Icon name="plus" size={16} color={colors.ink} />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </SectionCard>

        <SectionCard icon="receipt" title="Order summary">
          <SummaryRow label="Subtotal" value={`₦${cartTotal.toLocaleString()}`} />
          <SummaryRow label="Delivery" value={customerLocation ? feeText : "Set location"} />
          {parts && (parts.heavy ?? 0) > 0 ? (
            <SummaryRow label="Heavy load fee" value={`₦${(parts.heavy ?? 0).toLocaleString()}`} />
          ) : null}
          {parts && parts.service > 0 ? <SummaryRow label="Service fee" value={`₦${parts.service.toLocaleString()}`} /> : null}
          {parts && parts.smallOrder > 0 ? (
            <SummaryRow label="Small-order fee" value={`₦${parts.smallOrder.toLocaleString()}`} />
          ) : null}
          <View style={styles.divider} />
          <SummaryRow label="Total" value={`₦${grandTotal.toLocaleString()}`} strong />
        </SectionCard>

        {!firebaseUser ? (
          <FirebaseSignInCard
            title="Sign in to pay"
            subtitle="Your order and payment receipt are saved to this account."
          />
        ) : (
          <Pressable
            style={({ pressed }) => [
              ui.primaryButton,
              styles.paymentButton,
              pressed && { backgroundColor: colors.greenPressed },
              processingPayment && styles.paymentButtonDisabled,
            ]}
            onPress={handlePayment}
            disabled={processingPayment}
          >
            <Text style={ui.primaryButtonText}>
              {processingPayment ? "Opening payment..." : quote ? `Pay ₦${grandTotal.toLocaleString()}` : "Proceed to payment"}
            </Text>
          </Pressable>
        )}

        <Pressable style={({ pressed }) => [styles.continueButton, pressed && { opacity: 0.7 }]} onPress={() => router.replace("/")}>
          <Text style={styles.continueButtonText}>Continue shopping</Text>
        </Pressable>

        <View style={styles.securityRow}>
          <Icon name="lock" size={13} color={colors.muted} />
          <Text style={styles.securityText}>Secure payment by Paystack</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4 },
  addressInput: { minHeight: 96 },
  locationButton: {
    flexDirection: "row",
    gap: 8,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  locationButtonDone: { backgroundColor: colors.greenSoft },
  locationButtonDisabled: { opacity: 0.6 },
  locationButtonText: { fontFamily: fonts.bold, fontSize: 15, color: "#ffffff" },
  coordinates: { fontFamily: fonts.regular, color: colors.faint, fontSize: 12, marginTop: 8 },
  mapContainer: { height: 220, marginTop: 14, borderRadius: radius.md, overflow: "hidden" },
  distanceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.chip,
    borderRadius: radius.sm,
    padding: 13,
    marginTop: 12,
  },
  distanceLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink2 },
  distanceValue: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  vehicleRow: { flexDirection: "row", gap: 10 },
  vehicleCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(23,33,27,0.10)",
    borderRadius: radius.md,
    padding: 14,
    gap: 4,
    backgroundColor: colors.card,
  },
  vehicleSelected: { borderWidth: 1.5, borderColor: colors.green, backgroundColor: "#f6faf7" },
  vehicleTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  vehicleCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleName: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  vehicleDescription: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  deliveryEstimate: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  estimateLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink2 },
  estimateValue: { ...text.price, fontSize: 18 },
  productCard: { paddingVertical: 12 },
  productDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  productTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  thumb: { width: 52, height: 52, borderRadius: 13 },
  thumbTile: { alignItems: "center", justifyContent: "center" },
  productInfo: { flex: 1, gap: 2 },
  productName: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 19, color: colors.ink },
  variantText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.green },
  seller: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  itemTotal: { ...text.price, fontSize: 15 },
  quantityRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.chip,
    borderRadius: 22,
    padding: 3,
  },
  quantityButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
  },
  quantity: { minWidth: 36, textAlign: "center", fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  removeButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingRight: 10 },
  removeText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.danger },
  divider: { height: 1, backgroundColor: colors.line, marginTop: 2, marginBottom: 12 },
  paymentButton: { height: 56, borderRadius: 28, marginTop: 4 },
  paymentButtonDisabled: { opacity: 0.6 },
  continueButton: {
    marginTop: 10,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.chip,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  securityRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16 },
  securityText: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12 },
  emptyContainer: { justifyContent: "center", alignItems: "center", padding: 30 },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { ...text.title, marginTop: 18 },
  emptyText: { ...text.small, fontSize: 14, marginTop: 8, marginBottom: 22, textAlign: "center" },
});
