import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { BrandLoader } from "../components/Brand";
import { AdminDownloads, DownloadButton } from "../components/AdminDownloads";
import { AdminMarketerPay, MarketerPaySettingsCard } from "../components/AdminMarketerPay";
import { Icon, type IconName } from "../components/Icon";
import { ScreenHeader } from "../components/ui";
import { colors, fonts, radius, shadow, text, ui } from "../theme";

import { Image } from "expo-image";

import { AdminLogs } from "../components/AdminLogs";
import { AdminMoney } from "../components/AdminMoney";
import { AdminPricing } from "../components/AdminPricing";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import {
  adminAction,
  AdminApiError,
  type AdminAction,
  type AdminAi,
  type AdminAiSettings,
  type AdminReport,
  type AdminApplication,
  type AdminState,
  type AdminTrip,
} from "../lib/adminApi";

const NAIRA = "₦";
// Refresh only while the admin screen is open in front of you (see useLiveRefresh).
const REFRESH_EVERY_MS = 60000;

type Tab = "today" | "applications" | "orders" | "money" | "people" | "settings" | "records";

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
      <Text style={[styles.smallButtonText, danger && { color: colors.danger }, isArmed && { color: "#ffffff" }]}>
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
        <View style={[styles.badge, { backgroundColor: isRider ? "#1f4f8a" : "#6a1b9a" }]}>
          <Text style={styles.badgeText}>{isRider ? "RIDER" : "SELLER"}</Text>
        </View>
      </View>

      <View style={styles.divider} />
      {isRider ? (
        <Text style={styles.item}>Vehicle: {app.vehicle === "keke" ? "Keke" : "Bike"}</Text>
      ) : (
        <>
          <Text style={styles.item}>
            {app.businessType === "restaurant" ? "Restaurant" : "Shop"}: {app.businessName || "-"}
          </Text>
          <Text style={styles.item}>Address: {app.businessAddress || "-"}</Text>
        </>
      )}
      {app.note ? <Text style={styles.item}>Note: {app.note}</Text> : null}
      {app.marketerCode ? <Text style={styles.item}>Marketer code: {app.marketerCode}</Text> : null}
      {(app.marketingNotes || []).map((n, i) => (
        <Text key={i} style={[styles.item, { fontStyle: "italic" }]}>
          Marketing: {"\u201C"}
          {n.text}
          {"\u201D"} {"\u2014"} {n.by || "Marketing"}, {ago(n.atMs)}
        </Text>
      ))}
      <Text style={styles.hint}>Applied {ago(app.createdAtMs)}</Text>
      <Text style={styles.hint}>
        {app.termsAcceptedAtMs
          ? `Agreed to Terms: ${new Date(app.termsAcceptedAtMs).toLocaleString()}`
          : "Agreed to Terms: not recorded (applied before agreements were saved)"}
      </Text>

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
            <Text style={[styles.secondaryButtonText, { color: colors.danger }]}>Reject</Text>
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
          <View style={[styles.badge, { backgroundColor: colors.goldDeep }]}>
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
      {trip.lockedOrderIds && trip.lockedOrderIds.length ? (
        <Text style={styles.warnText}>
          Locked by wrong codes: {trip.lockedOrderIds.map(short).join(", ")} (see Orders & Delivery)
        </Text>
      ) : null}
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

// A customer's problem report: evidence on top, decision below.
function ReportCard({
  report,
  armed,
  working,
  onArm,
  onResolve,
}: {
  report: AdminReport;
  armed: string | null;
  working: string | null;
  onArm: (key: string) => void;
  onResolve: (body: Record<string, unknown>) => void;
}) {
  const notReceived = report.reasonCode === "not_received";
  const [withDelivery, setWithDelivery] = useState(notReceived);
  const base = notReceived ? report.orderTotal - report.deliveryFee : report.itemsValue;
  const [amountText, setAmountText] = useState(String(notReceived ? report.orderTotal : report.itemsValue));
  const [payer, setPayer] = useState<"seller" | "rider" | "platform">(
    notReceived ? (report.hasRider ? "rider" : "platform") : "seller",
  );
  const [note, setNote] = useState("");
  const amount = parseInt(amountText, 10);
  const busy = working === `report-${report.orderId}`;
  const h = report.customerHistory;
  return (
    <View style={[styles.card, styles.warnCard]}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>
          {short(report.orderId)} · {report.reason}
        </Text>
        <Text style={styles.muted}>{ago(report.createdAtMs)}</Text>
      </View>
      <Text style={styles.muted}>
        {report.customerName}
        {report.customerPhone ? ` · ${report.customerPhone}` : ""}
        {h && h.total > 1 ? ` · ${h.total} reports so far (${h.refunded} refunded)` : " · first report"}
      </Text>
      <Text style={styles.item}>
        Delivered {ago(report.deliveredAtMs)}
        {report.riderName ? ` by ${report.riderName}` : ""} ·{" "}
        {report.deliveredBy === "rider-code"
          ? "customer gave the delivery code"
          : report.deliveredBy === "admin"
            ? "marked delivered by admin"
            : "no delivery code used"}
      </Text>
      <View style={styles.divider} />
      {report.items.map((i, k) => (
        <Text key={k} style={styles.item}>
          {"•"} {i.quantity} × {i.name} ({money(i.unitPrice * i.quantity)}) · {i.sellerName}
        </Text>
      ))}
      {report.note ? <Text style={[styles.item, { fontStyle: "italic" }]}>Customer: “{report.note}”</Text> : null}
      {report.photos.length ? (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          {report.photos.map((p) => (
            <Pressable key={p.url} onPress={() => void Linking.openURL(p.url)}>
              <Image source={{ uri: p.thumbUrl }} style={{ width: 90, height: 90, borderRadius: 8 }} contentFit="cover" />
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.hint}>No photos sent.</Text>
      )}
      {report.sellerReplies.map((r, k) => (
        <Text key={k} style={[styles.item, { marginTop: 6 }]}>
          <Text style={{ fontFamily: fonts.bold }}>{r.name}: </Text>“{r.text}”
        </Text>
      ))}
      {!report.sellerReplies.length ? <Text style={styles.hint}>The shop has not replied yet.</Text> : null}

      <View style={styles.divider} />
      <Text style={styles.cardTitle}>Decision</Text>
      <View style={[styles.rowBetween, { marginTop: 8 }]}>
        <Text style={styles.item}>Refund to customer's wallet (₦)</Text>
        <TextInput
          style={[styles.input, { width: 110, textAlign: "right", paddingVertical: 6 }]}
          value={amountText}
          onChangeText={(t) => setAmountText(t.replace(/[^0-9]/g, "").slice(0, 8))}
          keyboardType="number-pad"
        />
      </View>
      {report.deliveryFee > 0 ? (
        <View style={styles.rowBetween}>
          <Text style={styles.item}>Include delivery fee ({money(report.deliveryFee)})</Text>
          <Switch
            value={withDelivery}
            onValueChange={(v) => {
              setWithDelivery(v);
              setAmountText(String(base + (v ? report.deliveryFee : 0)));
            }}
          />
        </View>
      ) : null}
      <Text style={[styles.item, { marginTop: 8 }]}>Who pays?</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
        {(
          [
            ["seller", "Seller"],
            ...(report.hasRider ? [["rider", "Rider"]] : []),
            ["platform", "CommunityMarket"],
          ] as [typeof payer, string][]
        ).map(([key, label]) => (
          <Pressable
            key={key}
            style={[styles.smallButton, payer === key && { backgroundColor: colors.green }]}
            onPress={() => setPayer(key)}
          >
            <Text style={[styles.smallButtonText, payer === key && { color: "#ffffff" }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>
        {payer === "seller"
          ? "Seller pays the item value minus our commission (we give our commission back). Any delivery fee part is paid by CommunityMarket."
          : payer === "rider"
            ? "The whole refund is taken from the rider's earnings."
            : "CommunityMarket pays the whole refund (goodwill). It shows in today's profit."}{" "}
        Balances can go below zero and are paid back from future earnings.
      </Text>
      <TextInput
        style={[styles.input, { marginTop: 8 }]}
        value={note}
        onChangeText={(t) => setNote(t.slice(0, 300))}
        placeholder="Note (the customer sees it if you reject)"
      />
      <View style={styles.actionsRow}>
        <ConfirmButton
          label={Number.isInteger(amount) && amount > 0 ? `Refund ${money(amount)}` : "Refund"}
          confirmKey={`refund-${report.orderId}`}
          armed={armed}
          busy={busy}
          onArm={onArm}
          onConfirm={() =>
            onResolve({ orderId: report.orderId, outcome: "refund", amount, payer, note: note.trim() })
          }
        />
        <ConfirmButton
          label="Reject"
          confirmKey={`rejectrep-${report.orderId}`}
          armed={armed}
          busy={busy}
          danger
          onArm={onArm}
          onConfirm={() => onResolve({ orderId: report.orderId, outcome: "reject", note: note.trim() })}
        />
      </View>
    </View>
  );
}

// AI listing assistant: on/off, photo check, daily limit per shop, usage.
function AiCard({
  ai,
  busy,
  onSave,
}: {
  ai: AdminAi;
  busy: boolean;
  onSave: (settings: AdminAiSettings) => void;
}) {
  const [limit, setLimit] = useState(String(ai.settings.dailyLimitPerSeller));
  const save = (patch: Partial<AdminAiSettings>) => {
    const n = parseInt(limit, 10);
    onSave({ ...ai.settings, dailyLimitPerSeller: Number.isInteger(n) ? n : ai.settings.dailyLimitPerSeller, ...patch });
  };
  const m = ai.thisMonth;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>AI listing assistant</Text>
      <Text style={styles.muted}>
        {ai.configured
          ? `Using ${ai.provider === "anthropic" ? "Claude" : "DeepSeek"} (${ai.model})`
          : "No AI key in Vercel yet. Add DEEPSEEK_API_KEY to the server settings."}
      </Text>
      <View style={[styles.rowBetween, { marginTop: 10 }]}>
        <Text style={styles.item}>Sellers can use "Fill details with AI"</Text>
        <Switch value={ai.settings.enabled} disabled={busy} onValueChange={(v) => save({ enabled: v })} />
      </View>
      <View style={styles.rowBetween}>
        <Text style={styles.item}>Check every new photo</Text>
        <Switch value={ai.settings.checkPhotos} disabled={busy} onValueChange={(v) => save({ checkPhotos: v })} />
      </View>
      <View style={[styles.rowBetween, { marginTop: 6 }]}>
        <Text style={styles.item}>AI uses per shop per day</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TextInput
            style={[styles.input, { width: 70, textAlign: "center", paddingVertical: 6 }]}
            value={limit}
            onChangeText={(t) => setLimit(t.replace(/[^0-9]/g, "").slice(0, 3))}
            keyboardType="number-pad"
          />
          <Pressable style={styles.smallButton} disabled={busy} onPress={() => save({})}>
            <Text style={styles.smallButtonText}>{busy ? "..." : "Save"}</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.hint}>
        This month: {m.suggestCalls} listing fill(s) · {m.photoCheckCalls} photo check(s) ·{" "}
        {(m.inputTokens + m.outputTokens).toLocaleString()} tokens. Check your balance on the AI provider's website.
      </Text>
    </View>
  );
}

// ---------- screen ----------

// Admin -> People: who has marketing access, give or remove it by email.
function TeamCard({
  staff,
  working,
  armed,
  arm,
  onGive,
  onRemove,
}: {
  staff: { uid: string; email: string | null; name: string | null }[];
  working: string | null;
  armed: string | null;
  arm: (key: string) => void;
  onGive: (email: string) => void;
  onRemove: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const clean = email.trim().toLowerCase();
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Team: marketing access</Text>
      <Text style={styles.hint}>
        Marketing sees applications, shops, riders and marketer codes. Never money, bank details, settings or the log.
      </Text>
      {staff.length === 0 ? <Text style={styles.item}>No one has marketing access.</Text> : null}
      {staff.map((p) => {
        const key = `team-remove-${p.email}`;
        return (
          <View key={p.uid} style={{ marginTop: 10 }}>
            <Text style={styles.item}>
              {p.name || "-"} · {p.email}
            </Text>
            <Pressable
              style={[styles.smallButton, { alignSelf: "flex-start", marginTop: 6 }]}
              disabled={working === key || !p.email}
              onPress={() => {
                if (armed !== key) return arm(key);
                if (p.email) onRemove(p.email);
              }}
            >
              <Text style={styles.smallButtonText}>
                {working === key ? "..." : armed === key ? "Tap again to remove" : "Remove access"}
              </Text>
            </Pressable>
          </View>
        );
      })}
      <Text style={[styles.hint, { marginTop: 12 }]}>
        Give access: they first create a normal account in the app with this email.
      </Text>
      <TextInput
        style={[styles.input, { marginTop: 8 }]}
        placeholder="their@email.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Pressable
        style={[styles.smallButton, { alignSelf: "flex-start", marginTop: 8 }, (!clean.includes("@") || working === "team-give") && { opacity: 0.5 }]}
        disabled={!clean.includes("@") || working === "team-give"}
        onPress={() => {
          if (armed !== "team-give") return arm("team-give");
          onGive(clean);
          setEmail("");
        }}
      >
        <Text style={styles.smallButtonText}>
          {working === "team-give" ? "..." : armed === "team-give" ? `Tap again: give ${clean} marketing access` : "Give marketing access"}
        </Text>
      </Pressable>
      <Pressable style={{ marginTop: 12 }} onPress={() => router.push("/marketing" as any)}>
        <Text style={[styles.item, { fontWeight: "800" }]}>Open the Marketing dashboard {"\u203A"}</Text>
      </Pressable>
    </View>
  );
}

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
    return () => {
      mounted.current = false;
      if (armTimer.current) clearTimeout(armTimer.current);
    };
  }, [run]);
  useLiveRefresh(() => void run(null, "overview"), REFRESH_EVERY_MS);

  function arm(key: string) {
    setArmed(key);
    if (armTimer.current) clearTimeout(armTimer.current);
    armTimer.current = setTimeout(() => setArmed(null), 5000);
  }

  if (loading) {
    return (
      <View style={ui.screen}>
        <ScreenHeader title="Admin" onBack={() => router.replace("/")} />
        <BrandLoader style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (forbidden || !state) {
    return (
      <View style={ui.screen}>
        <ScreenHeader title="Admin" onBack={() => router.replace("/")} />
        <View style={styles.container}>
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
      </View>
    );
  }

  const { today, applications, trips, waitingOrders, riders, flaggedPayments, counts } = state;
  const stuckTrips = trips.filter((t) => t.stuck);
  const lateOrders = waitingOrders.filter((o) => o.late);
  const orphanRiders = riders.filter((r) => r.tripMissing);
  const lockedDeliveries = state.delivery ? state.delivery.locked : [];
  const openReports = state.reports ? state.reports.open : [];
  const recentReports = state.reports ? state.reports.recent : [];
  // Money tab: withdrawals to send + bank accounts to check.
  const moneyCount =
    (state.wallets ? state.wallets.requests.length : 0) + (state.bankChecks ? state.bankChecks.review.length : 0);
  const ordersCount = lateOrders.length + stuckTrips.length + lockedDeliveries.length + openReports.length + flaggedPayments.length;
  const peopleCount = orphanRiders.length + (state.deletions ? state.deletions.length : 0);
  const backupBad = state.backup ? !state.backup.configured || !state.backup.lastOk : false;

  // Each "needs attention" line opens the tab where it is fixed.
  const attention: { text: string; tab: Tab; icon: IconName }[] = [
    applications.length ? { text: `${applications.length} application(s) to review`, tab: "applications", icon: "users" } : null,
    lateOrders.length ? { text: `${lateOrders.length} paid order(s) waiting over 20 min for a rider`, tab: "orders", icon: "clock" } : null,
    stuckTrips.length ? { text: `${stuckTrips.length} trip(s) running over 2 hours`, tab: "orders", icon: "bike" } : null,
    lockedDeliveries.length ? { text: `${lockedDeliveries.length} delivery(ies) locked by wrong codes`, tab: "orders", icon: "lock" } : null,
    openReports.length ? { text: `${openReports.length} customer problem(s) to settle`, tab: "orders", icon: "alert" } : null,
    flaggedPayments.length ? { text: `${flaggedPayments.length} flagged payment(s) to check in Paystack`, tab: "orders", icon: "card" } : null,
    state.wallets && state.wallets.requests.length
      ? { text: `${state.wallets.requests.length} withdrawal request(s) to pay`, tab: "money", icon: "wallet" }
      : null,
    state.bankChecks && state.bankChecks.review.length
      ? { text: `${state.bankChecks.review.length} bank account(s) to check`, tab: "money", icon: "shield" }
      : null,
    orphanRiders.length ? { text: `${orphanRiders.length} rider(s) stuck on a finished trip`, tab: "people", icon: "bike" } : null,
    backupBad ? { text: "Daily backup needs a look", tab: "settings", icon: "settings" } : null,
  ].filter(Boolean) as { text: string; tab: Tab; icon: IconName }[];

  const TABS: [Tab, string, number][] = [
    ["today", "Today", 0],
    ["applications", "Applications", applications.length],
    ["orders", "Orders & Delivery", ordersCount],
    ["money", "Money", moneyCount],
    ["people", "People", peopleCount],
    ["settings", "Settings", backupBad ? 1 : 0],
    ["records", "Records", 0],
  ];

  return (
    <View style={ui.screen}>
      <View style={ui.glow} pointerEvents="none" />
      <ScreenHeader
        title="Admin"
        subtitle={`Updated ${new Date(state.generatedAtMs).toLocaleTimeString()}`}
        onBack={() => router.replace("/")}
      />

      <View style={styles.tabsBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabs}
      >
        {TABS.map(([t, label, n]) => {
          const on = tab === t;
          return (
            <Pressable
              key={t}
              style={[styles.tab, on && styles.tabActive]}
              onPress={() => setTab(t)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.tabText, on && styles.tabTextActive]}>{label}</Text>
              {n > 0 ? (
                <View style={[styles.tabCount, on && styles.tabCountOn]}>
                  <Text style={[styles.tabCountText, on && { color: colors.green }]}>{n}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void run(null, "overview")} />}
      >
        {notice ? (
          <Pressable style={styles.noticeBox} onPress={() => setNotice("")}>
            <Icon name="check" size={16} color={colors.green} />
            <Text style={styles.noticeText}>{notice}</Text>
          </Pressable>
        ) : null}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Icon name="alert" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* ---------- 1. TODAY ---------- */}
        {tab === "today" && (
          <>
            <View style={styles.profitCard}>
              <View style={styles.ring} pointerEvents="none" />
              <Text style={styles.profitLabel}>Your profit today</Text>
              <Text style={[styles.profitValue, (today.totalProfit ?? today.deliveryProfit) < 0 && { color: "#ffb4b4" }]}>
                {money(today.totalProfit ?? today.deliveryProfit)}
              </Text>
              <View style={styles.profitStats}>
                <View style={styles.profitStat}>
                  <Text style={styles.profitStatValue}>{today.orders}</Text>
                  <Text style={styles.profitStatLabel}>Paid orders</Text>
                </View>
                <View style={styles.profitStat}>
                  <Text style={styles.profitStatValue}>{today.delivered}</Text>
                  <Text style={styles.profitStatLabel}>Delivered</Text>
                </View>
                <View style={styles.profitStat}>
                  <Text style={styles.profitStatValue}>{today.cancelled}</Text>
                  <Text style={styles.profitStatLabel}>Cancelled</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Money today</Text>
              <View style={styles.divider} />
              <Line label="Goods sold (sellers' money)" value={money(today.goodsSales)} />
              <Line label="Delivery fees paid by customers" value={money(today.deliveryFees)} />
              <Line label="Rider pay" value={`− ${money(today.riderPay)}`} />
              <Line label="= Delivery profit" value={money(today.deliveryProfit)} />
              <Line label="+ Commission on goods" value={money(today.commission ?? 0)} />
              <Line label="+ Withdrawal fees" value={money(today.withdrawalFees ?? 0)} />
              {today.refundCosts ? (
                <Line label="− Refunds paid by CommunityMarket" value={`− ${money(today.refundCosts)}`} />
              ) : null}
              <View style={styles.divider} />
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>Your profit today</Text>
                <Text
                  style={[
                    styles.bigValue,
                    { color: (today.totalProfit ?? today.deliveryProfit) >= 0 ? colors.green : colors.danger },
                  ]}
                >
                  {money(today.totalProfit ?? today.deliveryProfit)}
                </Text>
              </View>
              {today.topups ? (
                <Text style={styles.hint}>
                  Customers added {money(today.topups)} to their wallets today (not income; spent later on orders).
                </Text>
              ) : null}
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
                tint={waitingOrders.length ? colors.goldSoft : undefined}
              />
            </View>

            {attention.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Needs your attention</Text>
                {attention.map((a, i) => (
                  <Pressable
                    key={i}
                    style={({ pressed }) => [styles.attentionRow, pressed && { backgroundColor: colors.chip }]}
                    onPress={() => setTab(a.tab)}
                  >
                    <View style={styles.attentionIcon}>
                      <Icon name={a.icon} size={16} color={colors.goldText} />
                    </View>
                    <Text style={styles.attentionText}>{a.text}</Text>
                    <Icon name="chevron-right" size={18} color={colors.faint} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={[styles.card, styles.okCard]}>
                <Icon name="check" size={18} color={colors.green} />
                <Text style={styles.okText}>Nothing needs your attention.</Text>
              </View>
            )}
          </>
        )}

        {/* ---------- 2. APPLICATIONS ---------- */}
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


        {/* ---------- 3. ORDERS & DELIVERY ---------- */}
        {tab === "orders" && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Orders & delivery</Text>
              <DownloadButton report="orders" label="Orders" />
            </View>
            {openReports.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Customer problems ({openReports.length})</Text>
                {openReports.map((r) => (
                  <ReportCard
                    key={r.orderId}
                    report={r}
                    armed={armed}
                    working={working}
                    onArm={arm}
                    onResolve={(body) => void run(`report-${r.orderId}`, "resolveReport", body)}
                  />
                ))}
              </>
            ) : null}
            {lockedDeliveries.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Locked deliveries ({lockedDeliveries.length})</Text>
                {lockedDeliveries.map((l) => (
                  <View key={l.orderId} style={[styles.card, styles.warnCard]}>
                    <Text style={styles.cardTitle}>
                      {short(l.orderId)} · {l.customerName}
                    </Text>
                    <Text style={styles.muted}>Rider: {l.riderName || "-"}</Text>
                    <Text style={styles.warnText}>
                      The rider entered a wrong code {state.delivery ? state.delivery.maxTries : 5} times.
                    </Text>
                    <Text style={styles.hint}>
                      Call the customer. If they have the goods or the rider is with them, unlock so they can read
                      the code from My Orders. Use "Mark trip delivered" only when you are sure.
                    </Text>
                    <View style={styles.actionsRow}>
                      {l.phone ? (
                        <Pressable style={styles.smallButton} onPress={() => void Linking.openURL(`tel:${l.phone}`)}>
                          <Text style={styles.smallButtonText}>Call customer</Text>
                        </Pressable>
                      ) : null}
                      <ConfirmButton
                        label="Unlock (5 new tries)"
                        confirmKey={`unlock-${l.orderId}`}
                        armed={armed}
                        busy={working === `unlock-${l.orderId}`}
                        onArm={arm}
                        onConfirm={() => void run(`unlock-${l.orderId}`, "resetDeliveryCode", { orderId: l.orderId })}
                      />
                    </View>
                  </View>
                ))}
              </>
            ) : null}
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
            {recentReports.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Settled problems (last 30 days)</Text>
                {recentReports.slice(0, 8).map((r) => (
                  <Text key={r.orderId} style={styles.item}>
                    {short(r.orderId)} · {r.reason} ·{" "}
                    {r.status === "refunded" && r.resolution
                      ? `${money(r.resolution.amount)} refunded${
                          r.resolution.debits.length
                            ? ` (${r.resolution.debits.map((d) => `${d.name} ${money(d.amount)}`).join(", ")})`
                            : ""
                        }${r.resolution.platformCost ? ` · we paid ${money(r.resolution.platformCost)}` : ""}`
                      : "rejected"}
                  </Text>
                ))}
              </View>
            ) : null}
          </>
        )}

        {/* ---------- 4. MONEY ---------- */}
        {tab === "money" && state.wallets && state.commission ? (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Money</Text>
              <DownloadButton report="payouts" label="Payouts" />
            </View>
            <AdminMoney
              section="money"
              state={state}
              working={working}
              onPay={(req, method, reference) =>
                void run(`wd-${req.id}`, "payWithdrawal", { withdrawalId: req.id, method, reference })
              }
              onReject={(req, reason) => void run(`wd-${req.id}`, "rejectWithdrawal", { withdrawalId: req.id, reason })}
              onSaveRates={(rates) => void run("rates", "setCommissionRates", { rates })}
              onSaveSettings={(settings) => void run("payoutSettings", "setPayoutSettings", { settings })}
              onSaveFunding={(settings) => void run("funding", "setFundingSettings", { settings })}
              onSaveRewards={(settings) => void run("rewards", "setRewardsSettings", { settings })}
              onBankAction={(action, partyType, partyId, reason) =>
                void run(`bank-${partyType}-${partyId}`, action, { partyType, partyId, reason })
              }
            />
            <AdminMarketerPay />
          </>
        ) : null}

        {/* ---------- 5. PEOPLE ---------- */}
        {tab === "people" && (
          <>
            <TeamCard
              staff={state.staff || []}
              working={working}
              armed={armed}
              arm={arm}
              onGive={(email) => run("team-give", "setMarketingAccess", { email, on: true })}
              onRemove={(email) => run(`team-remove-${email}`, "setMarketingAccess", { email, on: false })}
            />
            {state.deletions && state.deletions.length > 0 ? (
              <View style={[styles.card, styles.warnCard]}>
                <Text style={styles.cardTitle}>Accounts being deleted ({state.deletions.length})</Text>
                <Text style={styles.hint}>
                  Locked now and erased on the date shown. Restore only if the person contacts you and asks.
                </Text>
                {state.deletions.map((d) => (
                  <View key={d.uid} style={{ marginTop: 10 }}>
                    <Text style={styles.value}>
                      {d.name || d.email || d.uid} <Text style={styles.muted}>({d.role})</Text>
                    </Text>
                    <Text style={styles.muted}>
                      {d.email || ""} · erased {d.eraseAfterMs ? new Date(d.eraseAfterMs).toDateString() : "soon"}
                    </Text>
                    <Pressable
                      style={[styles.smallButton, { alignSelf: "flex-start", marginTop: 6 }]}
                      onPress={() => {
                        if (armed !== `restore-${d.uid}`) return arm(`restore-${d.uid}`);
                        void run(`restore-${d.uid}`, "restoreAccount", { uid: d.uid });
                      }}
                      disabled={working === `restore-${d.uid}`}
                    >
                      <Text style={styles.smallButtonText}>
                        {working === `restore-${d.uid}` ? "..." : armed === `restore-${d.uid}` ? "Tap again to restore" : "Restore account"}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={[styles.card, styles.rowBetween]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.cardTitle}>Shops and customers</Text>
                <Text style={styles.muted}>Full lists as spreadsheets.</Text>
              </View>
              <View style={{ gap: 8 }}>
                <DownloadButton report="shops" label="Shops" />
                <DownloadButton report="customers" label="Customers" />
              </View>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Riders ({riders.length})</Text>
              <DownloadButton report="riders" />
            </View>
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
                          r.availability === "available" ? colors.greenSoft : r.availability === "busy" ? "#e7eef8" : colors.chip,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color:
                            r.availability === "available" ? colors.green : r.availability === "busy" ? "#1f4f8a" : colors.muted,
                        },
                      ]}
                    >
                      {r.availability === "available" ? "Free" : r.availability === "busy" ? "On a trip" : "Offline"}
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
          </>
        )}

        {/* ---------- 6. SETTINGS ---------- */}
        {tab === "settings" && (
          <>
            {state.pricing ? (
              <AdminPricing
                pricing={state.pricing}
                working={working === "pricing"}
                onSave={(settings) => void run("pricing", "setPricingSettings", { settings })}
              />
            ) : null}
            {state.wallets && state.commission ? (
              <AdminMoney
                section="settings"
                state={state}
                working={working}
                onPay={() => undefined}
                onReject={() => undefined}
                onSaveRates={(rates) => void run("rates", "setCommissionRates", { rates })}
                onSaveSettings={(settings) => void run("payoutSettings", "setPayoutSettings", { settings })}
                onSaveFunding={(settings) => void run("funding", "setFundingSettings", { settings })}
                onSaveRewards={(settings) => void run("rewards", "setRewardsSettings", { settings })}
                onBankAction={() => undefined}
              />
            ) : null}
            {state.marketerPaySettings ? (
              <>
                <Text style={styles.sectionTitle}>Marketing team</Text>
                <MarketerPaySettingsCard
                  key={JSON.stringify(state.marketerPaySettings)}
                  settings={state.marketerPaySettings}
                  saving={working === "marketerPay"}
                  onSave={(marketerPay) => void run("marketerPay", "setMarketerPaySettings", { marketerPay })}
                />
              </>
            ) : null}
            {state.delivery ? (
              <View style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.cardTitle}>Require delivery code</Text>
                    <Text style={styles.muted}>
                      Riders must enter the customer's 4-digit code to confirm delivery.
                    </Text>
                  </View>
                  <Switch
                    value={state.delivery.settings.requireCode}
                    disabled={working !== null}
                    onValueChange={(v) => void run("delivery", "setDeliverySettings", { settings: { requireCode: v } })}
                    trackColor={{ true: colors.green, false: "#d6d3cb" }}
                    thumbColor="#ffffff"
                  />
                </View>
                {!state.delivery.settings.requireCode ? (
                  <Text style={styles.warnText}>
                    OFF: riders can mark orders delivered without the customer. Use only for testing.
                  </Text>
                ) : null}
              </View>
            ) : null}
            {state.ai ? (
              <AiCard
                ai={state.ai}
                busy={working === "ai"}
                onSave={(settings) => void run("ai", "setAiSettings", { settings })}
              />
            ) : null}
            {state.backup ? (
              <View style={[styles.card, !state.backup.configured || !state.backup.lastOk ? styles.warnCard : null]}>
                <Text style={styles.cardTitle}>Daily backup</Text>
                {!state.backup.configured ? (
                  <Text style={styles.warnText}>
                    Not set up: add BACKUP_KEY in Vercel → Settings → Environment Variables, then redeploy.
                  </Text>
                ) : state.backup.lastAtMs ? (
                  <Text style={state.backup.lastOk ? styles.muted : styles.warnText}>
                    {state.backup.lastOk ? "Last backup" : "Last try failed"} {new Date(state.backup.lastAtMs).toLocaleString()}
                    {state.backup.lastOk && state.backup.docs
                      ? ` · ${state.backup.docs.toLocaleString()} records · ${Math.round((state.backup.bytes || 0) / 1024).toLocaleString()} KB`
                      : ""}
                    {!state.backup.lastOk && state.backup.error ? `\n${state.backup.error}` : ""}
                  </Text>
                ) : (
                  <Text style={styles.muted}>No backup yet. The first one runs tonight, or tap below.</Text>
                )}
                <Text style={styles.hint}>
                  Every night at 3:30 AM, locked with your BACKUP_KEY. Kept {state.backup.keepDays} days.
                </Text>
                <Pressable
                  style={[styles.smallButton, { alignSelf: "flex-start", marginTop: 10 }]}
                  onPress={() => void run("backup", "backupNow")}
                  disabled={working === "backup"}
                >
                  <Text style={styles.smallButtonText}>{working === "backup" ? "Backing up..." : "Back up now"}</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}

        {/* ---------- 7. RECORDS ---------- */}
        {tab === "records" && (
          <>
            <Text style={styles.sectionTitle}>Downloads</Text>
            <AdminDownloads />
            <Text style={styles.sectionTitle}>Activity log</Text>
            <AdminLogs />
          </>
        )}

        <Text style={[styles.hint, { textAlign: "center", marginTop: 10 }]}>
          Updated {new Date(state.generatedAtMs).toLocaleTimeString()} · pull down to refresh
        </Text>
      </ScrollView>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.lineRow}>
      <Text style={styles.item}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 60 },
  tabsBar: { height: 56, marginBottom: 6 },
  tabsScroll: { flexGrow: 0, height: 56 },
  tabs: { paddingHorizontal: 20, gap: 8, alignItems: "center", height: 56 },
  tab: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "rgba(23,33,27,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tabActive: { backgroundColor: colors.green, borderColor: colors.green },
  tabText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.ink2 },
  tabTextActive: { fontFamily: fonts.bold, color: "#ffffff" },
  tabCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  tabCountOn: { backgroundColor: "#ffffff" },
  tabCountText: { fontFamily: fonts.bold, fontSize: 11, color: colors.goldText },
  profitCard: {
    backgroundColor: colors.green,
    borderRadius: radius.xl,
    padding: 20,
    marginBottom: 12,
    overflow: "hidden",
    ...shadow.button,
  },
  ring: {
    position: "absolute",
    right: -44,
    top: -44,
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 20,
    borderColor: "rgba(242,179,61,0.16)",
  },
  profitLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.onGreenMuted },
  profitValue: { fontFamily: fonts.display, fontSize: 34, letterSpacing: -0.8, color: colors.gold, marginTop: 4 },
  profitStats: { flexDirection: "row", gap: 8, marginTop: 14 },
  profitStat: { flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 14, padding: 10 },
  profitStatValue: { fontFamily: fonts.bold, fontSize: 18, color: "#ffffff" },
  profitStatLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.onGreenMuted },
  card: { ...ui.card, padding: 16, marginBottom: 12 },
  warnCard: { backgroundColor: "#fffaf0", borderWidth: 1, borderColor: "#f3dcae" },
  okCard: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.ink },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sectionTitle: { ...text.label, marginTop: 10, marginBottom: 8, marginLeft: 2 },
  muted: { fontFamily: fonts.regular, color: colors.muted, marginTop: 3, fontSize: 13, lineHeight: 18 },
  hint: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12, marginTop: 8, lineHeight: 17 },
  value: { fontFamily: fonts.semibold, color: colors.ink },
  bigValue: { ...text.price, fontSize: 19 },
  item: { fontFamily: fonts.regular, marginTop: 5, color: colors.ink2, flexShrink: 1, paddingRight: 8 },
  lineRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  twoCol: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.chip },
  badgeText: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.ink2 },
  okText: { fontFamily: fonts.bold, color: colors.green },
  warnText: { fontFamily: fonts.semibold, color: colors.goldText, marginTop: 8, lineHeight: 19 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  stat: { flex: 1, ...ui.card, borderRadius: radius.md, padding: 12, alignItems: "center" },
  statNumber: { ...text.price, fontSize: 19 },
  statLabel: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12, marginTop: 2, textAlign: "center" },
  attentionRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderRadius: 10 },
  attentionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  attentionText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  label: { ...ui.label },
  input: { ...ui.input },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    height: 34,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(23,33,27,0.12)",
    borderRadius: 17,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.greenSoft, borderColor: colors.green },
  chipText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.ink2 },
  chipTextActive: { color: colors.green },
  smallButton: {
    height: 38,
    justifyContent: "center",
    borderRadius: 19,
    paddingHorizontal: 14,
    backgroundColor: colors.greenSoft,
  },
  smallButtonText: { fontFamily: fonts.bold, fontSize: 13, color: colors.green },
  dangerOutline: { backgroundColor: colors.dangerSoft },
  dangerFilled: { backgroundColor: colors.danger },
  darkFilled: { backgroundColor: colors.green },
  primaryButton: { ...ui.primaryButton, marginTop: 14, height: 48, borderRadius: 24 },
  approveButton: { ...ui.primaryButton, marginTop: 12, height: 48, borderRadius: 24 },
  dangerButton: {
    marginTop: 12,
    backgroundColor: colors.danger,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: ui.primaryButtonText,
  secondaryButton: { ...ui.secondaryButton, marginTop: 12, height: 48 },
  secondaryButtonText: ui.secondaryButtonText,
  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.greenSoft,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
  },
  noticeText: { flex: 1, fontFamily: fonts.semibold, color: colors.green },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { flex: 1, fontFamily: fonts.semibold, color: colors.danger },
});
