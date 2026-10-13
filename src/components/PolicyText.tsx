// Shows a policy written in the simple text format of src/data/policies.ts:
// "### " heading, "1. " numbered item, "- " bullet, "| a | b |" table rows
// (shown as cards so they fit a phone screen), **bold**, plain paragraphs.

import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "../theme";

type Block =
  | { kind: "heading"; text: string }
  | { kind: "para"; text: string }
  | { kind: "numbered"; num: string; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "table"; header: string[]; rows: string[][] };

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

export function parsePolicy(body: string): Block[] {
  const blocks: Block[] = [];
  const lines = body.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const [head, ...rest] = tableLines;
      const rows = rest.filter((l) => !/^\|\s*-/.test(l)).map(cells);
      blocks.push({ kind: "table", header: cells(head), rows });
      continue;
    }
    if (line.startsWith("### ")) blocks.push({ kind: "heading", text: line.slice(4) });
    else if (/^\d+\.\s/.test(line)) {
      const m = line.match(/^(\d+)\.\s+(.*)$/)!;
      blocks.push({ kind: "numbered", num: m[1], text: m[2] });
    } else if (line.startsWith("- ")) blocks.push({ kind: "bullet", text: line.slice(2) });
    else blocks.push({ kind: "para", text: line });
    i++;
  }
  return blocks;
}

// "**bold**" -> bold pieces inside one Text.
function Inline({ text, style }: { text: string; style?: any }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text style={style}>
      {parts.map((p, n) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <Text key={n} style={styles.bold}>
            {p.slice(2, -2)}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

export function PolicyText({ body }: { body: string }) {
  const blocks = parsePolicy(body);
  return (
    <View>
      {blocks.map((b, n) => {
        switch (b.kind) {
          case "heading":
            return (
              <Text key={n} style={styles.heading}>
                {b.text}
              </Text>
            );
          case "numbered":
            return (
              <View key={n} style={styles.itemRow}>
                <Text style={styles.marker}>{b.num}.</Text>
                <Inline text={b.text} style={styles.itemText} />
              </View>
            );
          case "bullet":
            return (
              <View key={n} style={styles.itemRow}>
                <Text style={styles.marker}>{"•"}</Text>
                <Inline text={b.text} style={styles.itemText} />
              </View>
            );
          case "table":
            return (
              <View key={n} style={{ marginTop: 4 }}>
                {b.rows.map((row, r) => (
                  <View key={r} style={styles.rowCard}>
                    <Inline text={row[0] ?? ""} style={styles.rowTitle} />
                    {b.header.slice(1).map((h, c) => (
                      <View key={c} style={{ marginTop: 6 }}>
                        <Text style={styles.rowLabel}>{h}</Text>
                        <Inline text={row[c + 1] ?? ""} style={styles.rowValue} />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            );
          default:
            return <Inline key={n} text={b.text} style={styles.para} />;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.ink, marginTop: 22, marginBottom: 8 },
  para: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 22, color: colors.ink2, marginBottom: 10 },
  bold: { fontFamily: fonts.bold, color: colors.ink },
  itemRow: { flexDirection: "row", marginBottom: 8, paddingRight: 4 },
  marker: { width: 22, fontSize: 14.5, lineHeight: 22, color: colors.green, fontFamily: fonts.bold },
  itemText: { flex: 1, fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 22, color: colors.ink2 },
  rowCard: { backgroundColor: colors.bg, borderRadius: 14, padding: 14, marginBottom: 8 },
  rowTitle: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.ink },
  rowLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4 },
  rowValue: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink2, marginTop: 1 },
});
