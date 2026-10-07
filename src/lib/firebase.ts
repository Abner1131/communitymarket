import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyCzsi7n2bLITZxpJXxFFkLEExN0ZPPKSwM",
  authDomain: "communitymarket-c7b68.firebaseapp.com",
  projectId: "communitymarket-c7b68",
  storageBucket: "communitymarket-c7b68.firebasestorage.app",
  messagingSenderId: "706660614309",
  appId: "1:706660614309:web:67c242e921504320fccd4c",
};

// Guard so hot reloads don't initialize twice
const firstTime = getApps().length === 0;
const app = firstTime ? initializeApp(firebaseConfig) : getApp();

let authInstance;

if (firstTime) {
  if (Platform.OS === "web") {
    // Use browser local persistence for web/SSR previews
    authInstance = initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
  } else {
    // Use AsyncStorage for mobile devices (Expo Go / Native builds)
    const { getReactNativePersistence } = require("firebase/auth");
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
} else {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);

// Your checkout/payment server
export const API_URL = "https://communitymarket-server.vercel.app";