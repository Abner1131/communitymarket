import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { useRiders } from "../context/RiderContext";

import { useOrders } from "../context/OrderContext";

import {
    calculateDistanceKm,
} from "../services/location";

export default function RiderSimulationScreen() {
  const {
    riders,
    moveRiderTowardDestination,
  } = useRiders();

  const { orders } = useOrders();

  const [isMoving, setIsMoving] =
    useState(false);

  const busyRiders = useMemo(
    () =>
      riders.filter(
        (rider) =>
          rider.currentOrderId
      ),
    [riders]
  );

  const activeRider =
    busyRiders[0];

  const activeOrder =
    activeRider?.currentOrderId
      ? orders.find(
          (order) =>
            order.orderId ===
            activeRider.currentOrderId
        )
      : undefined;

  const pickupLocation =
    activeOrder?.pickupStops[0]
      ? {
          latitude:
            activeOrder
              .pickupStops[0]
              .latitude,

          longitude:
            activeOrder
              .pickupStops[0]
              .longitude,
        }
      : undefined;

  const customerLocation =
    activeOrder?.customerLocation;

  const destination =
    activeOrder?.status ===
      "picked_up"
      ? customerLocation
      : pickupLocation;

  const distanceToDestination =
    activeRider && destination
      ? calculateDistanceKm(
          {
            latitude:
              activeRider.latitude,

            longitude:
              activeRider.longitude,
          },
          destination
        )
      : 0;

  useEffect(() => {
    if (!isMoving) {
      return;
    }

    if (
      !activeRider ||
      !destination
    ) {
      setIsMoving(false);
      return;
    }

    if (
      distanceToDestination <=
      0.05
    ) {
      setIsMoving(false);
      return;
    }

    const timer =
      setInterval(() => {
        moveRiderTowardDestination(
          activeRider.id,
          destination,
          0.5
        );
      }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [
    isMoving,
    activeRider,
    destination,
    distanceToDestination,
    moveRiderTowardDestination,
  ]);

  function handleStartMovement() {
    if (
      !activeRider ||
      !destination
    ) {
      return;
    }

    setIsMoving(true);
  }

  function handleStopMovement() {
    setIsMoving(false);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
    >
      <Text style={styles.title}>
        Rider GPS Simulation
      </Text>

      <Text style={styles.subtitle}>
        CommunityMarket Dispatch
      </Text>

      {!activeRider ||
      !activeOrder ||
      !destination ? (
        <View style={styles.card}>
          <Text style={styles.emptyEmoji}>
            🛵
          </Text>

          <Text style={styles.emptyTitle}>
            No Active Rider
          </Text>

          <Text style={styles.emptyText}>
            Assign a delivery order to a
            rider first.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Active Rider
            </Text>

            <Text style={styles.riderName}>
              {activeRider.name}
            </Text>

            <Text style={styles.riderInfo}>
              {activeRider.vehicle.toUpperCase()}{" "}
              • ⭐{" "}
              {activeRider.rating.toFixed(
                1
              )}
            </Text>

            <View
              style={[
                styles.stateBox,
                isMoving &&
                  styles.movingBox,
              ]}
            >
              <Text
                style={styles.stateLabel}
              >
                GPS STATUS
              </Text>

              <Text
                style={styles.stateValue}
              >
                {isMoving
                  ? "MOVING"
                  : "STOPPED"}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Current Order
            </Text>

            <Text style={styles.orderId}>
              {activeOrder.orderId}
            </Text>

            <Text style={styles.orderStatus}>
              {activeOrder.status
                .replace("_", " ")
                .toUpperCase()}
            </Text>

            <View
              style={styles.divider}
            />

            <Text style={styles.label}>
              Destination
            </Text>

            <Text style={styles.value}>
              {activeOrder.status ===
              "picked_up"
                ? "Customer"
                : "Seller Pickup"}
            </Text>

            <Text style={styles.label}>
              Distance Remaining
            </Text>

            <Text style={styles.distance}>
              {distanceToDestination.toFixed(
                2
              )}{" "}
              km
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Simulated GPS
            </Text>

            <Text style={styles.label}>
              Current Latitude
            </Text>

            <Text style={styles.coordinate}>
              {activeRider.latitude.toFixed(
                6
              )}
            </Text>

            <Text style={styles.label}>
              Current Longitude
            </Text>

            <Text style={styles.coordinate}>
              {activeRider.longitude.toFixed(
                6
              )}
            </Text>

            <Text style={styles.label}>
              Destination Latitude
            </Text>

            <Text style={styles.coordinate}>
              {destination.latitude.toFixed(
                6
              )}
            </Text>

            <Text style={styles.label}>
              Destination Longitude
            </Text>

            <Text style={styles.coordinate}>
              {destination.longitude.toFixed(
                6
              )}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Movement Control
            </Text>

            {!isMoving ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={
                  handleStartMovement
                }
              >
                <Text
                  style={styles.buttonText}
                >
                  Start Rider Movement
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.stopButton}
                onPress={
                  handleStopMovement
                }
              >
                <Text
                  style={
                    styles.buttonText
                  }
                >
                  Stop Rider
                </Text>
              </TouchableOpacity>
            )}

            <Text
              style={styles.simulationNote}
            >
              The rider moves approximately
              0.5 km every second in this
              prototype simulation.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Movement Logic
            </Text>

            <Text style={styles.logicText}>
              Rider
              {" → "}
              Seller Pickup
              {" → "}
              Customer
            </Text>

            <Text
              style={styles.logicDescription}
            >
              Before pickup, the rider
              moves toward the seller.
              After pickup, the destination
              becomes the customer.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7f5",
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  title: {
    fontSize: 27,
    fontWeight: "900",
  },

  subtitle: {
    marginTop: 4,
    marginBottom: 16,
    color: "#2e7d32",
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },

  emptyEmoji: {
    fontSize: 45,
    textAlign: "center",
  },

  emptyTitle: {
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 8,
  },

  emptyText: {
    textAlign: "center",
    color: "#666",
    marginTop: 6,
  },

  riderName: {
    fontSize: 20,
    fontWeight: "900",
  },

  riderInfo: {
    marginTop: 4,
    color: "#666",
  },

  stateBox: {
    marginTop: 14,
    backgroundColor: "#eeeeee",
    padding: 12,
    borderRadius: 10,
  },

  movingBox: {
    backgroundColor: "#d9f5df",
  },

  stateLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#777",
  },

  stateValue: {
    marginTop: 3,
    fontSize: 17,
    fontWeight: "900",
  },

  orderId: {
    color: "#2e7d32",
    fontWeight: "800",
  },

  orderStatus: {
    marginTop: 7,
    fontWeight: "900",
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },

  label: {
    marginTop: 9,
    color: "#777",
    fontSize: 12,
  },

  value: {
    marginTop: 2,
    fontWeight: "700",
  },

  distance: {
    marginTop: 3,
    fontSize: 24,
    fontWeight: "900",
    color: "#2e7d32",
  },

  coordinate: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: "700",
  },

  primaryButton: {
    backgroundColor: "#2e7d32",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  stopButton: {
    backgroundColor: "#c62828",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },

  simulationNote: {
    marginTop: 12,
    textAlign: "center",
    color: "#777",
    fontSize: 12,
  },

  logicText: {
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },

  logicDescription: {
    marginTop: 10,
    color: "#666",
    lineHeight: 19,
  },
});