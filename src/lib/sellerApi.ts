import type { WalletSummary } from "../components/WalletCard";
import { API_URL, auth } from "./firebase";

export type SellerOrder = {
  id: string;
  status: "paid" | "dispatching" | "assigned" | "picked_up" | "delivered";
  createdAtMs: number | null;
  customerFirstName: string;
  items: { productId: string; name: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  commission: number; // CommunityMarket's commission on this shop's items
  earning: number; // what the shop receives (subtotal - commission)
  ready: boolean;
  riderName: string | null;
  report: SellerReport | null; // a customer's problem report on this order
};

export type SellerReport = {
  status: "open" | "refunded" | "rejected";
  reason: string;
  note: string;
  items: { name: string; quantity: number }[]; // this shop's items only
  photos: { url: string; thumbUrl: string }[];
  myReply: string;
  createdAtMs: number | null;
  outcome: string | null;
};

export type SellerPhoto = { id: string; url: string; thumbUrl: string };

export type SellerProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  active: boolean;
  photos: SellerPhoto[]; // first = cover
  specs: Record<string, string>;
  searchWords: Partial<Record<SearchLang, string[]>>;
};

export type SearchLang = "en" | "ha" | "pcm" | "yo" | "ig";
export const SEARCH_LANGS: { code: SearchLang; name: string }[] = [
  { code: "en", name: "English" },
  { code: "ha", name: "Hausa" },
  { code: "pcm", name: "Pidgin" },
  { code: "yo", name: "Yoruba" },
  { code: "ig", name: "Igbo" },
];

// One photo's AI verdict. "saved" = already on the product, "new" = not uploaded yet.
export type AiPhotoNote = {
  source: "saved" | "new";
  photoId?: string;
  index?: number;
  problem: string | null;
  blocking: boolean; // not allowed (contact details, inappropriate)
  tip: string;
};

export type AiSuggestion = {
  name: string;
  category: string | null;
  description: string;
  specs: Record<string, string>;
  searchWords: Record<SearchLang, string[]>;
  photos: AiPhotoNote[];
  bestPhoto: { source: "saved" | "new"; photoId?: string; index?: number } | null;
  usesLeftToday: number;
};

export type SellerState = {
  seller: {
    id: string;
    name: string;
    location: { latitude: number; longitude: number } | null;
    active: boolean;
  };
  stats: { toPrepare: number; deliveredOrders: number; deliveredSales: number };
  orders: SellerOrder[];
  products: SellerProduct[];
  categories: string[];
  wallet: WalletSummary;
  commissionRates: Record<string, number>; // percent per category
  savedProductId: string | null;
  photoWarnings?: string[]; // tips after a photo upload (e.g. too dark)
  maxPhotos?: number;
  ai?: { available: boolean; usesLeftToday: number };
  aiSuggestion?: AiSuggestion | null;
};

export class SellerApiError extends Error {
  notLinked: boolean;
  constructor(message: string, notLinked = false) {
    super(message);
    this.notLinked = notLinked;
  }
}

export async function sellerAction(
  action:
    | "me"
    | "markReady"
    | "saveProduct"
    | "setLocation"
    | "setBank"
    | "withdraw"
    | "addPhoto"
    | "removePhoto"
    | "setCover"
    | "aiSuggest"
    | "replyReport",
  extra: Record<string, unknown> = {},
): Promise<SellerState> {
  const user = auth.currentUser;
  if (!user) throw new SellerApiError("Please sign in.");
  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}/api/seller`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...extra }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new SellerApiError(data.error || "Something went wrong.", Boolean(data.notLinked));
  }
  return data as SellerState;
}
