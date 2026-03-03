# OpenClaw — Complete Product Blueprint

> **AI Website Opportunity Finder for Agencies**
> Production-Ready SaaS Platform for Web Design Lead Generation, Website Auditing, AI Personalization & Outreach Automation

---

## 1. Product Positioning

### Product Name

**OpenClaw** — *Discover. Audit. Win.*

Alternative concepts considered:
| Name | Angle |
|------|-------|
| **OpenClaw** | Aggressive lead *discovery* — "clawing" opportunity from public data |
| SiteScout Pro | Website-audit-first positioning |
| RedesignIQ | Redesign-opportunity intelligence |
| LeadLens | Discovery + clarity metaphor |

**Final choice: OpenClaw** — short, memorable, action-oriented, SaaS-ready.

### One-Line Positioning

> **OpenClaw is the AI-powered lead discovery and website audit platform that helps web design agencies find businesses that need a new website — and win them as clients.**

### Target Users

| Segment | Description |
|---------|-------------|
| **Freelance web designers** | Solo operators looking for 5–20 new clients/month |
| **Web design agencies** | Teams of 3–30 running outbound prospecting |
| **Digital marketing agencies** | Agencies bundling web design with SEO/ads |
| **White-label resellers** | SaaS resellers offering lead gen to agencies |

### Core Value Proposition

OpenClaw replaces 6+ disjointed tools:

| Traditional Stack | OpenClaw Module |
|---|---|
| Google Maps scraper | Lead Discovery Engine |
| Hunter.io / email finder | Contact Enrichment Engine |
| GTmetrix / PageSpeed manual checks | AI Website Audit Engine |
| ChatGPT for email writing | AI Personalization Engine |
| Lemlist / Mailshake | Campaign & Outreach Engine |
| Excel / Notion | Mini CRM Pipeline |

**One platform. One workflow. From discovery to deal.**

### Differentiation from Normal Lead Scrapers / Cold Email Tools

| Generic Tool | OpenClaw Difference |
|---|---|
| Scrapes leads with no context | Discovers leads AND audits their website quality |
| Generic email blasts | AI writes personalized outreach based on real website observations |
| No qualification | Scores leads by redesign urgency, contact confidence, market value |
| Compliance afterthought | Compliance-first: public data only, opt-out built in, source traceability |
| Separate tools duct-taped together | Unified pipeline from discovery → audit → outreach → CRM |

---

## 2. Main Use Cases

### UC-1: Find Businesses With No Website

**Scenario**: Agency wants to find restaurants in Miami that have no website.
**Flow**: Search "restaurants Miami" → filter `has_website = false` → enrich with phone/email → generate outreach: "I noticed your business doesn't have a website yet..."

### UC-2: Find Businesses With Outdated Websites

**Scenario**: Agency targets dentists in London whose websites look like they were built in 2012.
**Flow**: Search "dentists London" → AI audit detects: no mobile responsiveness, Flash elements, dated design → score = 85/100 urgency → personalized email with specific observations.

### UC-3: Find Premium Businesses With Weak Online Branding

**Scenario**: Agency targets high-end law firms in Sydney that have 4.5+ star ratings but weak websites.
**Flow**: Search "law firms Sydney" → filter rating ≥ 4.5 → audit finds: no SSL, slow loading, no CTAs → outreach: "Your firm has excellent reviews, but your website may not be reflecting that quality..."

### UC-4: Generate Redesign Opportunities at Scale

**Scenario**: Agency wants to prospect 500 leads across 10 niches in 5 countries.
**Flow**: Batch discovery → batch audit → batch scoring → qualified leads surface automatically → campaigns per niche/country.

### UC-5: Create Personalized Outreach

**Scenario**: Sales rep picks 20 qualified leads and needs unique emails for each.
**Flow**: Select leads → AI generates personalized subject + body using real audit data → review → schedule → send.

### UC-6: Track Replies and Turn Leads Into Deals

**Scenario**: Prospect replies "Sounds interesting, what would a redesign cost?"
**Flow**: Reply detected → lead moves to "Interested" → follow-up task created → rep responds → books meeting → sends proposal → marks "Won".

---

## 3. Core Modules

### Module 1: Lead Discovery Engine

| Attribute | Detail |
|---|---|
| **Purpose** | Find public business listings worldwide by niche, location, keyword |
| **Features** | Google Maps search, keyword/category filtering, location radius, batch discovery, pagination, deduplication, source attribution |
| **User Actions** | Enter search query → select location → set filters → start discovery → review results → import to pipeline |
| **Backend Logic** | Google Places API (New) text search with `nextPageToken` pagination; SerpApi fallback; dedup by `place_id` + phone + normalized name; store with source confidence |
| **Data Needed** | Google Places API key, SerpApi key (fallback), niche keyword lists |
| **Output** | Raw lead records with: name, category, address, city, country, phone, website, rating, review_count, place_id, source_url |

### Module 2: Lead Enrichment Engine

| Attribute | Detail |
|---|---|
| **Purpose** | Enrich leads with verified contact details from public sources |
| **Features** | Website email scraping (crawl home/about/contact/footer), Hunter.io lookup, email pattern generation, MX validation, phone/WhatsApp extraction, social link extraction |
| **User Actions** | Select leads → click "Enrich" → monitor progress → review found contacts |
| **Backend Logic** | Priority: website scrape → Hunter.io → pattern generation; score emails (domain-match > generic > risky); validate MX records; extract social links from page markup |
| **Data Needed** | Lead website URL, Hunter.io API key |
| **Output** | Verified email(s), phone(s), WhatsApp link, social profiles, email confidence score, enrichment timestamp |

### Module 3: Website Audit Engine

| Attribute | Detail |
|---|---|
| **Purpose** | Analyze website quality and identify redesign opportunities |
| **Features** | 12-factor audit (design, mobile, speed, CTA, trust, typography, branding, loading, structure, SEO, contact, conversion), screenshot capture, classification (no-website / outdated / average / strong), redesign reason generation |
| **User Actions** | Select leads with websites → run audit → view audit card per lead → see top 3 reasons + urgency score |
| **Backend Logic** | Puppeteer/Playwright headless browser → capture screenshot + extract DOM metrics → Lighthouse API for speed/mobile → Claude AI analysis of HTML structure + screenshot → scoring algorithm → store audit record |
| **Data Needed** | Website URL, Puppeteer/Playwright runtime, Claude API |
| **Output** | Audit score (0–100), classification, 12-factor breakdown, top 3 redesign reasons, opportunity summary, urgency score, recommended website type, best outreach angle |

### Module 4: AI Personalization Engine

| Attribute | Detail |
|---|---|
| **Purpose** | Generate human-quality, personalized outreach using real lead + audit data |
| **Features** | Subject line generation, opening line crafting, full cold email drafts, WhatsApp message drafts, follow-up sequences, call opener scripts, objection handling suggestions |
| **User Actions** | Select lead(s) → choose outreach type → review AI draft → edit if needed → approve → queue for sending |
| **Backend Logic** | Claude API with structured prompt: inject business name, industry, location, website status, audit observations, brand opportunity → generate with strict guardrails (no fake facts, no insults, no spam language) → fallback templates if AI unavailable |
| **Data Needed** | Lead record, audit record, campaign context, Claude API key |
| **Output** | Subject line, email body, WhatsApp draft, follow-up drafts (steps 2–4), call script, objection responses |

### Module 5: Campaign & Outreach Engine

| Attribute | Detail |
|---|---|
| **Purpose** | Manage multi-step outreach campaigns with deliverability protection |
| **Features** | Campaign creation, audience segmentation, sequence builder (up to 7 steps), send scheduling (time windows + timezone), daily send caps, domain warmup, bounce handling, reply detection, auto-stop on reply, manual approval mode, A/B testing (subject + body variants), inbox sync, unsubscribe/opt-out workflow |
| **User Actions** | Create campaign → select audience → build sequence → set schedule → review messages → launch → monitor → handle replies |
| **Backend Logic** | Nodemailer SMTP with per-domain send limits; time-window enforcement; tracking pixel injection; bounce webhook processing; IMAP reply check; suppression list enforcement; exponential backoff on failures |
| **Data Needed** | SMTP credentials, lead emails, templates/AI drafts, schedule config |
| **Output** | Sent messages with tracking, open/click events, reply threads, campaign analytics |

### Module 6: WhatsApp-Assisted Outreach Module

| Attribute | Detail |
|---|---|
| **Purpose** | Generate WhatsApp outreach drafts for manual sending via WhatsApp Web/Business |
| **Features** | WhatsApp message template library, AI-personalized short messages, click-to-open in WhatsApp Web, message copy-to-clipboard, log sent WhatsApp messages manually, follow-up reminders |
| **User Actions** | View qualified lead → click "WhatsApp" → review AI draft → click to open WhatsApp Web pre-filled → mark as sent → log in timeline |
| **Backend Logic** | Generate `https://wa.me/{phone}?text={encoded_message}` links; AI generates short 2–3 sentence WhatsApp-appropriate messages; store outreach log |
| **Data Needed** | Lead phone number (WhatsApp-compatible), AI draft |
| **Output** | WhatsApp deep link, message log entry, follow-up task |

### Module 7: Mini CRM / Pipeline

| Attribute | Detail |
|---|---|
| **Purpose** | Track leads through sales stages from discovery to deal close |
| **Features** | Kanban pipeline view, drag-and-drop stage management, lead detail page (overview, audit, outreach history, timeline, notes, tasks), reminders, owner assignment, deal value tracking |
| **User Actions** | View pipeline → drag leads between stages → open lead detail → add notes → set reminders → assign to team member → mark won/lost |
| **Backend Logic** | Stage transitions logged in activity_logs; task scheduler for reminders; owner assignment with notification; deal value aggregation for forecasting |
| **Data Needed** | Lead records, stage definitions, user assignments |
| **Output** | Pipeline view, lead cards, activity timeline, deal forecasts |

### Module 8: Analytics Dashboard

| Attribute | Detail |
|---|---|
| **Purpose** | Provide actionable metrics across the entire funnel |
| **Features** | Real-time KPI cards, funnel visualization, campaign performance charts, niche/country/source breakdowns, template performance ranking, rep performance, trend charts |
| **User Actions** | View dashboard → filter by date/niche/country/campaign/rep → drill down into specific metrics |
| **Backend Logic** | Aggregation queries on leads, campaigns, messages, replies; materialized stats updated on events; chart data endpoints |
| **Data Needed** | All platform data |
| **Output** | KPI cards, charts, tables, exportable reports |

### Module 9: Compliance & Suppression Center

| Attribute | Detail |
|---|---|
| **Purpose** | Ensure all outreach is compliant and respect opt-outs |
| **Features** | Global suppression list (emails + domains + phones), opt-out link in every email, one-click unsubscribe processing, do-not-contact tags, source traceability per lead, data retention policies, GDPR-aware data handling, CAN-SPAM footer enforcement |
| **User Actions** | View suppression list → add/remove entries → view opt-out logs → configure compliance settings → export compliance report |
| **Backend Logic** | Check suppression list before every send; process unsubscribe webhooks; auto-tag DNC leads; log all data sources per lead; enforce retention TTL |
| **Data Needed** | Suppression entries, lead source records, opt-out events |
| **Output** | Suppression list, compliance audit log, DNC enforcement |

### Module 10: Settings / Team / Roles

| Attribute | Detail |
|---|---|
| **Purpose** | Configure platform, manage team access, set operational parameters |
| **Features** | API key management, SMTP configuration, send limits/schedules, team member invites, role-based permissions, notification preferences, billing/subscription management |
| **User Actions** | Configure API keys → set SMTP → invite team → assign roles → set daily limits → configure notifications |
| **Backend Logic** | Encrypted API key storage; role-permission matrix; invitation email workflow; settings per organization |
| **Data Needed** | API keys, SMTP credentials, team emails, role definitions |
| **Output** | Configuration state, team roster, permission matrix |

---

## 4. Lead Discovery System

### Search Parameters

| Parameter | Type | Example |
|---|---|---|
| **Keyword / Niche** | text | "restaurants", "dentists", "law firms" |
| **Location (city)** | text | "Miami", "London", "Dubai" |
| **Country** | select | US, UK, AE, AU, DE, FR, etc. |
| **Radius** | number (km) | 5, 10, 25, 50 |
| **Has Website** | tri-state | Yes / No / Any |
| **Min Rating** | number | 0–5 |
| **Min Reviews** | number | 0–9999 |
| **Category** | text/select | "restaurant", "dental_clinic" |

### Filter System

| Filter | Logic |
|---|---|
| **Has website / No website** | `website IS NULL` or `website IS NOT NULL` |
| **Outdated website** | `audit_classification = 'outdated'` |
| **Rating threshold** | `rating >= {min}` |
| **Review count** | `review_count >= {min}` |
| **Premium niche** | `category IN (premium_niche_list)` |
| **Already contacted** | `stage NOT IN ('new', 'enriched', 'qualified')` |
| **Do-not-contact** | `stage != 'do-not-contact'` |

### Deduplication Rules

1. **Primary**: Match on `google_place_id` (exact)
2. **Secondary**: Match on `normalized_phone` (strip formatting)
3. **Tertiary**: Match on `normalized_name + city + country` (fuzzy, Levenshtein ≤ 2)
4. **Domain match**: Same `website_domain` = same business (merge, keep highest-quality record)

### Source Confidence Logic

| Source | Confidence |
|---|---|
| Google Places API (official) | 95% |
| SerpApi (Google Maps scrape) | 85% |
| CSV import (user-provided) | 70% (user must validate) |
| Manual entry | 60% |

### Lead Fields (Complete Schema)

| Field | Type | Description |
|---|---|---|
| `id` | INT AUTO_INCREMENT | Primary key |
| `organization_id` | INT | Owning organization |
| `campaign_id` | INT | Discovery campaign link |
| `google_place_id` | VARCHAR(255) | Google Place ID (dedup key) |
| `business_name` | VARCHAR(500) | Official business name |
| `category` | VARCHAR(255) | Primary business category |
| `subcategories` | JSON | Additional categories |
| `address` | TEXT | Full street address |
| `city` | VARCHAR(255) | City |
| `state_province` | VARCHAR(255) | State/Province |
| `country` | VARCHAR(100) | Country |
| `country_code` | VARCHAR(10) | ISO country code |
| `postal_code` | VARCHAR(20) | ZIP/Postal code |
| `latitude` | DECIMAL(10,8) | Lat coordinate |
| `longitude` | DECIMAL(11,8) | Lng coordinate |
| `phone` | VARCHAR(50) | Primary phone |
| `phone_international` | VARCHAR(50) | International format phone |
| `website` | TEXT | Website URL |
| `website_domain` | VARCHAR(255) | Extracted domain |
| `email` | VARCHAR(255) | Best public email found |
| `email_source` | VARCHAR(50) | How email was found |
| `email_confidence` | INT | 0–100 confidence score |
| `whatsapp_number` | VARCHAR(50) | WhatsApp-compatible number |
| `rating` | DECIMAL(2,1) | Google rating |
| `review_count` | INT | Number of reviews |
| `source` | VARCHAR(50) | Discovery source |
| `source_url` | TEXT | Source listing URL |
| `social_facebook` | TEXT | Facebook page URL |
| `social_instagram` | TEXT | Instagram profile URL |
| `social_linkedin` | TEXT | LinkedIn page URL |
| `social_twitter` | TEXT | Twitter/X profile URL |
| `social_youtube` | TEXT | YouTube channel URL |
| `has_website` | BOOLEAN | Quick flag |
| `website_status` | ENUM | 'none','active','parked','error' |
| `audit_classification` | ENUM | 'none','outdated','average','strong' |
| `audit_score` | INT | 0–100 website quality |
| `opportunity_score` | INT | 0–100 redesign opportunity |
| `urgency_score` | INT | 0–100 urgency |
| `lead_score` | INT | 0–100 composite lead score |
| `lead_priority` | ENUM | 'hot','warm','cold','disqualified' |
| `stage` | VARCHAR(50) | CRM pipeline stage |
| `tags` | JSON | Array of tag strings |
| `assigned_to` | INT | Assigned user ID |
| `deal_value` | DECIMAL(10,2) | Estimated deal value |
| `notes_count` | INT | Cached note count |
| `last_contacted_at` | DATETIME | Last outreach timestamp |
| `last_enriched_at` | DATETIME | Last enrichment timestamp |
| `last_audited_at` | DATETIME | Last audit timestamp |
| `source_confidence` | INT | Source reliability score |
| `created_at` | DATETIME | Record creation |
| `updated_at` | DATETIME | Last update |

### Import / Export

- **CSV Import**: Upload CSV → map columns → validate → dedup check → import with `source = 'csv_import'`
- **CSV Export**: Select leads with filters → export with all fields → download

---

## 5. Website & Contact Enrichment

### Enrichment Pipeline

```
Lead with website URL
  ↓
Step 1: DNS + HTTP probe (is site live?)
  ↓
Step 2: Crawl up to 8 pages (home, about, contact, team, services, footer, privacy, terms)
  ↓
Step 3: Extract emails from:
  - mailto: links
  - visible text (regex)
  - contact forms (detect, don't submit)
  - structured data (JSON-LD, microdata)
  ↓
Step 4: Extract phone numbers, WhatsApp links, social profiles
  ↓
Step 5: Score and classify each email found
  ↓
Step 6: Hunter.io verification (if available)
  ↓
Step 7: MX record validation
  ↓
Step 8: Select best email, store all contacts
```

### Email Classification & Scoring

| Type | Example | Score | Priority |
|---|---|---|---|
| **Domain-match business** | info@theirbusiness.com | 90–100 | Highest |
| **Domain-match personal** | john@theirbusiness.com | 85–95 | High |
| **Domain-match role** | sales@theirbusiness.com | 80–90 | High |
| **Generic provider** | theirbusiness@gmail.com | 50–70 | Medium |
| **Mismatched domain** | contact@differentdomain.com | 20–40 | Low |
| **Risky/catch-all** | Any catch-all domain | 30–50 | Low |

### Extraction Priorities

1. **Contact page** — highest priority source
2. **Footer** — consistent across pages, often has canonical email
3. **About page** — may have personal/team emails
4. **Home page** — sometimes shows email in hero or header
5. **Privacy/Terms** — legal contact, often valid but generic
6. **Structured data** — JSON-LD, schema.org, OG tags

### Fallback Chain

```
Website scrape found email? → Use it (confidence based on type)
  ↓ No
Hunter.io has result? → Use it (confidence = Hunter score)
  ↓ No
Generate pattern (first.last@domain)? → Validate MX → Use if valid (confidence = 40)
  ↓ No
Mark as "no email found" → flag for manual research
```

### Screenshot Capture

- Capture full-page screenshot at 1440px width (desktop)
- Capture viewport screenshot at 375px width (mobile)
- Store in `/screenshots/{lead_id}/` as WebP
- Display in lead detail card and audit results

---

## 6. AI Website Audit Engine

### Classification System

| Classification | Criteria |
|---|---|
| **No Website** | No URL, DNS fails, parked domain, or domain-for-sale page |
| **Outdated Website** | Score 0–35: old design patterns, no mobile, Flash, tables layout, deprecated tech, broken elements |
| **Average Website** | Score 36–65: functional but lacks polish, missing CTAs, weak branding, slow load |
| **Strong Website** | Score 66–100: modern design, fast, mobile-friendly, clear CTAs, good branding |

### 12-Factor Audit Matrix

| # | Factor | Weight | What We Check | Scoring |
|---|---|---|---|---|
| 1 | **Design Freshness** | 12% | Visual style era, CSS framework age, image quality, whitespace usage | 0–10 |
| 2 | **Mobile Responsiveness** | 12% | Viewport meta, media queries, touch targets, mobile screenshot comparison | 0–10 |
| 3 | **CTA Clarity** | 10% | Presence of primary CTA, button visibility, above-fold CTA, CTA text quality | 0–10 |
| 4 | **Trust Signals** | 8% | SSL certificate, testimonials, reviews embed, certifications, portfolio | 0–10 |
| 5 | **Typography & Readability** | 7% | Font loading, size, contrast ratio, line height, heading hierarchy | 0–10 |
| 6 | **Branding Quality** | 8% | Logo presence, color consistency, brand voice, professional imagery | 0–10 |
| 7 | **Loading Speed** | 10% | Time to interactive, LCP, CLS, FCP, total page weight | 0–10 |
| 8 | **Structure & Navigation** | 8% | Menu presence, logical IA, breadcrumbs, footer links, sitemap | 0–10 |
| 9 | **SEO Basics** | 8% | Title tag, meta description, H1, alt tags, canonical, robots.txt | 0–10 |
| 10 | **Contact Visibility** | 7% | Phone/email in header, contact page link, contact form, map | 0–10 |
| 11 | **Conversion Readiness** | 5% | Lead capture form, booking widget, chat, phone click-to-call | 0–10 |
| 12 | **Accessibility Basics** | 5% | Alt text, focus states, color contrast, semantic HTML, ARIA labels | 0–10 |

### AI Audit Output (Per Lead)

```json
{
  "classification": "outdated",
  "overall_score": 28,
  "factors": {
    "design_freshness": { "score": 2, "observation": "Table-based layout, gradients from early 2010s era" },
    "mobile_responsiveness": { "score": 1, "observation": "No viewport meta tag, fixed-width layout at 960px" },
    "cta_clarity": { "score": 3, "observation": "Generic 'Click Here' buttons, no clear primary action" },
    ...
  },
  "top_3_redesign_reasons": [
    "Website is not mobile-friendly — over 60% of visitors will have a poor experience on phones",
    "Design style appears to be from 2010–2013 era, which may reduce trust with modern consumers",
    "No clear call-to-action or booking mechanism — potential customers may leave without engaging"
  ],
  "opportunity_summary": "This established dental practice has 4.7 stars and 200+ reviews but their website doesn't reflect their reputation. A modern redesign with online booking could significantly increase patient inquiries.",
  "urgency_score": 82,
  "recommended_website_type": "Modern service business site with online booking, testimonials integration, and mobile-first design",
  "best_outreach_angle": "reputation-mismatch",
  "outreach_angles": {
    "reputation-mismatch": "Your excellent reviews deserve a website that matches",
    "mobile-gap": "Most of your potential patients are searching on mobile",
    "competitor-ahead": "Other dentists in your area have invested in modern websites"
  }
}
```

### Audit Execution Flow

```
1. Check if website exists
   → No: classify as "no_website", score = 0, generate "no website" outreach angle
   
2. Load page in headless browser
   → Timeout/error: classify as "error", flag for retry
   
3. Capture screenshots (desktop + mobile)

4. Extract DOM metrics:
   - Viewport meta tag presence
   - CSS framework detection (Bootstrap version, etc.)
   - JavaScript framework detection
   - Image count, lazy loading
   - Form detection
   - SSL certificate
   - External resource count
   
5. Run Lighthouse audit (programmatic)
   - Performance score
   - Accessibility score
   - SEO score
   - Best practices score
   
6. Send to Claude AI with prompt:
   "Analyze this website for a web design agency prospecting for redesign clients.
    Given these metrics: {metrics}
    And this screenshot description: {screenshot_analysis}
    Score each of the 12 factors and provide redesign reasons."
    
7. Combine programmatic + AI scores
   → Weighted average = overall score
   → Classify based on thresholds
   
8. Store audit record with full breakdown
```

---

## 7. Lead Qualification & Scoring

### Composite Scoring Framework

The final **Lead Priority Score** (0–100) is computed from four sub-scores:

| Sub-Score | Weight | Range | What It Measures |
|---|---|---|---|
| **Opportunity Score** | 35% | 0–100 | How much does this business need a website/redesign? |
| **Contact Confidence Score** | 25% | 0–100 | How reliable is our contact info? |
| **Market Value Score** | 25% | 0–100 | How valuable is this potential client? |
| **Engagement Score** | 15% | 0–100 | How engaged/responsive has this lead been? |

### Opportunity Score Factors

| Factor | Points |
|---|---|
| No website at all | +40 |
| Outdated website (audit < 35) | +35 |
| Average website (audit 36–65) | +15 |
| No mobile responsiveness | +15 |
| No SSL | +10 |
| No CTA / no contact form | +10 |
| Slow loading (> 5s) | +8 |
| Bad SEO basics | +7 |
| Strong reviews but weak website | +15 (mismatch bonus) |

### Contact Confidence Score

| Factor | Points |
|---|---|
| Domain-match email verified | +40 |
| Email MX validated | +20 |
| Phone number present | +15 |
| Hunter.io verified | +15 |
| Multiple contact methods found | +10 |
| Generic email only (gmail, etc.) | −10 |
| No email found | −30 |

### Market Value Score

| Factor | Points |
|---|---|
| Premium niche (law, medical, real estate, finance) | +25 |
| High review count (> 50) | +15 |
| High rating (> 4.0) | +10 |
| Premium location (known affluent areas) | +10 |
| Multi-location business | +15 |
| Active social media presence | +10 |
| E-commerce potential | +15 |

### Engagement Score (Increases Over Time)

| Factor | Points |
|---|---|
| Email opened | +20 |
| Link clicked | +25 |
| Replied (positive) | +40 |
| Replied (neutral) | +20 |
| Replied (negative) | −10 |
| Meeting booked | +50 |
| No engagement after 3 emails | −15 |

### Priority Categories

| Priority | Score Range | Color | Action |
|---|---|---|---|
| 🔴 **Hot** | 75–100 | Red | Contact immediately |
| 🟠 **Warm** | 50–74 | Orange | Queue for next batch |
| 🟡 **Cold** | 25–49 | Yellow | Nurture or deprioritize |
| ⚪ **Disqualified** | 0–24 | Gray | Archive |

### Lead Tags

| Tag | Auto-Applied When |
|---|---|
| `no-website` | `has_website = false` |
| `redesign-opportunity` | `audit_classification IN ('outdated', 'average')` AND `opportunity_score >= 50` |
| `premium-brand-fit` | `market_value_score >= 70` |
| `high-value` | `lead_score >= 75` |
| `verified-email` | `email_confidence >= 80` |
| `no-email` | No email found after enrichment |
| `do-not-contact` | User or suppression action |
| `contacted` | At least one message sent |
| `replied` | Reply received |
| `positive-reply` | Reply classified as interested/positive |
| `booked-call` | Meeting stage reached |
| `won` | Deal closed |
| `lost` | Deal lost |

---

## 8. AI Personalization Engine

### Generation Types

| Type | Use Case | Length |
|---|---|---|
| **Subject Line** | Email subject | 5–10 words |
| **Opening Line** | First sentence hook | 1–2 sentences |
| **Cold Email (Full)** | First-touch email | 80–150 words |
| **WhatsApp Draft** | Short direct message | 30–60 words |
| **Follow-Up Email** | Steps 2–4 | 50–100 words |
| **Call Opener** | Phone script opening | 2–3 sentences |
| **Objection Handler** | Response to common pushbacks | 2–4 sentences |

### Data Inputs for Personalization

Every AI generation receives this context:

```json
{
  "business_name": "Smile Dental NYC",
  "industry": "Dental Practice",
  "location": "New York, NY",
  "has_website": true,
  "website_url": "www.smiledentalnyc.com",
  "audit_classification": "outdated",
  "audit_score": 28,
  "top_observations": [
    "Not mobile-friendly",
    "Design appears from 2011 era",
    "No online booking system"
  ],
  "opportunity_angle": "reputation-mismatch",
  "rating": 4.7,
  "review_count": 213,
  "brand_opportunity": "Excellent patient reviews but website doesn't convey that quality"
}
```

### Strict Guardrails (System Prompt Rules)

```
RULES — You MUST follow these strictly:

1. NEVER invent facts about the business that aren't in the data provided
2. NEVER insult or mock the business's current website
3. NEVER use spam trigger words: "act now", "limited time", "guaranteed", "you won't believe"
4. NEVER exaggerate claims about what a redesign will achieve
5. NEVER pretend to be the business's customer or claim to have visited
6. ALWAYS be respectful, professional, and genuinely helpful
7. ALWAYS use genuine observations from the audit data
8. KEEP tone: confident but not aggressive, helpful but not pushy
9. KEEP language: premium, concise, human — not robotic or salesy
10. FORMAT: short paragraphs, no long blocks, scannable
11. SIGN OFF: professional and warm
12. IF no website: frame as opportunity, not as criticism
13. IF outdated: frame as growth potential, not as failure
14. MAXIMUM 3 personalized observations per email
```

### Example Output — Cold Email

```
Subject: Quick thought about Smile Dental's online presence

Hi there,

I came across Smile Dental NYC while researching dental practices 
in New York — your 4.7-star rating with 213 reviews really stands out.

I noticed your website may not be fully optimized for mobile visitors, 
and it looks like there's no online booking option yet. With most 
patients now searching on their phones, these two things alone could 
be costing you appointments.

I help dental practices modernize their websites to match the quality 
of their care. Would it be worth a quick 10-minute call to see if 
there's an opportunity here?

Best regards,
{sender_name}
{agency_name}

---
You received this because your business is publicly listed. 
Reply STOP to opt out.
```

### Example Output — WhatsApp Draft

```
Hi! I found Smile Dental NYC on Google — impressive reviews 
(4.7 ⭐ from 213 patients). I noticed your website could use a 
refresh, especially on mobile. We help dental practices get 
modern websites that convert visitors into bookings. 
Worth a quick chat? 🙂
```

### Template Variations

The AI generates **3 variants** per outreach type with different:
- Angles (reputation-mismatch, mobile-gap, competitor-edge, growth-potential)
- Tones (consultative, direct, curious)
- CTAs (call, reply, link to calendar)

User picks the best or edits. A/B testing assigns variants to campaigns.

---

## 9. Outreach / Campaign System

### Campaign Structure

```
Campaign
  ├── Name, description, status
  ├── Audience (filter criteria or manual lead selection)
  ├── Sequence (ordered steps)
  │   ├── Step 1: Cold email (Day 0)
  │   ├── Step 2: Follow-up (Day 3)
  │   ├── Step 3: Value-add follow-up (Day 7)
  │   └── Step 4: Break-up email (Day 14)
  ├── Schedule (time window, timezone, daily cap)
  ├── Settings (tracking, approval mode, A/B config)
  └── Analytics (sent, opened, replied, bounced)
```

### Sequence Builder

| Step | Default Delay | Purpose | AI Template |
|---|---|---|---|
| 1 | Day 0 | Introduction + core observation | Cold email with audit insights |
| 2 | Day 3 | Gentle follow-up + new angle | Follow-up with additional value |
| 3 | Day 7 | Value-add (free tip or resource) | Soft re-engagement |
| 4 | Day 14 | Break-up / last touch | Clean close, leave door open |

### Deliverability Protection

| Protection | Implementation |
|---|---|
| **Daily send cap** | Configurable per domain (default: 30/day) |
| **Time windows** | Only send during business hours in recipient's timezone |
| **Warmup schedule** | Start 5/day → increase by 5 every 3 days → max cap |
| **Bounce handling** | Hard bounce → immediate stop + suppress; soft bounce → retry 2x |
| **Reply detection** | IMAP check every 5 minutes; auto-stop sequence on any reply |
| **Domain rotation** | Rotate between multiple sending domains if configured |
| **Throttle** | 30–90 second random delay between sends |
| **SPF/DKIM/DMARC** | Validate SMTP configuration on setup |
| **Tracking pixels** | Optional 1x1 transparent pixel for opens (can disable) |
| **Unsubscribe header** | RFC 8058 `List-Unsubscribe` header on every email |
| **Suppression check** | Pre-send validation against global suppression list |

### Reply Classification

| Category | Action | Examples |
|---|---|---|
| **Interested** | Move to "Interested" stage, notify rep | "Yes, let's talk", "Send me more info" |
| **Not Interested** | Move to "Replied — Not Interested", stop sequence | "Not interested", "No thanks" |
| **Unsubscribe** | Add to suppression, move to DNC | "Remove me", "Stop", "Unsubscribe" |
| **Auto-Reply** | Continue sequence (don't count as real reply) | "Out of office", "Auto-reply" |
| **Neutral** | Flag for manual review | "Who is this?", "What company?" |

### A/B Testing

- Test up to **3 subject line variants** per step
- Test up to **2 body variants** per step
- Auto-split audience evenly
- Winner determined by: reply rate > open rate > click rate
- Minimum sample: 30 sends before declaring winner

---

## 10. Mini CRM

### Pipeline Stages

| Stage | Color | Description | Auto-Transition |
|---|---|---|---|
| `new` | Gray | Just discovered | Discovery complete |
| `enriched` | Blue | Contact info found | Enrichment complete |
| `qualified` | Green | Scored ≥ 50, email verified | Scoring complete |
| `ready_to_contact` | Teal | Outreach drafted, approved | Manual or auto |
| `contacted` | Purple | First message sent | Send event |
| `replied` | Orange | Reply received | Reply detection |
| `interested` | Amber | Positive reply classified | AI classification |
| `meeting_booked` | Cyan | Call/meeting scheduled | Manual |
| `proposal_sent` | Indigo | Proposal delivered | Manual |
| `won` | Green (bright) | Deal closed | Manual |
| `lost` | Red | Deal lost | Manual |
| `do_not_contact` | Black | Suppressed | Manual or auto |

### Lead Detail Page

```
┌─────────────────────────────────────────────────────────┐
│  🏢  Smile Dental NYC                    ⭐ 4.7 (213)  │
│  📍  New York, NY, US                                   │
│  🌐  www.smiledentalnyc.com              📧 Verified   │
│  🏷️  #redesign-opportunity #premium #hot               │
│  Lead Score: 82/100            Stage: Qualified         │
├─────────────────────────────────────────────────────────┤
│  [Overview] [Audit] [Outreach] [Timeline] [Notes]       │
├─────────────────────────────────────────────────────────┤
│  WEBSITE AUDIT SUMMARY                                  │
│  Classification: Outdated (28/100)                      │
│  ┌──────────┬──────────┬──────────┐                     │
│  │ Desktop  │  Mobile  │ Score    │                     │
│  │ 📷       │  📷      │ 28/100   │                     │
│  └──────────┴──────────┴──────────┘                     │
│                                                         │
│  Top Redesign Reasons:                                  │
│  1. Not mobile-friendly                                 │
│  2. Design from 2011 era                                │
│  3. No online booking system                            │
│                                                         │
│  Opportunity: Excellent reviews, website doesn't match  │
│  Urgency: 82/100                                        │
├─────────────────────────────────────────────────────────┤
│  OUTREACH HISTORY                                       │
│  📧 Step 1 sent — Mar 1 — Opened (2x)                  │
│  📧 Step 2 sent — Mar 4 — Opened (1x)                  │
│  💬 WhatsApp sent — Mar 5                               │
│  📩 Reply received — Mar 5 — "Interested, send info"   │
├─────────────────────────────────────────────────────────┤
│  ACTIVITY TIMELINE                                      │
│  Mar 5 — Reply received (positive)                      │
│  Mar 5 — WhatsApp message sent                          │
│  Mar 4 — Follow-up email sent                           │
│  Mar 1 — Cold email sent                                │
│  Feb 28 — Audit completed (28/100)                      │
│  Feb 28 — Email found (info@smiledentalnyc.com)         │
│  Feb 27 — Lead discovered via Google Maps               │
├─────────────────────────────────────────────────────────┤
│  NOTES & TASKS                                          │
│  📝 "They're interested in a full redesign" — John      │
│  ✅ Send proposal by Mar 8                              │
│  ⏰ Follow-up call scheduled Mar 7 at 2pm               │
│                                                         │
│  Assigned to: John Smith                                │
│  Deal Value: $3,500                                     │
│  Next Action: Send proposal                             │
└─────────────────────────────────────────────────────────┘
```

---

## 11. Dashboard & Analytics

### KPI Cards (Top Row)

| Metric | Description | Icon |
|---|---|---|
| **Total Leads** | All leads in system | 📊 |
| **Enriched** | Leads with contact info | ✉️ |
| **Verified Emails** | Confidence ≥ 80% | ✅ |
| **No Website** | Leads without a website | 🚫 |
| **Redesign Opps** | Audit score < 50 | 🔧 |
| **Active Campaigns** | Currently sending | 📤 |
| **Open Rate** | Avg across campaigns | 👁️ |
| **Reply Rate** | Avg across campaigns | 💬 |
| **Positive Replies** | Interested + meeting | 🎯 |
| **Deals Won** | Closed deals | 🏆 |

### Charts

| Chart | Type | Description |
|---|---|---|
| **Lead Funnel** | Funnel | Discovered → Enriched → Qualified → Contacted → Replied → Won |
| **Discovery Trend** | Line | Leads discovered per day/week |
| **Campaign Performance** | Bar | Open/reply/bounce rates per campaign |
| **Niche Distribution** | Pie/Donut | Leads by industry category |
| **Geographic Heat Map** | Map | Leads by country/city |
| **Pipeline Value** | Bar (stacked) | Deal value by stage |
| **Rep Performance** | Table | Leads contacted, replies, deals per rep |
| **Template Ranking** | Table | Best subject lines by open rate |
| **Audit Distribution** | Donut | No website / Outdated / Average / Strong |
| **Weekly Activity** | Stacked Area | Actions per day (discover, enrich, audit, send, reply) |

### Filters

All charts can be filtered by:
- **Date range** (preset: 7d, 30d, 90d, custom)
- **Niche / Category**
- **Country / City**
- **Source**
- **Campaign**
- **Assigned rep**

---

## 12. Roles & Permissions

### Role Matrix

| Permission | Admin | Manager | Sales Rep | Researcher | Copy Reviewer |
|---|---|---|---|---|---|
| **View dashboard** | ✅ | ✅ | ✅ (own) | ❌ | ❌ |
| **Manage team** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **API keys / billing** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Create campaigns** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Send outreach** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Approve messages** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Discover leads** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Enrich leads** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Run audits** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Edit lead data** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Manage CRM** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **View compliance** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Manage suppression** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View all leads** | ✅ | ✅ | ❌ (own) | ✅ | ❌ |
| **Export data** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Delete data** | ✅ | ❌ | ❌ | ❌ | ❌ |

### Role Descriptions

| Role | Purpose |
|---|---|
| **Admin** | Full platform control, billing, team management, all data access |
| **Manager** | Campaign oversight, compliance management, team lead allocation, reporting |
| **Sales Rep** | Lead management, outreach execution, CRM pipeline for own leads |
| **Researcher** | Lead discovery, enrichment, auditing — no outreach or CRM access |
| **Copy Reviewer** | Review and approve/reject AI-generated messages before sending |

---

## 13. Database Schema

### Entity Relationship Overview

```
organizations ─┬── users
               ├── leads ──┬── lead_contacts
               │           ├── lead_sources
               │           ├── website_audits
               │           ├── lead_scores
               │           ├── notes
               │           ├── tasks
               │           └── activity_logs
               ├── campaigns ──┬── sequences
               │               ├── campaign_leads
               │               └── outreach_messages
               ├── templates
               ├── inbox_threads ── replies
               ├── suppression_list
               └── settings
```

### Table Definitions

#### `organizations`
Stores tenant/workspace data for multi-tenant SaaS.

| Field | Type | Description |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | Organization ID |
| `name` | VARCHAR(255) | Organization name |
| `slug` | VARCHAR(100) UNIQUE | URL-friendly slug |
| `plan` | ENUM('free','starter','pro','enterprise') | Subscription plan |
| `monthly_lead_limit` | INT | Plan-based lead limit |
| `monthly_email_limit` | INT | Plan-based send limit |
| `stripe_customer_id` | VARCHAR(255) | Billing integration |
| `settings` | JSON | Organization-level settings |
| `created_at` | DATETIME | Created timestamp |
| `updated_at` | DATETIME | Updated timestamp |

#### `users`
Team members within an organization.

| Field | Type | Description |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | User ID |
| `organization_id` | INT FK → organizations | Parent org |
| `email` | VARCHAR(255) UNIQUE | Login email |
| `password_hash` | VARCHAR(255) | Bcrypt hash |
| `full_name` | VARCHAR(255) | Display name |
| `role` | ENUM('admin','manager','sales_rep','researcher','copy_reviewer') | Role |
| `avatar_url` | TEXT | Profile picture |
| `is_active` | BOOLEAN DEFAULT TRUE | Account active |
| `last_login_at` | DATETIME | Last login |
| `created_at` | DATETIME | Created |
| `updated_at` | DATETIME | Updated |

#### `leads`
Core lead records — the central entity of the platform.

*(Full field list as defined in Section 4 — 50+ fields)*

Key relationships:
- `organization_id` FK → organizations
- `campaign_id` FK → campaigns (nullable, discovery campaign)
- `assigned_to` FK → users (nullable)

Indexes:
- `idx_org_stage` on (organization_id, stage)
- `idx_org_score` on (organization_id, lead_score)
- `idx_google_place_id` on (google_place_id) UNIQUE where NOT NULL
- `idx_domain` on (website_domain)
- `idx_email` on (email)

#### `lead_contacts`
Multiple contact methods per lead.

| Field | Type | Description |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | Contact ID |
| `lead_id` | INT FK → leads | Parent lead |
| `type` | ENUM('email','phone','whatsapp','social') | Contact type |
| `value` | VARCHAR(500) | Contact value |
| `label` | VARCHAR(100) | e.g., "Main office", "CEO" |
| `confidence` | INT | 0–100 confidence |
| `source` | VARCHAR(100) | How found |
| `is_primary` | BOOLEAN | Primary contact method |
| `is_verified` | BOOLEAN | Verification status |
| `verified_at` | DATETIME | When verified |
| `created_at` | DATETIME | Created |

#### `lead_sources`
Source traceability — records every source that contributed data for a lead.

| Field | Type | Description |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | Source record ID |
| `lead_id` | INT FK → leads | Parent lead |
| `source_type` | VARCHAR(50) | 'google_places', 'serpapi', 'csv_import', 'manual', 'hunter_io' |
| `source_url` | TEXT | URL of the source listing |
| `source_data` | JSON | Raw data snapshot from source |
| `confidence` | INT | Source reliability score |
| `captured_at` | DATETIME | When captured |

#### `website_audits`
Website audit records with full factor breakdown.

| Field | Type | Description |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | Audit ID |
| `lead_id` | INT FK → leads | Parent lead |
| `url_audited` | TEXT | URL that was audited |
| `classification` | ENUM('none','outdated','average','strong') | Classification |
| `overall_score` | INT | Weighted 0–100 score |
| `factor_scores` | JSON | 12-factor breakdown with scores + observations |
| `top_redesign_reasons` | JSON | Array of top 3 reasons |
| `opportunity_summary` | TEXT | AI-generated opportunity description |
| `urgency_score` | INT | 0–100 urgency |
| `recommended_website_type` | TEXT | What kind of site they need |
| `best_outreach_angle` | VARCHAR(100) | Best personalization angle |
| `outreach_angles` | JSON | Map of angle → description |
| `screenshot_desktop` | TEXT | Path to desktop screenshot |
| `screenshot_mobile` | TEXT | Path to mobile screenshot |
| `lighthouse_scores` | JSON | Lighthouse performance/SEO/accessibility |
| `tech_stack` | JSON | Detected technologies |
| `ssl_valid` | BOOLEAN | SSL certificate valid |
| `page_load_time_ms` | INT | Load time in milliseconds |
| `mobile_friendly` | BOOLEAN | Mobile responsive |
| `has_contact_form` | BOOLEAN | Contact form detected |
| `has_booking_widget` | BOOLEAN | Booking/scheduling detected |
| `ai_model_used` | VARCHAR(100) | Which AI model ran the audit |
| `audited_at` | DATETIME | When audit ran |
| `created_at` | DATETIME | Created |

#### `lead_scores`
Mutable scoring records — recalculated as data changes.

| Field | Type | Description |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | Score record ID |
| `lead_id` | INT FK → leads UNIQUE | One score record per lead |
| `opportunity_score` | INT | 0–100 |
| `contact_confidence_score` | INT | 0–100 |
| `market_value_score` | INT | 0–100 |
| `engagement_score` | INT | 0–100 |
| `composite_score` | INT | Weighted final score |
| `priority` | ENUM('hot','warm','cold','disqualified') | Computed priority |
| `scoring_factors` | JSON | Breakdown of what contributed |
| `scored_at` | DATETIME | When last computed |
| `created_at` | DATETIME | Created |
| `updated_at` | DATETIME | Updated |

#### `campaigns`
Outreach campaign definitions.

| Field | Type | Description |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | Campaign ID |
| `organization_id` | INT FK → organizations | Parent org |
| `name` | VARCHAR(255) | Campaign name |
| `description` | TEXT | Campaign description |
| `status` | ENUM('draft','active','paused','completed','archived') | Status |
| `campaign_type` | ENUM('discovery','outreach') | Discovery or outreach campaign |
| `audience_filter` | JSON | Filter criteria for target leads |
| `daily_send_limit` | INT | Max sends per day |
| `send_start_hour` | INT | Start hour (0–23) |
| `send_end_hour` | INT | End hour (0–23) |
| `send_timezone` | VARCHAR(50) | Timezone for send window |
| `send_days` | JSON | Array of weekdays [1,2,3,4,5] |
| `tracking_enabled` | BOOLEAN DEFAULT TRUE | Enable open tracking |
| `approval_required` | BOOLEAN DEFAULT FALSE | Require manual approval |
| `ab_testing_enabled` | BOOLEAN DEFAULT FALSE | Enable A/B splits |
| `smtp_config_id` | INT | Which SMTP to use |
| `total_leads` | INT DEFAULT 0 | Cached count |
| `total_sent` | INT DEFAULT 0 | Cached count |
| `total_opened` | INT DEFAULT 0 | Cached count |
| `total_replied` | INT DEFAULT 0 | Cached count |
| `total_bounced` | INT DEFAULT 0 | Cached count |
| `created_by` | INT FK → users | Creator |
| `created_at` | DATETIME | Created |
| `updated_at` | DATETIME | Updated |

#### `sequences`
Multi-step email sequences within a campaign.

| Field | Type | Description |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | Sequence step ID |
| `campaign_id` | INT FK → campaigns | Parent campaign |
| `step_number` | INT | 1, 2, 3, 4... |
| `delay_days` | INT | Days after previous step |
| `delay_hours` | INT | Additional hours delay |
| `subject_template` | TEXT | Subject with {{variables}} |
| `body_template` | TEXT | Body with {{variables}} |
| `variant_label` | VARCHAR(10) | 'A', 'B', 'C' for A/B testing |
| `is_ai_generated` | BOOLEAN | Was this AI-written |
| `template_id` | INT FK → templates | Optional base template link |
| `created_at` | DATETIME | Created |
| `updated_at` | DATETIME | Updated |

#### `campaign_leads`
Many-to-many between campaigns and leads, tracking per-lead campaign state.

| Field | Type | Description |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | ID |
| `campaign_id` | INT FK → campaigns | Campaign |
| `lead_id` | INT FK → leads | Lead |
| `current_step` | INT DEFAULT 0 | Last completed step |
| `status` | ENUM('pending','active','paused','completed','replied','bounced','unsubscribed') | Lead's campaign status |
| `variant_assigned` | VARCHAR(10) | A/B variant for this lead |
| `next_send_at` | DATETIME | When next step should fire |
| `enrolled_at` | DATETIME | When lead entered campaign |
| `completed_at` | DATETIME | When finished/exited |
| `created_at` | DATETIME | Created |

Unique index: (campaign_id, lead_id)

#### `templates`
Reusable email/message templates.

| Field | Type | Description |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | Template ID |
| `organization_id` | INT FK → organizations | Owner org |
| `name` | VARCHAR(255) | Template name |
| `type` | ENUM('email','whatsapp','call_script') | Template type |
| `category` | VARCHAR(100) | e.g., 'cold_intro', 'follow_up', 'breakup' |
| `subject` | TEXT | Subject template (email) |
| `body` | TEXT | Body template |
| `variables` | JSON | List of {{variable}} names used |
| `is_ai_generated` | BOOLEAN | AI-created |
| `performance_score` | DECIMAL(5,2) | Reply rate or effectiveness score |
| `times_used` | INT DEFAULT 0 | Usage count |
| `created_by` | INT FK → users | Creator |
| `created_at` | DATETIME | Created |
| `updated_at` | DATETIME | Updated |

#### `outreach_messages`
Every individual message sent or scheduled.

| Field | Type | Description |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | Message ID |
| `organization_id` | INT FK → organizations | Owner org |
| `campaign_id` | INT FK → campaigns | Campaign (nullable for manual sends) |
| `lead_id` | INT FK → leads | Recipient lead |
| `sequence_step` | INT | Step number in sequence |
| `channel` | ENUM('email','whatsapp','call') | Outreach channel |
| `direction` | ENUM('outbound','inbound') | Message direction |
| `status` | ENUM('draft','scheduled','queued','sending','sent','delivered','opened','clicked','replied','bounced','failed') | Message status |
| `subject` | TEXT | Email subject |
| `body` | TEXT | Message body (HTML for email) |
| `plain_text` | TEXT | Plain-text version |
| `from_email` | VARCHAR(255) | Sender email |
| `to_email` | VARCHAR(255) | Recipient email |
| `message_id` | VARCHAR(255) | SMTP Message-ID |
| `tracking_id` | VARCHAR(100) UNIQUE | Open/click tracking ID |
| `opened_at` | DATETIME | First open |
| `open_count` | INT DEFAULT 0 | Total opens |
| `clicked_at` | DATETIME | First click |
| `replied_at` | DATETIME | Reply detected |
| `bounced_at` | DATETIME | Bounce detected |
| `bounce_type` | ENUM('hard','soft') | Bounce classification |
| `error_message` | TEXT | Failure details |
| `approved_by` | INT FK → users | Approver (if approval mode) |
| `approved_at` | DATETIME | Approval timestamp |
| `sent_at` | DATETIME | When sent |
| `scheduled_for` | DATETIME | Scheduled send time |
| `created_at` | DATETIME | Created |

#### `inbox_threads`
Grouped message threads for inbox view.

| Field | Type | Description |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | Thread ID |
| `organization_id` | INT FK → organizations | Owner org |
| `lead_id` | INT FK → leads | Lead in thread |
| `campaign_id` | INT FK → campaigns | Campaign link (nullable) |
| `subject` | TEXT | Thread subject |
| `last_message_at` | DATETIME | Most recent message |
| `message_count` | INT | Messages in thread |
| `is_read` | BOOLEAN DEFAULT FALSE | Read status |
| `status` | ENUM('active','archived','snoozed') | Thread status |
| `snoozed_until` | DATETIME | Snooze date (nullable) |
| `created_at` | DATETIME | Created |

#### `replies`
Received replies linked to threads.

| Field | Type | Description |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | Reply ID |
| `thread_id` | INT FK → inbox_threads | Parent thread |
| `lead_id` | INT FK → leads | Lead who replied |
| `outreach_message_id` | INT FK → outreach_messages | Which message they replied to |
| `from_email` | VARCHAR(255) | Sender email |
| `subject` | TEXT | Reply subject |
| `body` | TEXT | Reply body |
| `plain_text` | TEXT | Plain text |
| `classification` | ENUM('interested','not_interested','unsubscribe','auto_reply','neutral','unknown') | AI classification |
| `sentiment_score` | DECIMAL(3,2) | -1.0 to 1.0 |
| `imap_message_id` | VARCHAR(255) | IMAP Message-ID |
| `received_at` | DATETIME | When received |
| `classified_at` | DATETIME | When AI classified |
| `created_at` | DATETIME | Created |

#### `notes`
User notes on leads.

| Field | Type | Description |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | Note ID |
| `lead_id` | INT FK → leads | Parent lead |
| `user_id` | INT FK → users | Author |
| `content` | TEXT | Note content |
| `is_pinned` | BOOLEAN DEFAULT FALSE | Pinned to top |
| `created_at` | DATETIME | Created |
| `updated_at` | DATETIME | Updated |

#### `tasks`
Follow-up tasks and reminders.

| Field | Type | Description |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | Task ID |
| `organization_id` | INT FK → organizations | Owner org |
| `lead_id` | INT FK → leads | Related lead (nullable) |
| `assigned_to` | INT FK → users | Assigned user |
| `created_by` | INT FK → users | Creator |
| `title` | VARCHAR(500) | Task title |
| `description` | TEXT | Details |
| `type` | ENUM('follow_up','call','email','meeting','proposal','other') | Task type |
| `priority` | ENUM('low','medium','high','urgent') | Priority |
| `status` | ENUM('pending','in_progress','completed','cancelled') | Status |
| `due_at` | DATETIME | Due date |
| `completed_at` | DATETIME | Completion date |
| `reminder_at` | DATETIME | Reminder trigger time |
| `created_at` | DATETIME | Created |
| `updated_at` | DATETIME | Updated |

#### `suppression_list`
Global do-not-contact registry.

| Field | Type | Description |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | Suppression ID |
| `organization_id` | INT FK → organizations | Owner org |
| `type` | ENUM('email','domain','phone') | Suppression type |
| `value` | VARCHAR(500) | Email/domain/phone |
| `reason` | VARCHAR(255) | Why suppressed |
| `source` | ENUM('manual','unsubscribe','bounce','complaint','import') | How added |
| `added_by` | INT FK → users | Who added (nullable for auto) |
| `created_at` | DATETIME | Created |

Unique index: (organization_id, type, value)

#### `activity_logs`
Complete audit trail for every action.

| Field | Type | Description |
|---|---|---|
| `id` | BIGINT PK AUTO_INCREMENT | Log ID |
| `organization_id` | INT FK → organizations | Owner org |
| `user_id` | INT FK → users | Acting user (nullable for system) |
| `lead_id` | INT FK → leads | Related lead (nullable) |
| `campaign_id` | INT FK → campaigns | Related campaign (nullable) |
| `action` | VARCHAR(100) | Action type (e.g., 'lead.created', 'email.sent', 'stage.changed') |
| `entity_type` | VARCHAR(50) | Entity affected |
| `entity_id` | INT | Entity ID |
| `details` | JSON | Action details / diff |
| `ip_address` | VARCHAR(45) | Client IP |
| `created_at` | DATETIME | Timestamp |

Index: (organization_id, created_at DESC)

#### `smtp_configs`
Multiple SMTP sending accounts.

| Field | Type | Description |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | Config ID |
| `organization_id` | INT FK → organizations | Owner org |
| `name` | VARCHAR(255) | Display name |
| `host` | VARCHAR(255) | SMTP host |
| `port` | INT | SMTP port |
| `secure` | BOOLEAN | TLS |
| `username` | VARCHAR(255) | SMTP username |
| `password_encrypted` | TEXT | Encrypted password |
| `from_email` | VARCHAR(255) | From email address |
| `from_name` | VARCHAR(255) | From display name |
| `daily_limit` | INT DEFAULT 50 | Daily send limit for this account |
| `warmup_enabled` | BOOLEAN DEFAULT FALSE | Warmup mode |
| `warmup_current_limit` | INT | Current warmup daily limit |
| `is_verified` | BOOLEAN DEFAULT FALSE | Connection tested |
| `is_active` | BOOLEAN DEFAULT TRUE | Active for sending |
| `last_sent_at` | DATETIME | Last successful send |
| `created_at` | DATETIME | Created |
| `updated_at` | DATETIME | Updated |

---

## 14. Technical Architecture

### System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│    React 18 + Carbon Design System + Recharts + TanStack     │
│    Hosted: Vercel / Netlify / Static on same origin          │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS / REST + SSE
┌───────────────────────────┴──────────────────────────────────┐
│                     API GATEWAY (Express.js)                  │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Auth   │ │  Rate    │ │  RBAC    │ │  Request         │ │
│  │  (JWT)  │ │  Limiter │ │  Guard   │ │  Validation      │ │
│  └─────────┘ └──────────┘ └──────────┘ └──────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│                     APPLICATION LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Lead Routes  │  │ Campaign     │  │ Outreach     │       │
│  │ /api/leads   │  │ Routes       │  │ Routes       │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ CRM Routes  │  │ Audit Routes │  │ Analytics    │       │
│  │              │  │              │  │ Routes       │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
├──────────────────────────────────────────────────────────────┤
│                     SERVICE LAYER                             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │ Discovery      │  │ Enrichment     │  │ Audit          │ │
│  │ Service        │  │ Service        │  │ Service        │ │
│  │ (Google Maps)  │  │ (Email+Phone)  │  │ (AI+Lighthouse)│ │
│  └────────────────┘  └────────────────┘  └────────────────┘ │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │ AI Service     │  │ Campaign       │  │ Email Send     │ │
│  │ (Claude API)   │  │ Service        │  │ Service (SMTP) │ │
│  └────────────────┘  └────────────────┘  └────────────────┘ │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │ Score Service  │  │ Reply Service  │  │ Screenshot     │ │
│  │ (Lead Scoring) │  │ (IMAP Check)   │  │ Service        │ │
│  └────────────────┘  └────────────────┘  └────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│                     WORKER / QUEUE LAYER                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  MySQL-backed Job Queue (no Redis dependency)          │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐ │  │
│  │  │ Enrich  │ │ Audit   │ │ Send    │ │ Reply Check │ │  │
│  │  │ Worker  │ │ Worker  │ │ Worker  │ │ Worker      │ │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────┘ │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Cron Scheduler (node-cron)                            │  │
│  │  - Queue processor (every 30s)                         │  │
│  │  - Email sender (every 2min)                           │  │
│  │  - Reply checker (every 5min)                          │  │
│  │  - Score recalculation (every 15min)                   │  │
│  │  - Cleanup (daily at 2am)                              │  │
│  └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│                     DATA LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   MySQL 8     │  │  File Storage │  │  External     │       │
│  │   (Primary)   │  │  /screenshots │  │  APIs         │       │
│  │               │  │  /exports     │  │  - Claude     │       │
│  │   20+ tables  │  │  /attachments │  │  - Google Maps│       │
│  │               │  │               │  │  - Hunter.io  │       │
│  └──────────────┘  └──────────────┘  │  - SerpApi    │       │
│                                       └──────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

### Recommended Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React 18 + Carbon Design System v11 | IBM's enterprise-grade design system; accessible, dark mode, data-dense UIs |
| **UI Components** | @carbon/react | DataTable, Pagination, Modal, Tabs, Tag, ProgressIndicator, Tile |
| **Charts** | @carbon/charts-react | Consistent Carbon-styled charts (or Recharts with Carbon theme) |
| **State Management** | TanStack Query (React Query) | Server state caching, refetch, optimistic updates |
| **Routing** | React Router v6 | SPA navigation |
| **Backend** | Node.js 20 + Express.js | Already in place, battle-tested |
| **Database** | MySQL 8.0 | Already in place, reliable, well-supported |
| **ORM / Query** | mysql2 (raw) + simple query builder | Keep it lean, no Prisma overhead |
| **Auth** | JWT (jsonwebtoken) + bcrypt | Already in place |
| **AI** | Anthropic Claude API (claude-sonnet-4-20250514) | Strong reasoning, structured output |
| **Email** | Nodemailer + SMTP | Already in place |
| **Web Scraping** | Cheerio + node-fetch | Already in place, lightweight |
| **Browser Automation** | Puppeteer (for audits/screenshots) | Headless Chrome |
| **Job Queue** | MySQL-backed queue | Already in place, no Redis needed |
| **Cron** | node-cron | Already in place |
| **File Storage** | Local filesystem (MVP) → S3/R2 (scale) | Screenshots, exports |
| **Monitoring** | Winston (logging) + Sentry (errors) | Production observability |
| **Deployment** | cPanel (current) → Docker + Railway/Render (scale) | Easy migration path |

### Carbon Design System Theme

The entire UI follows IBM Carbon Design System v11:

| Aspect | Carbon Specification |
|---|---|
| **Color Theme** | `g100` (dark) and `white` (light) — user toggle |
| **Primary Color** | Carbon Blue (#0f62fe) |
| **Grid** | 16-column CSS Grid with Carbon spacing tokens |
| **Typography** | IBM Plex Sans (400, 500, 600) |
| **Spacing** | Carbon spacing scale ($spacing-01 through $spacing-13) |
| **Icons** | @carbon/icons-react (16px, 20px, 24px, 32px) |
| **Data Tables** | Carbon DataTable with sorting, filtering, pagination, batch actions |
| **Notifications** | Carbon InlineNotification + ToastNotification |
| **Modals** | Carbon ComposedModal for forms/confirmations |
| **Navigation** | Carbon UI Shell (SideNav + Header) |
| **Loading** | Carbon InlineLoading + SkeletonText |

---

## 15. UX / UI Structure

### Information Architecture

```
OpenClaw App
├── 🏠 Dashboard
├── 🔍 Find Leads (Discovery)
├── 📦 Lead Database
│   ├── All Leads
│   ├── Enrichment Queue
│   └── Audit Queue
├── 🎯 Qualified Leads
├── 📧 Campaigns
│   ├── All Campaigns
│   └── Campaign Detail
├── 📝 Templates
├── 📬 Inbox
├── 🏗️ CRM Pipeline
├── 📊 Analytics
├── 🛡️ Compliance Center
├── 👥 Team & Roles
└── ⚙️ Settings
    ├── General
    ├── API Keys
    ├── SMTP Configuration
    ├── Send Limits
    └── Billing
```

### Page Designs

#### Dashboard

**Layout**: Full-width, Carbon Grid, 4-column KPI row + chart grid below

| Section | Content |
|---|---|
| **KPI Row** | 6 stat tiles: Total Leads, Verified Emails, No Website, Redesign Opps, Active Campaigns, Reply Rate |
| **Funnel Chart** | Lead funnel: Discovered → Enriched → Qualified → Contacted → Replied → Won |
| **Activity Feed** | Last 20 actions (timeline format): "Lead enriched", "Email sent", "Reply received" |
| **Campaign Cards** | Top 3 active campaigns with open/reply stats |
| **Quick Actions** | "Find New Leads", "Run Audit Queue", "View Hot Leads" buttons |

**Filters**: Date range selector (7d, 30d, 90d, custom)

#### Find Leads

**Layout**: Split — left panel (search form) + right panel (results table)

| Section | Content |
|---|---|
| **Search Form** | Keyword input, Location (city + country), Category dropdown, Radius slider, Has Website toggle, Min Rating, Min Reviews |
| **Start Button** | "Discover Leads" — triggers live SSE discovery |
| **Progress** | Carbon ProgressIndicator: Searching → Filtering → Verifying → Scoring → Saving |
| **Results Table** | Carbon DataTable: Name, Category, City, Rating, Reviews, Website Status, Score, Actions |
| **Batch Actions** | "Enrich Selected", "Add to Campaign", "Export" |
| **Live Log** | Collapsible SSE log showing real-time discovery events |

#### Lead Database

**Layout**: Full-width DataTable with filter sidebar

| Section | Content |
|---|---|
| **Filter Panel** | Stage, Score Range, Classification, Has Email, Niche, Country, Source, Date Range, Tags |
| **DataTable** | Sortable columns: Name, Category, City, Country, Rating, Email, Website Status, Audit Score, Lead Score, Stage, Last Action |
| **Row Actions** | View Detail, Enrich, Audit, Add to Campaign, Mark DNC |
| **Batch Actions** | Bulk Enrich, Bulk Audit, Bulk Tag, Export CSV |
| **Pagination** | Carbon Pagination (25, 50, 100 per page) |

#### Lead Detail (Modal or Full Page)

**Layout**: Tabbed interface within a slide-over panel or full page

| Tab | Content |
|---|---|
| **Overview** | Business info card, contact details, tags, score badges, assigned owner, deal value |
| **Audit** | Screenshot gallery, 12-factor radar chart, classification badge, redesign reasons, outreach angles |
| **Outreach** | Message history (sent + received), WhatsApp log, draft generator, quick actions |
| **Timeline** | Activity log reverse-chronological |
| **Notes** | Note list with add form, pinned notes on top |
| **Tasks** | Task list, add task form, upcoming reminders |

#### Campaigns

**Layout**: Card grid (campaigns list) + DataTable option

| Section | Content |
|---|---|
| **Campaign Cards** | Name, Status badge, Lead count, Sent/Opened/Replied counts, progress bar |
| **Create New** | Wizard: Name → Select Audience → Build Sequence → Set Schedule → Review → Launch |
| **Campaign Detail** | Stats row + sequence timeline + lead list with per-lead status + message log |

#### CRM Pipeline

**Layout**: Kanban board (drag-and-drop)

| Section | Content |
|---|---|
| **Columns** | One per stage (New → Enriched → Qualified → Contacted → Replied → Interested → Meeting → Proposal → Won → Lost) |
| **Lead Cards** | Name, score badge, last action date, email indicator, priority color |
| **Drag-and-Drop** | Move cards between columns to change stage |
| **Filters** | By niche, country, assigned rep, score range |
| **Quick Add** | "Add Lead" button at column top |

#### Analytics

**Layout**: Chart dashboard with filter bar

| Section | Content |
|---|---|
| **Filter Bar** | Date range, niche, country, campaign, rep |
| **Row 1** | 4 KPI tiles: Discovery count, Enrichment rate, Audit rate, Outreach rate |
| **Row 2** | Funnel chart + Pipeline value chart |
| **Row 3** | Campaign comparison table + Template performance table |
| **Row 4** | Geographic breakdown + Niche breakdown |

#### Compliance Center

**Layout**: Tabbed interface

| Tab | Content |
|---|---|
| **Suppression List** | DataTable of suppressed emails/domains/phones with search + add/remove |
| **Opt-Out Log** | Timeline of all opt-out events |
| **Source Audit** | Lead-by-lead source traceability |
| **Settings** | Unsubscribe footer text, retention policies, GDPR options |

#### Settings

**Layout**: Vertical navigation (settings categories) + form area

| Section | Content |
|---|---|
| **General** | Organization name, timezone, language |
| **API Keys** | Google Maps, Claude, Hunter.io, SerpApi — masked inputs |
| **SMTP** | Add/test SMTP accounts, warmup settings |
| **Send Limits** | Daily caps, time windows, throttle settings |
| **Team** | Invite members, assign roles, manage access |
| **Billing** | Plan details, usage, upgrade (Phase 3) |

---

## 16. MVP vs Advanced Version

### MVP (Version 1.0)

**Goal**: Working end-to-end pipeline from discovery to outreach.

| Module | MVP Scope |
|---|---|
| **Discovery** | Google Maps search by keyword + location, basic filters, dedup by place_id |
| **Enrichment** | Website email scraping + Hunter.io + MX validation |
| **Audit** | AI-powered audit (Claude) with 12-factor scoring, classification, top 3 reasons |
| **Personalization** | AI email generation (cold + 3 follow-ups), WhatsApp draft |
| **Campaigns** | Create campaign, add leads, multi-step sequence, send via SMTP |
| **CRM** | Basic pipeline (kanban), stage management, notes |
| **Dashboard** | KPI cards, lead funnel, activity feed |
| **Compliance** | Suppression list, opt-out footer, DNC tag |
| **Auth** | Login, roles (admin + sales rep), JWT |
| **Settings** | API keys, SMTP config, send limits |
| **Frontend** | Carbon Design System SPA, responsive |

### Version 2.0 Features

| Feature | Description |
|---|---|
| **Screenshot Capture** | Puppeteer-based desktop + mobile screenshots |
| **Inbox Sync** | IMAP reply detection + threaded inbox view |
| **A/B Testing** | Subject/body variant testing with auto-winner |
| **Advanced Analytics** | Geographic heat map, niche analytics, rep performance |
| **CSV Import/Export** | Bulk import with mapping + filtered export |
| **Task Management** | Follow-up tasks, reminders, due dates |
| **Multi-SMTP** | Multiple sending accounts, domain rotation |
| **Team Management** | Full RBAC with manager/researcher/reviewer roles |
| **Lead Scoring v2** | Engagement score, market value scoring, auto-recalculation |
| **API Webhooks** | External integrations via webhooks |

### Advanced Differentiators (Version 3.0+)

| Feature | Value |
|---|---|
| **AI "Before vs After" Concept** | Generate a mock redesign hero section to include in outreach |
| **Downloadable Opportunity Report** | PDF with audit results, screenshots, recommendations — attach to email |
| **Proposal Generator** | AI-generated project proposal based on audit + pricing templates |
| **Niche Playbooks** | Pre-built discovery + outreach strategies per niche (dental, legal, restaurant, etc.) |
| **Multilingual Outreach** | AI generates outreach in prospect's language |
| **White-Label Mode** | Custom branding, custom domain, agency name throughout |
| **Competitor Analysis** | Compare prospect's website vs competitors in same niche/area |
| **Lead Auto-Discovery** | Scheduled recurring discovery: "Find 50 new dentists in NYC every Monday" |
| **Zapier / Make Integration** | Connect to external CRMs, calendars, Slack |
| **Chrome Extension** | Quick-capture leads from Google Maps, Yelp, LinkedIn while browsing |

---

## 17. Build Roadmap

### Phase 1: Foundation (Weeks 1–4)

**Focus**: Core infrastructure + Discovery + Basic CRM

| Week | Deliverables |
|---|---|
| **Week 1** | Database schema (all tables), auth system (JWT + roles), Carbon Design frontend shell (UI Shell, routing, login) |
| **Week 2** | Lead Discovery Engine (Google Maps integration, search UI, results table, dedup), Lead Database page |
| **Week 3** | Lead Enrichment Engine (website scraping, email extraction, confidence scoring), Enrichment queue UI |
| **Week 4** | Basic CRM Pipeline (kanban board, stage management, lead detail page), Dashboard (KPI cards) |

**Success Criteria**: User can search for businesses, view results, enrich contacts, and manage leads in a pipeline.

**Dependencies**: Google Maps API key, MySQL database, Claude API key

### Phase 2: Intelligence + Outreach (Weeks 5–8)

**Focus**: AI Audit + Personalization + Campaign System

| Week | Deliverables |
|---|---|
| **Week 5** | AI Website Audit Engine (12-factor scoring, classification, redesign reasons), Audit queue UI with results cards |
| **Week 6** | AI Personalization Engine (email generation, WhatsApp drafts, guardrails), Template management |
| **Week 7** | Campaign System (campaign creation, sequence builder, SMTP sending, daily limits, time windows) |
| **Week 8** | Lead Scoring Engine (composite scoring, priority tags, auto-tagging), Compliance Center (suppression list, opt-out) |

**Success Criteria**: User can audit websites, get AI scores, generate personalized outreach, and send multi-step campaigns.

**Dependencies**: Phase 1 complete, Hunter.io API key, SMTP account

### Phase 3: Scale + Polish (Weeks 9–12)

**Focus**: Advanced features + Analytics + Production hardening

| Week | Deliverables |
|---|---|
| **Week 9** | Analytics Dashboard (charts, filters, campaign performance, niche breakdown), CSV import/export |
| **Week 10** | Inbox Sync (IMAP reply detection, thread view), Reply classification, Auto-stop on reply |
| **Week 11** | Screenshot capture (Puppeteer), A/B testing, Task management + reminders |
| **Week 12** | Multi-SMTP, Team management (full RBAC), Production hardening (error handling, rate limits, logging) |

**Success Criteria**: Full production-ready platform with analytics, inbox, screenshots, and team management.

**Dependencies**: Phase 2 complete, Puppeteer-compatible hosting

---

## 18. Risks & Safeguards

| Risk | Impact | Likelihood | Safeguard |
|---|---|---|---|
| **Compliance / legal action** | Critical | Medium | Public data only; opt-out in every email; suppression list; source traceability; CAN-SPAM footer; no personal data scraping |
| **Bad data quality** | High | High | Multi-source verification; confidence scoring; MX validation; dedup rules; manual review queue |
| **Duplicate leads** | Medium | High | Dedup by place_id + phone + normalized name; domain-based merge; daily dedup cron job |
| **Low-quality emails** | High | Medium | Priority: website scrape → Hunter.io → pattern → skip; confidence threshold for auto-send; manual review for low-confidence |
| **Deliverability damage** | Critical | Medium | Daily caps (30/domain); time windows; warmup schedule; bounce handling (immediate stop on hard bounce); SPF/DKIM check; throttle delays |
| **Spammy messaging** | High | Low | AI guardrails (no spam words, no fake facts, no insults); copy reviewer role; manual approval mode option; low-volume positioning |
| **AI hallucinations** | Medium | Medium | Guardrail prompt rules; only use data provided (no invention); fallback templates; human review step; confidence markers |
| **Rate limiting (APIs)** | Medium | High | Queue-based processing; exponential backoff; daily API budget limits; SerpApi fallback for Google; cache results |
| **Scaling bottlenecks** | Medium | Low (MVP) | MySQL connection pooling; job queue batching; cron interval tuning; horizontal scaling path (Docker) |
| **Screenshot capture failures** | Low | Medium | Timeout handling; retry 2x; fallback to "no screenshot available"; graceful degradation in UI |
| **SMTP account suspension** | High | Medium | Domain rotation; warmup; low volume per account; legitimate business purpose; proper authentication |
| **Data retention / GDPR** | Medium | Medium | Configurable retention TTL; data deletion endpoint; export user data; anonymization option |

---

## 19. Final Output

### 1. Product Summary

**OpenClaw** is an AI-powered website opportunity finder designed for web design agencies and freelancers. It discovers businesses worldwide through public data sources, enriches their contact information, audits their website quality using a 12-factor AI analysis, generates personalized outreach based on genuine observations, and manages the full sales pipeline from discovery to closed deal.

**Key differentiator**: OpenClaw is not a generic scraper or cold email tool. It is a specialized **website audit + AI personalization + outreach + CRM** platform purpose-built for agencies selling web design and redesign services. Every feature is designed around the workflow of finding businesses that genuinely need a better website and connecting with them through relevant, respectful outreach.

### 2. Feature Checklist

| # | Feature | MVP | v2 | v3 |
|---|---|---|---|---|
| 1 | Google Maps lead discovery | ✅ | | |
| 2 | Keyword + location + filter search | ✅ | | |
| 3 | Lead deduplication | ✅ | | |
| 4 | Website email scraping | ✅ | | |
| 5 | Hunter.io integration | ✅ | | |
| 6 | MX validation | ✅ | | |
| 7 | Email confidence scoring | ✅ | | |
| 8 | AI website audit (12-factor) | ✅ | | |
| 9 | Website classification | ✅ | | |
| 10 | Top 3 redesign reasons | ✅ | | |
| 11 | AI cold email generation | ✅ | | |
| 12 | AI WhatsApp draft generation | ✅ | | |
| 13 | AI follow-up sequence (4 steps) | ✅ | | |
| 14 | Campaign creation + management | ✅ | | |
| 15 | SMTP sending with daily caps | ✅ | | |
| 16 | Time window enforcement | ✅ | | |
| 17 | Open tracking (pixel) | ✅ | | |
| 18 | CRM pipeline (kanban) | ✅ | | |
| 19 | Lead detail page | ✅ | | |
| 20 | Suppression list | ✅ | | |
| 21 | Opt-out footer | ✅ | | |
| 22 | Dashboard with KPI cards | ✅ | | |
| 23 | JWT auth + basic roles | ✅ | | |
| 24 | Carbon Design System UI | ✅ | | |
| 25 | Screenshot capture | | ✅ | |
| 26 | IMAP inbox sync | | ✅ | |
| 27 | Reply classification (AI) | | ✅ | |
| 28 | A/B testing | | ✅ | |
| 29 | CSV import/export | | ✅ | |
| 30 | Advanced analytics + charts | | ✅ | |
| 31 | Task management + reminders | | ✅ | |
| 32 | Multi-SMTP rotation | | ✅ | |
| 33 | Full RBAC (5 roles) | | ✅ | |
| 34 | Lead scoring v2 (4 sub-scores) | | ✅ | |
| 35 | AI before/after concept | | | ✅ |
| 36 | PDF opportunity report | | | ✅ |
| 37 | Proposal generator | | | ✅ |
| 38 | Niche playbooks | | | ✅ |
| 39 | Multilingual outreach | | | ✅ |
| 40 | White-label mode | | | ✅ |
| 41 | Competitor analysis | | | ✅ |
| 42 | Auto-discovery scheduler | | | ✅ |
| 43 | Chrome extension | | | ✅ |

### 3. Recommended MVP

Ship these modules in 4 weeks:

1. **Lead Discovery** — Google Maps search with filters
2. **Lead Enrichment** — Website scraping + Hunter.io + MX validation
3. **AI Website Audit** — 12-factor scoring with Claude
4. **AI Personalization** — Cold email + WhatsApp + follow-ups
5. **Campaign System** — Multi-step sequences with SMTP
6. **Mini CRM** — Kanban pipeline + lead detail
7. **Dashboard** — KPI cards + activity feed
8. **Compliance** — Suppression list + opt-out
9. **Auth** — Login + admin/rep roles
10. **Settings** — API keys + SMTP + limits

### 4. Stack Recommendation

| Component | Choice |
|---|---|
| **Frontend** | React 18 + @carbon/react v1.x + @carbon/charts-react |
| **Backend** | Node.js 20 + Express.js |
| **Database** | MySQL 8.0 |
| **AI** | Anthropic Claude API (claude-sonnet-4-20250514 for audits, claude-haiku for templates) |
| **Email** | Nodemailer (SMTP) |
| **Scraping** | Cheerio + node-fetch |
| **Screenshots** | Puppeteer (v2+) |
| **Queue** | MySQL-backed job queue |
| **Auth** | JWT + bcrypt |
| **Monitoring** | Winston + Sentry |
| **Deployment** | cPanel (MVP) → Docker/Railway (scale) |

### 5. First 30 Days Build Plan

| Day | Focus | Deliverable |
|---|---|---|
| **1–2** | Project setup | Database schema deployed, Express routes scaffolded, Carbon Design shell with routing |
| **3–5** | Auth system | Login, JWT, roles, protected routes, settings page |
| **6–8** | Lead Discovery | Google Maps integration, search form, results table, dedup, basic lead storage |
| **9–11** | Lead Database | Full lead list with Carbon DataTable, filters, search, pagination |
| **12–14** | Enrichment Engine | Website scraper, email extraction, Hunter.io, MX, confidence scoring, enrichment queue UI |
| **15–17** | AI Audit Engine | 12-factor audit with Claude, classification, redesign reasons, audit results card |
| **18–20** | AI Personalization | Email generation, WhatsApp drafts, template system, guardrails |
| **21–23** | Campaign System | Campaign CRUD, sequence builder, SMTP send with limits + tracking |
| **24–26** | CRM Pipeline | Kanban board, stage management, lead detail page with tabs |
| **27–28** | Dashboard + Analytics | KPI cards, funnel chart, activity feed |
| **29** | Compliance | Suppression list, opt-out, DNC automation |
| **30** | QA + Polish | Bug fixes, edge cases, responsive checks, deploy to production |

---

*This blueprint was designed as a production-ready specification for OpenClaw — the AI-powered website opportunity finder for agencies. Every section is implementable and maps directly to code.*
