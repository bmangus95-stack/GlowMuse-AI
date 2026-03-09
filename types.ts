
export interface TwinConfig {
  visionPrompt: string; 
  shotType: string;
  photoshootType: string;
  scene: string; 
  outfit: string;
  hair: string;
  makeup: string;
  facialExpression: string;
  lighting: string;
  mood: string;
  extraDetails: string;
  aspectRatio: string;
  imageSize: string;
  ethnicity: string;
  pose: string;
  
  // Skincare Specifics
  brandName: string;
  bottleType: string;
  labelStyle: string;
  productTexture: string;
  brandColorway: string;
  routinePhase: string;
  applicationArea: string;
  glowIntensity: number;
  poreRealism: number;
  freckles: boolean;

  // Heritage from old version
  bodyShape: string;
  hipWidth: number;
  waistDefinition: number;
  gluteProminence: number;
}

export interface GeneratedImage {
  id: string;
  url: string;
  adCopy?: string;
  timestamp: number;
  config: TwinConfig;
  isFavorite: boolean;
}

export interface UserPreset {
  id: string;
  name: string;
  config: Partial<TwinConfig>;
  isCustom?: boolean;
}

export enum AspectRatio {
  SQUARE = "1:1",
  PORTRAIT_3_4 = "3:4",
  PORTRAIT_9_16 = "9:16",
  LANDSCAPE_4_3 = "4:3",
  LANDSCAPE_16_9 = "16:9",
}

export enum ImageSize {
  SIZE_1K = "1K",
  SIZE_2K = "2K",
  SIZE_4K = "4K",
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
