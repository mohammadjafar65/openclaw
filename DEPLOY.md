# OpenClaw — cPanel Deployment Guide
# Complete step-by-step from zero to live

## ── PREREQUISITES ────────────────────────────────────────────────────────────

Your cPanel host must support:
- Node.js (v18+) via cPanel's "Setup Node.js App" feature
  (Most modern hosts: SiteGround, A2 Hosting, NameHero, Hostinger, Cloudways)
- MySQL 5.7+ (standard on all cPanel hosts)

## ── STEP 1: GET YOUR API KEYS (all free tiers available) ─────────────────────

### A) Google Places API (PRIMARY — needed for scraping)
1. Go to: https://console.cloud.google.com
2. Create project → Enable "Places API"  
3. Create credentials → API Key
4. Free credit: $200/month = ~16,000 place searches FREE
5. Add key to .env as GOOGLE_PLACES_API_KEY

### B) Anthropic Claude API (for AI scoring & email copy)
1. Go to: https://console.anthropic.com
2. Sign up → Get API key
3. Free trial credits available on signup
4. Add key to .env as ANTHROPIC_API_KEY

### C) Hunter.io (for email finding — optional)
1. Go to: https://hunter.io
2. Sign up free → 150 searches/month free
3. Add key to .env as HUNTER_API_KEY

## ── STEP 2: UPLOAD FILES TO cPANEL ──────────────────────────────────────────

Option A: File Manager
1. cPanel → File Manager → Go to /home/yourusername/
2. Create folder "openclaw"
3. Upload all project files into /home/yourusername/openclaw/
4. (Or use a ZIP: zip openclaw.zip -r openclaw/ → upload & extract)

Option B: Git (faster)
1. cPanel → Git Version Control → Create Repository
2. Clone URL from your repo and deploy

Option C: FTP
1. Use FileZilla with your cPanel FTP credentials
2. Upload entire openclaw/ folder to /home/yourusername/openclaw/

## ── STEP 3: CREATE MYSQL DATABASE ───────────────────────────────────────────

1. cPanel → MySQL Databases
2. Create Database: yourprefix_openclaw
3. Create User: yourprefix_ocuser + strong password
4. Add User to Database → All Privileges
5. Note your credentials for .env

## ── STEP 4: CONFIGURE ENVIRONMENT ───────────────────────────────────────────

1. Copy .env.example to .env:
   cp .env.example .env

2. Edit .env with your values:
   - DB_HOST=localhost
   - DB_NAME=yourprefix_openclaw
   - DB_USER=yourprefix_ocuser
   - DB_PASS=your_db_password
   - JWT_SECRET=generate a random 64-char string (use: openssl rand -hex 32)
   - GOOGLE_PLACES_API_KEY=your_key
   - ANTHROPIC_API_KEY=your_key
   - SMTP_HOST=mail.yourdomain.com (cPanel mail)
   - SMTP_USER=outreach@yourdomain.com
   - SMTP_PASS=your_email_password
   - ADMIN_EMAIL=your_admin_email
   - ADMIN_PASSWORD=your_secure_password
   - APP_URL=https://yourdomain.com

## ── STEP 5: SET UP NODE.JS APP IN cPANEL ────────────────────────────────────

1. cPanel → Software → Setup Node.js App
2. Click "Create Application"
3. Configure:
   - Node.js version: 18.x or 20.x
   - Application mode: Production
   - Application root: /home/yourusername/openclaw
   - Application URL: yourdomain.com (or subdomain)
   - Application startup file: app.js
4. Click Create
5. Click "Run NPM Install" button (installs dependencies)
6. The app will start automatically

## ── STEP 6: INSTALL DEPENDENCIES & INITIALIZE DATABASE ──────────────────────

In cPanel Terminal (or SSH):

  cd /home/yourusername/openclaw
  npm install
  node scripts/setup.js    # (optional - app auto-runs schema on first boot)

## ── STEP 7: CONFIGURE .htaccess ─────────────────────────────────────────────

Edit .htaccess — replace "yourusername" with your actual cPanel username:

  PassengerNodejs /home/yourusername/nodevenv/openclaw/18/bin/node
  PassengerAppRoot /home/yourusername/openclaw

The Node.js version path varies. You can find it by running:
  which node
in the cPanel Terminal.

## ── STEP 8: SET UP EMAIL IN cPanel ──────────────────────────────────────────

Option A (Recommended — FREE): Use cPanel's built-in email
1. cPanel → Email Accounts → Create Account
2. Create: outreach@yourdomain.com
3. Use these SMTP settings in .env:
   SMTP_HOST=mail.yourdomain.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=outreach@yourdomain.com
   SMTP_PASS=the_email_password

Option B: Gmail (500 free sends/day)
1. Gmail → Settings → Security → 2FA → App Passwords
2. Generate app password for "Mail"
3. Use smtp.gmail.com:587 with your Gmail + app password

Option C: Brevo (300 free/day)
1. brevo.com → Sign up free → SMTP & API → SMTP Key
2. smtp-relay.brevo.com:587

## ── STEP 9: SET UP CRON JOBS ─────────────────────────────────────────────────

cPanel → Cron Jobs → Add New Cron Job

The app runs its own scheduler internally via node-cron.
But as a backup, add this cron to force-trigger email sending every 5 min:

  */5 * * * * /home/yourusername/nodevenv/openclaw/18/bin/node /home/yourusername/openclaw/workers/cron.js 2>&1

Replace the node path with your actual node binary path (run `which node` to find it).

## ── STEP 10: ACCESS YOUR DASHBOARD ──────────────────────────────────────────

Open: https://yourdomain.com

Login with:
  Email:    (your ADMIN_EMAIL from .env)
  Password: (your ADMIN_PASSWORD from .env)

## ── WORKFLOW: HOW TO USE THE SYSTEM ─────────────────────────────────────────

1. Create Campaign
   → Campaigns tab → New Campaign
   → Fill: niche (e.g. "Dentist"), region (e.g. "Austin, TX"), filters

2. Start Scraping
   → Click "🔍 Scrape" on your campaign
   → System searches Google Maps, filters leads, verifies websites
   → Wait 5-15 min depending on region size

3. Review Leads
   → Leads tab → filter by "priority" tier
   → Leads are AI-scored automatically after scraping

4. Start Outreach
   → Campaigns → "📧 Outreach" button
   → System generates 4-email AI sequences per lead
   → Emails send automatically within business hours

5. Monitor Replies
   → Replies tab shows all inbound responses
   → Interested leads → system auto-cancels follow-ups
   → DNC requests → auto-suppressed globally

6. Track Pipeline
   → Dashboard shows all key metrics in real-time

## ── TROUBLESHOOTING ──────────────────────────────────────────────────────────

App won't start?
→ Check cPanel → Node.js App → View Error Log
→ Verify .env has all required variables set
→ Run: npm install (in cPanel Terminal)

Database connection error?
→ Verify DB_HOST=localhost (almost always correct in cPanel)
→ Check DB_NAME format: must be prefix_dbname (cPanel adds prefix)

Emails not sending?
→ Verify SMTP credentials by testing in cPanel Webmail
→ Check Outreach → Suppression list for accidental suppressions
→ Try: Dashboard → Process Emails Now

Google Places returning no results?
→ Verify API key is enabled for Places API in Google Cloud Console
→ Check billing is set up (even for free tier, billing must be enabled)
→ Try a broader region ("Texas" instead of "small town, TX")

## ── SECURITY CHECKLIST ───────────────────────────────────────────────────────

✓ Change ADMIN_PASSWORD from default immediately
✓ Use a strong random JWT_SECRET (64+ chars)
✓ Keep .env file outside public_html (it's in /home/user/openclaw, not public)
✓ Enable HTTPS in cPanel (Let's Encrypt SSL — free)
✓ Set Google API key restrictions in Google Cloud Console

## ── SCALING TIPS ─────────────────────────────────────────────────────────────

- Keep daily_send_limit ≤ 40 per sending domain
- For higher volume: add more sending email accounts and rotate them
- Run multiple campaigns for different niches simultaneously
- Priority leads (score ≥ 75) should be followed up manually if possible

## ── SUPPORT ──────────────────────────────────────────────────────────────────

Logs: cPanel → Node.js App → Error/Access logs
Database: cPanel → phpMyAdmin (inspect tables directly)
