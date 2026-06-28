
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

export const generatePinterestImage = async (
  prompt: string,
  aspectRatio: '2:3' | '1:1' | '9:16' = '2:3'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const fullPrompt = `Professional Pinterest content photography. ${prompt}
  Style: High-end editorial, soft natural lighting, luxury aesthetic, Pinterest-worthy composition.
  Quality: 4K sharp, no watermarks, no text overlays, no borders.
  Do not include any people's faces unless explicitly requested.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: fullPrompt }] },
    config: {
      imageConfig: { aspectRatio },
    },
  });

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error('Image generation failed — try rephrasing the prompt.');
};

export const generateInfographicImage = async (
  content: {
    headline: string;
    subheadline: string;
    sections: { title: string; points: string[] }[];
    cta: string;
    colorScheme: { bg: string; accent: string; text: string };
  }
): Promise<string> => {
  return new Promise(resolve => {
    const W = 1000;
    const H = 1500;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const bg = content.colorScheme.bg || '#FFF5F7';
    const accent = content.colorScheme.accent || '#9333EA';
    const textClr = content.colorScheme.text || '#1F2937';

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Top accent bar
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, W, 12);

    // Decorative circles
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(W - 80, 200, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(80, H - 200, 140, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    let y = 80;

    // Headline
    ctx.fillStyle = accent;
    ctx.font = `bold 64px Georgia, serif`;
    ctx.textAlign = 'center';
    wrapText(ctx, content.headline, W / 2, y, W - 100, 72);
    y += measureWrappedHeight(content.headline, W - 100, 72, 64) + 24;

    // Subheadline
    ctx.fillStyle = textClr;
    ctx.font = `28px Arial, sans-serif`;
    ctx.globalAlpha = 0.75;
    wrapText(ctx, content.subheadline, W / 2, y, W - 120, 38);
    y += measureWrappedHeight(content.subheadline, W - 120, 38, 28) + 48;
    ctx.globalAlpha = 1;

    // Divider
    ctx.fillStyle = accent;
    ctx.fillRect(W / 2 - 40, y, 80, 4);
    y += 40;

    // Sections
    for (const section of content.sections) {
      // Section header
      ctx.fillStyle = accent;
      ctx.font = `bold 32px Arial, sans-serif`;
      ctx.textAlign = 'left';
      const sectionX = 80;
      ctx.fillText(section.title.toUpperCase(), sectionX, y);
      y += 44;

      for (const point of section.points) {
        // Bullet dot
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(sectionX + 10, y - 8, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = textClr;
        ctx.font = `24px Arial, sans-serif`;
        wrapText(ctx, point, sectionX + 30, y, W - sectionX - 100, 32);
        y += measureWrappedHeight(point, W - sectionX - 100, 32, 24) + 8;
      }
      y += 28;
    }

    // CTA bar
    const ctaH = 80;
    const ctaY = H - ctaH - 40;
    ctx.fillStyle = accent;
    roundRect(ctx, 60, ctaY, W - 120, ctaH, 16);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 30px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(content.cta, W / 2, ctaY + ctaH / 2 + 10);

    // Bottom bar
    ctx.fillStyle = accent;
    ctx.fillRect(0, H - 12, W, 12);

    resolve(canvas.toDataURL('image/png'));
  });
};

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, currentY);
}

function measureWrappedHeight(
  text: string,
  maxWidth: number,
  lineHeight: number,
  fontSize: number
): number {
  const avgCharWidth = fontSize * 0.55;
  const charsPerLine = Math.floor(maxWidth / avgCharWidth);
  const lines = Math.ceil(text.length / charsPerLine);
  return lines * lineHeight;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
