import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { getSellerById } from "../data/sellers";
import {
  getProductByIdWithOverride,
  setProductActive,
  updateProduct,
} from "../services/productStorage";

const ROLE_LINKS_STORAGE_KEY =
  "@communitymarket/role-links";

type StoredRoleLink = {
  userId?: string;
  role?: string;
  entityId?: string;
};

function findSellerId(
  storedValue: unknown,
  userId: string
): string | null {
  if (!storedValue) {
    return null;
  }

  if (Array.isArray(storedValue)) {
    const link = storedValue.find(
      (item: StoredRoleLink) =>
        item?.userId === userId &&
        item?.role === "seller" &&
        typeof item?.entityId === "string"
    );

    return link?.entityId ?? null;
  }

  if (
    typeof storedValue === "object" &&
    storedValue !== null
  ) {
    const value = storedValue as Record<
      string,
      unknown
    >;

    if (
      value.userId === userId &&
      value.role === "seller" &&
      typeof value.entityId === "string"
    ) {
      return value.entityId;
    }

    const directLink = value[userId];

    if (
      typeof directLink === "object" &&
      directLink !== null
    ) {
      const link =
        directLink as StoredRoleLink;

      if (
        link.role === "seller" &&
        typeof link.entityId === "string"
      ) {
        return link.entityId;
      }
    }

    if (Array.isArray(value.links)) {
      const link = value.links.find(
        (item: StoredRoleLink) =>
          item?.userId === userId &&
          item?.role === "seller" &&
          typeof item?.entityId === "string"
      );

      return link?.entityId ?? null;
    }
  }

  return null;
}

export default function SellerProductEditScreen() {
  const { user } = useAuth();

  const params = useLocalSearchParams<{
    productId?: string;
  }>();

  const productId =
    typeof params.productId === "string"
      ? params.productId
      : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [sellerId, setSellerId] = useState<
    string | null
  >(null);

  const [product, setProduct] = useState<
    Awaited<
      ReturnType<typeof getProductByIdWithOverride>
    >
  >(undefined);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] =
    useState("");
  const [isActive, setIsActive] =
    useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user || user.role !== "seller") {
        if (active) {
          setLoading(false);
        }
        return;
      }

      if (!productId) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      try {
        const storedValue =
          await AsyncStorage.getItem(
            ROLE_LINKS_STORAGE_KEY
          );

        const parsedValue = storedValue
          ? JSON.parse(storedValue)
          : null;

        const linkedSellerId = findSellerId(
          parsedValue,
          user.id
        );

        if (active) {
          setSellerId(linkedSellerId);
        }

        if (!linkedSellerId) {
          return;
        }

        const loadedProduct =
          await getProductByIdWithOverride(
            productId
          );

        if (!loadedProduct) {
          return;
        }

        if (
          loadedProduct.sellerId !==
          linkedSellerId
        ) {
          console.error(
            "SELLER PRODUCT ACCESS DENIED:",
            {
              productSellerId:
                loadedProduct.sellerId,
              linkedSellerId,
            }
          );

          return;
        }

        if (active) {
          setProduct(loadedProduct);
          setName(loadedProduct.name);
          setCategory(loadedProduct.category);
          setPrice(
            String(loadedProduct.price)
          );
          setStock(
            String(loadedProduct.stock)
          );
          setDescription(
            loadedProduct.description
          );
          setIsActive(
            loadedProduct.isActive
          );
        }
      } catch (error) {
        console.error(
          "SELLER PRODUCT LOAD ERROR:",
          error
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [user, productId]);

  async function handleSave() {
    if (!product || !sellerId) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const trimmedDescription =
      description.trim();

    const numericPrice = Number(
      price.replace(/,/g, "")
    );

    const numericStock = Number(
      stock.replace(/,/g, "")
    );

    if (!trimmedName) {
      Alert.alert(
        "Invalid product name",
        "Enter a product name."
      );
      return;
    }

    if (!trimmedCategory) {
      Alert.alert(
        "Invalid category",
        "Enter a category."
      );
      return;
    }

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      Alert.alert(
        "Invalid price",
        "Enter a valid price."
      );
      return;
    }

    if (
      !Number.isInteger(numericStock) ||
      numericStock < 0
    ) {
      Alert.alert(
        "Invalid stock",
        "Stock must be a whole number."
      );
      return;
    }

    if (!trimmedDescription) {
      Alert.alert(
        "Invalid description",
        "Enter a product description."
      );
      return;
    }

    try {
      setSaving(true);

      const updatedProduct = await updateProduct(
        product.id,
        {
          name: trimmedName,
          category: trimmedCategory,
          price: numericPrice,
          stock: numericStock,
          description: trimmedDescription,
          isActive,
        }
      );

      console.log(
        "SELLER PRODUCT UPDATED:",
        updatedProduct
      );

      Alert.alert(
        "Product Updated",
        "Your product changes have been saved.",
        [
          {
            text: "OK",
            onPress: () =>
              router.replace(
                "/seller-products"
              ),
          },
        ]
      );
    } catch (error) {
      console.error(
        "SELLER PRODUCT SAVE ERROR:",
        error
      );

      Alert.alert(
        "Save failed",
        "The product could not be updated."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!product) {
      return;
    }

    const nextStatus = !isActive;

    try {
      setSaving(true);

      const updatedProduct =
        await setProductActive(
          product.id,
          nextStatus
        );

      setProduct(updatedProduct);
      setIsActive(
        updatedProduct.isActive
      );

      console.log(
        "SELLER PRODUCT STATUS UPDATED:",
        updatedProduct.isActive
      );
    } catch (error) {
      console.error(
        "SELLER PRODUCT STATUS ERROR:",
        error
      );

      Alert.alert(
        "Update failed",
        "The product status could not be changed."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!user || user.role !== "seller") {
    return null;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.loadingText}>
          Loading product...
        </Text>
      </SafeAreaView>
    );
  }

  if (!sellerId) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorTitle}>
          Seller profile not linked
        </Text>

        <Text style={styles.errorText}>
          Your seller account is not linked to a
          seller profile.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            router.replace("/")
          }
        >
          <Text style={styles.primaryButtonText}>
            Back to Home
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorTitle}>
          Product not found
        </Text>

        <Text style={styles.errorText}>
          This product could not be loaded or does
          not belong to your seller account.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            router.replace(
              "/seller-products"
            )
          }
        >
          <Text style={styles.primaryButtonText}>
            Back to My Products
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const seller = getSellerById(sellerId);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Pressable
          style={styles.backButton}
          onPress={() =>
            router.replace(
              "/seller-products"
            )
          }
        >
          <Text style={styles.backButtonText}>
            ← My Products
          </Text>
        </Pressable>

        <View style={styles.headerCard}>
          <Text style={styles.title}>
            Edit Product
          </Text>

          <Text style={styles.productId}>
            Product ID: {product.id}
          </Text>

          {seller && (
            <Text style={styles.sellerName}>
              {seller.name}
            </Text>
          )}
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>
            Product Name
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Product name"
            editable={!saving}
          />

          <Text style={styles.label}>
            Category
          </Text>

          <TextInput
            value={category}
            onChangeText={setCategory}
            style={styles.input}
            placeholder="Category"
            editable={!saving}
          />

          <Text style={styles.label}>
            Price
          </Text>

          <TextInput
            value={price}
            onChangeText={setPrice}
            style={styles.input}
            placeholder="8500"
            keyboardType="numeric"
            editable={!saving}
          />

          <Text style={styles.label}>
            Stock
          </Text>

          <TextInput
            value={stock}
            onChangeText={setStock}
            style={styles.input}
            placeholder="35"
            keyboardType="numeric"
            editable={!saving}
          />

          <Text style={styles.label}>
            Description
          </Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[
              styles.input,
              styles.multilineInput,
            ]}
            placeholder="Product description"
            multiline
            textAlignVertical="top"
            editable={!saving}
          />

          <View style={styles.activeRow}>
            <View style={styles.activeInfo}>
              <Text style={styles.activeTitle}>
                Product Status
              </Text>

              <Text style={styles.activeSubtitle}>
                {isActive
                  ? "Customers can see and purchase this product."
                  : "Customers should not be able to purchase this product."}
              </Text>
            </View>

            <Switch
              value={isActive}
              onValueChange={setIsActive}
              disabled={saving}
            />
          </View>

          <Pressable
            style={[
              styles.saveButton,
              saving &&
                styles.disabledButton,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving
                ? "Saving..."
                : "Save Changes"}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.statusButton,
              saving &&
                styles.disabledOutlineButton,
            ]}
            onPress={handleToggleActive}
            disabled={saving}
          >
            <Text style={styles.statusButtonText}>
              {isActive
                ? "Deactivate Product"
                : "Activate Product"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.bottomBackButton}
          onPress={() =>
            router.replace(
              "/seller-products"
            )
          }
        >
          <Text style={styles.bottomBackText}>
            Back to My Products
          </Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f5f6f8",
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f5f6f8",
  },

  content: {
    padding: 20,
  },

  backButton: {
    marginBottom: 14,
  },

  backButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },

  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
  },

  productId: {
    marginTop: 8,
    color: "#777",
    fontSize: 13,
  },

  sellerName: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "700",
  },

  formCard: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },

  label: {
    marginBottom: 7,
    marginTop: 14,
    fontSize: 14,
    fontWeight: "700",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },

  multilineInput: {
    minHeight: 110,
  },

  activeRow: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  activeInfo: {
    flex: 1,
    paddingRight: 12,
  },

  activeTitle: {
    fontSize: 15,
    fontWeight: "800",
  },

  activeSubtitle: {
    marginTop: 5,
    color: "#666",
    lineHeight: 19,
  },

  saveButton: {
    marginTop: 22,
    backgroundColor: "#222",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },

  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },

  statusButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  statusButtonText: {
    fontSize: 15,
    fontWeight: "800",
  },

  disabledButton: {
    opacity: 0.6,
  },

  disabledOutlineButton: {
    opacity: 0.5,
  },

  bottomBackButton: {
    marginTop: 12,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  bottomBackText: {
    fontWeight: "700",
  },

  primaryButton: {
    marginTop: 20,
    backgroundColor: "#222",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 10,
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },

  loadingText: {
    color: "#555",
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
  },

  errorText: {
    marginTop: 8,
    color: "#666",
    textAlign: "center",
    textAlignVertical: "center",
  },
});