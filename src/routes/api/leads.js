const express = require('express');
const { query, queryOne, execute } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { enqueue } = require('../../services/queue/jobQueue');

const router = express.Router();
router.use(authenticate);

// GET /api/leads?campaign_id=&status=&tier=&page=&limit=
router.get('/', async (req, res) => {
  try {
    const {
      campaign_id, status, tier, queue_tier, website_status,
      page = 1, limit = 50, search,
    } = req.query;

    const conditions = ['1=1'];
    const params = [];

    if (campaign_id) { conditions.push('campaign_id = ?'); params.push(campaign_id); }
    if (status)      { conditions.push('l.status = ?'); params.push(status); }
    if (queue_tier)  { conditions.push('l.queue_tier = ?'); params.push(queue_tier); }
    if (website_status) { conditions.push('l.website_status = ?'); params.push(website_status); }
    if (search) {
      conditions.push('(l.business_name LIKE ? OR l.city LIKE ? OR l.owner_name LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = conditions.join(' AND ');

    const [leads, total] = await Promise.all([
      query(
        `SELECT l.*, c.name as campaign_name
         FROM leads l
         LEFT JOIN campaigns c ON l.campaign_id = c.id
         WHERE ${where}
         ORDER BY l.ai_score DESC, l.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
      ),
      query(`SELECT COUNT(*) as count FROM leads l WHERE ${where}`, params),
    ]);

    res.json({
      leads,
      pagination: {
        total: total[0].count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total[0].count / parseInt(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/:id
router.get('/:id', async (req, res) => {
  try {
    const lead = await queryOne(
      `SELECT l.*, c.name as campaign_name,
        (SELECT COUNT(*) FROM outreach_sequences WHERE lead_id = l.id) as sequence_count,
        (SELECT COUNT(*) FROM outreach_sequences WHERE lead_id = l.id AND status = 'sent') as emails_sent,
        (SELECT COUNT(*) FROM replies WHERE lead_id = l.id) as reply_count
       FROM leads l
       LEFT JOIN campaigns c ON l.campaign_id = c.id
       WHERE l.id = ?`,
      [req.params.id]
    );
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const sequences = await query(
      'SELECT * FROM outreach_sequences WHERE lead_id = ? ORDER BY step ASC',
      [lead.id]
    );
    const replies = await query(
      'SELECT * FROM replies WHERE lead_id = ? ORDER BY received_at DESC',
      [lead.id]
    );

    res.json({ lead, sequences, replies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leads/:id — update lead fields manually
router.put('/:id', async (req, res) => {
  try {
    const allowedFields = [
      'owner_name', 'owner_email', 'phone', 'status',
      'queue_tier', 'notes', 'ai_score',
    ];
    const updates = {};
    for (const f of allowedFields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await execute(
      `UPDATE leads SET ${setClause} WHERE id = ?`,
      [...Object.values(updates), req.params.id]
    );

    const lead = await queryOne('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    res.json({ lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/:id/find-email — crawl website to find email
router.post('/:id/find-email', async (req, res) => {
  try {
    const lead = await queryOne('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    const siteUrl = lead.website_url || lead.maps_website;
    if (!siteUrl) return res.status(400).json({ error: 'No website URL for this lead' });
    const { findEmailsFromWebsite } = require('../../services/enrichment/websiteEmailScraper');
    const result = await findEmailsFromWebsite(lead);
    if (result.best_email) {
      await execute(
        'UPDATE leads SET owner_email = ?, email_confidence = ?, email_source = ? WHERE id = ?',
        [result.best_email, result.confidence, result.source || null, lead.id]
      );
      res.json({
        success: true, email: result.best_email, confidence: result.confidence,
        all_emails: result.emails, pages_checked: result.pages_checked,
        message: 'Found: ' + result.best_email + ' (' + result.confidence + ' confidence)',
      });
    } else {
      res.json({ success: false, email: null, pages_checked: result.pages_checked,
        message: result.error || 'No emails found after checking ' + result.pages_checked + ' page(s)' });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/leads/find-emails-bulk/stream/:sessionId
router.get('/find-emails-bulk/stream/:sessionId', authenticate, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
  res.write('data: ' + JSON.stringify({ type: 'connected' }) + '\n\n');
  if (!global.emailSseClients) global.emailSseClients = new Map();
  global.emailSseClients.set(req.params.sessionId, res);
  const hb = setInterval(() => res.write('data: ' + JSON.stringify({ type: 'ping' }) + '\n\n'), 20000);
  req.on('close', () => { clearInterval(hb); global.emailSseClients && global.emailSseClients.delete(req.params.sessionId); });
});

// POST /api/leads/find-emails-bulk
router.post('/find-emails-bulk', authenticate, async (req, res) => {
  const { sessionId, campaign_id, only_missing = true, limit = 100 } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  res.json({ message: 'Bulk email search started', sessionId });

  function sse(type, data) {
    const client = global.emailSseClients && global.emailSseClients.get(sessionId);
    if (client) { try { client.write('data: ' + JSON.stringify(Object.assign({ type }, data)) + '\n\n'); } catch(e) {} }
  }

  try {
    const { findEmailsFromWebsite } = require('../../services/enrichment/websiteEmailScraper');
    const conditions = ['(website_url IS NOT NULL OR maps_website IS NOT NULL)'];
    const params = [];
    if (only_missing) conditions.push('(owner_email IS NULL OR owner_email = "")');
    if (campaign_id) { conditions.push('campaign_id = ?'); params.push(campaign_id); }
    const leads = await query(
      'SELECT id, business_name, website_url, maps_website, city FROM leads WHERE ' + conditions.join(' AND ') + ' LIMIT ?',
      [...params, parseInt(limit)]
    );
    sse('start', { message: 'Searching emails for ' + leads.length + ' leads...', total: leads.length });
    let found = 0, notFound = 0, errors = 0;
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      sse('progress', { current: i + 1, total: leads.length, lead_name: lead.business_name, stats: { found, not_found: notFound, errors } });
      try {
        const result = await findEmailsFromWebsite(lead);
        if (result.best_email) {
          await execute('UPDATE leads SET owner_email = ?, email_confidence = ?, email_source = ? WHERE id = ?',
            [result.best_email, result.confidence, result.source || null, lead.id]);
          found++;
          sse('found', { lead_id: lead.id, lead_name: lead.business_name, email: result.best_email,
            confidence: result.confidence, all_emails: result.emails, pages_checked: result.pages_checked,
            stats: { found, not_found: notFound, errors } });
        } else {
          notFound++;
          sse('not_found', { lead_id: lead.id, lead_name: lead.business_name,
            pages_checked: result.pages_checked, reason: result.error || 'No email on website',
            stats: { found, not_found: notFound, errors } });
        }
      } catch (err) { errors++; sse('error', { lead_name: lead.business_name, message: err.message }); }
      await new Promise(r => setTimeout(r, 600));
    }
    sse('complete', { message: 'Done! Found ' + found + ' of ' + leads.length + ' emails', stats: { found, not_found: notFound, errors, total: leads.length } });
  } catch (err) { sse('error', { message: err.message }); }
});

// POST /api/leads/:id/enrich — re-run enrichment on a single lead
router.post('/:id/enrich', async (req, res) => {
  try {
    const jobId = await enqueue('enrich_lead', { lead_id: parseInt(req.params.id) }, { priority: 2 });
    res.json({ message: 'Enrichment job queued', job_id: jobId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/:id/mark-won
router.post('/:id/mark-won', async (req, res) => {
  try {
    await execute('UPDATE leads SET status = "won" WHERE id = ?', [req.params.id]);
    res.json({ message: 'Lead marked as won' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/:id/mark-dnc
router.post('/:id/mark-dnc', async (req, res) => {
  try {
    await execute('UPDATE leads SET status = "dnc" WHERE id = ?', [req.params.id]);
    const { addToSuppression } = require('../../services/outreach/emailService');
    const lead = await queryOne('SELECT owner_email FROM leads WHERE id = ?', [req.params.id]);
    if (lead?.owner_email) await addToSuppression(lead.owner_email, 'manual_dnc');
    res.json({ message: 'Lead added to DNC' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    await execute('DELETE FROM leads WHERE id = ?', [req.params.id]);
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
