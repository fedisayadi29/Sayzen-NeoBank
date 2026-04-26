/**
 * Utility to send a notification to all admin users.
 * Used by auth, account, and other controllers.
 */
const { randomUUID } = require('crypto');
const pool = require('../db/pool');

/**
 * @param {string} title   - Short title
 * @param {string} message - Full message
 * @param {string} type    - 'info' | 'success' | 'warning' | 'error'
 * @param {string} [link]  - Optional frontend link (e.g. '/admin/users/123')
 */
async function notifyAdmin(title, message, type = 'info', link = null) {
  try {
    const admins = await pool.query(`SELECT id FROM users WHERE role='admin'`);
    for (const admin of admins.rows) {
      await pool.query(
        `INSERT INTO admin_notifications (id, admin_id, title, message, type, link)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [randomUUID(), admin.id, title, message, type, link]
      );
    }
  } catch (err) {
    // Non-blocking — log but don't throw
    console.error('[notifyAdmin] Error:', err.message);
  }
}

module.exports = notifyAdmin;
