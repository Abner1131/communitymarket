import { createOrderThroughService } from "./orderAdapter";

async function runOrderAdapterTest() {
  console.log("=== 6B.4 ORDER ADAPTER RUNTIME TEST ===");

  // --------------------------------------------------
  // TEST 1: Valid order
  // --------------------------------------------------

  const validOrder = await createOrderThroughService({
    customerId: "CUSTOMER001",
    customerName: "Abner Tsambi",
    phone: "12345678901",
    address: "wgjjdydhdj",

    customerLocation: {
      latitude: 9.881518,
      longitude: 8.874902,
    },

    items: [
      {
        productId: "1",
        productName: "Premium Rice 25kg",
        sellerId: "SELLER001",
        sellerName: "Community Foods",
        quantity: 1,
        unitPrice: 25000,
        totalPrice: 25000,
      },
      {
        productId: "6",
        productName: "Men's Sneakers",
        sellerId: "SELLER005",
        sellerName: "Fashion Hub",
        quantity: 1,
        unitPrice: 22000,
        totalPrice: 22000,
      },
      {
        productId: "7",
        productName: "Maize Seed",
        sellerId: "SELLER007",
        sellerName: "AgroMart",
        quantity: 1,
        unitPrice: 7500,
        totalPrice: 7500,
      },
    ],

    pickupStops: [
      {
        id: "STOP001",
        sellerId: "SELLER001",
        sellerName: "Community Foods",
        location: {
          latitude: 10.3158,
          longitude: 9.8442,
        },
        items: [
          {
            productId: "1",
            productName: "Premium Rice 25kg",
            quantity: 1,
          },
        ],
        status: "pending",
      },
      {
        id: "STOP002",
        sellerId: "SELLER005",
        sellerName: "Fashion Hub",
        location: {
          latitude: 10.3158,
          longitude: 9.8442,
        },
        items: [
          {
            productId: "6",
            productName: "Men's Sneakers",
            quantity: 1,
          },
        ],
        status: "pending",
      },
      {
        id: "STOP003",
        sellerId: "SELLER007",
        sellerName: "AgroMart",
        location: {
          latitude: 10.3158,
          longitude: 9.8442,
        },
        items: [
          {
            productId: "7",
            productName: "Maize Seed",
            quantity: 1,
          },
        ],
        status: "pending",
      },
    ],

    vehicle: "bike",
    distanceKm: 116.58,

    subtotal: 54500,
    deliveryFee: 21425,
  });

  console.log("VALID ORDER PASSED");
  console.log("Order ID:", validOrder.id);
  console.log("Status:", validOrder.status);
  console.log("Total:", validOrder.total);

  // --------------------------------------------------
  // TEST 2: Invalid order
  //
  // We intentionally omit required order data.
  // The adapter/service should reject the request
  // rather than silently creating an invalid order.
  // --------------------------------------------------

  let invalidOrderRejected = false;

  try {
    await createOrderThroughService({
      customerId: "",
      customerName: "",
      phone: "",
      address: "",

      customerLocation: {
        latitude: 0,
        longitude: 0,
      },

      items: [],

      pickupStops: [],

      vehicle: "bike",
      distanceKm: 0,

      subtotal: 0,
      deliveryFee: 0,
    });
  } catch (error) {
    invalidOrderRejected = true;

    console.log("INVALID ORDER REJECTED");
    console.log("Error:", error);
  }

  if (!invalidOrderRejected) {
    throw new Error(
      "Invalid order was accepted. Expected createOrderThroughService to reject it."
    );
  }

  console.log("=== 6B.4 TEST PASSED ===");
}

runOrderAdapterTest().catch((error) => {
  console.error("=== 6B.4 TEST FAILED ===");
  console.error(error);
  process.exitCode = 1;
});