import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Payment } from "../types/community";

const PAYMENT_STORAGE_KEY =
  "@communitymarket/payments";

/**
 * Get all saved payments.
 */
export async function getPayments(): Promise<Payment[]> {
  const saved =
    await AsyncStorage.getItem(
      PAYMENT_STORAGE_KEY
    );

  if (!saved) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(saved);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    return [];
  } catch (error) {
    console.error(
      "CommunityMarket payment loading error:",
      error
    );

    return [];
  }
}

/**
 * Save a payment.
 *
 * If the payment already exists, replace it.
 * Otherwise, add it to the collection.
 */
export async function savePayment(
  payment: Payment
): Promise<Payment> {
  if (!payment) {
    throw new Error(
      "Payment is required."
    );
  }

  const payments =
    await getPayments();

  const existingIndex =
    payments.findIndex(
      (existingPayment) =>
        existingPayment.id ===
        payment.id
    );

  const updatedPayments =
    [...payments];

  if (existingIndex >= 0) {
    updatedPayments[
      existingIndex
    ] = payment;
  } else {
    updatedPayments.push(
      payment
    );
  }

  await AsyncStorage.setItem(
    PAYMENT_STORAGE_KEY,
    JSON.stringify(
      updatedPayments
    )
  );

  return payment;
}

/**
 * Find a payment by payment ID.
 */
export async function getPaymentById(
  paymentId: string
): Promise<Payment | undefined> {
  const payments =
    await getPayments();

  return payments.find(
    (payment) =>
      payment.id === paymentId
  );
}

/**
 * Find a payment by order ID.
 */
export async function getPaymentByOrderId(
  orderId: string
): Promise<Payment | undefined> {
  const payments =
    await getPayments();

  return payments.find(
    (payment) =>
      payment.orderId === orderId
  );
}
