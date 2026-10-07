import type { Rider } from "../services/dispatchEngine";

export const riders: Rider[] = [
  {
    id: "R001",
    name: "Musa Ibrahim",
    latitude: 10.3201,
    longitude: 9.8502,
    vehicle: "keke",
    isOnline: true,
    isAvailable: true,
    rating: 4.8,
  },

  {
    id: "R002",
    name: "Abdul Danladi",
    latitude: 10.3054,
    longitude: 9.8357,
    vehicle: "bike",
    isOnline: true,
    isAvailable: true,
    rating: 4.6,
  },

  {
    id: "R003",
    name: "Sani Bello",
    latitude: 10.3352,
    longitude: 9.8604,
    vehicle: "keke",
    isOnline: false,
    isAvailable: false,
    rating: 4.9,
  },

  {
    id: "R004",
    name: "Yakubu Ali",
    latitude: 10.2905,
    longitude: 9.8201,
    vehicle: "bike",
    isOnline: true,
    isAvailable: true,
    rating: 4.5,
  },

  {
    id: "R005",
    name: "Abubakar Umar",
    latitude: 10.3108,
    longitude: 9.8425,
    vehicle: "keke",
    isOnline: true,
    isAvailable: true,
    rating: 4.7,
  },
];