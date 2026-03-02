require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

// ── Hardcoded fallback — change these if needed ──────────
const EMAIL    = process.env.ADMIN_EMAIL    || 'admin@mzistudio.com';
const PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456';

async function run() {
  console.log('=== OpenClaw Admin Reset ===');
  console.log('DB Host:', process.env.DB_HOST);
  console.log('DB Name:', process.env.DB_NAME);
  console.log('DB User:', process.env.DB_USER);
  console.log('Target email:', EMAIL);
  console.log('');

  let conn;
  try {
    conn = await mysql.createConnection({
      host:     process.env.DB_HOST || 'localhost',
      port:     parseInt(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME,
      user:     process.env.DB_USER,
      password: process.env.DB_PASS,
    });
    console.log('✓ Database connected');

    // Create users table if it doesn't exist yet
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        email      VARCHAR(255) NOT NULL UNIQUE,
        password   VARCHAR(255) NOT NULL,
        name       VARCHAR(255),
        role       ENUM('admin','viewer') DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ Users table ready');

    // Hash the password
    const hash = await bcrypt.hash(PASSWORD, 12);
    console.log('✓ Password hashed');

    // Check if user exists
    const [rows] = await conn.query(
      'SELECT id, email FROM users WHERE email = ?', [EMAIL]
    );

    if (rows.length > 0) {
      // Update existing user
      await conn.query(
        'UPDATE users SET password = ?, role = "admin" WHERE email = ?',
        [hash, EMAIL]
      );
      console.log(`✓ Password UPDATED for existing user: ${EMAIL}`);
    } else {
      // Create new user
      await conn.query(
        'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, "admin")',
        [EMAIL, hash, 'Admin']
      );
      console.log(`✓ New admin user CREATED: ${EMAIL}`);
    }

    // Show all users
    const [allUsers] = await conn.query(
      'SELECT id, email, name, role, created_at FROM users'
    );
    console.log('');
    console.log('=== Users in database ===');
    allUsers.forEach(u => {
      console.log(`  ID:${u.id} | ${u.email} | ${u.role}`);
    });

    console.log('');
    console.log('=== LOGIN WITH THESE CREDENTIALS ===');
    console.log(`  Email:    ${EMAIL}`);
    console.log(`  Password: ${PASSWORD}`);
    console.log('=====================================');
    console.log('DONE ✓');

  } catch (err) {
    console.error('ERROR:', err.message);
    console.error('');
    console.error('Check your .env DB credentials:');
    console.error('  DB_HOST =', process.env.DB_HOST);
    console.error('  DB_NAME =', process.env.DB_NAME);
    console.error('  DB_USER =', process.env.DB_USER);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
