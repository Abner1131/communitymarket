export type Product = {
  id: string;
  name: string;
  category: string;
  subcategory?: string; // group inside the category (optional)
  price: number;
  emoji: string;
  description: string;
  seller: string;
  stock: number;
  // Photos added by the seller (cover first). Older products have none.
  thumbUrl?: string | null; // small, for lists
  imageUrl?: string | null; // large, for the product page
  photos?: ProductPhoto[];
  searchWords?: string[]; // English, Hausa, Pidgin, Yoruba, Igbo
  // Sizes / colours (see src/lib/variants.ts). Without them: one price, one stock.
  options?: ProductOption[];
  variants?: ProductVariant[];
  // Restaurant dishes (cooked to order): no stock count, only "sold out today".
  // shopOpen / prepTime / shopHours are the restaurant's facts, copied by the server.
  madeToOrder?: boolean;
  shopOpen?: boolean;
  prepTime?: string | null; // "20-30 min"
  shopHours?: string | null; // "8am - 10pm"
};

export type ProductPhoto = { id: string; url: string; thumbUrl: string };

export type ProductOption = { name: string; values: string[] }; // e.g. Size: 40, 41, 42
export type ProductVariant = { id: string; values: string[]; stock: number; price: number | null };

export const products: Product[] = [
  {
    id: "1",
    name: "Premium Rice 25kg",
    category: "Groceries",
    price: 25000,
    emoji: "🍚",
    description: "Premium quality rice suitable for household consumption.",
    seller: "Community Foods",
    stock: 50,
  },
  {
    id: "2",
    name: "Cooking Oil 5L",
    category: "Groceries",
    price: 8500,
    emoji: "🛢️",
    description: "Quality vegetable cooking oil.",
    seller: "FreshMart",
    stock: 35,
  },
  {
    id: "3",
    name: "Smartphone",
    category: "Phones",
    price: 185000,
    emoji: "📱",
    description: "Modern smartphone with large display and long battery life.",
    seller: "TechWorld",
    stock: 15,
  },
  {
    id: "4",
    name: "Wireless Earbuds",
    category: "Electronics",
    price: 18000,
    emoji: "🎧",
    description: "Wireless earbuds for music and calls.",
    seller: "TechWorld",
    stock: 25,
  },
  {
    id: "5",
    name: "Laundry Detergent",
    category: "Household",
    price: 6500,
    emoji: "🧴",
    description: "Household laundry detergent.",
    seller: "CleanHome",
    stock: 60,
  },
  {
    id: "6",
    name: "Men's Sneakers",
    category: "Fashion",
    price: 22000,
    emoji: "👟",
    description: "Comfortable everyday sneakers.",
    seller: "Fashion Hub",
    stock: 20,
  },
  {
    id: "7",
    name: "Maize Seed",
    category: "Agriculture",
    price: 7500,
    emoji: "🌽",
    description: "Quality agricultural seed for farmers.",
    seller: "AgroMart",
    stock: 100,
  },
  {
    id: "8",
    name: "Body Lotion",
    category: "Beauty",
    price: 5500,
    emoji: "🧴",
    description: "Personal care body lotion.",
    seller: "Beauty Store",
    stock: 40,
  },
];