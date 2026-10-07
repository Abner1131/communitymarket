import { auth, API_URL } from "./firebase";

export async function payForOrder(
  orderId: string
): Promise<{ authorizationUrl: string; reference: string }> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Please sign in before paying");
  }
  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}/api/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orderId }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Could not start payment");
  }
  return data;
}
