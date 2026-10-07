import {
  createPayment,
  isPaymentSuccessful,
  updatePaymentStatus,
} from "./paymentService";

import type { Payment } from "../types/community";

/**
 * Stage 6D
 *
 * Controlled adapter between the payment UI
 * and the new CommunityMarket Payment Service.
 *
 * Prototype behavior:
 * 1. Create a pending payment.
 * 2. Mark it as paid.
 * 3. Return the completed payment.
 *
 * No real payment provider is contacted.
 */
export function createTestPayment(
  orderId: string,
  amount: number
): Payment {
  const payment =
    createPayment({
      orderId,
      amount,
      currency: "NGN",
    });

  const completedPayment =
    updatePaymentStatus(
      payment,
      "paid"
    );

  if (
    !isPaymentSuccessful(
      completedPayment
    )
  ) {
    throw new Error(
      "Test payment could not be completed."
    );
  }

  return completedPayment;
}