import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { ZodError } from "zod";

import pool from "./config/db.js";
import { apiLimiter } from "./middlewares/rateLimiters.js";

import userRoutes from "./routes/user.js";
import productRoutes from "./routes/products.js";
import refreshRoutes from "./routes/refresh.js";
import addressRoutes from "./routes/address.js";
import cartRoutes from "./routes/cart.js";
import orderRoutes from "./routes/order.js";
import paymentRoutes from "./routes/payment.js";

const app = express();
const isProd = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

app.use(helmet());

const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(morgan(isProd ? "combined" : "dev"));

app.use(apiLimiter);

app.use("/api/payment/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser());

app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/refresh", refreshRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  let status = err.status || err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      errors: err.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
  }

  if (err.code === "23505") {
    status = 409;
    message = "Resource already exists";
  } else if (err.code === "23503") {
    status = 400;
    message = "Referenced resource does not exist";
  } else if (err.code === "23514" || err.code === "23502") {
    status = 400;
    message = "Invalid data";
  }

  if (status >= 500) {
    console.error(err);
    if (isProd) message = "Internal Server Error";
  }

  res.status(status).json({
    message,
    ...(!isProd && status >= 500 && { stack: err.stack }),
  });
});

export default app;
