// Marketer earnings: for the marketing team (field marketers and the manager).
// First link your code with the PIN from your manager; then see this week's
// pay, your shops and riders (which count, months left), past weeks and
// whether they were paid, and the bank account your pay goes to.

import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BrandLoader } from "../components/Brand";
import { Icon } from "../components/Icon";
import { MarketerTermsAgree } from "../components/MarketerTermsAgree";
import { PolicyText } from "../components/PolicyText";
import { Notice, ScreenHeader, SectionCard, SummaryRow } from "../components/ui";
import { listBanks, POPULAR_BANKS, type BankOption } from "../lib/bankApi";
import {
  marketerTermsBody,
  MARKETER_TERMS_UPDATED,
  MARKETER_TERMS_VERSION,
  termsTitle,
  type PayNumbers,
} from "../data/marketerTerms";
import { marketerCall, type MarketerMe } from "../lib/marketerApi";
import { colors, fonts, radius, text, ui } from "../theme";

function naira(n: number) {
  return `₦${Math.round(n || 0).toLocaleString()}`;
}

function dateText(msValue: number | null) {
  if (!msValue) return "";
  const d = new Date(msValue + 60 * 60 * 1000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export default function MarketerScreen() {
  const [me, setMe] = useState<MarketerMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const run = useCallback(async (action: "marketerMe" | "marketerLink" | "marketerBank" | "marketerAgree", extra = {}, label: string | null = null) => {
    if (label) setBusy(label);
    setError("");
    try {
      const r = await marketerCall(action, extra);
      setMe(r.marketer);
      if (r.message) setMessage(r.message);
      return true;
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
      return false;
    } finally {
      setBusy(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run("marketerMe");
  }, [run]);

  return (
    <View style={ui.screen}>
      <View style={ui.glow} pointerEvents="none" />
      <ScreenHeader title="Marketer earnings" subtitle={me && me.linked ? `Code ${me.code}` : undefined} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void run("marketerMe")} />}
      >
        {message ? <Notice tone="success" text={message} /> : null}
        {error ? <Notice tone="error" text={error} /> : null}

        {loading && !me ? (
          <BrandLoader style={{ marginTop: 40 }} />
        ) : !me ? null : !me.linked ? (
          <LinkCard
            busy={busy === "link"}
            settings={me.settings}
            onLink={(code, pin) => run("marketerLink", { code, pin, agree: MARKETER_TERMS_VERSION }, "link")}
          />
        ) : me.terms.agreedVersion !== me.terms.version ? (
          <AgreeAgainCard
            kind={me.kind}
            settings={me.settings}
            busy={busy === "agree"}
            first={!me.terms.agreedVersion}
            onAgree={() => run("marketerAgree", { agree: MARKETER_TERMS_VERSION }, "agree")}
          />
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>This week so far · {me.thisMonth.monthName}</Text>
              <Text style={styles.heroAmount}>{naira(me.thisMonth.amount)}</Text>
              <Text style={styles.heroSub}>
                {me.kind === "manager"
                  ? `Your own sign-ups ${naira(me.thisMonth.direct)} · your team ${naira(me.thisMonth.team)}`
                  : `${me.settings.marketerPct}% of what your shops and riders earn CommunityMarket`}
              </Text>
              <Text style={styles.heroNote}>
                Paid every Friday for the week before, after the admin closes the week.
              </Text>
            </View>

            <SectionCard icon="store" title="Your shops and riders">
              {me.partners.length === 0 ? (
                <Text style={styles.muted}>
                  None yet. Shops and riders type your code ({me.code}) when they apply in the app.
                </Text>
              ) : (
                me.partners.map((p) => {
                  const over = p.endsAtMs !== null && p.endsAtMs < Date.now();
                  return (
                    <View key={`${p.partyType}-${p.id}`} style={styles.partner}>
                      <View style={styles.partnerIcon}>
                        <Icon name={p.partyType === "rider" ? "bike" : "store"} size={17} color={colors.green} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.partnerName}>{p.name}</Text>
                        <Text style={styles.small}>
                          {over
                            ? "Pay period ended"
                            : p.active
                              ? `Counting${p.endsAtMs ? ` until ${dateText(p.endsAtMs)}` : ""}`
                              : `${p.done}/${p.need} ${p.partyType === "rider" ? "trips" : "orders"} before it counts`}
                        </Text>
                      </View>
                      <View style={[styles.pill, p.active && !over ? styles.pillGood : styles.pillWait]}>
                        <Text style={[styles.pillText, { color: p.active && !over ? colors.green : colors.goldText }]}>
                          {over ? "Ended" : p.active ? "Active" : "Waiting"}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </SectionCard>

            <SectionCard icon="receipt" title="Past weeks">
              {me.statements.length === 0 ? (
                <Text style={styles.muted}>No closed weeks yet.</Text>
              ) : (
                me.statements.map((s) => (
                  <SummaryRow
                    key={s.month}
                    label={`${s.monthName} · ${s.paid ? `paid ${dateText(s.paidAtMs)}` : s.payByMs ? `due by ${dateText(s.payByMs)}` : "being paid"}`}
                    value={naira(s.amount)}
                  />
                ))
              )}
            </SectionCard>

            <BankCard me={me} busy={busy === "bank"} onSave={(bankCode, accountNumber) => run("marketerBank", { bankCode, accountNumber }, "bank")} />

            <MyTermsCard kind={me.kind} settings={me.settings} agreedAtMs={me.terms.agreedAtMs} />

            <View style={styles.rules}>
              <Icon name="info" size={14} color={colors.muted} />
              <Text style={styles.rulesText}>
                You earn {me.settings.marketerPct}% of the commission CommunityMarket makes on your shops, and of the
                delivery profit on your riders, for {me.settings.months} months from their approval. A shop counts after{" "}
                {me.settings.shopActiveOrders} delivered orders (rider: {me.settings.riderActiveTrips} trips); its earlier
                orders are then paid too. Refunded orders and your own shop earn nothing.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// The Terms you agreed to, to read again any time.
function MyTermsCard({ kind, settings, agreedAtMs }: { kind: "manager" | "marketer"; settings: PayNumbers; agreedAtMs: number | null }) {
  const [open, setOpen] = useState(false);
  const title = termsTitle(kind);
  return (
    <SectionCard icon="file" title={`Your ${title}`}>
      <Text style={styles.muted}>
        {agreedAtMs ? `You agreed on ${dateText(agreedAtMs)}.` : "You have agreed."} Version of {MARKETER_TERMS_UPDATED}.
      </Text>
      <Pressable style={({ pressed }) => [ui.secondaryButton, { marginTop: 12 }, pressed && { opacity: 0.7 }]} onPress={() => setOpen((v) => !v)}>
        <Text style={ui.secondaryButtonText}>{open ? "Hide" : `Read my ${title}`}</Text>
      </Pressable>
      {open ? (
        <View style={{ marginTop: 12 }}>
          <PolicyText body={marketerTermsBody(kind, settings)} />
        </View>
      ) : null}
    </SectionCard>
  );
}

function AgreeAgainCard({
  kind,
  settings,
  busy,
  first,
  onAgree,
}: {
  kind: "manager" | "marketer";
  settings: PayNumbers;
  busy: boolean;
  first: boolean;
  onAgree: () => Promise<boolean>;
}) {
  const [agreed, setAgreed] = useState(false);
  return (
    <SectionCard icon="file" title={first ? "Please agree to the Terms" : "Our Terms have changed"}>
      <Text style={styles.muted}>
        {first
          ? "Please read and agree to continue."
          : "Please read the new Terms and agree to keep using this page. Weeks already closed are not changed."}
      </Text>
      <MarketerTermsAgree kind={kind} settings={settings} agreed={agreed} onChange={setAgreed} />
      <Pressable
        style={({ pressed }) => [ui.primaryButton, { marginTop: 16 }, (!agreed || busy || pressed) && { opacity: 0.6 }]}
        disabled={!agreed || busy}
        onPress={() => void onAgree()}
      >
        <Text style={ui.primaryButtonText}>{busy ? "Saving..." : "I agree"}</Text>
      </Pressable>
    </SectionCard>
  );
}

function LinkCard({
  busy,
  settings,
  onLink,
}: {
  busy: boolean;
  settings?: PayNumbers;
  onLink: (code: string, pin: string) => Promise<boolean>;
}) {
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [agreed, setAgreed] = useState(false);
  const ok = code.length >= 3 && /^\d{6}$/.test(pin) && agreed;
  return (
    <SectionCard icon="key" title="Link your marketer code">
      <Text style={styles.muted}>
        Are you a CommunityMarket marketer? Enter your code and the 6-digit PIN your manager gave you. You only do this
        once.
      </Text>
      <Text style={styles.label}>Marketer code</Text>
      <TextInput
        style={ui.input}
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        placeholder="e.g. AISHA01"
        placeholderTextColor={colors.faint}
        autoCapitalize="characters"
        maxLength={10}
      />
      <Text style={styles.label}>PIN</Text>
      <TextInput
        style={ui.input}
        value={pin}
        onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 6))}
        placeholder="6 digits"
        placeholderTextColor={colors.faint}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
      />
      <MarketerTermsAgree kind="marketer" settings={settings} agreed={agreed} onChange={setAgreed} />
      <Pressable
        style={({ pressed }) => [ui.primaryButton, { marginTop: 16 }, (!ok || busy || pressed) && { opacity: 0.6 }]}
        disabled={!ok || busy}
        onPress={() => void onLink(code, pin)}
      >
        <Text style={ui.primaryButtonText}>{busy ? "Linking..." : "Link my code"}</Text>
      </Pressable>
      <Text style={[styles.small, { marginTop: 12 }]}>Not a marketer? You don't need this page.</Text>
    </SectionCard>
  );
}

function BankCard({
  me,
  busy,
  onSave,
}: {
  me: Extract<MarketerMe, { linked: true }>;
  busy: boolean;
  onSave: (bankCode: string, accountNumber: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [banks, setBanks] = useState<BankOption[] | null>(null);
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState<BankOption | null>(null);
  const [account, setAccount] = useState("");
  const [error, setError] = useState("");

  function start() {
    setEditing(true);
    setChosen(null);
    setAccount("");
    setError("");
    if (!banks) listBanks().then(setBanks).catch((e) => setError(e?.message || "Could not load the banks."));
  }

  const q = search.trim().toLowerCase();
  const matches = banks
    ? q
      ? banks.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 8)
      : POPULAR_BANKS.map((p) => banks.find((b) => b.name.toLowerCase().includes(p.toLowerCase()))).filter(
          (b): b is BankOption => Boolean(b),
        )
    : [];

  return (
    <SectionCard icon="card" title="Where your pay goes">
      {me.bank ? (
        <>
          <SummaryRow label="Name" value={me.bank.accountName} />
          <SummaryRow label="Bank" value={`${me.bank.bankName} ${me.bank.accountNumberMasked}`} />
        </>
      ) : (
        <Text style={styles.muted}>
          Add the bank account your pay should go to. It must be in your own name ({me.name}).
        </Text>
      )}
      {me.bankWaiting ? (
        <Notice tone="warning" text="The bank name did not match your registered name. CommunityMarket will check it with you." style={{ marginTop: 10, marginBottom: 0 }} />
      ) : null}
      {!editing ? (
        <Pressable style={({ pressed }) => [ui.secondaryButton, { marginTop: 14 }, pressed && { opacity: 0.7 }]} onPress={start}>
          <Text style={ui.secondaryButtonText}>{me.bank ? "Change bank account" : "Add bank account"}</Text>
        </Pressable>
      ) : (
        <>
          <Text style={styles.label}>Bank</Text>
          {chosen ? (
            <Pressable style={[ui.inputBox, styles.chosen]} onPress={() => setChosen(null)}>
              <Text style={styles.chosenText}>{chosen.name}</Text>
              <Text style={styles.change}>Change</Text>
            </Pressable>
          ) : (
            <>
              <TextInput
                style={ui.input}
                value={search}
                onChangeText={setSearch}
                placeholder="Search your bank"
                placeholderTextColor={colors.faint}
              />
              {!banks && !error ? <Text style={styles.small}>Loading banks...</Text> : null}
              <View style={styles.bankList}>
                {matches.map((b) => (
                  <Pressable key={b.code} style={styles.bankOption} onPress={() => setChosen(b)}>
                    <Text style={styles.bankOptionText}>{b.name}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
          <Text style={styles.label}>Account number</Text>
          <TextInput
            style={ui.input}
            value={account}
            onChangeText={(t) => setAccount(t.replace(/\D/g, "").slice(0, 10))}
            placeholder="10 digits"
            placeholderTextColor={colors.faint}
            keyboardType="number-pad"
            maxLength={10}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.buttonRow}>
            <Pressable style={[ui.secondaryButton, { flex: 1 }]} onPress={() => setEditing(false)} disabled={busy}>
              <Text style={ui.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[ui.primaryButton, { flex: 1 }, (busy || !chosen || account.length !== 10) && { opacity: 0.6 }]}
              disabled={busy || !chosen || account.length !== 10}
              onPress={async () => {
                if (chosen && (await onSave(chosen.code, account))) setEditing(false);
              }}
            >
              <Text style={ui.primaryButtonText}>{busy ? "Checking..." : "Save"}</Text>
            </Pressable>
          </View>
          <Text style={[styles.small, { marginTop: 10 }]}>We check the name with your bank. You can't type it yourself.</Text>
        </>
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  hero: { backgroundColor: colors.green, borderRadius: radius.lg, padding: 20, marginBottom: 14 },
  heroLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.onGreenMuted },
  heroAmount: { fontFamily: fonts.display, fontSize: 38, color: "#fff", marginTop: 4 },
  heroSub: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.onGreenMuted, marginTop: 4, lineHeight: 19 },
  heroNote: { fontFamily: fonts.regular, fontSize: 12, color: colors.onGreenMuted, marginTop: 10, opacity: 0.85 },
  muted: { ...text.small, fontSize: 13.5, lineHeight: 20 },
  small: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  label: { ...ui.label },
  partner: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 },
  partnerIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" },
  partnerName: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.ink },
  pill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  pillGood: { backgroundColor: colors.greenSoft },
  pillWait: { backgroundColor: colors.goldSoft },
  pillText: { fontFamily: fonts.bold, fontSize: 11.5 },
  chosen: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 14 },
  chosenText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, flex: 1 },
  change: { fontFamily: fonts.bold, fontSize: 13, color: colors.green },
  bankList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  bankOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.chip },
  bankOptionText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink2 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  error: { fontFamily: fonts.semibold, fontSize: 13, color: colors.danger, marginTop: 8 },
  rules: { flexDirection: "row", gap: 8, paddingHorizontal: 4, marginTop: 4 },
  rulesText: { ...text.small, fontSize: 12, flex: 1, lineHeight: 17 },
});
