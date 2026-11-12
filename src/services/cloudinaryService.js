import cloudinary from "../config/cloudinary.js";

export const uploadImage = (buffer, productId) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: `products/${productId}`, resource_type: "image" },
        (err, result) => {
          if (err) return reject(err);
          resolve({
            imageUrl: result.secure_url,
            publicId: result.public_id,
          });
        },
      )
      .end(buffer);
  });

export const deleteImage = (publicId) => cloudinary.uploader.destroy(publicId);


export const deleteImages = (publicIds) =>
  Promise.allSettled(publicIds.map(deleteImage));
