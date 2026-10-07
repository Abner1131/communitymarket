import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { riders } from "../data/riders";
import { sellers } from "../data/sellers";
import { getUserRoleEntity } from "../services/roleOnboardingService";

export default function AccountScreen() {
  const { user, signOut } = useAuth();

  const [link, setLink] = useState<
    Awaited<ReturnType<typeof getUserRoleEntity>> | null
  >(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }

    const currentUser = user;

    let active = true;

    async function loadLink() {
      try {
        const result =
          await getUserRoleEntity(currentUser.id);

        if (active) {
          setLink(result ?? null);
        }
      } catch (error) {
        console.error(
          "ACCOUNT LINK LOAD ERROR:",
          error,
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadLink();

    return () => {
      active = false;
    };
  }, [user]);

  async function handleSignOut() {
    try {
      await signOut();

      router.replace("/auth" as any);
    } catch (error) {
      console.error(
        "SIGN OUT ERROR:",
        error,
      );
    }
  }

  if (!user || loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading account...
        </Text>
      </SafeAreaView>
    );
  }

  const sellerProfile =
    user.role === "seller" && link
      ? sellers.find(
          (seller) =>
            seller.id === link.entityId,
        )
      : undefined;

  const riderProfile =
    user.role === "rider" && link
      ? riders.find(
          (rider) =>
            rider.id === link.entityId,
        )
      : undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.replace("/")}
          >
            <Text style={styles.backText}>
              â† Home
            </Text>
          </Pressable>

          <Text style={styles.title}>
            Account
          </Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name
                .trim()
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user.name}
            </Text>

            <Text style={styles.profilePhone}>
              {user.phone}
            </Text>

            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {user.role.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* CUSTOMER */}
        {user.role === "customer" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Customer Account
            </Text>

            <Text style={styles.description}>
              You can browse products, manage your
              cart, place orders, and track deliveries.
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                router.push("/orders")
              }
            >
              <Text style={styles.primaryButtonText}>
                View My Orders
              </Text>
            </Pressable>
          </View>
        )}

        {/* SELLER */}
        {user.role === "seller" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Seller Dashboard
            </Text>

            {link && sellerProfile ? (
              <>
                <Text style={styles.label}>
                  Seller Profile
                </Text>

                <Text style={styles.value}>
                  {sellerProfile.name}
                </Text>

                <Text style={styles.label}>
                  Seller ID
                </Text>

                <Text style={styles.value}>
                  {sellerProfile.id}
                </Text>

                <Text style={styles.label}>
                  Status
                </Text>

                <Text style={styles.value}>
                  {sellerProfile.isActive
                    ? "ACTIVE"
                    : "INACTIVE"}
                </Text>

                <Pressable
                  style={styles.primaryButton}
                  onPress={() =>
                    router.push("/orders")
                  }
                >
                  <Text
                    style={styles.primaryButtonText}
                  >
                    View Seller Orders
                  </Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>
                  Seller profile not linked
                </Text>

                <Text style={styles.warningText}>
                  Complete seller onboarding before
                  managing seller activity.
                </Text>

                <Pressable
                  style={styles.primaryButton}
                  onPress={() =>
                    router.push(
                      "/role-onboarding" as any,
                    )
                  }
                >
                  <Text
                    style={styles.primaryButtonText}
                  >
                    Complete Profile
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* RIDER */}
        {user.role === "rider" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Rider Dashboard
            </Text>

            <Text style={styles.description}>
              See your current trip, collect from sellers
              and confirm deliveries.
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push("/rider" as any)}
            >
              <Text style={styles.primaryButtonText}>
                Open Rider Dashboard
              </Text>
            </Pressable>
          </View>
        )}

        {/* ADMIN */}
        {user.role === "admin" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Admin Dashboard
            </Text>

            <Text style={styles.description}>
              Administrative access is enabled for
              dispatch, order monitoring, and system
              management.
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                router.push("/delivery")
              }
            >
              <Text style={styles.primaryButtonText}>
                Open Dispatch Dashboard
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push("/rider" as any)}
            >
              <Text style={styles.secondaryButtonText}>
                Open Rider Dashboard (test)
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() =>
                router.push("/orders")
              }
            >
              <Text style={styles.secondaryButtonText}>
                View All Orders
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Account Information
          </Text>

          <Text style={styles.label}>
            User ID
          </Text>

          <Text style={styles.value}>
            {user.id}
          </Text>

          <Text style={styles.label}>
            Account Status
          </Text>

          <Text style={styles.value}>
            {user.status.toUpperCase()}
          </Text>
        </View>

        <Pressable
          style={styles.signOutButton}
          onPress={() => void handleSignOut()}
        >
          <Text style={styles.signOutText}>
            Sign Out
          </Text>
        </Pressable>

        <View style={{ height: 30 }} />
      </ScrollView>

      <View style={styles.bottomNav}>
        <Pressable
          onPress={() => router.replace("/")}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navText}>Home</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/cart")}
        >
          <Text style={styles.navIcon}>ðŸ›’</Text>
          <Text style={styles.navText}>Cart</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/orders")}
        >
          <Text style={styles.navIcon}>ðŸ“¦</Text>
          <Text style={styles.navText}>Orders</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/wallet")}
        >
          <Text style={styles.navIcon}>ðŸ’°</Text>
          <Text style={styles.navText}>Wallet</Text>
        </Pressable>

        <Pressable>
          <Text style={styles.navIcon}>ðŸ‘¤</Text>
          <Text style={styles.navText}>Account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f5f6f8",
  },

  container: {
    padding: 20,
    paddingBottom: 100,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
  },

  header: {
    marginBottom: 20,
  },

  backText: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 14,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
  },

  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  avatarText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    fontSize: 19,
    fontWeight: "800",
  },

  profilePhone: {
    marginTop: 4,
    color: "#777",
  },

  roleBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: "#222",
  },

  roleBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 14,
  },

  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 21,
    marginBottom: 16,
  },

  label: {
    fontSize: 12,
    color: "#777",
    fontWeight: "700",
    marginTop: 10,
  },

  value: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 3,
  },

  primaryButton: {
    marginTop: 18,
    backgroundColor: "#222",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },

  secondaryButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  secondaryButtonText: {
    fontWeight: "700",
  },

  warningBox: {
    backgroundColor: "#f6f6f6",
    padding: 14,
    borderRadius: 12,
  },

  warningTitle: {
    fontWeight: "800",
    marginBottom: 5,
  },

  warningText: {
    color: "#666",
    lineHeight: 20,
  },

  signOutButton: {
    backgroundColor: "#c62828",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },

  signOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  navIcon: {
    textAlign: "center",
    fontSize: 20,
  },

  navText: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 3,
  },
});
