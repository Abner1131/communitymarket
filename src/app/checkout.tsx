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
import DeliveryMap from "../components/DeliveryMap";
import { useCart } from "../context/CartContext";
import { useCheckout } from "../context/CheckoutContext";
import { sellers } from "../data/sellers";
import { submitCheckout } from "../lib/checkout";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import FirebaseSignInCard from "../components/FirebaseSignInCard";
import { auth } from "../lib/firebase";

import {
  calculateDeliveryFee,
  type DeliveryVehicle,
} from "../services/deliveryPricing";

import {
  calculateDistanceKm,
  getCurrentUserLocation,
  type UserLocation,
} from "../services/location";

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

  const marketplaceLocation: UserLocation = {
    latitude: 10.3158,
    longitude: 9.8442,
  };

  const distanceKm = useMemo(() => {
    if (!customerLocation) {
      return 0;
    }
    return calculateDistanceKm(marketplaceLocation, customerLocation);
  }, [customerLocation]);

  const deliveryFee = useMemo(() => {
    if (!customerLocation) {
      return 0;
    }
    return calculateDeliveryFee({
      distanceKm,
      vehicle: selectedVehicle,
      cartTotal,
    });
  }, [customerLocation, distanceKm, selectedVehicle, cartTotal]);

  const grandTotal = cartTotal + deliveryFee;

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
    if (!phone.trim()) {
      setErrorMessage("Please enter your phone number.");
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
          quantity: item.quantity,
        })),
        deliveryAddress: {
          latitude: customerLocation.latitude,
          longitude: customerLocation.longitude,
        },
        vehiclePreference: selectedVehicle,
        customerName: customerName.trim(),
        phone: phone.trim(),
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
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🛒</Text>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptyText}>Add products before checking out.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace("/")}>
          <Text style={styles.primaryButtonText}>Continue Shopping</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>Checkout</Text>
          <Text style={styles.subtitle}>{cartCount} item(s)</Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>⚠️ Please check</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Customer Information</Text>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            value={customerName}
            onChangeText={setCustomerName}
            autoCapitalize="words"
          />
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="08012345678"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Text style={styles.label}>Delivery Address</Text>
          <TextInput
            style={[styles.input, styles.addressInput]}
            placeholder="House number, street, landmark..."
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Delivery Location</Text>
          <Pressable
            style={[styles.locationButton, loadingLocation && styles.locationButtonDisabled]}
            onPress={handleGetLocation}
            disabled={loadingLocation}
          >
            <Text style={styles.locationButtonText}>
              {loadingLocation ? "📍 Detecting location..." : "📍 Use My Current Location"}
            </Text>
          </Pressable>

          {customerLocation && (
            <>
              <Text style={styles.locationSuccess}>✓ GPS location detected</Text>
              <Text style={styles.coordinates}>
                Latitude: {customerLocation.latitude.toFixed(6)}
              </Text>
              <Text style={styles.coordinates}>
                Longitude: {customerLocation.longitude.toFixed(6)}
              </Text>
              <View style={styles.mapContainer}>
                <DeliveryMap
                  customerLocation={customerLocation}
                  marketplaceLocation={marketplaceLocation}
                />
              </View>
              <View style={styles.distanceCard}>
                <Text style={styles.distanceLabel}>Distance</Text>
                <Text style={styles.distanceValue}>{distanceKm.toFixed(1)} km</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚚 Delivery Vehicle</Text>
          <Text style={styles.vehicleHint}>Choose the appropriate vehicle for your order.</Text>
          <View style={styles.vehicleRow}>
            <Pressable
              style={[styles.vehicleCard, selectedVehicle === "bike" && styles.vehicleSelected]}
              onPress={() => setSelectedVehicle("bike")}
            >
              <Text style={styles.vehicleEmoji}>🏍️</Text>
              <Text style={styles.vehicleName}>Bike</Text>
              <Text style={styles.vehicleDescription}>Small & fast</Text>
            </Pressable>
            <Pressable
              style={[styles.vehicleCard, selectedVehicle === "keke" && styles.vehicleSelected]}
              onPress={() => setSelectedVehicle("keke")}
            >
              <Text style={styles.vehicleEmoji}>🛺</Text>
              <Text style={styles.vehicleName}>Keke</Text>
              <Text style={styles.vehicleDescription}>Larger orders</Text>
            </Pressable>
          </View>

          {customerLocation && (
            <View style={styles.deliveryEstimate}>
              <Text style={styles.estimateLabel}>Estimated Delivery</Text>
              <Text style={styles.estimateValue}>₦{deliveryFee.toLocaleString()}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛍️ Order Items</Text>
          {items.map((item) => {
            const itemTotal = item.product.price * item.quantity;
            return (
              <View key={item.product.id} style={styles.productCard}>
                <View style={styles.productTop}>
                  <Text style={styles.productEmoji}>{item.product.emoji}</Text>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{item.product.name}</Text>
                    <Text style={styles.seller}>Seller: {item.product.seller}</Text>
                    <Text style={styles.productPrice}>
                      ₦{item.product.price.toLocaleString()} each
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>₦{itemTotal.toLocaleString()}</Text>
                </View>

                <View style={styles.quantityRow}>
                  <Text style={styles.quantityLabel}>Quantity</Text>
                  <View style={styles.quantityControls}>
                    <Pressable
                      style={styles.quantityButton}
                      onPress={() => decreaseQuantity(item.product.id)}
                    >
                      <Text style={styles.quantityButtonText}>−</Text>
                    </Pressable>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <Pressable
                      style={styles.quantityButton}
                      onPress={() => increaseQuantity(item.product.id)}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  style={styles.removeButton}
                  onPress={() => removeFromCart(item.product.id)}
                >
                  <Text style={styles.removeText}>🗑 Remove Item</Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₦{cartTotal.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={styles.summaryValue}>
              {customerLocation ? `₦${deliveryFee.toLocaleString()}` : "Set location"}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₦{grandTotal.toLocaleString()}</Text>
          </View>
        </View>

        {!firebaseUser ? (
          <FirebaseSignInCard
            title="Sign in to pay"
            subtitle="Your order and payment receipt are saved to this account."
          />
        ) : (
        <Pressable
          style={[styles.paymentButton, processingPayment && styles.paymentButtonDisabled]}
          onPress={handlePayment}
          disabled={processingPayment}
        >
          <Text style={styles.paymentButtonText}>
            {processingPayment ? "⏳ Opening Payment..." : "💳 Proceed to Payment"}
          </Text>
        </Pressable>
        )}

        <Pressable style={styles.continueButton} onPress={() => router.replace("/")}>
          <Text style={styles.continueButtonText}>Continue Shopping</Text>
        </Pressable>

        <Text style={styles.securityText}>🔒 Secure checkout</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f5f7" },
  content: { padding: 20, paddingTop: 55, paddingBottom: 80 },
  header: { marginBottom: 20 },
  backButton: { fontSize: 16, fontWeight: "700", marginBottom: 15 },
  title: { fontSize: 30, fontWeight: "800" },
  subtitle: { color: "#666", marginTop: 5 },
  errorBox: {
    backgroundColor: "#fff1f1",
    borderWidth: 1,
    borderColor: "#e57373",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorTitle: { fontWeight: "800", color: "#c62828", marginBottom: 5 },
  errorText: { color: "#8e2020", lineHeight: 20 },
  section: { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 16 },
  sectionTitle: { fontSize: 19, fontWeight: "800", marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "700", marginBottom: 7, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#fafafa",
  },
  addressInput: { minHeight: 100 },
  locationButton: {
    backgroundColor: "#111",
    paddingVertical: 14,
    borderRadius: 11,
    alignItems: "center",
  },
  locationButtonDisabled: { opacity: 0.6 },
  locationButtonText: { color: "#fff", fontWeight: "800" },
  locationSuccess: { color: "#2e7d32", fontWeight: "700", marginTop: 12 },
  coordinates: { color: "#777", fontSize: 12, marginTop: 3 },
  mapContainer: { height: 240, marginTop: 15, borderRadius: 14, overflow: "hidden" },
  distanceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 13,
    marginTop: 12,
  },
  distanceLabel: { fontWeight: "700" },
  distanceValue: { fontWeight: "900" },
  vehicleHint: { color: "#666", marginBottom: 14 },
  vehicleRow: { flexDirection: "row", gap: 12 },
  vehicleCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 13,
    padding: 15,
    alignItems: "center",
  },
  vehicleSelected: { borderWidth: 2, borderColor: "#111", backgroundColor: "#f5f5f5" },
  vehicleEmoji: { fontSize: 35 },
  vehicleName: { fontSize: 17, fontWeight: "800", marginTop: 5 },
  vehicleDescription: { fontSize: 12, color: "#777", marginTop: 3 },
  deliveryEstimate: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  estimateLabel: { fontWeight: "700" },
  estimateValue: { fontSize: 18, fontWeight: "900" },
  productCard: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  productTop: { flexDirection: "row", alignItems: "center" },
  productEmoji: { fontSize: 36, marginRight: 12 },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: "800" },
  seller: { fontSize: 12, color: "#777", marginTop: 3 },
  productPrice: { fontSize: 13, color: "#555", marginTop: 4 },
  itemTotal: { fontWeight: "800" },
  quantityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  quantityLabel: { fontWeight: "700" },
  quantityControls: { flexDirection: "row", alignItems: "center" },
  quantityButton: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  quantityButtonText: { fontSize: 22, fontWeight: "800" },
  quantity: { minWidth: 40, textAlign: "center", fontWeight: "800" },
  removeButton: {
    marginTop: 14,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 9,
    backgroundColor: "#fff1f1",
  },
  removeText: { color: "#c62828", fontWeight: "700" },
  summaryCard: { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 16 },
  summaryTitle: { fontSize: 19, fontWeight: "800", marginBottom: 15 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  summaryLabel: { color: "#555" },
  summaryValue: { fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#e5e5e5", marginVertical: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { fontSize: 19, fontWeight: "800" },
  totalValue: { fontSize: 23, fontWeight: "900" },
  paymentButton: {
    backgroundColor: "#111",
    borderRadius: 13,
    paddingVertical: 17,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    minHeight: 56,
  },
  paymentButtonDisabled: { opacity: 0.6 },
  paymentButtonText: { color: "#fff", fontSize: 16, fontWeight: "800", textAlign: "center" },
  continueButton: {
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: "center",
  },
  continueButtonText: { fontWeight: "800" },
  securityText: { textAlign: "center", color: "#777", fontSize: 12, marginTop: 15 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: "#f4f5f7",
  },
  emptyEmoji: { fontSize: 60 },
  emptyTitle: { fontSize: 24, fontWeight: "800", marginTop: 15 },
  emptyText: { color: "#666", marginVertical: 15, textAlign: "center" },
  primaryButton: { backgroundColor: "#111", paddingHorizontal: 25, paddingVertical: 14, borderRadius: 12 },
  primaryButtonText: { color: "#fff", fontWeight: "800" },
});
