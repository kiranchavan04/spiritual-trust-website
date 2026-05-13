import { Router, type IRouter } from "express";
import crypto from "crypto";
import {
  CreatePaymentOrderBody,
  CreatePaymentOrderResponse,
  VerifyPaymentBody,
  VerifyPaymentResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/payment/create-order", async (req, res): Promise<void> => {
  const parsed = CreatePaymentOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    req.log.warn("Razorpay keys not configured — returning mock order");
    const mockOrder = {
      id: `order_mock_${Date.now()}`,
      amount: Math.round(parsed.data.amount * 100),
      currency: parsed.data.currency || "INR",
    };
    res.json(CreatePaymentOrderResponse.parse(mockOrder));
    return;
  }

  try {
    const Razorpay = (await import("razorpay")).default;
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const options = {
      amount: Math.round(parsed.data.amount * 100),
      currency: parsed.data.currency || "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(CreatePaymentOrderResponse.parse({
      id: order.id,
      amount: parsed.data.amount,
      currency: order.currency,
    }));
  } catch (err) {
    req.log.error({ err }, "Failed to create Razorpay order");
    res.status(500).json({ error: "Payment service error" });
  }
});

router.post("/payment/verify", async (req, res): Promise<void> => {
  const parsed = VerifyPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    logger.warn("RAZORPAY_KEY_SECRET not set — skipping signature verification");
    res.json(VerifyPaymentResponse.parse({ verified: true }));
    return;
  }

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto.createHmac("sha256", keySecret).update(body).digest("hex");
  const verified = expectedSignature === razorpaySignature;

  if (!verified) {
    req.log.warn({ razorpayOrderId, razorpayPaymentId }, "Payment signature mismatch");
    res.status(400).json(VerifyPaymentResponse.parse({ verified: false }));
    return;
  }

  res.json(VerifyPaymentResponse.parse({ verified: true }));
});

export default router;
