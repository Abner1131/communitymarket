import type {
  CommunityOrder,
  GPSLocation,
  OrderItem,
  PickupStop,
  VehicleType,
} from "../types/community";

export type CreateOrderInput = {
  customerId: string;
  customerName: string;
  phone: string;
  address: string;
  customerLocation: GPSLocation;
  items: OrderItem[];
  pickupStops: PickupStop[];
  vehicle: VehicleType;
  distanceKm: number;
  subtotal: number;
  deliveryFee: number;
};

function assertValidNumber(
  value: number,
  fieldName: string
): void {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      `${fieldName} must be a valid non-negative number.`
    );
  }
}

function assertNonEmpty(
  value: string,
  fieldName: string
): void {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `${fieldName} is required.`
    );
  }
}

function validateLocation(
  location: GPSLocation,
  fieldName: string
): void {
  if (
    !location ||
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude)
  ) {
    throw new Error(
      `${fieldName} is invalid.`
    );
  }

  if (
    location.latitude < -90 ||
    location.latitude > 90
  ) {
    throw new Error(
      `${fieldName}.latitude is invalid.`
    );
  }

  if (
    location.longitude < -180 ||
    location.longitude > 180
  ) {
    throw new Error(
      `${fieldName}.longitude is invalid.`
    );
  }
}

function validateOrderItems(
  items: OrderItem[]
): void {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new Error(
      "An order must contain at least one item."
    );
  }

  for (const item of items) {
    assertNonEmpty(
      item.productId,
      "Product ID"
    );

    assertNonEmpty(
      item.productName,
      "Product name"
    );

    assertNonEmpty(
      item.sellerId,
      "Seller ID"
    );

    assertNonEmpty(
      item.sellerName,
      "Seller name"
    );

    if (
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new Error(
        "Item quantity must be a positive integer."
      );
    }

    assertValidNumber(
      item.unitPrice,
      "Item unit price"
    );

    assertValidNumber(
      item.totalPrice,
      "Item total price"
    );

    const expectedTotal =
      item.unitPrice * item.quantity;

    if (
      Math.abs(
        item.totalPrice - expectedTotal
      ) > 0.01
    ) {
      throw new Error(
        `Invalid total price for ${item.productName}.`
      );
    }
  }
}

function validatePickupStops(
  pickupStops: PickupStop[]
): void {
  if (
    !Array.isArray(pickupStops) ||
    pickupStops.length === 0
  ) {
    throw new Error(
      "An order must contain at least one pickup stop."
    );
  }

  for (const stop of pickupStops) {
    assertNonEmpty(
      stop.id,
      "Pickup stop ID"
    );

    assertNonEmpty(
      stop.sellerId,
      "Pickup seller ID"
    );

    assertNonEmpty(
      stop.sellerName,
      "Pickup seller name"
    );

    validateLocation(
      stop.location,
      "Pickup location"
    );

    if (
      !Array.isArray(stop.items) ||
      stop.items.length === 0
    ) {
      throw new Error(
        `Pickup stop ${stop.id} must contain items.`
      );
    }

    for (const item of stop.items) {
      assertNonEmpty(
        item.productId,
        "Pickup product ID"
      );

      assertNonEmpty(
        item.productName,
        "Pickup product name"
      );

      if (
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        throw new Error(
          "Pickup item quantity must be a positive integer."
        );
      }
    }
  }
}

export function validateCreateOrderInput(
  input: CreateOrderInput
): void {
  if (!input) {
    throw new Error(
      "Order input is required."
    );
  }

  assertNonEmpty(
    input.customerId,
    "Customer ID"
  );

  assertNonEmpty(
    input.customerName,
    "Customer name"
  );

  assertNonEmpty(
    input.phone,
    "Customer phone"
  );

  assertNonEmpty(
    input.address,
    "Customer address"
  );

  validateLocation(
    input.customerLocation,
    "Customer location"
  );

  validateOrderItems(
    input.items
  );

  validatePickupStops(
    input.pickupStops
  );

  if (
    input.vehicle !== "bike" &&
    input.vehicle !== "keke"
  ) {
    throw new Error(
      "Invalid delivery vehicle."
    );
  }

  assertValidNumber(
    input.distanceKm,
    "Distance"
  );

  assertValidNumber(
    input.subtotal,
    "Subtotal"
  );

  assertValidNumber(
    input.deliveryFee,
    "Delivery fee"
  );

  const calculatedSubtotal =
    input.items.reduce(
      (sum, item) =>
        sum + item.totalPrice,
      0
    );

  if (
    Math.abs(
      calculatedSubtotal -
        input.subtotal
    ) > 0.01
  ) {
    throw new Error(
      "Order subtotal does not match its items."
    );
  }
}

export function calculateOrderTotal(
  subtotal: number,
  deliveryFee: number
): number {
  assertValidNumber(
    subtotal,
    "Subtotal"
  );

  assertValidNumber(
    deliveryFee,
    "Delivery fee"
  );

  return subtotal + deliveryFee;
}

export function createCommunityOrder(
  input: CreateOrderInput
): CommunityOrder {
  validateCreateOrderInput(input);

  const now =
    new Date().toISOString();

  const orderId =
    `CM${Date.now()}`;

  return {
    id: orderId,
    customerId:
      input.customerId,
    customerName:
      input.customerName,
    phone:
      input.phone,
    address:
      input.address,
    customerLocation:
      input.customerLocation,
    items:
      input.items,
    pickupStops:
      input.pickupStops,
    vehicle:
      input.vehicle,
    distanceKm:
      input.distanceKm,
    subtotal:
      input.subtotal,
    deliveryFee:
      input.deliveryFee,
    total:
      calculateOrderTotal(
        input.subtotal,
        input.deliveryFee
      ),
    status:
      "pending",
    createdAt:
      now,
    updatedAt:
      now,
  };
}