// Policies screen: Terms, Privacy, Refunds in three tabs, plus our contact
// details. Open a tab directly with /policies?tab=privacy (terms|privacy|refunds).
// Works signed in or signed out (it is linked from the sign-up screen).

import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Icon } from "../components/Icon";
import { ScreenHeader } from "../components/ui";
import { colors, fonts, radius, shadow, text, ui } from "../theme";

import { PolicyText } from "../components/PolicyText";
import { BUSINESS, POLICIES, POLICIES_UPDATED, PolicyKey, policyByKey } from "../data/policies";

export default function PoliciesScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [active, setActive] = useState<PolicyKey>(policyByKey(params.tab).key);
  const scroll = useRef<ScrollView>(null);
  const policy = policyByKey(active);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  return (
    <View style={ui.screen}>
      <View style={ui.glow} pointerEvents="none" />
      <ScreenHeader title="Policies" onBack={goBack} />
      <View style={styles.top}>
        <View style={styles.tabs}>
          {POLICIES.map((p) => (
            <Pressable
              key={p.key}
              style={[styles.tab, active === p.key && styles.tabActive]}
              onPress={() => {
                setActive(p.key);
                scroll.current?.scrollTo({ y: 0, animated: false });
              }}
            >
              <Text style={[styles.tabText, active === p.key && styles.tabTextActive]}>{p.tab}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView ref={scroll} contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.policyTitle}>{policy.title}</Text>
          <Text style={styles.updated}>Last updated {POLICIES_UPDATED}</Text>
          <PolicyText body={policy.body} />
        </View>

        <View style={styles.card}>
          <Text style={styles.contactTitle}>Contact us</Text>
          <Text style={styles.contactText}>
            {BUSINESS.legalName}, trading as {BUSINESS.tradingName}
          </Text>
          <Pressable style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${BUSINESS.email}`).catch(() => {})}>
            <Icon name="mail" size={17} color={colors.green} />
            <Text style={styles.contactLink}>{BUSINESS.email}</Text>
          </Pressable>
          <Pressable style={styles.contactRow} onPress={() => Linking.openURL(`tel:${BUSINESS.phone}`).catch(() => {})}>
            <Icon name="phone" size={17} color={colors.green} />
            <Text style={styles.contactLink}>{BUSINESS.phone}</Text>
          </Pressable>
          <View style={styles.contactRow}>
            <Icon name="map-pin" size={17} color={colors.green} />
            <Text style={[styles.contactText, { marginTop: 0, flex: 1 }]}>{BUSINESS.address}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingBottom: 6 },
  tabs: { flexDirection: "row", backgroundColor: "rgba(23,33,27,0.06)", borderRadius: radius.pill, padding: 4 },
  tab: { flex: 1, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: colors.card, ...shadow.card },
  tabText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.muted },
  tabTextActive: { fontFamily: fonts.bold, color: colors.ink },
  container: { padding: 20, paddingTop: 10, paddingBottom: 40 },
  card: { ...ui.card, padding: 20, marginBottom: 14 },
  policyTitle: { ...text.title, fontSize: 21 },
  updated: { ...text.small, fontSize: 12, marginTop: 4, marginBottom: 14 },
  contactTitle: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.ink, marginBottom: 6 },
  contactText: { fontFamily: fonts.regular, color: colors.ink2, lineHeight: 20, marginTop: 4 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  contactLink: { fontFamily: fonts.bold, color: colors.green },
});
