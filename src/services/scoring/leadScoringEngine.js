/**
 * OpenClaw — Lead Scoring Engine
 * Composite scoring: Opportunity + Contact Confidence + Market Value + Engagement
 */

const { query, execute } = require('../../config/database');

// ── Premium niches (higher market value) ──────────────────
const PREMIUM_NICHES = [
  'law', 'legal', 'attorney', 'lawyer',
  'dental', 'dentist', 'orthodont',
  'medical', 'doctor', 'clinic', 'hospital', 'healthcare',
  'real estate', 'realtor', 'property',
  'finance', 'financial', 'accounting', 'cpa',
  'architecture', 'architect',
  'plastic surgery', 'cosmetic', 'med spa', 'medspa',
  'veterinar', 'vet clinic',
  'chiropractic', 'chiropractor',
  'restaurant', 'hotel', 'resort',
  'salon', 'spa', 'beauty',
  'gym', 'fitness',
  'construction', 'contractor', 'plumb', 'electric', 'hvac',
  'auto', 'car dealer',
];

/**
 * Calculate composite lead score
 * Returns: { opportunityScore, contactConfidenceScore, marketValueScore, engagementScore, compositeScore, priority }
 */
async function scoreLead(leadId) {
  const leads = await query('SELECT * FROM leads WHERE id = ?', [leadId]);
  if (!leads.length) throw new Error(`Lead ${leadId} not found`);
  const lead = leads[0];

  // Get audit data if exists
  const audits = await query(
    'SELECT * FROM website_audits WHERE lead_id = ? ORDER BY audited_at DESC LIMIT 1',
    [leadId]
  );
  const audit = audits[0] || null;

  // Get outreach data
  const messages = await query(
    'SELECT status, open_count FROM outreach_messages WHERE lead_id = ?',
    [leadId]
  );
  const replies = await query(
    'SELECT classification FROM replies WHERE lead_id = ?',
    [leadId]
  );

  // ── Calculate sub-scores ────────────────────────────────
  const opportunityScore = calcOpportunityScore(lead, audit);
  const contactConfidenceScore = calcContactConfidenceScore(lead);
  const marketValueScore = calcMarketValueScore(lead);
  const engagementScore = calcEngagementScore(lead, messages, replies);

  // ── Weighted composite ──────────────────────────────────
  const compositeScore = Math.round(
    opportunityScore * 0.35 +
    contactConfidenceScore * 0.25 +
    marketValueScore * 0.25 +
    engagementScore * 0.15
  );

  // ── Priority bucket ─────────────────────────────────────
  let priority;
  if (compositeScore >= 75) priority = 'hot';
  else if (compositeScore >= 50) priority = 'warm';
  else if (compositeScore >= 25) priority = 'cold';
  else priority = 'disqualified';

  // ── Build scoring factors breakdown ─────────────────────
  const scoringFactors = {
    opportunity: { score: opportunityScore, weight: '35%' },
    contact_confidence: { score: contactConfidenceScore, weight: '25%' },
    market_value: { score: marketValueScore, weight: '25%' },
    engagement: { score: engagementScore, weight: '15%' },
  };

  // ── Upsert score record ─────────────────────────────────
  await execute(
    `INSERT INTO lead_scores (
      lead_id, opportunity_score, contact_confidence_score, market_value_score,
      engagement_score, composite_score, priority, scoring_factors, scored_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      opportunity_score = VALUES(opportunity_score),
      contact_confidence_score = VALUES(contact_confidence_score),
      market_value_score = VALUES(market_value_score),
      engagement_score = VALUES(engagement_score),
      composite_score = VALUES(composite_score),
      priority = VALUES(priority),
      scoring_factors = VALUES(scoring_factors),
      scored_at = NOW(),
      updated_at = NOW()`,
    [
      leadId, opportunityScore, contactConfidenceScore, marketValueScore,
      engagementScore, compositeScore, priority, JSON.stringify(scoringFactors),
    ]
  );

  // ── Update lead record ──────────────────────────────────
  await execute(
    `UPDATE leads SET
      lead_score = ?,
      lead_priority = ?,
      opportunity_score = ?,
      urgency_score = ?,
      updated_at = NOW()
    WHERE id = ?`,
    [compositeScore, priority, opportunityScore, audit?.urgency_score || 0, leadId]
  );

  // ── Auto-tag ────────────────────────────────────────────
  await autoTagLead(leadId, lead, audit, compositeScore, contactConfidenceScore, marketValueScore);

  return {
    leadId,
    opportunityScore,
    contactConfidenceScore,
    marketValueScore,
    engagementScore,
    compositeScore,
    priority,
    scoringFactors,
  };
}

/**
 * Opportunity Score (0–100): How much does this business need a website/redesign?
 */
function calcOpportunityScore(lead, audit) {
  let score = 0;

  // No website
  if (!lead.has_website || lead.website_status === 'none' || lead.audit_classification === 'none') {
    score += 40;
  }

  // Outdated website
  if (lead.audit_classification === 'outdated' || (audit && audit.overall_score < 35)) {
    score += 35;
  } else if (lead.audit_classification === 'average' || (audit && audit.overall_score < 65)) {
    score += 15;
  }

  // Specific audit factors
  if (audit) {
    const factors = typeof audit.factor_scores === 'string'
      ? JSON.parse(audit.factor_scores) : (audit.factor_scores || {});

    if (factors.mobile_responsiveness?.score < 4) score += 15; // Not mobile-friendly
    if (!audit.ssl_valid) score += 10; // No SSL
    if (factors.cta_clarity?.score < 4) score += 10; // No clear CTAs
    if (factors.loading_speed?.score < 4) score += 8; // Slow loading
    if (factors.seo_basics?.score < 4) score += 7; // Bad SEO
  }

  // Reputation mismatch bonus
  if (lead.rating >= 4.0 && lead.review_count >= 10 &&
      (lead.audit_classification === 'outdated' || lead.audit_classification === 'none')) {
    score += 15;
  }

  return Math.min(100, score);
}

/**
 * Contact Confidence Score (0–100)
 */
function calcContactConfidenceScore(lead) {
  let score = 0;

  // Email quality
  const email = lead.email || lead.owner_email || '';
  if (email) {
    const domain = lead.website_domain || '';
    if (domain && email.endsWith('@' + domain)) {
      score += 40; // Domain-match email
    } else if (email.includes('@gmail') || email.includes('@yahoo') || email.includes('@hotmail') || email.includes('@outlook')) {
      score += 20; // Generic email
      score -= 10; // Penalty for generic
    } else {
      score += 30; // Some email
    }

    // Email confidence from enrichment
    if (lead.email_confidence >= 80) score += 20;
    else if (lead.email_confidence >= 50) score += 10;
  } else {
    score -= 30; // No email
  }

  // Phone present
  if (lead.phone) score += 15;

  // Multiple contact methods
  let methods = 0;
  if (email) methods++;
  if (lead.phone) methods++;
  if (lead.whatsapp_number) methods++;
  if (lead.social_facebook || lead.social_instagram || lead.social_linkedin) methods++;
  if (methods >= 3) score += 10;

  return Math.min(100, Math.max(0, score));
}

/**
 * Market Value Score (0–100)
 */
function calcMarketValueScore(lead) {
  let score = 0;

  // Premium niche detection
  const category = (lead.category || '').toLowerCase();
  const isPremium = PREMIUM_NICHES.some(n => category.includes(n));
  if (isPremium) score += 25;

  // High review count (established business)
  if (lead.review_count >= 100) score += 15;
  else if (lead.review_count >= 50) score += 10;
  else if (lead.review_count >= 20) score += 5;

  // High rating (quality-conscious)
  if (lead.rating >= 4.5) score += 10;
  else if (lead.rating >= 4.0) score += 5;

  // Social media presence (brand-aware)
  let socialCount = 0;
  if (lead.social_facebook) socialCount++;
  if (lead.social_instagram) socialCount++;
  if (lead.social_linkedin) socialCount++;
  if (lead.social_twitter) socialCount++;
  if (socialCount >= 2) score += 10;

  // Has phone (real business)
  if (lead.phone) score += 5;

  // Location bonus (could be configured per org)
  score += 10; // Base for being a found business

  return Math.min(100, score);
}

/**
 * Engagement Score (0–100): Increases as engagement happens
 */
function calcEngagementScore(lead, messages, replies) {
  let score = 10; // Base

  // Email interactions
  for (const msg of messages) {
    if (msg.open_count > 0) score += 20;
    if (msg.status === 'clicked') score += 25;
  }

  // Replies
  for (const r of replies) {
    switch (r.classification) {
      case 'interested': score += 40; break;
      case 'neutral': score += 20; break;
      case 'not_interested': score -= 10; break;
    }
  }

  // Stage-based
  const stageBonus = {
    'meeting_booked': 50,
    'proposal_sent': 40,
    'interested': 35,
    'replied': 25,
    'contacted': 10,
  };
  score += stageBonus[lead.stage] || 0;

  // No engagement penalty
  if (messages.length >= 3 && replies.length === 0) {
    score -= 15;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Auto-tag leads based on scoring
 */
async function autoTagLead(leadId, lead, audit, compositeScore, contactScore, marketScore) {
  const tags = new Set(Array.isArray(lead.tags) ? lead.tags :
    (typeof lead.tags === 'string' ? JSON.parse(lead.tags || '[]') : []));

  // Auto-tags
  if (!lead.has_website || lead.website_status === 'none') tags.add('no-website');
  if (lead.audit_classification === 'outdated' || lead.audit_classification === 'average') tags.add('redesign-opportunity');
  if (marketScore >= 70) tags.add('premium-brand-fit');
  if (compositeScore >= 75) tags.add('high-value');
  if (contactScore >= 80) tags.add('verified-email');
  if (contactScore < 20) tags.add('no-email');

  await execute('UPDATE leads SET tags = ? WHERE id = ?', [JSON.stringify([...tags]), leadId]);
}

/**
 * Batch score multiple leads
 */
async function batchScoreLeads(leadIds) {
  const results = [];
  for (const id of leadIds) {
    try {
      results.push(await scoreLead(id));
    } catch (err) {
      results.push({ leadId: id, error: err.message });
    }
  }
  return results;
}

/**
 * Recalculate all lead scores (used by cron)
 */
async function recalculateAllScores(limit = 100) {
  const leads = await query(
    `SELECT id FROM leads
     WHERE updated_at > COALESCE(
       (SELECT scored_at FROM lead_scores WHERE lead_scores.lead_id = leads.id), '2000-01-01'
     )
     ORDER BY updated_at DESC LIMIT ?`,
    [limit]
  );

  if (leads.length > 0) {
    console.log(`[SCORING] Recalculating ${leads.length} lead scores`);
    return await batchScoreLeads(leads.map(l => l.id));
  }
  return [];
}

module.exports = {
  scoreLead,
  batchScoreLeads,
  recalculateAllScores,
  PREMIUM_NICHES,
};
