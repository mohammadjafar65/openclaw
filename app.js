require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const { initDatabase } = require('./src/config/database');
const { startCronJobs } = require('./workers/cron');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URI = process.env.BASE_URI || '/openclaw';

// ── SECURITY MIDDLEWARE ──────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.set('trust proxy', 1);

// ── STATIC FILES ─────────────────────────────────────────
// Serve React build (Carbon Design System frontend)
app.use(`${BASE_URI}/static`, express.static(path.join(__dirname, 'public/static')));
app.use(`${BASE_URI}/assets`, express.static(path.join(__dirname, 'public/assets')));
app.use('/static', express.static(path.join(__dirname, 'public/static')));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

// ══════════════════════════════════════════════════════════
// ── SECRET RESET ROUTE (browser-accessible) ──────────────
// Visit: https://mzistudio.com/openclaw/reset-oc-9f2a8b
// This resets admin password to: Admin@123456
// DELETE this block after successful login!
// ══════════════════════════════════════════════════════════
app.get('/openclaw/reset-oc-9f2a8b', async (req, res) => {
  const NEW_EMAIL    = 'admin@mzistudio.com';
  const NEW_PASSWORD = 'Admin@123456';
  let conn;
  try {
    conn = await mysql.createConnection({
      host:     process.env.DB_HOST || 'localhost',
      port:     parseInt(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME,
      user:     process.env.DB_USER,
      password: process.env.DB_PASS,
    });

    // Create table if missing
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        email      VARCHAR(255) NOT NULL UNIQUE,
        password   VARCHAR(255) NOT NULL,
        name       VARCHAR(255) DEFAULT 'Admin',
        role       ENUM('admin','viewer') DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Wipe and recreate admin
    await conn.query('DELETE FROM users');
    const hash = await bcrypt.hash(NEW_PASSWORD, 12);
    await conn.query(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, "Admin", "admin")',
      [NEW_EMAIL, hash]
    );

    // Verify bcrypt works
    const [rows] = await conn.query('SELECT password FROM users WHERE email = ?', [NEW_EMAIL]);
    const ok = rows.length > 0 && await bcrypt.compare(NEW_PASSWORD, rows[0].password);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OpenClaw Reset</title>
        <style>
          body { font-family: sans-serif; background: #0f1117; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .box { background: #1a1d27; border: 1px solid #2d3250; border-radius: 16px; padding: 40px; max-width: 480px; text-align: center; }
          h2 { color: ${ok ? '#00d4aa' : '#ff6b6b'}; margin-bottom: 16px; }
          .cred { background: #0f1117; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: left; font-family: monospace; }
          .cred div { margin: 6px 0; }
          .label { color: #8892b0; }
          .val { color: #ffd166; font-weight: bold; }
          a { display: inline-block; background: #6c63ff; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; margin-top: 16px; font-weight: bold; }
          .warn { background: rgba(255,107,107,.1); border: 1px solid rgba(255,107,107,.3); border-radius: 8px; padding: 12px; font-size: 13px; color: #ff6b6b; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>${ok ? '✅ Password Reset Successful!' : '❌ Reset Failed'}</h2>
          ${ok ? `
            <p>Your admin account has been reset. Use these credentials to login:</p>
            <div class="cred">
              <div><span class="label">Email: </span><span class="val">${NEW_EMAIL}</span></div>
              <div><span class="label">Password: </span><span class="val">${NEW_PASSWORD}</span></div>
            </div>
            <a href="/openclaw/">Go to Login →</a>
            <div class="warn">
              ⚠️ Important: After logging in, go to your File Manager and remove the reset route from app.js for security, then restart the app.
            </div>
          ` : `<p>DB Error — check your .env credentials. DB_NAME: ${process.env.DB_NAME}</p>`}
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><style>body{font-family:sans-serif;background:#0f1117;color:#ff6b6b;padding:40px;font-family:monospace}</style></head>
      <body>
        <h2>❌ Error</h2>
        <pre>${err.message}</pre>
        <p>Code: ${err.code}</p>
        <hr>
        <p>DB_HOST: ${process.env.DB_HOST}</p>
        <p>DB_NAME: ${process.env.DB_NAME}</p>
        <p>DB_USER: ${process.env.DB_USER}</p>
        <p>DB_PASS: ${process.env.DB_PASS ? 'SET' : 'NOT SET'}</p>
      </body>
      </html>
    `);
  } finally {
    if (conn) await conn.end();
  }
});
// ══════════════════════════════════════════════════════════

// ── API ROUTES ───────────────────────────────────────────
function mountRoutes(prefix) {
  // Core routes (existing)
  app.use(`${prefix}/auth`,        require('./src/routes/api/auth'));
  app.use(`${prefix}/campaigns`,   require('./src/routes/api/campaigns'));
  app.use(`${prefix}/leads`,       require('./src/routes/api/leads'));
  app.use(`${prefix}/scraper`,     require('./src/routes/api/scraper'));
  app.use(`${prefix}/outreach`,    require('./src/routes/api/outreach'));
  app.use(`${prefix}/dashboard`,   require('./src/routes/api/dashboard'));
  app.use(`${prefix}/settings`,    require('./src/routes/api/settings'));
  app.use(`${prefix}/track`,       require('./src/routes/api/track'));

  // New module routes
  app.use(`${prefix}/audit`,       require('./src/routes/api/audit'));
  app.use(`${prefix}/crm`,         require('./src/routes/api/crm'));
  app.use(`${prefix}/personalize`, require('./src/routes/api/personalize'));
  app.use(`${prefix}/compliance`,  require('./src/routes/api/compliance'));
  app.use(`${prefix}/team`,        require('./src/routes/api/team'));
  app.use(`${prefix}/analytics`,   require('./src/routes/api/analytics'));
}

mountRoutes(`${BASE_URI}/api`);
mountRoutes('/api');

// ── SERVE REACT SPA (Carbon Design System) ──────────────
// Serve static files from React build
app.use(`${BASE_URI}`, express.static(path.join(__dirname, 'public'), { index: false }));
app.use('/', express.static(path.join(__dirname, 'public'), { index: false }));

// SPA catch-all: serve index.html for all non-API routes
const serveIndex = (req, res) => res.sendFile(path.join(__dirname, 'public/index.html'));
app.get(`${BASE_URI}`, serveIndex);
app.get(`${BASE_URI}/`, serveIndex);
app.get(`${BASE_URI}/*`, (req, res, next) => {
  // Don't catch API routes
  if (req.path.includes('/api/')) return next();
  serveIndex(req, res);
});
app.get('/', (req, res) => res.redirect(BASE_URI + '/'));
app.get('*', (req, res, next) => {
  if (req.path.includes('/api/')) return next();
  serveIndex(req, res);
});

// ── ERROR HANDLER ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(err.status || 500).json({ error: err.message });
});

// ── BOOT ─────────────────────────────────────────────────
async function boot() {
  try {
    await initDatabase();
    console.log('[DB] MySQL connected and schema ready');
    app.listen(PORT, () => {
      console.log(`[SERVER] Running on port ${PORT} — Base: ${BASE_URI}`);
    });
    startCronJobs();
  } catch (err) {
    console.error('[BOOT] Fatal error:', err);
    process.exit(1);
  }
}

boot();
