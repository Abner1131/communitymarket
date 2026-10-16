// Marketing dashboard: talks to the same server door as Admin (/api/admin),
// but only with the marketing actions. The server refuses everything else for
// a marketing login and never sends money, bank or customer details.

import type { PayNumbers } from "../data/marketerTerms";
import { adminDeviceHeaders } from "./adminDevice";
import { API_URL, auth } from "./firebase";

export type MarketingNote = { text: string; atMs: number; by: string | null };

export type MarketingApplication = {
  id: string;
  requestedRole: "rider" | "seller";
  name: string;
  phone: string;
  vehicle: string | null;
  businessName: string | null;
  businessAddress: string | null;
  note: string | null;
  marketerCode: string | null;
  marketerName: string | null;
  notes: MarketingNote[];
  createdAtMs: number | null;
};

export type MarketingShop = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  businessType: string;
  active: boolean;
  linked: boolean;
  products: number;
  orders30: number;
  lastOrderMs: number | null;
  marketerCode: string | null;
  joinedMs: number | null;
};

export type MarketingRider = {
  id: string;
  name: string;
  vehicle: "bike" | "keke";
  availability: string;
  active: boolean;
  linked: boolean;
  completedTrips: number;
  marketerCode: string | null;
};

export type MarketerCode = {
  code: string;
  name: string;
  kind?: "manager" | "marketer";
  managerCode?: string | null;
  active: boolean;
  applications: number;
  approved: number;
  activeShops: number;
  createdAtMs: number | null;
};

export type MarketingState = {
  growth: {
    customers: number;
    newCustomers7: number;
    newCustomers30: number;
    shops: number;
    activeShops30: number;
    riders: number;
    ridersOnline: number;
    orders7: number;
    orders30: number;
    pendingApplications: number;
  };
  applications: MarketingApplication[];
  shops: MarketingShop[];
  riders: MarketingRider[];
  codes: MarketerCode[];
  generatedAtMs: number;
};

// The signed-in manager's own code and team (earnings this month so far).
export type MarketingTeam = {
  myCode: string | null;
  myName?: string;
  monthName?: string;
  my?: { direct: number; team: number; amount: number; waiting: number };
  team?: {
    code: string;
    name: string;
    active: boolean;
    linked: boolean;
    locked: boolean;
    earned: number;
    counting: number;
    waiting: number;
  }[];
  settings?: PayNumbers;
  termsVersion?: string;
};

export type MarketingAction =
  | "marketing"
  | "applicationNote"
  | "createMarketerCode"
  | "setMarketerCodeActive"
  | "createMyCode"
  | "resetMarketerPin";

export class MarketingApiError extends Error {
  forbidden: boolean;
  constructor(message: string, forbidden = false) {
    super(message);
    this.forbidden = forbidden;
  }
}

export async function marketingAction(
  action: MarketingAction,
  extra: Record<string, unknown> = {},
): Promise<{ marketing: MarketingState; team: MarketingTeam | null; message: string | null }> {
  const user = auth.currentUser;
  if (!user) throw new MarketingApiError("Please sign in.");
  const send = async (fresh: boolean) => {
    const token = await user.getIdToken(fresh);
    const device = await adminDeviceHeaders();
    return fetch(`${API_URL}/api/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...device },
      body: JSON.stringify({ action, ...extra }),
    });
  };
  let response = await send(false);
  // Just-given access only shows in a fresh login token.
  if (response.status === 403) response = await send(true);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new MarketingApiError(data.error || "Something went wrong.", response.status === 403);
  return { marketing: data.marketing as MarketingState, team: (data.team as MarketingTeam) ?? null, message: data.message ?? null };
}
