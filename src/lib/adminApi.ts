import { API_URL, auth } from "./firebase";

export type AdminApplication = {
  id: string;
  requestedRole: "rider" | "seller";
  name: string;
  email: string;
  phone: string;
  vehicle: string | null;
  businessName: string | null;
  businessAddress: string | null;
  note: string | null;
  createdAtMs: number | null;
};

export type AdminRider = {
  id: string;
  name: string;
  vehicle: string;
  availability: string;
  currentTripId: string | null;
  tripMissing: boolean;
  email: string | null;
  linked: boolean;
  completedTrips: number;
  earningsTotal: number;
};

export type AdminTrip = {
  id: string;
  status: "assigned" | "collecting" | "en_route";
  riderId: string;
  riderName: string;
  orderIds: string[];
  delivered: number;
  dropoffs: number;
  pickupsDone: number;
  pickups: number;
  riderPay: number;
  deliveryFeesTotal: number;
  createdAtMs: number | null;
  stuck: boolean;
  canRelease: boolean;
};

export type AdminWaitingOrder = {
  id: string;
  customerName: string;
  vehicle: string;
  total: number;
  address: string;
  paidAtMs: number | null;
  late: boolean;
};

export type AdminFlaggedPayment = {
  id: string;
  orderId: string | null;
  reference: string | null;
  reasons: string[];
  paidNaira: number | null;
  flaggedAtMs: number | null;
};

export type AdminState = {
  generatedAtMs: number;
  today: {
    orders: number;
    delivered: number;
    cancelled: number;
    goodsSales: number;
    deliveryFees: number;
    riderPay: number;
    deliveryProfit: number;
    trips: number;
    batchedOrders: number;
  };
  applications: AdminApplication[];
  riders: AdminRider[];
  freeRiderProfiles: { id: string; name: string; vehicle: string }[];
  trips: AdminTrip[];
  waitingOrders: AdminWaitingOrder[];
  flaggedPayments: AdminFlaggedPayment[];
  counts: { ridersOnline: number; ridersBusy: number; needsAttention: number };
  message: string | null;
};

export type AdminAction =
  | "overview"
  | "approve"
  | "reject"
  | "cancelOrder"
  | "retryDispatch"
  | "completeTrip"
  | "releaseTrip"
  | "freeRider";

export class AdminApiError extends Error {
  forbidden: boolean;
  constructor(message: string, forbidden = false) {
    super(message);
    this.forbidden = forbidden;
  }
}

export async function adminAction(
  action: AdminAction,
  extra: Record<string, unknown> = {},
): Promise<AdminState> {
  const user = auth.currentUser;
  if (!user) throw new AdminApiError("Please sign in.");
  const send = async (forceFreshToken: boolean) => {
    const token = await user.getIdToken(forceFreshToken);
    return fetch(`${API_URL}/api/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...extra }),
    });
  };
  let response = await send(false);
  // A just-granted admin role only shows up in a fresh login token.
  if (response.status === 403) response = await send(true);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AdminApiError(data.error || "Something went wrong.", response.status === 403);
  }
  return data as AdminState;
}
