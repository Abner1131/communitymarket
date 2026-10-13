// CommunityMarket look: "Soft Glass, Bauchi Gold".
// One place for colours, fonts, corners and shadows, so every screen matches.

import type { TextStyle, ViewStyle } from "react-native";

export const colors = {
  green: "#0b4a2f",
  greenPressed: "#083a25",
  greenSoft: "#e3ede6",
  greenGlow: "#dfe9df",
  gold: "#f2b33d",
  goldDeep: "#b8770f",
  goldSoft: "#fbefd4",
  goldText: "#8a5a00",
  ink: "#17211b",
  ink2: "#3d453f",
  muted: "#5f665f",
  faint: "#8a8f8a",
  line: "#efe9dd",
  hairline: "rgba(23,33,27,0.08)",
  bg: "#f6f3ec",
  card: "#ffffff",
  chip: "#f1ede4",
  cream: "#fbf7ee",
  danger: "#b00020",
  dangerSoft: "#fbe9eb",
  onGreenMuted: "#cfe0d5",
};

// Font names as loaded in app/_layout.tsx. On Android a custom font must be
// chosen by name (not by fontWeight), so each weight has its own name.
export const fonts = {
  display: "Bricolage-ExtraBold",
  displayBold: "Bricolage-Bold",
  regular: "Figtree-Regular",
  medium: "Figtree-Medium",
  semibold: "Figtree-SemiBold",
  bold: "Figtree-Bold",
};

export const FONT_FILES = {
  [fonts.display]: require("../../assets/fonts/BricolageGrotesque_800ExtraBold.ttf"),
  [fonts.displayBold]: require("../../assets/fonts/BricolageGrotesque_700Bold.ttf"),
  [fonts.regular]: require("../../assets/fonts/Figtree_400Regular.ttf"),
  [fonts.medium]: require("../../assets/fonts/Figtree_500Medium.ttf"),
  [fonts.semibold]: require("../../assets/fonts/Figtree_600SemiBold.ttf"),
  [fonts.bold]: require("../../assets/fonts/Figtree_700Bold.ttf"),
};

export const radius = { sm: 12, md: 16, lg: 20, xl: 24, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

// Soft, layered shadows (drawn by the phone's graphics engine).
export const shadow: Record<"card" | "raised" | "button" | "float", ViewStyle> = {
  card: { boxShadow: "0px 1px 2px rgba(16,24,20,0.05), 0px 8px 24px rgba(16,24,20,0.06)" },
  raised: { boxShadow: "0px 1px 2px rgba(16,24,20,0.05), 0px 10px 28px rgba(16,24,20,0.08)" },
  button: { boxShadow: "0px 10px 24px rgba(11,74,47,0.28)" },
  float: { boxShadow: "0px 12px 32px rgba(16,24,20,0.16)" },
};

export const text: Record<
  "hero" | "title" | "section" | "body" | "bodyStrong" | "small" | "smallStrong" | "label" | "price" | "priceLarge",
  TextStyle
> = {
  hero: { fontFamily: fonts.display, fontSize: 30, lineHeight: 33, letterSpacing: -0.8, color: colors.ink },
  title: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.4, color: colors.ink },
  section: { fontFamily: fonts.displayBold, fontSize: 20, letterSpacing: -0.3, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  smallStrong: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", color: colors.muted },
  price: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  priceLarge: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
};

// Shared building blocks.
export const ui = {
  screen: { flex: 1, backgroundColor: colors.bg } as ViewStyle,
  // Soft green "morning light" at the top of a screen (put it first, absolute).
  glow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 340,
    experimental_backgroundImage: `linear-gradient(180deg, ${colors.greenGlow} 0%, rgba(246,243,236,0) 100%)`,
  } as ViewStyle,
  card: { backgroundColor: colors.card, borderRadius: radius.lg, ...shadow.card } as ViewStyle,
  primaryButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    ...shadow.button,
  } as ViewStyle,
  primaryButtonText: { fontFamily: fonts.bold, fontSize: 16, color: "#ffffff" } as TextStyle,
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink2, marginTop: 12, marginBottom: 7 } as TextStyle,
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(23,33,27,0.10)",
    backgroundColor: "#fbfaf6",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
  } as TextStyle,
  // The box around a password field (the text inside is styled by PasswordInput).
  inputBox: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(23,33,27,0.10)",
    backgroundColor: "#fbfaf6",
    paddingLeft: 14,
  } as ViewStyle,
  secondaryButton: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  } as ViewStyle,
  secondaryButtonText: { fontFamily: fonts.bold, fontSize: 15, color: colors.green } as TextStyle,
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
};

// Soft photo-frame colours for products without a photo, by category.
const TILE_TINTS: Record<string, { bg: string; icon: string }> = {
  Groceries: { bg: "#f2e9d3", icon: "#9a7b3c" },
  Food: { bg: "#f2e9d3", icon: "#9a7b3c" },
  Agriculture: { bg: "#e6eedc", icon: "#56703a" },
  Phones: { bg: "#e3ece4", icon: "#3f6b52" },
  Electronics: { bg: "#e3ece4", icon: "#3f6b52" },
  Fashion: { bg: "#efe4dc", icon: "#8a5a45" },
  Beauty: { bg: "#f1e3e3", icon: "#8f4f5a" },
  Health: { bg: "#f1e3e3", icon: "#8f4f5a" },
  Household: { bg: "#e6e8ee", icon: "#4f5a70" },
};

export function categoryTint(category: string) {
  return TILE_TINTS[category] || { bg: "#eee9df", icon: "#6f6a5e" };
}
