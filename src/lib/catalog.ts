import { collection, onSnapshot, query, where } from "firebase/firestore";

import type { Product } from "../data/products";
import { sellers } from "../data/sellers";
import { db } from "./firebase";

// The live product catalogue, read straight from Firestore. Every customer
// sees the same products, prices and stock, and sellers' changes appear
// instantly. (Prices are checked again on the server at checkout.)

const CATEGORY_EMOJI: Record<string, string> = {
  Groceries: "\u{1F6D2}",
  Phones: "\u{1F4F1}",
  Electronics: "\u{1F50C}",
  Household: "\u{1F9F4}",
  Fashion: "\u{1F45F}",
  Beauty: "\u{1F484}",
  Agriculture: "\u{1F33D}",
  Food: "\u{1F372}",
  Health: "\u{1F48A}",
  Other: "\u{1F4E6}",
};

// Nicer pictures for the original demo products.
const DEMO_EMOJI: Record<string, string> = {
  "1": "\u{1F35A}",
  "2": "\u{1F6E2}️",
  "3": "\u{1F4F1}",
  "4": "\u{1F3A7}",
  "5": "\u{1F9F4}",
  "6": "\u{1F45F}",
  "7": "\u{1F33D}",
  "8": "\u{1F9F4}",
};

export const CATALOG_CATEGORIES = Object.keys(CATEGORY_EMOJI);

export function emojiFor(productId: string, category: string): string {
  return DEMO_EMOJI[productId] ?? CATEGORY_EMOJI[category] ?? "\u{1F4E6}";
}

function sellerNameFor(sellerId: string, stored: unknown): string {
  if (typeof stored === "string" && stored.trim()) return stored;
  return sellers.find((s) => s.id === sellerId)?.name ?? "CommunityMarket seller";
}

export function subscribeCatalog(
  onChange: (products: (Product & { isActive: boolean })[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(collection(db, "products"), where("active", "==", true));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => {
          const p = d.data();
          const category = typeof p.category === "string" ? p.category : "Other";
          return {
            id: d.id,
            name: typeof p.name === "string" ? p.name : "Product",
            category,
            price: Number(p.price) || 0,
            emoji: emojiFor(d.id, category),
            description: typeof p.description === "string" ? p.description : "",
            seller: sellerNameFor(String(p.sellerId || ""), p.sellerName),
            stock: Number(p.stock) || 0,
            isActive: true,
          };
        })
        .filter((p) => p.price > 0)
        .sort((a, b) => a.name.localeCompare(b.name));
      onChange(list);
    },
    (err) => onError?.(err),
  );
}
