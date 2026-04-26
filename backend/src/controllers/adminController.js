const pool = require('../db/pool');
const { randomUUID } = require('crypto');

const genRef = (p='ADM') => `${p}${Date.now()}${Math.random().toString(36).slice(2,5).toUpperCase()}`;

exports.getStats = async (req, res) => {
  try {
    const [users, accounts, txStats, balances, pendingKyc, fraudAlerts, loans, changeReqs] = await Promise.all([
      pool.query("SELECT COUNT(*) as c FROM users WHERE role='user'"),
      pool.query("SELECT COUNT(*) as c FROM accounts WHERE is_active=1"),
      pool.query("SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as volume FROM transactions WHERE status='completed'"),
      pool.query("SELECT COALESCE(SUM(balance),0) as total FROM accounts WHERE is_active=1"),
      pool.query("SELECT COUNT(*) as c FROM users WHERE kyc_status IN ('pending','in_review')"),
      pool.query("SELECT COUNT(*) as c FROM fraud_alerts WHERE status='open'"),
      pool.query("SELECT COUNT(*) as c FROM loans WHERE status='under_review'"),
      pool.query("SELECT COUNT(*) as c FROM profile_change_requests WHERE status='pending'"),
    ]);
    res.json({
      total_users:       parseInt(users.rows[0].c),
      total_accounts:    parseInt(accounts.rows[0].c),
      total_transactions:parseInt(txStats.rows[0].c),
      total_volume:      parseFloat(txStats.rows[0].volume),
      total_balance:     parseFloat(balances.rows[0].total),
      pending_kyc:       parseInt(pendingKyc.rows[0].c),
      open_fraud_alerts: parseInt(fraudAlerts.rows[0].c),
      pending_loans:     parseInt(loans.rows[0].c),
      pending_change_requests: parseInt(changeReqs.rows[0].c),
    });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.getAllUsers = async (req, res) => {
  const { search='', limit=20, offset=0, kyc_status } = req.query;
  try {
    let where = "WHERE u.role='user'";
    const params = [];
    if (kyc_status) { where += ` AND u.kyc_status=?`; params.push(kyc_status); }
    where += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.cin LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
    params.push(parseInt(limit), parseInt(offset));

    const r = await pool.query(
      `SELECT u.id,u.first_name,u.last_name,u.email,u.phone,u.cin,u.city,u.governorate,
              u.role,u.kyc_status,u.face_verified,u.doc_verified,u.is_active,u.is_locked,
              u.credit_score,u.risk_level,u.last_login,u.created_at,
              COUNT(DISTINCT a.id) as account_count,
              COALESCE(SUM(a.balance),0) as total_balance
       FROM users u LEFT JOIN accounts a ON u.id=a.user_id
       ${where}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      params
    );
    res.json(r.rows);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.getUserDetail = async (req, res) => {
  try {
    const user = await pool.query(
      `SELECT id,first_name,last_name,email,phone,cin,address,city,governorate,postal_code,
              date_of_birth,nationality,gender,role,kyc_status,face_verified,doc_verified,
              is_active,is_locked,credit_score,risk_level,last_login,created_at
       FROM users WHERE id=?`,
      [req.params.id]
    );
    if (!user.rows[0]) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const accs = await pool.query('SELECT * FROM accounts WHERE user_id=?', [req.params.id]);
    const ids = accs.rows.map(a => `'${a.id}'`).join(',') || "''";
    const txs = await pool.query(
      `SELECT t.*, fa.account_number as from_account, ta.account_number as to_account,
              fu.first_name||' '||fu.last_name as from_user,
              tu.first_name||' '||tu.last_name as to_user
       FROM transactions t
       LEFT JOIN accounts fa ON t.from_account_id=fa.id
       LEFT JOIN accounts ta ON t.to_account_id=ta.id
       LEFT JOIN users fu ON fa.user_id=fu.id
       LEFT JOIN users tu ON ta.user_id=tu.id
       WHERE t.from_account_id IN (${ids}) OR t.to_account_id IN (${ids})
       ORDER BY t.created_at DESC LIMIT 25`
    );
    const loans = await pool.query('SELECT * FROM loans WHERE user_id=? ORDER BY created_at DESC', [req.params.id]);
    const cards = await pool.query(
      `SELECT c.*, a.account_number FROM cards c
       JOIN accounts a ON c.account_id=a.id
       WHERE a.user_id=?`,
      [req.params.id]
    );
    const docs  = await pool.query('SELECT id,doc_type,file_name,file_url,ai_confidence,status,rejection_reason,created_at FROM kyc_documents WHERE user_id=?', [req.params.id]);
    const changeRequests = await pool.query(
      'SELECT * FROM profile_change_requests WHERE user_id=? ORDER BY created_at DESC',
      [req.params.id]
    );

    res.json({
      user: user.rows[0],
      accounts: accs.rows,
      transactions: txs.rows,
      loans: loans.rows,
      documents: docs.rows,
      cards: cards.rows,
      change_requests: changeRequests.rows,
    });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.updateKyc = async (req, res) => {
  const { kyc_status } = req.body;
  if (!['pending','in_review','verified','rejected'].includes(kyc_status)) return res.status(400).json({ message: 'Statut KYC invalide' });
  try {
    await pool.query("UPDATE users SET kyc_status=?, updated_at=datetime('now') WHERE id=?", [kyc_status, req.params.id]);
    const msg = kyc_status === 'verified' ? 'Votre identité a été vérifiée avec succès ✅' : kyc_status === 'rejected' ? 'Votre vérification KYC a été rejetée.' : 'Votre dossier KYC est en cours de révision.';
    await pool.query(`INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)`,
      [randomUUID(), req.params.id, 'Mise à jour KYC', msg, kyc_status === 'verified' ? 'success' : 'warning']);
    res.json({ message: 'Statut KYC mis à jour' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const cur = await pool.query('SELECT is_active FROM users WHERE id=?', [req.params.id]);
    const newVal = cur.rows[0].is_active ? 0 : 1;
    await pool.query("UPDATE users SET is_active=?, updated_at=datetime('now') WHERE id=?", [newVal, req.params.id]);
    const status = newVal ? 'activé' : 'suspendu';
    await pool.query(`INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)`,
      [randomUUID(), req.params.id, 'Statut du compte', `Votre compte a été ${status}`, newVal ? 'info' : 'warning']);
    res.json({ message: `Utilisateur ${status}`, is_active: newVal });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.toggleUserLock = async (req, res) => {
  try {
    const cur = await pool.query('SELECT is_locked FROM users WHERE id=?', [req.params.id]);
    const newVal = cur.rows[0].is_locked ? 0 : 1;
    await pool.query("UPDATE users SET is_locked=?, login_attempts=0, updated_at=datetime('now') WHERE id=?", [newVal, req.params.id]);
    res.json({ message: newVal ? 'Compte verrouillé' : 'Compte déverrouillé', is_locked: newVal });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.getAllTransactions = async (req, res) => {
  const { limit=30, offset=0, type, status, flagged } = req.query;
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (type)           { where += ` AND t.type=?`;      params.push(type); }
    if (status)         { where += ` AND t.status=?`;    params.push(status); }
    if (flagged==='true') where += ' AND t.is_flagged=1';
    params.push(parseInt(limit), parseInt(offset));

    const r = await pool.query(
      `SELECT t.*,
         fa.account_number as from_acc, ta.account_number as to_acc,
         fu.first_name||' '||fu.last_name as from_user,
         tu.first_name||' '||tu.last_name as to_user
       FROM transactions t
       LEFT JOIN accounts fa ON t.from_account_id=fa.id
       LEFT JOIN accounts ta ON t.to_account_id=ta.id
       LEFT JOIN users fu ON fa.user_id=fu.id
       LEFT JOIN users tu ON ta.user_id=tu.id
       ${where}
       ORDER BY t.created_at DESC LIMIT ? OFFSET ?`,
      params
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.flagTransaction = async (req, res) => {
  const { flag_reason } = req.body;
  try {
    await pool.query('UPDATE transactions SET is_flagged=1, flag_reason=? WHERE id=?', [flag_reason, req.params.id]);
    res.json({ message: 'Transaction signalée' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.adminDeposit = async (req, res) => {
  const { user_id, amount, description } = req.body;
  if (!user_id || !amount || amount <= 0) return res.status(400).json({ message: 'Données invalides' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const acc = await client.query('SELECT * FROM accounts WHERE user_id=? AND is_active=1 ORDER BY created_at LIMIT 1', [user_id]);
    if (!acc.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Compte introuvable' }); }
    await client.query('UPDATE accounts SET balance=balance+?, available_balance=available_balance+? WHERE id=?', [amount, amount, acc.rows[0].id]);
    const ref = genRef('DEP');
    await client.query(
      `INSERT INTO transactions (id,to_account_id,amount,type,description,reference,status) VALUES (?,?,?,'deposit',?,?,'completed')`,
      [randomUUID(), acc.rows[0].id, amount, description||'Dépôt administrateur', ref]
    );
    await client.query(`INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)`,
      [randomUUID(), user_id, 'Dépôt reçu 💰', `${parseFloat(amount).toFixed(3)} TND ont été crédités sur votre compte`, 'success']);
    await client.query('COMMIT');
    res.json({ message: 'Dépôt effectué avec succès' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Erreur serveur' });
  } finally { client.release(); }
};

exports.getAllLoans = async (req, res) => {
  const { status, search, user_id } = req.query;
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND l.status=?'; params.push(status); }
    if (user_id) { where += ' AND u.id=?'; params.push(user_id); }
    if (search) {
      where += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.cin LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }
    const r = await pool.query(
      `SELECT l.*, u.id as user_id, u.first_name||' '||u.last_name as client_name, u.email, u.credit_score, u.phone, u.cin
       FROM loans l JOIN users u ON l.user_id=u.id
       ${where} ORDER BY l.created_at DESC`,
      params
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.updateLoanStatus = async (req, res) => {
  const { status, amount_approved } = req.body;
  try {
    await pool.query('UPDATE loans SET status=?, amount_approved=? WHERE id=?', [status, amount_approved||null, req.params.id]);
    const loan = await pool.query('SELECT user_id, loan_type FROM loans WHERE id=?', [req.params.id]);
    if (loan.rows[0]) {
      const msg = status === 'approved' ? `Votre demande de crédit ${loan.rows[0].loan_type} a été approuvée ✅` : `Votre demande de crédit ${loan.rows[0].loan_type} a été refusée.`;
      await pool.query(`INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)`,
        [randomUUID(), loan.rows[0].user_id, 'Décision crédit', msg, status === 'approved' ? 'success' : 'error']);
    }
    res.json({ message: 'Statut prêt mis à jour' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.getFraudAlerts = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT fa.*, u.first_name||' '||u.last_name as client_name, u.email
       FROM fraud_alerts fa JOIN users u ON fa.user_id=u.id
       ORDER BY fa.created_at DESC LIMIT 50`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.resolveFraudAlert = async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query("UPDATE fraud_alerts SET status=?, resolved_by=?, resolved_at=datetime('now') WHERE id=?", [status, req.user.id, req.params.id]);
    res.json({ message: 'Alerte mise à jour' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.getAuditLogs = async (req, res) => {
  const { limit=50, offset=0 } = req.query;
  try {
    const r = await pool.query(
      `SELECT al.*, u.first_name||' '||u.last_name as user_name, a.first_name||' '||a.last_name as admin_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id=u.id
       LEFT JOIN users a ON al.admin_id=a.id
       ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

// ── PROFILE CHANGE REQUESTS ───────────────────────────────────────────────────
exports.getAllChangeRequests = async (req, res) => {
  const { status, user_id } = req.query;
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND r.status=?'; params.push(status); }
    if (user_id) { where += ' AND r.user_id=?'; params.push(user_id); }
    const r = await pool.query(
      `SELECT r.*, u.first_name||' '||u.last_name as user_name, u.email, u.phone
       FROM profile_change_requests r
       JOIN users u ON r.user_id=u.id
       ${where}
       ORDER BY r.created_at DESC`,
      params
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.reviewChangeRequest = async (req, res) => {
  const { status, admin_note } = req.body;
  if (!['approved','rejected'].includes(status)) return res.status(400).json({ message: 'Statut invalide' });

  try {
    const req_row = await pool.query('SELECT * FROM profile_change_requests WHERE id=?', [req.params.id]);
    if (!req_row.rows[0]) return res.status(404).json({ message: 'Demande introuvable' });
    const change = req_row.rows[0];

    await pool.query(
      `UPDATE profile_change_requests SET status=?,admin_note=?,reviewed_by=?,reviewed_at=datetime('now') WHERE id=?`,
      [status, admin_note||null, req.user.id, req.params.id]
    );

    if (status === 'approved') {
      // Apply the change to the user profile
      await pool.query(
        `UPDATE users SET ${change.field_name}=?,updated_at=datetime('now') WHERE id=?`,
        [change.new_value, change.user_id]
      );
      await pool.query(
        `INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)`,
        [require('crypto').randomUUID(), change.user_id,
         'Modification approuvée',
         `Votre demande de modification de "${change.field_label}" a été approuvée.`,
         'success']
      );
    } else {
      await pool.query(
        `INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)`,
        [require('crypto').randomUUID(), change.user_id,
         'Modification refusée',
         `Votre demande de modification de "${change.field_label}" a été refusée.${admin_note ? ' Motif: '+admin_note : ''}`,
         'warning']
      );
    }

    res.json({ message: `Demande ${status === 'approved' ? 'approuvée' : 'refusée'}` });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erreur serveur' }); }
};

// ── USER ANALYTICS (for admin view) ──────────────────────────────────────────
exports.getUserAnalytics = async (req, res) => {
  try {
    const accs = await pool.query('SELECT id FROM accounts WHERE user_id=?', [req.params.id]);
    if (!accs.rows.length) return res.json({ categories:[], monthly:[], accounts:[] });
    const ids = accs.rows.map(a => `'${a.id}'`).join(',');

    const [categories, monthly, accounts, cards, txStats] = await Promise.all([
      pool.query(
        `SELECT category, SUM(amount) as total, COUNT(*) as count
         FROM transactions WHERE from_account_id IN (${ids}) AND category IS NOT NULL
         GROUP BY category ORDER BY total DESC`
      ),
      pool.query(
        `SELECT strftime('%Y-%m', created_at) as month,
                SUM(CASE WHEN to_account_id IN (${ids}) THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN from_account_id IN (${ids}) THEN amount ELSE 0 END) as expenses
         FROM transactions WHERE (from_account_id IN (${ids}) OR to_account_id IN (${ids}))
         GROUP BY month ORDER BY month DESC LIMIT 12`
      ),
      pool.query('SELECT * FROM accounts WHERE user_id=?', [req.params.id]),
      pool.query(
        `SELECT c.id,c.card_number,c.card_type,c.network,c.is_active,c.is_blocked,
                c.daily_limit,c.monthly_limit,c.expiry_date,c.card_holder
         FROM cards c JOIN accounts a ON c.account_id=a.id WHERE a.user_id=?`,
        [req.params.id]
      ),
      pool.query(
        `SELECT COUNT(*) as total_transactions, COALESCE(SUM(amount),0) as total_volume
         FROM transactions WHERE from_account_id IN (${ids}) OR to_account_id IN (${ids})`
      ),
    ]);

    res.json({
      categories: categories.rows,
      monthly: monthly.rows.slice().reverse(),
      accounts: accounts.rows,
      cards: cards.rows.map(c => ({ ...c, card_number: '**** **** **** ' + c.card_number.replace(/\s/g,'').slice(-4) })),
      transaction_stats: txStats.rows[0],
    });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erreur serveur' }); }
};

// ── KYC DOCUMENT REVIEW ───────────────────────────────────────────────────────
exports.reviewKycDocument = async (req, res) => {
  const { status, rejection_reason } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Statut invalide' });
  }
  try {
    const doc = await pool.query('SELECT * FROM kyc_documents WHERE id=?', [req.params.id]);
    if (!doc.rows[0]) return res.status(404).json({ message: 'Document introuvable' });

    await pool.query(
      `UPDATE kyc_documents SET status=?, rejection_reason=?, reviewed_by=?, reviewed_at=datetime('now') WHERE id=?`,
      [status, rejection_reason || null, req.user.id, req.params.id]
    );

    const userId = doc.rows[0].user_id;

    // Recompute user KYC status based on all documents
    const allDocs = await pool.query(
      `SELECT status FROM kyc_documents WHERE user_id=?`,
      [userId]
    );
    const docs = allDocs.rows;
    const anyRejected  = docs.some(d => d.status === 'rejected');
    const allApproved  = docs.length > 0 && docs.every(d => d.status === 'approved');
    const anyPending   = docs.some(d => d.status === 'pending');

    let newKycStatus = 'in_review';
    if (allApproved)  newKycStatus = 'verified';
    if (anyRejected)  newKycStatus = 'rejected';
    if (anyPending && !anyRejected) newKycStatus = 'in_review';

    await pool.query(
      `UPDATE users SET kyc_status=?, updated_at=datetime('now') WHERE id=?`,
      [newKycStatus, userId]
    );

    // Notify user
    const docLabels = {
      cin_front: 'CIN (Recto)', cin_back: 'CIN (Verso)',
      passport: 'Passeport', selfie: 'Selfie', proof_address: 'Justificatif de domicile'
    };
    const label = docLabels[doc.rows[0].doc_type] || doc.rows[0].doc_type;
    const notifMsg = status === 'approved'
      ? `Votre document "${label}" a été approuvé ✅`
      : `Votre document "${label}" a été rejeté.${rejection_reason ? ' Motif: ' + rejection_reason : ''}`;

    await pool.query(
      `INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)`,
      [randomUUID(), userId, 'Vérification KYC', notifMsg, status === 'approved' ? 'success' : 'error']
    );

    if (newKycStatus === 'verified') {
      await pool.query(
        `INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)`,
        [randomUUID(), userId, 'Identité vérifiée ✅', 'Félicitations ! Votre identité a été entièrement vérifiée. Votre compte est maintenant pleinement activé.', 'success']
      );
    }

    res.json({ message: `Document ${status === 'approved' ? 'approuvé' : 'rejeté'}`, kyc_status: newKycStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ── USER ACCESS LOGS ──────────────────────────────────────────────────────────
exports.getUserAccessLogs = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM audit_logs WHERE user_id=? ORDER BY created_at DESC LIMIT 30`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

// ── ADMIN NOTIFICATIONS ───────────────────────────────────────────────────────
exports.getAdminNotifications = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM admin_notifications WHERE admin_id=? ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.markAdminNotifRead = async (req, res) => {
  try {
    await pool.query('UPDATE admin_notifications SET is_read=1 WHERE id=? AND admin_id=?', [req.params.id, req.user.id]);
    res.json({ message: 'Lu' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.markAllAdminNotifsRead = async (req, res) => {
  try {
    await pool.query('UPDATE admin_notifications SET is_read=1 WHERE admin_id=?', [req.user.id]);
    res.json({ message: 'Toutes les notifications marquées comme lues' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};
