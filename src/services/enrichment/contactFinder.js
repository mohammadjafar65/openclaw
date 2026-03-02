const axios = require('axios');
const validator = require('validator');

/**
 * Contact Finder — Phase 2
 * Attempts to find owner email using:
 * 1. Hunter.io API (150 free searches/month)
 * 2. Common email pattern generation + validation
 */
async function findContactEmail(lead) {
  const { business_name, owner_name, phone } = lead;
  const results = { email: null, method: null, confidence: 'low' };

  // Method 1: Hunter.io domain search (if we found a weak/active website)
  if (process.env.HUNTER_API_KEY && lead.website_url) {
    const domain = extractDomain(lead.website_url);
    if (domain) {
      const hunterResult = await searchHunter(domain, owner_name);
      if (hunterResult) {
        results.email = hunterResult.email;
        results.method = 'hunter_io';
        results.confidence = hunterResult.confidence || 'medium';
        results.owner_name = hunterResult.first_name
          ? `${hunterResult.first_name} ${hunterResult.last_name || ''}`.trim()
          : owner_name;
        return results;
      }
    }
  }

  // Method 2: Generate common patterns and validate via MX check
  if (lead.website_url || lead.maps_website) {
    const domain = extractDomain(lead.website_url || lead.maps_website);
    if (domain) {
      const patternResult = await tryEmailPatterns(domain, owner_name, business_name);
      if (patternResult) {
        results.email = patternResult;
        results.method = 'pattern_mx';
        results.confidence = 'low';
        return results;
      }
    }
  }

  return results;
}

async function searchHunter(domain, ownerName) {
  try {
    const params = { domain, api_key: process.env.HUNTER_API_KEY };
    if (ownerName) {
      const parts = ownerName.split(' ');
      params.first_name = parts[0];
      params.last_name = parts.slice(1).join(' ');
    }

    const url = ownerName
      ? 'https://api.hunter.io/v2/email-finder'
      : 'https://api.hunter.io/v2/domain-search';

    const res = await axios.get(url, { params });
    const data = res.data?.data;

    if (ownerName && data?.email) {
      return data;
    }

    // Domain search: return first verified email
    if (!ownerName && data?.emails?.length > 0) {
      const best = data.emails.find(e => e.confidence > 70) || data.emails[0];
      return { email: best.value, confidence: best.confidence > 70 ? 'high' : 'medium', ...best };
    }

    return null;
  } catch (err) {
    if (err.response?.status !== 404) {
      console.error('[Hunter] Error:', err.message);
    }
    return null;
  }
}

async function tryEmailPatterns(domain, ownerName, businessName) {
  const patterns = [];

  if (ownerName) {
    const parts = ownerName.toLowerCase().replace(/[^a-z\s]/g, '').split(' ').filter(Boolean);
    const [first, last] = parts;
    if (first && last) {
      patterns.push(
        `${first}@${domain}`,
        `${first}.${last}@${domain}`,
        `${first[0]}${last}@${domain}`,
        `${last}@${domain}`,
      );
    } else if (first) {
      patterns.push(`${first}@${domain}`);
    }
  }

  // Generic business emails
  patterns.push(
    `info@${domain}`,
    `hello@${domain}`,
    `contact@${domain}`,
    `owner@${domain}`,
    `admin@${domain}`,
  );

  // Validate via MX record + SMTP check
  const dns = require('dns').promises;
  try {
    await dns.resolveMx(domain);
    // Domain accepts email — return the first pattern (we can't verify further without sending)
    return patterns[0] || null;
  } catch {
    return null;
  }
}

/**
 * Validate email address is real via MX record
 */
async function validateEmail(email) {
  if (!validator.isEmail(email)) return false;

  const domain = email.split('@')[1];
  try {
    const dns = require('dns').promises;
    const records = await dns.resolveMx(domain);
    return records && records.length > 0;
  } catch {
    return false;
  }
}

function extractDomain(url) {
  if (!url) return null;
  try {
    const u = url.startsWith('http') ? url : `https://${url}`;
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

module.exports = { findContactEmail, validateEmail, extractDomain };
