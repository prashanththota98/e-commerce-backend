import { z } from "zod";
import { withTransaction } from "../services/order.service.js";
import { processMockPayment } from "../services/payment.service.js";

const paySchema = z.object({
  orderId: z.coerce.number().int().positive(),
});

export const payOrder = async (req, res, next) => {
  try {
    const { orderId } = paySchema.parse(req.body);

    const order = await withTransaction((client) =>
      processMockPayment(client, orderId, req.user.id),
    );

    res.status(200).json({
      success: true,
      message: "Payment successful",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};
