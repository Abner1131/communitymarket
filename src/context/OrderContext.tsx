import AsyncStorage from "@react-native-async-storage/async-storage";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  automaticallyDispatchOrders,
} from "../services/automaticDispatch";

import {
  assignDeliveryRider,
  updateDeliveryStatus,
} from "../services/deliveryService";

import {
  getDeliveryByOrderId,
  saveDelivery,
} from "../services/deliveryStorage";

import type {
  DeliveryStatus,
  CommunityOrder as ServiceCommunityOrder,
} from "../types/community";

import { useRiders } from "./RiderContext";

export type OrderStatus =
  | "pending"
  | "dispatching"
  | "assigned"
  | "picked_up"
  | "delivered"
  | "cancelled";

export type PickupStopItem = {
  productId: string;
  productName: string;
  quantity: number;
};

export type PickupStop = {
  sellerId: string;
  sellerName: string;
  latitude: number;
  longitude: number;
  items: PickupStopItem[];
};

export type OrderItem = {
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
  quantity: number;
  unitPrice: number;
};

export type CustomerLocation = {
  latitude: number;
  longitude: number;
};

export type CommunityOrder = {
  orderId: string;
  customerId?: string;
  customerName: string;
  phone: string;
  address: string;
  customerLocation: CustomerLocation;
  items: OrderItem[];
  pickupStops: PickupStop[];
  vehicle: "bike" | "keke";
  distanceKm: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  paymentId?: string;
  deliveryId?: string;

  /*
   * Rider assignment history.
   *
   * assignedRiderId / assignedRiderName are kept
   * for order history.
   *
   * riderAssignmentActive tells the rider engine
   * whether this assignment is currently occupying
   * the rider.
   */
  assignedRiderId?: string;
  assignedRiderName?: string;
  riderAssignmentActive?: boolean;

  createdAt: string;
};

type NewOrder = Omit<
  CommunityOrder,
  | "orderId"
  | "status"
  | "createdAt"
  | "riderAssignmentActive"
>;

type OrderContextType = {
  orders: CommunityOrder[];

  isLoadingOrders: boolean;

  createOrder: (
    order: NewOrder
  ) => CommunityOrder;

  registerServiceOrder: (
    order: ServiceCommunityOrder,
    paymentId?: string,
    deliveryId?: string
  ) => CommunityOrder;

  updateOrderStatus: (
    orderId: string,
    status: OrderStatus
  ) => void;

  assignRider: (
    orderId: string,
    riderId: string,
    riderName: string
  ) => void;

  getPendingOrders: () => CommunityOrder[];

  getOrderById: (
    orderId: string
  ) => CommunityOrder | undefined;
};

const OrderContext =
  createContext<
    OrderContextType | undefined
  >(undefined);

const STORAGE_KEY =
  "@communitymarket/orders";

export function OrderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    riders,
    assignOrderToRider,
    clearRiderOrder,
  } = useRiders();

  const [orders, setOrders] =
    useState<CommunityOrder[]>([]);

  const [
    isLoadingOrders,
    setIsLoadingOrders,
  ] = useState(true);

  /*
   * LOAD SAVED ORDERS
   */
  useEffect(() => {
    async function loadOrders() {
      try {
        const saved =
          await AsyncStorage.getItem(
            STORAGE_KEY
          );

        if (!saved) {
          return;
        }

        const parsed =
          JSON.parse(saved);

        if (!Array.isArray(parsed)) {
          return;
        }

        /*
         * Legacy orders created before
         * riderAssignmentActive existed
         * are treated as historical orders.
         *
         * New assignments created by the
         * current system explicitly set this
         * field to true.
         */
        const normalizedOrders =
          parsed.map(
            (order) => ({
              ...order,
              riderAssignmentActive:
                order.riderAssignmentActive ===
                true,
            })
          );

        setOrders(
          normalizedOrders as CommunityOrder[]
        );
      } catch (error) {
        console.error(
          "CommunityMarket order loading error:",
          error
        );
      } finally {
        setIsLoadingOrders(false);
      }
    }

    loadOrders();
  }, []);

  /*
   * SAVE ORDERS
   */
  useEffect(() => {
    if (isLoadingOrders) {
      return;
    }

    async function saveOrders() {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(orders)
        );
      } catch (error) {
        console.error(
          "CommunityMarket order saving error:",
          error
        );
      }
    }

    saveOrders();
  }, [
    orders,
    isLoadingOrders,
  ]);

  /*
   * LIVE ORDER STORAGE SYNC
   *
   * AsyncStorage is acting as the shared
   * prototype order store.
   *
   * Poll storage so newly created orders
   * appear without refreshing the dashboard.
   *
   * Incoming storage state is merged instead
   * of blindly replacing newer local state.
   */
  useEffect(() => {
    if (isLoadingOrders) {
      return;
    }

    let active = true;

    async function syncOrdersFromStorage() {
      try {
        const saved =
          await AsyncStorage.getItem(
            STORAGE_KEY
          );

        if (!saved || !active) {
          return;
        }

        const parsed =
          JSON.parse(saved);

        if (!Array.isArray(parsed)) {
          return;
        }

        const incomingOrders =
          parsed.map(
            (order) => ({
              ...order,
              riderAssignmentActive:
                order.riderAssignmentActive ===
                true,
            })
          ) as CommunityOrder[];

        setOrders(
          (current) => {
            const currentById =
              new Map(
                current.map(
                  (order) => [
                    order.orderId,
                    order,
                  ]
                )
              );

            const incomingById =
              new Map(
                incomingOrders.map(
                  (order) => [
                    order.orderId,
                    order,
                  ]
                )
              );

            const statusRank:
              Record<OrderStatus, number> = {
                pending: 0,
                dispatching: 1,
                assigned: 2,
                picked_up: 3,
                delivered: 4,
                cancelled: 4,
              };

            const mergedById =
              new Map<
                string,
                CommunityOrder
              >();

            for (
              const [
                orderId,
                incomingOrder,
              ] of incomingById
            ) {
              const currentOrder =
                currentById.get(
                  orderId
                );

              if (!currentOrder) {
                mergedById.set(
                  orderId,
                  incomingOrder
                );
                continue;
              }

              const currentRank =
                statusRank[
                  currentOrder.status
                ];

              const incomingRank =
                statusRank[
                  incomingOrder.status
                ];

              /*
               * Never let an older/lower-status
               * storage snapshot roll back newer
               * local state.
               */
              if (
                currentRank >
                incomingRank
              ) {
                mergedById.set(
                  orderId,
                  currentOrder
                );
                continue;
              }

              /*
               * Preserve a currently active rider
               * assignment when an older storage
               * snapshot says the same order is
               * inactive.
               */
              if (
                currentOrder
                  .riderAssignmentActive &&
                !incomingOrder
                  .riderAssignmentActive
              ) {
                mergedById.set(
                  orderId,
                  currentOrder
                );
                continue;
              }

              /*
               * Preserve an existing rider identity
               * when an incoming snapshot has lost
               * the rider fields.
               */
              if (
                currentRank ===
                  incomingRank &&
                currentOrder.assignedRiderId &&
                !incomingOrder.assignedRiderId
              ) {
                mergedById.set(
                  orderId,
                  currentOrder
                );
                continue;
              }

              mergedById.set(
                orderId,
                incomingOrder
              );
            }

            /*
             * Keep local orders that do not yet
             * exist in the incoming storage copy.
             */
            for (
              const [
                orderId,
                currentOrder,
              ] of currentById
            ) {
              if (
                !incomingById.has(
                  orderId
                )
              ) {
                mergedById.set(
                  orderId,
                  currentOrder
                );
              }
            }

            const mergedOrders =
              Array.from(
                mergedById.values()
              );

            if (
              JSON.stringify(current) ===
              JSON.stringify(
                mergedOrders
              )
            ) {
              return current;
            }

            return mergedOrders;
          }
        );
      } catch (error) {
        console.warn(
          "LIVE ORDER STORAGE SYNC FAILED:",
          error
        );
      }
    }

    const intervalId =
      setInterval(
        syncOrdersFromStorage,
        1000
      );

    return () => {
      active = false;
      clearInterval(
        intervalId
      );
    };
  }, [
    isLoadingOrders,
  ]);

  /*
   * RIDER ASSIGNMENT RECONCILIATION
   *
   * Only assignments explicitly marked
   * riderAssignmentActive === true are
   * considered current rider work.
   *
   * Older orders may still retain
   * assignedRiderId for history, but they
   * no longer keep a rider BUSY.
   */
  useEffect(() => {
    if (isLoadingOrders) {
      return;
    }

    const activeOrders =
      orders
        .filter(
          (order) =>
            (
              order.status ===
                "assigned" ||
              order.status ===
                "picked_up"
            ) &&
            !!order.assignedRiderId &&
            order.riderAssignmentActive ===
              true
        )
        .sort(
          (a, b) =>
            new Date(
              b.createdAt
            ).getTime() -
            new Date(
              a.createdAt
            ).getTime()
        );

    const activeOrderByRider =
      new Map<
        string,
        CommunityOrder
      >();

    for (
      const order of activeOrders
    ) {
      if (
        !order.assignedRiderId ||
        activeOrderByRider.has(
          order.assignedRiderId
        )
      ) {
        continue;
      }

      activeOrderByRider.set(
        order.assignedRiderId,
        order
      );
    }

    for (
      const rider of riders
    ) {
      const activeOrder =
        activeOrderByRider.get(
          rider.id
        );

      /*
       * No currently active order:
       * release the rider.
       */
      if (!activeOrder) {
        if (
          rider.currentOrderId
        ) {
          clearRiderOrder(
            rider.id
          );
        }

        continue;
      }

      /*
       * The rider must reflect the
       * currently active assignment.
       */
      if (
        rider.currentOrderId !==
        activeOrder.orderId
      ) {
        assignOrderToRider(
          rider.id,
          activeOrder.orderId
        );
      }
    }
  }, [
    orders,
    riders,
    isLoadingOrders,
    assignOrderToRider,
    clearRiderOrder,
  ]);

  /*
   * AUTOMATIC DISPATCH
   */
  useEffect(() => {
    if (isLoadingOrders) {
      return;
    }

    const dispatchableOrders =
      orders.filter(
        (order) =>
          (
            order.status ===
              "pending" ||
            order.status ===
              "dispatching"
          ) &&
          !order.assignedRiderId
      );

    if (
      dispatchableOrders.length ===
      0
    ) {
      return;
    }

    const result =
      automaticallyDispatchOrders(
        dispatchableOrders,
        riders
      );

    for (
      const assignment of
        result.assignments
    ) {
      if (
        !assignment.assigned ||
        !assignment.riderId ||
        !assignment.riderName
      ) {
        continue;
      }

      assignRider(
        assignment.orderId,
        assignment.riderId,
        assignment.riderName
      );

      assignOrderToRider(
        assignment.riderId,
        assignment.orderId
      );
    }
  }, [
    orders,
    riders,
    isLoadingOrders,
  ]);

  /*
   * CREATE ORDER
   *
   * Existing application flow.
   */
  function createOrder(
    order: NewOrder
  ): CommunityOrder {
    const newOrder:
      CommunityOrder = {
        ...order,

        orderId:
          `CM${Date.now()
            .toString()
            .slice(-8)}`,

        status:
          "dispatching",

        riderAssignmentActive:
          false,

        createdAt:
          new Date().toISOString(),
      };

    setOrders(
      (current) => [
        ...current,
        newOrder,
      ]
    );

    return newOrder;
  }

  /*
   * REGISTER SERVICE ORDER
   *
   * Bridges the canonical service order
   * into the existing application order model.
   */
  function registerServiceOrder(
    order: ServiceCommunityOrder,
    paymentId?: string,
    deliveryId?: string
  ): CommunityOrder {
    const legacyOrder:
      CommunityOrder = {
        orderId:
          order.id,

        customerId:
          order.customerId,

        customerName:
          order.customerName,

        phone:
          order.phone,

        address:
          order.address,

        customerLocation:
          order.customerLocation,

        items:
          order.items.map(
            (item) => ({
              productId:
                item.productId,

              productName:
                item.productName,

              sellerId:
                item.sellerId,

              sellerName:
                item.sellerName,

              quantity:
                item.quantity,

              unitPrice:
                item.unitPrice,
            })
          ),

        pickupStops:
          order.pickupStops.map(
            (stop) => ({
              sellerId:
                stop.sellerId,

              sellerName:
                stop.sellerName,

              latitude:
                stop.location
                  .latitude,

              longitude:
                stop.location
                  .longitude,

              items:
                stop.items,
            })
          ),

        vehicle:
          order.vehicle,

        distanceKm:
          order.distanceKm,

        subtotal:
          order.subtotal,

        deliveryFee:
          order.deliveryFee,

        total:
          order.total,

        status:
          order.status,

        paymentId:
          paymentId ??
          order.paymentId,

        deliveryId:
          deliveryId ??
          order.deliveryId,

        assignedRiderId:
          undefined,

        assignedRiderName:
          undefined,

        riderAssignmentActive:
          false,

        createdAt:
          order.createdAt,
      };

    setOrders(
      (current) => {
        const alreadyExists =
          current.some(
            (existingOrder) =>
              existingOrder.orderId ===
              legacyOrder.orderId
          );

        if (alreadyExists) {
          return current;
        }

        return [
          ...current,
          legacyOrder,
        ];
      }
    );

    return legacyOrder;
  }

  /*
   * MAP ORDER STATUS TO DELIVERY STATUS
   */
  function mapOrderStatusToDeliveryStatus(
    status: OrderStatus
  ): DeliveryStatus | undefined {
    switch (status) {
      case "pending":
      case "dispatching":
        return "awaiting_rider";

      case "assigned":
        return "assigned";

      case "picked_up":
        return "picked_up";

      case "delivered":
        return "delivered";

      case "cancelled":
        return "cancelled";

      default:
        return undefined;
    }
  }

  /*
   * SYNC CANONICAL DELIVERY
   */
  function syncCanonicalDelivery(
    orderId: string,
    status: OrderStatus,
    riderId?: string
  ): void {
    void (async () => {
      try {
        let delivery =
          await getDeliveryByOrderId(
            orderId
          );

        if (!delivery) {
          return;
        }

        if (riderId) {
          delivery =
            assignDeliveryRider(
              delivery,
              riderId
            );
        }

        const deliveryStatus =
          mapOrderStatusToDeliveryStatus(
            status
          );

        if (deliveryStatus) {
          delivery =
            updateDeliveryStatus(
              delivery,
              deliveryStatus
            );
        }

        await saveDelivery(
          delivery
        );

        console.log(
          "CANONICAL DELIVERY SYNCED:",
          delivery.id,
          delivery.status
        );
      } catch (error) {
        console.error(
          "CANONICAL DELIVERY SYNC ERROR:",
          error
        );
      }
    })();
  }

  /*
   * UPDATE ORDER STATUS
   *
   * Terminal statuses release the rider,
   * but keep assignedRiderId/name so the
   * order history still shows who delivered
   * or was assigned to the order.
   */
  function updateOrderStatus(
    orderId: string,
    status: OrderStatus
  ) {
    const terminal =
      status === "delivered" ||
      status === "cancelled";

    const completedOrder =
      orders.find(
        (order) =>
          order.orderId ===
          orderId
      );

    setOrders(
      (current) =>
        current.map(
          (order) =>
            order.orderId ===
            orderId
              ? {
                  ...order,

                  status,

                  riderAssignmentActive:
                    terminal
                      ? false
                      : order
                          .riderAssignmentActive,
                }
              : order
        )
    );

    syncCanonicalDelivery(
      orderId,
      status
    );

    if (
      terminal &&
      completedOrder?.assignedRiderId
    ) {
      clearRiderOrder(
        completedOrder.assignedRiderId
      );
    }
  }

  /*
   * ASSIGN RIDER
   *
   * This creates a current/live rider
   * assignment.
   */
  function assignRider(
    orderId: string,
    riderId: string,
    riderName: string
  ) {
    setOrders(
      (current) =>
        current.map(
          (order) =>
            order.orderId ===
            orderId
              ? {
                  ...order,

                  assignedRiderId:
                    riderId,

                  assignedRiderName:
                    riderName,

                  riderAssignmentActive:
                    true,

                  status:
                    "assigned",
                }
              : order
        )
    );

    syncCanonicalDelivery(
      orderId,
      "assigned",
      riderId
    );
  }

  /*
   * GET PENDING / DISPATCHING ORDERS
   */
  function getPendingOrders() {
    return orders.filter(
      (order) =>
        order.status ===
          "pending" ||
        order.status ===
          "dispatching"
    );
  }

  /*
   * GET ORDER BY ID
   */
  function getOrderById(
    orderId: string
  ) {
    return orders.find(
      (order) =>
        order.orderId ===
        orderId
    );
  }

  const value = useMemo(
    () => ({
      orders,
      isLoadingOrders,
      createOrder,
      registerServiceOrder,
      updateOrderStatus,
      assignRider,
      getPendingOrders,
      getOrderById,
    }),
    [
      orders,
      isLoadingOrders,
    ]
  );

  return (
    <OrderContext.Provider
      value={value}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context =
    useContext(OrderContext);

  if (!context) {
    throw new Error(
      "useOrders must be used inside OrderProvider"
    );
  }

  return context;
}