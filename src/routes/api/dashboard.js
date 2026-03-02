const express = require('express');
const { query, queryOne, execute } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/dashboard/overview
router.get('/overview', async (req, res) => {
  try {
    const [
      campaignStats,
      leadStats,
      outreachStats,
      recentLeads,
      recentReplies,
      dailySends,
    ] = await Promise.all([
      query(`SELECT status, COUNT(*) as count FROM campaigns GROUP BY status`),
      query(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_leads,
          SUM(CASE WHEN status = 'enriched' THEN 1 ELSE 0 END) as enriched,
          SUM(CASE WHEN status = 'outreach_active' THEN 1 ELSE 0 END) as in_outreach,
          SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied,
          SUM(CASE WHEN status = 'meeting_booked' THEN 1 ELSE 0 END) as meetings,
          SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won,
          SUM(CASE WHEN queue_tier = 'priority' THEN 1 ELSE 0 END) as priority_count,
          ROUND(AVG(ai_score),1) as avg_score
        FROM leads`
      ),
      query(`
        SELECT
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as total_sent,
          SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) as total_opened,
          SUM(CASE WHEN DATE(sent_at) = CURDATE() THEN 1 ELSE 0 END) as sent_today,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
        FROM outreach_sequences`
      ),
      query(`
        SELECT l.id, l.business_name, l.city, l.rating, l.ai_score,
               l.queue_tier, l.status, l.created_at
        FROM leads l ORDER BY l.created_at DESC LIMIT 10`
      ),
      query(`
        SELECT r.*, l.business_name FROM replies r
        JOIN leads l ON r.lead_id = l.id
        ORDER BY r.received_at DESC LIMIT 5`
      ),
      query(`
        SELECT DATE(sent_at) as date, COUNT(*) as count
        FROM outreach_sequences
        WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND status = 'sent'
        GROUP BY DATE(sent_at)
        ORDER BY date ASC`
      ),
    ]);

    const leads = leadStats[0] || {};
    const outreach = outreachStats[0] || {};

    const openRate = outreach.total_sent > 0
      ? Math.round((outreach.total_opened / outreach.total_sent) * 100)
      : 0;

    res.json({
      campaigns:     campaignStats,
      leads,
      outreach:      { ...outreach, open_rate: openRate },
      recent_leads:  recentLeads,
      recent_replies: recentReplies,
      daily_sends:   dailySends,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/pipeline
router.get('/pipeline', async (req, res) => {
  try {
    const pipeline = await query(`
      SELECT
        queue_tier,
        status,
        COUNT(*) as count,
        ROUND(AVG(ai_score), 1) as avg_score
      FROM leads
      GROUP BY queue_tier, status
      ORDER BY ai_score DESC`
    );
    res.json({ pipeline });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
