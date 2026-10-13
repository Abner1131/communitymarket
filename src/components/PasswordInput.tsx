import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";

import { colors, fonts } from "../theme";
import { Icon } from "./Icon";

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
        placeholderTextColor={colors.faint}
      />
      <Pressable
        onPress={() => setVisible(!visible)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
        style={styles.eye}
      >
        <Icon name="eye" size={16} color={visible ? colors.faint : colors.green} />
        <Text style={styles.eyeText}>{visible ? "Hide" : "Show"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 0, paddingRight: 6 },
  input: { flex: 1, color: colors.ink, paddingVertical: 12, fontSize: 15, fontFamily: fonts.regular },
  eye: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 8 },
  eyeText: { color: colors.green, fontFamily: fonts.bold, fontSize: 13 },
});
