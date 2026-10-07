import { API_URL, auth } from "./firebase";

export type RiderPoint = { latitude: number; longitude: number };

export type RiderProfile = {
  id: string;
  name: string;
  vehicle: "bike" | "keke";
  rating: number | null;
  availability: "available" | "busy" | "offline";
  currentTripId: string | null;
  completedTrips: number;
  earningsTotal: number;
};

export type RiderTrip = {
  id: string;
  status: "assigned" | "collecting" | "en_route" | "completed";
  vehicle: string;
  orderIds: string[];
  pickupStops: {
    sellerId: string;
    sellerName: string;
    location: RiderPoint | null;
    status: "pending" | "picked_up";
    ready: boolean; // false until the seller marks the order packed
    items: { orderId: string; productName: string; quantity: number }[];
  }[];
  dropoffs: {
    orderId: string;
    customerName: string | null;
    customerPhone: string | null;
    customerAddress: string | null;
    location: RiderPoint | null;
    status: "pending" | "delivered";
  }[];
  routeKm: number;
  riderPay: number;
};

export type RiderState = { rider: RiderProfile; trip: RiderTrip | null };

export class RiderApiError extends Error {
  notLinked: boolean;
  email: string | null;
  constructor(message: string, notLinked = false, email: string | null = null) {
    super(message);
    this.notLinked = notLinked;
    this.email = email;
  }
}

export async function riderAction(
  action: "me" | "setOnline" | "pickedUp" | "delivered",
  extra: Record<string, unknown> = {},
): Promise<RiderState> {
  const user = auth.currentUser;
  if (!user) throw new RiderApiError("Please sign in.");
  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}/api/rider`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...extra }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new RiderApiError(
      data.error || "Something went wrong.",
      Boolean(data.notLinked),
      data.email ?? null,
    );
  }
  return data as RiderState;
}
