const pool = require('../db/pool');
const { randomUUID } = require('crypto');

exports.getProfile = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id,first_name,last_name,email,phone,cin,address,city,governorate,postal_code,
              date_of_birth,nationality,gender,role,kyc_status,face_verified,doc_verified,
              is_active,is_locked,two_fa_enabled,preferred_language,credit_score,risk_level,
              last_login,created_at
       FROM users WHERE id=?`,
      [req.user.id]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.updateProfile = async (req, res) => {
  const { first_name, last_name, phone, address, city, governorate, postal_code, preferred_language } = req.body;

  // Validate phone number (exactly 8 digits after +216)
  if (phone && !/^\+216[0-9]{8}$/.test(phone)) {
    return res.status(400).json({ message: 'Numéro de téléphone invalide. Format: +216XXXXXXXX (8 chiffres)' });
  }

  try {
    // Get current user data
    const current = await pool.query('SELECT * FROM users WHERE id=?', [req.user.id]);
    const user = current.rows[0];

    // Check if any sensitive fields changed
    const sensitiveFields = ['phone', 'address', 'city', 'governorate'];
    const hasSensitiveChange = sensitiveFields.some(field => req.body[field] && req.body[field] !== user[field]);

    if (hasSensitiveChange) {
      // Create change requests for sensitive fields
      const changeRequests = [];

      if (phone && phone !== user.phone) {
        changeRequests.push({
          field_name: 'phone',
          old_value: user.phone,
          new_value: phone
        });
      }

      if (address && address !== user.address) {
        changeRequests.push({
          field_name: 'address',
          old_value: user.address,
          new_value: address
        });
      }

      if (city && city !== user.city) {
        changeRequests.push({
          field_name: 'city',
          old_value: user.city,
          new_value: city
        });
      }

      if (governorate && governorate !== user.governorate) {
        changeRequests.push({
          field_name: 'governorate',
          old_value: user.governorate,
          new_value: governorate
        });
      }

      // Insert change requests
      for (const changeReq of changeRequests) {
        await pool.query(
          'INSERT INTO profile_change_requests (id,user_id,field_name,field_label,old_value,new_value) VALUES (?,?,?,?,?,?)',
          [randomUUID(), req.user.id, changeReq.field_name, 
           changeReq.field_name === 'phone' ? 'Téléphone' :
           changeReq.field_name === 'address' ? 'Adresse' :
           changeReq.field_name === 'city' ? 'Ville' :
           changeReq.field_name === 'governorate' ? 'Gouvernorat' : changeReq.field_name,
           changeReq.old_value, changeReq.new_value]
        );
      }

      // Update non-sensitive fields immediately
      const nonSensitive = { first_name, last_name, postal_code, preferred_language };
      const updates = Object.entries(nonSensitive).filter(([k, v]) => v !== undefined && v !== user[k]);

      if (updates.length > 0) {
        const setClause = updates.map(([k]) => `${k}=?`).join(', ');
        const values = updates.map(([, v]) => v);
        values.push(req.user.id);

        await pool.query(
          `UPDATE users SET ${setClause}, updated_at=datetime('now') WHERE id=?`,
          values
        );
      }

      res.json({
        message: 'Modifications soumises pour validation par l\'administrateur',
        pending_approval: true
      });
    } else {
      // No sensitive changes, update directly
      const updates = { first_name, last_name, phone, address, city, governorate, postal_code, preferred_language };
      const setClause = Object.keys(updates).map(k => `${k}=?`).join(', ');
      const values = Object.values(updates);
      values.push(req.user.id);

      await pool.query(
        `UPDATE users SET ${setClause}, updated_at=datetime('now') WHERE id=?`,
        values
      );

      res.json({ message: 'Profil mis à jour avec succès' });
    }
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getChangeRequests = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT cr.*, u.first_name, u.last_name
       FROM profile_change_requests cr
       JOIN users u ON cr.user_id = u.id
       WHERE cr.user_id=? AND cr.status='pending'
       ORDER BY cr.created_at DESC`,
      [req.user.id]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    // Transaction analytics
    const txStats = await pool.query(`
      SELECT
        COUNT(*) as total_transactions,
        SUM(CASE WHEN type='deposit' THEN amount ELSE 0 END) as total_deposits,
        SUM(CASE WHEN type='withdrawal' THEN amount ELSE 0 END) as total_withdrawals,
        AVG(amount) as avg_transaction,
        MAX(amount) as max_transaction,
        COUNT(DISTINCT DATE(created_at)) as active_days
      FROM transactions
      WHERE from_account_id IN (SELECT id FROM accounts WHERE user_id=?) OR
            to_account_id IN (SELECT id FROM accounts WHERE user_id=?)
    `, [userId, userId]);

    // Monthly spending by category
    const monthlySpending = await pool.query(`
      SELECT
        strftime('%Y-%m', created_at) as month,
        category,
        SUM(amount) as total
      FROM transactions
      WHERE from_account_id IN (SELECT id FROM accounts WHERE user_id=?) AND type IN ('payment_bill', 'withdrawal')
      GROUP BY strftime('%Y-%m', created_at), category
      ORDER BY month DESC, total DESC
    `, [userId]);

    // Access logs summary
    const accessStats = await pool.query(`
      SELECT
        COUNT(*) as total_accesses,
        COUNT(DISTINCT DATE(created_at)) as unique_days,
        AVG(risk_score) as avg_risk_score,
        MAX(created_at) as last_access
      FROM access_logs
      WHERE user_id=?
    `, [userId]);

    res.json({
      transaction_stats: txStats.rows[0],
      monthly_spending: monthlySpending.rows,
      access_stats: accessStats.rows[0]
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getAccessLogs = async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  try {
    const r = await pool.query(
      `SELECT action, ip_address, location, device_info, risk_score, created_at
       FROM access_logs
       WHERE user_id=?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), parseInt(offset)]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};