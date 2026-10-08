import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const CODE_LENGTH = 4;

// Rider side: type the customer's 4-digit delivery code to confirm delivery.
// The rider never sees the code; the server checks it.
export default function DeliveryCodeEntry({
  customerName,
  triesLeft,
  locked,
  disabled,
  saving,
  onSubmit,
}: {
  customerName: string;
  triesLeft: number;
  locked: boolean;
  disabled: boolean;
  saving: boolean;
  // Returns an error message, or null when delivery was confirmed.
  onSubmit: (code: string) => Promise<string | null>;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  if (locked) {
    return (
      <View style={[styles.box, styles.lockedBox]}>
        <Text style={styles.lockedTitle}>🔒 Delivery locked</Text>
        <Text style={styles.lockedText}>
          Too many wrong codes. Call {customerName} to check the code in their My Orders, then ask the
          CommunityMarket admin to unlock this delivery.
        </Text>
      </View>
    );
  }

  const ready = code.length === CODE_LENGTH && !disabled && !saving;

  async function submit() {
    if (!ready) return;
    setError("");
    const message = await onSubmit(code);
    if (message) {
      setError(message);
      setCode("");
    }
  }

  return (
    <View style={styles.box}>
      <Text style={styles.label}>Ask {customerName} for their delivery code</Text>
      <TextInput
        value={code}
        onChangeText={(t) => {
          setCode(t.replace(/\D/g, "").slice(0, CODE_LENGTH));
          if (error) setError("");
        }}
        placeholder="• • • •"
        keyboardType="number-pad"
        maxLength={CODE_LENGTH}
        editable={!disabled && !saving}
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
        accessibilityLabel="Customer's delivery code"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && triesLeft < 5 ? (
        <Text style={styles.tries}>
          {triesLeft} tr{triesLeft === 1 ? "y" : "ies"} left
        </Text>
      ) : null}
      <Pressable
        style={[styles.button, !ready && styles.buttonDisabled]}
        disabled={!ready}
        onPress={() => void submit()}
      >
        <Text style={styles.buttonText}>{saving ? "Checking..." : "Confirm delivery"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f4f8ff",
    borderWidth: 1,
    borderColor: "#c5d8f2",
  },
  label: { fontSize: 13, fontWeight: "700", color: "#333", marginBottom: 8 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 10,
    paddingVertical: 10,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 10,
    textAlign: "center",
  },
  error: { color: "#b00020", fontWeight: "700", marginTop: 8, fontSize: 13 },
  tries: { color: "#b26a00", fontWeight: "700", marginTop: 8, fontSize: 12 },
  button: {
    marginTop: 10,
    backgroundColor: "#1e7d32",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#fff", fontWeight: "800" },
  lockedBox: { backgroundColor: "#fdecea", borderColor: "#f5c2c0" },
  lockedTitle: { fontWeight: "800", color: "#b00020", marginBottom: 4 },
  lockedText: { color: "#5f2120", fontSize: 13, lineHeight: 18 },
});
