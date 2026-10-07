import { useRouter } from "expo-router";
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
import {
  completeRiderOnboarding,
  completeSellerOnboarding,
  getAvailableRiderEntities,
  getAvailableSellerEntities,
  getUserRoleEntity,
} from "../services/roleOnboardingService";

export default function RoleOnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const [sellerOptions, setSellerOptions] = useState(
    [] as Awaited<ReturnType<typeof getAvailableSellerEntities>>,
  );

  const [riderOptions, setRiderOptions] = useState(
    [] as Awaited<ReturnType<typeof getAvailableRiderEntities>>,
  );

  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    const currentUser = user;

    if (
      currentUser.role === "customer" ||
      currentUser.role === "admin"
    ) {
      router.replace("/");
      return;
    }

    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const existingLink = await getUserRoleEntity(currentUser.id);

        if (existingLink) {
          router.replace("/");
          return;
        }

        if (currentUser.role === "seller") {
          const availableSellers =
            await getAvailableSellerEntities();

          if (active) {
            setSellerOptions(availableSellers);
          }
        }

        if (currentUser.role === "rider") {
          const availableRiders =
            await getAvailableRiderEntities();

          if (active) {
            setRiderOptions(availableRiders);
          }
        }
      } catch (loadError) {
        console.error(
          "ROLE ONBOARDING LOAD ERROR:",
          loadError,
        );

        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load available profiles.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [router, user]);

  async function selectSeller(sellerId: string) {
    if (!user || user.role !== "seller") {
      return;
    }

    try {
      setError("");
      setSubmittingId(sellerId);

      await completeSellerOnboarding(user, sellerId);

      router.replace("/");
    } catch (selectionError) {
      console.error(
        "SELLER ONBOARDING ERROR:",
        selectionError,
      );

      setError(
        selectionError instanceof Error
          ? selectionError.message
          : "Unable to assign this seller profile.",
      );
    } finally {
      setSubmittingId(null);
    }
  }

  async function selectRider(riderId: string) {
    if (!user || user.role !== "rider") {
      return;
    }

    try {
      setError("");
      setSubmittingId(riderId);

      await completeRiderOnboarding(user, riderId);

      router.replace("/");
    } catch (selectionError) {
      console.error(
        "RIDER ONBOARDING ERROR:",
        selectionError,
      );

      setError(
        selectionError instanceof Error
          ? selectionError.message
          : "Unable to assign this rider profile.",
      );
    } finally {
      setSubmittingId(null);
    }
  }

  if (!user || loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading available profiles...
        </Text>
      </SafeAreaView>
    );
  }

  const isSeller = user.role === "seller";
  const isRider = user.role === "rider";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>
          Complete Your Profile
        </Text>

        <Text style={styles.subtitle}>
          Select the existing CommunityMarket{" "}
          {isSeller ? "seller" : "rider"} profile that belongs
          to this account.
        </Text>

        <View style={styles.accountCard}>
          <Text style={styles.accountLabel}>
            Authenticated Account
          </Text>

          <Text style={styles.accountName}>
            {user.name}
          </Text>

          <Text style={styles.accountPhone}>
            {user.phone}
          </Text>

          <Text style={styles.accountRole}>
            Role: {user.role}
          </Text>
        </View>

        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : null}

        {isSeller && (
          <View>
            <Text style={styles.sectionTitle}>
              Available Seller Profiles
            </Text>

            {sellerOptions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>
                  No seller profiles available
                </Text>

                <Text style={styles.emptyText}>
                  Every existing seller profile is already
                  linked to another account.
                </Text>
              </View>
            ) : (
              sellerOptions.map((seller) => {
                const submitting =
                  submittingId === seller.id;

                return (
                  <Pressable
                    key={seller.id}
                    onPress={() =>
                      void selectSeller(seller.id)
                    }
                    disabled={submittingId !== null}
                    style={[
                      styles.profileCard,
                      submitting &&
                        styles.profileCardDisabled,
                    ]}
                  >
                    <View style={styles.profileInfo}>
                      <Text style={styles.profileName}>
                        {seller.name}
                      </Text>

                      <Text style={styles.profileId}>
                        Seller ID: {seller.id}
                      </Text>

                      <Text style={styles.profileStatus}>
                        {seller.isActive
                          ? "Active"
                          : "Inactive"}
                      </Text>
                    </View>

                    {submitting ? (
                      <ActivityIndicator />
                    ) : (
                      <Text style={styles.selectText}>
                        Select
                      </Text>
                    )}
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {isRider && (
          <View>
            <Text style={styles.sectionTitle}>
              Available Rider Profiles
            </Text>

            {riderOptions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>
                  No rider profiles available
                </Text>

                <Text style={styles.emptyText}>
                  Every existing rider profile is already
                  linked to another account.
                </Text>
              </View>
            ) : (
              riderOptions.map((rider) => {
                const submitting =
                  submittingId === rider.id;

                return (
                  <Pressable
                    key={rider.id}
                    onPress={() =>
                      void selectRider(rider.id)
                    }
                    disabled={submittingId !== null}
                    style={[
                      styles.profileCard,
                      submitting &&
                        styles.profileCardDisabled,
                    ]}
                  >
                    <View style={styles.profileInfo}>
                      <Text style={styles.profileName}>
                        {rider.name}
                      </Text>

                      <Text style={styles.profileId}>
                        Rider ID: {rider.id}
                      </Text>

                      <Text style={styles.profileMeta}>
                        Vehicle: {rider.vehicle}
                      </Text>

                      <Text style={styles.profileMeta}>
                        Rating: {rider.rating.toFixed(1)}
                      </Text>

                      <Text style={styles.profileStatus}>
                        {rider.isOnline
                          ? "Online"
                          : "Offline"}{" "}
                        ·{" "}
                        {rider.isAvailable
                          ? "Available"
                          : "Busy"}
                      </Text>
                    </View>

                    {submitting ? (
                      <ActivityIndicator />
                    ) : (
                      <Text style={styles.selectText}>
                        Select
                      </Text>
                    )}
                  </Pressable>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },

  container: {
    padding: 24,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#666",
    marginBottom: 20,
  },

  accountCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#f4f4f4",
    marginBottom: 24,
  },

  accountLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#666",
    marginBottom: 6,
    textTransform: "uppercase",
  },

  accountName: {
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 3,
  },

  accountPhone: {
    fontSize: 14,
    color: "#555",
    marginBottom: 3,
  },

  accountRole: {
    fontSize: 14,
    fontWeight: "700",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
  },

  profileCardDisabled: {
    opacity: 0.6,
  },

  profileInfo: {
    flex: 1,
    paddingRight: 12,
  },

  profileName: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
  },

  profileId: {
    fontSize: 13,
    color: "#555",
    marginBottom: 3,
  },

  profileMeta: {
    fontSize: 13,
    color: "#666",
    marginBottom: 2,
  },

  profileStatus: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },

  selectText: {
    fontSize: 14,
    fontWeight: "800",
  },

  emptyCard: {
    padding: 18,
    borderRadius: 14,
    backgroundColor: "#f6f6f6",
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#666",
  },

  error: {
    color: "#c62828",
    marginBottom: 16,
    lineHeight: 20,
  },
});