import jwt from "jsonwebtoken";
import crypto from "crypto";

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const signAccessToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "15m",
  });

export const signRefreshToken = (user) =>
  jwt.sign(
    { sub: user.id, jti: crypto.randomUUID() },
    process.env.REFRESH_TOKEN_SECRET,
    { algorithm: "HS256", expiresIn: Math.floor(REFRESH_TOKEN_TTL_MS / 1000) },
  );

export const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, {
    algorithms: ["HS256"],
  });

export const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/refresh", 
  maxAge: REFRESH_TOKEN_TTL_MS,
};


export const clearCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/refresh",
};
