import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { auth, db } from "../lib/firebase";
import type { User, UserRole } from "../types/community";

// One login for the whole app: Firebase email + password.
// The user's profile lives in Firestore at users/{uid}. Everyone starts as a
// "customer"; only the admin (server script) can change a role.

export type SignUpInput = {
  name: string;
  phone: string;
  email: string;
  password: string;
};

type AuthContextType = {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateMyProfile: (changes: { name?: string; phone?: string }) => Promise<void>;
  refreshUser: () => Promise<User | null>;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLES: UserRole[] = ["customer", "seller", "rider", "admin"];

// Name and phone typed on the sign-up screen, waiting for the new account's
// profile to be created. (Firebase reports the new login before signUp()
// returns, so the profile is created in one place: the listener below.)
let pendingSignUp: { email: string; name: string; phone: string } | null = null;

function toIso(value: unknown): string {
  const ts = value as Timestamp | null | undefined;
  if (ts && typeof ts.toDate === "function") return ts.toDate().toISOString();
  return new Date().toISOString();
}

function profileFromDoc(uid: string, data: any, fallbackEmail: string | null): User {
  const role: UserRole = ROLES.includes(data?.role) ? data.role : "customer";
  return {
    id: uid,
    name: typeof data?.name === "string" && data.name.trim() ? data.name : "Customer",
    phone: typeof data?.phone === "string" ? data.phone : "",
    email: typeof data?.email === "string" ? data.email : fallbackEmail ?? undefined,
    role,
    status: data?.status === "suspended" || data?.status === "inactive" ? data.status : "active",
    createdAt: toIso(data?.createdAt),
    updatedAt: toIso(data?.updatedAt),
  };
}

export function friendlyAuthError(e: any): string {
  const code: string = e?.code || "";
  if (
    code.includes("invalid-credential") ||
    code.includes("wrong-password") ||
    code.includes("user-not-found")
  ) {
    return "Wrong email or password.";
  }
  if (code.includes("email-already-in-use")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (code.includes("invalid-email")) return "That email address doesn't look right.";
  if (code.includes("weak-password")) return "Use a password of at least 6 characters.";
  if (code.includes("too-many-requests")) return "Too many attempts. Wait a minute and try again.";
  if (code.includes("network")) return "No internet connection. Please try again.";
  return e?.message || "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  // 1. Who is signed in?
  useEffect(() => {
    return onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      setAuthReady(true);
      if (!fbUser) {
        setUser(null);
        setProfileReady(true);
      } else {
        setProfileReady(false);
      }
    });
  }, []);

  // 2. Their profile (live: role changes by the admin show up immediately).
  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const ref = doc(db, "users", uid);
    let lastRole: string | null = null;

    return onSnapshot(
      ref,
      async (snap) => {
        if (!snap.exists()) {
          // New account (or one made before profiles existed): create a
          // customer profile, using the sign-up form's details if we have them.
          const pending =
            pendingSignUp &&
            pendingSignUp.email.toLowerCase() === (firebaseUser.email || "").toLowerCase()
              ? pendingSignUp
              : null;
          pendingSignUp = null;
          try {
            await setDoc(ref, {
              name:
                pending?.name ||
                firebaseUser.displayName ||
                (firebaseUser.email ? firebaseUser.email.split("@")[0] : "Customer"),
              phone: pending?.phone || "",
              email: firebaseUser.email ?? null,
              role: "customer",
              status: "active",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            console.warn("PROFILE CREATE FAILED:", err);
            setUser(profileFromDoc(uid, {}, firebaseUser.email));
            setProfileReady(true);
          }
          return; // the snapshot fires again once created
        }

        const data = snap.data();
        // When the admin changes a role, refresh the login token so the
        // database security rules see the new role too.
        if (lastRole !== null && data.role !== lastRole) {
          firebaseUser.getIdToken(true).catch(() => undefined);
        }
        lastRole = data.role ?? null;

        const profile = profileFromDoc(uid, data, firebaseUser.email);
        if (profile.status !== "active") {
          await firebaseSignOut(auth);
          return;
        }
        setUser(profile);
        setProfileReady(true);
      },
      (err) => {
        console.warn("PROFILE LOAD FAILED:", err);
        setUser(profileFromDoc(uid, {}, firebaseUser.email));
        setProfileReady(true);
      },
    );
  }, [firebaseUser]);

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }

  async function signUp(input: SignUpInput) {
    const name = input.name.trim();
    const phone = input.phone.trim();
    if (!name) throw new Error("Please enter your name.");
    if (!phone) throw new Error("Please enter your phone number.");

    pendingSignUp = { email: input.email.trim(), name, phone };
    try {
      const cred = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
      await updateProfile(cred.user, { displayName: name }).catch(() => undefined);
    } catch (e) {
      pendingSignUp = null;
      throw e;
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email.trim());
  }

  async function updateMyProfile(changes: { name?: string; phone?: string }) {
    if (!firebaseUser) throw new Error("Please sign in.");
    const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (typeof changes.name === "string" && changes.name.trim()) update.name = changes.name.trim();
    if (typeof changes.phone === "string") update.phone = changes.phone.trim();
    await updateDoc(doc(db, "users", firebaseUser.uid), update);
  }

  async function refreshUser() {
    return user;
  }

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      firebaseUser,
      isLoading: !authReady || (firebaseUser !== null && !profileReady),
      isAuthenticated: user !== null,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updateMyProfile,
      refreshUser,
      hasRole: (role) => user?.role === role,
      hasAnyRole: (roles) => (user ? roles.includes(user.role) : false),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, firebaseUser, authReady, profileReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
