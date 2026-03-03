/**
 * OpenClaw — AI Personalization API Routes
 * Generate personalized outreach emails, WhatsApp drafts, call scripts
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const {
  generateColdEmail,
  generateFollowUp,
  generateWhatsAppDraft,
  generateCallScript,
  generateFullSequence,
  generateSubjectVariants,
} = require('../../services/personalization/aiPersonalizationEngine');

/**
 * POST /api/personalize/cold-email/:leadId
 * Generate personalized cold email
 */
router.post('/cold-email/:leadId', auth, async (req, res) => {
  try {
    const { senderName, agencyName, calendarLink } = req.body;
    const result = await generateColdEmail(parseInt(req.params.leadId), {
      senderName, agencyName, calendarLink,
    });
    res.json({ success: true, email: result });
  } catch (err) {
    console.error('[PERSONALIZE] Cold email error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/personalize/follow-up/:leadId
 * Generate follow-up email
 */
router.post('/follow-up/:leadId', auth, async (req, res) => {
  try {
    const { step = 2, senderName, agencyName } = req.body;
    const result = await generateFollowUp(parseInt(req.params.leadId), step, {
      senderName, agencyName,
    });
    res.json({ success: true, email: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/personalize/whatsapp/:leadId
 * Generate WhatsApp message draft
 */
router.post('/whatsapp/:leadId', auth, async (req, res) => {
  try {
    const result = await generateWhatsAppDraft(parseInt(req.params.leadId));
    res.json({ success: true, whatsapp: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/personalize/call-script/:leadId
 * Generate call opener script
 */
router.post('/call-script/:leadId', auth, async (req, res) => {
  try {
    const result = await generateCallScript(parseInt(req.params.leadId));
    res.json({ success: true, script: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/personalize/full-sequence/:leadId
 * Generate complete 4-step email sequence
 */
router.post('/full-sequence/:leadId', auth, async (req, res) => {
  try {
    const { senderName, agencyName, calendarLink } = req.body;
    const result = await generateFullSequence(parseInt(req.params.leadId), {
      senderName, agencyName, calendarLink,
    });
    res.json({ success: true, sequence: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/personalize/subject-variants/:leadId
 * Generate A/B subject line variants
 */
router.post('/subject-variants/:leadId', auth, async (req, res) => {
  try {
    const { count = 3 } = req.body;
    const result = await generateSubjectVariants(parseInt(req.params.leadId), count);
    res.json({ success: true, variants: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
