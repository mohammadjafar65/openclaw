/**
 * OpenClaw — Compliance & Suppression API Routes
 * Suppression list management, opt-out, source traceability
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { query, execute } = require('../../config/database');

/**
 * GET /api/compliance/suppression
 * Get suppression list with pagination and search
 */
router.get('/suppression', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, search } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];

    if (type && type !== 'all') { where += ' AND type = ?'; params.push(type); }
    if (search) { where += ' AND value LIKE ?'; params.push(`%${search}%`); }

    const items = await query(
      `SELECT s.*, u.full_name as added_by_name
       FROM suppression_list s
       LEFT JOIN users u ON s.added_by = u.id
       ${where}
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [{ total }] = await query(`SELECT COUNT(*) as total FROM suppression_list ${where}`, params);

    res.json({ items, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/compliance/suppression
 * Add entry to suppression list
 */
router.post('/suppression', auth, async (req, res) => {
  try {
    const { type, value, reason } = req.body;
    if (!type || !value) return res.status(400).json({ error: 'type and value required' });

    await execute(
      `INSERT IGNORE INTO suppression_list (type, value, reason, source, added_by)
       VALUES (?, ?, ?, 'manual', ?)`,
      [type, value.toLowerCase().trim(), reason || 'Manually added', req.user?.id || null]
    );

    // If email, also mark matching leads as DNC
    if (type === 'email') {
      await execute(
        `UPDATE leads SET stage = 'do_not_contact' WHERE email = ? OR owner_email = ?`,
        [value.toLowerCase(), value.toLowerCase()]
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/compliance/suppression/bulk
 * Bulk add to suppression list
 */
router.post('/suppression/bulk', auth, async (req, res) => {
  try {
    const { entries } = req.body; // [{ type, value, reason }]
    if (!entries || !Array.isArray(entries)) return res.status(400).json({ error: 'entries array required' });

    let added = 0;
    for (const entry of entries) {
      try {
        await execute(
          `INSERT IGNORE INTO suppression_list (type, value, reason, source, added_by)
           VALUES (?, ?, ?, 'manual', ?)`,
          [entry.type || 'email', entry.value.toLowerCase().trim(), entry.reason || 'Bulk import', req.user?.id]
        );
        added++;
      } catch {}
    }

    res.json({ success: true, added, total: entries.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/compliance/suppression/:id
 * Remove from suppression list
 */
router.delete('/suppression/:id', auth, async (req, res) => {
  try {
    await execute('DELETE FROM suppression_list WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/compliance/opt-out
 * Process opt-out request (from unsubscribe link)
 */
router.post('/opt-out', async (req, res) => {
  // No auth required — this is a public endpoint for unsubscribe
  try {
    const { email, trackingId } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    // Add to suppression
    await execute(
      `INSERT IGNORE INTO suppression_list (type, value, reason, source)
       VALUES ('email', ?, 'Unsubscribed via opt-out link', 'unsubscribe')`,
      [email.toLowerCase().trim()]
    );

    // Mark lead as DNC
    await execute(
      `UPDATE leads SET stage = 'do_not_contact' WHERE email = ? OR owner_email = ?`,
      [email.toLowerCase(), email.toLowerCase()]
    );

    // Stop any active sequences
    if (trackingId) {
      await execute(
        `UPDATE outreach_messages SET status = 'failed', error_message = 'Unsubscribed'
         WHERE tracking_id = ?`,
        [trackingId]
      );
    }

    // Log
    await execute(
      `INSERT INTO activity_logs (action, entity_type, details)
       VALUES ('opt_out.processed', 'suppression', ?)`,
      [JSON.stringify({ email, trackingId })]
    );

    res.json({ success: true, message: 'You have been unsubscribed successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/compliance/opt-out
 * Renders unsubscribe confirmation page
 */
router.get('/opt-out', async (req, res) => {
  const { email, t } = req.query;
  res.send(`<!DOCTYPE html>
<html><head><title>Unsubscribe — OpenClaw</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'IBM Plex Sans', -apple-system, sans-serif; background: #161616; color: #f4f4f4; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .card { background: #262626; border-radius: 8px; padding: 48px; max-width: 480px; text-align: center; }
  h2 { margin-bottom: 16px; font-size: 20px; }
  p { color: #c6c6c6; margin-bottom: 24px; font-size: 14px; line-height: 1.6; }
  button { background: #da1e28; color: #fff; border: none; padding: 12px 32px; border-radius: 4px; font-size: 14px; cursor: pointer; }
  button:hover { background: #b81921; }
  .success { color: #42be65; display: none; }
</style></head>
<body>
<div class="card">
  <h2>Unsubscribe</h2>
  <p>Click below to unsubscribe <strong>${email || 'your email'}</strong> from future messages.</p>
  <button onclick="unsub()">Unsubscribe</button>
  <p class="success" id="msg">✅ You have been unsubscribed. You will not receive further emails.</p>
</div>
<script>
async function unsub() {
  try {
    await fetch('/api/compliance/opt-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '${email || ''}', trackingId: '${t || ''}' })
    });
  } catch {}
  document.getElementById('msg').style.display = 'block';
  document.querySelector('button').style.display = 'none';
}
</script>
</body></html>`);
});

/**
 * GET /api/compliance/sources/:leadId
 * Get source traceability for a lead
 */
router.get('/sources/:leadId', auth, async (req, res) => {
  try {
    const sources = await query(
      'SELECT * FROM lead_sources WHERE lead_id = ? ORDER BY captured_at DESC',
      [parseInt(req.params.leadId)]
    );
    res.json({ sources });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/compliance/stats
 * Compliance statistics
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = {};

    const [sup] = await query(`
      SELECT type, COUNT(*) as count FROM suppression_list GROUP BY type
    `);
    stats.suppression = sup || [];

    const [{ dnc_count }] = await query(
      `SELECT COUNT(*) as dnc_count FROM leads WHERE stage = 'do_not_contact'`
    );
    stats.dncLeads = dnc_count;

    const [{ optout_count }] = await query(
      `SELECT COUNT(*) as optout_count FROM suppression_list WHERE source = 'unsubscribe'`
    );
    stats.optOuts = optout_count;

    const [{ bounce_count }] = await query(
      `SELECT COUNT(*) as bounce_count FROM suppression_list WHERE source = 'bounce'`
    );
    stats.bounces = bounce_count;

    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
