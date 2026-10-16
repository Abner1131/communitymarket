// Marketer Terms and Manager Terms (the marketing team's agreement).
//
// Same text format as src/data/policies.ts ("### " heading, "1. " numbered,
// "- " bullet, "| a | b |" table, **bold**). The numbers (5%, 10%, 6 months,
// 7%...) are filled in from the live pay settings, so what people read is what
// the server pays.
//
// MARKETER_TERMS_VERSION must equal TERMS_VERSION in
// communitymarket-server/lib/marketerPay.js. When the Terms change in a way
// people must agree to again, raise BOTH to a new date.
//
// These are plain-English terms written for a small Nigerian business. Have a
// lawyer read them before real marketers sign.

import { BUSINESS } from "./policies";

export const MARKETER_TERMS_VERSION = "2026-10-16";
export const MARKETER_TERMS_UPDATED = "16 October 2026";

// What the server pays when the admin has not changed anything.
export type PayNumbers = {
  marketerPct: number;
  managerTeamPct: number;
  months: number;
  shopActiveOrders: number;
  riderActiveTrips: number;
  capPct?: number;
};

export const DEFAULT_PAY_NUMBERS: Required<PayNumbers> = {
  marketerPct: 5,
  managerTeamPct: 10,
  months: 6,
  shopActiveOrders: 5,
  riderActiveTrips: 10,
  capPct: 7,
};

export type TermsKind = "marketer" | "manager";

export const NOTICE_DAYS = 7;

function fill(s?: Partial<PayNumbers> | null): Required<PayNumbers> {
  return { ...DEFAULT_PAY_NUMBERS, ...(s || {}) } as Required<PayNumbers>;
}

function naira(n: number) {
  return `₦${Math.round(n).toLocaleString()}`;
}

export function termsTitle(kind: TermsKind) {
  return kind === "manager" ? "Manager Terms" : "Marketer Terms";
}

// The short version people see before the full text.
export function termsKeyPoints(kind: TermsKind, settings?: Partial<PayNumbers> | null): string[] {
  const s = fill(settings);
  const points = [
    "You work for yourself. You are not an employee of CommunityMarket, and there is no salary.",
    `You earn ${s.marketerPct}% of what CommunityMarket makes on the shops and riders you sign up, for ${s.months} months from the day each one is approved.`,
  ];
  if (kind === "manager") {
    points.push(`You also earn ${s.managerTeamPct}% of what each marketer in your team earns. We pay that on top, so it is not taken from them.`);
  }
  points.push(
    `All marketing pay together is limited to ${s.capPct}% of the money those sign-ups made us. Above that, everyone is reduced by the same share.`,
    "Earnings are not guaranteed. You may earn nothing. Never tell anyone they will definitely earn.",
    "We pay every Friday, for the week before (Monday to Sunday), by bank transfer to an account in your own name.",
    `Either of us can end this with ${NOTICE_DAYS} days' notice. Cheating ends it straight away.`,
  );
  return points;
}

export function marketerTermsBody(kind: TermsKind, settings?: Partial<PayNumbers> | null): string {
  const s = fill(settings);
  const manager = kind === "manager";
  const exampleShop = 100000;
  const exampleMarketer = (exampleShop * s.marketerPct) / 100;
  const exampleTeam = (exampleMarketer * s.managerTeamPct) / 100;

  const intro = `These are the **${termsTitle(kind)}** between you and **${BUSINESS.legalName}**, trading as ${BUSINESS.tradingName} ("we", "us"). They are in addition to our Terms of Use, Privacy Policy and Refund Policy. By ticking "I agree" you accept them. If you do not agree, do not tick, and do not use a marketer code.`;

  const what = `### 1. What this is

1. ${manager ? "You lead a team of marketers, and you also sign up shops and riders yourself." : "You help shops and riders join CommunityMarket by giving them your marketer code."} You are **independent**. You are **not our employee**, you have no salary, and you are not our partner or agent.
2. We may offer you a job or other work in future. Nothing here promises that.
3. You use your own phone, data and time, and you pay your own costs.`;

  const earn = `### 2. How you earn

| You sign up | You earn |
| A shop | ${s.marketerPct}% of the commission CommunityMarket makes on that shop's delivered orders |
| A rider | ${s.marketerPct}% of our delivery profit (the delivery fee minus what the rider is paid) on that rider's trips |

1. A shop or rider joins you when they type your code in the app while applying, and we approve them.
2. You earn on them for **${s.months} months** from the day they are approved. After that you earn nothing more on them.
3. A shop **counts** once it has ${s.shopActiveOrders} delivered orders. A rider counts once they have finished ${s.riderActiveTrips} trips. Orders from before that point inside the ${s.months} months are paid too, in the month it starts to count.
4. **Example:** a shop you signed up makes us ${naira(exampleShop)} in commission in a week. You earn ${naira(exampleMarketer)}.${manager ? ` The same shop signed up by one of your marketers: that marketer earns ${naira(exampleMarketer)} and you earn a further ${naira(exampleTeam)} (see section 3).` : ""}`;

  const managerSection = manager
    ? `### 3. Your team (managers only)

1. Marketer codes you create are **your team**. You earn **${s.managerTeamPct}%** of what each of them earns, for as long as they earn it.
2. This is paid by CommunityMarket **on top**. It is **not** taken from your marketers' pay.
3. You earn ${s.marketerPct}% on your own sign-ups in the same way as a marketer.
4. You must recruit honestly, teach your team these Terms, and give each marketer's PIN only to that marketer. Never keep, ask for or use a marketer's PIN or password.
5. We pay every marketer directly. You never collect or hold their pay, and you must not take any money or share from them.
6. If a team member breaks these Terms, we may stop their pay and your ${s.managerTeamPct}% on it. Repeated problems in your team may affect your own agreement.`
    : "";
  const n = (num: number) => (manager ? num + 1 : num);

  const cap = `### ${n(3)}. The ${s.capPct}% limit

All the pay we give out on sign-ups (marketers and managers together) can **never be more than ${s.capPct}%** of the money those sign-ups made us. If it would be more, **everyone's pay is reduced by the same share**. We need the rest to run CommunityMarket, pay costs and grow, and to offer good marketers work later.`;

  const notEarn = `### ${n(4)}. When you do not earn

- An order that is **refunded** earns nothing. If we already paid it, it is taken from your next pay.
- A shop or rider that is really **you** (same login, phone number or bank account) earns you nothing.
- A shop or rider that has not yet counted (see section 2) earns nothing until it does.
- Anything after ${s.months} months from approval.
- Orders, sign-ups or activity that are fake or dishonest (see section ${n(6)}).`;

  const paid = `### ${n(5)}. How and when you are paid

1. Pay weeks run **Monday to Sunday**. When a week ends, the admin closes it and works out everyone's pay. From then you can see your pay in the app, under Marketer earnings.
2. **We pay every Friday** for the week that ended the Sunday before. The app shows the date it is due.
3. We pay by bank transfer to a Nigerian account **in your own name**. Add it in the app under Marketer earnings. A new or changed account is held for 24 hours before it can be paid. We cannot pay an account that is not in your name.
4. You are responsible for any tax on what you earn.`;

  const conduct = `### ${n(6)}. Your promises

1. Tell shops and riders the **truth** about how CommunityMarket works, our commission and fees.
2. **Never promise or guarantee** sales, orders or income to anyone, and never say you will make them rich.
3. Do not charge anyone a fee for signing up, and never take a shop's or rider's money, password, PIN or delivery code.
4. No fake shops, fake riders or fake orders. Do not sign up yourself, your family or friends under another identity just to earn.
5. Do not pretend to be CommunityMarket staff or speak for us beyond what these Terms allow.
6. Keep customers', shops' and riders' information private.
7. Obey Nigerian law. No spam, harassment or pressure on people.
8. Keep your PIN and your account private. Do not sell, lend or share your code or account.`;

  const breach = `### ${n(7)}. If you break the rules

If we find a breach of section ${n(6)}, we may stop pay linked to it, take back pay already paid for it, deactivate your code and end this agreement straight away. Pay you honestly earned before that is still paid in the normal way.`;

  const ending = `### ${n(8)}. Ending this agreement

1. You or we can end it at any time with **${NOTICE_DAYS} days' notice**. Tell us in writing (email or phone message to the contact below).
2. We may end it **immediately** if you break section ${n(6)}.
3. When it ends, pay for orders delivered up to the end date is still paid in the normal way. New orders after the end date earn nothing.`;

  const risk = `### ${n(9)}. Earnings are not guaranteed

Plainly: **nobody can promise you will earn.** You earn only when your shops and riders get real, delivered orders. You may earn **nothing at all**. The rates, the ${s.months}-month limit and the ${s.capPct}% limit all affect what you earn. Do not borrow money, quit work or spend money expecting this pay.`;

  const changes = `### ${n(10)}. Changes

We may change the rates, the number of months or these Terms. We will tell you in the app **at least ${NOTICE_DAYS} days before** a change starts, and you will be asked to agree to the new Terms. A week that is already closed is never changed. If you do not agree to a change, you can end this agreement.`;

  const info = `### ${n(11)}. Your information and law

We keep your phone number and bank details private and use them only to pay you and to run the marketing programme. These Terms are governed by the laws of the Federal Republic of Nigeria. Contact us at ${BUSINESS.email} or ${BUSINESS.phone}. ${BUSINESS.legalName}, ${BUSINESS.address}.`;

  return [intro, what, earn, managerSection, cap, notEarn, paid, conduct, breach, ending, risk, changes, info].filter(Boolean).join("\n\n");
}
