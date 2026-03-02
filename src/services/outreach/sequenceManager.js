const { execute, query, queryOne } = require('../../config/database');
const { generateSequence } = require('./templateEngine');
const { addToSuppression } = require('./emailService');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Create a full outreach sequence for a qualified lead
 * Schedules all 4 email steps at correct intervals
 */
async function createSequenceForLead(lead, campaign) {
  if (!lead.owner_email) {
    console.log(`[Sequence] Skipping lead #${lead.id} — no email`);
    return null;
  }

  // Don't create if sequence already exists
  const existing = await queryOne(
    'SELECT id FROM outreach_sequences WHERE lead_id = ? LIMIT 1',
    [lead.id]
  );
  if (existing) return null;

  // Generate all 4 emails via AI
  const emails = await generateSequence(lead, campaign);

  // Get delay schedule from settings (default: day 0, 3, 7, 14)
  const delaysRaw = await queryOne("SELECT value FROM settings WHERE key_name = 'sequence_delays_days'");
  const delays = delaysRaw ? JSON.parse(delaysRaw.value) : [0, 3, 7, 14];

  const insertedIds = [];
  for (const email of emails) {
    const delayDays = delays[email.step - 1] || (email.step - 1) * 3;
    const sendAt = new Date();
    sendAt.setDate(sendAt.getDate() + delayDays);
    // Schedule during business hours (set to 10am)
    sendAt.setHours(10, 0, 0, 0);

    const result = await execute(
      `INSERT INTO outreach_sequences 
       (lead_id, campaign_id, channel, step, subject, body, send_at, status)
       VALUES (?, ?, 'email', ?, ?, ?, ?, 'pending')`,
      [lead.id, lead.campaign_id, email.step, email.subject, email.body, sendAt]
    );
    insertedIds.push(result.insertId);
  }

  console.log(`[Sequence] Created ${emails.length} emails for lead #${lead.id} (${lead.business_name})`);
  return insertedIds;
}

/**
 * Process inbound reply — classify intent and take action
 */
async function processReply(replyData) {
  const { lead_id, from_address, subject, body } = replyData;

  const intent = await classifyReplyIntent(body, subject);

  // Store the reply
  await execute(
    `INSERT INTO replies (lead_id, from_address, subject, body, intent, ai_analysis, processed)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [lead_id, from_address, subject, body, intent.type, intent.analysis]
  );

  // Take action based on intent
  switch (intent.type) {
    case 'interested':
      await execute('UPDATE leads SET status = "replied" WHERE id = ?', [lead_id]);
      // Cancel remaining pending sequences
      await execute(
        'UPDATE outreach_sequences SET status = "failed", error_msg = "Lead replied - interested" WHERE lead_id = ? AND status = "pending"',
        [lead_id]
      );
      // TODO: Send Slack/webhook notification (add if needed)
      break;

    case 'opt_out':
      const lead = await queryOne('SELECT owner_email FROM leads WHERE id = ?', [lead_id]);
      if (lead?.owner_email) {
        await addToSuppression(lead.owner_email, 'opt_out_reply');
      }
      break;

    case 'not_now':
      // Move to 60-day re-engagement
      await execute(
        'UPDATE outreach_sequences SET send_at = DATE_ADD(NOW(), INTERVAL 60 DAY) WHERE lead_id = ? AND status = "pending"',
        [lead_id]
      );
      await execute('UPDATE leads SET status = "replied" WHERE id = ?', [lead_id]);
      break;

    case 'ooo':
      // Delay by return date or 7 days
      const returnDays = intent.returnDays || 7;
      await execute(
        `UPDATE outreach_sequences SET send_at = DATE_ADD(NOW(), INTERVAL ? DAY) WHERE lead_id = ? AND status = 'pending'`,
        [returnDays, lead_id]
      );
      break;
  }

  return intent;
}

async function classifyReplyIntent(body, subject) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return classifyBasicIntent(body);
  }

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Classify this email reply intent. Reply ONLY with JSON.

Subject: ${subject}
Body: ${body}

Return:
{
  "type": "interested" | "not_now" | "referral" | "opt_out" | "ooo" | "unknown",
  "analysis": "<one sentence summary>",
  "returnDays": <number if ooo, else null>
}`,
      }],
    });

    const text = msg.content[0].text.replace(/```json?/gi, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch {
    return classifyBasicIntent(body);
  }
}

function classifyBasicIntent(body) {
  const lower = body.toLowerCase();
  if (['unsubscribe', 'remove me', 'stop emailing', 'opt out', 'do not contact'].some(k => lower.includes(k))) {
    return { type: 'opt_out', analysis: 'Opt-out request detected' };
  }
  if (['out of office', 'ooo', 'on vacation', 'return on', 'back on'].some(k => lower.includes(k))) {
    return { type: 'ooo', analysis: 'Out of office', returnDays: 7 };
  }
  if (['yes', 'interested', 'tell me more', 'sounds good', 'schedule', 'call'].some(k => lower.includes(k))) {
    return { type: 'interested', analysis: 'Positive response detected' };
  }
  if (['not now', 'not interested', 'maybe later', 'not right time'].some(k => lower.includes(k))) {
    return { type: 'not_now', analysis: 'Not interested at this time' };
  }
  return { type: 'unknown', analysis: 'Intent unclear' };
}

module.exports = { createSequenceForLead, processReply };
