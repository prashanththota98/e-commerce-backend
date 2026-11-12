import multer from "multer";
import { AppError } from "../utils/AppError.js";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  //   fileFilter: (req, file, cb) =>
  //     ALLOWED.has(file.mimetype)
  //       ? cb(null, true)
  //       : cb(new AppError("Only JPEG, PNG or WebP images allowed", 400)),
  fileFilter: (req, file, cb) => {
    console.log("fileFilter:", file.originalname, file.mimetype);
    ALLOWED.has(file.mimetype)
      ? cb(null, true)
      : cb(new AppError("Only JPEG, PNG or WebP images allowed", 400));
  },
}).array("images", 5);
