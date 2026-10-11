import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { Product, ProductVariant } from "../data/products";
import { variantLabel, variantPrice } from "../lib/variants";

const CART_STORAGE_KEY = "@communitymarket/cart";

// The size/colour chosen for a line (products with options only).
export type CartVariant = { id: string; label: string; price: number; stock: number };

export type CartItem = {
  product: Product;
  quantity: number;
  variant?: CartVariant | null;
};

// One line per product + size: "Sneakers, Size 42" and "Sneakers, Size 43" are two lines.
export function lineKey(item: CartItem): string {
  return item.variant ? `${item.product.id}#${item.variant.id}` : item.product.id;
}
export function linePrice(item: CartItem): number {
  return item.variant ? item.variant.price : item.product.price;
}
export function lineStock(item: CartItem): number {
  return item.variant ? item.variant.stock : item.product.stock;
}

type CartContextValue = {
  items: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (product: Product, variant?: ProductVariant | null) => Promise<void>;
  increaseQuantity: (key: string) => Promise<void>;
  decreaseQuantity: (key: string) => Promise<void>;
  removeFromCart: (key: string) => Promise<void>;
  clearCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

function validStored(item: any): item is CartItem {
  return (
    item &&
    item.product &&
    typeof item.product.id === "string" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    (item.variant === undefined ||
      item.variant === null ||
      (typeof item.variant.id === "string" && typeof item.variant.price === "number"))
  );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load the saved cart.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : null;
        if (active && Array.isArray(parsed)) setItems(parsed.filter(validStored));
      } catch (error) {
        console.error("CART LOAD ERROR:", error);
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Save it on every change.
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items)).catch((error) =>
      console.error("CART SAVE ERROR:", error),
    );
  }, [items, loaded]);

  // Prices and stock are checked again on the server at checkout.
  async function addToCart(product: Product, variant?: ProductVariant | null) {
    const chosen: CartVariant | null = variant
      ? { id: variant.id, label: variantLabel(product, variant), price: variantPrice(product, variant), stock: variant.stock }
      : null;
    const stock = chosen ? chosen.stock : product.stock;
    if (stock <= 0) return;
    const key = chosen ? `${product.id}#${chosen.id}` : product.id;
    setItems((current) => {
      const existing = current.find((item) => lineKey(item) === key);
      if (!existing) return [...current, { product, quantity: 1, variant: chosen }];
      if (existing.quantity >= stock) return current;
      return current.map((item) =>
        lineKey(item) === key ? { ...item, product, variant: chosen, quantity: item.quantity + 1 } : item,
      );
    });
  }

  async function increaseQuantity(key: string) {
    setItems((current) =>
      current.map((item) =>
        lineKey(item) === key && item.quantity < lineStock(item) ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  }

  async function decreaseQuantity(key: string) {
    setItems((current) =>
      current
        .map((item) => (lineKey(item) !== key ? item : item.quantity <= 1 ? null : { ...item, quantity: item.quantity - 1 }))
        .filter((item): item is CartItem => item !== null),
    );
  }

  async function removeFromCart(key: string) {
    setItems((current) => current.filter((item) => lineKey(item) !== key));
  }

  async function clearCart() {
    setItems([]);
  }

  const cartCount = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);
  const cartTotal = useMemo(() => items.reduce((total, item) => total + linePrice(item) * item.quantity, 0), [items]);

  const value = useMemo(
    () => ({ items, cartCount, cartTotal, addToCart, increaseQuantity, decreaseQuantity, removeFromCart, clearCart }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, cartCount, cartTotal],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
