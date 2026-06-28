
const AMAZON_BASE = 'https://www.amazon.com';

export function buildAffiliateSearchUrl(keyword: string, affiliateTag: string): string {
  const params = new URLSearchParams({
    k: keyword,
    tag: affiliateTag,
    linkCode: 'll2',
    linkId: Date.now().toString(36),
  });
  return `${AMAZON_BASE}/s?${params.toString()}`;
}

export function buildAffiliateProductUrl(asin: string, affiliateTag: string): string {
  return `${AMAZON_BASE}/dp/${asin}?tag=${affiliateTag}`;
}

export function formatAffiliateTag(rawTag: string): string {
  return rawTag.trim().replace(/[^a-z0-9-]/gi, '').toLowerCase();
}
