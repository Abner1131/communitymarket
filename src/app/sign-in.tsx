import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { useState } from "react";
import { Button, Linking, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { API_URL, auth } from "../lib/firebase";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [productId, setProductId] = useState("MXlRymNXYf53BCCerGBS");
  const [lastOrderId, setLastOrderId] = useState("");
  const [status, setStatus] = useState("Not signed in");

  const run = async (label: string, fn: () => Promise<string>) => {
    try {
      setStatus(`${label}...`);
      setStatus(await fn());
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  };

  const callServer = async (path: string, body: object) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Sign in first");
    const token = await user.getIdToken();
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  };

  const signUp = () =>
    run("Creating account", async () => {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      return `Account created. uid: ${cred.user.uid}`;
    });

  const signIn = () =>
    run("Signing in", async () => {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      return `Signed in. uid: ${cred.user.uid}`;
    });

  const logOut = () =>
    run("Signing out", async () => {
      await signOut(auth);
      return "Signed out";
    });

  // Empty cart on purpose: a valid login gets "No items in checkout".
  const testServer = () =>
    run("Testing server", async () => {
      const r = await callServer("/api/checkout", { items: [] });
      return `Server replied ${r.status}: ${JSON.stringify(r.data)}`;
    });

  // Real order for 1 unit. The app sends NO price.
  const testOrder = () =>
    run("Placing test order", async () => {
      const r = await callServer("/api/checkout", {
        items: [{ productId: productId.trim(), quantity: 1 }],
        deliveryAddress: { latitude: 10.31, longitude: 9.84 },
        vehiclePreference: "bike",
      });
      if (r.ok) setLastOrderId(r.data.orderId);
      return `Server replied ${r.status}: ${JSON.stringify(r.data)}`;
    });

  // Asks the server for a Paystack payment link for the last order, then opens it.
  const payOrder = () =>
    run("Starting payment", async () => {
      if (!lastOrderId) return "Place a test order first";
      const r = await callServer("/api/pay", { orderId: lastOrderId });
      if (!r.ok) return `Server replied ${r.status}: ${JSON.stringify(r.data)}`;
      await Linking.openURL(r.data.authorizationUrl);
      return `Payment page opened for order ${lastOrderId}`;
    });

  return (
    <ScrollView contentContainerStyle={styles.box}>
      <Text style={styles.title}>Sign in (test screen)</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password (6+ characters)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Create account" onPress={signUp} />
      <View style={styles.gap} />
      <Button title="Sign in" onPress={signIn} />
      <View style={styles.gap} />
      <Button title="Test server connection" onPress={testServer} />
      <View style={styles.gap} />
      <TextInput
        style={styles.input}
        placeholder="Product ID from Firestore"
        autoCapitalize="none"
        value={productId}
        onChangeText={setProductId}
      />
      <Button title="Test real order" onPress={testOrder} />
      <View style={styles.gap} />
      <Button title="Pay for last order" onPress={payOrder} />
      <View style={styles.gap} />
      <Button title="Sign out" onPress={logOut} />
      <Text style={styles.status}>{status}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  box: { padding: 24, paddingTop: 80 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 10, marginBottom: 12 },
  gap: { height: 10 },
  status: { marginTop: 20, fontSize: 14 },
});