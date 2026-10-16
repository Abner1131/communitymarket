// Nigerian phone numbers, the one rule for the whole app.
//
// Accepted: 11 digits starting with 0 (08012345678) or +234 followed by 10
// digits (+2348012345678). Spaces and dashes typed in between are ignored.
// Numbers are saved as the 11-digit form, so one person can't register twice
// by writing their number two ways.
//
// The server has the same rule in communitymarket-server/lib/phone.js. Keep
// them the same.

export const PHONE_MESSAGE = "Enter a phone number with 11 digits (like 08012345678) or starting with +234.";

/** The 11-digit number (08012345678), or null if the input is not allowed. */
export function normalizePhone(input: string): string | null {
  const raw = (input || "").trim().replace(/[\s-]/g, "");
  if (/^0\d{10}$/.test(raw)) return raw;
  if (/^\+234\d{10}$/.test(raw)) return `0${raw.slice(4)}`;
  return null;
}
