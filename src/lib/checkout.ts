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