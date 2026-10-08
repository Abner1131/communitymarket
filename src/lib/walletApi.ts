import { API_URL, auth } from "./firebase";

// "My wallet" for whoever is signed in: their funds (money they added,
// spend-only) and, for sellers/riders, their earnings.

export type WalletActivity = {
  id: string;
  type: "credit" | "withdrawal" | "purchase";
  kind: string;
  label: string;
  amount: number;
  commission: number;
  atMs: number | null;
  clearsAtMs: number | null;
};

export type MyWallet = {
  funds: { balance: number; totalFunded: number; totalSpent: number; activity: WalletActivity[] };
  earnings: {
    partyType: "seller" | "rider";
    partyId: string;
    name: string;
    balance: number;
    available: number;
    clearing: number;
    pendingWithdrawal: number;
  }[];
  funding: { enabled: boolean; minTopup: number; maxTopup: number; maxBalance: number; roomLeft: number };
  rewards: {
    credit: number; // spend-only rewards credit
    creditExpiresAtMs: number | null; // soonest expiry
    points: number;
    pointsRule: { nairaPerPoint: number; nairaPer100Points: number; minRedeemPoints: number; enabled: boolean };
    code: string; // my invite code
    referredBy: string | null;
    canEnterCode: boolean;
    referral: {
      enabled: boolean;
      newUserCredit: number;
      inviterCredit: number;
      minOrder: number;
      partnerEnabled: boolean;
      partnerBonus: number;
      partnerTarget: number;
    };
    invited: { total: number; rewarded: number };
    creditExpiryDays: number;
    activity: { id: string; label: string; amount: number; expiresAtMs: number | null }[];
  };
  total: number;
  message?: string;
};

async function call(body: Record<string, unknown>) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in.");
  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}/api/wallet`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export async function getMyWallet(): Promise<MyWallet> {
  return call({ action: "me" });
}

// Starts a Paystack payment to add money; open authorizationUrl.
export async function startTopup(amount: number): Promise<{ authorizationUrl: string; reference: string }> {
  return call({ action: "topup", amount });
}

// Turn points into rewards credit (multiples of 100).
export async function redeemPoints(points: number): Promise<MyWallet> {
  return call({ action: "redeem", points });
}

// Enter the invite code of the person who invited you.
export async function applyInviteCode(code: string): Promise<MyWallet> {
  return call({ action: "useCode", code });
}
