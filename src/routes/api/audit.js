/**
 * OpenClaw — Audit API Routes
 * Website audit engine endpoints
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { query, execute } = require('../../config/database');
const { auditWebsite, getAuditForLead, batchAudit } = require('../../services/audit/websiteAuditEngine');

/**
 * POST /api/audit/run/:leadId
 * Run AI audit on a single lead's website
 */
router.post('/run/:leadId', auth, async (req, res) => {
  try {
    const { leadId } = req.params;
    const result = await auditWebsite(parseInt(leadId));
    res.json({ success: true, audit: result });
  } catch (err) {
    console.error('[AUDIT] Run error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/audit/batch
 * Batch audit multiple leads (SSE for progress)
 */
router.post('/batch', auth, async (req, res) => {
  try {
    const { leadIds } = req.body;
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds array required' });
    }

    // Limit batch size
    const limited = leadIds.slice(0, 50);
    const results = await batchAudit(limited);
    res.json({ success: true, results, total: limited.length });
  } catch (err) {
    console.error('[AUDIT] Batch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/audit/lead/:leadId
 * Get audit results for a specific lead
 */
router.get('/lead/:leadId', auth, async (req, res) => {
  try {
    const audits = await query(
      'SELECT * FROM website_audits WHERE lead_id = ? ORDER BY audited_at DESC',
      [parseInt(req.params.leadId)]
    );

    // Parse JSON fields
    for (const audit of audits) {
      try { audit.factor_scores = JSON.parse(audit.factor_scores); } catch {}
      try { audit.top_redesign_reasons = JSON.parse(audit.top_redesign_reasons); } catch {}
      try { audit.outreach_angles = JSON.parse(audit.outreach_angles); } catch {}
      try { audit.tech_stack = JSON.parse(audit.tech_stack); } catch {}
      try { audit.lighthouse_scores = JSON.parse(audit.lighthouse_scores); } catch {}
    }

    res.json({ audits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/audit/queue
 * Get leads pending audit
 */
router.get('/queue', auth, async (req, res) => {
  try {
    const { page = 1, limit = 25, classification } = req.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE (audit_classification = "unaudited" OR audit_classification IS NULL)';
    const params = [];

    if (classification && classification !== 'all') {
      where = 'WHERE audit_classification = ?';
      params.push(classification);
    }

    const leads = await query(
      `SELECT id, business_name, category, city, country, rating, review_count,
              website, website_domain, has_website, website_status,
              audit_classification, audit_score, lead_score, stage
       FROM leads ${where}
       ORDER BY rating DESC, review_count DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [{ total }] = await query(
      `SELECT COUNT(*) as total FROM leads ${where}`,
      params
    );

    res.json({ leads, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/audit/stats
 * Audit statistics
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        COUNT(*) as total_leads,
        SUM(CASE WHEN audit_classification = 'none' THEN 1 ELSE 0 END) as no_website,
        SUM(CASE WHEN audit_classification = 'outdated' THEN 1 ELSE 0 END) as outdated,
        SUM(CASE WHEN audit_classification = 'average' THEN 1 ELSE 0 END) as average,
        SUM(CASE WHEN audit_classification = 'strong' THEN 1 ELSE 0 END) as strong,
        SUM(CASE WHEN audit_classification = 'unaudited' OR audit_classification IS NULL THEN 1 ELSE 0 END) as unaudited,
        AVG(CASE WHEN audit_score > 0 THEN audit_score ELSE NULL END) as avg_score
      FROM leads
    `);

    res.json({ stats: stats[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/audit/batch-sse
 * Batch audit with SSE progress streaming
 */
router.get('/batch-sse', auth, async (req, res) => {
  const leadIds = (req.query.ids || '').split(',').map(Number).filter(Boolean);
  if (!leadIds.length) return res.status(400).json({ error: 'ids parameter required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    for (let i = 0; i < leadIds.length; i++) {
      send({ type: 'progress', current: i + 1, total: leadIds.length, leadId: leadIds[i] });
      try {
        const result = await auditWebsite(leadIds[i]);
        send({ type: 'result', leadId: leadIds[i], audit: result });
      } catch (err) {
        send({ type: 'error', leadId: leadIds[i], error: err.message });
      }
      // Rate limit
      if (i < leadIds.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    send({ type: 'done', total: leadIds.length });
  } catch (err) {
    send({ type: 'error', error: err.message });
  }

  res.end();
});

module.exports = router;
