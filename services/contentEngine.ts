
import {
  ContentCategory,
  ContentKeyword,
  CalendarEntry,
  CalendarContentType,
  BoardPlanEntry,
  BlogPlanEntry,
  BestSellerItem,
  OpportunityTier,
} from '../types';
import { callClaude, parseJSON } from './claude';

// Claude output is bounded, so any batch that could plausibly blow past this
// many structured JSON entries gets split into multiple calls instead of one.
const MAX_ENTRIES_PER_CALL = 90;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `category-${Math.random().toString(36).slice(2, 8)}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

function categoryLookup(categories: ContentCategory[]): Map<string, string> {
  return new Map(categories.map((c) => [c.name.toLowerCase().trim(), c.id]));
}

function resolveCategoryId(lookup: Map<string, string>, name: string, fallback: string): string {
  return lookup.get((name ?? '').toLowerCase().trim()) ?? fallback;
}

export async function generateCategoryTaxonomy(
  theme: string,
  apiKey: string,
  count = 41
): Promise<ContentCategory[]> {
  const prompt = `You are a Pinterest & Amazon affiliate content strategist. Build a product/content category taxonomy for a "${theme}" content campaign.

Return a JSON array (in a \`\`\`json block) of exactly ${count} categories:
\`\`\`json
[
  { "name": "string — short category name", "emoji": "single emoji", "description": "one sentence describing what this category covers" }
]
\`\`\`

Cover the full breadth of the "${theme}" niche — products, content angles, and audience segments. Avoid duplicate or overlapping categories.`;

  const raw = await callClaude(prompt, apiKey, 4096);
  const parsed = parseJSON<{ name: string; emoji: string; description: string }[]>(raw);
  return parsed.map((c) => ({
    id: slugify(c.name),
    name: c.name,
    emoji: c.emoji,
    description: c.description,
  }));
}

export async function generateKeywordsForCategories(
  theme: string,
  categories: ContentCategory[],
  apiKey: string,
  keywordTarget = 1000,
  onProgress?: (done: number, total: number) => void
): Promise<ContentKeyword[]> {
  const perCategory = Math.min(30, Math.max(5, Math.round(keywordTarget / Math.max(1, categories.length))));
  const categoryBatchSize = Math.max(1, Math.floor(MAX_ENTRIES_PER_CALL / perCategory));
  const batches = chunk(categories, categoryBatchSize);
  const lookup = categoryLookup(categories);
  const total = categories.length * perCategory;
  const keywords: ContentKeyword[] = [];

  for (const batch of batches) {
    const prompt = `You are a Pinterest SEO researcher specializing in Amazon affiliate content. For the "${theme}" campaign, generate ${perCategory} high-traffic Pinterest search keywords for EACH of these categories:

${batch.map((c) => `- "${c.name}": ${c.description}`).join('\n')}

Return a JSON array (in a \`\`\`json block) covering all categories listed above:
\`\`\`json
[
  {
    "category": "exact category name from the list above",
    "keyword": "realistic long-tail Pinterest search phrase",
    "searchIntent": "string — what the searcher wants (e.g. 'buying guide', 'gift idea', 'comparison')",
    "opportunityTier": "high|medium|low — AI-estimated relative traffic opportunity, not a real search-volume number",
    "relatedProduct": "specific product type this keyword maps to",
    "amazonSearchTerm": "exact search term to use on Amazon for this product"
  }
]
\`\`\`

Produce exactly ${perCategory} keyword entries per category (${batch.length * perCategory} total in this response). Keywords must be realistic, specific, long-tail Pinterest search phrases — not single words — and must not repeat within the batch.`;

    const raw = await callClaude(prompt, apiKey, 8000);
    const parsed = parseJSON<
      {
        category: string;
        keyword: string;
        searchIntent: string;
        opportunityTier: OpportunityTier;
        relatedProduct: string;
        amazonSearchTerm: string;
      }[]
    >(raw);

    for (const k of parsed) {
      keywords.push({
        keyword: k.keyword,
        categoryId: resolveCategoryId(lookup, k.category, batch[0].id),
        searchIntent: k.searchIntent,
        opportunityTier: k.opportunityTier,
        relatedProduct: k.relatedProduct,
        amazonSearchTerm: k.amazonSearchTerm,
      });
    }
    onProgress?.(keywords.length, total);
  }

  return keywords;
}

export async function generateContentCalendar(
  theme: string,
  categories: ContentCategory[],
  apiKey: string,
  days = 60
): Promise<CalendarEntry[]> {
  const lookup = categoryLookup(categories);
  const categoryNames = categories.map((c) => c.name);

  const prompt = `You are a Pinterest content calendar strategist. Build a ${days}-day posting plan for a "${theme}" Amazon affiliate content campaign.

Available categories: ${categoryNames.join(', ')}

Return a JSON array (in a \`\`\`json block) with exactly ${days} entries, one per day:
\`\`\`json
[
  {
    "day": 1,
    "title": "string — specific content piece to publish that day",
    "contentType": "pin|idea-list|blog|infographic|video",
    "category": "exact category name from the list above",
    "notes": "one sentence of production/posting guidance"
  }
]
\`\`\`

Sequence the plan so it builds momentum toward peak "${theme}" shopping dates, rotates across categories and content types, and avoids repeating the same category on consecutive days where possible.`;

  const raw = await callClaude(prompt, apiKey, 8000);
  const parsed = parseJSON<
    { day: number; title: string; contentType: CalendarContentType; category: string; notes: string }[]
  >(raw);

  return parsed.map((e) => ({
    day: e.day,
    title: e.title,
    contentType: e.contentType,
    categoryId: resolveCategoryId(lookup, e.category, categories[0]?.id ?? ''),
    notes: e.notes,
  }));
}

export async function generateBoardPlanner(
  theme: string,
  categories: ContentCategory[],
  apiKey: string
): Promise<BoardPlanEntry[]> {
  const lookup = categoryLookup(categories);
  const categoryNames = categories.map((c) => c.name);

  const prompt = `You are a Pinterest board strategist. Design a Pinterest board plan for a "${theme}" Amazon affiliate campaign, with one board per category below.

Categories: ${categoryNames.join(', ')}

Return a JSON array (in a \`\`\`json block), one entry per category:
\`\`\`json
[
  {
    "category": "exact category name from the list above",
    "boardName": "SEO-friendly Pinterest board name (max 50 chars)",
    "description": "board description (max 400 chars, keyword-rich, no spam)",
    "keywordSeeds": ["3-5 seed keywords to weave into pins on this board"]
  }
]
\`\`\``;

  const raw = await callClaude(prompt, apiKey, 6000);
  const parsed = parseJSON<
    { category: string; boardName: string; description: string; keywordSeeds: string[] }[]
  >(raw);

  return parsed.map((e) => ({
    boardName: e.boardName,
    description: e.description,
    categoryId: resolveCategoryId(lookup, e.category, categories[0]?.id ?? ''),
    keywordSeeds: e.keywordSeeds,
  }));
}

export async function generateBlogPlanner(
  theme: string,
  categories: ContentCategory[],
  apiKey: string
): Promise<BlogPlanEntry[]> {
  const lookup = categoryLookup(categories);
  const categoryNames = categories.map((c) => c.name);

  const prompt = `You are an SEO blog strategist for Amazon affiliate content. Plan one blog post per category for a "${theme}" campaign.

Categories: ${categoryNames.join(', ')}

Return a JSON array (in a \`\`\`json block), one entry per category:
\`\`\`json
[
  {
    "category": "exact category name from the list above",
    "title": "SEO blog post title",
    "targetKeyword": "primary keyword this post targets",
    "outline": ["intro hook", "section 2", "section 3", "section 4", "product roundup / CTA"]
  }
]
\`\`\``;

  const raw = await callClaude(prompt, apiKey, 6000);
  const parsed = parseJSON<
    { category: string; title: string; targetKeyword: string; outline: string[] }[]
  >(raw);

  return parsed.map((e) => ({
    title: e.title,
    targetKeyword: e.targetKeyword,
    categoryId: resolveCategoryId(lookup, e.category, categories[0]?.id ?? ''),
    outline: e.outline,
  }));
}

export async function generateBestSellerList(
  theme: string,
  categories: ContentCategory[],
  apiKey: string,
  count = 200,
  onProgress?: (done: number, total: number) => void
): Promise<BestSellerItem[]> {
  const perCategory = Math.min(15, Math.max(3, Math.round(count / Math.max(1, categories.length))));
  const categoryBatchSize = Math.max(1, Math.floor(MAX_ENTRIES_PER_CALL / perCategory));
  const batches = chunk(categories, categoryBatchSize);
  const lookup = categoryLookup(categories);
  const total = categories.length * perCategory;
  const items: BestSellerItem[] = [];

  for (const batch of batches) {
    const prompt = `You are an Amazon affiliate product researcher. For the "${theme}" campaign, suggest ${perCategory} realistic bestseller-style products for EACH of these categories:

${batch.map((c) => `- "${c.name}": ${c.description}`).join('\n')}

Return a JSON array (in a \`\`\`json block) covering all categories listed above:
\`\`\`json
[
  {
    "category": "exact category name from the list above",
    "productName": "realistic, specific product name/type (not a real brand claim of ranking, just a plausible bestseller-style product)",
    "amazonSearchTerm": "exact search term to find this product type on Amazon",
    "note": "one sentence on why this sells well or what makes it Pinterest-worthy"
  }
]
\`\`\`

Produce exactly ${perCategory} products per category (${batch.length * perCategory} total in this response). These are illustrative starting points for the user's own Amazon research, not scraped live bestseller data — make that clear by keeping product names generic/type-level rather than inventing specific brand rankings.`;

    const raw = await callClaude(prompt, apiKey, 8000);
    const parsed = parseJSON<
      { category: string; productName: string; amazonSearchTerm: string; note: string }[]
    >(raw);

    for (const p of parsed) {
      items.push({
        productName: p.productName,
        categoryId: resolveCategoryId(lookup, p.category, batch[0].id),
        amazonSearchTerm: p.amazonSearchTerm,
        note: p.note,
      });
    }
    onProgress?.(items.length, total);
  }

  return items;
}
