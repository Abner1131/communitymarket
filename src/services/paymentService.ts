import type {
  Payment,
  PaymentStatus,
} from "../types/community";

export type CreatePaymentInput = {
  orderId: string;
  amount: number;
  currency: "NGN";
};

function assertValidAmount(
  amount: number
): void {
  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Payment amount must be greater than zero."
    );
  }
}

function assertValidOrderId(
  orderId: string
): void {
  if (
    typeof orderId !== "string" ||
    orderId.trim().length === 0
  ) {
    throw new Error(
      "Order ID is required."
    );
  }
}

export function validateCreatePaymentInput(
  input: CreatePaymentInput
): void {
  if (!input) {
    throw new Error(
      "Payment input is required."
    );
  }

  assertValidOrderId(
    input.orderId
  );

  assertValidAmount(
    input.amount
  );

  if (
    input.currency !== "NGN"
  ) {
    throw new Error(
      "Only NGN payments are currently supported."
    );
  }
}

export function createPayment(
  input: CreatePaymentInput
): Payment {
  validateCreatePaymentInput(
    input
  );

  const now =
    new Date().toISOString();

  const paymentId =
    `PAY${Date.now()}`;

  return {
    id: paymentId,
    orderId:
      input.orderId,
    amount:
      input.amount,
    currency:
      "NGN",
    status:
      "pending",
    createdAt:
      now,
    updatedAt:
      now,
  };
}

export function updatePaymentStatus(
  payment: Payment,
  status: PaymentStatus
): Payment {
  if (!payment) {
    throw new Error(
      "Payment is required."
    );
  }

  const now =
    new Date().toISOString();

  return {
    ...payment,
    status,
    updatedAt:
      now,
  };
}

export function isPaymentSuccessful(
  payment: Payment
): boolean {
  return (
    payment.status ===
    "paid"
  );
}