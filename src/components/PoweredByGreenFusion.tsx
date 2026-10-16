import { StyleSheet, Text, View } from "react-native";

export default function PoweredByGreenFusion() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Powered by GreenFusion Tech Ltd.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 16,
    paddingBottom: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.8,
  },
});