import AsyncStorage from "@react-native-async-storage/async-storage";

const CUSTOMER_ID_STORAGE_KEY = "@communitymarket/customer-id";

export async function getOrCreateCustomerId(): Promise<string> {
  const existingCustomerId = await AsyncStorage.getItem(
    CUSTOMER_ID_STORAGE_KEY
  );

  if (existingCustomerId && existingCustomerId.trim().length > 0) {
    return existingCustomerId;
  }

  const customerId = `CM-CUST-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  await AsyncStorage.setItem(
    CUSTOMER_ID_STORAGE_KEY,
    customerId
  );

  return customerId;
}