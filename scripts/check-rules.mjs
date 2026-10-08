// Checks the LIVE Firestore security rules from the terminal.
//
// Signs in as a normal customer account, does what the app normally does
// (must work) and then tries to cheat (must be refused).
//
// Run from the app folder:
//   node scripts/check-rules.mjs customer@email.com "password"
//
// Use an ordinary customer account, NOT your admin account.
// Nothing real is changed: normal actions only re-save your own name, and
// every cheat attempt uses test ids like "ruletest_...". If a cheat attempt
// ever says ALLOWED, tell Claude/fix the rules and delete that test document.

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirestore, terminate, collection, doc, query, where, limit,
  getDoc, getDocs, setDoc, updateDoc, addDoc, serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCzsi7n2bLITZxpJXxFFkLEExN0ZPPKSwM",
  authDomain: "communitymarket-c7b68.firebaseapp.com",
  projectId: "communitymarket-c7b68",
  storageBucket: "communitymarket-c7b68.firebasestorage.app",
  messagingSenderId: "706660614309",
  appId: "1:706660614309:web:67c242e921504320fccd4c",
};

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.log('Usage: node scripts/check-rules.mjs customer@email.com "password"');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let passed = 0;
let failed = 0;
const denied = (e) => e?.code === "permission-denied" || /permission/i.test(e?.message || "");

async function shouldWork(label, fn) {
  try {
    const note = await fn();
    passed++;
    console.log(`  ✅ ${label}${note ? `  (${note})` : ""}`);
  } catch (e) {
    failed++;
    console.log(`  ❌ ${label}  -> BLOCKED: ${e?.code || e?.message}`);
  }
}

async function shouldBeRefused(label, fn) {
  try {
    await fn();
    failed++;
    console.log(`  ❌ ${label}  -> ALLOWED (this is a security hole!)`);
  } catch (e) {
    if (denied(e)) {
      passed++;
      console.log(`  ✅ ${label}  -> refused`);
    } else {
      failed++;
      console.log(`  ⚠️  ${label}  -> unexpected error: ${e?.code || e?.message}`);
    }
  }
}

let cred;
try {
  cred = await signInWithEmailAndPassword(auth, email, password);
} catch (e) {
  console.log(`\nCould not sign in: ${e?.code || e?.message}`);
  console.log("Check the email and password (use a customer account from the app).");
  process.exit(1);
}
const uid = cred.user.uid;
const token = await cred.user.getIdTokenResult();
console.log(`\nSigned in as ${email}  (role: ${token.claims.role || "customer"})`);
if (token.claims.role === "admin") {
  console.log("⚠️  This is an ADMIN account. Use a normal customer account for this check.\n");
}

let firstProduct = null;
let myOrder = null;
let myProfile = null;

console.log("\nNormal app actions (must work):");
await shouldWork("Read products shown to customers", async () => {
  const snap = await getDocs(query(collection(db, "products"), where("active", "==", true)));
  firstProduct = snap.docs[0] || null;
  return `${snap.size} products`;
});
await shouldWork("Read my own orders", async () => {
  const snap = await getDocs(query(collection(db, "orders"), where("customerId", "==", uid)));
  myOrder = snap.docs[0] || null;
  return `${snap.size} orders`;
});
await shouldWork("Read my own profile", async () => {
  const snap = await getDoc(doc(db, "users", uid));
  myProfile = snap.exists() ? snap.data() : null;
  return myProfile ? myProfile.name : "no profile yet";
});
if (myProfile) {
  await shouldWork("Edit my own name (saved unchanged)", () =>
    updateDoc(doc(db, "users", uid), { name: myProfile.name, updatedAt: serverTimestamp() }),
  );
}

console.log("\nCheating attempts (must be refused):");
await shouldBeRefused("Read ALL orders (other people's too)", () =>
  getDocs(query(collection(db, "orders"), limit(5))),
);
await shouldBeRefused("Create a fake paid order", () =>
  setDoc(doc(db, "orders", `ruletest_${uid}`), { customerId: uid, total: 1, status: "paid" }),
);
if (myOrder) {
  await shouldBeRefused("Change my own order", () =>
    updateDoc(doc(db, "orders", myOrder.id), { status: myOrder.data().status }),
  );
}
await shouldBeRefused("Make myself admin", () =>
  updateDoc(doc(db, "users", uid), { role: "admin" }),
);
await shouldBeRefused("Read my wallet directly", () =>
  getDoc(doc(db, "partnerWallets", `customer_${uid}`)),
);
await shouldBeRefused("Add money to my wallet", () =>
  setDoc(doc(db, "partnerWallets", `customer_${uid}`), { ruleTest: true }, { merge: true }),
);
await shouldBeRefused("Write a ledger entry", () =>
  setDoc(doc(db, "ledger", `ruletest_${uid}`), { amount: 50000 }),
);
await shouldBeRefused("Read the ledger", () => getDocs(query(collection(db, "ledger"), limit(1))));
await shouldBeRefused("Give myself reward points", () =>
  setDoc(doc(db, "rewardAccounts", uid), { ruleTest: true }, { merge: true }),
);
await shouldBeRefused("Create my own invite code", () =>
  setDoc(doc(db, "referralCodes", "RULETEST"), { uid }),
);
await shouldBeRefused("Create a withdrawal", () =>
  setDoc(doc(db, "withdrawals", `ruletest_${uid}`), { amount: 50000 }),
);
await shouldBeRefused("Fake a wallet top-up", () =>
  setDoc(doc(db, "topups", `TU_ruletest_${uid}`), { amount: 50000, status: "paid" }),
);
await shouldBeRefused("Read payments", () => getDocs(query(collection(db, "payments"), limit(1))));
await shouldBeRefused("Change commission settings", () =>
  setDoc(doc(db, "settings", "commissions"), { ruleTest: true }, { merge: true }),
);
await shouldBeRefused("Read sellers' details", () => getDocs(query(collection(db, "sellers"), limit(1))));
await shouldBeRefused("Read riders' details", () => getDocs(query(collection(db, "riders"), limit(1))));
await shouldBeRefused("Create a product", () =>
  setDoc(doc(db, "products", `ruletest_${uid}`), { name: "x", price: 1, active: true }),
);
if (firstProduct) {
  await shouldBeRefused("Change a product's price", () =>
    updateDoc(doc(db, "products", firstProduct.id), { price: firstProduct.data().price }),
  );
}
await shouldBeRefused("Read hidden products", () =>
  getDocs(query(collection(db, "products"), where("active", "==", false), limit(1))),
);
await shouldBeRefused("Send a pre-approved application", () =>
  addDoc(collection(db, "roleApplications"), {
    uid, name: "x", requestedRole: "rider", status: "approved", createdAt: serverTimestamp(),
  }),
);
await shouldBeRefused("Apply to become admin", () =>
  addDoc(collection(db, "roleApplications"), {
    uid, name: "x", requestedRole: "admin", status: "pending", createdAt: serverTimestamp(),
  }),
);

console.log(`\n${passed} passed, ${failed} failed`);
console.log(failed === 0 ? "🔒 Rules are working.\n" : "⚠️  Something needs fixing - send this output to Claude.\n");

await signOut(auth);
await terminate(db);
process.exit(failed === 0 ? 0 : 1);
