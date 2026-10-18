// Your own profile picture. The server makes it a small square and keeps the
// link on your profile; the app then updates by itself.

import { pickProductPhoto } from "./photoPick";
import { API_URL, auth } from "./firebase";

async function send(body: object): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in.");
  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}/api/profile-photo`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not save your photo. Please try again.");
}

/** Take or choose a photo and save it. Returns false if the person cancelled. */
export async function changeProfilePhoto(source: "camera" | "library"): Promise<boolean> {
  const picked = await pickProductPhoto(source, { what: "your profile picture", maxSide: 600 });
  if (!picked) return false;
  await send({ image: picked.base64 });
  return true;
}

export async function removeProfilePhoto(): Promise<void> {
  await send({ remove: true });
}
