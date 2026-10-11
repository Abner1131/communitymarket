import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { MAX_OPTIONS, OPTION_PRESETS } from "../lib/variants";

// Seller's editor for sizes / colours on one product.
// The seller picks a ready-made list (shoe sizes, clothes sizes, colours ...),
// ticks the values they have, then types the stock for each combination.
// Blank stock = "I don't sell that combination"; 0 = "sold out for now".

export type DraftOption = {
  name: string; // "Size", "Colour" ...
  choices: string[]; // values offered as chips (preset + added)
  values: string[]; // the ticked ones, in choice order
};

export type DraftOptions = {
  options: DraftOption[];
  stocks: Record<string, string>; // "42|Black" -> "3"
  prices: Record<string, string>; // "42|Black" -> "23000" (blank = main price)
  perPrice: boolean; // some sizes cost more
};

export const EMPTY_OPTIONS: DraftOptions = { options: [], stocks: {}, prices: {}, perPrice: false };

const MAX_COMBOS = 60;
const comboKey = (values: string[]) => values.join("|");

// Every combination of the ticked values, e.g. 40 Black, 40 White, 41 Black ...
export function combinations(options: DraftOption[]): string[][] {
  const used = options.filter((o) => o.values.length);
  if (!used.length) return [];
  return used.reduce<string[][]>((acc, o) => acc.flatMap((prefix) => o.values.map((v) => [...prefix, v])), [[]]);
}

// What to send to the server: options + variants, or an error message.
export function optionsPayload(
  d: DraftOptions,
): { options: { name: string; values: string[] }[]; variants: { values: string[]; stock: number; price: number | null }[] } | string {
  const used = d.options.filter((o) => o.values.length);
  if (!used.length) return { options: [], variants: [] };
  const variants: { values: string[]; stock: number; price: number | null }[] = [];
  for (const combo of combinations(used)) {
    const key = comboKey(combo);
    const raw = (d.stocks[key] || "").trim();
    if (raw === "") continue; // not sold in this combination
    const stock = parseInt(raw, 10);
    if (!Number.isInteger(stock) || stock < 0) return `Enter a whole number of stock for ${combo.join(" / ")}.`;
    const rawPrice = d.perPrice ? (d.prices[key] || "").trim() : "";
    const price = rawPrice ? parseInt(rawPrice, 10) : null;
    if (rawPrice && (!Number.isInteger(price) || (price as number) < 50)) return `Enter a valid price for ${combo.join(" / ")}.`;
    variants.push({ values: combo, stock, price });
  }
  if (!variants.length) return "Enter the stock for at least one size / option.";
  return { options: used.map((o) => ({ name: o.name, values: o.values })), variants };
}

// From a saved product (server format) to the editor.
export function draftOptionsFrom(
  options: { name: string; values: string[] }[] | undefined,
  variants: { values: string[]; stock: number; price: number | null }[] | undefined,
): DraftOptions {
  if (!options || !options.length) return EMPTY_OPTIONS;
  const stocks: Record<string, string> = {};
  const prices: Record<string, string> = {};
  for (const v of variants || []) {
    stocks[comboKey(v.values)] = String(v.stock);
    if (v.price !== null && v.price !== undefined) prices[comboKey(v.values)] = String(v.price);
  }
  return {
    options: options.map((o) => {
      const preset = OPTION_PRESETS.find((p) => p.name === o.name && o.values.some((v) => p.values.includes(v)));
      const choices = preset ? [...preset.values, ...o.values.filter((v) => !preset.values.includes(v))] : [...o.values];
      return { name: o.name, choices, values: [...o.values] };
    }),
    stocks,
    prices,
    perPrice: Object.keys(prices).length > 0,
  };
}

// From the AI's suggestion: sizes start unticked (only the seller knows what they have);
// colours the AI saw in the photos start ticked.
export function draftOptionsFromAi(suggested: { name: string; values: string[] }[]): DraftOptions {
  return {
    ...EMPTY_OPTIONS,
    options: suggested.slice(0, MAX_OPTIONS).map((o) => ({
      name: o.name,
      choices: [...o.values],
      values: /colou?r/i.test(o.name) ? [...o.values] : [],
    })),
  };
}

export function ProductOptionsEditor({
  value,
  onChange,
  mainPrice,
}: {
  value: DraftOptions;
  onChange: (next: DraftOptions) => void;
  mainPrice: string;
}) {
  const [choosingType, setChoosingType] = useState(false);
  const [newValue, setNewValue] = useState<Record<number, string>>({});
  const { options } = value;
  const combos = combinations(options);
  const total = combos.reduce((n, c) => n + (parseInt(value.stocks[comboKey(c)] || "", 10) || 0), 0);

  function setOption(i: number, o: DraftOption) {
    onChange({ ...value, options: options.map((x, k) => (k === i ? o : x)) });
  }

  function toggle(i: number, v: string) {
    const o = options[i];
    const on = o.values.includes(v);
    const values = on ? o.values.filter((x) => x !== v) : o.choices.filter((c) => c === v || o.values.includes(c));
    setOption(i, { ...o, values });
  }

  function addValue(i: number) {
    const v = (newValue[i] || "").replace(/\s+/g, " ").trim().slice(0, 24);
    if (!v) return;
    const o = options[i];
    if (o.choices.some((c) => c.toLowerCase() === v.toLowerCase())) {
      if (!o.values.includes(v)) toggle(i, o.choices.find((c) => c.toLowerCase() === v.toLowerCase()) as string);
    } else {
      setOption(i, { ...o, choices: [...o.choices, v], values: [...o.values, v] });
    }
    setNewValue({ ...newValue, [i]: "" });
  }

  function addPreset(key: string) {
    setChoosingType(false);
    if (key === "custom") {
      onChange({ ...value, options: [...options, { name: "Option", choices: [], values: [] }] });
      return;
    }
    const p = OPTION_PRESETS.find((x) => x.key === key);
    if (!p) return;
    onChange({ ...value, options: [...options, { name: p.name, choices: [...p.values], values: [] }] });
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Sizes / colours</Text>
      <Text style={styles.hint}>
        For shoes, clothes, fabric, phones … Customers pick one before adding to cart. Each has its own stock.
      </Text>

      {options.map((o, i) => (
        <View key={i} style={styles.option}>
          <View style={styles.rowBetween}>
            <TextInput
              style={styles.nameInput}
              value={o.name}
              onChangeText={(name) => setOption(i, { ...o, name: name.slice(0, 24) })}
              placeholder="Option name"
            />
            <Pressable onPress={() => onChange({ ...value, options: options.filter((_, k) => k !== i) })} hitSlop={8}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>Tick the ones you have:</Text>
          <View style={styles.chips}>
            {o.choices.map((c) => {
              const on = o.values.includes(c);
              return (
                <Pressable key={c} style={[styles.chip, on && styles.chipOn]} onPress={() => toggle(i, c)}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{c}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={newValue[i] || ""}
              onChangeText={(t) => setNewValue({ ...newValue, [i]: t })}
              placeholder={`Add another ${o.name.toLowerCase()}`}
              onSubmitEditing={() => addValue(i)}
            />
            <Pressable style={styles.smallButton} onPress={() => addValue(i)}>
              <Text style={styles.smallButtonText}>Add</Text>
            </Pressable>
          </View>
        </View>
      ))}

      {options.length < MAX_OPTIONS ? (
        choosingType ? (
          <View style={styles.chips}>
            {OPTION_PRESETS.filter((p) => !options.some((o) => o.name === p.name)).map((p) => (
              <Pressable key={p.key} style={styles.typeButton} onPress={() => addPreset(p.key)}>
                <Text style={styles.typeText}>{p.label}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.typeButton} onPress={() => addPreset("custom")}>
              <Text style={styles.typeText}>Other…</Text>
            </Pressable>
            <Pressable style={[styles.typeButton, { borderColor: "#ccc" }]} onPress={() => setChoosingType(false)}>
              <Text style={[styles.typeText, { color: "#777" }]}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.addOption} onPress={() => setChoosingType(true)}>
            <Text style={styles.addOptionText}>{options.length ? "+ Add colour / another option" : "+ Add sizes / colours"}</Text>
          </Pressable>
        )
      ) : null}

      {combos.length ? (
        <>
          <View style={[styles.rowBetween, { marginTop: 14 }]}>
            <Text style={styles.subTitle}>Stock for each</Text>
            <View style={styles.rowCenter}>
              <Text style={styles.hint}>Some cost more</Text>
              <Switch value={value.perPrice} onValueChange={(perPrice) => onChange({ ...value, perPrice })} />
            </View>
          </View>
          <Text style={styles.hint}>Leave empty if you don't sell that one. 0 = sold out for now.</Text>
          {combos.length > MAX_COMBOS ? (
            <Text style={styles.warn}>Too many combinations ({combos.length}). Untick some (max {MAX_COMBOS}).</Text>
          ) : (
            combos.map((combo) => {
              const key = comboKey(combo);
              return (
                <View key={key} style={styles.comboRow}>
                  <Text style={styles.comboLabel}>{combo.join(" · ")}</Text>
                  <TextInput
                    style={[styles.input, styles.comboInput]}
                    value={value.stocks[key] || ""}
                    onChangeText={(t) => onChange({ ...value, stocks: { ...value.stocks, [key]: t.replace(/[^0-9]/g, "") } })}
                    keyboardType="number-pad"
                    placeholder="stock"
                  />
                  {value.perPrice ? (
                    <TextInput
                      style={[styles.input, styles.priceInput]}
                      value={value.prices[key] || ""}
                      onChangeText={(t) => onChange({ ...value, prices: { ...value.prices, [key]: t.replace(/[^0-9]/g, "") } })}
                      keyboardType="number-pad"
                      placeholder={mainPrice ? `₦${mainPrice}` : "₦ price"}
                    />
                  ) : null}
                </View>
              );
            })
          )}
          <Text style={styles.total}>Total in stock: {total}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 14, borderWidth: 1, borderColor: "#e3e6ea", borderRadius: 12, padding: 12, backgroundColor: "#fafbfc" },
  title: { fontWeight: "800", fontSize: 15 },
  subTitle: { fontWeight: "800", fontSize: 13 },
  hint: { color: "#777", fontSize: 12, marginTop: 4 },
  warn: { color: "#b26a00", fontWeight: "700", marginTop: 8 },
  option: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#eee" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 6 },
  nameInput: { fontWeight: "800", fontSize: 14, flex: 1, paddingVertical: 4 },
  remove: { color: "#b00020", fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: "#ccc", borderRadius: 16, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: "#fff" },
  chipOn: { backgroundColor: "#1e7d32", borderColor: "#1e7d32" },
  chipText: { fontSize: 12, color: "#444", fontWeight: "700" },
  chipTextOn: { color: "#fff" },
  addRow: { flexDirection: "row", gap: 8, marginTop: 8, alignItems: "center" },
  input: { borderWidth: 1, borderColor: "#d0d4db", borderRadius: 10, padding: 10, backgroundColor: "#fff" },
  smallButton: { borderWidth: 1, borderColor: "#222", borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
  smallButtonText: { fontWeight: "700", fontSize: 13 },
  addOption: { marginTop: 12, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", borderColor: "#1e7d32", alignItems: "center" },
  addOptionText: { color: "#1e7d32", fontWeight: "800" },
  typeButton: { borderWidth: 1, borderColor: "#1e7d32", borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
  typeText: { color: "#1e7d32", fontWeight: "700", fontSize: 13 },
  comboRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  comboLabel: { flex: 1, fontWeight: "700" },
  comboInput: { width: 80, textAlign: "center" },
  priceInput: { width: 100, textAlign: "center" },
  total: { marginTop: 10, fontWeight: "800", color: "#1e7d32" },
});
