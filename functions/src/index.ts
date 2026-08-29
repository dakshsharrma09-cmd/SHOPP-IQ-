import { onCall, HttpsError } from "firebase-functions/v2/https";
import { VertexAI } from "@google-cloud/vertexai";

// Initialize Vertex AI with project
const PROJECT_ID = "shoppiq-9cc99";
const LOCATION = "us-central1";

export const identifyProduct = onCall(
  {
    region: "us-central1",
    maxInstances: 10,
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (request) => {
    // Auth check
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in");
    }

    const { imageBase64 } = request.data;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      throw new HttpsError("invalid-argument", "imageBase64 is required");
    }

    // Strip data URI prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // Validate size (max ~4MB base64 = ~3MB image)
    if (base64Data.length > 4 * 1024 * 1024) {
      throw new HttpsError("invalid-argument", "Image too large. Max 3MB.");
    }

    try {
      const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
      const model = vertexAI.getGenerativeModel({
        model: "gemini-2.0-flash",
      });

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data,
                },
              },
              {
                text: `You are a product identification system for an Indian kirana store / retail shop.
Look at this product photo and identify it precisely.

Return ONLY a JSON object (no markdown, no backticks, no explanation):
{
  "productName": "exact product name with brand and variant",
  "brand": "brand name",
  "variant": "size/weight/flavor variant",
  "category": "product category like Snacks, Beverages, Dairy, Personal Care, etc.",
  "confidence": 0.0 to 1.0
}

Examples:
- Maggi 2-Minute Masala Noodles 70g -> {"productName": "Maggi 2-Minute Masala Noodles 70g", "brand": "Maggi", "variant": "Masala 70g", "category": "Instant Food", "confidence": 0.95}
- Parle-G Gold Biscuit 100g -> {"productName": "Parle-G Gold Biscuit 100g", "brand": "Parle", "variant": "Gold 100g", "category": "Biscuits", "confidence": 0.9}

If you cannot identify the product, return:
{"productName": "Unknown", "brand": "Unknown", "variant": "", "category": "General", "confidence": 0.0}`,
              },
            ],
          },
        ],
      });

      const responseText =
        result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new HttpsError("internal", "AI could not identify the product");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        productName: parsed.productName || "Unknown",
        brand: parsed.brand || "Unknown",
        variant: parsed.variant || "",
        category: parsed.category || "General",
        confidence: parsed.confidence || 0,
      };
    } catch (error: unknown) {
      if (error instanceof HttpsError) throw error;

      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Gemini Vision error:", message);
      throw new HttpsError(
        "internal",
        "Product identification failed. Try again."
      );
    }
  }
);
