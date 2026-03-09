
import { GoogleGenAI } from "@google/genai";
import { TwinConfig } from "../types";

const buildPrompt = (config: TwinConfig): string => {
  const parts = [];

  // --- ROLE & STRATEGY ---
  parts.push("ROLE: You are the 'GlowMuse AI' Luxury Skincare Strategist.");
  parts.push("OBJECTIVE: Generate a hyper-realistic UGC skincare image for brand promotion, maintaining 100% identity lock with the reference photo.");
  parts.push("QUALITY: Editorial level, shot on iPhone 16 Pro, 4K clarity. No AI smoothing or plastic skin texture.");

  // --- IDENTITY LOCK ---
  parts.push(`IDENTITY: Preserve facial structure, skin tone (${config.ethnicity}), and features from the reference image.`);
  if (config.freckles) parts.push("Include natural soft freckles across cheeks and nose.");
  parts.push(`SKIN TEXTURE: Professional realism with visible pores (Level ${config.poreRealism}/10) and a healthy radiance (Glow Level ${config.glowIntensity}/10).`);

  // --- SCENE & ACTION (High Weight) ---
  if (config.visionPrompt) {
    parts.push(`DIRECT CREATIVE VISION: ${config.visionPrompt}. (Crucial: Follow these specific instructions first).`);
  }
  
  parts.push(`SETTING: ${config.scene}. Mood: ${config.mood}. Routine Phase: ${config.routinePhase}.`);
  parts.push(`ACTION: The subject is ${config.pose} specifically targeting the ${config.applicationArea}.`);
  parts.push(`CAMERA: ${config.shotType}. Depth of field: Shallow (f/1.8), soft bokeh.`);

  // --- PRODUCT & BRANDING ---
  parts.push(`BRANDING ENGINE: The subject is interacting with a skincare product.`);
  parts.push(`BOTTLE: ${config.bottleType}. Label Style: ${config.labelStyle}. Brand Color Palette: ${config.brandColorway}.`);
  if (config.brandName) parts.push(`The bottle has a minimalist label that says '${config.brandName}'.`);
  parts.push(`PRODUCT TEXTURE: The visible texture of the product is ${config.productTexture}. It looks luxurious and premium.`);

  // --- STYLING ---
  parts.push(`STYLING: Outfit is ${config.outfit}. Hair is styled as ${config.hair}. Makeup is ${config.makeup}.`);
  parts.push(`LIGHTING: ${config.lighting}. Natural shadows and high-end highlights.`);

  // --- AD STRATEGY ---
  parts.push("TONE: Relatable luxury, 'soft life' aesthetic, authentic influencer content. No watermarks, no collages.");

  return parts.join(" ");
};

export const generateTwinImage = async (
  base64Image: string,
  mimeType: string,
  config: TwinConfig
): Promise<{ url: string; adCopy: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = buildPrompt(config);
    
    // 1. Generate Image
    const imageResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimeType, data: base64Image } },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio,
          imageSize: config.imageSize,
        },
        tools: [{ googleSearch: {} }]
      }
    });

    let imageUrl = "";
    if (imageResponse.candidates && imageResponse.candidates.length > 0) {
      const candidate = imageResponse.candidates[0];
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData?.data) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
          if (part.text) throw new Error(`AI refusal: ${part.text}`);
        }
      }
    }

    if (!imageUrl) {
      throw new Error("Generation failed. Please try a different reference photo or adjust your concept.");
    }

    // 2. Generate Ad Copy
    const copyPrompt = `
      Generate a high-converting Instagram/TikTok caption for a luxury skincare brand.
      Brand Name: ${config.brandName || "GlowMuse"}
      Scene: ${config.scene}
      Routine Phase: ${config.routinePhase}
      Product Texture: ${config.productTexture}
      Mood: ${config.mood}
      
      Requirements:
      - Use a "Relatable Luxury" tone.
      - Include a hook, a brief benefit of the product, and a call to action.
      - Include 3-5 relevant hashtags.
      - Keep it under 150 words.
      - Do not use generic AI greetings.
    `;

    const copyResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: copyPrompt,
    });

    const adCopy = copyResponse.text || "Elevate your ritual with the ultimate glow. ✨ #Skincare #LuxuryBeauty";

    return { url: imageUrl, adCopy };
  } catch (error: any) {
    throw error;
  }
};
