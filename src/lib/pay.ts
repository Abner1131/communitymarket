import { auth, API_URL } from "./firebase";

export type WalletPreview = {
  hasWallet: boolean; // sellers and riders have a wallet
  walletAvailable: number; // cleared money they can spend
  walletApplied: number; // already taken from the wallet for this order
  walletCanCover: number; // what "Use my wallet" would take now
  amountDue: number; // left to pay on Paystack
  total: number;
};

async function callPay(body: Record<string, unknown>) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in before paying");
  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}/api/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not start payment");
  return data;
}

// What the buyer's wallet could cover (sellers and riders only). Changes nothing.
export async function previewWallet(orderId: string): Promise<WalletPreview> {
  return callPay({ orderId, preview: true });
}

// useWallet: take what the wallet can cover first. If that is everything,
// paidWithWallet is true and there is no Paystack link to open.
export async function payForOrder(
  orderId: string,
  useWallet = false,
): Promise<{ authorizationUrl?: string; reference?: string; paidWithWallet?: boolean }> {
  return callPay({ orderId, useWallet });
}
