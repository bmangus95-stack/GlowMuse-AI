
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

// ─── Pinterest Studio Types ───────────────────────────────────────────────────

export interface ProductResearchItem {
  productName: string;
  category: string;
  pinterestAngle: string;
  keyBenefits: string[];
  targetAudience: string;
  performanceSignal: string;
  amazonSearchTerm: string;
}

export interface PinterestResearch {
  niche: string;
  topProducts: ProductResearchItem[];
  trendingKeywords: string[];
  contentAngles: string[];
  competitorInsights: string;
  seasonalTrends: string[];
}

export type PinContentType = 'collage' | 'infographic' | 'lifestyle' | 'idea-list';

export interface PinterestContentIdea {
  id: string;
  title: string;
  description: string;
  hashtags: string[];
  contentType: PinContentType;
  productFocus: string;
  affiliateKeyword: string;
  visualConcept: string;
  imagePrompt: string;
}

export interface PinterestPin {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  affiliateLink: string;
  boardId?: string;
  boardName?: string;
  hashtags: string[];
  contentType: PinContentType;
  status: 'draft' | 'publishing' | 'published' | 'scheduled' | 'error';
  createdAt: number;
  scheduledAt?: number;
  pinterestPinId?: string;
  ideaId?: string;
}

export interface PinterestBoard {
  id: string;
  name: string;
  description: string;
  pinCount: number;
  privacy: string;
}

export interface IdeaListPage {
  title: string;
  description: string;
  imageUrl?: string;
  order: number;
}

export interface IdeaList {
  id: string;
  title: string;
  description: string;
  pages: IdeaListPage[];
  boardId?: string;
  status: 'draft' | 'published';
  createdAt: number;
}

export interface PinterestStudioConfig {
  pinterestAccessToken: string;
  pinterestRefreshToken?: string;
  pinterestTokenExpiresAt?: number;
  pinterestUsername?: string;
  amazonAffiliateTag: string;
  claudeApiKey: string;
  defaultBoardId: string;
}

export interface PinterestStudioState {
  id: 'default';
  config: PinterestStudioConfig;
  niche: string;
  ideaCount: number;
  research: PinterestResearch | null;
  ideas: PinterestContentIdea[];
  drafts: PinterestPin[];
  ideaLists: IdeaList[];
  pinSchedules: Record<string, string>;
  scheduleMode: 'now' | 'schedule';
  updatedAt: number;
}

// ─── Content Engine Types ──────────────────────────────────────────────────
// A reusable, niche-agnostic content-planning generator (keywords, categories,
// a content calendar, board/blog planners, and a bestseller list) for any
// seasonal or evergreen campaign — Back to School is just the first theme run
// through it. Traffic/opportunity signals here are AI-estimated, not real
// Pinterest/Amazon search volume, and must be labeled as such in the UI/export.

export type OpportunityTier = 'high' | 'medium' | 'low';

export interface ContentCategory {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export interface ContentKeyword {
  keyword: string;
  categoryId: string;
  searchIntent: string;
  opportunityTier: OpportunityTier;
  relatedProduct: string;
  amazonSearchTerm: string;
}

export type CalendarContentType = 'pin' | 'idea-list' | 'blog' | 'infographic' | 'video';

export interface CalendarEntry {
  day: number;
  title: string;
  contentType: CalendarContentType;
  categoryId: string;
  notes: string;
}

export interface BoardPlanEntry {
  boardName: string;
  description: string;
  categoryId: string;
  keywordSeeds: string[];
}

export interface BlogPlanEntry {
  title: string;
  targetKeyword: string;
  categoryId: string;
  outline: string[];
}

export interface BestSellerItem {
  productName: string;
  categoryId: string;
  amazonSearchTerm: string;
  note: string;
}

export interface ContentEngineConfig {
  keywordTarget: number;
  calendarDays: number;
  categoryCount: number;
  bestSellerCount: number;
}

export interface ContentEnginePackage {
  id: string;
  theme: string;
  niche: string;
  createdAt: number;
  updatedAt: number;
  config: ContentEngineConfig;
  categories: ContentCategory[];
  keywords: ContentKeyword[];
  calendar: CalendarEntry[];
  boardPlan: BoardPlanEntry[];
  blogPlan: BlogPlanEntry[];
  bestSellers: BestSellerItem[];
}

export interface ContentEngineSettings {
  id: 'settings';
  claudeApiKey: string;
}
