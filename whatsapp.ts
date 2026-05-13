import https from "https";
import { logger } from "./logger";

interface OrderData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  city: string;
  state: string;
  pincode: string;
  items: Array<{ productId: number; productName: string; quantity: number; price: number }>;
  totalAmount: number;
  paymentMethod: string;
}

export async function sendWhatsAppNotification(order: OrderData): Promise<void> {
  const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER;
  const waApiKey = process.env.WHATSAPP_API_KEY;
  const waApiUrl = process.env.WHATSAPP_API_URL;

  if (!adminPhone) {
    logger.warn("ADMIN_WHATSAPP_NUMBER not set — skipping WhatsApp notification");
    return;
  }

  const paymentLabel = order.paymentMethod === "razorpay" ? "Online (Razorpay)" : "Cash on Delivery";
  const itemsList = order.items.map((i) => `• ${i.productName} x${i.quantity} = ₹${i.quantity * i.price}`).join("\n");

  const message = `🛒 *नवीन ऑर्डर / New Order*

📋 Order #: ${order.orderNumber}
👤 ${order.customerName}
📞 ${order.customerPhone}
📍 ${order.deliveryAddress}, ${order.city} - ${order.pincode}
💳 Payment: ${paymentLabel}

*Items:*
${itemsList}

💰 *Total: ₹${order.totalAmount}*

अवधूत चिंतन देवस्थान ट्रस्ट`;

  if (waApiKey && waApiUrl) {
    try {
      const payload = JSON.stringify({
        phone: adminPhone,
        message,
        api_key: waApiKey,
      });

      await new Promise<void>((resolve, reject) => {
        const url = new URL(waApiUrl);
        const options = {
          hostname: url.hostname,
          port: 443,
          path: url.pathname + url.search,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
        };
        const req = https.request(options, (resp) => {
          resp.on("data", () => {});
          resp.on("end", resolve);
        });
        req.on("error", reject);
        req.write(payload);
        req.end();
      });

      logger.info({ orderNumber: order.orderNumber, adminPhone }, "WhatsApp notification sent via API");
    } catch (err) {
      logger.warn({ err }, "WhatsApp API call failed — falling back to link");
    }
    return;
  }

  const encodedMsg = encodeURIComponent(message);
  const waLink = `https://wa.me/${adminPhone.replace(/\D/g, "")}?text=${encodedMsg}`;
  logger.info({ orderNumber: order.orderNumber, waLink }, "WhatsApp notification link generated (no API configured)");
}
