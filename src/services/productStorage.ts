import AsyncStorage from "@react-native-async-storage/async-storage";

import { catalogProducts } from "../data/catalog";
import type { Product } from "../types/community";

const PRODUCT_OVERRIDES_STORAGE_KEY =
  "@communitymarket/product-overrides";

export type ProductUpdate = Partial<
  Pick<
    Product,
    | "name"
    | "category"
    | "price"
    | "description"
    | "stock"
    | "isActive"
  >
>;

type ProductOverrides = Record<
  string,
  ProductUpdate
>;

async function readOverrides(): Promise<ProductOverrides> {
  try {
    const stored =
      await AsyncStorage.getItem(
        PRODUCT_OVERRIDES_STORAGE_KEY
      );

    if (!stored) {
      return {};
    }

    const parsed = JSON.parse(stored);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    return parsed as ProductOverrides;
  } catch (error) {
    console.error(
      "PRODUCT OVERRIDES READ ERROR:",
      error
    );

    return {};
  }
}

async function writeOverrides(
  overrides: ProductOverrides
): Promise<void> {
  await AsyncStorage.setItem(
    PRODUCT_OVERRIDES_STORAGE_KEY,
    JSON.stringify(overrides)
  );
}

export async function getProductsWithOverrides(): Promise<
  Product[]
> {
  const overrides =
    await readOverrides();

  return catalogProducts.map(
    (product) => ({
      ...product,
      ...(overrides[product.id] ?? {}),
    })
  );
}

export async function getProductByIdWithOverride(
  productId: string
): Promise<Product | undefined> {
  const products =
    await getProductsWithOverrides();

  return products.find(
    (product) =>
      product.id === productId
  );
}

export async function getProductsBySellerWithOverrides(
  sellerId: string
): Promise<Product[]> {
  const products =
    await getProductsWithOverrides();

  return products.filter(
    (product) =>
      product.sellerId === sellerId
  );
}

export async function updateProduct(
  productId: string,
  updates: ProductUpdate
): Promise<Product> {
  const baseProduct =
    catalogProducts.find(
      (product) =>
        product.id === productId
    );

  if (!baseProduct) {
    throw new Error(
      `Product ${productId} was not found.`
    );
  }

  const overrides =
    await readOverrides();

  overrides[productId] = {
    ...(overrides[productId] ?? {}),
    ...updates,
  };

  await writeOverrides(
    overrides
  );

  return {
    ...baseProduct,
    ...overrides[productId],
    updatedAt:
      new Date().toISOString(),
  };
}

export async function setProductActive(
  productId: string,
  isActive: boolean
): Promise<Product> {
  return updateProduct(
    productId,
    {
      isActive,
    }
  );
}

export async function resetProductOverrides(
  productId: string
): Promise<void> {
  const overrides =
    await readOverrides();

  delete overrides[productId];

  await writeOverrides(
    overrides
  );
}
export async function validateCartStock(
  items: {
    productId: string;
    quantity: number;
  }[]
): Promise<string | null> {
  const liveProducts =
    await getProductsWithOverrides();

  for (const item of items) {
    const product =
      liveProducts.find(
        (candidate) =>
          candidate.id ===
          item.productId
      );

    if (!product) {
      return `Product ${item.productId} is no longer available.`;
    }

    if (!product.isActive) {
      return `${product.name} is no longer available.`;
    }

    if (
      item.quantity >
      product.stock
    ) {
      return `${product.name} only has ${product.stock} unit(s) in stock. You currently have ${item.quantity} in your cart.`;
    }
  }

  return null;
}
export async function decrementProductStock(
  items: {
    productId: string;
    quantity: number;
  }[]
): Promise<void> {
  const liveProducts =
    await getProductsWithOverrides();

  const quantityByProduct =
    new Map<string, number>();

  for (const item of items) {
    const current =
      quantityByProduct.get(
        item.productId
      ) ?? 0;

    quantityByProduct.set(
      item.productId,
      current + item.quantity
    );
  }

  for (const [
    productId,
    quantity,
  ] of quantityByProduct) {
    const product =
      liveProducts.find(
        (candidate) =>
          candidate.id === productId
      );

    if (!product) {
      throw new Error(
        `Product ${productId} is no longer available.`
      );
    }

    if (!product.isActive) {
      throw new Error(
        `${product.name} is no longer available.`
      );
    }

    if (
      quantity > product.stock
    ) {
      throw new Error(
        `${product.name} only has ${product.stock} unit(s) in stock.`
      );
    }
  }

  const overrides =
    await readOverrides();

  for (const [
    productId,
    quantity,
  ] of quantityByProduct) {
    const product =
      liveProducts.find(
        (candidate) =>
          candidate.id === productId
      );

    if (!product) {
      continue;
    }

    overrides[productId] = {
      ...(overrides[productId] ?? {}),
      stock:
        product.stock - quantity,
    };
  }

  await writeOverrides(
    overrides
  );
}
