import {
  createCommunityOrder,
  type CreateOrderInput,
} from "./orderService";

import {
  getOrCreateCustomerId,
} from "./customerIdentity";

import type {
  CommunityOrder,
  GPSLocation,
  VehicleType,
} from "../types/community";

/**
 * Stage 6B.1
 *
 * Existing controlled integration boundary.
 * Kept compatible with the existing service tests.
 */
export async function createOrderThroughService(
  input: CreateOrderInput
): Promise<CommunityOrder> {
  return createCommunityOrder(input);
}

/**
 * Checkout-facing input.
 *
 * customerId is optional for backward compatibility.
 * Authenticated checkout can now provide the real
 * User.id. Older callers continue using customerIdentity.
 */
export type CheckoutOrderInput = {
  customerId?: string;

  customerName: string;
  phone: string;
  address: string;
  customerLocation: GPSLocation;

  items: {
    productId: string;
    productName: string;
    sellerId: string;
    sellerName: string;
    quantity: number;
    unitPrice: number;
  }[];

  pickupStops: {
    sellerId: string;
    sellerName: string;
    latitude: number;
    longitude: number;

    items: {
      productId: string;
      productName: string;
      quantity: number;
    }[];
  }[];

  vehicle: VehicleType;
  distanceKm: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
};

/**
 * Creates a canonical CommunityMarket order.
 *
 * When an authenticated user ID is supplied, it becomes
 * the canonical customerId. Otherwise the legacy customer
 * identity service is used.
 */
export async function createOrderFromCheckout(
  input: CheckoutOrderInput
): Promise<CommunityOrder> {
  const customerId =
    input.customerId?.trim() ||
    await getOrCreateCustomerId();

  const orderInput: CreateOrderInput = {
    customerId,

    customerName:
      input.customerName,

    phone:
      input.phone,

    address:
      input.address,

    customerLocation:
      input.customerLocation,

    items:
      input.items.map((item) => ({
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

        totalPrice:
          item.unitPrice *
          item.quantity,
      })),

    pickupStops:
      input.pickupStops.map(
        (stop) => ({
          id:
            `STOP-${stop.sellerId}`,

          sellerId:
            stop.sellerId,

          sellerName:
            stop.sellerName,

          location: {
            latitude:
              stop.latitude,

            longitude:
              stop.longitude,
          },

          items:
            stop.items,

          status:
            "pending",
        })
      ),

    vehicle:
      input.vehicle,

    distanceKm:
      input.distanceKm,

    subtotal:
      input.subtotal,

    deliveryFee:
      input.deliveryFee,
  };

  return createCommunityOrder(
    orderInput
  );
}