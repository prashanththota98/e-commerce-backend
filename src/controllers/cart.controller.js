import { z } from "zod";
import {
  addToCart,
  setCartQuantity,
  getCartItems,
  deleteCartItem,
  MAX_QTY_PER_ITEM,
} from "../services/cart.service.js";

const id = z.coerce.number().int().positive();
const qty = z.coerce.number().int().min(1).max(MAX_QTY_PER_ITEM);

const addSchema = z.object({ productId: id, quantity: qty });
const qtySchema = z.object({ quantity: qty });
const paramSchema = z.object({ productId: id });

export const addToCartController = async (req, res, next) => {
  try {
    const { productId, quantity } = addSchema.parse(req.body);
    const cartItem = await addToCart(req.user.id, productId, quantity);
    res.status(200).json({ success: true, data: cartItem });
  } catch (error) {
    next(error);
  }
};

export const updateCartItemController = async (req, res, next) => {
  try {
    const { productId } = paramSchema.parse(req.params);
    const { quantity } = qtySchema.parse(req.body);
    const item = await setCartQuantity(req.user.id, productId, quantity);
    if (!item) return res.status(404).json({ message: "Cart item not found" });
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const getCartItemsController = async (req, res, next) => {
  try {
    const items = await getCartItems(req.user.id);
    const cart = items.map((i) => ({
      cartId: i.cart_id,
      productId: i.product_id,
      name: i.name,
      price: i.price,
      thumbnailUrl: i.thumbnail_url,
      quantity: i.quantity,
      inStock: i.stock_quantity >= i.quantity,
      subtotal: i.subtotal,
    }));
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

export const deleteCartItemController = async (req, res, next) => {
  try {
    const { productId } = paramSchema.parse(req.params);
    const deleted = await deleteCartItem(req.user.id, productId);
    if (!deleted)
      return res.status(404).json({ message: "Cart item not found" });
    res.status(200).json({ success: true, message: "Cart item removed" });
  } catch (error) {
    next(error);
  }
};
