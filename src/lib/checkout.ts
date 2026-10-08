import { API_URL, auth } from "./firebase";

export type CartLine = { productId: string; quantity: number };

export type CheckoutResult = {
  orderId: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  distanceKm: number;
};

export async function submitCheckout(params: {
  items: CartLine[];
  deliveryAddress: { latitude: number; longitude: number };
  vehiclePreference: "bike" | "keke";
  customerName: string;
  phone: string;
  address: string;
}): Promise<CheckoutResult> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Please sign in before checking out");
  }
  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Checkout failed");
  }
  return data;
}
export type CheckoutQuote = {
  subtotal: number;
  deliveryFee: number;
  total: number;
  distanceKm: number; // shop(s) -> customer, as the rider rides
  shops: { name: string; location: { latitude: number; longitude: number } }[];
};

// Exact delivery fee and total from the server, before ordering.
// Nothing is saved and no stock is held.
export async function quoteCheckout(params: {
  items: CartLine[];
  deliveryAddress: { latitude: number; longitude: number };
  vehiclePreference: "bike" | "keke";
}): Promise<CheckoutQuote> {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in to see the delivery fee");
  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...params, quoteOnly: true }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not work out the delivery fee");
  return data as CheckoutQuote;
}
