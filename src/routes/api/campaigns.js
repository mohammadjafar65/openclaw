const express = require('express');
const { query, queryOne, execute } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { enqueue } = require('../../services/queue/jobQueue');

const router = express.Router();
router.use(authenticate);

// GET /api/campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await query(
      `SELECT c.*, 
        COUNT(DISTINCT l.id) as lead_count,
        SUM(CASE WHEN l.status = 'won' THEN 1 ELSE 0 END) as won_count,
        SUM(CASE WHEN l.status = 'meeting_booked' THEN 1 ELSE 0 END) as meetings_count
       FROM campaigns c
       LEFT JOIN leads l ON c.id = l.campaign_id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    res.json({ campaigns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campaigns/:id
router.get('/:id', async (req, res) => {
  try {
    const campaign = await queryOne(
      `SELECT c.*, COUNT(l.id) as lead_count FROM campaigns c
       LEFT JOIN leads l ON c.id = l.campaign_id
       WHERE c.id = ? GROUP BY c.id`,
      [req.params.id]
    );
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ campaign });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns
router.post('/', async (req, res) => {
  try {
    const {
      name, niche, micro_niche, region, radius_km,
      min_rating, min_reviews,
    } = req.body;

    if (!name || !niche || !region) {
      return res.status(400).json({ error: 'name, niche, and region are required' });
    }

    const result = await execute(
      `INSERT INTO campaigns (name, niche, micro_niche, region, radius_km, min_rating, min_reviews, created_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [name, niche, micro_niche || null, region, radius_km || 25,
       min_rating || 4.0, min_reviews || 25, req.user.id]
    );

    const campaign = await queryOne('SELECT * FROM campaigns WHERE id = ?', [result.insertId]);
    res.status(201).json({ campaign });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/campaigns/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, niche, micro_niche, region, radius_km, min_rating, min_reviews, status } = req.body;
    await execute(
      `UPDATE campaigns SET name=?, niche=?, micro_niche=?, region=?, radius_km=?, min_rating=?, min_reviews=?, status=?
       WHERE id = ?`,
      [name, niche, micro_niche, region, radius_km, min_rating, min_reviews, status, req.params.id]
    );
    const campaign = await queryOne('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);
    res.json({ campaign });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/start-scrape
// Enqueues a scraping job for the campaign
router.post('/:id/start-scrape', async (req, res) => {
  try {
    const campaign = await queryOne('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    await execute('UPDATE campaigns SET status = "active" WHERE id = ?', [req.params.id]);
    const jobId = await enqueue('scrape_campaign', { campaign_id: campaign.id }, { priority: 1 });

    res.json({ message: 'Scraping job queued', job_id: jobId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/start-outreach
router.post('/:id/start-outreach', async (req, res) => {
  try {
    const campaign = await queryOne('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Enqueue outreach sequence creation for all enriched leads
    const leads = await query(
      `SELECT id FROM leads WHERE campaign_id = ? AND status = 'enriched' AND owner_email IS NOT NULL`,
      [campaign.id]
    );

    for (const lead of leads) {
      await enqueue('create_sequence', { lead_id: lead.id, campaign_id: campaign.id }, { priority: 3 });
    }

    res.json({ message: `Outreach queued for ${leads.length} leads` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/campaigns/:id
router.delete('/:id', async (req, res) => {
  try {
    await execute('DELETE FROM campaigns WHERE id = ?', [req.params.id]);
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campaigns/:id/dashboard
router.get('/:id/dashboard', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Campaign Details
    const campaign = await queryOne('SELECT * FROM campaigns WHERE id = ?', [id]);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // 2. Stats
    const stats = await queryOne(`
      SELECT 
        COUNT(*) as total_leads,
        SUM(CASE WHEN status='outreach_active' THEN 1 ELSE 0 END) as active_leads,
        SUM(CASE WHEN status='replied' THEN 1 ELSE 0 END) as replied_leads,
        SUM(CASE WHEN status='won' THEN 1 ELSE 0 END) as won_leads
      FROM leads WHERE campaign_id = ?`, [id]);

    const emailStats = await queryOne(`
      SELECT 
        SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status='opened' THEN 1 ELSE 0 END) as opened,
        SUM(CASE WHEN status='replied' THEN 1 ELSE 0 END) as replied,
        SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed
      FROM outreach_sequences WHERE campaign_id = ?`, [id]);

    // 3. Leads with outreach summary
    // We want to know the *latest* status of email for each lead
    const leads = await query(`
      SELECT l.id, l.business_name, l.owner_name, l.owner_email, l.status, l.ai_score,
             (SELECT status FROM outreach_sequences os WHERE os.lead_id = l.id ORDER BY step DESC LIMIT 1) as last_email_status,
             (SELECT step FROM outreach_sequences os WHERE os.lead_id = l.id ORDER BY step DESC LIMIT 1) as current_step,
             (SELECT send_at FROM outreach_sequences os WHERE os.lead_id = l.id ORDER BY step DESC LIMIT 1) as next_email_at
      FROM leads l
      WHERE l.campaign_id = ?
      ORDER BY l.ai_score DESC
      LIMIT 100`, [id]);

    // 4. Replies
    const replies = await query(`
      SELECT r.*, l.business_name, l.owner_email 
      FROM replies r
      JOIN leads l ON r.lead_id = l.id
      WHERE l.campaign_id = ?
      ORDER BY r.received_at DESC
      LIMIT 50`, [id]);

    res.json({ campaign, stats: { ...stats, ...emailStats }, leads, replies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
