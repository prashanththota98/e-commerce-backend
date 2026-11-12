import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { payOrder } from "../controllers/payment.controller.js";

const router = express.Router();
router.post("/", authMiddleware, payOrder);

export default router;
