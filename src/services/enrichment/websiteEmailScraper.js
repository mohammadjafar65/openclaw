const axios = require('axios');

// ── CONFIG ────────────────────────────────────────────────
const REQUEST_TIMEOUT = 10000;   // 10s per page
const MAX_PAGES       = 6;       // max pages to check per domain
const USER_AGENT      = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

// Pages to check in priority order
const CONTACT_PATHS = [
  '/',
  '/contact',
  '/contact-us',
  '/contact.html',
  '/contact.php',
  '/about',
  '/about-us',
  '/about.html',
  '/reach-us',
  '/get-in-touch',
  '/info',
];

// Email regex — matches most real email patterns
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Emails to ignore (generic/noreply/spam)
const IGNORE_PATTERNS = [
  /noreply/i, /no-reply/i, /donotreply/i,
  /example\./i, /test@/i, /admin@example/i,
  /\.(png|jpg|gif|svg|css|js|woff)/i,
  /sentry\./i, /cloudflare\./i, /google\./i,
  /schema\.org/i, /w3\.org/i, /openstreetmap/i,
  /placeholder/i, /youremail/i, /email@email/i,
];

/**
 * Main entry — find emails for a lead
 * @param {object} lead  - lead row from DB (needs website_url or maps_website)
 * @returns {object}     - { emails, best_email, confidence, source, pages_checked }
 */
async function findEmailsFromWebsite(lead) {
  const baseUrl = normalizeUrl(lead.website_url || lead.maps_website);

  if (!baseUrl) {
    return { emails: [], best_email: null, confidence: null, source: null, pages_checked: 0, error: 'No website URL available' };
  }

  const domain = extractDomain(baseUrl);
  const found  = new Map(); // email → { source, priority }
  const checked = [];
  let websiteData = {};

  // 1. Try all contact paths
  for (const path of CONTACT_PATHS) {
    if (checked.length >= MAX_PAGES) break;

    const url = buildUrl(baseUrl, path);
    if (!url) continue;

    try {
      const html = await fetchPage(url);
      if (!html) continue;

      if (path === '/') {
          websiteData = extractMetadata(html);
          // Only fetch homepage once
      }

      checked.push(url);
      const emails = extractEmailsFromHtml(html, domain);

      for (const item of emails) {
        // extractEmailsFromHtml returns objects {email, priority, source}
        // but due to previous edit, it returns slightly different structure.
        // Wait, my previous edit introduced extractEmailsFromHtml returning `[{email, priority, source}]`
        // But the consuming code expects `{email, priority, source}` loop.
        // Let's check extractEmailsFromHtml again.
        // My previous edit replaced the entire function `extractEmailsFromHtml`.
        // The return is `results.push({ email, priority, source: 'html_body' })`.
        // So `emails` is an array of objects.
        // The loop below expects `const { email, priority, source } of emails`. This is correct.
        
        const { email, priority, source } = item;
        if (!found.has(email) || (found.get(email) && found.get(email).priority < priority)) {
          found.set(email, { source: url + ' (' + source + ')', priority });
        }
      }

      // Also extract contact page links from homepage and follow them
      if (path === '/') {
        const contactLinks = extractContactLinks(html, baseUrl);
        for (const link of contactLinks.slice(0, 2)) {
          if (checked.length >= MAX_PAGES) break;
          if (checked.includes(link)) continue;
          try {
            const cHtml = await fetchPage(link);
            if (cHtml) {
              checked.push(link);
              const cEmails = extractEmailsFromHtml(cHtml, domain);
              for (const { email, priority, source } of cEmails) {
                if (!found.has(email) || found.get(email).priority < priority) {
                  found.set(email, { source: link + ' (' + source + ')', priority });
                }
              }
            }
          } catch {}
        }
      }

      // Stop early if we found a good email
      if ([...found.keys()].some(e => scoreEmail(e, domain) >= 8)) break;

    } catch (err) {
      // Page failed — continue to next
    }
  }

  // Sort by score
  const scored = [...found.entries()]
    .map(([email, info]) => ({
      email,
      score: scoreEmail(email, domain) + info.priority,
      source: info.source,
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0] || null;
  const confidence = best
    ? best.score >= 10 ? 'high'
    : best.score >= 6  ? 'medium'
    : 'low'
    : null;

  return {
    emails:        scored.map(s => s.email),
    best_email:    best?.email || null,
    confidence,
    source:        best?.source || null,
    pages_checked: checked.length,
    all_found:     scored,
    website_data:  websiteData || {},
  };
}

// ── PAGE FETCHER ─────────────────────────────────────────
async function fetchPage(url) {
  try {
    const res = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      maxRedirects: 5,
      validateStatus: s => s < 400,
    });
    if (typeof res.data === 'string') return res.data;
    return null;
  } catch {
    return null;
  }
}

// ── EMAIL & DATA EXTRACTOR ────────────────────────────────
function extractEmailsFromHtml(html, domain) {
  const results = [];
  const seen = new Set();
  
  // Extract emails using regex
  let match;
  while ((match = EMAIL_REGEX.exec(html)) !== null) {
    let email = match[0].toLowerCase();
    
    // Filter out common junk
    if (IGNORE_PATTERNS.some(p => p.test(email))) continue;
    
    // Check if it's from the same domain (higher priority)
    const emailDomain = email.split('@')[1];
    let priority = 0;
    
    if (emailDomain === domain) priority += 5;
    if (email.startsWith('info') || email.startsWith('contact') || email.startsWith('hello')) priority += 2;
    if (email.startsWith('sales') || email.startsWith('support')) priority += 1;
    
    if (!seen.has(email)) {
      seen.add(email);
      results.push({ email, priority, source: 'html_body' });
    }
  }

  // Also look for mailto: links which might be obfuscated in text
  const mailtoRegex = /href=["']mailto:([^"']+)["']/g;
  while ((match = mailtoRegex.exec(html)) !== null) {
    let email = match[1].split('?')[0].toLowerCase();
    if (IGNORE_PATTERNS.some(p => p.test(email))) continue;
    
    if (!seen.has(email)) {
      seen.add(email);
      results.push({ email, priority: 8, source: 'mailto_link' });
    }
  }

  return results;
}

function extractMetadata(html) {
  const meta = {
    title: '',
    description: '',
    copyright_year: null,
    generator: null,
    is_responsive: false,
    technologies: []
  };

  try {
    // Title
    const titleMatch = /<title>(.*?)<\/title>/i.exec(html);
    if (titleMatch) meta.title = titleMatch[1].trim();

    // Meta Description
    const descMatch = /<meta\s+name=["']description["']\s+content=["'](.*?)["']/i.exec(html);
    if (descMatch) meta.description = descMatch[1].trim();

    // Copyright Year
    const copyrightMatch = /&copy;|©/i.exec(html);
    if (copyrightMatch) {
      const surrounding = html.substring(copyrightMatch.index, copyrightMatch.index + 50);
      const yearMatch = /(20\d{2})/g.exec(surrounding);
      if (yearMatch) meta.copyright_year = parseInt(yearMatch[1]);
    }

    // Generator / CMS
    if (/wp-content|wordpress/i.test(html)) meta.technologies.push('WordPress');
    if (/wix\.com|wix-image/i.test(html)) meta.technologies.push('Wix');
    if (/squarespace/i.test(html)) meta.technologies.push('Squarespace');
    if (/shopify/i.test(html)) meta.technologies.push('Shopify');
    if (/react|next\.js/i.test(html)) meta.technologies.push('React');
    if (/bootstrap/i.test(html)) meta.technologies.push('Bootstrap');

    // Responsiveness (simple check for viewport meta)
    if (/<meta\s+name=["']viewport["']/i.test(html)) {
      meta.is_responsive = true;
    }

  } catch (e) {
    // Ignore parsing errors
  }

  return meta;
}

  // 1. mailto: links — highest priority
  const mailtoRegex = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
  let match;
  while ((match = mailtoRegex.exec(html)) !== null) {
    const email = match[1].toLowerCase().trim();
    if (!seen.has(email) && isValidEmail(email)) {
      seen.add(email);
      results.push({ email, priority: 5, source: 'mailto link' });
    }
  }

  // 2. Emails in contact/info sections — medium-high
  const contactSectionRegex = /<(?:div|section|footer|address|p)[^>]*(?:contact|footer|info|reach)[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/(?:div|section|footer|address|p)>/gi;
  while ((match = contactSectionRegex.exec(html)) !== null) {
    const section = match[1];
    const emails = section.match(EMAIL_REGEX) || [];
    for (const email of emails) {
      const e = email.toLowerCase().trim();
      if (!seen.has(e) && isValidEmail(e)) {
        seen.add(e);
        results.push({ email: e, priority: 4, source: 'contact section' });
      }
    }
  }

  // 3. Decode obfuscated emails — e.g. "info [at] domain [dot] com"
  const obfuscated = html.match(/[a-zA-Z0-9._%+\-]+\s*[\[\(]at[\]\)]\s*[a-zA-Z0-9.\-]+\s*[\[\(]dot[\]\)]\s*[a-zA-Z]{2,}/gi) || [];
  for (const raw of obfuscated) {
    const email = raw
      .replace(/\s*[\[\(]at[\]\)]\s*/i, '@')
      .replace(/\s*[\[\(]dot[\]\)]\s*/gi, '.')
      .replace(/\s/g, '')
      .toLowerCase();
    if (!seen.has(email) && isValidEmail(email)) {
      seen.add(email);
      results.push({ email, priority: 4, source: 'obfuscated' });
    }
  }

  // 4. All raw email matches in page text
  const allEmails = html.match(EMAIL_REGEX) || [];
  for (const email of allEmails) {
    const e = email.toLowerCase().trim();
    if (!seen.has(e) && isValidEmail(e)) {
      seen.add(e);
      results.push({ email: e, priority: 2, source: 'page text' });
    }
  }

  return results.filter(r => !shouldIgnore(r.email));
}

// ── CONTACT LINK EXTRACTOR ────────────────────────────────
function extractContactLinks(html, baseUrl) {
  const links = [];
  const hrefRegex = /href=["']([^"']*(?:contact|reach|about|info|email)[^"']*)["']/gi;
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1];
    const full = buildUrl(baseUrl, href);
    if (full && !links.includes(full)) {
      links.push(full);
    }
  }
  return links;
}

// ── SCORING ───────────────────────────────────────────────
function scoreEmail(email, domain) {
  let score = 3; // base

  // Same domain = strong signal
  const emailDomain = email.split('@')[1] || '';
  if (emailDomain === domain || domain.includes(emailDomain) || emailDomain.includes(domain.split('.')[0])) {
    score += 6;
  }

  // Good prefixes
  const prefix = email.split('@')[0].toLowerCase();
  if (['info','contact','hello','hi','enquiry','enquiries','sales','office','support'].includes(prefix)) score += 3;
  if (['admin','webmaster','mail'].includes(prefix)) score += 1;

  // Personal name pattern (firstname@, name@) — decent
  if (/^[a-z]+\.[a-z]+@/.test(email)) score += 2;
  if (/^[a-z]{3,15}@/.test(email) && prefix.length < 15) score += 1;

  return score;
}

// ── VALIDATION ────────────────────────────────────────────
function isValidEmail(email) {
  if (!email || email.length > 100 || email.length < 5) return false;
  if (!email.includes('@') || !email.includes('.')) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  if (parts[0].length < 1 || parts[1].length < 4) return false;
  if (!parts[1].includes('.')) return false;
  return true;
}

function shouldIgnore(email) {
  return IGNORE_PATTERNS.some(p => p.test(email));
}

// ── URL HELPERS ───────────────────────────────────────────
function normalizeUrl(url) {
  if (!url) return null;
  url = url.trim();
  if (!url.startsWith('http')) url = 'https://' + url;
  // Remove trailing slash
  url = url.replace(/\/$/, '');
  try { new URL(url); return url; } catch { return null; }
}

function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch { return ''; }
}

function buildUrl(base, path) {
  if (!path) return null;
  try {
    // Already absolute
    if (path.startsWith('http')) {
      const u = new URL(path);
      const b = new URL(base);
      // Only follow links on same domain
      if (u.hostname !== b.hostname) return null;
      return path;
    }
    // Relative path
    if (path.startsWith('/')) {
      const b = new URL(base);
      return b.origin + path;
    }
    return null;
  } catch { return null; }
}

module.exports = { findEmailsFromWebsite };
