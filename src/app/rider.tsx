import { router } from "expo-router";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { WalletCard } from "../components/WalletCard";
import { auth } from "../lib/firebase";
import {
  riderAction,
  RiderApiError,
  type RiderPoint,
  type RiderState,
} from "../lib/riderApi";
import { getCurrentUserLocation } from "../services/location";

const NAIRA = "₦";
const REFRESH_EVERY_MS = 20000;

// GPS is a bonus: never let a slow or refused location block an action.
async function tryLocation(): Promise<RiderPoint | undefined> {
  try {
    return await Promise.race([
      getCurrentUserLocation(),
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 5000)),
    ]);
  } catch {
    return undefined;
  }
}

function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Yes", onPress: () => resolve(true) },
    ]),
  );
}

function openMaps(point: RiderPoint | null) {
  if (!point) return;
  void Linking.openURL(
    `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`,
  );
}

const TRIP_STATUS: Record<string, string> = {
  assigned: "New trip — go to the sellers",
  collecting: "Collecting items",
  en_route: "All items collected — deliver to customers",
};

// ---------- sign in ----------
function RiderSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function go(create: boolean) {
    setMessage("");
    if (!email.trim() || password.length < 6) {
      setMessage("Enter your email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (create) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (e: any) {
      setMessage(e?.message || "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Rider sign in</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password (6+ characters)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {message ? <Text style={styles.errorText}>{message}</Text> : null}
      <Pressable style={styles.primaryButton} disabled={busy} onPress={() => go(false)}>
        <Text style={styles.primaryButtonText}>{busy ? "Please wait..." : "Sign in"}</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} disabled={busy} onPress={() => go(true)}>
        <Text style={styles.secondaryButtonText}>New rider? Create account</Text>
      </Pressable>
    </View>
  );
}

// ---------- main screen ----------
export default function RiderScreen() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [authChecked, setAuthChecked] = useState(false);
  const [state, setState] = useState<RiderState | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [notLinkedEmail, setNotLinkedEmail] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      setAuthChecked(true);
    });
    return () => {
      mounted.current = false;
      unsub();
    };
  }, []);

  const run = useCallback(
    async (
      label: string | null,
      action: "me" | "setOnline" | "pickedUp" | "delivered",
      extra: Record<string, unknown> = {},
      withLocation = false,
    ) => {
      if (label) setWorking(label);
      setErrorMessage("");
      try {
        const location = withLocation ? await tryLocation() : undefined;
        const next = await riderAction(action, location ? { ...extra, location } : extra);
        if (mounted.current) {
          setState(next);
          setNotLinkedEmail(null);
        }
      } catch (e: any) {
        if (!mounted.current) return;
        if (e instanceof RiderApiError && e.notLinked) {
          setState(null);
          setNotLinkedEmail(e.email || firebaseUser?.email || "");
        } else {
          setErrorMessage(e?.message || "Something went wrong.");
        }
      } finally {
        if (mounted.current) {
          setWorking(null);
          setLoading(false);
        }
      }
    },
    [firebaseUser],
  );

  // Load on sign-in, then refresh regularly so new trips appear.
  useEffect(() => {
    if (!firebaseUser) {
      setState(null);
      return;
    }
    setLoading(true);
    void run(null, "me", {}, true);
    const timer = setInterval(() => void run(null, "me"), REFRESH_EVERY_MS);
    return () => clearInterval(timer);
  }, [firebaseUser, run]);

  const rider = state?.rider;
  const trip = state?.trip;
  const allCollected = trip?.status === "en_route";

  // Wallet actions report their own errors inside the wallet card.
  async function walletAction(action: "setBank" | "withdraw", extra: Record<string, unknown>) {
    try {
      const next = await riderAction(action, extra);
      if (mounted.current) setState(next);
      return null;
    } catch (e: any) {
      return (e?.message as string) || "Something went wrong.";
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => firebaseUser && void run(null, "me", {}, true)}
          />
        }
      >
        <Pressable onPress={() => router.replace("/")}>
          <Text style={styles.backText}>{"←"} Home</Text>
        </Pressable>
        <Text style={styles.title}>Rider</Text>

        {!authChecked ? (
          <ActivityIndicator size="large" style={{ marginTop: 40 }} />
        ) : !firebaseUser ? (
          <RiderSignIn />
        ) : loading && !state && notLinkedEmail === null ? (
          <ActivityIndicator size="large" style={{ marginTop: 40 }} />
        ) : notLinkedEmail !== null ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Not linked to a rider profile yet</Text>
            <Text style={styles.muted}>
              Ask the CommunityMarket admin to link this account:
            </Text>
            <Text style={styles.highlight}>{notLinkedEmail}</Text>
            <Pressable style={styles.primaryButton} onPress={() => void run("me", "me")}>
              <Text style={styles.primaryButtonText}>Check again</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => void signOut(auth)}>
              <Text style={styles.secondaryButtonText}>Sign out</Text>
            </Pressable>
          </View>
        ) : rider ? (
          <>
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* profile */}
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.cardTitle}>{rider.name}</Text>
                  <Text style={styles.muted}>
                    {rider.id} · {rider.vehicle.toUpperCase()}
                    {rider.rating ? ` · ★ ${rider.rating}` : ""}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        rider.availability === "available"
                          ? "#1e7d32"
                          : rider.availability === "busy"
                            ? "#1565c0"
                            : "#888",
                    },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {rider.availability === "busy" ? "ON TRIP" : rider.availability.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={[styles.rowBetween, { marginTop: 14 }]}>
                <Text style={styles.muted}>Trips completed</Text>
                <Text style={styles.value}>{rider.completedTrips}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.muted}>Total earned (all time)</Text>
                <Text style={styles.value}>
                  {NAIRA}
                  {rider.earningsTotal.toLocaleString()}
                </Text>
              </View>

              {!trip && (
                <Pressable
                  style={rider.availability === "available" ? styles.secondaryButton : styles.primaryButton}
                  disabled={working !== null}
                  onPress={() =>
                    void run("online", "setOnline", { online: rider.availability !== "available" }, true)
                  }
                >
                  <Text
                    style={
                      rider.availability === "available"
                        ? styles.secondaryButtonText
                        : styles.primaryButtonText
                    }
                  >
                    {working === "online"
                      ? "Please wait..."
                      : rider.availability === "available"
                        ? "Go offline"
                        : "Go online"}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* trip */}
            {!trip ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {rider.availability === "available" ? "Waiting for a trip..." : "You are offline"}
                </Text>
                <Text style={styles.muted}>
                  {rider.availability === "available"
                    ? "New trips appear here automatically. Pull down to refresh."
                    : "Go online to receive trips."}
                </Text>
              </View>
            ) : (
              <>
                <View style={[styles.card, styles.tripBanner]}>
                  <Text style={styles.bannerTitle}>{TRIP_STATUS[trip.status] || trip.status}</Text>
                  <Text style={styles.bannerText}>
                    {trip.orderIds.length} order(s) {"·"} {trip.routeKm} km {"·"} you earn{" "}
                    {NAIRA}
                    {trip.riderPay.toLocaleString()}
                  </Text>
                </View>

                <Text style={styles.sectionTitle}>1. Collect from sellers</Text>
                {trip.pickupStops.map((stop) => {
                  const done = stop.status === "picked_up";
                  return (
                    <View key={stop.sellerId} style={[styles.card, done && styles.doneCard]}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.cardTitle}>{stop.sellerName}</Text>
                        {done && <Text style={styles.doneText}>{"✓"} Collected</Text>}
                      </View>
                      {!done && stop.ready === false ? (
                        <Text style={styles.waitText}>The seller is still packing this order.</Text>
                      ) : null}
                      {stop.items.map((item, i) => (
                        <Text key={i} style={styles.item}>
                          {"•"} {item.productName} {"×"} {item.quantity}
                        </Text>
                      ))}
                      {!done && (
                        <View style={styles.buttonRow}>
                          <Pressable style={styles.smallButton} onPress={() => openMaps(stop.location)}>
                            <Text style={styles.smallButtonText}>Directions</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.smallButton, styles.smallPrimary, stop.ready === false && { opacity: 0.4 }]}
                            disabled={working !== null || stop.ready === false}
                            onPress={() =>
                              void run(`pick-${stop.sellerId}`, "pickedUp", { sellerId: stop.sellerId }, true)
                            }
                          >
                            <Text style={styles.smallPrimaryText}>
                              {working === `pick-${stop.sellerId}`
                                ? "Saving..."
                                : stop.ready !== false
                                  ? "Picked up"
                                  : "Waiting for seller"}
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}

                <Text style={styles.sectionTitle}>2. Deliver to customers</Text>
                {!allCollected && (
                  <Text style={styles.muted}>Collect every item first, then deliveries unlock.</Text>
                )}
                {trip.dropoffs.map((drop) => {
                  const done = drop.status === "delivered";
                  return (
                    <View
                      key={drop.orderId}
                      style={[styles.card, done && styles.doneCard, !allCollected && styles.lockedCard]}
                    >
                      <View style={styles.rowBetween}>
                        <Text style={styles.cardTitle}>{drop.customerName || "Customer"}</Text>
                        {done && <Text style={styles.doneText}>{"✓"} Delivered</Text>}
                      </View>
                      <Text style={styles.item}>{drop.customerAddress}</Text>
                      <Text style={styles.muted}>Order #{drop.orderId.slice(0, 8).toUpperCase()}</Text>
                      {!done && (
                        <View style={styles.buttonRow}>
                          {drop.customerPhone ? (
                            <Pressable
                              style={styles.smallButton}
                              onPress={() => void Linking.openURL(`tel:${drop.customerPhone}`)}
                            >
                              <Text style={styles.smallButtonText}>Call</Text>
                            </Pressable>
                          ) : null}
                          <Pressable style={styles.smallButton} onPress={() => openMaps(drop.location)}>
                            <Text style={styles.smallButtonText}>Directions</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.smallButton, styles.smallPrimary, !allCollected && { opacity: 0.4 }]}
                            disabled={!allCollected || working !== null}
                            onPress={async () => {
                              const ok = await confirm(
                                "Confirm delivery",
                                `Hand the order to ${drop.customerName || "the customer"}?`,
                              );
                              if (ok) void run(`drop-${drop.orderId}`, "delivered", { orderId: drop.orderId }, true);
                            }}
                          >
                            <Text style={styles.smallPrimaryText}>
                              {working === `drop-${drop.orderId}` ? "Saving..." : "Delivered"}
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}

            {state?.wallet ? (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.sectionTitle}>My wallet</Text>
                <WalletCard
                  wallet={state.wallet}
                  onSaveBank={async (bank) => walletAction("setBank", { bank })}
                  onWithdraw={async (amount) => walletAction("withdraw", { amount })}
                />
              </View>
            ) : null}

            <Pressable style={[styles.secondaryButton, { marginTop: 24 }]} onPress={() => void signOut(auth)}>
              <Text style={styles.secondaryButtonText}>Sign out</Text>
            </Pressable>
          </>
        ) : errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable style={styles.primaryButton} onPress={() => void run("me", "me", {}, true)}>
              <Text style={styles.primaryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f6f8" },
  container: { padding: 20, paddingBottom: 60 },
  backText: { fontWeight: "700", marginBottom: 14 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 16 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 12 },
  doneCard: { opacity: 0.6 },
  lockedCard: { opacity: 0.75 },
  cardTitle: { fontSize: 17, fontWeight: "800" },
  sectionTitle: { fontSize: 15, fontWeight: "800", marginTop: 12, marginBottom: 8 },
  muted: { color: "#666", marginTop: 4 },
  value: { fontWeight: "700", marginTop: 4 },
  highlight: { fontWeight: "800", fontSize: 16, marginVertical: 10 },
  item: { marginTop: 6, fontSize: 14 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  tripBanner: { backgroundColor: "#1565c0" },
  bannerTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  bannerText: { color: "#e3f2fd", marginTop: 6 },
  doneText: { color: "#1e7d32", fontWeight: "800" },
  waitText: { color: "#b26a00", fontWeight: "700", marginTop: 6 },
  buttonRow: { flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" },
  smallButton: {
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  smallButtonText: { fontWeight: "700" },
  smallPrimary: { backgroundColor: "#222", flexGrow: 1, alignItems: "center" },
  smallPrimaryText: { color: "#fff", fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    backgroundColor: "#fff",
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: "#222",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryButtonText: { fontWeight: "700" },
  errorBox: { backgroundColor: "#fdecea", borderRadius: 12, padding: 14, marginBottom: 12 },
  errorText: { color: "#b00020", marginTop: 6 },
});
