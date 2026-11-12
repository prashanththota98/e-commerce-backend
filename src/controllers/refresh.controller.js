import {
  consumeRefreshToken,
  deleteRefreshToken,
  saveRefreshToken,
} from "../services/refresh.service.js";
import { findUserById } from "../services/user.service.js";
import {
  REFRESH_TOKEN_TTL_MS,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshCookieOptions,
  clearCookieOptions,
} from "../utils/tokens.js";

const reject = (res, message = "Invalid refresh token") => {
  res.clearCookie("refreshToken", clearCookieOptions);
  return res.status(401).json({ message });
};

export const refreshAccessToken = async (req, res, next) => {
  try {
    const incoming = req.cookies?.refreshToken;
    if (!incoming) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

  
    let payload;
    try {
      payload = verifyRefreshToken(incoming);
    } catch {
      return reject(res);
    }

    const record = await consumeRefreshToken(incoming);
    if (!record || String(record.user_id) !== String(payload.sub)) {
      return reject(res);
    }      
  
    const user = await findUserById(record.user_id);
    if (!user) return reject(res);

  
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
 
    await saveRefreshToken(
      refreshToken,
      user.id,
      new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    );

    res.cookie("refreshToken", refreshToken, refreshCookieOptions);
    res.status(200).json({ accessToken });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) await deleteRefreshToken(token);
    res.clearCookie("refreshToken", clearCookieOptions);
    res.status(200).json({ message: "Logged out" });
  } catch (error) {
    next(error);
  }
};
