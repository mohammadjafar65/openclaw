const jwt = require('jsonwebtoken');
const { queryOne } = require('../config/database');

async function authenticate(req, res, next) {
  // Accept token from Authorization header OR query param (needed for EventSource/SSE)
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await queryOne('SELECT id, email, name, role FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authenticate };
