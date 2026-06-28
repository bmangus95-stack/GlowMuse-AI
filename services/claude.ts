
import {
  PinterestResearch,
  PinterestContentIdea,
  PinContentType,
} from '../types';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-6';

async function callClaude(
  prompt: string,
  apiKey: string,
  maxTokens = 4096
): Promise<string> {
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

function parseJSON<T>(raw: string): T {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  const jsonStr = match ? match[1] : raw;
  return JSON.parse(jsonStr.trim());
}

export async function researchPinterestNiche(
  niche: string,
  apiKey: string
): Promise<PinterestResearch> {
  const prompt = `You are a Pinterest marketing strategist specializing in Amazon affiliate content.
Research the "${niche}" niche on Pinterest and identify what's performing best.

Return a JSON object (no markdown prose outside the JSON block) with this exact structure:
\`\`\`json
{
  "niche": "${niche}",
  "topProducts": [
    {
      "productName": "string",
      "category": "string",
      "pinterestAngle": "string — why this works on Pinterest",
      "keyBenefits": ["benefit1", "benefit2", "benefit3"],
      "targetAudience": "string",
      "performanceSignal": "string — what signals high engagement (saves, clicks)",
      "amazonSearchTerm": "string — exact search term to find on Amazon"
    }
  ],
  "trendingKeywords": ["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8"],
  "contentAngles": ["angle1","angle2","angle3","angle4","angle5"],
  "competitorInsights": "string — 2-3 sentences on what top creators do",
  "seasonalTrends": ["trend1","trend2","trend3"]
}
\`\`\`

Include 6 topProducts. Make the data specific, actionable, and based on real Pinterest/Amazon trends for the ${niche} niche. Focus on products with proven affiliate commission potential.`;

  const raw = await callClaude(prompt, apiKey);
  return parseJSON<PinterestResearch>(raw);
}

export async function generateContentIdeas(
  research: PinterestResearch,
  count: number,
  apiKey: string
): Promise<PinterestContentIdea[]> {
  const contentTypes: PinContentType[] = ['collage', 'infographic', 'lifestyle', 'idea-list'];

  const prompt = `You are a Pinterest content strategist. Based on this research data for the "${research.niche}" niche:

Top Products: ${research.topProducts.map(p => p.productName).join(', ')}
Trending Keywords: ${research.trendingKeywords.join(', ')}
Content Angles: ${research.contentAngles.join(', ')}

Generate ${count} Pinterest content ideas optimized for maximum saves and clicks. Mix these content types: ${contentTypes.join(', ')}.

Return a JSON array (in a \`\`\`json block):
\`\`\`json
[
  {
    "id": "idea_1",
    "title": "Pinterest pin title (max 100 chars, keyword-rich)",
    "description": "Compelling pin description with benefits and soft CTA (max 500 chars)",
    "hashtags": ["hashtag1","hashtag2","hashtag3","hashtag4","hashtag5"],
    "contentType": "collage|infographic|lifestyle|idea-list",
    "productFocus": "specific product name or product category",
    "affiliateKeyword": "exact keyword to use in Amazon affiliate search URL",
    "visualConcept": "Detailed visual description — layout, colors, style, mood",
    "imagePrompt": "Detailed AI image generation prompt for this pin (be very specific about composition, lighting, style)"
  }
]
\`\`\`

Make each idea unique in approach. Titles must be SEO-friendly and Pinterest-searchable. Image prompts should be vivid and detailed enough for AI image generation.`;

  const raw = await callClaude(prompt, apiKey, 6000);
  const ideas = parseJSON<PinterestContentIdea[]>(raw);
  return ideas.map((idea, i) => ({ ...idea, id: idea.id || `idea_${i + 1}` }));
}

export async function generatePinCopy(
  idea: PinterestContentIdea,
  affiliateTag: string,
  apiKey: string
): Promise<{ title: string; description: string; hashtags: string[] }> {
  const prompt = `You are a Pinterest SEO copywriter. Write optimized copy for this pin:

Product Focus: ${idea.productFocus}
Content Type: ${idea.contentType}
Visual Concept: ${idea.visualConcept}
Affiliate Tag: ${affiliateTag}

Generate a JSON object:
\`\`\`json
{
  "title": "SEO-optimized Pinterest title (max 100 chars, include top keyword first)",
  "description": "Engaging description that includes: 1) hook sentence, 2) 3 key benefits, 3) soft call to action mentioning 'link in bio' or 'shop via link'. Max 500 chars. Natural language, no spammy vibes.",
  "hashtags": ["8-10 relevant hashtags without the # symbol"]
}
\`\`\``;

  const raw = await callClaude(prompt, apiKey, 1024);
  return parseJSON(raw);
}

export interface InfographicContent {
  headline: string;
  subheadline: string;
  sections: { title: string; points: string[] }[];
  cta: string;
  colorScheme: { bg: string; accent: string; text: string };
}

export async function generateInfographicContent(
  idea: PinterestContentIdea,
  apiKey: string
): Promise<InfographicContent> {
  const prompt = `You are a Pinterest infographic designer. Create structured content for an infographic pin about: "${idea.title}"

Product: ${idea.productFocus}
Visual Concept: ${idea.visualConcept}

Return JSON:
\`\`\`json
{
  "headline": "Bold main headline (max 8 words, punchy)",
  "subheadline": "Supporting subtitle (max 12 words)",
  "sections": [
    {
      "title": "Section header",
      "points": ["point 1 (max 10 words)", "point 2", "point 3"]
    }
  ],
  "cta": "Call to action text (max 8 words)",
  "colorScheme": {
    "bg": "#hex background color that fits the niche",
    "accent": "#hex accent/highlight color",
    "text": "#hex text color (contrast with bg)"
  }
}
\`\`\`

Include 3-4 sections with 2-3 bullet points each. Make it scannable and Pinterest-worthy.`;

  const raw = await callClaude(prompt, apiKey, 2048);
  return parseJSON<InfographicContent>(raw);
}

export async function generateIdeaListContent(
  research: PinterestResearch,
  topic: string,
  apiKey: string
): Promise<{ title: string; description: string; pages: { title: string; description: string; imagePrompt: string }[] }> {
  const prompt = `You are a Pinterest Idea List strategist. Create a complete Idea List (multi-page pin) for the "${research.niche}" niche.

Topic: ${topic}
Related Products: ${research.topProducts.slice(0, 3).map(p => p.productName).join(', ')}

Return JSON:
\`\`\`json
{
  "title": "Idea List title (max 100 chars, very clickable)",
  "description": "List description explaining the value (max 500 chars)",
  "pages": [
    {
      "title": "Page title (max 50 chars)",
      "description": "Page content/caption (max 300 chars, include product tip or benefit)",
      "imagePrompt": "Detailed image generation prompt for this page"
    }
  ]
}
\`\`\`

Create 5-7 pages that flow as a cohesive story or guide. Each page should be visually distinct but thematically connected.`;

  const raw = await callClaude(prompt, apiKey, 3000);
  return parseJSON(raw);
}
