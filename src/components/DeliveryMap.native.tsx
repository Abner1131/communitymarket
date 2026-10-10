import Constants, { ExecutionEnvironment } from "expo-constants";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

type Location = {
  latitude: number;
  longitude: number;
};

type DeliveryMapProps = {
  customerLocation: Location;
  marketplaceLocation: Location;
};

// Google maps on Android need a Maps key inside the app build.
// Expo Go has its own key; our APK only has one once it is added to app.json.
// Without a key Android crashes when the map appears, so we show a card instead.
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const hasMapsKey = Boolean(Constants.expoConfig?.android?.config?.googleMaps?.apiKey);
export const mapsAvailable = Platform.OS !== "android" || inExpoGo || hasMapsKey;

function openInGoogleMaps(point: Location) {
  const url = `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`;
  Linking.openURL(url).catch(() => {});
}

function LocationCard({ customerLocation, marketplaceLocation }: DeliveryMapProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.pin}>📍</Text>
      <Text style={styles.title}>Location detected</Text>
      <Text style={styles.text}>Your delivery spot has been saved for this order.</Text>
      <View style={styles.buttons}>
        <Pressable style={styles.button} onPress={() => openInGoogleMaps(customerLocation)}>
          <Text style={styles.buttonText}>See my spot</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.buttonLight]} onPress={() => openInGoogleMaps(marketplaceLocation)}>
          <Text style={[styles.buttonText, styles.buttonTextDark]}>See the shop</Text>
        </Pressable>
      </View>
      <Text style={styles.small}>Opens in Google Maps</Text>
    </View>
  );
}

export default function DeliveryMap({ customerLocation, marketplaceLocation }: DeliveryMapProps) {
  if (!mapsAvailable) {
    return <LocationCard customerLocation={customerLocation} marketplaceLocation={marketplaceLocation} />;
  }

  return (
    <MapView
      style={{
        width: "100%",
        height: "100%",
      }}
      initialRegion={{
        latitude: customerLocation.latitude,
        longitude: customerLocation.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      }}
    >
      <Marker
        coordinate={customerLocation}
        title="Delivery Location"
        description="Customer delivery location"
      />

      <Marker
        coordinate={marketplaceLocation}
        title="Marketplace Pickup"
        description="Pickup location"
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#eef7ee",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  pin: { fontSize: 34, marginBottom: 4 },
  title: { fontSize: 17, fontWeight: "800", color: "#1b5e20" },
  text: { fontSize: 13, color: "#4b5563", textAlign: "center", marginTop: 4 },
  buttons: { flexDirection: "row", gap: 10, marginTop: 14 },
  button: {
    backgroundColor: "#2e7d32",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  buttonLight: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#2e7d32" },
  buttonText: { color: "#ffffff", fontWeight: "800" },
  buttonTextDark: { color: "#2e7d32" },
  small: { fontSize: 11, color: "#6b7280", marginTop: 8 },
});
