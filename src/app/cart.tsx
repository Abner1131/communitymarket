import { router } from "expo-router";
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useCart } from "../context/CartContext";

export default function CartScreen() {
  const { items, cartCount, cartTotal } = useCart();

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛒 My Cart</Text>

        <Text style={styles.itemCount}>
          {cartCount} item(s)
        </Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🛒</Text>

          <Text style={styles.emptyTitle}>
            Your cart is empty
          </Text>

          <Text style={styles.emptyText}>
            Add products from the marketplace to get started.
          </Text>

          <Pressable
            style={styles.shopButton}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.shopButtonText}>
              Continue Shopping
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* CART ITEMS */}
          {items.map((item) => (
            <View key={item.product.id} style={styles.cartItem}>
              {item.product.thumbUrl ? (
                <Image
                  source={{ uri: item.product.thumbUrl }}
                  style={{ width: 56, height: 56, borderRadius: 10, marginRight: 12 }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <Text style={styles.productEmoji}>
                  {item.product.emoji}
                </Text>
              )}

              <View style={styles.productInfo}>
                <Text style={styles.productName}>
                  {item.product.name}
                </Text>

                <Text style={styles.seller}>
                  {item.product.seller}
                </Text>

                <Text style={styles.price}>
                  ₦{item.product.price.toLocaleString()}
                </Text>

                <Text style={styles.quantity}>
                  Quantity: {item.quantity}
                </Text>
              </View>

              <Text style={styles.itemTotal}>
                ₦{(
                  item.product.price * item.quantity
                ).toLocaleString()}
              </Text>
            </View>
          ))}

          {/* TOTAL */}
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>
              Cart Total
            </Text>

            <Text style={styles.total}>
              ₦{cartTotal.toLocaleString()}
            </Text>

            <Pressable
              style={styles.checkoutButton}
              onPress={() => router.push("/checkout")}
            >
              <Text style={styles.checkoutText}>
                Review & Checkout
              </Text>
            </Pressable>

            <Pressable
              style={styles.continueButton}
              onPress={() => router.replace("/")}
            >
              <Text style={styles.continueText}>
                Continue Shopping
              </Text>
            </Pressable>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6f8",
  },

  header: {
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
  },

  itemCount: {
    color: "#666",
  },

  cartItem: {
    marginHorizontal: 16,
    marginTop: 15,
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  productEmoji: {
    fontSize: 45,
    width: 65,
    textAlign: "center",
  },

  productInfo: {
    flex: 1,
    marginLeft: 10,
  },

  productName: {
    fontSize: 16,
    fontWeight: "700",
  },

  seller: {
    color: "#777",
    fontSize: 12,
    marginTop: 3,
  },

  price: {
    fontWeight: "700",
    marginTop: 5,
  },

  quantity: {
    color: "#666",
    fontSize: 12,
    marginTop: 5,
  },

  itemTotal: {
    fontWeight: "800",
    fontSize: 15,
  },

  summary: {
    margin: 16,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
  },

  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  total: {
    fontSize: 25,
    fontWeight: "800",
    marginTop: 5,
  },

  checkoutButton: {
    marginTop: 18,
    backgroundColor: "#222",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },

  checkoutText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },

  continueButton: {
    marginTop: 10,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#eee",
    alignItems: "center",
  },

  continueText: {
    fontWeight: "700",
  },

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 35,
  },

  emptyIcon: {
    fontSize: 60,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 15,
  },

  emptyText: {
    textAlign: "center",
    color: "#777",
    marginTop: 8,
    lineHeight: 20,
  },

  shopButton: {
    marginTop: 20,
    backgroundColor: "#222",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 10,
  },

  shopButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});