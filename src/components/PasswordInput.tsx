import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";

// Password box with a Show / Hide button, readable in light and dark phone themes.
export function PasswordInput({
  style,
  ...props
}: Omit<TextInputProps, "secureTextEntry" | "style"> & { style?: StyleProp<ViewStyle> }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={[style, styles.row]}>
      <TextInput
        {...props}
        style={styles.input}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor="#8a8f98"
      />
      <Pressable
        onPress={() => setVisible(!visible)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
        style={styles.eye}
      >
        <Text style={styles.eyeText}>{visible ? "🙈 Hide" : "👁 Show"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 0, paddingRight: 6 },
  input: { flex: 1, color: "#111", paddingVertical: 12, fontSize: 15 },
  eye: { paddingHorizontal: 8, paddingVertical: 8 },
  eyeText: { color: "#1565c0", fontWeight: "700", fontSize: 13 },
});
