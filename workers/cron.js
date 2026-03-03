require('dotenv').config();
const cron = require('node-cron');
const { dequeue, complete, fail } = require('../src/services/queue/jobQueue');
const { searchGoogleMaps } = require('../src/services/scraper/googleMapsService');
const { verifyWebsiteStatus } = require('../src/services/scraper/websiteVerifier');
const { applyFilters, deduplicateLeads } = require('../src/services/scraper/filterEngine');
const { findContactEmail, validateEmail } = require('../src/services/enrichment/contactFinder');
const { findEmailsFromWebsite } = require('../src/services/enrichment/websiteEmailScraper');
const { scoreLead } = require('../src/services/enrichment/aiScorer');
const { createSequenceForLead } = require('../src/services/outreach/sequenceManager');
const { processPendingEmails } = require('../src/services/outreach/emailService');
const { query, execute, queryOne } = require('../src/config/database');

// New v2 services
let websiteAuditEngine, leadScoringEngine;
try {
  websiteAuditEngine = require('../src/services/audit/websiteAuditEngine');
  leadScoringEngine  = require('../src/services/scoring/leadScoringEngine');
} catch (e) {
  console.warn('[Cron] Optional services not loaded:', e.message);
}

function startCronJobs() {
  // ── Process job queue every 2 minutes ─────────────────
  cron.schedule('*/2 * * * *', async () => {
    await processQueue();
  });

  // ── Send pending emails every 5 minutes ───────────────
  cron.schedule('*/5 * * * *', async () => {
    try {
      const count = await processPendingEmails();
      if (count > 0) console.log(`[Cron/Email] Sent ${count} emails`);
    } catch (err) {
      console.error('[Cron/Email]', err.message);
    }
  });

  // ── Auto-audit un-audited leads every 10 minutes ──────
  cron.schedule('*/10 * * * *', async () => {
    if (!websiteAuditEngine) return;
    try {
      const unaudited = await query(
        `SELECT id FROM leads
         WHERE has_website = 1
           AND audit_classification IS NULL
           AND website_url IS NOT NULL AND website_url != ''
         ORDER BY created_at ASC LIMIT 5`
      );
      if (unaudited.length === 0) return;
      console.log(`[Cron/Audit] Processing ${unaudited.length} un-audited leads`);
      const ids = unaudited.map(l => l.id);
      await websiteAuditEngine.batchAudit(ids, (progress) => {
        console.log(`[Cron/Audit] ${progress.completed}/${progress.total} done`);
      });
    } catch (err) {
      console.error('[Cron/Audit]', err.message);
    }
  });

  // ── Re-score leads missing composite score every 15 min ─
  cron.schedule('*/15 * * * *', async () => {
    if (!leadScoringEngine) return;
    try {
      const unscored = await query(
        `SELECT id FROM leads
         WHERE lead_score IS NULL OR lead_score = 0
         ORDER BY created_at DESC LIMIT 10`
      );
      if (unscored.length === 0) return;
      console.log(`[Cron/Score] Scoring ${unscored.length} leads`);
      for (const lead of unscored) {
        try {
          await leadScoringEngine.scoreLead(lead.id);
        } catch (e) {
          console.error(`[Cron/Score] Lead #${lead.id}:`, e.message);
        }
      }
    } catch (err) {
      console.error('[Cron/Score]', err.message);
    }
  });

  // ── Check for new replies every 30 minutes ────────────
  cron.schedule('*/30 * * * *', async () => {
    try {
      // Check outreach_messages that were sent but not yet tracked for replies
      const pendingReply = await query(
        `SELECT om.id, om.lead_id, om.campaign_id
         FROM outreach_messages om
         WHERE om.status = 'sent'
           AND om.sent_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)
           AND om.sent_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
         LIMIT 20`
      );
      if (pendingReply.length > 0) {
        console.log(`[Cron/Reply] Checking ${pendingReply.length} messages for replies`);
      }
      // Note: Actual IMAP reply checking would be implemented when IMAP credentials are configured
    } catch (err) {
      console.error('[Cron/Reply]', err.message);
    }
  });

  // ── Full score recalculation daily at 2 AM ─────────────
  cron.schedule('0 2 * * *', async () => {
    if (!leadScoringEngine) return;
    try {
      console.log('[Cron/Score] Starting daily full recalculation...');
      const result = await leadScoringEngine.recalculateAllScores();
      console.log(`[Cron/Score] Recalculated ${result.total} leads, ${result.errors} errors`);
    } catch (err) {
      console.error('[Cron/Score-Daily]', err.message);
    }
  });

  // ── Clean up old completed jobs once a day ─────────────
  cron.schedule('0 3 * * *', async () => {
    const { clearCompleted } = require('../src/services/queue/jobQueue');
    await clearCompleted(48);
    console.log('[Cron/Cleanup] Old jobs cleared');
  });

  // ── Log activity summary once a day ────────────────────
  cron.schedule('0 4 * * *', async () => {
    try {
      const [stats] = await query(`
        SELECT
          (SELECT COUNT(*) FROM leads WHERE DATE(created_at) = CURDATE()) as leads_today,
          (SELECT COUNT(*) FROM leads WHERE audit_classification IS NOT NULL AND DATE(updated_at) = CURDATE()) as audits_today,
          (SELECT COUNT(*) FROM outreach_messages WHERE DATE(sent_at) = CURDATE()) as emails_today,
          (SELECT COUNT(*) FROM leads WHERE stage = 'won' AND DATE(updated_at) = CURDATE()) as won_today
      `);
      console.log(`[Cron/Summary] Daily: ${stats.leads_today} leads, ${stats.audits_today} audits, ${stats.emails_today} emails, ${stats.won_today} won`);
    } catch (err) {
      console.error('[Cron/Summary]', err.message);
    }
  });

  console.log('[Cron] All scheduled tasks active (including audit, scoring, reply workers)');
}

/**
 * Main job queue processor
 * Picks up and executes pending jobs one by one
 */
async function processQueue() {
  const jobs = await dequeue(['scrape_campaign', 'enrich_lead', 'create_sequence'], 5);
  if (jobs.length === 0) return;

  for (const job of jobs) {
    console.log(`[Worker] Processing job #${job.id}: ${job.type}`);
    try {
      switch (job.type) {
        case 'scrape_campaign':
          await handleScrape(job);
          break;
        case 'enrich_lead':
          await handleEnrich(job);
          break;
        case 'create_sequence':
          await handleCreateSequence(job);
          break;
        default:
          console.warn(`[Worker] Unknown job type: ${job.type}`);
      }
      await complete(job.id);
    } catch (err) {
      console.error(`[Worker] Job #${job.id} failed:`, err.message);
      await fail(job.id, err.message);
    }
  }
}

/**
 * JOB: scrape_campaign
 * Scrapes Google Maps for leads for a given campaign
 */
async function handleScrape(job) {
  const { campaign_id, niche, micro_niche, region, radius_km } = job.payload;

  let campaign = null;
  if (campaign_id) {
    campaign = await queryOne('SELECT * FROM campaigns WHERE id = ?', [campaign_id]);
  }

  const searchOptions = {
    niche:       campaign?.niche || niche,
    microNiche:  campaign?.micro_niche || micro_niche,
    region:      campaign?.region || region,
    radiusKm:    campaign?.radius_km || radius_km || 25,
  };

  console.log(`[Scrape] Searching: ${searchOptions.niche} in ${searchOptions.region}`);
  const rawLeads = await searchGoogleMaps(searchOptions);
  console.log(`[Scrape] Found ${rawLeads.length} raw leads`);

  // Deduplicate against existing DB records
  const unique = await deduplicateLeads(rawLeads, campaign_id);
  console.log(`[Scrape] ${unique.length} unique leads after dedup`);

  const scrapeDelay = parseInt(await getSetting('scrape_delay_ms', 2000));
  let savedCount = 0;
  let filteredCount = 0;

  for (const rawLead of unique) {
    try {
      // 3-Layer website verification
      const websiteResult = await verifyWebsiteStatus(rawLead);
      const lead = { ...rawLead, website_status: websiteResult.status, website_url: websiteResult.url };

      // Apply rating/review filters
      const filterResult = applyFilters(lead, campaign || {});
      if (!filterResult.pass) {
        filteredCount++;
        continue;
      }

      // Save to database
      const result = await execute(
        `INSERT INTO leads
         (campaign_id, place_id, business_name, category, address, city, state, country,
          phone, rating, review_count, maps_website, website_status, website_url,
          source_reviews, raw_data, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
        [
          campaign_id || null,
          lead.place_id, lead.business_name, lead.category,
          lead.address, lead.city, lead.state, lead.country,
          lead.phone, lead.rating, lead.review_count,
          lead.maps_website, lead.website_status, lead.website_url,
          JSON.stringify(lead.source_reviews || []),
          JSON.stringify(lead.raw_data || {}),
        ]
      );

      const leadId = result.insertId;

      // Immediately queue enrichment for new lead
      const { enqueue } = require('../src/services/queue/jobQueue');
      await enqueue('enrich_lead', { lead_id: leadId }, { priority: 2, delay: 5 });

      savedCount++;
      await sleep(scrapeDelay);
    } catch (err) {
      console.error('[Scrape] Error saving lead:', err.message);
    }
  }

  console.log(`[Scrape] Done: ${savedCount} saved, ${filteredCount} filtered out`);
}

/**
 * JOB: enrich_lead
 * Finds contact info and AI-scores a lead
 */
async function handleEnrich(job) {
  const { lead_id } = job.payload;
  const lead = await queryOne('SELECT * FROM leads WHERE id = ?', [lead_id]);
  if (!lead) throw new Error(`Lead #${lead_id} not found`);

  // Parse JSON fields
  if (typeof lead.source_reviews === 'string') {
    lead.source_reviews = JSON.parse(lead.source_reviews || '[]');
  }

  // 1. Scrape Website for Design Signals & Emails
  const webData = await findEmailsFromWebsite(lead);
  
  // Inject website data into lead for AI scoring
  lead.website_data = webData.website_data || {};
  lead.scraped_emails = webData.emails || [];

  // Update raw_data with website insights
  const rawData = typeof lead.raw_data === 'string' 
    ? JSON.parse(lead.raw_data || '{}') 
    : (lead.raw_data || {});
  
  rawData.website_analysis = lead.website_data;
  
  await execute('UPDATE leads SET raw_data = ? WHERE id = ?', [JSON.stringify(rawData), lead_id]);

  // Find contact email (using scraped emails first)
  const contactResult = await findContactEmail(lead);
  
  // Combine scraped emails with contact finder results
  if (webData.best_email && !contactResult.email) {
      contactResult.email = webData.best_email;
      contactResult.confidence = webData.confidence;
      contactResult.method = 'website_scrape';
  }

  if (contactResult.email) {
    const isValid = await validateEmail(contactResult.email);
    if (isValid) {
      await execute(
        'UPDATE leads SET owner_email = ?, owner_email_valid = 1, owner_name = COALESCE(?, owner_name) WHERE id = ?',
        [contactResult.email, contactResult.owner_name || null, lead_id]
      );
      lead.owner_email = contactResult.email;
      lead.owner_name = contactResult.owner_name || lead.owner_name;
    }
  }

  // AI Score the lead
  const scored = await scoreLead(lead);

  await execute(
    `UPDATE leads SET
      ai_score = ?, score_breakdown = ?, score_notes = ?, queue_tier = ?, status = 'enriched'
     WHERE id = ?`,
    [
      scored.score,
      JSON.stringify(scored.breakdown),
      scored.notes || '',
      scored.tier,
      lead_id,
    ]
  );

  console.log(`[Enrich] Lead #${lead_id} (${lead.business_name}): score=${scored.score} tier=${scored.tier}`);
}

/**
 * JOB: create_sequence
 * Generates and schedules email sequence for a lead
 */
async function handleCreateSequence(job) {
  const { lead_id, campaign_id } = job.payload;

  const lead = await queryOne('SELECT * FROM leads WHERE id = ?', [lead_id]);
  if (!lead) throw new Error(`Lead #${lead_id} not found`);

  // Parse JSON
  if (typeof lead.source_reviews === 'string') {
    lead.source_reviews = JSON.parse(lead.source_reviews || '[]');
  }

  const campaign = campaign_id
    ? await queryOne('SELECT * FROM campaigns WHERE id = ?', [campaign_id])
    : null;

  await createSequenceForLead(lead, campaign || {});
}

async function getSetting(key, defaultVal) {
  const row = await queryOne('SELECT value FROM settings WHERE key_name = ?', [key]);
  return row?.value ?? defaultVal;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { startCronJobs };

// Allow running directly: node workers/cron.js
if (require.main === module) {
  const { initDatabase } = require('../src/config/database');
  initDatabase().then(() => {
    startCronJobs();
    console.log('[Worker] Standalone worker started');
  });
}
