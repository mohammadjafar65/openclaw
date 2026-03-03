const mysql = require('mysql2/promise');
const { TABLES, MIGRATIONS } = require('./schema');

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

async function initDatabase() {
  const db = getPool();
  const conn = await db.getConnection();
  try {
    // ── Create all tables ─────────────────────────────────
    for (const ddl of TABLES) {
      try {
        await conn.query(ddl);
      } catch (e) {
        // Table may already exist with different definition — log and continue
        if (!e.message.includes('already exists')) {
          console.error('[DB] Table creation warning:', e.message.substring(0, 120));
        }
      }
    }
    console.log(`[DB] ${TABLES.length} tables verified`);

    // ── Create default organization ───────────────────────
    const [orgs] = await conn.query('SELECT id FROM organizations LIMIT 1');
    let orgId = 1;
    if (orgs.length === 0) {
      const [orgResult] = await conn.query(
        "INSERT INTO organizations (name, slug, plan) VALUES ('Default Agency', 'default', 'pro')"
      );
      orgId = orgResult.insertId;
      console.log('[DB] Default organization created');
    } else {
      orgId = orgs[0].id;
    }

    // ── Create admin user if not exists ───────────────────
    const bcrypt = require('bcryptjs');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPass  = process.env.ADMIN_PASSWORD || 'changeme123';
    const [rows] = await conn.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
    if (rows.length === 0) {
      const hashed = await bcrypt.hash(adminPass, 12);
      await conn.query(
        'INSERT INTO users (email, password, full_name, role, organization_id) VALUES (?, ?, ?, ?, ?)',
        [adminEmail, hashed, 'Admin', 'admin', orgId]
      );
      console.log(`[DB] Admin user created: ${adminEmail}`);
    }

    // ── Run safe migrations (ALTER TABLE) ─────────────────
    let migrationCount = 0;
    for (const sql of MIGRATIONS) {
      try {
        await conn.query(sql);
        migrationCount++;
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate column')) {
          // Column already exists — fine
        } else if (e.message.includes('check that column/key exists')) {
          // Column doesn't exist for DROP — fine
        } else {
          // Other unexpected error — log but continue
          console.error('[DB] Migration warning:', e.message.substring(0, 100));
        }
      }
    }
    if (migrationCount > 0) {
      console.log(`[DB] ${migrationCount} migrations applied`);
    }

    // ── Default settings ──────────────────────────────────
    const defaults = [
      ['daily_send_limit', '30'],
      ['send_start_hour', '9'],
      ['send_end_hour', '17'],
      ['send_timezone', 'UTC'],
      ['scrape_delay_ms', '2000'],
      ['sequence_delays_days', JSON.stringify([0, 3, 7, 14])],
      ['warmup_enabled', 'false'],
      ['tracking_enabled', 'true'],
      ['unsubscribe_footer', 'You received this because your business is publicly listed. Reply STOP to opt out.'],
      ['max_enrichment_concurrent', '3'],
      ['max_audit_concurrent', '2'],
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
