import { z } from "zod";
import {
  createOrder,
  createDirectOrder,
  cancelOrder,
} from "../services/order.service.js";

const id = z.coerce.number().int().positive();

const cartOrderSchema = z.object({ addressId: id });
const directOrderSchema = z.object({
  productId: id,
  quantity: z.coerce.number().int().min(1).max(20),
  addressId: id,
});
const orderParamSchema = z.object({ id });

export const placeOrderFromCart = async (req, res, next) => {
  try {
    const { addressId } = cartOrderSchema.parse(req.body);
    const order = await createOrder(req.user.id, addressId);
    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const createDirectOrderController = async (req, res, next) => {
  try {
    const { productId, quantity, addressId } = directOrderSchema.parse(
      req.body,
    );
    const order = await createDirectOrder(
      req.user.id,
      productId,
      quantity,
      addressId,
    );
    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelOrderController = async (req, res, next) => {
  try {
    const { id: orderId } = orderParamSchema.parse(req.params);
    const order = await cancelOrder(req.user.id, orderId);
    res.status(200).json({
      success: true,
      message: "Order cancelled",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};
