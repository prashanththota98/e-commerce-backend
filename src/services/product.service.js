import pool from "../config/db.js";

export const createProduct = async (productdata) => {
  const {
    name,
    description,
    category,
    price,
    image_url,
    stock_quantity,
    features,
    user_id,
  } = productdata;
  const query = `INSERT INTO products (name, description, category, price, image_url, stock_quantity, features, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;`;
  const values = [
    name,
    description,
    category,
    price,
    image_url,
    stock_quantity || 0,
    features || {},
    user_id,
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
};

export const getProductById = async (id) => {
  const query = `SELECT * FROM products WHERE id = $1 AND is_active = true`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

export const deleteProductById = async (id) => {
  const query = `UPDATE products SET is_active = false WHERE id = $1 RETURNING *`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

export const updateProductById = async (id, updatedData) => {
  const fields = [];
  const values = [];
  let index = 1;
  if (!Object.keys(updatedData).length) {
    throw new Error("No fields provided to update");
  }
  for (const key in updatedData) {
    fields.push(`${key} = $${index}`);
    values.push(updatedData[key]);
    index++;
  }
  const query = `
  UPDATE products SET ${fields.join(", ")} WHERE id = $${index} RETURNING *`;
  values.push(id);

  const { rows } = await pool.query(query, values);
  return rows[0];
};

export const getAllProducts = async ({
  search,
  category,
  minPrice,
  maxPrice,
  sort = "id",
  order = "asc",
  page = 1,
  limit = 10,
}) => {
  const values = [];
  let whereClause = "WHERE is_active = true";
  let counter = 1;
  if (search) {
    whereClause += ` AND name ILIKE $${counter}`;
    values.push(`%${search}%`);
    counter++;
  }
  if (category) {
    whereClause += ` AND category = $${counter}`;
    values.push(category);
    counter++;
  }
  if (minPrice) {
    whereClause += ` AND price >= $${counter}`;
    values.push(minPrice);
    counter++;
  }
  if (maxPrice) {
    whereClause += ` AND price <= $${counter}`;
    values.push(maxPrice);
    counter++;
  }

  const countQuery = `SELECT COUNT(*) FROM products ${whereClause}`;
  const { rows: countRows } = await pool.query(countQuery, values);
  const totalItems = parseInt(countRows[0].count, 10);
  const totalPages = Math.ceil(totalItems / limit);

  const offset = (page - 1) * limit;

  const allowedSortColumns = [
    "id",
    "name",
    "price",
    "category",
    "stock_quantity",
  ];
  if (!allowedSortColumns.includes(sort)) sort = "id";
  order = order?.toLowerCase() === "desc" ? "DESC" : "ASC";

  const query = `
    SELECT * FROM products
    ${whereClause}
    ORDER BY ${sort} ${order}
    LIMIT $${counter} OFFSET $${counter + 1}
  `;
  values.push(limit, offset);
  const { rows } = await pool.query(query, values);
  return { rows, totalItems, totalPages };
};

export const addProductImages = async ({ productId, images }) => {
  if (!images || images.length === 0) return [];
  const values = [];
  const placeholders = [];
  images.forEach((img, i) => {
    values.push(productId);
    values.push(img);
    placeholders.push(`($${i * 2 + 1}, $${i * 2 + 2})`);
  });
  const query = `INSERT INTO product_images (product_id, image_url) VALUES ${placeholders.join(", ")} RETURNING *`;

  const { rows } = await pool.query(query, values);
  return rows;
};
