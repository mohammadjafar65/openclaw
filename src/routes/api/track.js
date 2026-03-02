const express = require('express');
const { execute } = require('../../config/database');
const router = express.Router();

// Transparent 1x1 pixel
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

router.get('/open/:id', async (req, res) => {
  const { id } = req.params;

  // Serve the image immediately to avoid blocking the email client
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': PIXEL.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
  });
  res.end(PIXEL);

  try {
    // Asynchronously update DB
    // Only increment open_count and set first open time if it wasn't opened before
    // We update status to 'opened' if it was 'sent'. If 'replied', we accept that it was opened too, but keep 'replied'.
    // Actually, simple logic: set status='opened' if pending/sent. increment open_count.
    
    await execute(
      `UPDATE outreach_sequences 
       SET status = CASE WHEN status = 'sent' THEN 'opened' ELSE status END,
           open_count = open_count + 1,
           updated_at = NOW()
       WHERE id = ?`,
      [id]
    );

    console.log(`[Track] Email opened (seq #${id})`);
  } catch (err) {
    console.error(`[Track] Error tracking open for seq #${id}:`, err.message);
  }
});

module.exports = router;
