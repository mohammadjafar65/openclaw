/**
 * OpenClaw — Team & Roles API Routes
 * User management, invitations, role-based access
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../../middleware/auth');
const { query, execute } = require('../../config/database');

const ROLES = ['admin', 'manager', 'sales_rep', 'researcher', 'copy_reviewer'];

const ROLE_PERMISSIONS = {
  admin: ['*'],
  manager: ['campaigns.*', 'leads.*', 'outreach.*', 'crm.*', 'audit.*', 'compliance.*', 'analytics.*', 'templates.*'],
  sales_rep: ['campaigns.own', 'leads.own', 'outreach.own', 'crm.own', 'audit.run', 'templates.view'],
  researcher: ['leads.discover', 'leads.enrich', 'audit.run', 'leads.view'],
  copy_reviewer: ['outreach.approve', 'templates.view', 'templates.edit'],
};

/**
 * GET /api/team
 * List all team members
 */
router.get('/', auth, async (req, res) => {
  try {
    const users = await query(
      `SELECT id, email, full_name, role, is_active, last_login_at, created_at
       FROM users ORDER BY created_at ASC`
    );
    res.json({ users, roles: ROLES, permissions: ROLE_PERMISSIONS });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/team/invite
 * Invite a new team member
 */
router.post('/invite', auth, async (req, res) => {
  try {
    // Only admin can invite
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can invite team members' });
    }

    const { email, fullName, role, password } = req.body;
    if (!email || !role) return res.status(400).json({ error: 'email and role required' });
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });

    // Check if exists
    const existing = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length) return res.status(400).json({ error: 'User with this email already exists' });

    // Create user with temporary password
    const tempPassword = password || Math.random().toString(36).slice(-10);
    const hashed = await bcrypt.hash(tempPassword, 12);

    const result = await execute(
      `INSERT INTO users (email, password, full_name, role, organization_id)
       VALUES (?, ?, ?, ?, ?)`,
      [email.toLowerCase(), hashed, fullName || email.split('@')[0], role, req.user?.organization_id || 1]
    );

    await execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'team.invited', 'user', ?, ?)`,
      [req.user?.id, result.insertId, JSON.stringify({ email, role })]
    );

    res.json({
      success: true,
      userId: result.insertId,
      temporaryPassword: tempPassword,
      message: `User created. Share the temporary password: ${tempPassword}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/team/:userId/role
 * Change user role
 */
router.put('/:userId/role', auth, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can change roles' });
    }

    const { role } = req.body;
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });

    await execute('UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?',
      [role, parseInt(req.params.userId)]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/team/:userId/deactivate
 * Deactivate a user
 */
router.put('/:userId/deactivate', auth, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can deactivate users' });
    }

    // Can't deactivate yourself
    if (parseInt(req.params.userId) === req.user?.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    await execute('UPDATE users SET is_active = 0, updated_at = NOW() WHERE id = ?',
      [parseInt(req.params.userId)]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/team/:userId/activate
 * Reactivate a user
 */
router.put('/:userId/activate', auth, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can activate users' });
    }

    await execute('UPDATE users SET is_active = 1, updated_at = NOW() WHERE id = ?',
      [parseInt(req.params.userId)]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/team/roles
 * Get role definitions and permissions
 */
router.get('/roles', auth, (req, res) => {
  res.json({ roles: ROLES, permissions: ROLE_PERMISSIONS });
});

module.exports = router;
