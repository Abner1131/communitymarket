import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";

import { AuthProvider, useAuth } from "../context/AuthContext";
import { CartProvider } from "../context/CartContext";
import { CheckoutProvider } from "../context/CheckoutContext";
import { OrderProvider } from "../context/OrderContext";
import { RiderProvider } from "../context/RiderContext";

// Which screens each role may open. Anything not listed is open to every
// signed-in user. The server enforces the same rules on its side.
const ROLE_ROUTES: { prefix: string; roles: string[] }[] = [
  { prefix: "/rider", roles: ["rider", "admin"] },
  { prefix: "/seller", roles: ["seller", "admin"] },
];

function AuthGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const onAuthScreen = pathname === "/auth";

    // Not signed in: only the sign-in screen.
    if (!user) {
      if (!onAuthScreen) router.replace("/auth" as any);
      return;
    }

    // Signed in: leave the sign-in screen.
    if (onAuthScreen) {
      router.replace("/");
      return;
    }

    // Role-only screens.
    const rule = ROLE_ROUTES.find((r) => pathname.startsWith(r.prefix));
    if (rule && !rule.roles.includes(user.role)) {
      router.replace("/");
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