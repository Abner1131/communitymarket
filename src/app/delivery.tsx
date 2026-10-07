import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useOrders } from "../context/OrderContext";
import { useRiders } from "../context/RiderContext";

import {
  findBestRider,
  type DispatchOrder,
} from "../services/dispatchEngine";

import { calculateDistanceKm } from "../services/location";

import DeliveryMap from "../components/DeliveryMap";

export default function DeliveryScreen() {
  const router = useRouter();

  const {
    orders,
    isLoadingOrders,
    assignRider,
    updateOrderStatus,
  } = useOrders();

  const {
    riders,
    assignOrderToRider,
    clearRiderOrder,
    moveRiderTowardDestination,
    getRiderLocation,
  } = useRiders();

  const [selectedOrderId, setSelectedOrderId] =
    useState<string | null>(null);

  const [isMoving, setIsMoving] =
    useState(false);

  type JourneyPhase =
    | "TO_PICKUP"
    | "ARRIVED_AT_PICKUP"
    | "TO_CUSTOMER"
    | "ARRIVED_AT_CUSTOMER"
    | "COMPLETED";

  const [journeyPhase, setJourneyPhase] =
    useState<JourneyPhase>("TO_PICKUP");

  const [currentPickupIndex, setCurrentPickupIndex] =
    useState(0);

  const [journeyLegStartDistance, setJourneyLegStartDistance] =
    useState(0);

  const currentOrder =
    selectedOrderId
      ? orders.find(
          (order) =>
            order.orderId === selectedOrderId
        )
      : orders[orders.length - 1];

  const dispatchOrder: DispatchOrder | null =
    currentOrder
      ? {
          orderId: currentOrder.orderId,

          pickupStops:
            currentOrder.pickupStops.map(
              (stop) => ({
                sellerId: stop.sellerId,
                sellerName: stop.sellerName,
                latitude: stop.latitude,
                longitude: stop.longitude,
              })
            ),

          customerLocation:
            currentOrder.customerLocation,

          vehicle:
            currentOrder.vehicle,
        }
      : null;

  const dispatchResult =
    dispatchOrder
      ? findBestRider(
          riders,
          dispatchOrder
        )
      : null;

  const selectedRider =
    dispatchResult?.selectedRider;

  const assignedRider =
    currentOrder?.assignedRiderId
      ? riders.find(
          (rider) =>
            rider.id ===
            currentOrder.assignedRiderId
        )
      : undefined;

  const trackedRiderLocation =
    currentOrder?.assignedRiderId
      ? getRiderLocation(
          currentOrder.assignedRiderId
        )
      : undefined;

  const riderForDisplay =
    assignedRider ??
    selectedRider;

  const firstPickup =
    currentOrder?.pickupStops[0];

  const currentPickup =
    currentOrder?.pickupStops[
      currentPickupIndex
    ];

  const pickupLocation =
    currentPickup
      ? {
          latitude:
            currentPickup.latitude,
          longitude:
            currentPickup.longitude,
        }
      : undefined;

  const customerLocation =
    currentOrder?.customerLocation;

  const journeyDestination =
    currentOrder?.status ===
      "picked_up"
      ? customerLocation
      : pickupLocation;

  const totalPickupStops =
    currentOrder?.pickupStops.length ?? 0;

  const totalJourneyLegs =
    totalPickupStops + 1;

  const completedJourneyLegs =
    currentOrder?.status ===
      "delivered" ||
    journeyPhase ===
      "ARRIVED_AT_CUSTOMER" ||
    journeyPhase ===
      "COMPLETED"
      ? totalJourneyLegs
      : currentOrder?.status ===
        "picked_up"
      ? totalPickupStops
      : currentPickupIndex;

  const riderCurrentLocation =
    trackedRiderLocation?.location ??
    (assignedRider
      ? {
          latitude:
            assignedRider.latitude,
          longitude:
            assignedRider.longitude,
        }
      : undefined);

  const distanceToDestination =
    riderCurrentLocation &&
    journeyDestination
      ? calculateDistanceKm(
          riderCurrentLocation,
          journeyDestination
        )
      : 0;

  const currentLegProgress =
    journeyLegStartDistance > 0
      ? Math.min(
          1,
          Math.max(
            0,
            1 -
              distanceToDestination /
                journeyLegStartDistance
          )
        )
      : journeyPhase ===
          "ARRIVED_AT_PICKUP" ||
        journeyPhase ===
          "ARRIVED_AT_CUSTOMER" ||
        journeyPhase ===
          "COMPLETED"
      ? 1
      : 0;

  const journeyProgress =
    totalJourneyLegs > 0
      ? Math.min(
          1,
          (completedJourneyLegs +
            currentLegProgress) /
            totalJourneyLegs
        )
      : 0;

  const riderSpeedKmh =
    currentOrder?.vehicle === "bike"
      ? 35
      : 30;

  const etaMinutes =
    journeyPhase === "COMPLETED" ||
    journeyPhase === "ARRIVED_AT_PICKUP" ||
    journeyPhase === "ARRIVED_AT_CUSTOMER"
      ? 0
      : distanceToDestination > 0
      ? Math.ceil(
          (distanceToDestination /
            riderSpeedKmh) *
            60
        )
      : 0;

  function formatEta(minutes: number) {
    if (minutes <= 0) {
      return "Arrived";
    }

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(
      minutes / 60
    );

    const remainingMinutes =
      minutes % 60;

    return `${hours}h ${remainingMinutes}m`;
  }

  const displayDistanceToDestination =
    journeyPhase ===
      "ARRIVED_AT_PICKUP" ||
    journeyPhase ===
      "ARRIVED_AT_CUSTOMER" ||
    journeyPhase === "COMPLETED"
      ? 0
      : distanceToDestination;

  const orderItemsCount =
    currentOrder?.items.reduce(
      (total, item) =>
        total + item.quantity,
      0
    ) ?? 0;

  const journeyStage =
    journeyPhase === "TO_CUSTOMER"
      ? "TO CUSTOMER"
      : "TO PICKUP";

  const journeyDestinationLabel =
    journeyPhase === "COMPLETED"
      ? "Completed"
      : currentOrder?.status ===
        "picked_up"
      ? "Customer"
      : currentPickup
      ? currentPickup.sellerName
      : "Pickup";

    const progressPercent =
    totalJourneyLegs > 0
      ? Math.round(
          (completedJourneyLegs /
            totalJourneyLegs) *
            100
        )
      : 0;

  useEffect(() => {
    if (!isMoving) {
      return;
    }

    if (
      !assignedRider ||
      !journeyDestination ||
      !currentOrder
    ) {
      setIsMoving(false);
      return;
    }

    if (distanceToDestination <= 0.05) {
      setIsMoving(false);
      setJourneyLegStartDistance(0);

      if (
        currentOrder.status ===
        "assigned"
      ) {
        setJourneyPhase(
          "ARRIVED_AT_PICKUP"
        );
      } else if (
        currentOrder.status ===
        "picked_up"
      ) {
        setJourneyPhase(
          "ARRIVED_AT_CUSTOMER"
        );
      }

      return;
    }

    const timer = setInterval(() => {
      moveRiderTowardDestination(
        assignedRider.id,
        journeyDestination,
        5
      );
    }, 500);

    return () => {
      clearInterval(timer);
    };
  }, [
    isMoving,
    assignedRider,
    journeyDestination,
    currentOrder,
    distanceToDestination,
    moveRiderTowardDestination,
  ]);

  useEffect(() => {
    if (!currentOrder) {
      return;
    }

    if (
      currentOrder.status ===
      "assigned"
    ) {
      if (
        journeyPhase ===
          "TO_CUSTOMER" ||
        journeyPhase ===
          "ARRIVED_AT_CUSTOMER"
      ) {
        setJourneyPhase(
          "TO_PICKUP"
        );
      }
    }

    if (
      currentOrder.status ===
      "picked_up"
    ) {
      setCurrentPickupIndex(
        totalPickupStops
      );

      if (
        journeyPhase ===
          "TO_PICKUP" ||
        journeyPhase ===
          "ARRIVED_AT_PICKUP"
      ) {
        setJourneyPhase(
          "TO_CUSTOMER"
        );
      }
    }

    if (
      currentOrder.status ===
      "delivered"
    ) {
      setJourneyPhase("COMPLETED");
      setJourneyLegStartDistance(0);
    }
  }, [
    currentOrder?.status,
  ]);

  function handleAssignRider() {
    if (
      !currentOrder ||
      !selectedRider
    ) {
      return;
    }

    assignRider(
      currentOrder.orderId,
      selectedRider.id,
      selectedRider.name
    );

    assignOrderToRider(
      selectedRider.id,
      currentOrder.orderId
    );
  }

  function handleStartJourney() {
    if (
      !assignedRider ||
      !journeyDestination ||
      !currentOrder
    ) {
      return;
    }

    if (
      distanceToDestination <=
      0.05
    ) {
      if (
        currentOrder.status ===
        "assigned"
      ) {
        setJourneyPhase(
          "ARRIVED_AT_PICKUP"
        );
      } else if (
        currentOrder.status ===
        "picked_up"
      ) {
        setJourneyPhase(
          "ARRIVED_AT_CUSTOMER"
        );
      }

      setJourneyLegStartDistance(0);
      setIsMoving(false);
      return;
    }

    setJourneyLegStartDistance(
      distanceToDestination
    );

    setIsMoving(true);

    if (
      currentOrder.status ===
      "assigned"
    ) {
      setJourneyPhase(
        "TO_PICKUP"
      );
    } else if (
      currentOrder.status ===
      "picked_up"
    ) {
      setJourneyPhase(
        "TO_CUSTOMER"
      );
    }
  }

  function handleStopJourney() {
    setIsMoving(false);
  }

  function handlePickedUp() {
    if (
      !currentOrder ||
      currentOrder.status !==
        "assigned"
    ) {
      return;
    }

    if (
      !assignedRider ||
      distanceToDestination >
        0.05
    ) {
      return;
    }

    const lastPickupIndex =
      currentOrder.pickupStops
        .length - 1;

    setIsMoving(false);
    setJourneyLegStartDistance(0);

    if (
      currentPickupIndex <
      lastPickupIndex
    ) {
      const nextPickupIndex =
        currentPickupIndex + 1;

      setCurrentPickupIndex(
        nextPickupIndex
      );

      setJourneyPhase(
        "TO_PICKUP"
      );

      return;
    }

    setCurrentPickupIndex(
      currentOrder.pickupStops.length
    );

    setJourneyPhase(
      "TO_CUSTOMER"
    );

    updateOrderStatus(
      currentOrder.orderId,
      "picked_up"
    );
  }

  function handleDelivered() {
    if (
      !currentOrder ||
      currentOrder.status !==
        "picked_up"
    ) {
      return;
    }

    if (
      !assignedRider ||
      distanceToDestination >
        0.05
    ) {
      return;
    }

    setIsMoving(false);
    setJourneyLegStartDistance(0);
    setJourneyPhase("COMPLETED");

    updateOrderStatus(
      currentOrder.orderId,
      "delivered"
    );

    if (
      currentOrder.assignedRiderId
    ) {
      clearRiderOrder(
        currentOrder.assignedRiderId
      );
    }
  }

  function handleCancelOrder() {
    if (!currentOrder) {
      return;
    }

    setIsMoving(false);

    updateOrderStatus(
      currentOrder.orderId,
      "cancelled"
    );

    if (
      currentOrder.assignedRiderId
    ) {
      clearRiderOrder(
        currentOrder.assignedRiderId
      );
    }
  }

  if (isLoadingOrders) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>
          Loading orders...
        </Text>
      </View>
    );
  }

  if (!currentOrder) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>
          ðŸšš
        </Text>

        <Text style={styles.emptyTitle}>
          No Delivery Orders
        </Text>

        <Text style={styles.emptyText}>
          Complete a customer checkout
          to create a delivery order.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            router.push("/")
          }
        >
          <Text style={styles.buttonText}>
            Back to Marketplace
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
    >
      <Text style={styles.title}>
        Rider Dashboard
      </Text>

      <Text style={styles.subtitle}>
        CommunityMarket Dispatch
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Delivery Order
        </Text>

        <Text style={styles.orderId}>
          {currentOrder.orderId}
        </Text>

        <View style={styles.divider} />

        <Text style={styles.label}>
          Customer
        </Text>

        <Text style={styles.value}>
          {currentOrder.customerName}
        </Text>

        <Text style={styles.label}>
          Phone
        </Text>

        <Text style={styles.value}>
          {currentOrder.phone}
        </Text>

        <Text style={styles.label}>
          Address
        </Text>

        <Text style={styles.value}>
          {currentOrder.address}
        </Text>

        <Text style={styles.label}>
          Items
        </Text>

        <Text style={styles.value}>
          {orderItemsCount}
        </Text>

        <Text style={styles.label}>
          Distance
        </Text>

        <Text style={styles.value}>
          {currentOrder.distanceKm.toFixed(
            2
          )}{" "}
          km
        </Text>

        <Text style={styles.label}>
          Vehicle
        </Text>

        <Text style={styles.value}>
          {currentOrder.vehicle.toUpperCase()}
        </Text>

        <View
          style={[
            styles.statusBox,
            currentOrder.status ===
              "delivered" &&
              styles.statusDelivered,
          ]}
        >
          <Text style={styles.statusText}>
            STATUS
          </Text>

          <Text style={styles.statusValue}>
            {currentOrder.status
              .replace("_", " ")
              .toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Pickup Stops
        </Text>

        {currentOrder.pickupStops.map(
          (stop, index) => (
            <View
              key={stop.sellerId}
              style={[
                styles.pickupStop,
                index === currentPickupIndex &&
                  currentOrder.status ===
                    "assigned" &&
                  styles.pickupStopActive,
              ]}
            >
              <Text
                style={styles.stopNumber}
              >
                {index + 1}
              </Text>

              <View
                style={styles.stopDetails}
              >
                <Text
                  style={styles.stopSeller}
                >
                  {stop.sellerName}
                </Text>

                <Text
                  style={styles.stopItems}
                >
                  {stop.items.length}{" "}
                  item(s)
                </Text>

                <Text
                  style={styles.coordinates}
                >
                  {stop.latitude.toFixed(
                    5
                  )}
                  ,{" "}
                  {stop.longitude.toFixed(
                    5
                  )}
                </Text>
              </View>
            </View>
          )
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Dispatch Engine
        </Text>

        {!riderForDisplay ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>
              No suitable rider
            </Text>

            <Text style={styles.warningText}>
              There is currently no online,
              available rider with the
              required vehicle.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.riderHeader}>
              <Text style={styles.riderEmoji}>
                ðŸ›µ
              </Text>

              <View>
                <Text
                  style={styles.riderName}
                >
                  {riderForDisplay.name}
                </Text>

                <Text
                  style={styles.riderInfo}
                >
                  {riderForDisplay.vehicle.toUpperCase()}{" "}
                  â€¢ â­{" "}
                  {riderForDisplay.rating.toFixed(
                    1
                  )}
                </Text>
              </View>
            </View>

            {currentOrder.assignedRiderId ? (
              <View
                style={styles.assignedBox}
              >
                <Text
                  style={styles.assignedText}
                >
                  âœ“ Assigned to this order
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.metric}>
                  First pickup:{" "}
                  {dispatchResult?.selectedScore?.firstPickupDistanceKm.toFixed(
                    2
                  )}{" "}
                  km
                </Text>

                <Text style={styles.metric}>
                  Estimated route:{" "}
                  {dispatchResult?.selectedScore?.totalRouteDistanceKm.toFixed(
                    2
                  )}{" "}
                  km
                </Text>

                <Text style={styles.metric}>
                  Dispatch score:{" "}
                  {dispatchResult?.selectedScore?.score.toFixed(
                    2
                  )}
                </Text>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={
                    handleAssignRider
                  }
                >
                  <Text
                    style={styles.buttonText}
                  >
                    Assign Rider
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </View>

      {currentOrder.assignedRiderId &&
        assignedRider && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Live Rider Journey
            </Text>

            <View
              style={[
                styles.movementStatus,
                isMoving &&
                  styles.movementActive,
              ]}
            >
              <Text
                style={styles.movementLabel}
              >
                JOURNEY STATUS
              </Text>

              <Text
                style={styles.movementValue}
              >
                {isMoving
                  ? `MOVING â€¢ ${journeyStage}`
                  : journeyPhase ===
                    "ARRIVED_AT_PICKUP"
                  ? "ARRIVED AT PICKUP"
                  : journeyPhase ===
                    "ARRIVED_AT_CUSTOMER"
                  ? "ARRIVED AT CUSTOMER"
                  : journeyPhase ===
                    "COMPLETED"
                  ? "DELIVERY COMPLETED"
                  : "STOPPED"}
              </Text>
            </View>

            <Text style={styles.label}>
              Current Rider Location
            </Text>

            <Text
              style={styles.coordinate}
            >
              {(
                riderCurrentLocation?.latitude ??
                assignedRider.latitude
              ).toFixed(6)}
              ,{" "}
              {(
                riderCurrentLocation?.longitude ??
                assignedRider.longitude
              ).toFixed(6)}
            </Text>

            <Text style={styles.label}>
              Current Destination
            </Text>

            <Text style={styles.destinationText}>
              {journeyDestinationLabel}
            </Text>

            <Text style={styles.label}>
              Distance Remaining
            </Text>

            <Text style={styles.distance}>
              {displayDistanceToDestination.toFixed(
                2
              )}{" "}
              km
            </Text>

            <Text style={styles.label}>
              Estimated Arrival
            </Text>

            <Text style={styles.etaText}>
              {formatEta(etaMinutes)}
            </Text>

            <Text style={styles.etaNote}>
              Based on simulated{" "}
              {riderSpeedKmh} km/h{" "}
              {currentOrder.vehicle ===
              "bike"
                ? "bike"
                : "keke"}{" "}
              speed.
            </Text>

            <Text style={styles.label}>
              Journey Progress
            </Text>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPercent}%`,
                  },
                ]}
              />
            </View>

            <Text style={styles.progressText}>
              {progressPercent}% â€¢{" "}
              {completedJourneyLegs} of{" "}
              {totalJourneyLegs} legs
              reached
            </Text>

            {currentOrder.status !==
              "delivered" &&
              currentOrder.status !==
                "cancelled" && (
                <>
                  {isMoving ? (
                    <TouchableOpacity
                      style={
                        styles.stopButton
                      }
                      onPress={
                        handleStopJourney
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
                  ) : journeyPhase ===
                    "ARRIVED_AT_PICKUP" ? (
                    <View
                      style={styles.arrivalBox}
                    >
                      <Text
                        style={
                          styles.arrivalText
                        }
                      >
                        âœ“ Rider has arrived at
                        pickup
                      </Text>
                    </View>
                  ) : journeyPhase ===
                    "ARRIVED_AT_CUSTOMER" ? (
                    <View
                      style={styles.arrivalBox}
                    >
                      <Text
                        style={
                          styles.arrivalText
                        }
                      >
                        âœ“ Rider has arrived at
                        customer
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={
                        styles.primaryButton
                      }
                      onPress={
                        handleStartJourney
                      }
                    >
                      <Text
                        style={
                          styles.buttonText
                        }
                      >
                        Start Journey
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
          </View>
        )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Delivery Actions
        </Text>

        {currentOrder.status ===
          "assigned" && (
          <>
            {journeyPhase ===
            "ARRIVED_AT_PICKUP" ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handlePickedUp}
              >
                <Text
                  style={
                    styles.secondaryButtonText
                  }
                >
                  Confirm Pickup
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Rider must arrive at the pickup
                  location before pickup can be
                  confirmed.
                </Text>
              </View>
            )}
          </>
        )}

        {currentOrder.status ===
          "picked_up" && (
          <>
            {journeyPhase ===
            "ARRIVED_AT_CUSTOMER" ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleDelivered}
              >
                <Text style={styles.buttonText}>
                  Complete Delivery
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Rider must arrive at the customer
                  location before delivery can be
                  completed.
                </Text>
              </View>
            )}
          </>
        )}

        {currentOrder.status !==
          "delivered" &&
          currentOrder.status !==
            "cancelled" && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelOrder}
          >
            <Text
              style={
                styles.cancelButtonText
              }
            >
              Cancel Order
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {currentOrder.assignedRiderId &&
        assignedRider && (
          <View style={styles.card}>
            <Text style={styles.successText}>
              âœ“ Rider assignment updated
            </Text>

            <Text style={styles.riderState}>
              Rider:{" "}
              {assignedRider.name}
            </Text>

            <Text style={styles.riderState}>
              Status:{" "}
              {assignedRider.isAvailable
                ? "AVAILABLE"
                : "BUSY"}
            </Text>

            <Text style={styles.riderState}>
              Current Order:{" "}
              {assignedRider.currentOrderId ??
                "None"}
            </Text>
          </View>
        )}

      <View style={styles.mapCard}>
        <Text style={styles.sectionTitle}>
          Customer Location
        </Text>

        <View style={styles.mapContainer}>
          <DeliveryMap
            customerLocation={
              currentOrder.customerLocation
            }
            marketplaceLocation={
              firstPickup ?? {
                latitude:
                  currentOrder
                    .customerLocation
                    .latitude,
                longitude:
                  currentOrder
                    .customerLocation
                    .longitude,
              }
            }
            riderLocation={
              trackedRiderLocation?.location
            }
          />
        </View>

        <Text style={styles.coordinates}>
          Latitude:{" "}
          {currentOrder.customerLocation.latitude.toFixed(
            6
          )}
        </Text>

        <Text style={styles.coordinates}>
          Longitude:{" "}
          {currentOrder.customerLocation.longitude.toFixed(
            6
          )}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Order Summary
        </Text>

        <View style={styles.summaryRow}>
          <Text>Subtotal</Text>

          <Text>
            â‚¦
            {currentOrder.subtotal.toLocaleString()}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text>Delivery Fee</Text>

          <Text>
            â‚¦
            {currentOrder.deliveryFee.toLocaleString()}
          </Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>
            Total
          </Text>

          <Text style={styles.totalValue}>
            â‚¦
            {currentOrder.total.toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.prototypeBox}>
        <Text style={styles.prototypeTitle}>
          Prototype Dispatch System
        </Text>

        <Text style={styles.prototypeText}>
          Rider GPS is currently simulated.
          The rider position updates through
          RiderContext and the same architecture
          can later receive real GPS coordinates
          from a rider's phone.
        </Text>
      </View>
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

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#f5f7f5",
  },

  loadingText: {
    fontSize: 16,
    color: "#555",
  },

  emptyEmoji: {
    fontSize: 50,
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
  },

  emptyText: {
    textAlign: "center",
    color: "#666",
    marginTop: 8,
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
  },

  subtitle: {
    marginTop: 4,
    color: "#2e7d32",
    fontWeight: "700",
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },

  mapCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },

  orderId: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2e7d32",
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },

  label: {
    fontSize: 12,
    color: "#777",
    marginTop: 9,
  },

  value: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },

  statusBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fff3cd",
  },

  statusDelivered: {
    backgroundColor: "#d9f5df",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#666",
  },

  statusValue: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: "900",
  },

  pickupStop: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  stopNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#2e7d32",
    color: "#fff",
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "800",
    paddingTop: 5,
  },

  stopDetails: {
    flex: 1,
    marginLeft: 10,
  },

  stopSeller: {
    fontSize: 15,
    fontWeight: "800",
  },

  stopItems: {
    marginTop: 3,
    color: "#555",
  },

  coordinates: {
    marginTop: 8,
    color: "#777",
    fontSize: 12,
  },

  coordinate: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: "700",
  },

  riderHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  riderEmoji: {
    fontSize: 38,
    marginRight: 12,
  },

  riderName: {
    fontSize: 18,
    fontWeight: "900",
  },

  riderInfo: {
    marginTop: 3,
    color: "#666",
  },

  metric: {
    marginTop: 7,
    color: "#444",
  },

  assignedBox: {
    backgroundColor: "#d9f5df",
    padding: 12,
    borderRadius: 10,
  },

  assignedText: {
    color: "#176b2c",
    fontWeight: "800",
  },

  warningBox: {
    backgroundColor: "#fff3cd",
    padding: 14,
    borderRadius: 10,
  },

  warningTitle: {
    fontWeight: "900",
    fontSize: 16,
  },

  warningText: {
    marginTop: 5,
    color: "#666",
  },

  movementStatus: {
    backgroundColor: "#eeeeee",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },

  movementActive: {
    backgroundColor: "#d9f5df",
  },

  movementLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#777",
  },

  movementValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "900",
  },

  distance: {
    marginTop: 3,
    fontSize: 24,
    fontWeight: "900",
    color: "#2e7d32",
  },

  primaryButton: {
    backgroundColor: "#2e7d32",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 14,
  },

  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2e7d32",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  stopButton: {
    backgroundColor: "#c62828",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 14,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },

  secondaryButtonText: {
    color: "#2e7d32",
    fontWeight: "800",
    fontSize: 15,
  },

  cancelButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c62828",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  cancelButtonText: {
    color: "#c62828",
    fontWeight: "800",
  },

  successText: {
    color: "#176b2c",
    fontWeight: "900",
    fontSize: 15,
  },

  riderState: {
    marginTop: 7,
    color: "#555",
  },

  mapContainer: {
    height: 300,
    overflow: "hidden",
    borderRadius: 12,
    marginBottom: 10,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 8,
    paddingTop: 12,
  },

  totalLabel: {
    fontSize: 17,
    fontWeight: "900",
  },

  totalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#2e7d32",
  },

  arrivalBox: {
    backgroundColor: "#d9f5df",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },

  arrivalText: {
    color: "#176b2c",
    fontWeight: "800",
    textAlign: "center",
  },

  infoBox: {
    backgroundColor: "#fff3cd",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },

  infoText: {
    color: "#665c00",
    lineHeight: 18,
  },

  destinationText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2e7d32",
    marginBottom: 6,
  },

  etaText: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 2,
  },

  etaNote: {
    fontSize: 11,
    color: "#777",
    marginBottom: 8,
  },

  progressTrack: {
    height: 12,
    backgroundColor: "#e0e0e0",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 4,
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#2e7d32",
    borderRadius: 6,
  },

  progressText: {
    marginTop: 6,
    fontSize: 12,
    color: "#555",
    fontWeight: "700",
    marginBottom: 10,
  },

  pickupStopActive: {
    borderWidth: 1,
    borderColor: "#2e7d32",
    borderRadius: 10,
    padding: 8,
  },

  prototypeBox: {
    backgroundColor: "#eeeeee",
    borderRadius: 12,
    padding: 14,
  },

  prototypeTitle: {
    fontWeight: "900",
    marginBottom: 6,
  },

  prototypeText: {
    color: "#666",
    lineHeight: 19,
  },
});

