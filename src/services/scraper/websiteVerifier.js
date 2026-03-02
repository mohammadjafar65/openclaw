const axios = require('axios');
const dns = require('dns').promises;

/**
 * 3-Layer Website Verification
 * Returns: 'none' | 'weak' | 'active'
 * 
 * Layer 1: Check Maps listing for website
 * Layer 2: SERP/domain pattern search  
 * Layer 3: HTTP HEAD probe on common domain patterns
 */
async function verifyWebsiteStatus(lead) {
  const { business_name, maps_website, city, state } = lead;

  // Layer 1: Maps already tells us there's no website
  if (maps_website && isRealWebsite(maps_website)) {
    return { status: 'active', url: maps_website, layer: 1 };
  }

  // Prepare domain patterns to probe
  const domainPatterns = generateDomainPatterns(business_name, city, state);

  // Layer 2: Check if any domain pattern resolves via DNS
  const dnsResult = await checkDNS(domainPatterns);
  if (dnsResult) {
    // Layer 3: Confirm it's a real website (not parked)
    const httpResult = await httpProbe(dnsResult.url);
    if (httpResult.isReal) {
      return { status: 'active', url: dnsResult.url, layer: 3 };
    } else {
      return { status: 'weak', url: dnsResult.url, layer: 3, note: 'Parked or broken domain found' };
    }
  }

  // Layer 3: HTTP probe all patterns even without DNS confirm
  for (const domain of domainPatterns.slice(0, 5)) { // limit probes
    const httpResult = await httpProbe(`https://www.${domain}`);
    if (httpResult.isReal) {
      return { status: 'active', url: `https://www.${domain}`, layer: 3 };
    }
    if (httpResult.exists) {
      return { status: 'weak', url: `https://www.${domain}`, layer: 3, note: 'Possible parked page' };
    }
    await sleep(300);
  }

  return { status: 'none', layer: 3 };
}

/**
 * Generate likely domain patterns from business name
 */
function generateDomainPatterns(businessName, city, state) {
  const clean = businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '');
  const cleanCity = (city || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanState = (state || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const tlds = ['.com', '.net', '.co', '.biz'];
  const patterns = [];

  for (const tld of tlds) {
    patterns.push(`${clean}${tld}`);
    if (cleanCity) {
      patterns.push(`${clean}${cleanCity}${tld}`);
      patterns.push(`${cleanCity}${clean}${tld}`);
    }
    if (cleanState) {
      patterns.push(`${clean}${cleanState}${tld}`);
    }
  }

  return [...new Set(patterns)]; // deduplicate
}

/**
 * Check if domain resolves via DNS
 */
async function checkDNS(domainPatterns) {
  for (const domain of domainPatterns) {
    try {
      await dns.lookup(domain);
      return { domain, url: `https://www.${domain}` };
    } catch {
      // No DNS record found, try next
    }
    await sleep(100);
  }
  return null;
}

/**
 * HTTP HEAD probe to check if URL returns real content
 */
async function httpProbe(url) {
  try {
    const res = await axios.get(url, {
      timeout: 8000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
      validateStatus: () => true, // don't throw on 4xx/5xx
    });

    const exists = res.status < 500;
    const contentLength = parseInt(res.headers['content-length'] || '0');
    const contentType = res.headers['content-type'] || '';
    const body = typeof res.data === 'string' ? res.data : '';

    // Detect parked/placeholder pages
    const parkedSignals = [
      'domain is for sale', 'buy this domain', 'parked by', 'under construction',
      'coming soon', 'placeholder page', 'default web page', 'account suspended',
      'this site can\'t be reached', 'namecheap.com', 'godaddy.com', 'sedo.com',
    ];
    const bodyLower = body.toLowerCase();
    const isParked = parkedSignals.some(signal => bodyLower.includes(signal));
    const hasContent = body.length > 2000 && !isParked;

    return {
      exists,
      isReal: exists && hasContent && contentType.includes('html'),
      status: res.status,
      finalUrl: res.request?.res?.responseUrl || url,
    };
  } catch (err) {
    return { exists: false, isReal: false, error: err.message };
  }
}

/**
 * Determine if a Maps-listed website URL is actually real
 */
function isRealWebsite(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  // Exclude social media profiles listed as "websites"
  const socialDomains = ['facebook.com', 'instagram.com', 'twitter.com', 'yelp.com', 'tripadvisor.com'];
  return !socialDomains.some(d => lower.includes(d));
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { verifyWebsiteStatus, generateDomainPatterns };
