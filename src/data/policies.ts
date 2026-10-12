// CommunityMarket policies shown in the app (Account -> Policies, sign-up, apply).
//
// The master copy is the "CommunityMarket Policies" document. To correct a
// policy: change the document, then copy the changed text here and update
// POLICIES_UPDATED. Text format: "### " heading, "1. " numbered item,
// "- " bullet, "| a | b |" table row (first row = column names), **bold**.

export const POLICIES_UPDATED = "12 October 2026";

export const BUSINESS = {
  legalName: "EA.TSAMBI ENTERPRISES",
  tradingName: "CommunityMarket",
  email: "eatsambienterprise@gmail.com",
  phone: "07063587442",
  address: "Shop No. 4, Zubairu Johns Plaza, Sabon Kaura (behind ATBU), Bauchi, Bauchi State, Nigeria",
};

export type PolicyKey = "terms" | "privacy" | "refunds";

export type Policy = { key: PolicyKey; tab: string; title: string; body: string };

const WHO_WE_ARE = `CommunityMarket is operated by **${BUSINESS.legalName}**, a business name registered with the Corporate Affairs Commission (CAC) of Nigeria, based in Bauchi, Bauchi State. In these policies, "we", "us" and "CommunityMarket" mean ${BUSINESS.legalName} trading as CommunityMarket.`;

const TERMS = `By creating an account or using CommunityMarket, you agree to these Terms. If you do not agree, do not use the app.

${WHO_WE_ARE}

### 1. What CommunityMarket is

CommunityMarket is an online marketplace in Bauchi. Independent **sellers** list goods, **customers** buy them, and independent **riders** deliver them. We run the app, take payments and pay sellers and riders. Sellers and riders are not our employees.

### 2. Accounts

1. You must be **18 years or older** to create an account.
2. Give true details: your real name, phone number and email. Verify your email when asked.
3. Keep your password private. You are responsible for what happens on your account.
4. One person, one account. Do not create accounts for others or share yours.
5. Everyone starts as a customer. To sell or deliver, you apply in the app, and we may approve or refuse the application.

### 3. Orders, prices and delivery

1. Prices are set by sellers. The app shows the item price and delivery fee before you pay.
2. Payment is made through **Paystack** or your CommunityMarket wallet. An order that is not paid within **30 minutes** expires.
3. Your order may be delivered together with other nearby orders by the same rider.
4. On arrival, give the rider your **delivery code** only after you receive your order. Giving the code confirms delivery.
5. Delivery times are estimates. Delays can happen because of traffic, weather or stock.

### 4. Wallet

1. **Customers:** money in your wallet (from top-ups, refunds or rewards) can only be spent in the app. It **cannot be withdrawn** to a bank or exchanged for cash.
2. **Sellers and riders:** your earnings enter your wallet after delivery. They can be withdrawn after a short clearing period.
3. Withdrawals go only to a Nigerian bank account **in your own registered name**. We check the account name through Paystack. A new or changed bank account is held for **24 hours** before withdrawals.
4. A small withdrawal fee applies. The app shows the fee before you confirm.
5. While a customer report on your order is open, the money from that order cannot be withdrawn. If a refund is charged to you, it is taken from your balance, even below zero, and recovered from later earnings.

### 5. Rewards and referrals

Points and referral rewards are a bonus, not money owed. Only users with a verified email can invite others. We may change or end the rewards programme. We remove points gained by fake accounts, self-referrals or other abuse.

### 6. Rules for sellers

1. Sell only goods you are allowed to sell, described honestly, with real photos and correct prices, sizes and colours.
2. Keep stock up to date and have orders ready for the rider.
3. Do not sell illegal, stolen, fake, expired or dangerous goods, or anything banned by Nigerian law.
4. We charge a commission on each sale. The rate depends on the product category and is shown to you in the app.

### 7. Rules for riders

1. Hold a valid licence and papers for your vehicle, and ride safely.
2. Collect orders from sellers and deliver them complete and on time.
3. Never ask for the delivery code before handing over the order.

### 8. Things no one may do

- Fraud, fake orders, fake reports or payment chargebacks made in bad faith
- Harassing or threatening other users or riders
- Trying to break into, overload or copy the app or its server
- Contacting customers for anything other than their order

### 9. Suspension and closing accounts

We may suspend or close an account that breaks these Terms or puts others at risk. You can delete your account in the app at any time, once you have no open orders, open reports or money to withdraw. Deletion is final after **7 days**.

### 10. Our responsibility

1. Sellers are responsible for the goods they sell. Riders are responsible for delivering them safely.
2. We help resolve problems through in-app reports (see the Refund and Cancellation Policy).
3. As far as the law allows, we are not liable for indirect losses, and our liability for an order is limited to the amount paid for it.
4. Nothing in these Terms removes your rights under the Federal Competition and Consumer Protection Act 2018.

### 11. Changes and law

We may update these Terms. We will tell you in the app before important changes take effect. These Terms are governed by the laws of the Federal Republic of Nigeria.`;

const PRIVACY = `We collect only what we need to run orders, deliveries and payments, and we **never sell your data**. This policy follows the **Nigeria Data Protection Act 2023 (NDPA)**. ${BUSINESS.legalName} is the data controller.

### 1. What we collect

| Who | Information | Why |
| --- | --- | --- |
| Everyone | Name, email, phone number, password (stored by Google Firebase, never seen by us) | Create and secure your account |
| Customers | Delivery address and map location, orders, wallet top-ups, refunds, reports and their photos | Deliver orders, take payment, resolve problems |
| Sellers | Shop name, business address and type, products and photos, bank account number and name | List products, pay you, confirm the bank account is yours |
| Riders | Vehicle type, location while using the rider app, trips, bank account number and name | Assign nearby deliveries, pay you |
| Admins | Sign-in times, device and actions taken in Admin | Security and accountability |
| Everyone | Device notification token, basic technical data (app version, IP address for abuse limits) | Send order updates, stop attacks |

We do not collect card details. Card payments are handled entirely by Paystack.

### 2. Our legal basis

- **Contract:** to provide orders, deliveries, wallet and payouts you ask for
- **Legal obligation:** to keep financial records and respond to lawful requests
- **Legitimate interest:** to prevent fraud and abuse and keep the app secure
- **Consent:** for optional things such as notifications and camera access, which you can turn off in your phone settings

### 3. Who we share it with

| Service | What they receive | Purpose |
| --- | --- | --- |
| Sellers | Your name and the items ordered | Prepare your order |
| Riders | Your name, phone, delivery address and location | Deliver your order |
| Paystack | Payment details, and sellers' and riders' bank account numbers | Take payments, confirm bank account names, send payouts |
| Google Firebase | Account and app data | Sign-in and database |
| Vercel | App data in transit and encrypted daily backups | Run our server and store backups |
| Expo | Notification token and message | Send push notifications |
| AI services (DeepSeek or Anthropic) | Product photos and text sellers choose to send | Suggest product details for listings |

Some of these providers store data outside Nigeria. We use only well-known providers with security safeguards, as the NDPA allows. We share information with authorities only when the law requires it.

### 4. How long we keep it

- **Your account:** while it is open. When you delete it, sign-in is locked at once, and your personal details are erased after **7 days**.
- **Order and payment records:** kept for accounting and tax, but with your name, phone and address removed.
- **Backups:** encrypted, kept for **30 days**, then deleted automatically.
- **Admin activity log:** kept for **12 months**.

### 5. How we protect it

Data is sent over encrypted connections. Backups are locked with encryption. Access to Admin is limited, logged and protected by two-step verification. No system is perfect, and if a breach affects you, we will tell you and the Nigeria Data Protection Commission (NDPC) as the law requires.

### 6. Your rights

Under the NDPA you can ask to:

- See the personal data we hold about you
- Correct wrong details
- Delete your account and data (you can do this yourself in **Account → Delete account**)
- Object to or limit some uses, or withdraw consent
- Receive a copy of your data in a common format

Contact us at ${BUSINESS.email} or ${BUSINESS.phone}. We will reply within **30 days**. If you are not satisfied, you can complain to the **Nigeria Data Protection Commission (NDPC)**.

### 7. Children

CommunityMarket is for adults aged 18 and over. We do not knowingly collect data from children. If you believe a child has an account, contact us and we will remove it.

### 8. Changes

We will tell you in the app before important changes to this policy take effect.`;

const REFUNDS = `You can cancel an order until a rider is assigned, and you can report a problem within **48 hours of delivery**. Approved refunds go to your CommunityMarket wallet.

### 1. Cancelling an order

| When | What happens |
| --- | --- |
| Not paid within 30 minutes | The order expires by itself. You are not charged. |
| Paid, still waiting for a rider | Contact us and we cancel it. Wallet money returns to your wallet at once. A card or bank payment is refunded through Paystack to the way you paid; timing depends on your bank. |
| A rider has been assigned or picked it up | It can no longer be cancelled. If something is wrong when it arrives, report it (section 2). |

### 2. Reporting a problem with a delivered order

1. Open the order in the app and tap **Report a problem** within **48 hours** of delivery.
2. Choose the reason: missing item, damaged item, wrong item, expired or bad quality, never received, or other.
3. Pick the items affected, describe the problem and add up to **2 photos**.
4. The seller can reply. We review the report, usually within 2 working days.
5. If approved, we refund all or part of the amount to your wallet. If rejected, we tell you why.

You can have up to **3 open reports** at a time. Reward points earned on refunded goods are taken back.

### 3. Where refunds go

- **Reports:** refunded to your CommunityMarket wallet, to spend on your next order.
- **Cancelled paid orders:** the wallet part to your wallet; the card or bank part back through Paystack.
- **Wallet money cannot be withdrawn** to a bank or paid out as cash (see Terms of Use, section 4).

### 4. Who pays for a refund

We decide who caused the problem: the seller (for example, wrong or damaged goods), the rider (for example, an order never delivered) or CommunityMarket. The refund is taken from that party's balance. While a report is open, the seller's and rider's earnings from that order are frozen.

### 5. What is not refunded

- Problems reported more than 48 hours after delivery
- Change of mind after delivery, if the item is as described
- Items damaged by the customer after delivery
- Reports found to be false; repeated false reports can lead to account suspension

### 6. Help

Contact us at ${BUSINESS.email} or ${BUSINESS.phone} with your order number. Your rights under the Federal Competition and Consumer Protection Act 2018 are not affected by this policy.`;

export const POLICIES: Policy[] = [
  { key: "terms", tab: "Terms", title: "Terms of Use", body: TERMS },
  { key: "privacy", tab: "Privacy", title: "Privacy Policy", body: PRIVACY },
  { key: "refunds", tab: "Refunds", title: "Refund and Cancellation Policy", body: REFUNDS },
];

export function policyByKey(key: string | undefined): Policy {
  return POLICIES.find((p) => p.key === key) ?? POLICIES[0];
}
