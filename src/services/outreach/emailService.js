const nodemailer = require('nodemailer');
const { query, execute, queryOne } = require('../../config/database');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // cPanel shared hosting uses *.web-hosting.com cert — disable strict hostname check
      tls: {
        rejectUnauthorized: false,
      },
      pool: true,
      maxConnections: 5,
      rateDelta: 1000,
      rateLimit: 10,
    });
  }
  return transporter;
}

/**
 * Send a single email from a sequence record
 */
async function sendSequenceEmail(sequenceRecord, options = {}) {
  const { id, lead_id, subject, body } = sequenceRecord;
  const { bypass_window = false } = options;

  // Validate SMTP config upfront
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    const msg = 'SMTP not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS to your .env file and restart the app.';
    await markFailed(id, msg);
    throw new Error(msg);
  }

  // Check suppression list
  const lead = await queryOne('SELECT * FROM leads WHERE id = ?', [lead_id]);
  if (!lead || !lead.owner_email) {
    const msg = 'No valid email address for this lead';
    await markFailed(id, msg);
    throw new Error(msg);
  }

  const suppressed = await queryOne(
    'SELECT id FROM suppression_list WHERE value = ? AND type = "email"',
    [lead.owner_email]
  );
  if (suppressed) {
    const msg = 'Email is on suppression/unsubscribe list';
    await markFailed(id, msg);
    throw new Error(msg);
  }

  // Check daily send limit
  const dailyLimit = await getSetting('daily_send_limit', 40);
  const todaySent = await getDailySentCount();
  if (todaySent >= parseInt(dailyLimit)) {
    const msg = `Daily send limit (${dailyLimit}) reached. Try again tomorrow or increase limit in Settings.`;
    throw new Error(msg);
  }

  // Check send time window (skip if manual/bypass)
  if (!bypass_window) {
    const startHour = parseInt(await getSetting('send_start_hour', 9));
    const endHour   = parseInt(await getSetting('send_end_hour', 17));
    const currentHour = new Date().getHours();
    if (currentHour < startHour || currentHour >= endHour) {
      throw new Error(`Outside sending window (${startHour}:00–${endHour}:00). Use Send Now to bypass, or change hours in Settings.`);
    }
  }

  try {
    const baseUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const trackingPixel = `<img src="${baseUrl}/api/track/open/${id}" width="1" height="1" style="display:none;" alt="" />`;
    const htmlBody = textToHtml(body).replace('</body>', `${trackingPixel}</body>`);

    const mailOptions = {
      from:    `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to:      lead.owner_email,
      subject: subject,
      text:    body,
      html:    htmlBody,
      headers: {
        'X-Lead-ID': String(lead_id),
        'X-Sequence-ID': String(id),
      },
    };

    const info = await trans.sendMail(mailOptions);

    await execute(
      'UPDATE outreach_sequences SET status = "sent", sent_at = NOW(), message_id = ? WHERE id = ?',
      [info.messageId, id]
    );

    // Update lead status if this is step 1
    if (sequenceRecord.step === 1) {
      await execute(
        'UPDATE leads SET status = "outreach_active" WHERE id = ? AND status = "enriched"',
        [lead_id]
      );
    }

    console.log(`[Email] Sent to ${lead.owner_email} (seq #${id}): ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed for seq #${id}:`, err.message);
    await markFailed(id, err.message);
    return false;
  }
}

/**
 * Process all pending sequence emails due for sending
 * @param {Object} options - { stepType: 'initial' | 'followup' | 'all' }
 */
async function processPendingEmails(options = {}) {
  const { stepType = 'all' } = options;
  let stepSql = '';
  if (stepType === 'initial') stepSql = 'AND os.step = 1';
  if (stepType === 'followup') stepSql = 'AND os.step > 1';

  const pending = await query(
    `SELECT os.*, l.owner_email 
     FROM outreach_sequences os
     JOIN leads l ON os.lead_id = l.id
     WHERE os.status = 'pending'
     AND os.channel = 'email'
     AND os.send_at <= NOW()
     AND l.status NOT IN ('dnc', 'won', 'lost')
     ${stepSql}
     ORDER BY os.send_at ASC
     LIMIT 20`
  );

  let sent = 0;
  for (const seq of pending) {
    const ok = await sendSequenceEmail(seq);
    if (ok) sent++;
    await sleep(1500); // Throttle between sends
  }

  return sent;
}

async function markFailed(sequenceId, reason) {
  await execute(
    'UPDATE outreach_sequences SET status = "failed", error_msg = ? WHERE id = ?',
    [reason, sequenceId]
  );
}

async function getDailySentCount() {
  const rows = await query(
    `SELECT COUNT(*) as count FROM outreach_sequences 
     WHERE status = 'sent' AND DATE(sent_at) = CURDATE()`
  );
  return rows[0]?.count || 0;
}

async function getSetting(key, defaultVal) {
  const row = await queryOne('SELECT value FROM settings WHERE key_name = ?', [key]);
  return row?.value ?? defaultVal;
}

/**
 * Add email to global suppression / unsubscribe list
 */
async function addToSuppression(email, reason = 'opt_out') {
  await execute(
    'INSERT IGNORE INTO suppression_list (value, type, reason) VALUES (?, "email", ?)',
    [email.toLowerCase(), reason]
  );
  // Update all active sequences for this email
  await execute(
    `UPDATE outreach_sequences os
     JOIN leads l ON os.lead_id = l.id
     SET os.status = 'failed', os.error_msg = 'Suppressed: ${reason}'
     WHERE l.owner_email = ? AND os.status = 'pending'`,
    [email.toLowerCase()]
  );
  // Mark lead as DNC
  await execute(
    `UPDATE leads SET status = 'dnc' WHERE owner_email = ?`,
    [email.toLowerCase()]
  );
}

function textToHtml(text) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<html><body><p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333;">${escaped.replace(/\n\n/g, '</p><p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333;">').replace(/\n/g, '<br>')}</p></body></html>`;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { sendSequenceEmail, processPendingEmails, addToSuppression };
