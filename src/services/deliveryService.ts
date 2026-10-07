import type {
    Delivery,
    GPSLocation,
    PickupStop,
    VehicleType,
} from "../types/community";

export type CreateDeliveryInput = {
  orderId: string;
  vehicle: VehicleType;
  pickupStops: PickupStop[];
  customerLocation: GPSLocation;
  distanceKm: number;
  deliveryFee: number;
};

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

function validatePickupStops(
  pickupStops: PickupStop[]
): void {
  if (
    !Array.isArray(pickupStops) ||
    pickupStops.length === 0
  ) {
    throw new Error(
      "At least one pickup stop is required."
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
      "Pickup stop location"
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
          "Pickup quantity must be a positive integer."
        );
      }
    }
  }
}

export function validateCreateDeliveryInput(
  input: CreateDeliveryInput
): void {
  if (!input) {
    throw new Error(
      "Delivery input is required."
    );
  }

  assertNonEmpty(
    input.orderId,
    "Order ID"
  );

  if (
    input.vehicle !== "bike" &&
    input.vehicle !== "keke"
  ) {
    throw new Error(
      "Invalid delivery vehicle."
    );
  }

  validatePickupStops(
    input.pickupStops
  );

  validateLocation(
    input.customerLocation,
    "Customer location"
  );

  assertValidNumber(
    input.distanceKm,
    "Distance"
  );

  assertValidNumber(
    input.deliveryFee,
    "Delivery fee"
  );
}

export function createDelivery(
  input: CreateDeliveryInput
): Delivery {
  validateCreateDeliveryInput(
    input
  );

  const now =
    new Date().toISOString();

  return {
    id:
      `DEL${Date.now()}`,
    orderId:
      input.orderId,
    status:
      "awaiting_rider",
    vehicle:
      input.vehicle,
    pickupStops:
      input.pickupStops,
    customerLocation:
      input.customerLocation,
    currentLocation:
      input.pickupStops[0].location,
    distanceKm:
      input.distanceKm,
    deliveryFee:
      input.deliveryFee,
    createdAt:
      now,
    updatedAt:
      now,
  };
}

export function assignDeliveryRider(
  delivery: Delivery,
  riderId: string
): Delivery {
  if (!delivery) {
    throw new Error(
      "Delivery is required."
    );
  }

  assertNonEmpty(
    riderId,
    "Rider ID"
  );

  return {
    ...delivery,
    riderId,
    status:
      "assigned",
    updatedAt:
      new Date().toISOString(),
  };
}

export function updateDeliveryStatus(
  delivery: Delivery,
  status: Delivery["status"]
): Delivery {
  if (!delivery) {
    throw new Error(
      "Delivery is required."
    );
  }

  return {
    ...delivery,
    status,
    updatedAt:
      new Date().toISOString(),
  };
}