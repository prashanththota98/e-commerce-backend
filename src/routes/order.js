import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import {
  cancelOrderController,
  createDirectOrderController,
  placeOrderFromCart,
} from "../controllers/order.controller.js";

const router = express.Router();

router.post("/cart", authMiddleware, placeOrderFromCart);
router.post("/", authMiddleware, createDirectOrderController);
router.patch("/:id/cancel", authMiddleware, cancelOrderController);

export default router;
