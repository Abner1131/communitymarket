
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Product } from "../data/products";
import { getProductsWithOverrides } from "../services/productStorage";

const CART_STORAGE_KEY =
  "@communitymarket/cart";

export type CartItem = {
  product: Product;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  cartCount: number;
  cartTotal: number;

  addToCart: (product: Product) => Promise<void>;
  increaseQuantity: (productId: string) => Promise<void>;
  decreaseQuantity: (productId: string) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
};

const CartContext =
  createContext<CartContextValue | undefined>(
    undefined
  );

export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<
    CartItem[]
  >([]);

  const [loaded, setLoaded] =
    useState(false);

  /*
   * LOAD CART
   */
  useEffect(() => {
    let active = true;

    async function loadCart() {
      try {
        const stored =
          await AsyncStorage.getItem(
            CART_STORAGE_KEY
          );

        if (!stored) {
          if (active) {
            setLoaded(true);
          }

          return;
        }

        const parsed = JSON.parse(
          stored
        );

        if (
          Array.isArray(parsed)
        ) {
          const cleaned =
            parsed.filter(
              (item) =>
                item &&
                item.product &&
                typeof item.product.id ===
                  "string" &&
                Number.isInteger(
                  item.quantity
                ) &&
                item.quantity > 0
            );

          if (active) {
            setItems(cleaned);
          }
        }
      } catch (error) {
        console.error(
          "CART LOAD ERROR:",
          error
        );
      } finally {
        if (active) {
          setLoaded(true);
        }
      }
    }

    loadCart();

    return () => {
      active = false;
    };
  }, []);

  /*
   * SAVE CART
   */
  useEffect(() => {
    if (!loaded) {
      return;
    }

    async function saveCart() {
      try {
        await AsyncStorage.setItem(
          CART_STORAGE_KEY,
          JSON.stringify(items)
        );
      } catch (error) {
        console.error(
          "CART SAVE ERROR:",
          error
        );
      }
    }

    saveCart();
  }, [items, loaded]);

  /*
   * GET CURRENT LIVE PRODUCT STOCK
   *
   * Seller edits are stored separately from
   * the original products.ts catalogue.
   */
  async function getLiveProduct(
    productId: string
  ) {
    try {
      const liveProducts =
        await getProductsWithOverrides();

      return liveProducts.find(
        (product) =>
          product.id === productId
      );
    } catch (error) {
      console.error(
        "LIVE PRODUCT LOOKUP ERROR:",
        error
      );

      return undefined;
    }
  }

  /*
   * ADD TO CART
   */
  async function addToCart(
    product: Product
  ) {
    const liveProduct =
      await getLiveProduct(
        product.id
      );

    const effectiveProduct =
      liveProduct
        ? {
            ...product,
            name: liveProduct.name,
            category:
              liveProduct.category,
            price:
              liveProduct.price,
            description:
              liveProduct.description,
            stock:
              liveProduct.stock,
          }
        : product;

    if (
      effectiveProduct.stock <= 0
    ) {
      console.log(
        "ADD TO CART BLOCKED: OUT OF STOCK",
        effectiveProduct.id
      );

      return;
    }

    setItems((current) => {
      const existing =
        current.find(
          (item) =>
            item.product.id ===
            effectiveProduct.id
        );

      if (!existing) {
        return [
          ...current,
          {
            product:
              effectiveProduct,
            quantity: 1,
          },
        ];
      }

      if (
        existing.quantity >=
        effectiveProduct.stock
      ) {
        console.log(
          "ADD TO CART BLOCKED: STOCK LIMIT",
          {
            productId:
              effectiveProduct.id,
            stock:
              effectiveProduct.stock,
            quantity:
              existing.quantity,
          }
        );

        return current;
      }

      return current.map(
        (item) =>
          item.product.id ===
          effectiveProduct.id
            ? {
                ...item,
                product:
                  effectiveProduct,
                quantity:
                  item.quantity + 1,
              }
            : item
      );
    });
  }

  /*
   * INCREASE QUANTITY
   */
  async function increaseQuantity(
    productId: string
  ) {
    const liveProduct =
      await getLiveProduct(
        productId
      );

    setItems((current) =>
      current.map((item) => {
        if (
          item.product.id !==
          productId
        ) {
          return item;
        }

        const currentStock =
          liveProduct?.stock ??
          item.product.stock;

        if (
          currentStock <= 0
        ) {
          return item;
        }

        if (
          item.quantity >=
          currentStock
        ) {
          console.log(
            "INCREASE BLOCKED: STOCK LIMIT",
            {
              productId,
              stock:
                currentStock,
              quantity:
                item.quantity,
            }
          );

          return item;
        }

        return {
          ...item,
          product:
            liveProduct
              ? {
                  ...item.product,
                  name:
                    liveProduct.name,
                  category:
                    liveProduct.category,
                  price:
                    liveProduct.price,
                  description:
                    liveProduct.description,
                  stock:
                    liveProduct.stock,
                }
              : item.product,
          quantity:
            item.quantity + 1,
        };
      })
    );
  }

  /*
   * DECREASE QUANTITY
   */
  async function decreaseQuantity(
    productId: string
  ) {
    setItems((current) =>
      current
        .map((item) => {
          if (
            item.product.id !==
            productId
          ) {
            return item;
          }

          if (
            item.quantity <= 1
          ) {
            return null;
          }

          return {
            ...item,
            quantity:
              item.quantity - 1,
          };
        })
        .filter(
          (
            item
          ): item is CartItem =>
            item !== null
        )
    );
  }

  /*
   * REMOVE ITEM
   */
  async function removeFromCart(
    productId: string
  ) {
    setItems((current) =>
      current.filter(
        (item) =>
          item.product.id !==
          productId
      )
    );
  }

  /*
   * CLEAR CART
   */
  async function clearCart() {
    setItems([]);
  }

  const cartCount =
    useMemo(
      () =>
        items.reduce(
          (total, item) =>
            total +
            item.quantity,
          0
        ),
      [items]
    );

  const cartTotal =
    useMemo(
      () =>
        items.reduce(
          (total, item) =>
            total +
            item.product.price *
              item.quantity,
          0
        ),
      [items]
    );

  const value =
    useMemo(
      () => ({
        items,
        cartCount,
        cartTotal,
        addToCart,
        increaseQuantity,
        decreaseQuantity,
        removeFromCart,
        clearCart,
      }),
      [
        items,
        cartCount,
        cartTotal,
      ]
    );

  return (
    <CartContext.Provider
      value={value}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context =
    useContext(
      CartContext
    );

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }

  return context;
}

