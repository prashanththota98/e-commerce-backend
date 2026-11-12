import pool from "../config/db.js";
import crypto from "crypto";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const saveRefreshToken = async (token, userId, expiresAt, db = pool) => {
  await db.query(
    `INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)`,
    [hashToken(token), userId, expiresAt],
  );
};

export const consumeRefreshToken = async (token, db = pool) => {
  const { rows } = await db.query(
    `DELETE FROM refresh_tokens
     WHERE token = $1 AND expires_at > NOW()
     RETURNING user_id`,
    [hashToken(token)],
  );
  return rows[0] || null;
};

export const deleteRefreshToken = async (token, db = pool) => {
  await db.query(`DELETE FROM refresh_tokens WHERE token = $1`, [
    hashToken(token),
  ]);
};

export const deleteAllRefreshTokensForUser = async (userId, db = pool) => {
  await db.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
};

export const deleteExpiredRefreshTokens = async (db = pool) => {
  await db.query(`DELETE FROM refresh_tokens WHERE expires_at <= NOW()`);
};
