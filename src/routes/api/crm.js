/**
 * OpenClaw — CRM Pipeline API Routes
 * Lead management, stage transitions, notes, tasks
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { query, execute } = require('../../config/database');

// ── Pipeline Stages ──────────────────────────────────────
const STAGES = [
  { key: 'new', label: 'New Lead', color: '#8d8d8d', order: 1 },
  { key: 'enriched', label: 'Enriched', color: '#0043ce', order: 2 },
  { key: 'qualified', label: 'Qualified', color: '#198038', order: 3 },
  { key: 'ready_to_contact', label: 'Ready to Contact', color: '#005d5d', order: 4 },
  { key: 'contacted', label: 'Contacted', color: '#8a3ffc', order: 5 },
  { key: 'replied', label: 'Replied', color: '#ba4e00', order: 6 },
  { key: 'interested', label: 'Interested', color: '#d2a106', order: 7 },
  { key: 'meeting_booked', label: 'Meeting Booked', color: '#1192e8', order: 8 },
  { key: 'proposal_sent', label: 'Proposal Sent', color: '#6929c4', order: 9 },
  { key: 'won', label: 'Won', color: '#24a148', order: 10 },
  { key: 'lost', label: 'Lost', color: '#da1e28', order: 11 },
  { key: 'do_not_contact', label: 'Do Not Contact', color: '#161616', order: 12 },
];

/**
 * GET /api/crm/stages
 * Get pipeline stage definitions
 */
router.get('/stages', auth, (req, res) => {
  res.json({ stages: STAGES });
});

/**
 * GET /api/crm/pipeline
 * Get leads grouped by stage (kanban data)
 */
router.get('/pipeline', auth, async (req, res) => {
  try {
    const { niche, country, assignedTo, minScore, maxResults = 200 } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (niche) { where += ' AND category LIKE ?'; params.push(`%${niche}%`); }
    if (country) { where += ' AND country = ?'; params.push(country); }
    if (assignedTo) { where += ' AND assigned_to = ?'; params.push(parseInt(assignedTo)); }
    if (minScore) { where += ' AND lead_score >= ?'; params.push(parseInt(minScore)); }

    const leads = await query(
      `SELECT l.id, l.business_name, l.category, l.city, l.country, l.rating,
              l.review_count, l.email, l.phone, l.has_website, l.website_status,
              l.audit_classification, l.audit_score, l.lead_score, l.lead_priority,
              l.stage, l.tags, l.assigned_to, l.deal_value,
              l.last_contacted_at, l.updated_at,
              u.full_name as assigned_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       ${where}
       ORDER BY l.lead_score DESC
       LIMIT ?`,
      [...params, parseInt(maxResults)]
    );

    // Group by stage
    const pipeline = {};
    for (const stage of STAGES) {
      pipeline[stage.key] = [];
    }
    for (const lead of leads) {
      const stageKey = lead.stage || 'new';
      if (pipeline[stageKey]) {
        try { lead.tags = JSON.parse(lead.tags); } catch { lead.tags = []; }
        pipeline[stageKey].push(lead);
      }
    }

    // Stage counts
    const counts = {};
    for (const [key, arr] of Object.entries(pipeline)) {
      counts[key] = arr.length;
    }

    res.json({ pipeline, counts, stages: STAGES });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/crm/stage/:leadId
 * Move lead to a new stage
 */
router.put('/stage/:leadId', auth, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { stage } = req.body;

    if (!STAGES.find(s => s.key === stage)) {
      return res.status(400).json({ error: 'Invalid stage' });
    }

    // Get current stage for logging
    const lead = await query('SELECT stage, business_name FROM leads WHERE id = ?', [parseInt(leadId)]);
    if (!lead.length) return res.status(404).json({ error: 'Lead not found' });

    const oldStage = lead[0].stage;

    await execute('UPDATE leads SET stage = ?, updated_at = NOW() WHERE id = ?', [stage, parseInt(leadId)]);

    // Log activity
    await execute(
      `INSERT INTO activity_logs (lead_id, user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, 'stage.changed', 'lead', ?, ?)`,
      [
        parseInt(leadId),
        req.user?.id || null,
        parseInt(leadId),
        JSON.stringify({ from: oldStage, to: stage, business: lead[0].business_name }),
      ]
    );

    // Auto-actions on stage change
    if (stage === 'do_not_contact') {
      // Add to suppression list
      const leadData = await query('SELECT email FROM leads WHERE id = ?', [parseInt(leadId)]);
      if (leadData[0]?.email) {
        await execute(
          'INSERT IGNORE INTO suppression_list (type, value, reason, source) VALUES (?, ?, ?, ?)',
          ['email', leadData[0].email, 'Marked as DNC', 'manual']
        );
      }
    }

    res.json({ success: true, oldStage, newStage: stage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/crm/assign/:leadId
 * Assign lead to a user
 */
router.put('/assign/:leadId', auth, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { userId } = req.body;

    await execute('UPDATE leads SET assigned_to = ?, updated_at = NOW() WHERE id = ?',
      [userId || null, parseInt(leadId)]);

    await execute(
      `INSERT INTO activity_logs (lead_id, user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, 'lead.assigned', 'lead', ?, ?)`,
      [parseInt(leadId), req.user?.id, parseInt(leadId), JSON.stringify({ assigned_to: userId })]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/crm/deal-value/:leadId
 * Update lead deal value
 */
router.put('/deal-value/:leadId', auth, async (req, res) => {
  try {
    const { dealValue } = req.body;
    await execute('UPDATE leads SET deal_value = ?, updated_at = NOW() WHERE id = ?',
      [dealValue || 0, parseInt(req.params.leadId)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/crm/lead/:leadId
 * Full lead detail page data
 */
router.get('/lead/:leadId', auth, async (req, res) => {
  try {
    const leadId = parseInt(req.params.leadId);

    // Get lead
    const leads = await query('SELECT l.*, u.full_name as assigned_name FROM leads l LEFT JOIN users u ON l.assigned_to = u.id WHERE l.id = ?', [leadId]);
    if (!leads.length) return res.status(404).json({ error: 'Lead not found' });
    const lead = leads[0];
    try { lead.tags = JSON.parse(lead.tags); } catch { lead.tags = []; }

    // Get audit
    const audits = await query(
      'SELECT * FROM website_audits WHERE lead_id = ? ORDER BY audited_at DESC LIMIT 1',
      [leadId]
    );
    const audit = audits[0] || null;
    if (audit) {
      try { audit.factor_scores = JSON.parse(audit.factor_scores); } catch {}
      try { audit.top_redesign_reasons = JSON.parse(audit.top_redesign_reasons); } catch {}
      try { audit.outreach_angles = JSON.parse(audit.outreach_angles); } catch {}
      try { audit.tech_stack = JSON.parse(audit.tech_stack); } catch {}
    }

    // Get contacts
    const contacts = await query('SELECT * FROM lead_contacts WHERE lead_id = ? ORDER BY is_primary DESC', [leadId]);

    // Get outreach history
    const messages = await query(
      `SELECT * FROM outreach_messages WHERE lead_id = ? ORDER BY created_at DESC LIMIT 20`,
      [leadId]
    );

    // Get notes
    const notes = await query(
      `SELECT n.*, u.full_name as author FROM notes n LEFT JOIN users u ON n.user_id = u.id
       WHERE n.lead_id = ? ORDER BY n.is_pinned DESC, n.created_at DESC`,
      [leadId]
    );

    // Get tasks
    const tasks = await query(
      `SELECT t.*, u.full_name as assigned_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.lead_id = ? ORDER BY t.due_at ASC`,
      [leadId]
    );

    // Get activity timeline
    const timeline = await query(
      `SELECT a.*, u.full_name as user_name FROM activity_logs a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.lead_id = ? ORDER BY a.created_at DESC LIMIT 30`,
      [leadId]
    );

    // Get score breakdown
    const scores = await query('SELECT * FROM lead_scores WHERE lead_id = ?', [leadId]);
    const scoreData = scores[0] || null;
    if (scoreData) {
      try { scoreData.scoring_factors = JSON.parse(scoreData.scoring_factors); } catch {}
    }

    res.json({
      lead,
      audit,
      contacts,
      messages,
      notes,
      tasks,
      timeline,
      scores: scoreData,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/crm/notes/:leadId
 * Add a note to a lead
 */
router.post('/notes/:leadId', auth, async (req, res) => {
  try {
    const { content, isPinned } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });

    const result = await execute(
      'INSERT INTO notes (lead_id, user_id, content, is_pinned) VALUES (?, ?, ?, ?)',
      [parseInt(req.params.leadId), req.user?.id || null, content, isPinned ? 1 : 0]
    );

    await execute(
      `INSERT INTO activity_logs (lead_id, user_id, action, entity_type, entity_id)
       VALUES (?, ?, 'note.created', 'note', ?)`,
      [parseInt(req.params.leadId), req.user?.id, result.insertId]
    );

    res.json({ success: true, noteId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/crm/tasks/:leadId
 * Create a task for a lead
 */
router.post('/tasks/:leadId', auth, async (req, res) => {
  try {
    const { title, description, type, priority, dueAt, assignedTo } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const result = await execute(
      `INSERT INTO tasks (lead_id, assigned_to, created_by, title, description, type, priority, due_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parseInt(req.params.leadId),
        assignedTo || req.user?.id || null,
        req.user?.id || null,
        title, description || null,
        type || 'follow_up',
        priority || 'medium',
        dueAt || null,
      ]
    );

    res.json({ success: true, taskId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/crm/tasks/:taskId/complete
 * Complete a task
 */
router.put('/tasks/:taskId/complete', auth, async (req, res) => {
  try {
    await execute(
      'UPDATE tasks SET status = ?, completed_at = NOW() WHERE id = ?',
      ['completed', parseInt(req.params.taskId)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/crm/tags/:leadId
 * Update lead tags
 */
router.put('/tags/:leadId', auth, async (req, res) => {
  try {
    const { tags } = req.body;
    await execute('UPDATE leads SET tags = ?, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(tags || []), parseInt(req.params.leadId)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/crm/forecast
 * Deal pipeline forecast
 */
router.get('/forecast', auth, async (req, res) => {
  try {
    const forecast = await query(`
      SELECT
        stage,
        COUNT(*) as lead_count,
        COALESCE(SUM(deal_value), 0) as total_value,
        COALESCE(AVG(deal_value), 0) as avg_value
      FROM leads
      WHERE stage IN ('interested', 'meeting_booked', 'proposal_sent', 'won')
        AND deal_value > 0
      GROUP BY stage
    `);

    const totalPipeline = await query(`
      SELECT COALESCE(SUM(deal_value), 0) as pipeline_value
      FROM leads WHERE stage NOT IN ('won', 'lost', 'do_not_contact') AND deal_value > 0
    `);

    const totalWon = await query(`
      SELECT COALESCE(SUM(deal_value), 0) as won_value, COUNT(*) as won_count
      FROM leads WHERE stage = 'won' AND deal_value > 0
    `);

    res.json({
      forecast,
      pipelineValue: totalPipeline[0]?.pipeline_value || 0,
      wonValue: totalWon[0]?.won_value || 0,
      wonCount: totalWon[0]?.won_count || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
