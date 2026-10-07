import { StyleSheet, Text, View } from "react-native";

export default function PoweredByGreenFusion() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Powered by GreenFusion Tech</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.65,
  },
});