import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";

import { AuthProvider, useAuth } from "../context/AuthContext";
import { CartProvider } from "../context/CartContext";
import { CheckoutProvider } from "../context/CheckoutContext";
import { OrderProvider } from "../context/OrderContext";
import { RiderProvider } from "../context/RiderContext";

function AuthGate() {
  const router = useRouter();
  const pathname = usePathname();

  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const isAuthRoute = pathname === "/auth";
    const isRoleOnboardingRoute =
      pathname === "/role-onboarding";

    const isRiderRoute =
      pathname === "/delivery" ||
      pathname === "/rider-simulation" ||
      pathname === "/rider";

    const isDispatchTestRoute =
      pathname === "/multi-dispatch-test";

    /*
     * USER IS NOT AUTHENTICATED
     */
    if (!user) {
      if (!isAuthRoute) {
        router.replace("/auth" as any);
      }

      return;
    }

    /*
     * USER IS AUTHENTICATED
     */

    /*
     * CUSTOMER / ADMIN
     *
     * These users do not need seller/rider onboarding.
     */
    if (
      isAuthRoute &&
      (user.role === "customer" ||
        user.role === "admin")
    ) {
      router.replace("/");
      return;
    }

    /*
     * SELLER / RIDER
     *
     * After authentication, send them through
     * role onboarding before Home.
     */
    if (
      isAuthRoute &&
      (user.role === "seller" ||
        user.role === "rider")
    ) {
      router.replace("/role-onboarding" as any);
      return;
    }

    /*
     * ROLE ONBOARDING ACCESS
     */
    if (
      isRoleOnboardingRoute &&
      user.role !== "seller" &&
      user.role !== "rider" &&
      user.role !== "admin"
    ) {
      router.replace("/");
      return;
    }

    /*
     * RIDER / DELIVERY ACCESS
     */
    if (
      isRiderRoute &&
      user.role !== "rider" &&
      user.role !== "admin"
    ) {
      router.replace("/");
      return;
    }

    /*
     * DISPATCH TEST ACCESS
     */
    if (
      isDispatchTestRoute &&
      user.role !== "rider" &&
      user.role !== "admin"
    ) {
      router.replace("/");
      return;
    }
  }, [user, isLoading, pathname, router]);

  return null;
}

function AppNavigator() {
  return (
    <>
      <AuthGate />

      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RiderProvider>
        <CartProvider>
          <CheckoutProvider>
            <OrderProvider>
              <AppNavigator />
            </OrderProvider>
          </CheckoutProvider>
        </CartProvider>
      </RiderProvider>
    </AuthProvider>
  );
}