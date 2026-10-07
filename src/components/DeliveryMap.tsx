import { StyleSheet, Text, View } from "react-native";

type Location = {
  latitude: number;
  longitude: number;
};

type DeliveryMapProps = {
  customerLocation: Location;
  marketplaceLocation: Location;
  riderLocation?: Location;
};

function CoordinateBlock({
  label,
  location,
}: {
  label: string;
  location: Location;
}) {
  return (
    <View style={styles.locationRow}>
      <Text style={styles.locationLabel}>{label}</Text>
      <Text style={styles.coordinates}>
        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
      </Text>
    </View>
  );
}

export default function DeliveryMap({
  customerLocation,
  marketplaceLocation,
  riderLocation,
}: DeliveryMapProps) {
  const hasRiderLocation = Boolean(riderLocation);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Live Delivery Tracking
      </Text>

      <Text style={styles.subtitle}>
        {hasRiderLocation
          ? "Rider location is updating from tracking service"
          : "Waiting for rider location"}
      </Text>

      <View style={styles.statusBox}>
        <View
          style={[
            styles.statusDot,
            hasRiderLocation
              ? styles.statusLive
              : styles.statusWaiting,
          ]}
        />

        <Text style={styles.statusText}>
          {hasRiderLocation
            ? "LIVE TRACKING ACTIVE"
            : "TRACKING NOT AVAILABLE"}
        </Text>
      </View>

      <View style={styles.locationsCard}>
        <CoordinateBlock
          label="Marketplace / Pickup"
          location={marketplaceLocation}
        />

        {riderLocation ? (
          <CoordinateBlock
            label="Rider Current Location"
            location={riderLocation}
          />
        ) : null}

        <CoordinateBlock
          label="Customer Destination"
          location={customerLocation}
        />
      </View>

      {riderLocation ? (
        <View style={styles.routeCard}>
          <Text style={styles.routeTitle}>
            Rider → Customer
          </Text>

          <Text style={styles.routeText}>
            Current rider position is supplied by the
            {" "}canonical tracking service.
          </Text>
        </View>
      ) : (
        <View style={styles.routeCard}>
          <Text style={styles.routeTitle}>
            Tracking
          </Text>

          <Text style={styles.routeText}>
            A rider location will appear here after
            {" "}tracking begins.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
    padding: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
  },

  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    marginBottom: 12,
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },

  statusLive: {
    backgroundColor: "#2e7d32",
  },

  statusWaiting: {
    backgroundColor: "#9ca3af",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#374151",
  },

  locationsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
  },

  locationRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },

  locationRowLast: {
    borderBottomWidth: 0,
  },

  locationLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 4,
  },

  coordinates: {
    fontSize: 12,
    color: "#6b7280",
  },

  routeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },

  routeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 5,
  },

  routeText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#6b7280",
  },
});
