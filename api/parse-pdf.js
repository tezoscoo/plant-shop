// Vercel Serverless Function — POST /api/parse-pdf
// Accepts a base64-encoded PDF or image, sends it to Claude, and returns
// a structured JSON array of plant inventory rows.
//
// Request body (JSON):
//   { fileData: "<base64 string>", mediaType: "application/pdf" | "image/jpeg" | ..., fileName: "..." }
//
// Environment variables:
//   ANTHROPIC_API_KEY — from https://console.anthropic.com/

import Anthropic from "@anthropic-ai/sdk";

// Increase Vercel body parser limit so large PDFs (base64 ~33% bigger) fit.
export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

const PROMPT = `You are helping a wholesale plant nursery update their inventory database.
Extract every plant or product entry from this document and return them as a JSON array.

For each plant extract these fields:
- name       (string)  common plant name, e.g. "Japanese Maple"
- variety    (string)  cultivar, color, or variety, e.g. "Bloodgood" — empty string if none
- category   (string)  one of: "Trees", "Shrubs", "Perennials", "Grasses", "Annuals", "Other"
- size       (string)  container/pot size, e.g. "1 gal", "3 gal", "#5", "4 inch" — empty string if none
- price      (number)  unit price in dollars as a plain number, e.g. 8.50 — use 0 if not listed
- quantity   (number)  available stock count as a plain integer — use 0 if not listed
- packSize   (number)  units per flat/tray/pack as a plain integer — use 1 if sold individually
- comments   (string)  any notes, descriptions, or special info — empty string if none

Rules:
- Return ONLY a valid JSON array. No markdown fences, no explanation, no extra text.
- If a row has no plant name, skip it.
- If you cannot find any plant data, return an empty array: []

Example output:
[{"name":"Lavender","variety":"Hidcote","category":"Perennials","size":"1 gal","price":8.50,"quantity":120,"packSize":18,"comments":"Fragrant, drought tolerant"}]`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ANTHROPIC_API_KEY } = process.env;
  if (!ANTHROPIC_API_KEY) {
    console.error("[parse-pdf] ANTHROPIC_API_KEY is not set");
    return res.status(500).json({ error: "AI service not configured (missing ANTHROPIC_API_KEY)" });
  }

  const { fileData, mediaType, fileName } = req.body || {};
  if (!fileData) {
    return res.status(400).json({ error: "Missing fileData in request body" });
  }

  // Build the content block Claude expects
  const isPdf = mediaType === "application/pdf" || (fileName || "").toLowerCase().endsWith(".pdf");
  const imageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  const isImage = imageTypes.includes(mediaType) ||
    /\.(jpe?g|png|gif|webp)$/i.test(fileName || "");

  let contentBlock;
  if (isPdf) {
    contentBlock = {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: fileData },
    };
  } else if (isImage) {
    const mt = imageTypes.includes(mediaType) ? mediaType : "image/jpeg";
    contentBlock = {
      type: "image",
      source: { type: "base64", media_type: mt, data: fileData },
    };
  } else {
    return res.status(400).json({ error: `Unsupported file type: ${mediaType || fileName}` });
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  let message;
  try {
    message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [contentBlock, { type: "text", text: PROMPT }],
        },
      ],
    });
  } catch (err) {
    console.error("[parse-pdf] Anthropic API error:", err.message);
    return res.status(502).json({ error: "AI request failed: " + err.message });
  }

  const raw = message.content?.[0]?.text || "[]";

  // Strip any accidental markdown code fences
  const clean = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let plants;
  try {
    plants = JSON.parse(clean);
    if (!Array.isArray(plants)) throw new Error("Response was not an array");
  } catch (err) {
    console.error("[parse-pdf] Failed to parse AI response:", raw.slice(0, 500));
    return res.status(500).json({
      error: "AI returned unexpected format — try again or use CSV upload",
      raw: raw.slice(0, 500),
    });
  }

  // Coerce types so the front-end gets clean data
  plants = plants
    .filter((p) => p.name && String(p.name).trim())
    .map((p) => ({
      name: String(p.name || "").trim(),
      variety: String(p.variety || "").trim(),
      category: String(p.category || "Other").trim(),
      size: String(p.size || "").trim(),
      price: parseFloat(p.price) || 0,
      quantity: parseInt(p.quantity, 10) || 0,
      packSize: parseInt(p.packSize, 10) || 1,
      comments: String(p.comments || "").trim(),
    }));

  return res.status(200).json({ plants, count: plants.length, fileName });
}
