import pool from "../config/db.js";
import { AppError } from "../utils/AppError.js";

export const MAX_IMAGES_PER_PRODUCT = 8;

export const countProductImages = async (productId) => {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS count FROM product_images WHERE product_id = $1",
    [productId],
  );
  return rows[0].count;
};

export const addProductImages = async ({ productId, images }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("SELECT id FROM products WHERE id = $1 FOR UPDATE", [
      productId,
    ]);

    const {
      rows: [{ count, next }],
    } = await client.query(
      `SELECT COUNT(*)::int AS count,
              COALESCE(MAX(position) + 1, 0)::int AS next
         FROM product_images
        WHERE product_id = $1`,
      [productId],
    );

    if (count + images.length > MAX_IMAGES_PER_PRODUCT) {
      throw new AppError(
        `Max ${MAX_IMAGES_PER_PRODUCT} images per product`,
        400,
      );
    }

    const inserted = [];
    for (let i = 0; i < images.length; i++) {
      const { rows } = await client.query(
        `INSERT INTO product_images
           (product_id, image_url, public_id, position, is_thumbnail)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, image_url, position, is_thumbnail`,
        [
          productId,
          images[i].imageUrl,
          images[i].publicId,
          next + i,
          count === 0 && i === 0,
        ],
      );
      inserted.push(rows[0]);
    }

    await client.query("COMMIT");
    return inserted;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

export const deleteProductImageById = async (productId, imageId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      rows: [img],
    } = await client.query(
      `DELETE FROM product_images
        WHERE id = $1 AND product_id = $2
        RETURNING public_id, is_thumbnail`,
      [imageId, productId],
    );

    if (!img) {
      await client.query("ROLLBACK");
      return null;
    }

    if (img.is_thumbnail) {
      await client.query(
        `UPDATE product_images SET is_thumbnail = true
          WHERE id = (SELECT id FROM product_images
                       WHERE product_id = $1
                       ORDER BY position
                       LIMIT 1)`,
        [productId],
      );
    }

    await client.query("COMMIT");
    return img.public_id;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};
