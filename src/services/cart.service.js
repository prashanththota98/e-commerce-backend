import pool from "../config/db.js";
import { AppError } from "../utils/AppError.js";

export const MAX_QTY_PER_ITEM = 20;

export const addToCart = async (userId, productId, quantity) => {
  const {
    rows: [row],
  } = await pool.query(
    `SELECT p.stock_quantity, COALESCE(c.quantity, 0) AS in_cart
       FROM products p
       LEFT JOIN cart c ON c.product_id = p.id AND c.user_id = $2
      WHERE p.id = $1 AND p.is_active = true`,
    [productId, userId],
  );
  if (!row) throw new AppError("Product not found", 404);

  const total = row.in_cart + quantity;
  if (total > MAX_QTY_PER_ITEM) {
    throw new AppError(`Max ${MAX_QTY_PER_ITEM} per item`, 400);
  }
  if (total > row.stock_quantity) {
    throw new AppError("Insufficient stock", 409);
  }

  const { rows } = await pool.query(
    `INSERT INTO cart (user_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, product_id)
     DO UPDATE SET quantity = cart.quantity + EXCLUDED.quantity
     RETURNING *`,
    [userId, productId, quantity],
  );
  return rows[0];
};

export const setCartQuantity = async (userId, productId, quantity) => {
  const {
    rows: [p],
  } = await pool.query(
    "SELECT stock_quantity FROM products WHERE id = $1 AND is_active = true",
    [productId],
  );
  if (!p) throw new AppError("Product not found", 404);
  if (quantity > p.stock_quantity)
    throw new AppError("Insufficient stock", 409);

  const { rows } = await pool.query(
    `UPDATE cart SET quantity = $1
      WHERE user_id = $2 AND product_id = $3
      RETURNING *`,
    [quantity, userId, productId],
  );
  return rows[0] ?? null;
};

export const getCartItems = async (userId) => {
  const { rows } = await pool.query(
    `SELECT c.id AS cart_id, c.quantity,
            p.id AS product_id, p.name, p.price, p.stock_quantity,
            (p.price * c.quantity) AS subtotal,
            t.image_url AS thumbnail_url
       FROM cart c
       JOIN products p ON p.id = c.product_id AND p.is_active = true
       LEFT JOIN LATERAL (
         SELECT image_url FROM product_images
          WHERE product_id = p.id
          ORDER BY position, id LIMIT 1
       ) t ON true
      WHERE c.user_id = $1
      ORDER BY c.id`,
    [userId],
  );
  return rows;
};

export const deleteCartItem = async (userId, productId) => {
  const { rows } = await pool.query(
    "DELETE FROM cart WHERE user_id = $1 AND product_id = $2 RETURNING *",
    [userId, productId],
  );
  return rows[0] ?? null;
};
