import { API_URL, auth } from "./firebase";

export type ReportReason = "missing" | "damaged" | "wrong" | "quality" | "not_received" | "other";

export const REPORT_REASONS: { code: ReportReason; label: string; hint: string }[] = [
  { code: "missing", label: "Missing item", hint: "Something I paid for was not in the delivery" },
  { code: "damaged", label: "Damaged item", hint: "Broken, torn, spilled or crushed" },
  { code: "wrong", label: "Wrong item", hint: "Different product, size or brand" },
  { code: "quality", label: "Expired or bad quality", hint: "Expired, spoiled or fake" },
  { code: "not_received", label: "Never received it", hint: "The order says delivered but I got nothing" },
  { code: "other", label: "Other problem", hint: "Tell us what happened" },
];

export const REPORT_WINDOW_HOURS = 48;

export type MyReport = {
  status: "open" | "refunded" | "rejected";
  reason: string;
  reasonCode: ReportReason;
  amount: number | null;
  rejectReason: string | null;
  createdAtMs: number | null;
  items: { name: string; quantity: number; unitPrice: number }[];
  note: string;
  photos: { url: string; thumbUrl: string }[];
};

async function supportCall(body: Record<string, unknown>) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in.");
  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}/api/support`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export async function reportProblem(input: {
  orderId: string;
  reason: ReportReason;
  items: { productId: string; quantity: number }[];
  note: string;
  photos: string[]; // base64 JPEG
}): Promise<MyReport | null> {
  const data = await supportCall({ action: "reportProblem", ...input });
  return (data.report as MyReport) ?? null;
}

export async function getMyReport(orderId: string): Promise<MyReport | null> {
  const data = await supportCall({ action: "myReport", orderId });
  return (data.report as MyReport) ?? null;
}
