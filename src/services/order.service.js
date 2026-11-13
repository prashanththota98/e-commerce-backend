import pool from "../config/db.js";
import { AppError } from "../utils/AppError.js";

export const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const placeOrder = async (client, userId, addressId, lines) => {
  const {
    rows: [address],
  } = await client.query(
    "SELECT id FROM addresses WHERE id = $1 AND user_id = $2",
    [addressId, userId],
  );
  if (!address) throw new AppError("Address not found", 400);

  const sorted = [...lines].sort((a, b) => a.productId - b.productId);

  const priced = [];
  for (const { productId, quantity } of sorted) {
    const {
      rows: [product],
    } = await client.query(
      `UPDATE products
          SET stock_quantity = stock_quantity - $1
        WHERE id = $2 AND is_active = true AND stock_quantity >= $1
        RETURNING price`,
      [quantity, productId],
    );
    if (!product) {
      throw new AppError(
        `Product ${productId} is unavailable or has insufficient stock`,
        409,
      );
    }
    priced.push({ productId, quantity, price: product.price });
  }

  const totalCents = priced.reduce(
    (sum, i) => sum + Math.round(Number(i.price) * 100) * i.quantity,
    0,
  );

  const {
    rows: [order],
  } = await client.query(
    `INSERT INTO orders (user_id, address_id, total_amount, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING *`,
    [userId, addressId, totalCents / 100],
  );

  const items = [];
  for (const i of priced) {
    const {
      rows: [row],
    } = await client.query(
      `INSERT INTO order_items (order_id, product_id, quantity, price, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [order.id, i.productId, i.quantity, i.price],
    );
    items.push(row);
  }

  return { ...order, items };
};

export const createOrder = (userId, addressId) =>
  withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT product_id, quantity FROM cart
        WHERE user_id = $1
        ORDER BY product_id
        FOR UPDATE`,
      [userId],
    );
    if (!rows.length) throw new AppError("Cart is empty", 400);

    const order = await placeOrder(
      client,
      userId,
      addressId,
      rows.map((r) => ({ productId: r.product_id, quantity: r.quantity })),
    );

    await client.query("DELETE FROM cart WHERE user_id = $1", [userId]);
    return order;
  });

export const createDirectOrder = (userId, productId, quantity, addressId) =>
  withTransaction((client) =>
    placeOrder(client, userId, addressId, [{ productId, quantity }]),
  );

export const cancelOrder = (userId, orderId) =>
  withTransaction(async (client) => {
    // The status guard makes a double cancel match zero rows
    const {
      rows: [order],
    } = await client.query(
      `UPDATE orders SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1 AND user_id = $2 AND status = 'pending'
        RETURNING *`,
      [orderId, userId],
    );
    if (!order) throw new AppError("Order not found or not cancellable", 409);

    await client.query(
      `UPDATE products p
          SET stock_quantity = p.stock_quantity + oi.quantity
         FROM order_items oi
        WHERE oi.order_id = $1 AND p.id = oi.product_id`,
      [orderId],
    );
    return order;
  });
