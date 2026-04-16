// Vercel Serverless Function — POST /api/send-order-email
// Sends two emails via Resend after a successful checkout:
//   1. Order confirmation → customer
//   2. New-order notification → admin inbox
//
// Environment variables (set in Vercel → Project Settings → Env Vars):
//   RESEND_API_KEY      — from https://resend.com/api-keys
//   ADMIN_NOTIFY_EMAIL  — e.g. parkgreenhouse@proton.me
//   ORDER_FROM_EMAIL    — a verified sender in Resend (or onboarding@resend.dev for testing)

import { Resend } from "resend";

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { RESEND_API_KEY, ADMIN_NOTIFY_EMAIL, ORDER_FROM_EMAIL } = process.env;
  if (!RESEND_API_KEY) {
    console.error("[email] RESEND_API_KEY is not set");
    return res.status(500).json({ error: "Email service not configured" });
  }

  const { order } = req.body || {};
  if (!order || !order.id) {
    return res.status(400).json({ error: "Missing order data" });
  }

  const resend = new Resend(RESEND_API_KEY);
  const from = ORDER_FROM_EMAIL || "Park Greenhouse <onboarding@resend.dev>";
  const adminEmail = ADMIN_NOTIFY_EMAIL || null;

  const items = order.items || [];
  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const fmt = (n) => "$" + Number(n).toFixed(2);

  // ── Shared HTML helpers ──────────────────────────────────────────
  const itemRows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px">${i.plantName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:14px">${i.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:14px">${fmt(i.unitPrice)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:14px;font-weight:600">${fmt(i.quantity * i.unitPrice)}</td>
      </tr>`
    )
    .join("");

  const orderTable = `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0">
      <thead>
        <tr style="background:#f7f5f0">
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Item</th>
          <th style="padding:8px 12px;text-align:center;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Qty</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Price</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:10px 12px;text-align:right;font-weight:700;font-size:15px;border-top:2px solid #ddd">Total</td>
          <td style="padding:10px 12px;text-align:right;font-weight:700;font-size:15px;color:#4a6741;border-top:2px solid #ddd">${fmt(total)}</td>
        </tr>
      </tfoot>
    </table>`;

  const errors = [];

  // ── 1. Customer confirmation ─────────────────────────────────────
  if (order.customerEmail) {
    try {
      await resend.emails.send({
        from,
        to: order.customerEmail,
        subject: `Order Confirmed — ${order.id}`,
        html: `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;color:#2c2c2c">
            <div style="background:linear-gradient(135deg,#4a6741,#6b8c5e);padding:24px 28px;border-radius:10px 10px 0 0">
              <h1 style="margin:0;color:#fff;font-size:22px">Park Greenhouse</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,.75);font-size:12px;letter-spacing:1px;text-transform:uppercase">Order Confirmation</p>
            </div>
            <div style="background:#fff;padding:24px 28px;border:1px solid #e8e4dc;border-top:none;border-radius:0 0 10px 10px">
              <p style="font-size:15px;line-height:1.6">Hi <strong>${order.customerName}</strong>,</p>
              <p style="font-size:14px;line-height:1.6;color:#555">Thank you for your order! Here's a summary. No payment is collected online — we'll be in touch to arrange pickup.</p>
              <div style="background:#f7f5f0;border-radius:8px;padding:12px 16px;margin:16px 0">
                <p style="margin:0;font-size:13px;color:#666"><strong>Order ID:</strong> ${order.id}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#666"><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                ${order.notes ? `<p style="margin:4px 0 0;font-size:13px;color:#666"><strong>Notes:</strong> ${order.notes}</p>` : ""}
              </div>
              ${orderTable}
              <p style="font-size:13px;color:#888;margin-top:20px;line-height:1.5">If you have questions, reply to this email or call us directly.</p>
              <p style="font-size:13px;color:#888;line-height:1.5">— Park Greenhouse</p>
            </div>
          </div>`,
      });
    } catch (e) {
      console.error("[email] customer confirmation failed:", e);
      errors.push("customer: " + (e.message || "unknown"));
    }
  }

  // ── 2. Admin notification ────────────────────────────────────────
  if (adminEmail) {
    try {
      await resend.emails.send({
        from,
        to: adminEmail,
        subject: `New Order: ${order.customerName} — ${fmt(total)}`,
        html: `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;color:#2c2c2c">
            <div style="background:#2c2c2c;padding:20px 28px;border-radius:10px 10px 0 0">
              <h1 style="margin:0;color:#fff;font-size:18px">New Order Received</h1>
            </div>
            <div style="background:#fff;padding:24px 28px;border:1px solid #e8e4dc;border-top:none;border-radius:0 0 10px 10px">
              <div style="background:#f7f5f0;border-radius:8px;padding:12px 16px;margin-bottom:16px">
                <p style="margin:0;font-size:14px"><strong>${order.customerName}</strong></p>
                <p style="margin:4px 0 0;font-size:13px;color:#666">${order.customerEmail || "—"} &middot; ${order.customerPhone || "—"}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#888">Order ${order.id} &middot; ${new Date(order.createdAt).toLocaleString()}</p>
                ${order.notes ? `<p style="margin:6px 0 0;font-size:13px;color:#555;font-style:italic">"${order.notes}"</p>` : ""}
              </div>
              ${orderTable}
              <p style="font-size:13px;color:#888;margin-top:16px">Log in to the <a href="https://park-greenhouse.vercel.app/" style="color:#4a6741">admin dashboard</a> to manage this order.</p>
            </div>
          </div>`,
      });
    } catch (e) {
      console.error("[email] admin notification failed:", e);
      errors.push("admin: " + (e.message || "unknown"));
    }
  }

  if (errors.length > 0) {
    return res.status(207).json({ sent: true, errors });
  }
  return res.status(200).json({ sent: true });
}
