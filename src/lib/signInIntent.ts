// Remembers, for a moment, HOW someone signed in, so the app knows where to
// take them afterwards (see AuthGate in app/_layout.tsx).

type Intent = "admin" | null;
let intent: Intent = null;
let notice: string | null = null;

export function setSignInIntent(next: Intent) {
  intent = next;
}

// Read once, then forgotten.
export function takeSignInIntent(): Intent {
  const v = intent;
  intent = null;
  return v;
}

// A message for the sign-in screen (e.g. "not an admin account").
export function setSignInNotice(text: string | null) {
  notice = text;
}

export function takeSignInNotice(): string | null {
  const v = notice;
  notice = null;
  return v;
}
