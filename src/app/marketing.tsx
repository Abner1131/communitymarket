// Marketing dashboard (role "marketing", and admins).
//
// Growth numbers, seller/rider applications (call them, add notes for the
// admin), which shops and riders are active, and marketer codes. No money,
// bank details, settings or customer contacts: the server never sends them.

import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { BrandLoader } from "../components/Brand";

import { StaleNote } from "../components/StaleNote";
import { useAuth } from "../context/AuthContext";
import { useScreenCache } from "../lib/screenCache";
import {
  MarketingApplication,
  MarketingApiError,
  MarketingState,
  type MarketingTeam,
  marketingAction,
  type MarketingAction,
} from "../lib/marketingApi";

type Tab = "overview" | "applications" | "shops" | "riders" | "codes";

function ago(msValue: number | null) {
  if (!msValue) return "-";
  const mins = Math.round((Date.now() - msValue) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function call(phone: string | null) {
  if (phone) Linking.openURL(`tel:${phone}`).catch(() => {});
}

export default function MarketingScreen() {
  const { user, signOut } = useAuth();
  const cache = useScreenCache<MarketingState>("marketing");
  const state = cache.value;
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(!state);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [team, setTeam] = useState<MarketingTeam | null>(null);

  const run = useCallback(
    async (action: MarketingAction, extra: Record<string, unknown> = {}, label: string | null = null) => {
      if (label) setBusy(label);
      setError("");
      try {
        const r = await marketingAction(action, extra);
        cache.setFresh(r.marketing);
        if (r.team) setTeam(r.team);
        if (r.message) setMessage(r.message);
        return true;
      } catch (e: any) {
        if (e instanceof MarketingApiError && e.forbidden) setForbidden(true);
        setError(e?.message || "Something went wrong.");
        return false;
      } finally {
        setBusy(null);
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    void run("marketing");
  }, [run]);

  const header = (
    <>
      <Pressable onPress={() => router.replace("/")}>
        <Text style={styles.backText}>{"←"} Home</Text>
      </Pressable>
      <Text style={styles.title}>Marketing</Text>
      <Text style={styles.muted}>{user?.email}</Text>
    </>
  );

  if (forbidden && !state) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {header}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No marketing access</Text>
            <Text style={styles.muted}>{error || "Ask the CommunityMarket admin to give you marketing access."}</Text>
            <Pressable style={styles.secondaryButton} onPress={() => void signOut()}>
              <Text style={styles.secondaryText}>Sign out</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void run("marketing")} />}
      >
        {header}
        <StaleNote fromCache={cache.fromCache} failed={!!error} savedAtMs={cache.savedAtMs} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={styles.tabs}>
            {(
              [
                ["overview", "Overview"],
                ["applications", `Applications${state && state.applications.length ? ` (${state.applications.length})` : ""}`],
                ["shops", "Shops"],
                ["riders", "Riders"],
                ["codes", "Team & codes"],
              ] as [Tab, string][]
            ).map(([t, text]) => (
              <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{text}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {message ? (
          <Pressable style={styles.okBox} onPress={() => setMessage("")}>
            <Text style={styles.okText}>{message}</Text>
          </Pressable>
        ) : null}
        {error && state ? <Text style={styles.error}>{error}</Text> : null}

        {loading && !state ? (
          <BrandLoader style={{ marginTop: 40 }} />
        ) : !state ? (
          <View style={styles.card}>
            <Text style={styles.error}>{error || "Could not load."}</Text>
            <Pressable style={styles.primaryButton} onPress={() => void run("marketing", {}, "load")}>
              <Text style={styles.primaryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {tab === "overview" && <Overview state={state} />}
            {tab === "applications" && (
              <Applications
                apps={state.applications}
                busy={busy}
                onNote={(applicationId, note) => run("applicationNote", { applicationId, note }, `note-${applicationId}`)}
              />
            )}
            {tab === "shops" && <Shops state={state} />}
            {tab === "riders" && <Riders state={state} />}
            {tab === "codes" && (
              <Codes
                state={state}
                team={team}
                isManager={user?.role === "marketing"}
                busy={busy}
                onCreate={(name, code, phone) => run("createMarketerCode", { name, code: code || undefined, phone }, "create")}
                onCreateMine={(name, code, phone) => run("createMyCode", { name, code, phone }, "mine")}
                onResetPin={(code) => run("resetMarketerPin", { code }, `pin-${code}`)}
                onToggle={(code, active) => run("setMarketerCodeActive", { code, active }, `code-${code}`)}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- overview ----------
function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

function Overview({ state }: { state: MarketingState }) {
  const g = state.growth;
  return (
    <>
      <View style={styles.statGrid}>
        <Stat label="Customers" value={g.customers} sub={`+${g.newCustomers7} this week · +${g.newCustomers30} in 30 days`} />
        <Stat label="Delivered orders" value={g.orders7} sub={`this week · ${g.orders30} in 30 days`} />
        <Stat label="Shops" value={g.shops} sub={`${g.activeShops30} sold in the last 30 days`} />
        <Stat label="Riders" value={g.riders} sub={`${g.ridersOnline} online now`} />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>To do</Text>
        <Text style={styles.item}>
          {"•"} {g.pendingApplications} application(s) waiting. Call them and add a note for the admin.
        </Text>
        <Text style={styles.item}>
          {"•"} {g.shops - g.activeShops30} shop(s) with no sale in 30 days. Help them improve photos and prices.
        </Text>
        <Text style={styles.hint}>Updated {ago(state.generatedAtMs)}. Pull down to refresh.</Text>
      </View>
    </>
  );
}

// ---------- applications ----------
function Applications({
  apps,
  busy,
  onNote,
}: {
  apps: MarketingApplication[];
  busy: string | null;
  onNote: (applicationId: string, note: string) => Promise<boolean>;
}) {
  if (apps.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.muted}>No applications waiting.</Text>
      </View>
    );
  }
  return (
    <>
      {apps.map((a) => (
        <ApplicationCard key={a.id} app={a} busy={busy === `note-${a.id}`} onNote={(n) => onNote(a.id, n)} />
      ))}
    </>
  );
}

function ApplicationCard({
  app,
  busy,
  onNote,
}: {
  app: MarketingApplication;
  busy: boolean;
  onNote: (note: string) => Promise<boolean>;
}) {
  const [note, setNote] = useState("");
  const isRider = app.requestedRole === "rider";
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>{isRider ? app.name : app.businessName || app.name}</Text>
        <View style={[styles.badge, { backgroundColor: isRider ? "#1565c0" : "#0a7d4f" }]}>
          <Text style={styles.badgeText}>{isRider ? "RIDER" : "SELLER"}</Text>
        </View>
      </View>
      {!isRider ? <Text style={styles.item}>Owner: {app.name}</Text> : null}
      {isRider ? <Text style={styles.item}>Vehicle: {app.vehicle === "keke" ? "Keke" : "Bike"}</Text> : null}
      {app.businessAddress ? <Text style={styles.item}>Address: {app.businessAddress}</Text> : null}
      {app.note ? <Text style={styles.item}>Their note: {app.note}</Text> : null}
      <Text style={styles.item}>
        Marketer: {app.marketerCode ? `${app.marketerName || ""} (${app.marketerCode})` : "none"}
      </Text>
      <Text style={styles.hint}>Applied {ago(app.createdAtMs)}</Text>
      {app.phone ? (
        <Pressable style={styles.secondaryButton} onPress={() => call(app.phone)}>
          <Text style={styles.secondaryText}>Call {app.phone}</Text>
        </Pressable>
      ) : null}

      {app.notes.length > 0 ? (
        <View style={styles.notes}>
          {app.notes.map((n, i) => (
            <Text key={i} style={styles.noteText}>
              {"“"}
              {n.text}
              {"”"} {"—"} {n.by || "Marketing"}, {ago(n.atMs)}
            </Text>
          ))}
        </View>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Note for the admin, e.g. visited the shop, genuine"
        placeholderTextColor="#888"
        value={note}
        onChangeText={setNote}
        maxLength={300}
      />
      <Pressable
        style={[styles.primaryButton, (busy || note.trim().length < 2) && { opacity: 0.5 }]}
        disabled={busy || note.trim().length < 2}
        onPress={async () => {
          if (await onNote(note.trim())) setNote("");
        }}
      >
        <Text style={styles.primaryText}>{busy ? "Saving..." : "Add note"}</Text>
      </Pressable>
      <Text style={styles.hint}>The admin approves or rejects. Your notes help them decide.</Text>
    </View>
  );
}

// ---------- shops ----------
function Shops({ state }: { state: MarketingState }) {
  const [search, setSearch] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const q = search.trim().toLowerCase();
  const list = state.shops.filter(
    (s) => (showDemo || s.linked) && (!q || s.name.toLowerCase().includes(q) || (s.address || "").toLowerCase().includes(q)),
  );
  return (
    <>
      <TextInput
        style={styles.input}
        placeholder="Search shops"
        placeholderTextColor="#888"
        value={search}
        onChangeText={setSearch}
      />
      <View style={styles.switchRow}>
        <Text style={styles.item}>Show demo shops</Text>
        <Switch value={showDemo} onValueChange={setShowDemo} />
      </View>
      {list.length === 0 ? <Text style={styles.muted}>No shops.</Text> : null}
      {list.map((s) => (
        <View key={s.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{s.name}</Text>
            <Text style={[styles.pill, s.orders30 > 0 ? styles.pillGood : styles.pillWarn]}>
              {s.orders30 > 0 ? `${s.orders30} sale(s) in 30 days` : "No sales in 30 days"}
            </Text>
          </View>
          {s.address ? <Text style={styles.item}>{s.address}</Text> : null}
          <Text style={styles.item}>
            {s.products} product(s) on sale · {s.businessType}
            {!s.active ? " · HIDDEN" : ""}
            {!s.linked ? " · demo" : ""}
          </Text>
          <Text style={styles.hint}>
            Last sale: {ago(s.lastOrderMs)} · Joined {ago(s.joinedMs)}
            {s.marketerCode ? ` · Marketer ${s.marketerCode}` : ""}
          </Text>
          {s.products < 5 && s.linked ? (
            <Text style={styles.tip}>Tip: shops with 5+ products and clear photos sell more.</Text>
          ) : null}
          {s.phone ? (
            <Pressable style={styles.secondaryButton} onPress={() => call(s.phone)}>
              <Text style={styles.secondaryText}>Call shop {s.phone}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </>
  );
}

// ---------- riders ----------
function Riders({ state }: { state: MarketingState }) {
  const list = state.riders.filter((r) => r.linked);
  return (
    <>
      {list.length === 0 ? <Text style={styles.muted}>No riders yet.</Text> : null}
      {list.map((r) => (
        <View key={r.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{r.name}</Text>
            <Text style={[styles.pill, r.availability !== "offline" ? styles.pillGood : styles.pillGrey]}>
              {r.availability === "offline" ? "Offline" : r.availability === "busy" ? "On a trip" : "Online"}
            </Text>
          </View>
          <Text style={styles.item}>
            {r.vehicle === "keke" ? "Keke" : "Bike"} · {r.completedTrips} trip(s) done
            {!r.active ? " · HIDDEN" : ""}
          </Text>
          {r.marketerCode ? <Text style={styles.hint}>Marketer {r.marketerCode}</Text> : null}
        </View>
      ))}
    </>
  );
}

// ---------- marketer codes ----------
function naira(n: number) {
  return `₦${Math.round(n || 0).toLocaleString()}`;
}

// The manager's own code (he earns on his own sign-ups and on his team).
function MyCodeCard({
  team,
  busy,
  onCreateMine,
}: {
  team: MarketingTeam | null;
  busy: string | null;
  onCreateMine: (name: string, code: string, phone: string) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  if (team && team.myCode && team.my) {
    return (
      <View style={[styles.card, { backgroundColor: "#0b4a2f" }]}>
        <Text style={{ color: "#cfe0d5", fontWeight: "700" }}>Your pay, {team.monthName} so far</Text>
        <Text style={{ color: "#fff", fontSize: 30, fontWeight: "800", marginTop: 4 }}>{naira(team.my.amount)}</Text>
        <Text style={{ color: "#cfe0d5", marginTop: 4, lineHeight: 19 }}>
          Your own sign-ups {naira(team.my.direct)} · your team {naira(team.my.team)}
          {"\n"}Your code: {team.myCode}
        </Text>
        <Pressable style={[styles.secondaryButton, { borderColor: "#cfe0d5" }]} onPress={() => router.push("/marketer" as any)}>
          <Text style={[styles.secondaryText, { color: "#fff" }]}>My earnings and bank</Text>
        </Pressable>
      </View>
    );
  }
  const ok = name.trim().length >= 2 && code.length >= 3 && phone.replace(/\D/g, "").length >= 10;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Your own code</Text>
      <Text style={styles.muted}>
        Make your own code first. Shops you sign up yourself use it, and codes you create after it become your team
        (you earn a share of what they earn).
      </Text>
      <TextInput style={styles.input} placeholder="Your full name (as on your bank account)" placeholderTextColor="#888" value={name} onChangeText={setName} maxLength={60} />
      <TextInput
        style={styles.input}
        placeholder="Your code, e.g. MUSA"
        placeholderTextColor="#888"
        autoCapitalize="characters"
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        maxLength={10}
      />
      <TextInput style={styles.input} placeholder="Your phone number" placeholderTextColor="#888" keyboardType="phone-pad" value={phone} onChangeText={setPhone} maxLength={16} />
      <Pressable
        style={[styles.primaryButton, (busy === "mine" || !ok) && { opacity: 0.5 }]}
        disabled={busy === "mine" || !ok}
        onPress={() => void onCreateMine(name.trim(), code, phone.trim())}
      >
        <Text style={styles.primaryText}>{busy === "mine" ? "Creating..." : "Create my code"}</Text>
      </Pressable>
    </View>
  );
}

function Codes({
  state,
  team,
  isManager,
  busy,
  onCreate,
  onCreateMine,
  onResetPin,
  onToggle,
}: {
  state: MarketingState;
  team: MarketingTeam | null;
  isManager: boolean;
  busy: string | null;
  onCreate: (name: string, code: string, phone: string) => Promise<boolean>;
  onCreateMine: (name: string, code: string, phone: string) => Promise<boolean>;
  onResetPin: (code: string) => Promise<boolean>;
  onToggle: (code: string, active: boolean) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [armedPin, setArmedPin] = useState<string | null>(null);
  const teamByCode = Object.fromEntries((team?.team || []).map((t) => [t.code, t]));
  const phoneOk = phone.replace(/\D/g, "").length >= 10;
  return (
    <>
      {isManager ? <MyCodeCard team={team} busy={busy} onCreateMine={onCreateMine} /> : null}
      {team?.settings ? (
        <Text style={styles.hint}>
          Pay rules: {team.settings.marketerPct}% of what a marketer's shops and riders earn CommunityMarket, for{" "}
          {team.settings.months} months, once a shop has {team.settings.shopActiveOrders} orders (rider{" "}
          {team.settings.riderActiveTrips} trips). You get {team.settings.managerTeamPct}% of what each team member earns.
        </Text>
      ) : null}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>New marketer code</Text>
        <Text style={styles.muted}>
          Give each marketer a code. Shops and riders type it when they apply. You get a PIN to give the marketer, so
          they can see their own pay in the app.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Marketer's name"
          placeholderTextColor="#888"
          value={name}
          onChangeText={setName}
          maxLength={60}
        />
        <TextInput
          style={styles.input}
          placeholder="Code (optional, e.g. MUSA01)"
          placeholderTextColor="#888"
          autoCapitalize="characters"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          maxLength={10}
        />
        <TextInput
          style={styles.input}
          placeholder="Marketer's phone number"
          placeholderTextColor="#888"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          maxLength={16}
        />
        <Pressable
          style={[styles.primaryButton, (busy === "create" || name.trim().length < 2 || !phoneOk) && { opacity: 0.5 }]}
          disabled={busy === "create" || name.trim().length < 2 || !phoneOk}
          onPress={async () => {
            if (await onCreate(name.trim(), code, phone.trim())) {
              setName("");
              setCode("");
              setPhone("");
            }
          }}
        >
          <Text style={styles.primaryText}>{busy === "create" ? "Creating..." : "Create code"}</Text>
        </Pressable>
      </View>

      {state.codes.length === 0 ? <Text style={styles.muted}>No codes yet.</Text> : null}
      {state.codes.map((c) => (
        <View key={c.code} style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.codeText}>{c.code}</Text>
              <Text style={styles.item}>{c.name}</Text>
            </View>
            <Switch
              value={c.active}
              disabled={busy === `code-${c.code}`}
              onValueChange={(v) => void onToggle(c.code, v)}
            />
          </View>
          <Text style={styles.item}>
            {c.applications} application(s) · {c.approved} approved · {c.activeShops} shop(s) selling
          </Text>
          {c.kind === "manager" ? <Text style={styles.hint}>Manager's own code</Text> : null}
          {teamByCode[c.code] ? (
            <>
              <Text style={styles.item}>
                Earned this month: {naira(teamByCode[c.code].earned)} · {teamByCode[c.code].counting} counting ·{" "}
                {teamByCode[c.code].waiting} waiting
              </Text>
              <Text style={styles.hint}>
                {teamByCode[c.code].linked
                  ? "Linked in the app"
                  : teamByCode[c.code].locked
                    ? "Locked after wrong PINs: give a new PIN"
                    : "Not linked yet: they need the PIN"}
              </Text>
              <Pressable
                style={[styles.secondaryButton, busy === `pin-${c.code}` && { opacity: 0.5 }]}
                disabled={busy !== null}
                onPress={async () => {
                  if (armedPin !== c.code) return setArmedPin(c.code);
                  setArmedPin(null);
                  await onResetPin(c.code);
                }}
              >
                <Text style={styles.secondaryText}>
                  {busy === `pin-${c.code}` ? "..." : armedPin === c.code ? "Tap again: new PIN (unlinks their account)" : "New PIN"}
                </Text>
              </Pressable>
            </>
          ) : null}
          {!c.active ? <Text style={styles.hint}>Switched off: new applications can't use it.</Text> : null}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f6f8" },
  container: { padding: 20, paddingBottom: 60 },
  backText: { fontWeight: "700", marginBottom: 12, color: "#111" },
  title: { fontSize: 28, fontWeight: "800", color: "#111" },
  muted: { color: "#666", marginTop: 4, marginBottom: 12, lineHeight: 20 },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#e9eaee" },
  tabActive: { backgroundColor: "#111" },
  tabText: { fontWeight: "700", color: "#444" },
  tabTextActive: { color: "#fff" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: "800", color: "#111", flexShrink: 1 },
  item: { color: "#333", marginTop: 6, lineHeight: 20 },
  hint: { color: "#777", fontSize: 12, marginTop: 6 },
  tip: { color: "#8a4b00", fontSize: 12.5, marginTop: 8, fontWeight: "600" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  pill: { fontSize: 11, fontWeight: "800", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, overflow: "hidden" },
  pillGood: { backgroundColor: "#e3f4ea", color: "#0a6b40" },
  pillWarn: { backgroundColor: "#fff1df", color: "#8a4b00" },
  pillGrey: { backgroundColor: "#eee", color: "#555" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  stat: { backgroundColor: "#fff", borderRadius: 16, padding: 14, flexGrow: 1, flexBasis: "45%" },
  statValue: { fontSize: 26, fontWeight: "800", color: "#111" },
  statLabel: { fontWeight: "700", color: "#333", marginTop: 2 },
  statSub: { color: "#777", fontSize: 12, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 10,
    backgroundColor: "#fff",
    color: "#111",
  },
  primaryButton: { backgroundColor: "#111", borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 10 },
  primaryText: { color: "#fff", fontWeight: "800" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryText: { fontWeight: "700", color: "#111" },
  notes: { backgroundColor: "#f5f6f8", borderRadius: 10, padding: 10, marginTop: 10 },
  noteText: { color: "#333", fontSize: 13, lineHeight: 19, marginBottom: 4 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 6 },
  codeText: { fontSize: 20, fontWeight: "800", letterSpacing: 1, color: "#111" },
  okBox: { backgroundColor: "#e3f4ea", borderRadius: 12, padding: 12, marginBottom: 12 },
  okText: { color: "#0a6b40", fontWeight: "700" },
  error: { color: "#b00020", marginBottom: 10 },
});
