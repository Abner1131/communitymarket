import {
    createDeliveryForOrder,
} from "./deliveryAdapter";

import type {
    CommunityOrder,
} from "../types/community";

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(message);
  }
}

function runDeliveryAdapterTest() {
  console.log(
    "=== 6E.4 DELIVERY ADAPTER RUNTIME TEST ==="
  );

  /*
   * VALID DELIVERY
   */
  try {
    const order: CommunityOrder = {
      id:
        "CM1789991590574",

      customerId:
        "CM-CUST-test123",

      customerName:
        "Abner Tsambi",

      phone:
        "1234556678",

      address:
        "house",

      customerLocation: {
        latitude:
          9.0567,
        longitude:
          7.4969,
      },

      items: [
        {
          productId:
            "PRODUCT001",

          productName:
            "Test Product",

          sellerId:
            "SELLER001",

          sellerName:
            "Community Foods",

          quantity:
            2,

          unitPrice:
            5000,

          totalPrice:
            10000,
        },
      ],

      pickupStops: [
        {
          id:
            "STOP-SELLER001",

          sellerId:
            "SELLER001",

          sellerName:
            "Community Foods",

          location: {
            latitude:
              10.3158,
            longitude:
              9.8442,
          },

          items: [
            {
              productId:
                "PRODUCT001",

              productName:
                "Test Product",

              quantity:
                2,
            },
          ],

          status:
            "pending",
        },
      ],

      vehicle:
        "bike",

      distanceKm:
        116.58,

      subtotal:
        10000,

      deliveryFee:
        21425,

      total:
        31425,

      status:
        "pending",

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),
    };

    const delivery =
      createDeliveryForOrder(
        order
      );

    assert(
      delivery.orderId ===
        order.id,
      "Delivery order ID mismatch."
    );

    assert(
      delivery.vehicle ===
        order.vehicle,
      "Delivery vehicle mismatch."
    );

    assert(
      delivery.pickupStops.length ===
        order.pickupStops.length,
      "Pickup stop count mismatch."
    );

    assert(
      delivery.customerLocation.latitude ===
        order.customerLocation.latitude,
      "Customer latitude mismatch."
    );

    assert(
      delivery.customerLocation.longitude ===
        order.customerLocation.longitude,
      "Customer longitude mismatch."
    );

    assert(
      delivery.distanceKm ===
        order.distanceKm,
      "Distance mismatch."
    );

    assert(
      delivery.deliveryFee ===
        order.deliveryFee,
      "Delivery fee mismatch."
    );

    assert(
      delivery.status ===
        "awaiting_rider",
      "Initial delivery status should be awaiting_rider."
    );

    assert(
      delivery.id.startsWith("DEL"),
      "Delivery ID should start with DEL."
    );

    console.log(
      "VALID DELIVERY PASSED"
    );

    console.log(
      "Delivery ID:",
      delivery.id
    );

    console.log(
      "Order ID:",
      delivery.orderId
    );

    console.log(
      "Status:",
      delivery.status
    );
  } catch (error) {
    console.error(
      "VALID DELIVERY FAILED"
    );

    console.error(
      error
    );

    throw error;
  }

  /*
   * INVALID DELIVERY
   */
  try {
    createDeliveryForOrder(
      null as unknown as CommunityOrder
    );

    throw new Error(
      "Invalid delivery was incorrectly accepted."
    );
  } catch (error) {
    console.log(
      "INVALID DELIVERY REJECTED"
    );

    console.log(
      "Error:",
      error
    );
  }

  console.log(
    "=== 6E.4 TEST PASSED ==="
  );
}

runDeliveryAdapterTest();