const mysql = require('mysql2/promise');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:     process.env.DB_HOST || 'localhost',
      port:     parseInt(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME,
      user:     process.env.DB_USER,
      password: process.env.DB_PASS,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

const SCHEMA = `
-- ── USERS (admin accounts) ──────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  name        VARCHAR(255),
  role        ENUM('admin','viewer') DEFAULT 'admin',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── CAMPAIGNS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  niche         VARCHAR(255) NOT NULL,
  micro_niche   VARCHAR(255),
  region        VARCHAR(255) NOT NULL,
  radius_km     INT DEFAULT 25,
  min_rating    DECIMAL(2,1) DEFAULT 4.0,
  min_reviews   INT DEFAULT 25,
  status        ENUM('draft','active','paused','completed') DEFAULT 'draft',
  created_by    INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── LEADS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id        INT,
  place_id           VARCHAR(255) UNIQUE,
  business_name      VARCHAR(255) NOT NULL,
  category           VARCHAR(255),
  address            TEXT,
  city               VARCHAR(255),
  state              VARCHAR(255),
  country            VARCHAR(255),
  phone              VARCHAR(50),
  rating             DECIMAL(2,1),
  review_count       INT DEFAULT 0,
  review_velocity    INT DEFAULT 0,
  maps_website       VARCHAR(500),
  website_status     ENUM('none','weak','active','unknown') DEFAULT 'unknown',
  website_url        VARCHAR(500),
  owner_name         VARCHAR(255),
  owner_email        VARCHAR(255),
  owner_email_valid  TINYINT(1) DEFAULT 0,
  linkedin_url       VARCHAR(500),
  facebook_url       VARCHAR(500),
  ai_score           INT DEFAULT 0,
  score_breakdown    JSON,
  score_notes        TEXT,
  queue_tier         ENUM('priority','standard','nurture','archive') DEFAULT 'standard',
  status             ENUM('new','enriched','outreach_active','replied','meeting_booked','won','lost','dnc') DEFAULT 'new',
  source_reviews     JSON,
  raw_data           JSON,
  notes              TEXT,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── OUTREACH SEQUENCES ───────────────────────────────────
CREATE TABLE IF NOT EXISTS outreach_sequences (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  lead_id       INT NOT NULL,
  campaign_id   INT,
  channel       ENUM('email','sms','voicemail') DEFAULT 'email',
  step          INT DEFAULT 1,
  send_at       TIMESTAMP NULL,
  sent_at       TIMESTAMP NULL,
  status        ENUM('pending','sent','opened','clicked','replied','bounced','failed') DEFAULT 'pending',
  subject       TEXT,
  body          LONGTEXT,
  open_count    INT DEFAULT 0,
  click_count   INT DEFAULT 0,
  message_id    VARCHAR(255),
  error_msg     TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── REPLIES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS replies (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  lead_id       INT NOT NULL,
  sequence_id   INT,
  channel       ENUM('email','sms') DEFAULT 'email',
  from_address  VARCHAR(255),
  subject       TEXT,
  body          LONGTEXT,
  intent        ENUM('interested','not_now','referral','opt_out','ooo','unknown') DEFAULT 'unknown',
  ai_analysis   TEXT,
  processed     TINYINT(1) DEFAULT 0,
  received_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── JOB QUEUE (DB-based, no Redis needed) ────────────────
CREATE TABLE IF NOT EXISTS job_queue (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  type        VARCHAR(100) NOT NULL,
  payload     JSON,
  status      ENUM('pending','processing','done','failed') DEFAULT 'pending',
  attempts    INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  error       TEXT,
  priority    INT DEFAULT 5,
  run_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status_run (status, run_at),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── SUPPRESSION LIST ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppression_list (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  value      VARCHAR(255) NOT NULL UNIQUE,
  type       ENUM('email','phone','domain') DEFAULT 'email',
  reason     VARCHAR(100),
  added_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_value (value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── SETTINGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key_name   VARCHAR(100) PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

async function initDatabase() {
  const db = getPool();
  const conn = await db.getConnection();
  try {
    // Run each statement separately
    const statements = SCHEMA.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      await conn.query(stmt);
    }

    // Create admin user if not exists
    const bcrypt = require('bcryptjs');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPass  = process.env.ADMIN_PASSWORD || 'changeme123';
    const [rows] = await conn.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
    if (rows.length === 0) {
      const hashed = await bcrypt.hash(adminPass, 12);
      await conn.query(
        'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
        [adminEmail, hashed, 'Admin', 'admin']
      );
      console.log(`[DB] Admin user created: ${adminEmail}`);
    }

    // ── Safe column migrations ────────────────────────────
    const migrations = [
      "ALTER TABLE leads ADD COLUMN email_confidence VARCHAR(20) DEFAULT NULL",
      "ALTER TABLE leads ADD COLUMN email_source VARCHAR(500) DEFAULT NULL",
    ];
    for (const sql of migrations) {
      try {
        await conn.query(sql);
        console.log('[DB] Migration applied:', sql.split('ADD COLUMN')[1]?.trim().split(' ')[0]);
      } catch(e) {
        if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate column')) {
          // Column already exists — fine
        } else {
          console.error('[DB] Migration warning:', e.message);
        }
      }
    }

    // Default settings
    const defaults = [
      ['daily_send_limit', '40'],
      ['send_start_hour', '9'],
      ['send_end_hour', '17'],
      ['scrape_delay_ms', '2000'],
      ['sequence_delays_days', JSON.stringify([0, 3, 7, 14])],
    ];
    for (const [k, v] of defaults) {
      await conn.query(
        'INSERT IGNORE INTO settings (key_name, value) VALUES (?, ?)',
        [k, v]
      );
    }
  } finally {
    conn.release();
  }
}

async function query(sql, params = []) {
  const db = getPool();
  const [rows] = await db.query(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function execute(sql, params = []) {
  const db = getPool();
  const [result] = await db.query(sql, params);
  return result;
}

module.exports = { getPool, initDatabase, query, queryOne, execute };
