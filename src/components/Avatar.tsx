// A round profile picture, or the first letter of the name when there is none.

import { Image, StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "../theme";

export function Avatar({
  name,
  photoURL,
  size = 56,
  tone = "dark",
}: {
  name: string;
  photoURL?: string | null;
  size?: number;
  tone?: "dark" | "light"; // dark = green circle with gold letter; light = for the header button
}) {
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (photoURL) {
    return <Image source={{ uri: photoURL }} style={[round, styles.photo]} accessibilityLabel="Profile picture" />;
  }
  const letter = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <View style={[round, styles.letter, tone === "dark" && { backgroundColor: colors.green }]}>
      <Text
        style={{
          fontFamily: tone === "dark" ? fonts.display : fonts.bold,
          fontSize: Math.round(size * (tone === "dark" ? 0.4 : 0.42)),
          color: tone === "dark" ? colors.gold : colors.green,
        }}
      >
        {letter}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { backgroundColor: colors.chip },
  letter: { alignItems: "center", justifyContent: "center" },
});
