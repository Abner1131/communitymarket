import type { Seller } from "../types/community";

export const sellers: Seller[] = [
  {
    id: "SELLER001",
    name: "Community Foods",
    location: {
      latitude: 10.3158,
      longitude: 9.8442,
    },
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },

  {
    id: "SELLER002",
    name: "FreshMart",
    location: {
      latitude: 10.3158,
      longitude: 9.8442,
    },
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },

  {
    id: "SELLER003",
    name: "TechWorld",
    location: {
      latitude: 10.3158,
      longitude: 9.8442,
    },
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },

  {
    id: "SELLER004",
    name: "CleanHome",
    location: {
      latitude: 10.3158,
      longitude: 9.8442,
    },
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },

  {
    id: "SELLER005",
    name: "Fashion Hub",
    location: {
      latitude: 10.3158,
      longitude: 9.8442,
    },
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },

  {
    id: "SELLER006",
    name: "Beauty Store",
    location: {
      latitude: 10.3158,
      longitude: 9.8442,
    },
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },

  {
    id: "SELLER007",
    name: "AgroMart",
    location: {
      latitude: 10.3158,
      longitude: 9.8442,
    },
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

export function getSellerById(
  sellerId: string
): Seller | undefined {
  return sellers.find(
    (seller) =>
      seller.id === sellerId
  );
}

export function getActiveSellers(): Seller[] {
  return sellers.filter(
    (seller) =>
      seller.isActive
  );
}