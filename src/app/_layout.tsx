import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Appearance, Platform } from "react-native";

import { UpdateGate } from "../components/UpdateGate";
import { PolicyGate } from "../components/PolicyGate";
import { BrandIntro } from "../components/Brand";
import { FONT_FILES } from "../theme";

import { AuthProvider, useAuth } from "../context/AuthContext";
import { CartProvider } from "../context/CartContext";
import { CheckoutProvider } from "../context/CheckoutContext";
import { OrderProvider } from "../context/OrderContext";
import { RiderProvider } from "../context/RiderContext";
import { onNotificationTap, registerForPush } from "../lib/push";
import { setSignInNotice, takeSignInIntent } from "../lib/signInIntent";

// The app is designed in light colours. On phones set to dark mode, Android
// would otherwise draw typed text white on our white boxes.
if (Platform.OS !== "web") {
  try {
    Appearance.setColorScheme("light");
  } catch {
    // older systems: nothing to do
  }
}

// Which screens each role may open. Anything not listed is open to every
// signed-in user. The server enforces the same rules on its side.
const ROLE_ROUTES: { prefix: string; roles: string[] }[] = [
  { prefix: "/rider", roles: ["rider", "admin"] },
  { prefix: "/seller", roles: ["seller", "admin"] },
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/marketing", roles: ["marketing", "admin"] },
];

function AuthGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, signOut } = useAuth();
  // Who was signed in when we last looked: undefined = app just opened.
  const lastUid = useRef<string | null | undefined>(undefined);

  // Go to a screen with a clean history (Back can't return to the old screens).
  function startFresh(path: string) {
    try {
      if (router.canDismiss()) router.dismissAll();
    } catch {
      // nothing to clear
    }
    router.replace(path as any);
  }

  useEffect(() => {
    if (isLoading) return;

    const onAuthScreen = pathname === "/auth";
    const uid = user ? user.id : null;
    const before = lastUid.current;
    lastUid.current = uid;

    // Not signed in: only the sign-in screen (and the policies, linked from sign-up).
    if (!user) {
      if (!onAuthScreen && pathname !== "/policies") startFresh("/auth");
      return;
    }

    // Just signed in (or still on the sign-in screen): always start at Home,
    // or at Admin when they used "Admin sign in".
    const justSignedIn = before === null || (before !== undefined && before !== uid);
    if (justSignedIn || onAuthScreen) {
      const intent = takeSignInIntent();
      const staff = user.role === "admin" || user.role === "marketing";
      if (intent === "admin" && !staff) {
        setSignInNotice("This account does not have admin or marketing access. Use the normal sign-in.");
        void signOut();
        return;
      }
      // Marketing staff land on their own dashboard.
      startFresh(intent === "admin" ? (user.role === "marketing" ? "/marketing" : "/admin") : "/");
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

// Registers this phone for push after sign-in, and opens the right screen
// when a notification is tapped.
function PushManager() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) void registerForPush();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    return onNotificationTap((screen) => router.push(screen as any));
  }, [user?.id]);

  return null;
}

function AppNavigator() {
  return (
    <>
      <AuthGate />
      {Platform.OS !== "web" && <PushManager />}

      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      <PolicyGate />
      <UpdateGate />
      <BrandIntro />
    </>
  );
}

export default function RootLayout() {
  // Brand fonts (load in a moment; until then the phone's own font shows).
  useFonts(FONT_FILES);

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