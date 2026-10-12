// Policies screen: Terms, Privacy, Refunds in three tabs, plus our contact
// details. Open a tab directly with /policies?tab=privacy (terms|privacy|refunds).
// Works signed in or signed out (it is linked from the sign-up screen).

import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

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
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <Pressable onPress={goBack} hitSlop={10}>
          <Text style={styles.backText}>{"←"} Back</Text>
        </Pressable>
        <Text style={styles.title}>Policies</Text>
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
          <Pressable onPress={() => Linking.openURL(`mailto:${BUSINESS.email}`).catch(() => {})}>
            <Text style={styles.contactLink}>{BUSINESS.email}</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(`tel:${BUSINESS.phone}`).catch(() => {})}>
            <Text style={styles.contactLink}>{BUSINESS.phone}</Text>
          </Pressable>
          <Text style={styles.contactText}>{BUSINESS.address}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f6f8" },
  top: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 },
  backText: { fontWeight: "700", marginBottom: 10, color: "#111" },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 12, color: "#111" },
  tabs: { flexDirection: "row", backgroundColor: "#e9eaee", borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  tabActive: { backgroundColor: "#fff" },
  tabText: { fontWeight: "700", color: "#666" },
  tabTextActive: { color: "#111" },
  container: { padding: 20, paddingTop: 10, paddingBottom: 40 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 14 },
  policyTitle: { fontSize: 20, fontWeight: "800", color: "#111" },
  updated: { color: "#888", fontSize: 12, marginTop: 4, marginBottom: 14 },
  contactTitle: { fontSize: 16, fontWeight: "800", color: "#111", marginBottom: 6 },
  contactText: { color: "#444", lineHeight: 20, marginTop: 4 },
  contactLink: { color: "#0a7d4f", fontWeight: "700", marginTop: 6 },
});
