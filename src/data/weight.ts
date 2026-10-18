// How heavy a product is to carry. Same rules as the server's lib/weight.js:
// the app uses it to suggest a starting choice while the seller types.

export type Weight = "light" | "heavy" | "very_heavy";

export const WEIGHT_CHOICES: { key: Weight; label: string; note: string }[] = [
  { key: "light", label: "Light", note: "Normal items. Goes by bike." },
  { key: "heavy", label: "Heavy", note: "A bag of rice or maize, a carton. Goes by keke." },
  { key: "very_heavy", label: "Very heavy", note: "Cement, roofing, many bags. Keke, higher fee." },
];

const FOOD_CATEGORIES = ["Groceries", "Fresh produce", "Agriculture", "Building"];

export function suggestWeight(name: string, category: string): Weight {
  const text = (name || "").toLowerCase();
  const kg = text.match(/(\d{1,4})\s?(?:kg|kilo)/);
  const kilos = kg ? Number(kg[1]) : 0;
  if (kilos >= 100 || /\b(cement|roofing|zinc|iron rod|sand|gravel|granite|water tank)\b/.test(text)) return "very_heavy";
  if (kilos >= 20) return "heavy";
  if (FOOD_CATEGORIES.includes(category) && /\b(bag|sack|carton|jerrycan|gallon)\b/.test(text)) return "heavy";
  if (/\b(gas cylinder|generator|freezer|mattress)\b/.test(text)) return "heavy";
  return "light";
}
