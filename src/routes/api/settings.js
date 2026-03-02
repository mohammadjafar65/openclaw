const express = require('express');
const { query, execute } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const rows = await query('SELECT key_name, value FROM settings');
    const settings = rows.reduce((acc, r) => ({ ...acc, [r.key_name]: r.value }), {});
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings
router.put('/', async (req, res) => {
  try {
    const allowed = [
      'daily_send_limit', 'send_start_hour', 'send_end_hour',
      'scrape_delay_ms', 'sequence_delays_days',
    ];

    for (const [key, value] of Object.entries(req.body)) {
      if (allowed.includes(key)) {
        await execute(
          'INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
          [key, String(value), String(value)]
        );
      }
    }
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
