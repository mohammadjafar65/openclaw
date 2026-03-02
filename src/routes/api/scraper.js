const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { enqueue, getStats } = require('../../services/queue/jobQueue');
const { query, execute } = require('../../config/database');
const { searchGoogleMapsLive } = require('../../services/scraper/googleMapsService');
const { verifyWebsiteStatus } = require('../../services/scraper/websiteVerifier');
const { applyFilters } = require('../../services/scraper/filterEngine');
const { scoreLead } = require('../../services/enrichment/aiScorer');

const router = express.Router();

// ── Active SSE clients map  ───────────────────────────────
// sessionId → res object
const sseClients = new Map();

// ── SSE STREAM endpoint ──────────────────────────────────
// GET /api/scraper/stream/:sessionId
router.get('/stream/:sessionId', authenticate, (req, res) => {
  const { sessionId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send initial heartbeat
  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);

  sseClients.set(sessionId, res);
  console.log(`[SSE] Client connected: ${sessionId}`);

  // Heartbeat every 20s to keep alive
  const heartbeat = setInterval(() => {
    if (sseClients.has(sessionId)) {
      res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(sessionId);
    console.log(`[SSE] Client disconnected: ${sessionId}`);
  });
});

function sendSSE(sessionId, type, data) {
  const client = sseClients.get(sessionId);
  if (client) {
    try {
      client.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    } catch (e) {
      sseClients.delete(sessionId);
    }
  }
}

// ── LIVE SCRAPE endpoint ─────────────────────────────────
// POST /api/scraper/live
router.post('/live', authenticate, async (req, res) => {
  const {
    sessionId, niche, micro_niche, region,
    radius_km = 25, min_rating = 4.0, min_reviews = 25,
    campaign_id,
  } = req.body;

  if (!niche || !region || !sessionId) {
    return res.status(400).json({ error: 'niche, region, and sessionId are required' });
  }

  // Respond immediately — scraping happens async
  res.json({ message: 'Live scrape started', sessionId });

  // Run scraping in background, stream via SSE
  runLiveScrape({
    sessionId, niche, micro_niche, region,
    radius_km, min_rating, min_reviews, campaign_id,
  }).catch(err => {
    console.error('[LiveScrape] Error:', err.message);
    sendSSE(sessionId, 'error', { message: err.message });
  });
});

async function runLiveScrape(options) {
  const {
    sessionId, niche, micro_niche, region,
    radius_km, min_rating, min_reviews, campaign_id,
  } = options;

  const stats = { discovered: 0, passed: 0, filtered: 0, saved: 0, errors: 0 };

  sendSSE(sessionId, 'start', {
    message: `Starting live scrape: ${niche} in ${region}`,
    config: { niche, micro_niche, region, radius_km, min_rating, min_reviews },
  });

  try {
    // Get existing place_ids to avoid duplicates
    const existing = await query('SELECT place_id FROM leads WHERE place_id IS NOT NULL');
    const existingIds = new Set(existing.map(r => r.place_id));

    await searchGoogleMapsLive(
      { niche, microNiche: micro_niche, region, radiusKm: radius_km },
      async (eventType, data) => {

        if (eventType === 'status') {
          sendSSE(sessionId, 'status', { message: data.message, phase: data.phase });
          return;
        }

        if (eventType === 'error') {
          sendSSE(sessionId, 'error', { message: data.message });
          return;
        }

        if (eventType === 'discovered') {
          const lead = data.lead;
          stats.discovered++;

          // Duplicate check
          if (lead.place_id && existingIds.has(lead.place_id)) {
            sendSSE(sessionId, 'filtered', {
              lead: { business_name: lead.business_name, city: lead.city },
              reason: 'Already in database',
              stats: { ...stats },
            });
            stats.filtered++;
            return;
          }
          if (lead.place_id) existingIds.add(lead.place_id);

          // Emit raw discovery immediately
          sendSSE(sessionId, 'discovered', {
            lead: {
              business_name: lead.business_name,
              category: lead.category,
              address: lead.address,
              city: lead.city,
              phone: lead.phone,
              rating: lead.rating,
              review_count: lead.review_count,
              maps_website: lead.maps_website,
            },
            stats: { ...stats },
          });

          // ── PHASE 1: Rating/review filter ──
          sendSSE(sessionId, 'checking', {
            lead: { business_name: lead.business_name },
            check: 'Checking rating & review filters...',
          });

          const filterResult = applyFilters(lead, { min_rating, min_reviews });
          if (!filterResult.pass) {
            stats.filtered++;
            sendSSE(sessionId, 'filtered', {
              lead: { business_name: lead.business_name, city: lead.city, rating: lead.rating, review_count: lead.review_count },
              reason: filterResult.reasons.join(', '),
              stats: { ...stats },
            });
            return;
          }

          // ── PHASE 2: Website verification ──
          sendSSE(sessionId, 'checking', {
            lead: { business_name: lead.business_name },
            check: 'Verifying website status (3-layer check)...',
          });

          let websiteResult = { status: 'unknown' };
          try {
            websiteResult = await verifyWebsiteStatus(lead);
          } catch (e) {
            websiteResult = { status: 'unknown' };
          }

          lead.website_status = websiteResult.status;
          lead.website_url    = websiteResult.url || null;

          sendSSE(sessionId, 'website_check', {
            lead: { business_name: lead.business_name },
            website_status: websiteResult.status,
            website_url: websiteResult.url,
          });

          // ── PHASE 3: AI Score ──
          sendSSE(sessionId, 'checking', {
            lead: { business_name: lead.business_name },
            check: 'AI scoring lead...',
          });

          let scored = { score: 0, tier: 'standard', notes: '' };
          try {
            scored = await scoreLead(lead);
          } catch (e) { /* use defaults */ }

          // ── PHASE 4: Save to DB ──
          try {
            const result = await execute(
              `INSERT INTO leads
               (campaign_id, place_id, business_name, category, address, city, state, country,
                phone, rating, review_count, maps_website, website_status, website_url,
                source_reviews, raw_data, ai_score, score_breakdown, queue_tier, status)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'new')`,
              [
                campaign_id || null,
                lead.place_id, lead.business_name, lead.category,
                lead.address, lead.city, lead.state, lead.country,
                lead.phone, lead.rating, lead.review_count,
                lead.maps_website, lead.website_status, lead.website_url,
                JSON.stringify(lead.source_reviews || []),
                JSON.stringify(lead.raw_data || {}),
                scored.score,
                JSON.stringify(scored.breakdown || {}),
                scored.tier,
              ]
            );

            stats.saved++;
            stats.passed++;

            sendSSE(sessionId, 'saved', {
              lead: {
                id: result.insertId,
                business_name: lead.business_name,
                category: lead.category,
                city: lead.city,
                state: lead.state,
                phone: lead.phone,
                rating: lead.rating,
                review_count: lead.review_count,
                website_status: lead.website_status,
                ai_score: scored.score,
                queue_tier: scored.tier,
                score_notes: scored.notes,
              },
              stats: { ...stats },
            });

          } catch (dbErr) {
            if (dbErr.code === 'ER_DUP_ENTRY') {
              stats.filtered++;
              sendSSE(sessionId, 'filtered', {
                lead: { business_name: lead.business_name },
                reason: 'Duplicate entry',
                stats: { ...stats },
              });
            } else {
              stats.errors++;
              sendSSE(sessionId, 'error', { message: `DB error: ${dbErr.message}` });
            }
          }
        }
      }
    );

    // Done
    sendSSE(sessionId, 'complete', {
      message: `Scrape complete!`,
      stats,
    });

  } catch (err) {
    sendSSE(sessionId, 'error', { message: err.message });
    sendSSE(sessionId, 'complete', { message: 'Scrape ended with errors', stats });
  }
}

// ── Legacy endpoints ─────────────────────────────────────
router.post('/run', authenticate, async (req, res) => {
  try {
    const { niche, micro_niche, region, radius_km, campaign_id } = req.body;
    if (!niche || !region) return res.status(400).json({ error: 'niche and region are required' });
    const jobId = await enqueue('scrape_campaign', { niche, micro_niche, region, radius_km: radius_km || 25, campaign_id }, { priority: 1 });
    res.json({ message: 'Scrape job queued', job_id: jobId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/queue-stats', authenticate, async (req, res) => {
  try {
    const stats = await getStats();
    const recentJobs = await query('SELECT id, type, status, attempts, error, created_at, processed_at FROM job_queue ORDER BY created_at DESC LIMIT 20');
    res.json({ stats, recent_jobs: recentJobs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/recent-results', authenticate, async (req, res) => {
  try {
    const leads = await query('SELECT id, business_name, city, rating, review_count, website_status, ai_score, queue_tier, status, created_at FROM leads ORDER BY created_at DESC LIMIT 50');
    res.json({ leads });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
