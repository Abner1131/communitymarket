import { createOrderFromCheckout } from "./orderAdapter";
import { createTestPayment } from "./paymentAdapter";
import { savePayment, getPaymentById } from "./paymentStorage";
import { createDeliveryForOrder } from "./deliveryAdapter";
import { saveDelivery, getDeliveryById } from "./deliveryStorage";
import { assignDeliveryRider, updateDeliveryStatus } from "./deliveryService";
import { persistLocationUpdate, getLatestRiderLocation, getRiderLocationHistory } from "./trackingService";

// Node/tsx shim for AsyncStorage web implementation.
const storage = new Map<string, string>();

globalThis.window = {
  localStorage: {
    getItem: (key: string) =>
      storage.has(key) ? storage.get(key)! : null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  },
} as any;

async function run() {
  console.log("=== 6G END-TO-END TEST START ===");

  // 1. Create canonical order from real checkout shape.
  const order = await createOrderFromCheckout({
    customerName: "6G Test Customer",
    phone: "08000000000",
    address: "Test Customer Address",
    customerLocation: {
      latitude: 9.0765,
      longitude: 7.3986,
    },
    items: [
      {
        productId: "P001",
        productName: "6G Test Product",
        sellerId: "S001",
        sellerName: "6G Test Seller",
        quantity: 2,
        unitPrice: 5000,
      },
    ],
    pickupStops: [
      {
        sellerId: "S001",
        sellerName: "6G Test Seller",
        latitude: 9.0865,
        longitude: 7.4086,
        items: [
          {
            productId: "P001",
            productName: "6G Test Product",
            quantity: 2,
          },
        ],
      },
    ],
    vehicle: "bike",
    distanceKm: 10,
    subtotal: 10000,
    deliveryFee: 1500,
    total: 11500,
  });

  if (!order.id) {
    throw new Error("Order ID was not created.");
  }

  if (order.total !== 11500) {
    throw new Error(`Unexpected order total: ${order.total}`);
  }

  console.log("ORDER:", order.id);

  // 2. Create and persist payment.
  const payment = createTestPayment(
    order.id,
    order.total
  );

  await savePayment(payment);

  const savedPayment = await getPaymentById(
    payment.id
  );

  if (!savedPayment) {
    throw new Error("Payment was not persisted.");
  }

  if (savedPayment.status !== "paid") {
    throw new Error(`Payment status is ${savedPayment.status}, expected paid.`);
  }

  if (savedPayment.orderId !== order.id) {
    throw new Error("Payment is not linked to the order.");
  }

  console.log("PAYMENT:", savedPayment.id, savedPayment.status);

  // 3. Create and persist delivery.
  let delivery = createDeliveryForOrder(order);
  await saveDelivery(delivery);

  const savedDelivery = await getDeliveryById(
    delivery.id
  );

  if (!savedDelivery) {
    throw new Error("Delivery was not persisted.");
  }

  if (savedDelivery.orderId !== order.id) {
    throw new Error("Delivery is not linked to the order.");
  }

  console.log("DELIVERY:", savedDelivery.id, savedDelivery.status);

  // 4. Assign rider.
  delivery = assignDeliveryRider(
    delivery,
    "R001"
  );

  if (delivery.riderId !== "R001") {
    throw new Error("Rider assignment failed.");
  }

  await saveDelivery(delivery);

  // 5. Move through delivery lifecycle.
  delivery = updateDeliveryStatus(
    delivery,
    "assigned"
  );
  await saveDelivery(delivery);

  delivery = updateDeliveryStatus(
    delivery,
    "picked_up"
  );
  await saveDelivery(delivery);

  // 6. Record rider tracking movement.
  await persistLocationUpdate({
    riderId: "R001",
    location: {
      latitude: 9.0865,
      longitude: 7.4086,
    },
    speedKmh: 25,
    heading: 90,
    accuracyMeters: 10,
  });

  await persistLocationUpdate({
    riderId: "R001",
    location: {
      latitude: 9.0765,
      longitude: 7.3986,
    },
    speedKmh: 20,
    heading: 270,
    accuracyMeters: 8,
  });

  const latestLocation =
    await getLatestRiderLocation("R001");

  const trackingHistory =
    await getRiderLocationHistory("R001");

  if (!latestLocation) {
    throw new Error("Latest rider location was not found.");
  }

  if (trackingHistory.length !== 2) {
    throw new Error(`Expected 2 tracking updates, got ${trackingHistory.length}.`);
  }

  if (latestLocation.location.latitude !== 9.0765) {
    throw new Error("Latest tracked latitude is incorrect.");
  }

  if (latestLocation.location.longitude !== 7.3986) {
    throw new Error("Latest tracked longitude is incorrect.");
  }

  console.log("TRACKING:", trackingHistory.length, "updates");
  console.log("LATEST:", latestLocation.location.latitude, latestLocation.location.longitude);

  // 7. Complete delivery.
  delivery = updateDeliveryStatus(
    delivery,
    "delivered"
  );
  await saveDelivery(delivery);

  const finalDelivery =
    await getDeliveryById(delivery.id);

  if (!finalDelivery) {
    throw new Error("Final delivery could not be loaded.");
  }

  if (finalDelivery.status !== "delivered") {
    throw new Error(`Final delivery status is ${finalDelivery.status}.`);
  }

  if (finalDelivery.riderId !== "R001") {
    throw new Error("Final rider assignment was lost.");
  }

  console.log("FINAL DELIVERY:", finalDelivery.status);
  console.log("=== 6G TEST PASSED ===");
}

run().catch((error) => {
  console.error("=== 6G TEST FAILED ===");
  console.error(error);
  process.exit(1);
});
