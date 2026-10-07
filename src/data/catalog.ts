import type {
  Product,
} from "../types/community";

export const catalogProducts: Product[] = [
  {
    id: "1",
    sellerId: "SELLER001",
    name: "Premium Rice 25kg",
    category: "Groceries",
    price: 25000,
    description:
      "Premium quality rice suitable for household consumption.",
    stock: 50,
    isActive: true,
    createdAt:
      "2026-01-01T00:00:00.000Z",
    updatedAt:
      "2026-01-01T00:00:00.000Z",
  },

  {
    id: "2",
    sellerId: "SELLER002",
    name: "Cooking Oil 5L",
    category: "Groceries",
    price: 8500,
    description:
      "Quality vegetable cooking oil.",
    stock: 35,
    isActive: true,
    createdAt:
      "2026-01-01T00:00:00.000Z",
    updatedAt:
      "2026-01-01T00:00:00.000Z",
  },

  {
    id: "3",
    sellerId: "SELLER003",
    name: "Smartphone",
    category: "Phones",
    price: 185000,
    description:
      "Modern smartphone with large display and long battery life.",
    stock: 15,
    isActive: true,
    createdAt:
      "2026-01-01T00:00:00.000Z",
    updatedAt:
      "2026-01-01T00:00:00.000Z",
  },

  {
    id: "4",
    sellerId: "SELLER003",
    name: "Wireless Earbuds",
    category: "Electronics",
    price: 18000,
    description:
      "Wireless earbuds for music and calls.",
    stock: 25,
    isActive: true,
    createdAt:
      "2026-01-01T00:00:00.000Z",
    updatedAt:
      "2026-01-01T00:00:00.000Z",
  },

  {
    id: "5",
    sellerId: "SELLER004",
    name: "Laundry Detergent",
    category: "Household",
    price: 6500,
    description:
      "Household laundry detergent.",
    stock: 60,
    isActive: true,
    createdAt:
      "2026-01-01T00:00:00.000Z",
    updatedAt:
      "2026-01-01T00:00:00.000Z",
  },

  {
    id: "6",
    sellerId: "SELLER005",
    name: "Men's Sneakers",
    category: "Fashion",
    price: 22000,
    description:
      "Comfortable everyday sneakers.",
    stock: 20,
    isActive: true,
    createdAt:
      "2026-01-01T00:00:00.000Z",
    updatedAt:
      "2026-01-01T00:00:00.000Z",
  },

  {
    id: "7",
    sellerId: "SELLER007",
    name: "Maize Seed",
    category: "Agriculture",
    price: 7500,
    description:
      "Quality agricultural seed for farmers.",
    stock: 100,
    isActive: true,
    createdAt:
      "2026-01-01T00:00:00.000Z",
    updatedAt:
      "2026-01-01T00:00:00.000Z",
  },

  {
    id: "8",
    sellerId: "SELLER006",
    name: "Body Lotion",
    category: "Beauty",
    price: 5500,
    description:
      "Personal care body lotion.",
    stock: 40,
    isActive: true,
    createdAt:
      "2026-01-01T00:00:00.000Z",
    updatedAt:
      "2026-01-01T00:00:00.000Z",
  },
];

export function getProductById(
  productId: string
): Product | undefined {
  return catalogProducts.find(
    (product) =>
      product.id === productId
  );
}

export function getProductsBySeller(
  sellerId: string
): Product[] {
  return catalogProducts.filter(
    (product) =>
      product.sellerId === sellerId
  );
}

export function getActiveProducts(): Product[] {
  return catalogProducts.filter(
    (product) =>
      product.isActive &&
      product.stock > 0
  );
}