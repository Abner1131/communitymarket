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
  lockedOrderIds?: string[]; // deliveries locked by wrong codes
};

export type AdminLockedDelivery = {
  orderId: string;
  tripId: string | null;
  customerName: string;
  phone: string;
  riderName: string;
};

export type AdminDelivery = {
  settings: { requireCode: boolean };
  maxTries: number;
  locked: AdminLockedDelivery[];
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

export type AdminWithdrawalRequest = {
  id: string;
  partyType: "seller" | "rider";
  partyId: string;
  name: string;
  amount: number; // taken from their wallet
  fee: number; // our withdrawal fee
  netAmount: number; // what you send
  bank: { bankName: string; accountNumber: string; accountName: string } | null;
  requestedAtMs: number | null;
  balanceLeft: number;
};

export type AdminWallet = {
  partyType: "seller" | "rider" | "customer";
  partyId: string;
  name: string;
  balance: number;
  available: number;
  clearing: number;
  pendingWithdrawal: number;
  totalEarned: number;
  totalWithdrawn: number;
};

export type AdminRewardsSettings = {
  pointsEnabled: boolean;
  nairaPerPoint: number;
  nairaPer100Points: number;
  minRedeemPoints: number;
  creditExpiryDays: number;
  customerReferralEnabled: boolean;
  newUserCredit: number;
  inviterCredit: number;
  referralMinOrder: number;
  referralMonthlyCap: number;
  partnerReferralEnabled: boolean;
  partnerBonus: number;
  partnerTarget: number;
};

export type AdminRewards = {
  settings: AdminRewardsSettings;
  creditOutstanding: number;
  pointsOutstanding: number;
  pointsValue: number;
  referralCostThisMonth: number;
  recentReferrals: { id: string; newUser: string; inviter: string; status: string; paid: number; note: string | null; atMs: number | null }[];
};

export type AdminFundingSettings = {
  enabled: boolean;
  minTopup: number;
  maxTopup: number;
  maxBalance: number;
};

export type AdminTopup = { id: string; name: string; amount: number; status: string; atMs: number | null };

export type AdminPayoutSettings = {
  clearanceWorkingDays: number;
  clearanceHour: number;
  feeUpTo5k: number;
  feeUpTo50k: number;
  feeAbove50k: number;
};

export type AdminPaidWithdrawal = {
  id: string;
  partyType: "seller" | "rider";
  partyId: string;
  name: string;
  amount: number;
  fee: number;
  netAmount: number;
  method: string;
  reference: string | null;
  paidAtMs: number;
};

export type AdminState = {
  generatedAtMs: number;
  rewards: AdminRewards;
  today: {
    orders: number;
    delivered: number;
    cancelled: number;
    goodsSales: number;
    deliveryFees: number;
    riderPay: number;
    deliveryProfit: number;
    commission: number;
    withdrawalFees: number;
    topups: number;
    totalProfit: number;
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
  wallets: {
    totalBalance: number;
    totalClearing: number;
    customerFunds: number;
    funding: AdminFundingSettings;
    recentTopups: AdminTopup[];
    totalRequested: number;
    settings: AdminPayoutSettings;
    list: AdminWallet[];
    requests: AdminWithdrawalRequest[];
    recentPaid: AdminPaidWithdrawal[];
  };
  commission: { categories: string[]; maxRate: number; rates: Record<string, number> };
  delivery?: AdminDelivery;
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
  | "freeRider"
  | "payWithdrawal"
  | "rejectWithdrawal"
  | "setCommissionRates"
  | "setPayoutSettings"
  | "setFundingSettings"
  | "setRewardsSettings"
  | "setDeliverySettings"
  | "resetDeliveryCode";

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
