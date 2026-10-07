import {
    DispatchOrder,
    findBestRider,
    Rider,
} from "./dispatchEngine";

const riders: Rider[] = [
  {
    id: "R001",
    name: "Rider A",

    latitude: 9.0765,
    longitude: 7.3986,

    vehicle: "bike",

    isOnline: true,
    isAvailable: true,

    rating: 4.7,
  },

  {
    id: "R002",
    name: "Rider B",

    latitude: 9.0820,
    longitude: 7.4100,

    vehicle: "bike",

    isOnline: true,
    isAvailable: true,

    rating: 4.9,
  },

  {
    id: "R003",
    name: "Rider C",

    latitude: 9.0900,
    longitude: 7.4200,

    vehicle: "bike",

    isOnline: true,
    isAvailable: false,

    rating: 5.0,
  },
];

const order: DispatchOrder = {
  orderId: "CM10001",

  pickupStops: [
    {
      sellerId: "SELLER001",
      sellerName: "Seller A",

      latitude: 9.0800,
      longitude: 7.4000,
    },

    {
      sellerId: "SELLER002",
      sellerName: "Seller B",

      latitude: 9.0850,
      longitude: 7.4050,
    },

    {
      sellerId: "SELLER003",
      sellerName: "Seller C",

      latitude: 9.0900,
      longitude: 7.4100,
    },
  ],

  customerLocation: {
    latitude: 9.1000,
    longitude: 7.4200,
  },

  vehicle: "bike",
};

const result =
  findBestRider(
    riders,
    order
  );

console.log(
  "================================"
);

console.log(
  "COMMUNITYMARKET DISPATCH TEST"
);

console.log(
  "================================"
);

console.log(
  "Selected Rider:",
  result.selectedRider?.name
);

console.log(
  "--------------------------------"
);

result.rankedRiders.forEach(
  (item, index) => {
    console.log(
      `${index + 1}. ${item.rider.name}`
    );

    console.log(
      `First pickup: ${item.firstPickupDistanceKm.toFixed(
        2
      )} km`
    );

    console.log(
      `Total route: ${item.totalRouteDistanceKm.toFixed(
        2
      )} km`
    );

    console.log(
      `Score: ${item.score.toFixed(
        2
      )}`
    );

    console.log(
      `Suitable: ${item.suitable}`
    );

    console.log(
      "--------------------------------"
    );
  }
);