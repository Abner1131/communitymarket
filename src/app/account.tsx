import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { TAB_BAR_SPACE, TabBar } from "../components/TabBar";

import { BrandLoader } from "../components/Brand";
import { Icon, type IconName } from "../components/Icon";
import { ScreenHeader } from "../components/ui";
import { colors, fonts, radius, text, ui } from "../theme";

import { Avatar } from "../components/Avatar";
import { changeProfilePhoto, removeProfilePhoto } from "../lib/profilePhoto";
import { DeleteAccountCard } from "../components/DeleteAccountCard";
import { EmailVerifyCard } from "../components/EmailVerifyCard";
import { useAuth } from "../context/AuthContext";
import { normalizePhone, PHONE_MESSAGE } from "../lib/phone";

const ROLE_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  customer: { label: "Customer", bg: colors.chip, fg: colors.ink2 },
  seller: { label: "Seller", bg: "#efe6f4", fg: "#6a1b9a" },
  rider: { label: "Rider", bg: "#e7eef8", fg: "#1f4f8a" },
  admin: { label: "Admin", bg: colors.dangerSoft, fg: colors.danger },
  marketing: { label: "Marketing", bg: colors.greenSoft, fg: colors.green },
};

export default function AccountScreen() {
  const { user, signOut, updateMyProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (!user) {
    return (
      <View style={[ui.screen, styles.centered]}>
        <BrandLoader />
      </View>
    );
  }

  function startEdit() {
    if (!user) return;
    setName(user.name);
    setPhone(user.phone);
    setMessage("");
    setEditing(true);
  }

  async function save() {
    if (!name.trim()) return setMessage("Name can't be empty.");
    if (phone.trim() ? !normalizePhone(phone) : Boolean(user?.phone)) {
      return setMessage(PHONE_MESSAGE);
    }
    setSaving(true);
    try {
      await updateMyProfile({ name, ...(phone.trim() ? { phone } : {}) });
      setEditing(false);
    } catch (e: any) {
      setMessage(e?.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function runPhoto(job: () => Promise<unknown>) {
    setPhotoBusy(true);
    setMessage("");
    try {
      await job();
    } catch (e: any) {
      Alert.alert("Profile picture", e?.message || "Could not save your photo. Please try again.");
    } finally {
      setPhotoBusy(false);
    }
  }

  function choosePhoto() {
    const buttons: { text: string; style?: "cancel" | "destructive"; onPress?: () => void }[] = [
      { text: "Take photo", onPress: () => runPhoto(() => changeProfilePhoto("camera")) },
      { text: "Choose from gallery", onPress: () => runPhoto(() => changeProfilePhoto("library")) },
    ];
    if (user?.photoURL) buttons.push({ text: "Remove photo", style: "destructive", onPress: () => runPhoto(removeProfilePhoto) });
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Profile picture", "Only you can see your picture.", buttons);
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/auth" as any);
  }

  const role = ROLE_STYLE[user.role] || ROLE_STYLE.customer;

  return (
    <View style={ui.screen}>
      <View style={ui.glow} pointerEvents="none" />
      <ScreenHeader title="Account" onBack={() => router.replace("/")} />
      <ScrollView contentContainerStyle={styles.container}>
        <EmailVerifyCard reason="Verify your email to keep your account safe, use invite codes and earn referral rewards." />

        {/* PROFILE */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Pressable onPress={choosePhoto} disabled={photoBusy} accessibilityRole="button" accessibilityLabel="Change profile picture">
              <View style={photoBusy && { opacity: 0.5 }}>
                <Avatar name={user.name} photoURL={user.photoURL} size={64} />
              </View>
              <View style={styles.cameraBadge}>
                <Icon name="camera" size={12} color={colors.green} />
              </View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.muted}>{user.email}</Text>
              <Text style={styles.muted}>{user.phone || "No phone number yet"}</Text>
            </View>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: role.bg }]}>
            <Text style={[styles.roleBadgeText, { color: role.fg }]}>{role.label}</Text>
          </View>

          {editing ? (
            <>
              <Text style={ui.label}>Full name</Text>
              <TextInput style={ui.input} value={name} onChangeText={setName} />
              <Text style={ui.label}>Phone number</Text>
              <TextInput
                style={ui.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="08012345678"
                placeholderTextColor={colors.faint}
              />
              {message ? <Text style={styles.error}>{message}</Text> : null}
              <View style={styles.buttonRow}>
                <Pressable style={[ui.secondaryButton, { flex: 1 }]} onPress={() => setEditing(false)}>
                  <Text style={ui.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [ui.primaryButton, { flex: 1, height: 50 }, pressed && { backgroundColor: colors.greenPressed }]}
                  disabled={saving}
                  onPress={save}
                >
                  <Text style={ui.primaryButtonText}>{saving ? "Saving..." : "Save"}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Pressable style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.7 }]} onPress={startEdit}>
              <Icon name="pencil" size={16} color={colors.green} />
              <Text style={styles.editText}>Edit profile</Text>
            </Pressable>
          )}
        </View>

        {/* WORK DASHBOARDS (staff, sellers, riders) */}
        {user.role === "admin" ||
        user.role === "marketing" ||
        user.role === "rider" ||
        user.role === "seller" ? (
          <>
            <Text style={styles.groupTitle}>Work</Text>
            <View style={styles.group}>
              {user.role === "admin" ? (
                <Row
                  icon="shield"
                  tint={colors.dangerSoft}
                  iconColor={colors.danger}
                  title="Admin Dashboard"
                  subtitle="Approvals, live orders, money and settings"
                  onPress={() => router.push("/admin" as any)}
                />
              ) : null}
              {user.role === "marketing" || user.role === "admin" ? (
                <Row
                  icon="megaphone"
                  title="Marketing Dashboard"
                  subtitle="Growth, applications, shops, riders and codes"
                  onPress={() => router.push("/marketing" as any)}
                />
              ) : null}
              {user.role === "rider" ? (
                <Row
                  icon="bike"
                  title="Rider Dashboard"
                  subtitle="Go online, see your trip, confirm deliveries"
                  onPress={() => router.push("/rider" as any)}
                />
              ) : null}
              {user.role === "seller" ? (
                <Row
                  icon="store"
                  title="Seller Dashboard"
                  subtitle="Prepare paid orders and manage your products"
                  onPress={() => router.push("/seller" as any)}
                />
              ) : null}
            </View>
          </>
        ) : null}

        <Text style={styles.groupTitle}>Shopping</Text>
        <View style={styles.group}>
          <Row icon="package" title="My orders" subtitle="Track your orders and deliveries" onPress={() => router.push("/orders")} />
          <Row icon="wallet" title="Wallet" subtitle="Balance, rewards and history" onPress={() => router.push("/wallet")} />
          {user.role !== "admin" ? (
            <Row
              icon="megaphone"
              title="Marketer earnings"
              subtitle="For CommunityMarket marketers: your pay and bank"
              onPress={() => router.push("/marketer" as any)}
            />
          ) : null}
          {user.role === "customer" ? (
            <Row
              icon="users"
              tint={colors.goldSoft}
              iconColor={colors.goldText}
              title="Work with CommunityMarket"
              subtitle="Apply to be a rider or a seller"
              onPress={() => router.push("/apply" as any)}
            />
          ) : null}
        </View>

        <Text style={styles.groupTitle}>About</Text>
        <View style={styles.group}>
          <Row
            icon="file"
            title="Policies"
            subtitle="Terms, Privacy, Refunds and Cancellation"
            onPress={() => router.push("/policies" as any)}
          />
        </View>

        <Pressable style={({ pressed }) => [styles.signOutButton, pressed && { opacity: 0.7 }]} onPress={handleSignOut}>
          <Icon name="logout" size={18} color={colors.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>

        <DeleteAccountCard
          onDeleted={(eraseAfterMs) => {
            const text = `You will now be signed out. Your details will be erased on ${new Date(eraseAfterMs).toDateString()}. If this was a mistake, contact CommunityMarket before then.`;
            if (Platform.OS === "web") {
              window.alert(text);
              void signOut();
            } else {
              Alert.alert("Account deleted", text, [{ text: "OK", onPress: () => void signOut() }], { cancelable: false });
            }
          }}
        />
      </ScrollView>

      <TabBar active="account" />
    </View>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onPress,
  tint = colors.greenSoft,
  iconColor = colors.green,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  tint?: string;
  iconColor?: string;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.chip }]} onPress={onPress}>
      <View style={[styles.rowIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={19} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={18} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", justifyContent: "center" },
  container: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: TAB_BAR_SPACE },
  card: { ...ui.card, padding: 18, marginBottom: 6 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.card,
  },
  profileName: { fontFamily: fonts.displayBold, fontSize: 19, color: colors.ink },
  muted: { ...text.small, marginTop: 2 },
  roleBadge: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, marginTop: 14 },
  roleBadgeText: { fontFamily: fonts.bold, fontSize: 12 },
  editButton: {
    marginTop: 14,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.greenSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  editText: { fontFamily: fonts.bold, fontSize: 14, color: colors.green },
  error: { fontFamily: fonts.semibold, color: colors.danger, marginTop: 10 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  groupTitle: { ...text.label, marginTop: 20, marginBottom: 8, marginLeft: 4 },
  group: { ...ui.card, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  rowSub: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 1 },
  signOutButton: {
    marginTop: 22,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.dangerSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
  },
  signOutText: { color: colors.danger, fontFamily: fonts.bold, fontSize: 15 },
});
