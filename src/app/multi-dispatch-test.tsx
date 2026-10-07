import { useMemo } from "react";

import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { useOrders } from "../context/OrderContext";
import { useRiders } from "../context/RiderContext";

import {
    dispatchMultipleOrders,
} from "../services/multiDispatchEngine";

export default function MultiDispatchTestScreen() {
  const { orders } = useOrders();
  const { riders } = useRiders();

  /*
   * Only orders waiting for dispatch
   * are sent to the dispatch engine.
   */
  const pendingOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "pending" ||
          order.status === "dispatching"
      ),
    [orders]
  );

  /*
   * Convert CommunityMarket orders
   * into DispatchEngine orders.
   */
  const dispatchOrders = useMemo(
    () =>
      pendingOrders.map(
        (order) => ({
          orderId:
            order.orderId,

          pickupStops:
            order.pickupStops.map(
              (stop) => ({
                sellerId:
                  stop.sellerId,

                sellerName:
                  stop.sellerName,

                latitude:
                  stop.latitude,

                longitude:
                  stop.longitude,
              })
            ),

          customerLocation: {
            latitude:
              order.customerLocation
                .latitude,

            longitude:
              order.customerLocation
                .longitude,
          },

          vehicle:
            order.vehicle,
        })
      ),
    [pendingOrders]
  );

  const result = useMemo(
    () =>
      dispatchMultipleOrders(
        dispatchOrders,
        riders
      ),
    [dispatchOrders, riders]
  );

  const assignedCount =
    result.assignments.filter(
      (assignment) =>
        assignment.assigned
    ).length;

  const unassignedCount =
    result.assignments.length -
    assignedCount;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
    >
      <Text style={styles.title}>
        CommunityMarket Dispatch
      </Text>

      <Text style={styles.subtitle}>
        Live Order Dispatch
      </Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>
          Dispatch Summary
        </Text>

        <Text style={styles.summaryText}>
          Total Orders: {orders.length}
        </Text>

        <Text style={styles.summaryText}>
          Pending Orders:{" "}
          {pendingOrders.length}
        </Text>

        <Text style={styles.summaryText}>
          Available Riders:{" "}
          {
            riders.filter(
              (rider) =>
                rider.isOnline &&
                rider.isAvailable &&
                !rider.currentOrderId
            ).length
          }
        </Text>

        <Text style={styles.successText}>
          Assigned: {assignedCount}
        </Text>

        <Text style={styles.warningText}>
          Unassigned: {unassignedCount}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Real CommunityMarket Orders
        </Text>

        {pendingOrders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>
              📦
            </Text>

            <Text style={styles.emptyTitle}>
              No pending orders
            </Text>

            <Text style={styles.emptyText}>
              Create an order through the
              normal CommunityMarket
              checkout flow and it will
              appear here automatically.
            </Text>
          </View>
        ) : (
          pendingOrders.map(
            (order) => {
              const assignment =
                result.assignments.find(
                  (item) =>
                    item.orderId ===
                    order.orderId
                );

              return (
                <View
                  key={order.orderId}
                  style={styles.assignment}
                >
                  <Text
                    style={styles.orderId}
                  >
                    {order.orderId}
                  </Text>

                  <Text
                    style={styles.customer}
                  >
                    Customer:{" "}
                    {order.customerName}
                  </Text>

                  <Text
                    style={styles.orderDetails}
                  >
                    {order.vehicle.toUpperCase()}{" "}
                    •{" "}
                    {order.pickupStops.length}{" "}
                    pickup stop(s)
                  </Text>

                  {assignment
                    ?.assigned ? (
                    <>
                      <Text
                        style={
                          styles.assigned
                        }
                      >
                        ✓ RIDER ASSIGNED
                      </Text>

                      <Text
                        style={
                          styles.rider
                        }
                      >
                        {
                          assignment.riderName
                        }
                      </Text>

                      <Text
                        style={
                          styles.riderId
                        }
                      >
                        Rider ID:{" "}
                        {
                          assignment.riderId
                        }
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text
                        style={
                          styles.unassigned
                        }
                      >
                        ✕ NO RIDER
                      </Text>

                      <Text
                        style={styles.reason}
                      >
                        {assignment
                          ?.reason ||
                          "No suitable rider available."}
                      </Text>
                    </>
                  )}
                </View>
              );
            }
          )
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Rider Allocation
        </Text>

        {riders.map(
          (rider) => (
            <View
              key={rider.id}
              style={styles.riderRow}
            >
              <View
                style={styles.riderInfo}
              >
                <Text
                  style={
                    styles.riderName
                  }
                >
                  {rider.name}
                </Text>

                <Text
                  style={
                    styles.riderDetails
                  }
                >
                  {rider.vehicle.toUpperCase()}{" "}
                  • ⭐{" "}
                  {rider.rating.toFixed(
                    1
                  )}
                </Text>
              </View>

              <View
                style={
                  rider.currentOrderId
                    ? styles.busyBadge
                    : rider.isAvailable &&
                      rider.isOnline
                    ? styles.availableBadge
                    : styles.offlineBadge
                }
              >
                <Text
                  style={
                    rider.currentOrderId
                      ? styles.busyText
                      : rider.isAvailable &&
                        rider.isOnline
                      ? styles.availableText
                      : styles.offlineText
                  }
                >
                  {rider.currentOrderId
                    ? `BUSY • ${rider.currentOrderId}`
                    : rider.isAvailable &&
                      rider.isOnline
                    ? "AVAILABLE"
                    : "OFFLINE"}
                </Text>
              </View>
            </View>
          )
        )}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>
          Live Dispatch Architecture
        </Text>

        <Text style={styles.infoText}>
          CommunityMarket orders are now
          read directly from OrderContext.
          Pending orders are converted into
          dispatch jobs and matched against
          currently available riders.
        </Text>

        <Text style={styles.infoText}>
          The same rider cannot be assigned
          to multiple orders during the same
          dispatch cycle.
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

  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },

  summaryTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },

  summaryText: {
    marginTop: 5,
    color: "#555",
  },

  successText: {
    marginTop: 7,
    color: "#176b2c",
    fontWeight: "900",
  },

  warningText: {
    marginTop: 7,
    color: "#a66a00",
    fontWeight: "800",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },

  assignment: {
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 12,
  },

  orderId: {
    fontWeight: "900",
    color: "#2e7d32",
  },

  customer: {
    marginTop: 5,
    fontWeight: "700",
  },

  orderDetails: {
    marginTop: 4,
    color: "#777",
    fontSize: 12,
  },

  assigned: {
    marginTop: 8,
    color: "#176b2c",
    fontWeight: "900",
  },

  rider: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "800",
  },

  riderId: {
    marginTop: 2,
    color: "#777",
    fontSize: 12,
  },

  unassigned: {
    marginTop: 8,
    color: "#c62828",
    fontWeight: "900",
  },

  reason: {
    marginTop: 3,
    color: "#777",
    fontSize: 12,
  },

  riderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  riderInfo: {
    flex: 1,
  },

  riderName: {
    fontWeight: "800",
    fontSize: 15,
  },

  riderDetails: {
    marginTop: 3,
    color: "#777",
    fontSize: 12,
  },

  availableBadge: {
    backgroundColor: "#d9f5df",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },

  busyBadge: {
    backgroundColor: "#fff3cd",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: 170,
  },

  offlineBadge: {
    backgroundColor: "#eeeeee",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },

  availableText: {
    color: "#176b2c",
    fontSize: 11,
    fontWeight: "900",
  },

  busyText: {
    color: "#8a5a00",
    fontSize: 11,
    fontWeight: "900",
  },

  offlineText: {
    color: "#777",
    fontSize: 11,
    fontWeight: "900",
  },

  emptyBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },

  emptyEmoji: {
    fontSize: 38,
    marginBottom: 8,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
  },

  emptyText: {
    marginTop: 6,
    color: "#777",
    textAlign: "center",
    lineHeight: 18,
  },

  infoBox: {
    backgroundColor: "#eeeeee",
    borderRadius: 12,
    padding: 14,
  },

  infoTitle: {
    fontWeight: "900",
    marginBottom: 6,
  },

  infoText: {
    color: "#666",
    lineHeight: 19,
    marginBottom: 8,
  },
});