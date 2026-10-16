// A marketer's own pay (any signed-in account, after linking their code with
// the PIN from their manager). Talks to /api/wallet.

import type { PayNumbers } from "../data/marketerTerms";
import { API_URL, auth } from "./firebase";

export type MarketerPartner = {
  id: string;
  partyType: "seller" | "rider";
  name: string;
  active: boolean;
  done: number;
  need: number;
  endsAtMs: number | null;
};

export type MarketerMe =
  | { linked: false; settings?: PayNumbers; termsVersion?: string }
  | {
      linked: true;
      code: string;
      name: string;
      kind: "manager" | "marketer";
      terms: { version: string; agreedVersion: string | null; agreedAtMs: number | null };
      bank: { bankName: string; accountName: string; accountNumberMasked: string; verified: boolean } | null;
      bankWaiting: boolean;
      thisMonth: { monthName: string; direct: number; team: number; amount: number };
      partners: MarketerPartner[];
      statements: { month: string; monthName: string; amount: number; paid: boolean; paidAtMs: number | null; payByMs: number | null }[];
      settings: PayNumbers;
    };

export async function marketerCall(
  action: "marketerMe" | "marketerLink" | "marketerBank" | "marketerAgree",
  extra: Record<string, unknown> = {},
): Promise<{ marketer: MarketerMe; message: string | null }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in.");
  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}/api/wallet`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...extra }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return { marketer: data.marketer as MarketerMe, message: data.message ?? null };
}
