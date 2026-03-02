require('dotenv').config();
const { initDatabase } = require('../src/config/database');

console.log('OpenClaw — Database Setup');
console.log('─────────────────────────');
console.log('Host:    ', process.env.DB_HOST);
console.log('Database:', process.env.DB_NAME);
console.log('User:    ', process.env.DB_USER);
console.log('');

initDatabase()
  .then(() => {
    console.log('✓ Database initialized successfully');
    console.log(`✓ Admin user: ${process.env.ADMIN_EMAIL}`);
    console.log('');
    console.log('You can now start the server: npm start');
    process.exit(0);
  })
  .catch(err => {
    console.error('✗ Setup failed:', err.message);
    console.error('');
    console.error('Check your .env DB credentials and ensure the database exists in cPanel.');
    process.exit(1);
  });
