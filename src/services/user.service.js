import pool from "../config/db.js";

const normalizeEmail = (email) => email.trim().toLowerCase();

export const createUser = async (
  { name, email, hashedPassword },
  db = pool,
) => {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, role, created_at`,
    [name, normalizeEmail(email), hashedPassword],
  );
  return rows[0];
};

export const createSeller = async (
  { name, email, hashedPassword, role },
  db = pool,
) => {
  const query = `
  INSERT INTO users (name, email, password, role, created_at)
  VALUES ($1, $2, $3, 'seller', now())
  RETURNING id, name, email,role, created_at`;
  const { rows } = await pool.query(query, [
    name,
    normalizeEmail(email),
    hashedPassword,
  ]);
  return rows[0];
};

export const findUserByEmail = async (email, db = pool) => {
  const { rows } = await db.query(
    `SELECT id, name, email, password, role, created_at
     FROM users WHERE email = $1`,
    [normalizeEmail(email)],
  );
  return rows[0];
};

export const findUserById = async (id, db = pool) => {
  const { rows } = await db.query(
    `SELECT id, name, email, role, created_at
     FROM users WHERE id = $1`,
    [id],
  );
  return rows[0];
};

export const findAuthById = async (id, db = pool) => {
  const { rows } = await db.query(
    `SELECT id, password FROM users WHERE id = $1`,
    [id],
  );
  return rows[0];
};

const UPDATABLE_FIELDS = new Set(["name", "email"]);

export const updateUserDetails = async (id, updatedFields, db = pool) => {
  const entries = Object.entries(updatedFields).filter(([key]) =>
    UPDATABLE_FIELDS.has(key),
  );

  if (entries.length === 0) {
    throw Object.assign(new Error("No valid fields provided to update"), {
      status: 400,
    });
  }

  const setClauses = entries.map(([key], i) => `${key} = $${i + 1}`);
  const values = entries.map(([key, value]) =>
    key === "email" ? normalizeEmail(value) : value,
  );
  values.push(id);

  const { rows } = await db.query(
    `UPDATE users
     SET ${setClauses.join(", ")}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING id, name, email, role`,
    values,
  );
  return rows[0];
};

export const updatePassword = async (id, hashedPassword, db = pool) => {
  await db.query(
    `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`,
    [hashedPassword, id],
  );
};
