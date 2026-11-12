export const errorHandling = (err, req, res, next) => {
  if (err.message === "Insufficient stock") {
    return res.status(400).json({ message: err.message });
  }

  if (err.message === "Product does not exist") {
    return res.status(404).json({ message: err.message });
  }

  if (err.message === "Profile not found") {
    return res.status(404).json({ message: err.message });
  }

  res.status(500).json({
    message: "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
