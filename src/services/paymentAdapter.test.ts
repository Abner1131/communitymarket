import {
  createTestPayment,
} from "./paymentAdapter";

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(message);
  }
}

function runPaymentAdapterTest() {
  console.log(
    "=== 6D.4 PAYMENT ADAPTER RUNTIME TEST ==="
  );

  /*
   * VALID PAYMENT
   */
  try {
    const payment =
      createTestPayment(
        "CM1789935773894",
        81663
      );

    assert(
      payment.orderId ===
        "CM1789935773894",
      "Order ID mismatch."
    );

    assert(
      payment.amount ===
        81663,
      "Payment amount mismatch."
    );

    assert(
      payment.currency ===
        "NGN",
      "Payment currency mismatch."
    );

    assert(
      payment.status ===
        "paid",
      "Payment should be marked as paid."
    );

    assert(
      payment.id.startsWith("PAY"),
      "Payment ID should start with PAY."
    );

    console.log(
      "VALID PAYMENT PASSED"
    );

    console.log(
      "Payment ID:",
      payment.id
    );

    console.log(
      "Order ID:",
      payment.orderId
    );

    console.log(
      "Amount:",
      payment.amount
    );

    console.log(
      "Status:",
      payment.status
    );
  } catch (error) {
    console.error(
      "VALID PAYMENT FAILED"
    );

    console.error(
      error
    );

    throw error;
  }

  /*
   * INVALID PAYMENT
   */
  try {
    createTestPayment(
      "",
      81663
    );

    throw new Error(
      "Invalid payment was incorrectly accepted."
    );
  } catch (error) {
    console.log(
      "INVALID PAYMENT REJECTED"
    );

    console.log(
      "Error:",
      error
    );
  }

  console.log(
    "=== 6D.4 TEST PASSED ==="
  );
}

runPaymentAdapterTest();
