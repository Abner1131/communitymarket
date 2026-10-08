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
};

export type SellerProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  active: boolean;
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
};

export class SellerApiError extends Error {
  notLinked: boolean;
  constructor(message: string, notLinked = false) {
    super(message);
    this.notLinked = notLinked;
  }
}

export async function sellerAction(
  action: "me" | "markReady" | "saveProduct" | "setLocation" | "setBank" | "withdraw",
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
