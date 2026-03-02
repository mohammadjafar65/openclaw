const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * AI Lead Scoring Engine — Phase 2
 * Returns score 0-100 with breakdown and queue tier
 */
async function scoreLead(lead) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return basicScore(lead); // Fallback: rule-based scoring
  }

  try {
    const prompt = buildScoringPrompt(lead);
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].text;
    return parseScoringResponse(text, lead);
  } catch (err) {
    console.error('[AI Scorer] Claude error:', err.message);
    return basicScore(lead);
  }
}

function buildScoringPrompt(lead) {
  const reviews = (lead.source_reviews || []).map(r => `"${r.text}"`).join('\n');
  const webData = lead.website_data || {};
  
  return `You are an expert Web Design Consultant analyzing a potential client.
  
ANALYZE THIS LEAD FOR A WEBSITE REDESIGN PITCH.

BUSINESS INFO:
- Name: ${lead.business_name}
- Category: ${lead.category}
- Location: ${lead.city}, ${lead.state}
- Current Website: ${lead.website_url || 'None'}
- Rating: ${lead.rating} (${lead.review_count} reviews)

WEBSITE SIGNAL ANALYSIS:
- Copyright Year: ${webData.copyright_year || 'Unknown'} (Older than 2023 indicates neglect)
- CMS/Tech: ${(webData.technologies || []).join(', ') || 'Unknown'}
- Mobile Viewport Found: ${webData.is_responsive ? 'Yes' : 'NO (Critical Issue)'}
- Meta Description: "${webData.description || 'Missing'}"
- Page Title: "${webData.title || 'Missing'}"

CUSTOMER REVIEWS (Look for "confusing", "hard to navigate", "outdated"):
${reviews || 'No availability'}

Score this lead (0-100) on likelihood to buy a $3,000+ website redesign.

Respond ONLY with valid JSON:
{
  "design_pain": <0-40, is the site ugly/broken/non-mobile?>,
  "business_viability": <0-30, do they have money? check review count>,
  "technical_debt": <0-30, old copyright? missing meta? no SSL?>,
  "total": <sum>,
  "key_insight": "<one punchy sentence about WHY they need a redesign>",
  "pitch_angle": "<specific hook: 'Your 2018 copyright makes you look closed' or 'Mobile users cannot read your menu'>"
}`;
}

function parseScoringResponse(text, lead) {
  try {
    const clean = text.replace(/```json?/gi, '').replace(/```/g, '').trim();
    const data = JSON.parse(clean);

    const total = Math.min(100, Math.max(0,
      (data.design_pain || 0) +
      (data.business_viability || 0) +
      (data.technical_debt || 0)
    ));

    return {
      score: total,
      breakdown: {
        design_pain:         data.design_pain || 0,
        business_viability:  data.business_viability || 0,
        technical_debt:      data.technical_debt || 0,
      },
      notes:       (data.key_insight || '') + (data.pitch_angle ? `\n\n🎯 PITCH: ${data.pitch_angle}` : ''),
      review_hook: data.pitch_angle || '',
      tier:        getQueueTier(total),
    };
  } catch {
    return basicScore(lead);
  }
}

/**
 * Rule-based fallback scoring (no API key needed)
 */
function basicScore(lead) {
  let score = 0;
  const wd = lead.website_data || {};

  // 1. Website Status (Biggest Factor)
  if (lead.website_status === 'none' || !lead.website_url) score += 40;
  else if (lead.website_status === 'weak') score += 25;

  // 2. Technical Debt (from scraper)
  if (wd.is_responsive === false) score += 30; // Mobile responsiveness is key
  if (wd.copyright_year && wd.copyright_year < 2022) score += 15;
  if (!wd.description) score += 5; // SEO missing

  // 3. Business Viability
  if (lead.rating >= 4.0) score += 10;
  if (lead.review_count >= 20) score += 10;

  // 4. Contact Info
  if (lead.owner_email || (lead.scraped_emails && lead.scraped_emails.length > 0)) score += 10;

  return {
    score: Math.min(100, score),
    breakdown: { rule_based: score, tech_debt: wd.is_responsive === false ? 30 : 0 },
    notes: !lead.website_url ? 'No website found' : 'Scored by rule engine',
    review_hook: '',
    tier: getQueueTier(score),
  };
}

function getQueueTier(score) {
  if (score >= 75) return 'priority';
  if (score >= 50) return 'standard';
  if (score >= 30) return 'nurture';
  return 'archive';
}

module.exports = { scoreLead };
