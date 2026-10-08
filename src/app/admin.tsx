import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AdminMoney } from "../components/AdminMoney";
import {
  adminAction,
  AdminApiError,
  type AdminAction,
  type AdminApplication,
  type AdminState,
  type AdminTrip,
} from "../lib/adminApi";

const NAIRA = "₦";
const REFRESH_EVERY_MS = 20000;

type Tab = "today" | "applications" | "live" | "money";

function money(n: number) {
  return `${NAIRA}${Math.round(n).toLocaleString()}`;
}

function short(id: string) {
  return `#${id.replace(/^T_/, "").slice(0, 8).toUpperCase()}`;
}

function ago(msValue: number | null) {
  if (!msValue) return "";
  const minutes = Math.max(0, Math.round((Date.now() - msValue) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

const TRIP_STATUS: Record<string, string> = {
  assigned: "Going to sellers",
  collecting: "Collecting",
  en_route: "Delivering",
};

// ---------- small pieces ----------

function Stat({ value, label, tint }: { value: string; label: string; tint?: string }) {
  return (
    <View style={[styles.stat, tint ? { backgroundColor: tint } : null]}>
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// A button that needs a second tap, for actions that change real orders.
function ConfirmButton({
  label,
  confirmKey,
  armed,
  busy,
  danger,
  onArm,
  onConfirm,
}: {
  label: string;
  confirmKey: string;
  armed: string | null;
  busy: boolean;
  danger?: boolean;
  onArm: (key: string) => void;
  onConfirm: () => void;
}) {
  const isArmed = armed === confirmKey;
  return (
    <Pressable
      style={[
        styles.smallButton,
        danger && styles.dangerOutline,
        isArmed && (danger ? styles.dangerFilled : styles.darkFilled),
        busy && { opacity: 0.5 },
      ]}
      disabled={busy}
      onPress={() => (isArmed ? onConfirm() : onArm(confirmKey))}
    >
      <Text style={[styles.smallButtonText, danger && { color: "#b00020" }, isArmed && { color: "#fff" }]}>
        {busy ? "Working..." : isArmed ? "Tap again to confirm" : label}
      </Text>
    </Pressable>
  );
}

function ApplicationCard({
  app,
  freeRiderProfiles,
  busy,
  onApprove,
  onReject,
}: {
  app: AdminApplication;
  freeRiderProfiles: AdminState["freeRiderProfiles"];
  busy: boolean;
  onApprove: (profileId: string) => void;
  onReject: (reason: string) => void;
}) {
  const [linkTo, setLinkTo] = useState("NEW");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const isRider = app.requestedRole === "rider";

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.cardTitle}>{app.name || app.email}</Text>
          <Text style={styles.muted}>{app.email}</Text>
          {app.phone ? <Text style={styles.muted}>{app.phone}</Text> : null}
        </View>
        <View style={[styles.badge, { backgroundColor: isRider ? "#1565c0" : "#6a1b9a" }]}>
          <Text style={styles.badgeText}>{isRider ? "RIDER" : "SELLER"}</Text>
        </View>
      </View>

      <View style={styles.divider} />
      {isRider ? (
        <Text style={styles.item}>Vehicle: {app.vehicle === "keke" ? "Keke" : "Bike"}</Text>
      ) : (
        <>
          <Text style={styles.item}>Shop: {app.businessName || "-"}</Text>
          <Text style={styles.item}>Address: {app.businessAddress || "-"}</Text>
        </>
      )}
      {app.note ? <Text style={styles.item}>Note: {app.note}</Text> : null}
      <Text style={styles.hint}>Applied {ago(app.createdAtMs)}</Text>

      {isRider && freeRiderProfiles.length > 0 ? (
        <>
          <Text style={styles.label}>Rider profile</Text>
          <View style={styles.chips}>
            {[{ id: "NEW", name: "New profile", vehicle: app.vehicle || "bike" }, ...freeRiderProfiles].map((p) => (
              <Pressable
                key={p.id}
                style={[styles.chip, linkTo === p.id && styles.chipActive]}
                onPress={() => setLinkTo(p.id)}
              >
                <Text style={[styles.chipText, linkTo === p.id && styles.chipTextActive]}>
                  {p.id === "NEW" ? "New profile" : `${p.id} · ${p.name} (${p.vehicle})`}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {rejecting ? (
        <>
          <Text style={styles.label}>Reason (the applicant can see this)</Text>
          <TextInput
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Please add your shop address"
            maxLength={300}
          />
          <View style={styles.twoCol}>
            <Pressable style={[styles.secondaryButton, { flex: 1 }]} onPress={() => setRejecting(false)}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </Pressable>
            <Pressable
              style={[styles.dangerButton, { flex: 1 }, busy && { opacity: 0.5 }]}
              disabled={busy}
              onPress={() => onReject(reason)}
            >
              <Text style={styles.primaryButtonText}>{busy ? "Working..." : "Reject"}</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.twoCol}>
          <Pressable style={[styles.secondaryButton, { flex: 1 }]} disabled={busy} onPress={() => setRejecting(true)}>
            <Text style={[styles.secondaryButtonText, { color: "#b00020" }]}>Reject</Text>
          </Pressable>
          <Pressable
            style={[styles.approveButton, { flex: 1 }, busy && { opacity: 0.5 }]}
            disabled={busy}
            onPress={() => onApprove(linkTo)}
          >
            <Text style={styles.primaryButtonText}>{busy ? "Working..." : "Approve"}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function TripCard({
  trip,
  armed,
  working,
  onArm,
  run,
}: {
  trip: AdminTrip;
  armed: string | null;
  working: string | null;
  onArm: (key: string) => void;
  run: (label: string, action: AdminAction, extra: Record<string, unknown>) => void;
}) {
  const busy = working === `trip-${trip.id}`;
  return (
    <View style={[styles.card, trip.stuck && styles.warnCard]}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.cardTitle}>
            {trip.riderName} <Text style={styles.muted}>({trip.riderId})</Text>
          </Text>
          <Text style={styles.muted}>
            {TRIP_STATUS[trip.status] || trip.status} · started {ago(trip.createdAtMs)}
          </Text>
        </View>
        {trip.stuck ? (
          <View style={[styles.badge, { backgroundColor: "#b26a00" }]}>
            <Text style={styles.badgeText}>STUCK?</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.item}>
        Orders: {trip.orderIds.map(short).join(", ")}
        {trip.orderIds.length > 1 ? "  (batched)" : ""}
      </Text>
      <Text style={styles.item}>
        Collected {trip.pickupsDone}/{trip.pickups} shops · Delivered {trip.delivered}/{trip.dropoffs}
      </Text>
      <Text style={styles.item}>
        Fees {money(trip.deliveryFeesTotal)} · Rider pay {money(trip.riderPay)} · Profit{" "}
        {money(trip.deliveryFeesTotal - trip.riderPay)}
      </Text>
      <View style={styles.actionsRow}>
        {trip.canRelease ? (
          <ConfirmButton
            label="Release (give to another rider)"
            confirmKey={`release-${trip.id}`}
            armed={armed}
            busy={busy}
            danger
            onArm={onArm}
            onConfirm={() => run(`trip-${trip.id}`, "releaseTrip", { tripId: trip.id })}
          />
        ) : null}
        <ConfirmButton
          label="Mark trip delivered"
          confirmKey={`complete-${trip.id}`}
          armed={armed}
          busy={busy}
          onArm={onArm}
          onConfirm={() => run(`trip-${trip.id}`, "completeTrip", { tripId: trip.id })}
        />
      </View>
      <Text style={styles.hint}>
        Use "Mark trip delivered" only when you know the customers got their goods.
      </Text>
    </View>
  );
}

// ---------- screen ----------

export default function AdminScreen() {
  const [state, setState] = useState<AdminState | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<Tab>("today");
  const [working, setWorking] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const mounted = useRef(true);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(
    async (label: string | null, action: AdminAction, extra: Record<string, unknown> = {}) => {
      if (label) setWorking(label);
      if (action !== "overview") {
        setArmed(null);
        setNotice("");
      }
      setErrorMessage("");
      try {
        const next = await adminAction(action, extra);
        if (!mounted.current) return;
        setState(next);
        if (next.message) setNotice(next.message);
      } catch (e: any) {
        if (!mounted.current) return;
        if (e instanceof AdminApiError && e.forbidden) setForbidden(true);
        else setErrorMessage(e?.message || "Something went wrong.");
      } finally {
        if (mounted.current) {
          setWorking(null);
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    mounted.current = true;
    void run(null, "overview");
    const timer = setInterval(() => void run(null, "overview"), REFRESH_EVERY_MS);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      if (armTimer.current) clearTimeout(armTimer.current);
    };
  }, [run]);

  function arm(key: string) {
    setArmed(key);
    if (armTimer.current) clearTimeout(armTimer.current);
    armTimer.current = setTimeout(() => setArmed(null), 5000);
  }

  const header = (
    <>
      <Pressable onPress={() => router.replace("/")}>
        <Text style={styles.backText}>{"←"} Home</Text>
      </Pressable>
      <Text style={styles.title}>Admin</Text>
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {header}
          <ActivityIndicator size="large" style={{ marginTop: 40 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (forbidden || !state) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {header}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{forbidden ? "Admins only" : "Could not load the dashboard"}</Text>
            <Text style={styles.muted}>
              {forbidden ? "This account does not have the admin role." : errorMessage}
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => void run("load", "overview")}>
              <Text style={styles.primaryButtonText}>Try again</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const { today, applications, trips, waitingOrders, riders, flaggedPayments, counts } = state;
  const stuckTrips = trips.filter((t) => t.stuck);
  const lateOrders = waitingOrders.filter((o) => o.late);
  const orphanRiders = riders.filter((r) => r.tripMissing);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void run(null, "overview")} />}
      >
        {header}

        {notice ? (
          <Pressable style={styles.noticeBox} onPress={() => setNotice("")}>
            <Text style={styles.noticeText}>{notice}</Text>
          </Pressable>
        ) : null}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.tabs}>
          {(
            [
              ["today", "Today"],
              ["applications", `Apps${applications.length ? ` (${applications.length})` : ""}`],
              ["live", `Live${counts.needsAttention - applications.length - (state.wallets ? state.wallets.requests.length : 0) > 0 ? " ⚠" : ""}`],
              ["money", `Money${state.wallets && state.wallets.requests.length > 0 ? ` (${state.wallets.requests.length})` : ""}`],
            ] as [Tab, string][]
          ).map(([t, text]) => (
            <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{text}</Text>
            </Pressable>
          ))}
        </View>

        {/* ---------- TODAY ---------- */}
        {tab === "today" && (
          <>
            <View style={styles.statsRow}>
              <Stat value={String(today.orders)} label="Paid orders" />
              <Stat value={String(today.delivered)} label="Delivered" />
              <Stat value={String(today.cancelled)} label="Cancelled" />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Money today</Text>
              <View style={styles.divider} />
              <View style={styles.rowBetween}>
                <Text style={styles.item}>Goods sold (sellers' money)</Text>
                <Text style={styles.value}>{money(today.goodsSales)}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.item}>Delivery fees paid by customers</Text>
                <Text style={styles.value}>{money(today.deliveryFees)}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.item}>Rider pay</Text>
                <Text style={styles.value}>− {money(today.riderPay)}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.item}>= Delivery profit</Text>
                <Text style={styles.value}>{money(today.deliveryProfit)}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.item}>+ Commission on goods</Text>
                <Text style={styles.value}>{money(today.commission ?? 0)}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.item}>+ Withdrawal fees</Text>
                <Text style={styles.value}>{money(today.withdrawalFees ?? 0)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>Your profit today</Text>
                <Text
                  style={[
                    styles.cardTitle,
                    { color: (today.totalProfit ?? today.deliveryProfit) >= 0 ? "#1e7d32" : "#b00020" },
                  ]}
                >
                  {money(today.totalProfit ?? today.deliveryProfit)}
                </Text>
              </View>
              <Text style={styles.hint}>
                {today.trips} trip(s) · {today.batchedOrders} order(s) rode along on a shared trip. Rider pay
                includes trips still in progress.
              </Text>
            </View>

            <View style={styles.statsRow}>
              <Stat value={String(counts.ridersOnline)} label="Riders free" />
              <Stat value={String(counts.ridersBusy)} label="On a trip" />
              <Stat
                value={String(waitingOrders.length)}
                label="Need a rider"
                tint={waitingOrders.length ? "#fff4e5" : undefined}
              />
            </View>

            {counts.needsAttention > 0 ? (
              <View style={[styles.card, styles.warnCard]}>
                <Text style={styles.cardTitle}>Needs your attention</Text>
                {applications.length ? (
                  <Text style={styles.item}>• {applications.length} application(s) to review</Text>
                ) : null}
                {lateOrders.length ? (
                  <Text style={styles.item}>• {lateOrders.length} paid order(s) waiting over 20 min for a rider</Text>
                ) : null}
                {stuckTrips.length ? (
                  <Text style={styles.item}>• {stuckTrips.length} trip(s) running over 2 hours</Text>
                ) : null}
                {orphanRiders.length ? (
                  <Text style={styles.item}>• {orphanRiders.length} rider(s) stuck on a finished trip</Text>
                ) : null}
                {state.wallets && state.wallets.requests.length ? (
                  <Text style={styles.item}>
                    • {state.wallets.requests.length} withdrawal request(s) to pay (Money tab)
                  </Text>
                ) : null}
                {flaggedPayments.length ? (
                  <Text style={styles.item}>• {flaggedPayments.length} flagged payment(s) to check in Paystack</Text>
                ) : null}
                <Pressable
                  style={styles.primaryButton}
                  onPress={() =>
                    setTab(
                      applications.length
                        ? "applications"
                        : state.wallets && state.wallets.requests.length
                          ? "money"
                          : "live",
                    )
                  }
                >
                  <Text style={styles.primaryButtonText}>Review</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.okText}>{"✓"} Nothing needs your attention.</Text>
              </View>
            )}
          </>
        )}

        {/* ---------- APPLICATIONS ---------- */}
        {tab === "applications" &&
          (applications.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No applications waiting</Text>
              <Text style={styles.muted}>New rider and seller applications appear here.</Text>
            </View>
          ) : (
            applications.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                freeRiderProfiles={state.freeRiderProfiles}
                busy={working === `app-${app.id}`}
                onApprove={(profileId) =>
                  void run(`app-${app.id}`, "approve", { applicationId: app.id, profileId })
                }
                onReject={(reason) => void run(`app-${app.id}`, "reject", { applicationId: app.id, reason })}
              />
            ))
          ))}

        {/* ---------- LIVE ---------- */}
        {tab === "live" && (
          <>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Waiting for a rider ({waitingOrders.length})</Text>
              {waitingOrders.length ? (
                <Pressable
                  style={[styles.smallButton, working === "retry" && { opacity: 0.5 }]}
                  disabled={working !== null}
                  onPress={() => void run("retry", "retryDispatch")}
                >
                  <Text style={styles.smallButtonText}>{working === "retry" ? "Trying..." : "Find riders now"}</Text>
                </Pressable>
              ) : null}
            </View>
            {waitingOrders.length === 0 ? (
              <Text style={[styles.muted, { marginBottom: 12 }]}>None. Every paid order has a rider.</Text>
            ) : (
              waitingOrders.map((o) => (
                <View key={o.id} style={[styles.card, o.late && styles.warnCard]}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle}>{short(o.id)}</Text>
                    <Text style={styles.value}>{money(o.total)}</Text>
                  </View>
                  <Text style={styles.muted}>
                    {o.customerName} · {o.vehicle} · paid {ago(o.paidAtMs)}
                  </Text>
                  {o.address ? <Text style={styles.muted}>{o.address}</Text> : null}
                  <View style={styles.actionsRow}>
                    <ConfirmButton
                      label="Cancel order"
                      confirmKey={`cancel-${o.id}`}
                      armed={armed}
                      busy={working === `order-${o.id}`}
                      danger
                      onArm={arm}
                      onConfirm={() => void run(`order-${o.id}`, "cancelOrder", { orderId: o.id })}
                    />
                  </View>
                  <Text style={styles.hint}>Cancelling returns the stock. Refund real payments in Paystack.</Text>
                </View>
              ))
            )}

            <Text style={styles.sectionTitle}>Trips in progress ({trips.length})</Text>
            {trips.length === 0 ? (
              <Text style={[styles.muted, { marginBottom: 12 }]}>No riders on the road.</Text>
            ) : (
              trips.map((t) => (
                <TripCard
                  key={t.id}
                  trip={t}
                  armed={armed}
                  working={working}
                  onArm={arm}
                  run={(label, action, extra) => void run(label, action, extra)}
                />
              ))
            )}

            <Text style={styles.sectionTitle}>Riders ({riders.length})</Text>
            {riders.map((r) => (
              <View key={r.id} style={[styles.card, r.tripMissing && styles.warnCard]}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.cardTitle}>
                      {r.name} <Text style={styles.muted}>({r.id})</Text>
                    </Text>
                    <Text style={styles.muted}>
                      {r.vehicle} · {r.linked ? r.email || "linked" : "no login linked"}
                    </Text>
                    <Text style={styles.muted}>
                      {r.completedTrips} trip(s) · earned {money(r.earningsTotal)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          r.availability === "available" ? "#1e7d32" : r.availability === "busy" ? "#1565c0" : "#888",
                      },
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {r.availability === "available" ? "FREE" : r.availability === "busy" ? "ON TRIP" : "OFFLINE"}
                    </Text>
                  </View>
                </View>
                {r.tripMissing ? (
                  <>
                    <Text style={styles.warnText}>Stuck on a trip that is already finished.</Text>
                    <View style={styles.actionsRow}>
                      <ConfirmButton
                        label="Free this rider"
                        confirmKey={`free-${r.id}`}
                        armed={armed}
                        busy={working === `rider-${r.id}`}
                        onArm={arm}
                        onConfirm={() => void run(`rider-${r.id}`, "freeRider", { riderId: r.id })}
                      />
                    </View>
                  </>
                ) : null}
              </View>
            ))}

            {flaggedPayments.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Flagged payments ({flaggedPayments.length})</Text>
                {flaggedPayments.map((p) => (
                  <View key={p.id} style={[styles.card, styles.warnCard]}>
                    <Text style={styles.cardTitle}>Ref {p.reference || p.id}</Text>
                    <Text style={styles.muted}>
                      Order {p.orderId ? short(p.orderId) : "-"} · paid{" "}
                      {p.paidNaira !== null ? money(p.paidNaira) : "-"} · {ago(p.flaggedAtMs)}
                    </Text>
                    <Text style={styles.warnText}>{p.reasons.join(", ").replace(/-/g, " ")}</Text>
                    <Text style={styles.hint}>
                      Money arrived but the order was not marked paid. Check it in the Paystack dashboard and refund
                      if needed.
                    </Text>
                  </View>
                ))}
              </>
            ) : null}
          </>
        )}

        {/* ---------- MONEY ---------- */}
        {tab === "money" && state.wallets && state.commission ? (
          <AdminMoney
            state={state}
            working={working}
            onPay={(req, method, reference) =>
              void run(`wd-${req.id}`, "payWithdrawal", { withdrawalId: req.id, method, reference })
            }
            onReject={(req, reason) => void run(`wd-${req.id}`, "rejectWithdrawal", { withdrawalId: req.id, reason })}
            onSaveRates={(rates) => void run("rates", "setCommissionRates", { rates })}
            onSaveSettings={(settings) => void run("payoutSettings", "setPayoutSettings", { settings })}
          />
        ) : null}

        <Text style={[styles.hint, { textAlign: "center", marginTop: 10 }]}>
          Updated {new Date(state.generatedAtMs).toLocaleTimeString()} · pull down to refresh
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f6f8" },
  container: { padding: 20, paddingBottom: 60 },
  backText: { fontWeight: "700", marginBottom: 14 },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 14 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12 },
  warnCard: { borderWidth: 1, borderColor: "#f0b35b", backgroundColor: "#fffaf2" },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#555", marginTop: 8, marginBottom: 8 },
  muted: { color: "#666", marginTop: 3, fontWeight: "400", fontSize: 13 },
  hint: { color: "#888", fontSize: 12, marginTop: 8 },
  value: { fontWeight: "700" },
  item: { marginTop: 5, color: "#333" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  twoCol: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  badge: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  okText: { color: "#1e7d32", fontWeight: "800" },
  warnText: { color: "#b26a00", fontWeight: "700", marginTop: 8 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12, alignItems: "center" },
  statNumber: { fontSize: 18, fontWeight: "900" },
  statLabel: { color: "#666", fontSize: 12, marginTop: 2, textAlign: "center" },
  tabs: { flexDirection: "row", backgroundColor: "#e7e9ee", borderRadius: 12, padding: 4, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center" },
  tabActive: { backgroundColor: "#fff" },
  tabText: { fontWeight: "700", color: "#666", fontSize: 13 },
  tabTextActive: { color: "#111" },
  label: { fontSize: 13, fontWeight: "700", color: "#444", marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#d0d4db", borderRadius: 10, padding: 12, backgroundColor: "#fff" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderColor: "#ccc", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: "#222", borderColor: "#222" },
  chipText: { fontSize: 12, color: "#444", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  smallButton: {
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  smallButtonText: { fontWeight: "700", fontSize: 13 },
  dangerOutline: { borderColor: "#b00020" },
  dangerFilled: { backgroundColor: "#b00020", borderColor: "#b00020" },
  darkFilled: { backgroundColor: "#222", borderColor: "#222" },
  primaryButton: {
    marginTop: 14,
    backgroundColor: "#222",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  approveButton: {
    marginTop: 12,
    backgroundColor: "#1e7d32",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  dangerButton: {
    marginTop: 12,
    backgroundColor: "#b00020",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "800" },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryButtonText: { fontWeight: "700" },
  noticeBox: { backgroundColor: "#e8f5e9", borderRadius: 12, padding: 12, marginBottom: 12 },
  noticeText: { color: "#1e7d32", fontWeight: "700" },
  errorBox: { backgroundColor: "#fdecea", borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { color: "#b00020" },
});
