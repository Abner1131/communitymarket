import {
  createOrderFromCheckout,
} from "./orderAdapter";

async function run() {
  console.log(
    "=== 7.3 AUTH → ORDER TEST START ==="
  );

  const authenticatedUserId =
    "USR-7-3-TEST";

  const order =
    await createOrderFromCheckout({
      customerId:
        authenticatedUserId,

      customerName:
        "Authenticated Customer",

      phone:
        "08000000000",

      address:
        "7.3 Test Address",

      customerLocation: {
        latitude: 9.0567,
        longitude: 7.4969,
      },

      items: [
        {
          productId: "P001",
          productName:
            "7.3 Test Product",
          sellerId: "S001",
          sellerName:
            "7.3 Test Seller",
          quantity: 1,
          unitPrice: 5000,
        },
      ],

      pickupStops: [
        {
          sellerId: "S001",
          sellerName:
            "7.3 Test Seller",
          latitude: 10.3158,
          longitude: 9.8442,
          items: [
            {
              productId: "P001",
              productName:
                "7.3 Test Product",
              quantity: 1,
            },
          ],
        },
      ],

      vehicle: "bike",
      distanceKm: 10,
      subtotal: 5000,
      deliveryFee: 1000,
      total: 6000,
    });

  if (
    order.customerId !==
    authenticatedUserId
  ) {
    throw new Error(
      `Expected customerId ${authenticatedUserId}, got ${order.customerId}`
    );
  }

  if (!order.id) {
    throw new Error(
      "Order was not created."
    );
  }

  console.log(
    "ORDER:",
    order.id
  );

  console.log(
    "AUTHENTICATED USER:",
    authenticatedUserId
  );

  console.log(
    "ORDER CUSTOMER ID:",
    order.customerId
  );

  console.log(
    "=== 7.3 TEST PASSED ==="
  );
}

run().catch((error) => {
  console.error(
    "=== 7.3 TEST FAILED ==="
  );

  console.error(error);

  process.exit(1);
});