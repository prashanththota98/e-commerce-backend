
import { AppError } from "../utils/AppError.js";
import {
  uploadImage,
  deleteImage,
  deleteImages,
} from "../services/cloudinaryService.js";
import { getProductById } from "../services/product.service.js";
import {
  addProductImages,
  countProductImages,
  deleteProductImageById,
  MAX_IMAGES_PER_PRODUCT,
} from "../services/productImage.service.js";

export const uploadProductImages = async (req, res, next) => {
  let uploaded = []; 
  try {
    const product = await getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.user_id !== Number(req.user.id)) {
      return res
        .status(403)
        .json({ message: "Forbidden: You do not own this product" });
    }

    const files = req.files ?? [];
    if (!files.length) {
      return res.status(400).json({ message: "No images provided" });
    }

    const existing = await countProductImages(product.id);
    if (existing + files.length > MAX_IMAGES_PER_PRODUCT) {
      return res.status(400).json({
        message: `Max ${MAX_IMAGES_PER_PRODUCT} images per product`,
      });
    }

    console.log("1. files received:", req.files?.length);

    const results = await Promise.allSettled(
      files.map((f) => uploadImage(f.buffer, product.id)),
    );

    console.log(
      "2. cloudinary results:",
      results.map((r) => r.status),
    );
    uploaded = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);

    if (uploaded.length !== files.length) {
      throw new AppError("Image upload failed", 502);
    }

    const images = await addProductImages({
      productId: product.id,
      images: uploaded,
    });

    res.status(201).json({ success: true, data: images });
  } catch (error) {
    
    if (uploaded.length) {
      await deleteImages(uploaded.map((u) => u.publicId));
    }
    next(error);
  }
};

export const deleteProductImage = async (req, res, next) => {
  try {
    const { id, imageId } = req.params;

    const product = await getProductById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.user_id !== Number(req.user.id)) {
      return res
        .status(403)
        .json({ message: "Forbidden: You do not own this product" });
    }

    const publicId = await deleteProductImageById(product.id, imageId);
    if (!publicId) {
      return res.status(404).json({ message: "Image not found" });
    }

    
    deleteImage(publicId).catch((e) =>
      console.error("Cloudinary destroy failed:", publicId, e),
    );

    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
