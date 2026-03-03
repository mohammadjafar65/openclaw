/**
 * OpenClaw — AI Website Audit Engine
 * 12-factor website analysis with Claude AI
 * Classifies: none | outdated | average | strong
 */

const Anthropic = require('@anthropic-ai/sdk');
const { query, execute } = require('../../config/database');

const AUDIT_FACTORS = [
  { key: 'design_freshness', label: 'Design Freshness', weight: 0.12, description: 'Visual style era, CSS framework age, image quality' },
  { key: 'mobile_responsiveness', label: 'Mobile Responsiveness', weight: 0.12, description: 'Viewport meta, media queries, touch targets' },
  { key: 'cta_clarity', label: 'CTA Clarity', weight: 0.10, description: 'Primary CTA presence, button visibility, above-fold CTA' },
  { key: 'trust_signals', label: 'Trust Signals', weight: 0.08, description: 'SSL, testimonials, reviews, certifications' },
  { key: 'typography_readability', label: 'Typography & Readability', weight: 0.07, description: 'Font loading, size, contrast, hierarchy' },
  { key: 'branding_quality', label: 'Branding Quality', weight: 0.08, description: 'Logo, colors, consistency, professional imagery' },
  { key: 'loading_speed', label: 'Loading Speed', weight: 0.10, description: 'TTI, LCP, CLS, page weight' },
  { key: 'structure_navigation', label: 'Structure & Navigation', weight: 0.08, description: 'Menu, IA, breadcrumbs, footer links' },
  { key: 'seo_basics', label: 'SEO Basics', weight: 0.08, description: 'Title, meta description, H1, alt tags' },
  { key: 'contact_visibility', label: 'Contact Visibility', weight: 0.07, description: 'Phone/email in header, contact page, form' },
  { key: 'conversion_readiness', label: 'Conversion Readiness', weight: 0.05, description: 'Lead capture, booking widget, chat, click-to-call' },
  { key: 'accessibility_basics', label: 'Accessibility Basics', weight: 0.05, description: 'Alt text, focus states, contrast, semantic HTML' },
];

const AUDIT_PROMPT = `You are a website audit specialist for a web design agency prospecting tool.

Your job is to analyze a business website's HTML structure and provide a detailed quality assessment.

## Audit Instructions

Analyze the website based on these 12 factors, scoring each 0-10:

1. **Design Freshness** (12%): Modern vs dated visual patterns, whitespace, image quality
2. **Mobile Responsiveness** (12%): Viewport meta, responsive CSS, mobile-friendly design
3. **CTA Clarity** (10%): Clear calls-to-action, visible buttons, above-fold placement
4. **Trust Signals** (8%): SSL, testimonials, reviews, portfolio, certifications
5. **Typography & Readability** (7%): Professional fonts, readability, heading hierarchy
6. **Branding Quality** (8%): Logo, color consistency, professional look
7. **Loading Speed** (10%): Estimated based on code complexity, resource count
8. **Structure & Navigation** (8%): Clear menu, logical organization, footer links
9. **SEO Basics** (8%): Title tag, meta description, H1, alt tags
10. **Contact Visibility** (7%): Contact info accessible, contact page, forms
11. **Conversion Readiness** (5%): Lead capture, booking, chat widgets
12. **Accessibility Basics** (5%): Alt text, semantic HTML, contrast

## Business Context (use for personalization):
- Business: {{business_name}}
- Category: {{category}}
- Location: {{city}}, {{country}}
- Rating: {{rating}} ({{review_count}} reviews)

## HTML Content to Analyze:
{{html_content}}

## Response Format (JSON only, no markdown):
{
  "classification": "outdated|average|strong",
  "overall_score": <0-100>,
  "factors": {
    "design_freshness": {"score": <0-10>, "observation": "<1 sentence>"},
    "mobile_responsiveness": {"score": <0-10>, "observation": "<1 sentence>"},
    "cta_clarity": {"score": <0-10>, "observation": "<1 sentence>"},
    "trust_signals": {"score": <0-10>, "observation": "<1 sentence>"},
    "typography_readability": {"score": <0-10>, "observation": "<1 sentence>"},
    "branding_quality": {"score": <0-10>, "observation": "<1 sentence>"},
    "loading_speed": {"score": <0-10>, "observation": "<1 sentence>"},
    "structure_navigation": {"score": <0-10>, "observation": "<1 sentence>"},
    "seo_basics": {"score": <0-10>, "observation": "<1 sentence>"},
    "contact_visibility": {"score": <0-10>, "observation": "<1 sentence>"},
    "conversion_readiness": {"score": <0-10>, "observation": "<1 sentence>"},
    "accessibility_basics": {"score": <0-10>, "observation": "<1 sentence>"}
  },
  "top_redesign_reasons": [
    "<reason 1 — specific, factual, not insulting>",
    "<reason 2>",
    "<reason 3>"
  ],
  "opportunity_summary": "<2-3 sentence business opportunity description>",
  "urgency_score": <0-100>,
  "recommended_website_type": "<what kind of site would best serve this business>",
  "best_outreach_angle": "<one of: reputation-mismatch|mobile-gap|competitor-edge|growth-potential|no-online-booking|trust-gap|conversion-leak>",
  "outreach_angles": {
    "<angle_key>": "<1 sentence outreach hook>"
  },
  "tech_stack_detected": ["<detected technologies>"],
  "has_contact_form": <true|false>,
  "has_booking_widget": <true|false>,
  "mobile_friendly": <true|false>,
  "ssl_valid": <true|false>
}

RULES:
- Be factual, not insulting
- Frame negatives as opportunities, not criticisms
- Never invent features that aren't in the HTML
- If HTML is minimal/empty, classify as "outdated" with low scores
- Keep observations concise and professional`;

/**
 * Perform AI-powered website audit
 */
async function auditWebsite(leadId, htmlContent, metadata = {}) {
  const lead = await query('SELECT * FROM leads WHERE id = ?', [leadId]);
  if (!lead.length) throw new Error(`Lead ${leadId} not found`);
  const l = lead[0];

  // If no website, create "none" audit immediately
  if (!l.website && !l.website_url && !l.maps_website) {
    return await createNoWebsiteAudit(leadId);
  }

  const websiteUrl = l.website || l.website_url || l.maps_website;

  try {
    // Fetch website HTML if not provided
    if (!htmlContent) {
      htmlContent = await fetchWebsiteHtml(websiteUrl);
    }

    // Truncate HTML to fit in context window
    const truncatedHtml = truncateHtml(htmlContent, 8000);

    // Build prompt with context
    const prompt = AUDIT_PROMPT
      .replace('{{business_name}}', l.business_name || 'Unknown')
      .replace('{{category}}', l.category || 'Unknown')
      .replace('{{city}}', l.city || 'Unknown')
      .replace('{{country}}', l.country || 'Unknown')
      .replace('{{rating}}', l.rating || 'N/A')
      .replace('{{review_count}}', l.review_count || 0)
      .replace('{{html_content}}', truncatedHtml);

    // Call Claude AI
    const aiResult = await callClaudeAudit(prompt);

    // Store audit results
    return await storeAuditResult(leadId, websiteUrl, aiResult);

  } catch (error) {
    console.error(`[AUDIT] Error auditing lead ${leadId}:`, error.message);
    // Fallback to rule-based audit
    return await ruleBasedAudit(leadId, websiteUrl, htmlContent);
  }
}

/**
 * Fetch website HTML using node-fetch/axios
 */
async function fetchWebsiteHtml(url) {
  const axios = require('axios');
  try {
    let fullUrl = url;
    if (!fullUrl.startsWith('http')) fullUrl = 'https://' + fullUrl;

    const response = await axios.get(fullUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      maxRedirects: 5,
      validateStatus: (s) => s < 400,
    });

    return typeof response.data === 'string' ? response.data : '';
  } catch (err) {
    console.error(`[AUDIT] Failed to fetch ${url}:`, err.message);
    return '';
  }
}

/**
 * Truncate HTML to fit context window, keeping key elements
 */
function truncateHtml(html, maxChars) {
  if (!html || html.length <= maxChars) return html || '';

  // Extract key sections
  const cheerio = require('cheerio');
  try {
    const $ = cheerio.load(html);

    // Remove scripts, styles, SVGs to save space
    $('script, style, svg, noscript, iframe').remove();

    // Keep: head meta, header, nav, main/body content, footer
    const parts = [];
    parts.push('HEAD: ' + $('head').html()?.substring(0, 1500) || '');
    parts.push('HEADER: ' + ($('header').first().html() || $('nav').first().html() || '').substring(0, 1000));
    parts.push('MAIN CONTENT: ' + ($('main').html() || $('body').html() || '').substring(0, 4000));
    parts.push('FOOTER: ' + ($('footer').first().html() || '').substring(0, 1000));

    return parts.join('\n\n').substring(0, maxChars);
  } catch {
    return html.substring(0, maxChars);
  }
}

/**
 * Call Claude AI for audit analysis
 */
async function callClaudeAudit(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: process.env.AUDIT_AI_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0]?.text || '';

  // Parse JSON from response
  try {
    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found in AI response');
  } catch (parseErr) {
    console.error('[AUDIT] AI response parse error:', parseErr.message);
    throw parseErr;
  }
}

/**
 * Store audit results in database
 */
async function storeAuditResult(leadId, url, aiResult) {
  const classification = aiResult.classification || 'average';
  const overallScore = Math.min(100, Math.max(0, aiResult.overall_score || 50));
  const urgencyScore = Math.min(100, Math.max(0, aiResult.urgency_score || 50));

  // Insert audit record
  await execute(
    `INSERT INTO website_audits (
      lead_id, url_audited, classification, overall_score, factor_scores,
      top_redesign_reasons, opportunity_summary, urgency_score,
      recommended_website_type, best_outreach_angle, outreach_angles,
      tech_stack, ssl_valid, mobile_friendly, has_contact_form,
      has_booking_widget, ai_model_used, audited_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      leadId, url, classification, overallScore,
      JSON.stringify(aiResult.factors || {}),
      JSON.stringify(aiResult.top_redesign_reasons || []),
      aiResult.opportunity_summary || '',
      urgencyScore,
      aiResult.recommended_website_type || '',
      aiResult.best_outreach_angle || '',
      JSON.stringify(aiResult.outreach_angles || {}),
      JSON.stringify(aiResult.tech_stack_detected || []),
      aiResult.ssl_valid ? 1 : 0,
      aiResult.mobile_friendly ? 1 : 0,
      aiResult.has_contact_form ? 1 : 0,
      aiResult.has_booking_widget ? 1 : 0,
      process.env.AUDIT_AI_MODEL || 'claude-sonnet-4-20250514',
    ]
  );

  // Update lead with audit results
  await execute(
    `UPDATE leads SET
      audit_classification = ?,
      audit_score = ?,
      opportunity_score = GREATEST(opportunity_score, ?),
      urgency_score = ?,
      last_audited_at = NOW(),
      updated_at = NOW()
    WHERE id = ?`,
    [classification, overallScore, 100 - overallScore, urgencyScore, leadId]
  );

  // Log activity
  await execute(
    `INSERT INTO activity_logs (lead_id, action, entity_type, entity_id, details)
     VALUES (?, 'audit.completed', 'lead', ?, ?)`,
    [leadId, leadId, JSON.stringify({ classification, score: overallScore })]
  );

  return {
    leadId,
    classification,
    overallScore,
    urgencyScore,
    factors: aiResult.factors,
    topRedesignReasons: aiResult.top_redesign_reasons,
    opportunitySummary: aiResult.opportunity_summary,
    bestOutreachAngle: aiResult.best_outreach_angle,
  };
}

/**
 * Create audit for leads with no website
 */
async function createNoWebsiteAudit(leadId) {
  const result = {
    classification: 'none',
    overall_score: 0,
    urgency_score: 95,
    factors: {},
    top_redesign_reasons: [
      'Business has no website — missing online visibility entirely',
      'Potential customers searching online cannot find this business',
      'Competitors with websites are capturing this business\'s potential customers',
    ],
    opportunity_summary: 'This business has no online presence. A professional website would help them get found by potential customers and compete with businesses in their area that already have websites.',
    recommended_website_type: 'Professional service business website with contact form, services overview, and local SEO optimization',
    best_outreach_angle: 'no-website',
    outreach_angles: {
      'no-website': 'Your business doesn\'t have a website yet — potential customers may be going to competitors instead',
    },
    tech_stack_detected: [],
    has_contact_form: false,
    has_booking_widget: false,
    mobile_friendly: false,
    ssl_valid: false,
  };

  await storeAuditResult(leadId, '', result);

  // Update lead
  await execute(
    `UPDATE leads SET
      has_website = 0,
      website_status = 'none',
      audit_classification = 'none',
      audit_score = 0,
      opportunity_score = 95,
      urgency_score = 95
    WHERE id = ?`,
    [leadId]
  );

  return { leadId, ...result };
}

/**
 * Rule-based fallback audit (when AI is unavailable)
 */
async function ruleBasedAudit(leadId, url, html) {
  let score = 50; // Start at average
  const factors = {};
  const reasons = [];

  if (!html || html.length < 500) {
    return createNoWebsiteAudit(leadId);
  }

  const cheerio = require('cheerio');
  const $ = cheerio.load(html);

  // Check viewport meta (mobile)
  const hasViewport = $('meta[name="viewport"]').length > 0;
  factors.mobile_responsiveness = {
    score: hasViewport ? 6 : 2,
    observation: hasViewport ? 'Has viewport meta tag' : 'Missing viewport meta tag — likely not mobile-friendly',
  };
  if (!hasViewport) { score -= 15; reasons.push('Website may not be mobile-friendly'); }

  // Check SSL (from URL)
  const hasSSL = url.startsWith('https');
  factors.trust_signals = {
    score: hasSSL ? 5 : 2,
    observation: hasSSL ? 'Has SSL certificate' : 'No SSL certificate detected',
  };
  if (!hasSSL) { score -= 5; }

  // Check title tag
  const title = $('title').text().trim();
  factors.seo_basics = {
    score: title.length > 10 ? 6 : 3,
    observation: title ? `Title: "${title.substring(0, 50)}"` : 'No title tag found',
  };
  if (!title) { score -= 10; reasons.push('Missing basic SEO elements'); }

  // Check for CTAs
  const buttons = $('a[href], button, input[type="submit"]').length;
  factors.cta_clarity = {
    score: buttons > 3 ? 6 : 3,
    observation: `Found ${buttons} interactive elements`,
  };

  // Check contact info
  const hasContactLink = $('a[href*="contact"], a[href*="mailto:"]').length > 0;
  factors.contact_visibility = {
    score: hasContactLink ? 6 : 2,
    observation: hasContactLink ? 'Contact information accessible' : 'No obvious contact link found',
  };
  if (!hasContactLink) { reasons.push('Contact information is hard to find'); }

  // Check for outdated patterns
  const hasTable = $('table[width], table[cellpadding]').length > 0;
  const hasFlash = $('embed[type*="flash"], object[type*="flash"]').length > 0;
  if (hasTable || hasFlash) {
    score -= 20;
    reasons.push('Website uses outdated design patterns');
  }
  factors.design_freshness = {
    score: hasTable || hasFlash ? 2 : 5,
    observation: hasTable ? 'Uses table-based layout (outdated)' : 'Standard layout detected',
  };

  // Classify
  const classification = score >= 66 ? 'strong' : score >= 36 ? 'average' : 'outdated';
  const urgencyScore = Math.min(100, Math.max(0, 100 - score));

  if (reasons.length === 0) reasons.push('Website could benefit from modernization');
  while (reasons.length < 3) reasons.push('Potential for improved design and functionality');

  const result = {
    classification,
    overall_score: Math.max(0, Math.min(100, score)),
    urgency_score: urgencyScore,
    factors,
    top_redesign_reasons: reasons.slice(0, 3),
    opportunity_summary: `This business website has room for improvement. A redesign could enhance user experience and help convert more visitors into customers.`,
    recommended_website_type: 'Modern responsive website with clear CTAs and contact forms',
    best_outreach_angle: score < 36 ? 'growth-potential' : 'conversion-leak',
    outreach_angles: { 'growth-potential': 'Your website has potential for improvement that could help grow your business' },
    tech_stack_detected: [],
    has_contact_form: $('form').length > 0,
    has_booking_widget: false,
    mobile_friendly: hasViewport,
    ssl_valid: hasSSL,
  };

  return await storeAuditResult(leadId, url, result);
}

/**
 * Get audit results for a lead
 */
async function getAuditForLead(leadId) {
  return await query(
    'SELECT * FROM website_audits WHERE lead_id = ? ORDER BY audited_at DESC LIMIT 1',
    [leadId]
  );
}

/**
 * Batch audit multiple leads
 */
async function batchAudit(leadIds, progressCallback) {
  const results = [];
  for (let i = 0; i < leadIds.length; i++) {
    try {
      if (progressCallback) {
        progressCallback({ current: i + 1, total: leadIds.length, leadId: leadIds[i] });
      }
      const result = await auditWebsite(leadIds[i]);
      results.push(result);

      // Rate limit: 1 audit per 2 seconds
      if (i < leadIds.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      results.push({ leadId: leadIds[i], error: err.message });
    }
  }
  return results;
}

module.exports = {
  auditWebsite,
  getAuditForLead,
  batchAudit,
  createNoWebsiteAudit,
  AUDIT_FACTORS,
};
