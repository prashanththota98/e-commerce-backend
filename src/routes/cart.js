import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import {
  addToCartController,
  deleteCartItemController,
  getCartItemsController,
  updateCartItemController,
} from "../controllers/cart.controller.js";

const router = express.Router();

router.post("/", authMiddleware, addToCartController);
router.get("/", authMiddleware, getCartItemsController);
router.patch("/:productId", authMiddleware, updateCartItemController);
router.delete("/:productId", authMiddleware, deleteCartItemController);
export default router;
