import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { Platform } from "react-native";

// Identifies this phone/computer in the Admin log ("Opened Admin on
// Samsung SM-A515F"). The id is random and made once per install; it is
// not secret and carries no personal data.

const KEY = "cm.installId";
let cached: string | null = null;

function randomId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 24; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `${out.slice(0, 8)}-${out.slice(8, 16)}-${out.slice(16)}`;
}

async function installId(): Promise<string> {
  if (cached) return cached;
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored) {
      cached = stored;
      return stored;
    }
    const fresh = randomId();
    await AsyncStorage.setItem(KEY, fresh);
    cached = fresh;
    return fresh;
  } catch {
    cached = cached || randomId();
    return cached;
  }
}

// "Samsung SM-A515F · Android 13". On the web the server reads the browser
// name instead, so we send nothing.
function deviceName(): string {
  if (Platform.OS === "web") return "";
  const model = [Device.manufacturer, Device.modelName].filter(Boolean).join(" ");
  const os = [Device.osName, Device.osVersion].filter(Boolean).join(" ");
  return [model, os].filter(Boolean).join(" · ").slice(0, 80);
}

export async function adminDeviceHeaders(): Promise<Record<string, string>> {
  const name = deviceName();
  return {
    "X-CM-Device": await installId(),
    ...(name ? { "X-CM-Device-Name": encodeURIComponent(name) } : {}),
  };
}
