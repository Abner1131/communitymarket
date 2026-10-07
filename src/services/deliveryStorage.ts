import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Delivery } from "../types/community";

const DELIVERY_STORAGE_KEY =
  "@communitymarket/deliveries";

/**
 * Get all saved deliveries.
 */
export async function getDeliveries(): Promise<Delivery[]> {
  const saved =
    await AsyncStorage.getItem(
      DELIVERY_STORAGE_KEY
    );

  if (!saved) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(saved);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    return [];
  } catch (error) {
    console.error(
      "CommunityMarket delivery loading error:",
      error
    );

    return [];
  }
}

/**
 * Save a delivery.
 *
 * Existing delivery IDs are updated.
 * New delivery IDs are appended.
 */
export async function saveDelivery(
  delivery: Delivery
): Promise<Delivery> {
  if (!delivery) {
    throw new Error(
      "Delivery is required."
    );
  }

  const deliveries =
    await getDeliveries();

  const existingIndex =
    deliveries.findIndex(
      (existingDelivery) =>
        existingDelivery.id ===
        delivery.id
    );

  const updatedDeliveries =
    [...deliveries];

  if (existingIndex >= 0) {
    updatedDeliveries[
      existingIndex
    ] = delivery;
  } else {
    updatedDeliveries.push(
      delivery
    );
  }

  await AsyncStorage.setItem(
    DELIVERY_STORAGE_KEY,
    JSON.stringify(
      updatedDeliveries
    )
  );

  return delivery;
}

/**
 * Find a delivery by delivery ID.
 */
export async function getDeliveryById(
  deliveryId: string
): Promise<Delivery | undefined> {
  const deliveries =
    await getDeliveries();

  return deliveries.find(
    (delivery) =>
      delivery.id === deliveryId
  );
}

/**
 * Find a delivery by order ID.
 */
export async function getDeliveryByOrderId(
  orderId: string
): Promise<Delivery | undefined> {
  const deliveries =
    await getDeliveries();

  return deliveries.find(
    (delivery) =>
      delivery.orderId === orderId
  );
}
