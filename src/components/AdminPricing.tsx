// Admin -> Money -> Delivery prices.
// Edit what customers pay for delivery and what riders earn per trip, and see
// what you keep on typical orders BEFORE saving (same maths as the server,
// lib/pricing.js). Paystack's fee in the preview is an estimate.

import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, fonts, ui } from "../theme";

import type { AdminPricing, PricingSettings } from "../lib/adminApi";

type Form = Record<string, string>;

const FIELDS: { key: string; label: string; hint?: string; group: string }[] = [
  { group: "Bike", key: "bike.baseFee", label: "Base fee (₦)", hint: "covers the free km" },
  { group: "Bike", key: "bike.perKm", label: "Per km after that (₦)" },
  { group: "Bike", key: "bike.bigOrderExtra", label: "Big-order extra (₦)" },
  { group: "Keke", key: "keke.baseFee", label: "Base fee (₦)" },
  { group: "Keke", key: "keke.perKm", label: "Per km after that (₦)" },
  { group: "Keke", key: "keke.bigOrderExtra", label: "Big-order extra (₦)" },
  { group: "Distance", key: "freeKm", label: "Free km in the base fee" },
  { group: "Distance", key: "roadFactor", label: "Road factor", hint: "1.3 = roads are 30% longer than a straight line" },
  { group: "Distance", key: "bigOrderFrom", label: "Big order from (₦ goods)" },
  { group: "Extra fees", key: "serviceFee", label: "Service fee per order (₦)", hint: "0 = off" },
  { group: "Extra fees", key: "smallOrderBelow", label: "Small order below (₦ goods)", hint: "0 = off" },
  { group: "Extra fees", key: "smallOrderFee", label: "Small-order fee (₦)" },
  { group: "Rider pay", key: "riderPay.base", label: "Per trip (₦)" },
  { group: "Rider pay", key: "riderPay.perKm", label: "Per km of the route (₦)" },
  { group: "Rider pay", key: "riderPay.perExtraStop", label: "Per extra drop-off (₦)" },
];

function get(obj: any, path: string) {
  return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}

function toForm(s: PricingSettings): Form {
  const f: Form = {};
  for (const { key } of FIELDS) f[key] = String(get(s, key) ?? "");
  return f;
}

function fromForm(f: Form): PricingSettings {
  const n = (k: string) => Number(f[k]);
  return {
    bike: { baseFee: n("bike.baseFee"), perKm: n("bike.perKm"), bigOrderExtra: n("bike.bigOrderExtra") },
    keke: { baseFee: n("keke.baseFee"), perKm: n("keke.perKm"), bigOrderExtra: n("keke.bigOrderExtra") },
    freeKm: n("freeKm"),
    roadFactor: n("roadFactor"),
    bigOrderFrom: n("bigOrderFrom"),
    serviceFee: n("serviceFee"),
    smallOrderBelow: n("smallOrderBelow"),
    smallOrderFee: n("smallOrderFee"),
    riderPay: { base: n("riderPay.base"), perKm: n("riderPay.perKm"), perExtraStop: n("riderPay.perExtraStop") },
  };
}

// Same maths as the server's lib/pricing.js.
function charge(p: PricingSettings, km: number, vehicle: "bike" | "keke", goods: number) {
  const v = vehicle === "keke" ? p.keke : p.bike;
  const roadKm = Math.max(0, km) * p.roadFactor;
  let delivery = v.baseFee + Math.max(0, roadKm - p.freeKm) * v.perKm;
  if (p.bigOrderFrom > 0 && goods >= p.bigOrderFrom) delivery += v.bigOrderExtra;
  delivery = Math.round(delivery);
  const smallOrder = p.smallOrderBelow > 0 && goods < p.smallOrderBelow ? Math.round(p.smallOrderFee) : 0;
  return { delivery, service: Math.round(p.serviceFee), smallOrder, total: delivery + Math.round(p.serviceFee) + smallOrder };
}

function riderPay(p: PricingSettings, km: number, drops: number) {
  return Math.round(p.riderPay.base + p.riderPay.perKm * km * p.roadFactor + p.riderPay.perExtraStop * Math.max(0, drops - 1));
}

export function preview(p: PricingSettings, commissionPercent: number, ps: AdminPricing["paystack"]) {
  const fee = (a: number) => Math.round(Math.min(ps.cap, (a * ps.percent) / 100 + (a >= ps.flatFrom ? ps.flat : 0)));
  const one = (label: string, goods: number, km: number, orders = 1) => {
    const c = charge(p, km, "bike", goods);
    const pay = riderPay(p, orders === 1 ? km : km * 1.5, orders);
    const commission = Math.round((goods * commissionPercent) / 100) * orders;
    const paystack = fee(goods + c.total) * orders;
    return { label, orders, c, customersPay: (goods + c.total) * orders, pay, commission, paystack, keep: c.total * orders - pay + commission - paystack };
  };
  return [
    one("Small order, 1.5 km", 2000, 1.5),
    one("Normal order, 3 km", 5000, 3),
    one("Far order, 6 km", 8000, 6),
    one("3 orders batched, 1.5 km each", 4000, 1.5, 3),
  ];
}

const naira = (n: number) => `₦${Math.round(n).toLocaleString()}`;

export function AdminPricing({
  pricing,
  working,
  onSave,
}: {
  pricing: AdminPricing;
  working: boolean;
  onSave: (settings: PricingSettings) => void;
}) {
  const [form, setForm] = useState<Form>(() => toForm(pricing.settings));
  const [armed, setArmed] = useState(false);
  const [open, setOpen] = useState(false);

  // Show the saved numbers again after a save.
  useEffect(() => {
    setForm(toForm(pricing.settings));
    setArmed(false);
  }, [pricing.settings]);

  const draft = fromForm(form);
  const valid = FIELDS.every(({ key }) => form[key] !== "" && Number.isFinite(Number(form[key])) && Number(form[key]) >= 0);
  const changed = JSON.stringify(draft) !== JSON.stringify(pricing.settings);
  const rows = useMemo(
    () => (valid ? preview(draft, pricing.previewCommissionPercent, pricing.paystack) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, valid],
  );

  let lastGroup = "";
  return (
    <View style={styles.card}>
      <Pressable onPress={() => setOpen((o) => !o)}>
        <Text style={styles.title}>Delivery prices and rider pay {open ? "▴" : "▾"}</Text>
        <Text style={styles.hint}>
          Bike {naira(pricing.settings.bike.baseFee)} for {pricing.settings.freeKm} km, then {naira(pricing.settings.bike.perKm)}/km ·
          road ×{pricing.settings.roadFactor} · service {naira(pricing.settings.serviceFee)} · rider {naira(pricing.settings.riderPay.base)}/trip
        </Text>
      </Pressable>

      {open ? (
        <>
          {FIELDS.map((f) => {
            const header = f.group !== lastGroup ? f.group : null;
            lastGroup = f.group;
            return (
              <View key={f.key}>
                {header ? <Text style={styles.group}>{header}</Text> : null}
                <View style={styles.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{f.label}</Text>
                    {f.hint ? <Text style={styles.small}>{f.hint}</Text> : null}
                  </View>
                  <TextInput
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={form[f.key]}
                    onChangeText={(t) => {
                      setArmed(false);
                      setForm((old) => ({ ...old, [f.key]: t.replace(/[^0-9.]/g, "") }));
                    }}
                  />
                </View>
              </View>
            );
          })}

          <Text style={styles.group}>What you keep (preview{changed ? ", not saved yet" : ""})</Text>
          <Text style={styles.small}>
            Bike. Commission at your average {pricing.previewCommissionPercent}%. Paystack fee estimated at{" "}
            {pricing.paystack.percent}% + ₦{pricing.paystack.flat} (from ₦{pricing.paystack.flatFrom.toLocaleString()}).
          </Text>
          {rows.map((r) => (
            <View key={r.label} style={styles.example}>
              <Text style={styles.exTitle}>{r.label}</Text>
              <Text style={styles.exLine}>
                Customer pays delivery {naira(r.c.delivery)}
                {r.c.service ? ` + service ${naira(r.c.service)}` : ""}
                {r.c.smallOrder ? ` + small-order ${naira(r.c.smallOrder)}` : ""}
                {r.orders > 1 ? ` (each of ${r.orders})` : ""}
              </Text>
              <Text style={styles.exLine}>
                Rider gets {naira(r.pay)} · commission {naira(r.commission)} · Paystack ~{naira(r.paystack)}
              </Text>
              <Text style={[styles.keep, r.keep < 0 && styles.loss]}>
                You keep {naira(r.keep)}
                {r.keep < 0 ? "  (loss: raise the service fee or small-order fee)" : ""}
              </Text>
            </View>
          ))}

          <Pressable
            style={[styles.button, (!valid || !changed || working) && { opacity: 0.5 }]}
            disabled={!valid || !changed || working}
            onPress={() => {
              if (!armed) return setArmed(true);
              setArmed(false);
              onSave(draft);
            }}
          >
            <Text style={styles.buttonText}>
              {working ? "Saving..." : armed ? "Tap again: new orders use these prices" : "Save prices"}
            </Text>
          </Pressable>
          {changed ? (
            <Pressable onPress={() => setForm(toForm(pricing.settings))}>
              <Text style={styles.reset}>Undo changes</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => { setArmed(false); setForm(toForm(pricing.defaults)); }}>
            <Text style={styles.reset}>Fill in the original prices</Text>
          </Pressable>
          <Text style={styles.small}>Orders already placed keep the price they were placed at.</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...ui.card, padding: 16, marginBottom: 12 },
  title: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.ink },
  hint: { fontFamily: fonts.regular, color: colors.muted, marginTop: 6, lineHeight: 19, fontSize: 13 },
  group: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, marginTop: 16, marginBottom: 2 },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  label: { fontFamily: fonts.semibold, color: colors.ink2 },
  small: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12, marginTop: 2, lineHeight: 17 },
  input: {
    width: 100,
    borderWidth: 1,
    borderColor: "rgba(23,33,27,0.12)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    textAlign: "right",
    color: colors.ink,
    fontFamily: fonts.semibold,
    backgroundColor: "#fbfaf6",
  },
  example: { backgroundColor: colors.bg, borderRadius: 14, padding: 12, marginTop: 8 },
  exTitle: { fontFamily: fonts.bold, color: colors.ink },
  exLine: { fontFamily: fonts.regular, color: colors.ink2, marginTop: 3, fontSize: 13, lineHeight: 18 },
  keep: { fontFamily: fonts.bold, color: colors.green, marginTop: 5 },
  loss: { color: colors.danger },
  button: { ...ui.primaryButton, height: 48, borderRadius: 24, marginTop: 14 },
  buttonText: ui.primaryButtonText,
  reset: { fontFamily: fonts.bold, color: colors.green, textAlign: "center", marginTop: 12 },
});
