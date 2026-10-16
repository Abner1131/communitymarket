// The market's categories and the sub-groups inside each one.
//
// "key" is what is stored on products and in the commission settings; it never
// changes. "label" is the friendly name people see. The server keeps the same
// keys and groups in communitymarket-server/lib/categories.js: keep them in step.

import type { IconName } from "../components/Icon";

export type CategoryDef = {
  key: string;
  label: string;
  blurb: string; // one line on the category page
  icon: IconName;
  tint: { bg: string; icon: string }; // soft colours for tiles and photo-less products
  subs: string[];
};

const warm = { bg: "#f2e9d3", icon: "#9a7b3c" };
const leaf = { bg: "#e6eedc", icon: "#56703a" };
const mint = { bg: "#e3ece4", icon: "#3f6b52" };
const clay = { bg: "#efe4dc", icon: "#8a5a45" };
const rose = { bg: "#f1e3e3", icon: "#8f4f5a" };
const slate = { bg: "#e6e8ee", icon: "#4f5a70" };
const sand = { bg: "#eee9df", icon: "#6f6a5e" };

export const CATEGORY_DEFS: CategoryDef[] = [
  { key: "Groceries", label: "Supermarket", blurb: "Rice, oil, spices, drinks and everyday food supplies.", icon: "basket", tint: warm,
    subs: ["Rice and grains", "Beans and flour", "Cooking oil", "Spices and seasoning", "Tinned and packaged food", "Drinks and juices", "Snacks and biscuits", "Tea, coffee and milk"] },
  { key: "Fresh produce", label: "Fresh produce", blurb: "Vegetables, fruit and tubers, fresh from the market.", icon: "apple", tint: leaf,
    subs: ["Vegetables", "Fruits", "Tubers", "Pepper, tomato and onion", "Herbs and leaves"] },
  { key: "Meat and fish", label: "Meat, fish and eggs", blurb: "Fresh and dried meat, fish and eggs.", icon: "beef", tint: clay,
    subs: ["Beef and goat", "Chicken and turkey", "Fresh and dried fish", "Eggs", "Processed meat"] },
  { key: "Food", label: "Food and kitchens", blurb: "Hot meals cooked to order by local kitchens.", icon: "utensils", tint: warm,
    subs: ["Rice and stew", "Soups and swallow", "Grills and suya", "Snacks and pastries", "Drinks", "Other meals"] },
  { key: "Fashion", label: "Fashion", blurb: "Clothes, shoes, bags, jewellery and fabrics.", icon: "shirt", tint: clay,
    subs: ["Women", "Men", "Children", "Shoes", "Bags", "Jewellery and watches", "Fabrics and tailoring"] },
  { key: "Phones", label: "Phones and tablets", blurb: "Phones, tablets and the accessories for them.", icon: "smartphone", tint: mint,
    subs: ["Smartphones", "Tablets", "Chargers and cables", "Cases and screen guards", "Earphones and power banks"] },
  { key: "Electronics", label: "Electronics", blurb: "TVs, fans, generators, laptops and appliances.", icon: "tv", tint: mint,
    subs: ["TVs and audio", "Fans and air conditioners", "Kitchen appliances", "Generators and solar", "Computers and laptops", "Lighting and batteries"] },
  { key: "Household", label: "Home and kitchen", blurb: "Cookware, bedding, furniture and cleaning supplies.", icon: "sofa", tint: slate,
    subs: ["Cookware and plates", "Bedding and towels", "Furniture", "Cleaning supplies", "Storage and buckets", "Curtains and decor"] },
  { key: "Beauty", label: "Beauty and personal care", blurb: "Skincare, hair, perfume and makeup.", icon: "sparkles", tint: rose,
    subs: ["Skincare", "Hair care and wigs", "Perfumes", "Makeup", "Soaps and body care", "Salon and barbing tools"] },
  { key: "Health", label: "Health", blurb: "Vitamins, first aid and personal care. No prescription medicines.", icon: "heart-pulse", tint: rose,
    subs: ["Vitamins and supplements", "First aid", "Personal hygiene", "Feminine care", "Medical devices"] },
  { key: "Baby and kids", label: "Baby and kids", blurb: "Baby food, diapers, clothes and toys.", icon: "baby", tint: warm,
    subs: ["Baby food and milk", "Diapers and wipes", "Baby clothes", "Toys", "Strollers and gear"] },
  { key: "Agriculture", label: "Farm", blurb: "Seeds, feed, fertilizer and farm tools.", icon: "sprout", tint: leaf,
    subs: ["Seeds and seedlings", "Fertilizer", "Animal feed", "Farm tools", "Poultry and fish equipment"] },
  { key: "Building", label: "Building and hardware", blurb: "Tools, paint, plumbing and electrical supplies.", icon: "hammer", tint: slate,
    subs: ["Tools", "Paints and brushes", "Plumbing", "Electrical and wiring", "Locks and hardware"] },
  { key: "Auto parts", label: "Auto and motorcycle parts", blurb: "Spare parts, tyres, batteries and oils.", icon: "car", tint: sand,
    subs: ["Motorcycle parts", "Car parts", "Tyres and batteries", "Oils and fluids", "Accessories"] },
  { key: "Books", label: "Books and stationery", blurb: "Textbooks, novels, stationery and school supplies.", icon: "book-open", tint: sand,
    subs: ["Textbooks", "Novels and religious books", "Stationery and office", "School supplies"] },
  { key: "Other", label: "Other", blurb: "Everything else.", icon: "more", tint: sand, subs: [] },
];

const BY_KEY: Record<string, CategoryDef> = Object.fromEntries(CATEGORY_DEFS.map((d) => [d.key, d]));

export function categoryDef(key: string): CategoryDef | undefined {
  return BY_KEY[key];
}

/** The friendly name for a stored category key (unknown keys show as they are). */
export function categoryLabel(key: string): string {
  return BY_KEY[key]?.label ?? key;
}

/** Sub-groups of a category (empty for "Other" and unknown keys). */
export function categorySubs(key: string): string[] {
  return BY_KEY[key]?.subs ?? [];
}
