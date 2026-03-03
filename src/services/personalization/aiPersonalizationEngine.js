/**
 * OpenClaw — AI Personalization Engine
 * Generates personalized cold emails, WhatsApp drafts, follow-ups, call scripts
 * Uses real audit data — never invents facts
 */

const Anthropic = require('@anthropic-ai/sdk');
const { query, execute } = require('../../config/database');

// ══════════════════════════════════════════════════════════
// ── SYSTEM PROMPT (GUARDRAILS) ───────────────────────────
// ══════════════════════════════════════════════════════════
const SYSTEM_PROMPT = `You are an AI copywriter for a professional web design agency.
Your job is to write personalized outreach messages to businesses that may benefit from a new website or website redesign.

## ABSOLUTE RULES — NEVER BREAK THESE:

1. NEVER invent facts about the business that aren't in the data provided
2. NEVER insult or mock the business's current website  
3. NEVER use spam trigger words: "act now", "limited time", "guaranteed", "you won't believe", "FREE!!!", "click here now"
4. NEVER exaggerate claims about what a redesign will achieve
5. NEVER pretend to be the business's customer or claim to have visited the business
6. NEVER claim the business is losing specific amounts of money
7. ALWAYS be respectful, professional, and genuinely helpful
8. ALWAYS use genuine observations from the audit data provided
9. KEEP tone: confident but not aggressive, helpful but not pushy, premium but approachable
10. KEEP language: human, conversational, concise — not robotic or overly salesy
11. FORMAT: short paragraphs, scannable, no walls of text
12. SIGN OFF: professional and warm
13. IF no website: frame as opportunity, not as criticism — they may have reasons
14. IF outdated: frame as growth potential, not as failure
15. MAXIMUM 3 personalized observations per email
16. NEVER exceed recommended word counts

## COMPLIANCE FOOTER (always include for emails):
Add this exact line at the bottom:
---
You received this because your business is publicly listed. Reply STOP to opt out.`;

// ══════════════════════════════════════════════════════════
// ── GENERATION TYPES ─────────────────────────────────────
// ══════════════════════════════════════════════════════════

/**
 * Generate personalized cold email
 */
async function generateColdEmail(leadId, options = {}) {
  const { lead, audit } = await getLeadContext(leadId);
  const { senderName, agencyName, calendarLink } = options;

  const prompt = buildEmailPrompt(lead, audit, {
    type: 'cold_intro',
    senderName: senderName || '{sender_name}',
    agencyName: agencyName || '{agency_name}',
    calendarLink: calendarLink || '',
  });

  const result = await callAI(prompt);
  return parseEmailResult(result, leadId, 'cold_intro', 1);
}

/**
 * Generate follow-up email
 */
async function generateFollowUp(leadId, stepNumber, options = {}) {
  const { lead, audit } = await getLeadContext(leadId);

  const stepConfig = {
    2: { type: 'follow_up_1', label: 'Gentle follow-up with new angle', maxWords: 100 },
    3: { type: 'follow_up_2', label: 'Value-add follow-up', maxWords: 100 },
    4: { type: 'breakup', label: 'Break-up / last touch email', maxWords: 80 },
  };

  const config = stepConfig[stepNumber] || stepConfig[2];

  const prompt = buildFollowUpPrompt(lead, audit, config, options);
  const result = await callAI(prompt);
  return parseEmailResult(result, leadId, config.type, stepNumber);
}

/**
 * Generate WhatsApp draft
 */
async function generateWhatsAppDraft(leadId) {
  const { lead, audit } = await getLeadContext(leadId);

  const prompt = `Based on this business data, write a short WhatsApp message (30-60 words max).

## Business Context:
${buildContextBlock(lead, audit)}

## WhatsApp Message Requirements:
- Maximum 60 words
- Conversational, friendly tone
- Mention 1 specific observation about their business
- Include a soft question/CTA
- Can use 1-2 emoji if appropriate
- No formal greeting — WhatsApp is casual
- No compliance footer needed for WhatsApp

## Response format (JSON):
{
  "message": "<the WhatsApp message text>",
  "tone": "friendly|professional|curious"
}`;

  const result = await callAI(prompt);
  try {
    const parsed = JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || '{}');
    return {
      leadId,
      channel: 'whatsapp',
      message: parsed.message || '',
      whatsappLink: lead.phone ? `https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(parsed.message || '')}` : null,
    };
  } catch {
    return { leadId, channel: 'whatsapp', message: result, whatsappLink: null };
  }
}

/**
 * Generate call opener script
 */
async function generateCallScript(leadId) {
  const { lead, audit } = await getLeadContext(leadId);

  const prompt = `Write a brief phone call opening script (2-3 sentences) for calling this business.

## Business Context:
${buildContextBlock(lead, audit)}

## Requirements:
- 2-3 sentences only
- Introduce yourself briefly
- Mention ONE specific observation
- Ask permission to continue talking
- Be warm and professional

## Response format (JSON):
{
  "opener": "<the call opening script>",
  "objection_responses": {
    "not_interested": "<response to 'not interested'>",
    "no_budget": "<response to 'we don't have budget'>",
    "already_working_with_someone": "<response to 'we already have a web person'>",
    "send_info": "<response to 'send me more info'>"
  }
}`;

  const result = await callAI(prompt);
  try {
    return JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || '{}');
  } catch {
    return { opener: result, objection_responses: {} };
  }
}

/**
 * Generate full 4-step email sequence
 */
async function generateFullSequence(leadId, options = {}) {
  const steps = [];

  // Step 1: Cold email
  steps.push(await generateColdEmail(leadId, options));

  // Steps 2-4: Follow-ups
  for (let step = 2; step <= 4; step++) {
    steps.push(await generateFollowUp(leadId, step, options));
    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  return { leadId, steps };
}

/**
 * Generate subject line variants for A/B testing
 */
async function generateSubjectVariants(leadId, count = 3) {
  const { lead, audit } = await getLeadContext(leadId);

  const prompt = `Generate ${count} different email subject lines for reaching out to this business about web design services.

## Business Context:
${buildContextBlock(lead, audit)}

## Requirements:
- 5-10 words each
- Each subject should use a DIFFERENT angle
- Never use spam words or ALL CAPS
- Don't include "Re:" or fake reply prefixes
- Make them curiosity-driven or value-driven

## Response format (JSON):
{
  "subjects": [
    {"text": "<subject 1>", "angle": "<angle used>"},
    {"text": "<subject 2>", "angle": "<angle used>"},
    {"text": "<subject 3>", "angle": "<angle used>"}
  ]
}`;

  const result = await callAI(prompt);
  try {
    return JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || '{"subjects":[]}');
  } catch {
    return { subjects: [{ text: `Quick thought about ${lead.business_name}'s website`, angle: 'general' }] };
  }
}

// ══════════════════════════════════════════════════════════
// ── INTERNAL HELPERS ─────────────────────────────────────
// ══════════════════════════════════════════════════════════

async function getLeadContext(leadId) {
  const leads = await query('SELECT * FROM leads WHERE id = ?', [leadId]);
  if (!leads.length) throw new Error(`Lead ${leadId} not found`);

  const audits = await query(
    'SELECT * FROM website_audits WHERE lead_id = ? ORDER BY audited_at DESC LIMIT 1',
    [leadId]
  );

  return { lead: leads[0], audit: audits[0] || null };
}

function buildContextBlock(lead, audit) {
  const lines = [
    `Business: ${lead.business_name || 'Unknown'}`,
    `Industry: ${lead.category || 'Unknown'}`,
    `Location: ${[lead.city, lead.state_province, lead.country].filter(Boolean).join(', ') || 'Unknown'}`,
    `Rating: ${lead.rating || 'N/A'} (${lead.review_count || 0} reviews)`,
    `Has Website: ${lead.has_website ? 'Yes' : 'No'}`,
  ];

  if (lead.website || lead.website_url || lead.maps_website) {
    lines.push(`Website: ${lead.website || lead.website_url || lead.maps_website}`);
  }

  if (audit) {
    lines.push(`Website Classification: ${audit.classification || 'Unknown'}`);
    lines.push(`Audit Score: ${audit.overall_score || 0}/100`);

    const reasons = typeof audit.top_redesign_reasons === 'string'
      ? JSON.parse(audit.top_redesign_reasons) : (audit.top_redesign_reasons || []);
    if (reasons.length > 0) {
      lines.push(`Redesign Reasons: ${reasons.join('; ')}`);
    }

    if (audit.opportunity_summary) {
      lines.push(`Opportunity: ${audit.opportunity_summary}`);
    }

    if (audit.best_outreach_angle) {
      lines.push(`Best Angle: ${audit.best_outreach_angle}`);
    }

    // Factor observations
    const factors = typeof audit.factor_scores === 'string'
      ? JSON.parse(audit.factor_scores) : (audit.factor_scores || {});
    const lowFactors = Object.entries(factors)
      .filter(([_, v]) => v.score < 5)
      .map(([k, v]) => `${k}: ${v.observation}`);
    if (lowFactors.length > 0) {
      lines.push(`Weak Areas: ${lowFactors.slice(0, 3).join('; ')}`);
    }
  } else {
    lines.push('Website Classification: Not audited yet');
  }

  return lines.join('\n');
}

function buildEmailPrompt(lead, audit, config) {
  return `Write a personalized cold outreach email for a web design agency.

## Business Context:
${buildContextBlock(lead, audit)}

## Email Requirements:
- Type: First-touch cold email
- Word count: 80–150 words (body only, excluding signature)
- Include: subject line + email body + signature
- Use the "${audit?.best_outreach_angle || 'growth-potential'}" angle
- Reference at most 3 genuine observations from the data
- End with a soft CTA (question, not demand)
- Sender: ${config.senderName} from ${config.agencyName}
${config.calendarLink ? `- Include calendar link: ${config.calendarLink}` : ''}

## Response format (JSON):
{
  "subject": "<email subject line>",
  "body": "<full email body with greeting and CTA>",
  "signature": "${config.senderName}\\n${config.agencyName}",
  "plain_text": "<plain text version>",
  "personalization_points": ["<what we personalized>"],
  "angle_used": "<outreach angle>",
  "tone": "consultative|direct|curious"
}`;
}

function buildFollowUpPrompt(lead, audit, config, options) {
  return `Write a follow-up email (step ${config.type}) for a web design agency outreach sequence.

## Business Context:
${buildContextBlock(lead, audit)}

## Follow-Up Requirements:
- Type: ${config.label}
- Word count: maximum ${config.maxWords} words
- This is follow-up #${config.type.includes('breakup') ? '3 (final touch)' : config.type.slice(-1)}
- Do NOT repeat the same points from initial email
- ${config.type === 'breakup' ? 'Be gracious, leave the door open, no pressure' : 'Bring a new angle or value'}
- Keep it shorter than the initial email

## Response format (JSON):
{
  "subject": "<follow-up subject line>",
  "body": "<email body>",
  "plain_text": "<plain text version>",
  "angle_used": "<angle>"
}`;
}

function parseEmailResult(aiResult, leadId, type, step) {
  try {
    const parsed = JSON.parse(aiResult.match(/\{[\s\S]*\}/)?.[0] || '{}');
    return {
      leadId,
      type,
      step,
      subject: parsed.subject || '',
      body: parsed.body || '',
      plainText: parsed.plain_text || parsed.body || '',
      personalizationPoints: parsed.personalization_points || [],
      angleUsed: parsed.angle_used || '',
      tone: parsed.tone || 'consultative',
    };
  } catch {
    return {
      leadId, type, step,
      subject: 'Quick thought about your online presence',
      body: aiResult,
      plainText: aiResult,
      personalizationPoints: [],
      angleUsed: 'general',
      tone: 'consultative',
    };
  }
}

async function callAI(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[AI] No API key — using fallback template');
    return '{"subject":"Quick thought about your online presence","body":"Hi there,\\n\\nI noticed your business online and wanted to reach out...","plain_text":"Hi there..."}';
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: process.env.PERSONALIZATION_AI_MODEL || 'claude-haiku-4-20250414',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0]?.text || '';
  } catch (err) {
    console.error('[AI] Generation error:', err.message);
    throw err;
  }
}

module.exports = {
  generateColdEmail,
  generateFollowUp,
  generateWhatsAppDraft,
  generateCallScript,
  generateFullSequence,
  generateSubjectVariants,
};
