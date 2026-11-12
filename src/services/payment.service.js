import crypto from "node:crypto";
import { AppError } from "../utils/AppError.js";

export const generateTransactionId = () => `TXN-${crypto.randomUUID()}`;

export const processMockPayment = async (
  client,
  orderId,
  userId,
  paymentMethod = "mock",
) => {
  const {
    rows: [order],
  } = await client.query(
    `SELECT id FROM orders
      WHERE id = $1 AND user_id = $2 AND status = 'pending'
      FOR UPDATE`,
    [orderId, userId],
  );
  if (!order) throw new AppError("Order not found or not payable", 409);

  const isSuccess = process.env.MOCK_PAYMENT_RESULT
    ? process.env.MOCK_PAYMENT_RESULT === "success"
    : Math.random() > 0.1;

  if (!isSuccess) {
    throw new AppError("Payment declined, please try again", 402);
  }

  const {
    rows: [paid],
  } = await client.query(
    `UPDATE orders
        SET status = 'paid', transaction_id = $1, payment_method = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *`,
    [generateTransactionId(), paymentMethod, orderId],
  );
  return paid;
};
