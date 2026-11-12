import express from "express";
import {
  addNewProduct,
  allProducts,
  deleteProduct,
  getProductByIdController,
  updateProduct,
} from "../controllers/product.controller.js";
import {
  uploadProductImages,
  deleteProductImage,
} from "../controllers/productImage.controller.js";
import { authorizeRole } from "../middlewares/authorizeRole.js";
import { authMiddleware } from "../middlewares/auth.js";
import { uploadImages } from "../config/multer.js";

const router = express.Router();

router.post("/", authMiddleware, authorizeRole(["seller"]), addNewProduct);
router.get("/", allProducts);
router.get("/:id", getProductByIdController);
router.delete("/:id", authMiddleware, authorizeRole(["seller"]), deleteProduct);
router.patch("/:id", authMiddleware, authorizeRole(["seller"]), updateProduct);

// Product images (auth + role run BEFORE multer so unauthorized
// users can't make the server buffer uploads)
router.post(
  "/:id/images",
  authMiddleware,
  authorizeRole(["seller"]),
  uploadImages,
  uploadProductImages,
);
router.delete(
  "/:id/images/:imageId",
  authMiddleware,
  authorizeRole(["seller"]),
  deleteProductImage,
);

export default router;
