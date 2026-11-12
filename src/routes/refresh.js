import express from "express";
import {
  logout,
  refreshAccessToken,
} from "../controllers/refresh.controller.js";
import { refreshLimiter } from "../middlewares/rateLimiters.js";

const router = express.Router();

router.post("/", refreshLimiter, refreshAccessToken);
router.post("/logout", logout);

export default router;
