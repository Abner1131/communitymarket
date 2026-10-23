// Shared look for the Seller, Rider and Marketing dashboards.
// Each screen keeps its own layout styles; this only replaces colours, fonts,
// corners and shadows with the CommunityMarket look. A style a screen does
// not have is simply skipped.

import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from "react-native";

import { colors, fonts, radius, shadow } from "./index";

type Style = ViewStyle | TextStyle | ImageStyle;

// On Android a custom font is picked by name, so the weight is reset.
const f = (family: string): TextStyle => ({ fontFamily: family, fontWeight: "normal" });

const DASH: Record<string, Style> = {
  safe: { backgroundColor: colors.bg },
  backText: { ...f(fonts.semibold), color: colors.green },
  title: { ...f(fonts.display), color: colors.ink, letterSpacing: -0.8 },
  card: { borderRadius: radius.lg, ...shadow.card },
  cardTitle: { ...f(fonts.displayBold), color: colors.ink },
  sectionTitle: { ...f(fonts.displayBold), color: colors.ink2 },
  muted: { color: colors.muted },
  hint: { color: colors.faint },
  value: f(fonts.semibold),
  badge: { borderRadius: radius.pill },
  badgeText: f(fonts.bold),
  stat: { borderRadius: radius.lg, ...shadow.card },
  statNumber: { ...f(fonts.display), color: colors.green },
  statValue: { ...f(fonts.display), color: colors.green },
  statLabel: f(fonts.semibold),
  tabs: { backgroundColor: colors.chip, borderRadius: radius.pill },
  tab: { borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.green },
  tabText: { ...f(fonts.bold), color: colors.muted },
  tabTextActive: { color: "#ffffff" },
  primaryButton: { backgroundColor: colors.green, borderRadius: 26, paddingVertical: 15, ...shadow.button },
  primaryButtonText: f(fonts.bold),
  primaryText: f(fonts.bold),
  secondaryButton: { borderColor: colors.green, borderWidth: 1.5, borderRadius: 26 },
  secondaryButtonText: { ...f(fonts.bold), color: colors.green },
  secondaryText: { ...f(fonts.bold), color: colors.green },
  smallButton: { borderColor: colors.green, borderRadius: radius.pill },
  smallButtonText: { ...f(fonts.bold), color: colors.green },
  smallPrimary: { backgroundColor: colors.green, borderColor: colors.green },
  smallPrimaryText: f(fonts.bold),
  input: { borderRadius: 14, borderColor: "rgba(23,33,27,0.10)", backgroundColor: "#fbfaf6" },
  errorBox: { borderRadius: radius.md },
  noticeBox: { borderRadius: radius.md, backgroundColor: colors.greenSoft },
  noticeText: { color: colors.green },
  okBox: { borderRadius: radius.md, backgroundColor: colors.greenSoft },
  okText: { color: colors.green },
  chip: { borderRadius: radius.pill },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
};

export function dashStyles<T extends Record<string, Style>>(local: T, skip: string[] = []): T {
  const out: Record<string, Style> = { ...local };
  for (const key of Object.keys(DASH)) {
    if (skip.includes(key) || !out[key]) continue;
    out[key] = { ...out[key], ...DASH[key] } as Style;
  }
  return StyleSheet.create(out as any) as T;
}
