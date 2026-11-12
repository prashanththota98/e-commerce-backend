import rateLimit from "express-rate-limit";

const base = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
};

export const apiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: { message: "Too many requests, try again later" },
});

export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { message: "Too many requests, try again later" },
});

export const refreshLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 60,
  message: { message: "Too many refresh attempts, try again later" },
});
