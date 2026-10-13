// Shared building blocks for the "Soft Glass, Bauchi Gold" look.

import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, radius, text, ui } from "../theme";
import { Icon, type IconName } from "./Icon";

/** Screen title with a round back button. */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  back = true,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  back?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      {back ? (
        <Pressable
          style={({ pressed }) => [ui.iconButton, pressed && { opacity: 0.7 }]}
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")))}
          hitSlop={6}
          accessibilityLabel="Back"
        >
          <Icon name="chevron-left" size={22} color={colors.ink} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={text.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text style={text.small} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** White card with an optional icon + title row. */
export function SectionCard({
  icon,
  title,
  children,
  style,
}: {
  icon?: IconName;
  title?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, style]}>
      {title ? (
        <View style={styles.cardTitleRow}>
          {icon ? (
            <View style={styles.cardIcon}>
              <Icon name={icon} size={18} color={colors.green} />
            </View>
          ) : null}
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const TONES = {
  error: { bg: colors.dangerSoft, fg: colors.danger, icon: "alert" as IconName },
  warning: { bg: colors.goldSoft, fg: colors.goldText, icon: "alert" as IconName },
  info: { bg: colors.greenSoft, fg: colors.green, icon: "info" as IconName },
  success: { bg: colors.greenSoft, fg: colors.green, icon: "check" as IconName },
};

/** Coloured message box (errors, warnings, good news). */
export function Notice({
  tone = "info",
  title,
  text: body,
  style,
}: {
  tone?: keyof typeof TONES;
  title?: string;
  text: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = TONES[tone];
  return (
    <View style={[styles.notice, { backgroundColor: t.bg }, style]} accessibilityRole="alert">
      <Icon name={t.icon} size={18} color={t.fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        {title ? <Text style={[styles.noticeTitle, { color: t.fg }]}>{title}</Text> : null}
        <Text style={[styles.noticeText, { color: t.fg }]}>{body}</Text>
      </View>
    </View>
  );
}

/** One label / value line in a money summary. */
export function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={strong ? styles.summaryStrongLabel : styles.summaryLabel}>{label}</Text>
      <Text style={strong ? styles.summaryStrongValue : styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  card: { ...ui.card, padding: 18, marginBottom: 14 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontFamily: fonts.displayBold, fontSize: 18, letterSpacing: -0.2, color: colors.ink },
  notice: { flexDirection: "row", gap: 10, padding: 14, borderRadius: radius.md, marginBottom: 14 },
  noticeTitle: { fontFamily: fonts.bold, fontSize: 14, marginBottom: 2 },
  noticeText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 },
  summaryLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink2 },
  summaryValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  summaryStrongLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  summaryStrongValue: { ...text.priceLarge },
});
