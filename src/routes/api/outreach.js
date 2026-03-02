const express = require('express');
const { query, queryOne, execute } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { addToSuppression, processPendingEmails } = require('../../services/outreach/emailService');
const { processReply } = require('../../services/outreach/sequenceManager');
const { enqueue } = require('../../services/queue/jobQueue');

const router = express.Router();
router.use(authenticate);

// GET /api/outreach/sequences?lead_id=&status=&page=
router.get('/sequences', async (req, res) => {
  try {
    const { lead_id, status, page = 1, limit = 50 } = req.query;
    const conditions = ['1=1'];
    const params = [];

    if (lead_id) { conditions.push('os.lead_id = ?'); params.push(lead_id); }
    if (status)  { conditions.push('os.status = ?'); params.push(status); }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const sequences = await query(
      `SELECT os.*, l.business_name, l.owner_email
       FROM outreach_sequences os
       JOIN leads l ON os.lead_id = l.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY os.send_at ASC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ sequences });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/outreach/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        COUNT(*) as total_sequences,
        SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status='opened' THEN 1 ELSE 0 END) as opened,
        SUM(CASE WHEN status='replied' THEN 1 ELSE 0 END) as replied,
        SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN DATE(sent_at) = CURDATE() THEN 1 ELSE 0 END) as sent_today
      FROM outreach_sequences
    `);
    res.json({ stats: stats[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/outreach/process-now — manually trigger email sending
router.post('/process-now', async (req, res) => {
  try {
    const count = await processPendingEmails();
    res.json({ message: `Processed ${count} emails` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/outreach/reply — receive inbound reply (webhook or manual)
router.post('/reply', async (req, res) => {
  try {
    const { lead_id, from_address, subject, body } = req.body;
    if (!lead_id || !body) return res.status(400).json({ error: 'lead_id and body required' });

    const result = await processReply({ lead_id, from_address, subject, body });
    res.json({ message: 'Reply processed', intent: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/outreach/replies
router.get('/replies', async (req, res) => {
  try {
    const replies = await query(
      `SELECT r.*, l.business_name, l.owner_name, l.owner_email
       FROM replies r
       JOIN leads l ON r.lead_id = l.id
       ORDER BY r.received_at DESC LIMIT 100`
    );
    res.json({ replies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/outreach/unsubscribe
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email, reason } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    await addToSuppression(email, reason || 'manual');
    res.json({ message: `${email} added to suppression list` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/outreach/sequences/clear-all — delete all sequences
router.delete('/sequences/clear-all', async (req, res) => {
  try {
    const { status } = req.query; // optional: ?status=pending or ?status=failed
    let sql = 'DELETE FROM outreach_sequences';
    const params = [];
    if (status) { sql += ' WHERE status = ?'; params.push(status); }
    const result = await execute(sql, params);
    res.json({ message: 'Cleared ' + result.affectedRows + ' email sequence(s)', deleted: result.affectedRows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/outreach/suppression
router.get('/suppression', async (req, res) => {
  try {
    const list = await query('SELECT * FROM suppression_list ORDER BY added_at DESC');
    res.json({ suppression_list: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// ── NEW OUTREACH ENDPOINTS ────────────────────────────────

// GET /api/outreach/leads-ready — leads with email, no active sequence
router.get('/leads-ready', async (req, res) => {
  try {
    const leads = await query(`
      SELECT l.id, l.business_name, l.city, l.state, l.owner_email, l.email_confidence,
             l.website_status, l.maps_website, l.website_url, l.rating, l.review_count,
             l.ai_score, l.queue_tier, l.category, l.phone,
             (SELECT COUNT(*) FROM outreach_sequences os WHERE os.lead_id = l.id) as seq_count,
             (SELECT COUNT(*) FROM outreach_sequences os WHERE os.lead_id = l.id AND os.status='sent') as sent_count
      FROM leads l
      WHERE l.owner_email IS NOT NULL AND l.owner_email != ''
      ORDER BY l.ai_score DESC, l.queue_tier ASC
    `);
    res.json({ leads });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/outreach/generate/:leadId — generate AI email sequence for one lead
router.post('/generate/:leadId', async (req, res) => {
  try {
    const lead = await queryOne('SELECT * FROM leads WHERE id = ?', [req.params.leadId]);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (!lead.owner_email) return res.status(400).json({ error: 'Lead has no email' });

    const { generateSequence } = require('../../services/outreach/templateEngine');
    const { follow_up_days = 2 } = req.body;

    // Delete any existing draft sequences
    await execute(
      'DELETE FROM outreach_sequences WHERE lead_id = ? AND status = "pending"',
      [lead.id]
    );

    const emails = await generateSequence(lead, { name: 'Web Design Outreach' });

    const sendAt = new Date();
    sendAt.setHours(10, 0, 0, 0);

    const sequences = [];
    for (const email of emails) {
      const scheduleAt = new Date(sendAt);
      scheduleAt.setDate(scheduleAt.getDate() + (email.step - 1) * parseInt(follow_up_days));

      const result = await execute(
        `INSERT INTO outreach_sequences (lead_id, channel, step, subject, body, send_at, status)
         VALUES (?, 'email', ?, ?, ?, ?, 'pending')`,
        [lead.id, email.step, email.subject, email.body, scheduleAt]
      );
      sequences.push({
        id: result.insertId,
        lead_id: lead.id,
        step: email.step,
        subject: email.subject,
        body: email.body,
        send_at: scheduleAt,
        status: 'pending',
      });
    }

    res.json({ success: true, sequences, lead });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/outreach/sequences/:id — edit subject or body
router.put('/sequences/:id', async (req, res) => {
  try {
    const { subject, body } = req.body;
    await execute(
      'UPDATE outreach_sequences SET subject = ?, body = ? WHERE id = ?',
      [subject, body, req.params.id]
    );
    const seq = await queryOne('SELECT * FROM outreach_sequences WHERE id = ?', [req.params.id]);
    res.json({ sequence: seq });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/outreach/sequences/:id/send-now — send one email immediately (bypasses time window)
router.post('/sequences/:id/send-now', async (req, res) => {
  try {
    const seq = await queryOne(
      `SELECT os.*, l.business_name, l.owner_email, l.owner_name, l.website_status,
              l.maps_website, l.website_url, l.city, l.rating, l.review_count
       FROM outreach_sequences os JOIN leads l ON os.lead_id = l.id WHERE os.id = ?`,
      [req.params.id]
    );
    if (!seq) return res.status(404).json({ error: 'Sequence not found' });
    if (seq.status === 'sent') return res.status(400).json({ error: 'This email was already sent' });

    const { sendSequenceEmail } = require('../../services/outreach/emailService');
    await sendSequenceEmail(seq, { bypass_window: true });
    res.json({ success: true, message: 'Email sent to ' + seq.owner_email });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/outreach/send-all-step1 — send Step 1 to all leads with pending sequences
router.post('/send-all-step1', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  res.json({ message: 'Bulk send started', sessionId });

  function sse(type, data) {
    const client = global.emailSseClients && global.emailSseClients.get(sessionId);
    if (client) { try { client.write('data: ' + JSON.stringify(Object.assign({ type }, data)) + '\n\n'); } catch(e) {} }
  }

  try {
    const { sendSequenceEmail } = require('../../services/outreach/emailService');
    const pending = await query(
      `SELECT os.*, l.business_name, l.owner_email, l.owner_name, l.website_status,
              l.maps_website, l.website_url, l.city, l.rating, l.review_count
       FROM outreach_sequences os JOIN leads l ON os.lead_id = l.id
       WHERE os.step = 1 AND os.status = 'pending'
       ORDER BY l.ai_score DESC`
    );

    sse('start', { message: 'Sending Step 1 to ' + pending.length + ' leads...', total: pending.length });
    let sent = 0, failed = 0;

    for (let i = 0; i < pending.length; i++) {
      const seq = pending[i];
      sse('progress', { current: i + 1, total: pending.length, lead_name: seq.business_name, stats: { sent, failed } });
      try {
        await sendSequenceEmail(seq, { bypass_window: true });
        sent++;
        sse('sent', { lead_name: seq.business_name, email: seq.owner_email, stats: { sent, failed } });
        await new Promise(r => setTimeout(r, 1500)); // 1.5s between sends
      } catch(err) {
        failed++;
        sse('failed', { lead_name: seq.business_name, reason: err.message, stats: { sent, failed } });
        if (err.message.includes('SMTP not configured') || err.message.includes('Daily send limit')) break;
      }
    }

    sse('complete', { message: 'Done! Sent ' + sent + ', failed ' + failed, stats: { sent, failed, total: pending.length } });
  } catch(err) {
    sse('error', { message: err.message });
  }
});

// DELETE /api/outreach/sequences/:id
router.delete('/sequences/:id', async (req, res) => {
  try {
    await execute('DELETE FROM outreach_sequences WHERE id = ? AND status = "pending"', [req.params.id]);
    res.json({ message: 'Sequence step deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/outreach/pipeline — full pipeline grouped by lead
router.get('/pipeline', async (req, res) => {
  try {
    const sequences = await query(`
      SELECT os.id, os.lead_id, os.step, os.subject, os.body, os.status,
             os.send_at, os.sent_at, os.error_msg,
             l.business_name, l.owner_email, l.website_status, l.city, l.queue_tier, l.ai_score
      FROM outreach_sequences os
      JOIN leads l ON os.lead_id = l.id
      ORDER BY l.ai_score DESC, os.lead_id, os.step ASC
      LIMIT 500
    `);

    // Group by lead
    const grouped = {};
    for (const s of sequences) {
      if (!grouped[s.lead_id]) {
        grouped[s.lead_id] = {
          lead_id: s.lead_id,
          business_name: s.business_name,
          owner_email: s.owner_email,
          city: s.city,
          website_status: s.website_status,
          queue_tier: s.queue_tier,
          ai_score: s.ai_score,
          steps: [],
        };
      }
      grouped[s.lead_id].steps.push(s);
    }

    res.json({ pipeline: Object.values(grouped) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
