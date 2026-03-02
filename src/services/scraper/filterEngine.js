/**
 * Filter Engine — Phase 1
 * Applies all quality gates to a raw scraped lead
 * Returns { pass: true/false, reasons: [] }
 */
function applyFilters(lead, campaignConfig = {}) {
  const {
    min_rating    = 4.0,
    min_reviews   = 25,
    require_no_website = true,
  } = campaignConfig;

  const reasons = [];
  let pass = true;

  // Gate 1: Rating check
  if (!lead.rating || lead.rating < min_rating) {
    pass = false;
    reasons.push(`Rating ${lead.rating || 'N/A'} below minimum ${min_rating}`);
  }

  // Gate 2: Review count
  if (!lead.review_count || lead.review_count < min_reviews) {
    pass = false;
    reasons.push(`Review count ${lead.review_count || 0} below minimum ${min_reviews}`);
  }

  // Gate 3: Business must be active (not permanently closed)
  if (lead.raw_data?.business_status === 'CLOSED_PERMANENTLY') {
    pass = false;
    reasons.push('Business permanently closed');
  }

  // Gate 4: Website status (applied after verification)
  if (require_no_website && lead.website_status === 'active') {
    pass = false;
    reasons.push('Business has an active website');
  }

  // Gate 5: Must have phone number (basic contact signal)
  if (!lead.phone) {
    // Soft fail — still pass but lower score later
    reasons.push('No phone number (score penalty applied)');
  }

  return { pass, reasons };
}

/**
 * Deduplicate leads against existing DB records
 * Returns only new leads not already in DB
 */
async function deduplicateLeads(leads, campaignId) {
  const { query } = require('../../config/database');

  const existingPlaceIds = await query(
    'SELECT place_id FROM leads WHERE campaign_id = ?',
    [campaignId]
  );
  const existingSet = new Set(existingPlaceIds.map(r => r.place_id));

  // Also dedup by phone within this batch
  const seenPhones = new Set();
  const unique = [];

  for (const lead of leads) {
    if (lead.place_id && existingSet.has(lead.place_id)) continue;
    if (lead.phone && seenPhones.has(lead.phone)) continue;
    if (lead.phone) seenPhones.add(lead.phone);
    unique.push(lead);
  }

  return unique;
}

module.exports = { applyFilters, deduplicateLeads };
