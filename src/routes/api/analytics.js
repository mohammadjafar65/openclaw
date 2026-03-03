/**
 * OpenClaw — Analytics API Routes
 * Comprehensive dashboard metrics, funnel data, charts
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { query } = require('../../config/database');

/**
 * GET /api/analytics/overview
 * Main dashboard KPIs
 */
router.get('/overview', auth, async (req, res) => {
  try {
    const { dateFrom, dateTo, niche, country } = req.query;

    let dateFilter = '';
    const params = [];
    if (dateFrom && dateTo) {
      dateFilter = ' AND l.created_at BETWEEN ? AND ?';
      params.push(dateFrom, dateTo);
    }

    // KPI queries
    const [kpis] = await query(`
      SELECT
        COUNT(*) as total_leads,
        SUM(CASE WHEN email IS NOT NULL AND email != '' THEN 1 ELSE 0 END) as enriched_leads,
        SUM(CASE WHEN email_confidence >= 80 THEN 1 ELSE 0 END) as verified_emails,
        SUM(CASE WHEN has_website = 0 OR website_status = 'none' OR audit_classification = 'none' THEN 1 ELSE 0 END) as no_website,
        SUM(CASE WHEN audit_classification IN ('outdated', 'average') AND audit_score < 50 THEN 1 ELSE 0 END) as redesign_opportunities,
        SUM(CASE WHEN lead_priority = 'hot' THEN 1 ELSE 0 END) as hot_leads,
        SUM(CASE WHEN lead_priority = 'warm' THEN 1 ELSE 0 END) as warm_leads,
        SUM(CASE WHEN stage = 'won' THEN 1 ELSE 0 END) as deals_won,
        COALESCE(SUM(CASE WHEN stage = 'won' THEN deal_value ELSE 0 END), 0) as revenue_won,
        AVG(CASE WHEN lead_score > 0 THEN lead_score ELSE NULL END) as avg_lead_score
      FROM leads l
      WHERE 1=1 ${dateFilter}
    `, params);

    // Campaign stats
    const [campaignStats] = await query(`
      SELECT
        COUNT(*) as total_campaigns,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_campaigns,
        COALESCE(SUM(total_sent), 0) as total_sent,
        COALESCE(SUM(total_opened), 0) as total_opened,
        COALESCE(SUM(total_replied), 0) as total_replied,
        COALESCE(SUM(total_bounced), 0) as total_bounced
      FROM campaigns
    `);

    // Calculate rates
    const sent = campaignStats.total_sent || 0;
    const openRate = sent > 0 ? Math.round((campaignStats.total_opened / sent) * 100) : 0;
    const replyRate = sent > 0 ? Math.round((campaignStats.total_replied / sent) * 100) : 0;
    const bounceRate = sent > 0 ? Math.round((campaignStats.total_bounced / sent) * 100) : 0;

    res.json({
      kpis: {
        ...kpis,
        ...campaignStats,
        open_rate: openRate,
        reply_rate: replyRate,
        bounce_rate: bounceRate,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/funnel
 * Lead funnel data (Discovered → Enriched → Qualified → Contacted → Replied → Won)
 */
router.get('/funnel', auth, async (req, res) => {
  try {
    const stages = await query(`
      SELECT stage, COUNT(*) as count FROM leads GROUP BY stage ORDER BY
        FIELD(stage, 'new', 'enriched', 'qualified', 'ready_to_contact', 'contacted',
              'replied', 'interested', 'meeting_booked', 'proposal_sent', 'won', 'lost', 'do_not_contact')
    `);

    res.json({ funnel: stages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/audit-distribution
 * Audit classification distribution
 */
router.get('/audit-distribution', auth, async (req, res) => {
  try {
    const distribution = await query(`
      SELECT audit_classification as classification, COUNT(*) as count
      FROM leads
      WHERE audit_classification IS NOT NULL
      GROUP BY audit_classification
    `);

    res.json({ distribution });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/discovery-trend
 * Leads discovered per day/week
 */
router.get('/discovery-trend', auth, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;

    const trend = await query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM leads
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [days]);

    res.json({ trend, period });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/niche-breakdown
 * Lead distribution by niche/category
 */
router.get('/niche-breakdown', auth, async (req, res) => {
  try {
    const niches = await query(`
      SELECT
        COALESCE(category, 'Unknown') as niche,
        COUNT(*) as total_leads,
        SUM(CASE WHEN email IS NOT NULL AND email != '' THEN 1 ELSE 0 END) as with_email,
        SUM(CASE WHEN audit_classification IN ('none', 'outdated') THEN 1 ELSE 0 END) as opportunities,
        AVG(CASE WHEN lead_score > 0 THEN lead_score ELSE NULL END) as avg_score,
        SUM(CASE WHEN stage = 'won' THEN 1 ELSE 0 END) as won
      FROM leads
      GROUP BY category
      ORDER BY total_leads DESC
      LIMIT 20
    `);

    res.json({ niches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/geo-breakdown
 * Lead distribution by country/city
 */
router.get('/geo-breakdown', auth, async (req, res) => {
  try {
    const geo = await query(`
      SELECT
        COALESCE(country, 'Unknown') as country,
        COALESCE(city, 'Unknown') as city,
        COUNT(*) as total_leads,
        SUM(CASE WHEN audit_classification IN ('none', 'outdated') THEN 1 ELSE 0 END) as opportunities,
        AVG(lead_score) as avg_score
      FROM leads
      GROUP BY country, city
      ORDER BY total_leads DESC
      LIMIT 30
    `);

    res.json({ geo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/campaign-performance
 * Per-campaign metrics
 */
router.get('/campaign-performance', auth, async (req, res) => {
  try {
    const campaigns = await query(`
      SELECT
        id, name, status, campaign_type,
        total_leads, total_sent, total_opened, total_replied, total_bounced,
        CASE WHEN total_sent > 0 THEN ROUND((total_opened / total_sent) * 100) ELSE 0 END as open_rate,
        CASE WHEN total_sent > 0 THEN ROUND((total_replied / total_sent) * 100) ELSE 0 END as reply_rate,
        created_at
      FROM campaigns
      ORDER BY created_at DESC
      LIMIT 20
    `);

    res.json({ campaigns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/template-performance
 * Best-performing templates
 */
router.get('/template-performance', auth, async (req, res) => {
  try {
    const templates = await query(`
      SELECT id, name, type, category, performance_score, times_used, created_at
      FROM templates
      WHERE times_used > 0
      ORDER BY performance_score DESC
      LIMIT 10
    `);

    res.json({ templates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/activity-feed
 * Recent activity timeline
 */
router.get('/activity-feed', auth, async (req, res) => {
  try {
    const { limit = 30 } = req.query;

    const activities = await query(`
      SELECT a.*, u.full_name as user_name, l.business_name
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN leads l ON a.lead_id = l.id
      ORDER BY a.created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);

    for (const act of activities) {
      try { act.details = JSON.parse(act.details); } catch {}
    }

    res.json({ activities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/pipeline-value
 * Deal value by pipeline stage
 */
router.get('/pipeline-value', auth, async (req, res) => {
  try {
    const stages = await query(`
      SELECT
        stage,
        COUNT(*) as lead_count,
        COALESCE(SUM(deal_value), 0) as total_value
      FROM leads
      WHERE deal_value > 0
      GROUP BY stage
      ORDER BY FIELD(stage, 'interested', 'meeting_booked', 'proposal_sent', 'won')
    `);

    res.json({ stages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
