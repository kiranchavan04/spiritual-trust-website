import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import {
  ListOrdersResponse,
  CreateOrderBody,
  GetOrderParams,
  GetOrderResponse,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  UpdateOrderStatusResponse,
  TrackOrderParams,
  TrackOrderResponse,
} from "@workspace/api-zod";
import { sendOrderConfirmationEmail } from "../lib/mailer";
import { sendWhatsAppNotification } from "../lib/whatsapp";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function generateOrderNumber(): string {
  const now = new Date();
  const datePart = now.getFullYear().toString().slice(2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const randPart = Math.floor(Math.random() * 9000 + 1000).toString();
  return `ACDT-${datePart}-${randPart}`;
}

function mapOrder(o: typeof ordersTable.$inferSelect) {
  return {
    ...o,
    totalAmount: Number(o.totalAmount),
    items: o.items as Array<{ productId: number; productName: string; quantity: number; price: number }>,
    createdAt: o.createdAt.toISOString(),
  };
}

router.get("/orders", async (req, res): Promise<void> => {
  const orders = await db.select().from(ordersTable).orderBy(ordersTable.createdAt);
  res.json(ListOrdersResponse.parse(orders.map(mapOrder)));
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const orderNumber = generateOrderNumber();
  const [order] = await db.insert(ordersTable).values({
    orderNumber,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone,
    customerEmail: parsed.data.customerEmail,
    deliveryAddress: parsed.data.deliveryAddress,
    pincode: parsed.data.pincode,
    city: parsed.data.city,
    state: parsed.data.state,
    items: parsed.data.items,
    totalAmount: String(parsed.data.totalAmount),
    paymentMethod: parsed.data.paymentMethod,
    paymentStatus: parsed.data.paymentMethod === "razorpay" ? "paid" : "pending",
    orderStatus: "pending",
    razorpayOrderId: parsed.data.razorpayOrderId ?? null,
    razorpayPaymentId: parsed.data.razorpayPaymentId ?? null,
  }).returning();

  const mappedOrder = mapOrder(order);

  try {
    await sendOrderConfirmationEmail(mappedOrder);
  } catch (err) {
    req.log.warn({ err }, "Failed to send confirmation email");
  }

  try {
    await sendWhatsAppNotification(mappedOrder);
  } catch (err) {
    req.log.warn({ err }, "Failed to send WhatsApp notification");
  }

  res.status(201).json(GetOrderResponse.parse(mappedOrder));
});

router.get("/orders/track/:orderNumber", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.orderNumber) ? req.params.orderNumber[0] : req.params.orderNumber;
  const params = TrackOrderParams.safeParse({ orderNumber: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.orderNumber, params.data.orderNumber));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(TrackOrderResponse.parse(mapOrder(order)));
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetOrderParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(GetOrderResponse.parse(mapOrder(order)));
});

router.patch("/orders/:id/status", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateOrderStatusParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const validStatuses = ["pending", "dispatched", "delivered"];
  if (!validStatuses.includes(parsed.data.orderStatus)) {
    res.status(400).json({ error: "Invalid status. Must be: pending, dispatched, or delivered" });
    return;
  }
  const [order] = await db.update(ordersTable)
    .set({ orderStatus: parsed.data.orderStatus })
    .where(eq(ordersTable.id, params.data.id))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  logger.info({ orderId: order.id, newStatus: order.orderStatus }, "Order status updated");
  res.json(UpdateOrderStatusResponse.parse(mapOrder(order)));
});

export default router;
