import nodemailer from "nodemailer";
import { logger } from "./logger";

interface OrderData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  city: string;
  state: string;
  pincode: string;
  items: Array<{ productId: number; productName: string; quantity: number; price: number }>;
  totalAmount: number;
  paymentMethod: string;
  orderStatus: string;
}

export async function sendOrderConfirmationEmail(order: OrderData): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const fromEmail = process.env.FROM_EMAIL ?? smtpUser ?? "noreply@devstan.org";

  if (!smtpHost || !smtpUser || !smtpPass) {
    logger.warn("SMTP not configured — skipping order confirmation email");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const itemsHtml = order.items
    .map((i) => `<tr><td>${i.productName}</td><td>${i.quantity}</td><td>₹${i.price}</td><td>₹${i.quantity * i.price}</td></tr>`)
    .join("");

  const paymentLabel = order.paymentMethod === "razorpay" ? "Online (Razorpay)" : "Cash on Delivery";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff8f0; padding: 24px; border-radius: 8px;">
      <div style="background: #d4580a; padding: 16px; border-radius: 6px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">अवधूत चिंतन देवस्थान ट्रस्ट</h1>
        <p style="color: #ffd7a8; margin: 4px 0 0;">Avadhut Chintan Devstan Trust</p>
      </div>
      <div style="padding: 20px 0;">
        <h2 style="color: #7c2d00;">ऑर्डर पुष्टी / Order Confirmed</h2>
        <p>प्रिय <strong>${order.customerName}</strong>,</p>
        <p>आपला ऑर्डर यशस्वीरित्या नोंदवला गेला आहे. / Your order has been successfully placed.</p>
        <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
          <tr style="background:#f97316; color:#fff;">
            <th style="padding:8px; text-align:left;">ऑर्डर क्रमांक / Order #</th>
            <td style="padding:8px;"><strong>${order.orderNumber}</strong></td>
          </tr>
          <tr style="background:#fff7ed;">
            <th style="padding:8px; text-align:left;">देयक / Payment</th>
            <td style="padding:8px;">${paymentLabel}</td>
          </tr>
          <tr style="background:#fff;">
            <th style="padding:8px; text-align:left;">पत्ता / Address</th>
            <td style="padding:8px;">${order.deliveryAddress}, ${order.city}, ${order.state} - ${order.pincode}</td>
          </tr>
        </table>
        <h3 style="color:#7c2d00;">वस्तू / Items</h3>
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="background:#f97316; color:#fff;">
              <th style="padding:6px;">वस्तू</th><th style="padding:6px;">संख्या</th><th style="padding:6px;">किंमत</th><th style="padding:6px;">एकूण</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr style="background:#fff7ed; font-weight:bold;">
              <td colspan="3" style="padding:8px; text-align:right;">एकूण / Total</td>
              <td style="padding:8px;">₹${order.totalAmount}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p style="color:#666; font-size:12px; text-align:center;">धन्यवाद! जय श्री गणेश | जय श्री राम</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"अवधूत चिंतन देवस्थान ट्रस्ट" <${fromEmail}>`,
    to: order.customerEmail,
    subject: `ऑर्डर पुष्टी: ${order.orderNumber} | Avadhut Chintan Devstan Trust`,
    html,
  });

  logger.info({ orderNumber: order.orderNumber, to: order.customerEmail }, "Order confirmation email sent");
}
