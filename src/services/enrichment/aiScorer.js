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
  return `You are a B2B sales analyst scoring leads for a web design agency.

Evaluate this business lead and provide a JSON score.

LEAD DATA:
- Business: ${lead.business_name}
- Category: ${lead.category}
- Location: ${lead.city}, ${lead.state}
- Rating: ${lead.rating} stars
- Review count: ${lead.review_count}
- Website status: ${lead.website_status} (none = no website)
- Has owner email: ${lead.owner_email ? 'yes' : 'no'}
- Phone available: ${lead.phone ? 'yes' : 'no'}

RECENT CUSTOMER REVIEWS:
${reviews || 'No reviews available'}

Score this lead on these dimensions (0-30, 0-25, 0-25, 0-20):
1. pain_signal (0-30): Do reviews mention customers struggling to find/contact/book? Evidence of lost business?
2. revenue_proxy (0-25): Estimated business size/revenue based on niche + review count + location?
3. owner_reachability (0-25): Can we reach the decision maker? Email, phone, social?
4. competitive_gap (0-20): How much does NOT having a website hurt them in this niche?

Respond ONLY with valid JSON (no markdown):
{
  "pain_signal": <0-30>,
  "revenue_proxy": <0-25>,
  "owner_reachability": <0-25>,
  "competitive_gap": <0-20>,
  "total": <sum of above>,
  "key_insight": "<one sentence about the strongest pitch angle>",
  "review_hook": "<specific phrase or detail from reviews to use in outreach>"
}`;
}

function parseScoringResponse(text, lead) {
  try {
    // Strip any markdown code fences if present
    const clean = text.replace(/```json?/gi, '').replace(/```/g, '').trim();
    const data = JSON.parse(clean);

    const total = Math.min(100, Math.max(0,
      (data.pain_signal || 0) +
      (data.revenue_proxy || 0) +
      (data.owner_reachability || 0) +
      (data.competitive_gap || 0)
    ));

    return {
      score: total,
      breakdown: {
        pain_signal:         data.pain_signal || 0,
        revenue_proxy:       data.revenue_proxy || 0,
        owner_reachability:  data.owner_reachability || 0,
        competitive_gap:     data.competitive_gap || 0,
      },
      notes:       data.key_insight || '',
      review_hook: data.review_hook || '',
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

  // Rating quality
  if (lead.rating >= 4.5) score += 20;
  else if (lead.rating >= 4.0) score += 15;

  // Review volume
  if (lead.review_count >= 100) score += 20;
  else if (lead.review_count >= 50) score += 15;
  else if (lead.review_count >= 25) score += 10;

  // Contact availability
  if (lead.owner_email) score += 20;
  if (lead.phone) score += 10;

  // Website status (none = more urgent)
  if (lead.website_status === 'none') score += 20;
  else if (lead.website_status === 'weak') score += 10;

  // Owner name found
  if (lead.owner_name) score += 10;

  return {
    score: Math.min(100, score),
    breakdown: { rule_based: score },
    notes: 'Scored by rule engine (no AI key)',
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
