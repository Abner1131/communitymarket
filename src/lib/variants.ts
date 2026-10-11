import type { Product, ProductOption, ProductVariant } from "../data/products";

// Sizes, colours, storage ... (the server's lib/variants.js has the rules).
// A product with options is bought as one "variant": e.g. Size 42 + Black.

export const MAX_OPTIONS = 2;

// Ready-made lists a seller starts from, then keeps only what they have.
export const OPTION_PRESETS: { key: string; label: string; name: string; values: string[] }[] = [
  { key: "shoe_size", label: "Shoe sizes", name: "Size", values: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47"] },
  { key: "clothing_size", label: "Clothes sizes", name: "Size", values: ["XS", "S", "M", "L", "XL", "XXL", "3XL"] },
  { key: "kids_size", label: "Kids (age)", name: "Age", values: ["0-6m", "6-12m", "1-2y", "3-4y", "5-6y", "7-8y", "9-10y", "11-12y"] },
  { key: "fabric_length", label: "Fabric length", name: "Length", values: ["1 yard", "2 yards", "3 yards", "5 yards", "6 yards"] },
  { key: "phone_storage", label: "Phone storage", name: "Storage", values: ["32GB", "64GB", "128GB", "256GB", "512GB"] },
  {
    key: "colour",
    label: "Colour",
    name: "Colour",
    values: ["Black", "White", "Red", "Blue", "Navy", "Green", "Brown", "Grey", "Pink", "Yellow", "Purple", "Orange", "Gold", "Silver", "Cream"],
  },
];

// Firestore: options [{name, values}], variants { id: {values, stock, price} }
export function variantsFrom(options: unknown, variants: unknown): { options: ProductOption[]; variants: ProductVariant[] } {
  const opts: ProductOption[] = Array.isArray(options)
    ? options
        .filter((o) => o && typeof o.name === "string" && Array.isArray(o.values))
        .map((o) => ({ name: o.name, values: o.values.filter((v: unknown): v is string => typeof v === "string") }))
        .slice(0, MAX_OPTIONS)
    : [];
  if (!opts.length || !variants || typeof variants !== "object") return { options: [], variants: [] };
  const list: ProductVariant[] = Object.entries(variants as Record<string, any>)
    .filter(([, v]) => v && Array.isArray(v.values) && v.values.length === opts.length)
    .map(([id, v]) => ({
      id,
      values: v.values.map(String),
      stock: Number(v.stock) || 0,
      price: Number.isInteger(v.price) ? v.price : null,
    }));
  const rank = (v: ProductVariant) => opts.map((o, i) => String(o.values.indexOf(v.values[i])).padStart(3, "0")).join("-");
  list.sort((a, b) => rank(a).localeCompare(rank(b)));
  return list.length ? { options: opts, variants: list } : { options: [], variants: [] };
}

export function hasOptions(p: Product): boolean {
  return Boolean(p.options && p.options.length && p.variants && p.variants.length);
}

export function variantPrice(p: Product, v: ProductVariant | null | undefined): number {
  return v && v.price !== null ? v.price : p.price;
}

// "Size 42 · Black" (colours read fine without the word "Colour").
export function variantLabel(p: Product, v: ProductVariant): string {
  const options = p.options || [];
  return v.values
    .map((value, i) => {
      const name = options[i] ? options[i].name : "";
      return /colou?r/i.test(name) || !name ? value : `${name} ${value}`;
    })
    .join(" · ");
}

export function priceRange(p: Product): { min: number; max: number } {
  if (!hasOptions(p)) return { min: p.price, max: p.price };
  const prices = (p.variants || []).map((v) => variantPrice(p, v));
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

// The variant matching a full choice, e.g. ["42", "Black"].
export function findVariant(p: Product, chosen: (string | null)[]): ProductVariant | null {
  if (!hasOptions(p) || chosen.some((c) => !c)) return null;
  return (p.variants || []).find((v) => v.values.every((value, i) => value === chosen[i])) || null;
}

// Can this value still be bought, given what is already chosen for the other option?
export function valueInStock(p: Product, optionIndex: number, value: string, chosen: (string | null)[]): boolean {
  return (p.variants || []).some(
    (v) =>
      v.stock > 0 &&
      v.values[optionIndex] === value &&
      v.values.every((other, i) => i === optionIndex || !chosen[i] || chosen[i] === other),
  );
}

// Does this value exist at all (in any combination)?
export function valueExists(p: Product, optionIndex: number, value: string): boolean {
  return (p.variants || []).some((v) => v.values[optionIndex] === value);
}

// "4 sizes", "3 colours" - for product cards.
export function optionSummary(p: Product): string {
  const first = (p.options || [])[0];
  if (!first || !hasOptions(p)) return "";
  const count = new Set((p.variants || []).map((v) => v.values[0])).size;
  const word = first.name.toLowerCase();
  return `${count} ${count === 1 ? word : /s$/.test(word) ? word : `${word}s`}`;
}
