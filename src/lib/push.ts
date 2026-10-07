import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

// Type-only import: erased at build time, so it never loads the library.
import type * as NotificationsModule from "expo-notifications";

import { API_URL, auth } from "./firebase";

// Push notifications: this phone registers its Expo push token with the
// server, which then sends "New order!", "New trip!", "On the way" etc.
//
// IMPORTANT: in Expo Go on Android, merely LOADING expo-notifications
// crashes the app (SDK 53+). So the library is loaded lazily, and only when
// we're running in a real (development or store) build on a real phone.
// In Expo Go, on the web, or on an emulator, everything here does nothing.

type Notifications = typeof NotificationsModule;

// Screens a notification is allowed to open.
export const PUSH_SCREENS = ["/orders", "/seller", "/rider"] as const;

export function pushSupported(): boolean {
  if (Platform.OS === "web") return false;
  if (!Device.isDevice) return false;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false; // Expo Go
  return true;
}

let notificationsLib: Notifications | null = null;

function loadNotifications(): Notifications | null {
  if (!pushSupported()) return null;
  if (!notificationsLib) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsLib = require("expo-notifications") as Notifications;
    // Show notifications even while the app is open.
    notificationsLib.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
  return notificationsLib;
}

let registeredToken: string | null = null;

async function sendToken(token: string, remove = false) {
  const user = auth.currentUser;
  if (!user) return;
  const idToken = await user.getIdToken();
  await fetch(`${API_URL}/api/push-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ token, remove }),
  });
}

// Call after sign-in. Returns the token, or null if push isn't available.
export async function registerForPush(): Promise<string | null> {
  try {
    const Notifications = loadNotifications();
    if (!Notifications) return null;

    if (Platform.OS === "android") {
      // Android 13+ only shows the permission prompt once a channel exists.
      await Notifications.setNotificationChannelAsync("default", {
        name: "Orders and deliveries",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn("PUSH: no EAS projectId in app.json (run `npx eas-cli init`).");
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await sendToken(token);
    registeredToken = token;
    return token;
  } catch (err) {
    console.warn("PUSH REGISTER FAILED:", err);
    return null;
  }
}

// Call just before sign-out, so this phone stops getting that account's alerts.
export async function unregisterPush(): Promise<void> {
  try {
    if (registeredToken) await sendToken(registeredToken, true);
  } catch (err) {
    console.warn("PUSH UNREGISTER FAILED:", err);
  } finally {
    registeredToken = null;
  }
}

// Calls onOpen(screen) when the user taps a notification (including the one
// that launched the app). Returns an unsubscribe function.
export function onNotificationTap(onOpen: (screen: string) => void): () => void {
  const Notifications = loadNotifications();
  if (!Notifications) return () => undefined;

  const handle = (response: NotificationsModule.NotificationResponse | null) => {
    const screen = response?.notification.request.content.data?.screen;
    if (typeof screen === "string" && (PUSH_SCREENS as readonly string[]).includes(screen)) {
      onOpen(screen);
    }
  };

  Notifications.getLastNotificationResponseAsync().then(handle).catch(() => undefined);
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}