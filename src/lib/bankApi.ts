import { API_URL, auth } from "./firebase";

export type BankOption = { code: string; name: string };

let cached: BankOption[] | null = null;

// Paystack's list of Nigerian banks (from our server, cached for the session).
export async function listBanks(): Promise<BankOption[]> {
  if (cached) return cached;
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in.");
  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}/api/wallet`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: "banks" }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not load the list of banks.");
  cached = (data.banks as BankOption[]) || [];
  return cached;
}

// Popular banks shown first (matched by name).
export const POPULAR_BANKS = ["OPay", "Moniepoint", "PalmPay", "Kuda", "Guaranty", "Access", "First Bank", "United Bank", "Zenith"];