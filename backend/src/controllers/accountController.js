const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const notifyAdmin = require('../utils/notifyAdmin');

const genRef = (p='SAY') => `${p}${Date.now()}${Math.random().toString(36).slice(2,6).toUpperCase()}`;

// ── ACCOUNTS ──────────────────────────────────────────────────────────────────
exports.getMyAccounts = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM accounts WHERE user_id=? AND is_active=1 ORDER BY created_at', [req.user.id]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────
exports.getMyTransactions = async (req, res) => {
  const { limit=30, offset=0, category, type } = req.query;
  try {
    const accs = await pool.query('SELECT id FROM accounts WHERE user_id=?', [req.user.id]);
    if (!accs.rows.length) return res.json([]);
    const ids = accs.rows.map(a => `'${a.id}'`).join(',');

    let where = `WHERE (t.from_account_id IN (${ids}) OR t.to_account_id IN (${ids}))`;
    const params = [];
    if (category) { where += ` AND t.category=?`; params.push(category); }
    if (type)     { where += ` AND t.type=?`;     params.push(type); }
    params.push(parseInt(limit), parseInt(offset));

    const r = await pool.query(
      `SELECT t.*,
         fa.account_number as from_acc_num, ta.account_number as to_acc_num,
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
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erreur serveur' }); }
};

// ── TRANSFER ──────────────────────────────────────────────────────────────────
exports.transfer = async (req, res) => {
  const { to_rib, to_iban, amount, description, type='transfer_internal' } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ message: 'Montant invalide' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fromAcc = await client.query(
      'SELECT * FROM accounts WHERE user_id=? AND is_active=1 AND is_frozen=0 ORDER BY created_at LIMIT 1',
      [req.user.id]
    );
    if (!fromAcc.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Aucun compte actif' }); }
    const from = fromAcc.rows[0];

    if (parseFloat(from.available_balance) < parseFloat(amount)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Solde insuffisant' });
    }

    const dest = to_rib
      ? await client.query('SELECT * FROM accounts WHERE rib=? AND is_active=1', [to_rib])
      : await client.query('SELECT * FROM accounts WHERE iban=? AND is_active=1', [to_iban]);

    if (!dest.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Compte destinataire introuvable' }); }
    const to = dest.rows[0];

    const fees = type === 'transfer_interbank' ? parseFloat(amount) * 0.005 : 0;
    const ref = genRef('TRF');
    const txId = randomUUID();

    await client.query('UPDATE accounts SET balance=balance-?, available_balance=available_balance-? WHERE id=?', [parseFloat(amount)+fees, parseFloat(amount)+fees, from.id]);
    await client.query('UPDATE accounts SET balance=balance+?, available_balance=available_balance+? WHERE id=?', [amount, amount, to.id]);
    await client.query(
      `INSERT INTO transactions (id,from_account_id,to_account_id,amount,fees,type,description,reference,status)
       VALUES (?,?,?,?,?,?,?,?,'completed')`,
      [txId, from.id, to.id, amount, fees, type, description||'Virement', ref]
    );

    const toUser = await client.query('SELECT user_id FROM accounts WHERE id=?', [to.id]);
    if (toUser.rows[0]) {
      await client.query(
        `INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)`,
        [randomUUID(), toUser.rows[0].user_id, 'Virement reçu 💰', `Vous avez reçu ${parseFloat(amount).toFixed(3)} TND`, 'success']
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Virement effectué avec succès', transaction: { id: txId, amount, type, reference: ref } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Erreur lors du virement' });
  } finally { client.release(); }
};

// ── CARDS ─────────────────────────────────────────────────────────────────────
exports.getMyCards = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.id,c.account_id,c.card_holder,c.expiry_date,c.card_type,c.network,
              c.is_active,c.is_blocked,c.block_reason,c.daily_limit,c.monthly_limit,
              c.online_payments,c.contactless,c.international,c.created_at,
              '**** **** **** '||substr(replace(c.card_number,' ',''),-4) as card_number
       FROM cards c JOIN accounts a ON c.account_id=a.id
       WHERE a.user_id=?`,
      [req.user.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.updateCardSettings = async (req, res) => {
  const { id } = req.params;
  const { daily_limit, monthly_limit, online_payments, contactless, international, is_blocked, block_reason } = req.body;
  try {
    const check = await pool.query(
      'SELECT c.id FROM cards c JOIN accounts a ON c.account_id=a.id WHERE c.id=? AND a.user_id=?',
      [id, req.user.id]
    );
    if (!check.rows[0]) return res.status(403).json({ message: 'Carte non trouvée' });

    const sets = [];
    const vals = [];
    if (daily_limit   !== undefined) { sets.push('daily_limit=?');    vals.push(daily_limit); }
    if (monthly_limit !== undefined) { sets.push('monthly_limit=?');  vals.push(monthly_limit); }
    if (online_payments !== undefined) { sets.push('online_payments=?'); vals.push(online_payments ? 1 : 0); }
    if (contactless   !== undefined) { sets.push('contactless=?');    vals.push(contactless ? 1 : 0); }
    if (international !== undefined) { sets.push('international=?');  vals.push(international ? 1 : 0); }
    if (is_blocked    !== undefined) { sets.push('is_blocked=?');     vals.push(is_blocked ? 1 : 0); }
    if (block_reason  !== undefined) { sets.push('block_reason=?');   vals.push(block_reason); }

    if (sets.length) {
      vals.push(id);
      await pool.query(`UPDATE cards SET ${sets.join(',')} WHERE id=?`, vals);
    }
    res.json({ message: 'Carte mise à jour' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

// ── PROFILE ───────────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  const { first_name, last_name, phone, address, city, governorate, postal_code, preferred_language } = req.body;
  
  // Validate phone if provided
  if (phone && !/^\+216[0-9]{8}$/.test(phone)) {
    return res.status(400).json({ message: 'Numéro tunisien invalide. Format: +216 suivi de 8 chiffres exactement' });
  }

  try {
    // Check if phone already used by another user
    if (phone) {
      const existing = await pool.query('SELECT id FROM users WHERE phone=? AND id!=?', [phone, req.user.id]);
      if (existing.rows.length) return res.status(409).json({ message: 'Ce numéro est déjà utilisé par un autre compte' });
    }

    // Get current values
    const current = await pool.query('SELECT first_name,last_name,phone,address,city,governorate,postal_code FROM users WHERE id=?', [req.user.id]);
    const old = current.rows[0];

    // Create change requests for sensitive fields (phone, address)
    const sensitiveChanges = [];
    if (phone && phone !== old.phone) sensitiveChanges.push({ field:'phone', label:'Téléphone', old:old.phone, new:phone });
    if (address && address !== old.address) sensitiveChanges.push({ field:'address', label:'Adresse', old:old.address, new:address });
    if (city && city !== old.city) sensitiveChanges.push({ field:'city', label:'Ville', old:old.city, new:city });
    if (governorate && governorate !== old.governorate) sensitiveChanges.push({ field:'governorate', label:'Gouvernorat', old:old.governorate, new:governorate });

    if (sensitiveChanges.length > 0) {
      // Create pending requests
      for (const change of sensitiveChanges) {
        await pool.query(
          `INSERT INTO profile_change_requests (id,user_id,field_name,field_label,old_value,new_value,status)
           VALUES (?,?,?,?,?,?,'pending')`,
          [randomUUID(), req.user.id, change.field, change.label, change.old, change.new]
        );
      }
      await pool.query(
        `INSERT INTO notifications (id,user_id,title,message,type)
         VALUES (?,?,?,?,?)`,
        [randomUUID(), req.user.id, 'Demande de modification soumise', `Vos modifications (${sensitiveChanges.map(c=>c.label).join(', ')}) sont en attente de validation par l'administrateur.`, 'info']
      );
      // Notify admin
      const userInfo3 = await pool.query('SELECT first_name, last_name FROM users WHERE id=?', [req.user.id]);
      const u3 = userInfo3.rows[0];
      await notifyAdmin(
        'Demande de modification de profil',
        `${u3?.first_name} ${u3?.last_name} demande à modifier : ${sensitiveChanges.map(c=>c.label).join(', ')}.`,
        'warning',
        `/admin/change-requests`
      );
      
      // Update non-sensitive fields immediately
      await pool.query(
        `UPDATE users SET first_name=?,last_name=?,postal_code=?,preferred_language=?,updated_at=datetime('now') WHERE id=?`,
        [first_name, last_name, postal_code, preferred_language, req.user.id]
      );
      
      return res.json({ 
        message: `Modifications soumises. Les changements sensibles (${sensitiveChanges.map(c=>c.label).join(', ')}) nécessitent une validation admin.`,
        pending_approval: true
      });
    }

    // No sensitive changes — update directly
    await pool.query(
      `UPDATE users SET first_name=?,last_name=?,phone=?,address=?,city=?,
       governorate=?,postal_code=?,preferred_language=?,updated_at=datetime('now')
       WHERE id=?`,
      [first_name, last_name, phone, address, city, governorate, postal_code, preferred_language, req.user.id]
    );
    const r = await pool.query('SELECT id,first_name,last_name,email,phone,address,city,governorate,role,kyc_status FROM users WHERE id=?', [req.user.id]);
    res.json(r.rows[0]);
  } catch (err) { 
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' }); 
  }
};

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 30', [req.user.id]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.markNotificationRead = async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    res.json({ message: 'Lu' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.markAllRead = async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id]);
    res.json({ message: 'Toutes les notifications marquées comme lues' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

// ── BILLS ─────────────────────────────────────────────────────────────────────
exports.getBills = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM bills WHERE user_id=? ORDER BY due_date ASC', [req.user.id]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.payBill = async (req, res) => {
  const { bill_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bill = await client.query('SELECT * FROM bills WHERE id=? AND user_id=?', [bill_id, req.user.id]);
    if (!bill.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Facture introuvable' }); }
    if (bill.rows[0].status === 'paid') { await client.query('ROLLBACK'); return res.status(400).json({ message: 'Facture déjà payée' }); }

    const acc = await client.query('SELECT * FROM accounts WHERE user_id=? AND is_active=1 ORDER BY created_at LIMIT 1', [req.user.id]);
    if (!acc.rows[0] || parseFloat(acc.rows[0].available_balance) < parseFloat(bill.rows[0].amount)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Solde insuffisant' });
    }

    const ref = genRef('BILL');
    const txId = randomUUID();
    await client.query('UPDATE accounts SET balance=balance-?, available_balance=available_balance-? WHERE id=?', [bill.rows[0].amount, bill.rows[0].amount, acc.rows[0].id]);
    await client.query(
      `INSERT INTO transactions (id,from_account_id,amount,type,description,reference,category,status)
       VALUES (?,?,?,'payment_bill',?,?,'Factures','completed')`,
      [txId, acc.rows[0].id, bill.rows[0].amount, `Paiement ${bill.rows[0].biller_name}`, ref]
    );
    await client.query("UPDATE bills SET status='paid', paid_at=datetime('now'), transaction_id=? WHERE id=?", [txId, bill_id]);
    await client.query('COMMIT');
    res.json({ message: `Facture ${bill.rows[0].biller_name} payée avec succès` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Erreur paiement facture' });
  } finally { client.release(); }
};

// ── RECHARGE ──────────────────────────────────────────────────────────────────
exports.rechargePhone = async (req, res) => {
  const { phone, operator, amount } = req.body;
  if (!phone || !operator || !amount) return res.status(400).json({ message: 'Données manquantes' });
  if (!/^\+216[0-9]{8}$/.test(phone)) return res.status(400).json({ message: 'Numéro tunisien invalide' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const acc = await client.query('SELECT * FROM accounts WHERE user_id=? AND is_active=1 ORDER BY created_at LIMIT 1', [req.user.id]);
    if (!acc.rows[0] || parseFloat(acc.rows[0].available_balance) < parseFloat(amount)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Solde insuffisant' });
    }
    const ref = genRef('RCH');
    await client.query('UPDATE accounts SET balance=balance-?, available_balance=available_balance-? WHERE id=?', [amount, amount, acc.rows[0].id]);
    await client.query(
      `INSERT INTO transactions (id,from_account_id,amount,type,description,reference,category,merchant_name,status)
       VALUES (?,?,?,'recharge_mobile',?,?,'Télécom',?,'completed')`,
      [randomUUID(), acc.rows[0].id, amount, `Recharge ${operator} ${phone}`, ref, operator]
    );
    await client.query('COMMIT');
    res.json({ message: `Recharge ${operator} de ${amount} TND effectuée pour ${phone}` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Erreur recharge' });
  } finally { client.release(); }
};

// ── BENEFICIARIES ─────────────────────────────────────────────────────────────
exports.getBeneficiaries = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM beneficiaries WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.addBeneficiary = async (req, res) => {
  const { name, bank_name, rib, iban, phone } = req.body;
  if (!name) return res.status(400).json({ message: 'Nom requis' });
  try {
    const isInternal = rib ? (await pool.query('SELECT id FROM accounts WHERE rib=?', [rib])).rows.length > 0 : false;
    const id = randomUUID();
    await pool.query(
      `INSERT INTO beneficiaries (id,user_id,name,bank_name,rib,iban,phone,is_internal)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, req.user.id, name, bank_name||null, rib||null, iban||null, phone||null, isInternal ? 1 : 0]
    );
    const r = await pool.query('SELECT * FROM beneficiaries WHERE id=?', [id]);
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.deleteBeneficiary = async (req, res) => {
  try {
    await pool.query('DELETE FROM beneficiaries WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    res.json({ message: 'Bénéficiaire supprimé' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

// ── SAVINGS GOALS ─────────────────────────────────────────────────────────────
exports.getSavingsGoals = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM savings_goals WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.createSavingsGoal = async (req, res) => {
  const { name, target_amount, target_date, auto_save, auto_save_amount } = req.body;
  if (!name || !target_amount) return res.status(400).json({ message: 'Données manquantes' });
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Auto-create a dedicated savings account for this goal
    const ts = Date.now();
    const rib = `10006000${Math.floor(Math.random()*1000).toString().padStart(3,'0')}${ts.toString().slice(-9)}47`;
    const iban = `TN59${rib}`;
    const accNum = `TN${ts.toString().slice(-10)}${Math.floor(Math.random()*99).toString().padStart(2,'0')}`;
    const accId = randomUUID();
    
    await client.query(
      `INSERT INTO accounts (id,user_id,account_number,rib,iban,balance,available_balance,currency,account_type,interest_rate)
       VALUES (?,?,?,?,?,0.0,0.0,'TND','savings',3.5)`,
      [accId, req.user.id, accNum, rib, iban]
    );
    
    // Create the savings goal linked to the new account
    const goalId = randomUUID();
    await client.query(
      `INSERT INTO savings_goals (id,user_id,account_id,name,target_amount,target_date,auto_save,auto_save_amount)
       VALUES (?,?,?,?,?,?,?,?)`,
      [goalId, req.user.id, accId, name, target_amount, target_date||null, auto_save ? 1 : 0, auto_save_amount||0]
    );
    
    // Notify user with account details
    await client.query(
      `INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)`,
      [randomUUID(), req.user.id, 'Compte d\'épargne créé 🎯',
       `Votre objectif "${name}" est actif. Un compte d'épargne dédié a été créé.\n\nRIB: ${rib}\nIBAN: ${iban}\nTaux: 3.5% par an`,
       'success']
    );
    
    await client.query('COMMIT');
    
    const goal = await pool.query('SELECT * FROM savings_goals WHERE id=?', [goalId]);
    const account = await pool.query('SELECT * FROM accounts WHERE id=?', [accId]);
    
    res.status(201).json({
      goal: goal.rows[0],
      account: account.rows[0],
      message: `Objectif créé avec succès. Compte d'épargne dédié : ${rib}`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  } finally {
    client.release();
  }
};

// ── LOANS ─────────────────────────────────────────────────────────────────────
exports.getMyLoans = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM loans WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.applyLoan = async (req, res) => {
  const { loan_type, amount_requested, duration_months, purpose } = req.body;
  if (!loan_type || !amount_requested || !duration_months) return res.status(400).json({ message: 'Données manquantes' });
  try {
    const userInfo = await pool.query('SELECT credit_score, risk_level FROM users WHERE id=?', [req.user.id]);
    const { credit_score, risk_level } = userInfo.rows[0];

    let ai_score = credit_score;
    if (risk_level === 'high') ai_score -= 100;
    if (risk_level === 'critical') ai_score -= 200;
    if (duration_months > 60) ai_score -= 50;
    if (parseFloat(amount_requested) > 50000) ai_score -= 30;

    const ai_recommendation = ai_score >= 600 ? 'approved' : ai_score >= 450 ? 'review' : 'rejected';
    const rates = { personal:8.5, auto:7.2, mortgage:5.5, business:9.0, student:4.5 };
    const interest_rate = rates[loan_type] || 8.5;
    const r = interest_rate/100/12;
    const n = parseInt(duration_months);
    const monthly = (parseFloat(amount_requested) * r) / (1 - Math.pow(1+r, -n));

    const id = randomUUID();
    const status = ai_recommendation === 'rejected' ? 'rejected' : 'under_review';
    await pool.query(
      `INSERT INTO loans (id,user_id,loan_type,amount_requested,interest_rate,duration_months,monthly_payment,purpose,ai_score,ai_recommendation,status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, req.user.id, loan_type, amount_requested, interest_rate, duration_months, monthly.toFixed(3), purpose||null, ai_score, ai_recommendation, status]
    );
    await pool.query(
      `INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)`,
      [randomUUID(), req.user.id, 'Demande de crédit reçue 📋', `Votre demande de ${parseFloat(amount_requested).toFixed(3)} TND est en cours d'analyse.`, 'info']
    );
    // Notify admin
    const userInfo2 = await pool.query('SELECT first_name, last_name FROM users WHERE id=?', [req.user.id]);
    const u2 = userInfo2.rows[0];
    await notifyAdmin(
      'Nouvelle demande de crédit',
      `${u2?.first_name} ${u2?.last_name} a soumis une demande de crédit ${loan_type} de ${parseFloat(amount_requested).toFixed(3)} TND.`,
      'info',
      `/admin/loans`
    );
    const loan = await pool.query('SELECT * FROM loans WHERE id=?', [id]);
    res.status(201).json(loan.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erreur serveur' }); }
};

// ── KYC ───────────────────────────────────────────────────────────────────────
exports.uploadKycDoc = async (req, res) => {
  const { doc_type } = req.body;
  if (!doc_type) return res.status(400).json({ message: 'Type de document requis' });
  try {
    const fileName  = req.file ? req.file.originalname : `${doc_type}_${Date.now()}.jpg`;
    const fileUrl   = req.file ? `/uploads/kyc/${req.file.filename}` : null;
    const aiConfidence = Math.floor(75 + Math.random() * 25);
    const id = randomUUID();
    await pool.query(
      `INSERT INTO kyc_documents (id,user_id,doc_type,file_name,file_url,ai_confidence,status) VALUES (?,?,?,?,?,?,'pending')`,
      [id, req.user.id, doc_type, fileName, fileUrl, aiConfidence]
    );
    if (['cin_front','cin_back','passport'].includes(doc_type)) {
      await pool.query("UPDATE users SET doc_verified=1, kyc_status='in_review', updated_at=datetime('now') WHERE id=?", [req.user.id]);
    }
    if (doc_type === 'selfie') {
      await pool.query("UPDATE users SET face_verified=1, updated_at=datetime('now') WHERE id=?", [req.user.id]);
    }
    // Notify admin
    const userInfo = await pool.query('SELECT first_name, last_name FROM users WHERE id=?', [req.user.id]);
    const u = userInfo.rows[0];
    const docLabels = { cin_front:'CIN (Recto)', cin_back:'CIN (Verso)', passport:'Passeport', selfie:'Selfie', proof_address:'Justificatif de domicile' };
    await notifyAdmin(
      'Nouveau document KYC soumis',
      `${u?.first_name} ${u?.last_name} a soumis un document : ${docLabels[doc_type] || doc_type}.`,
      'warning',
      `/admin/users/${req.user.id}`
    );
    const doc = await pool.query('SELECT * FROM kyc_documents WHERE id=?', [id]);
    res.json({ message: 'Document soumis avec succès', document: doc.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erreur upload' }); }
};

exports.getKycDocuments = async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id,doc_type,file_name,file_url,ai_confidence,status,rejection_reason,created_at FROM kyc_documents WHERE user_id=? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
exports.getSpendingAnalytics = async (req, res) => {
  try {
    const accs = await pool.query('SELECT id FROM accounts WHERE user_id=?', [req.user.id]);
    if (!accs.rows.length) return res.json({ categories:[], monthly:[] });
    const ids = accs.rows.map(a => `'${a.id}'`).join(',');

    const categories = await pool.query(
      `SELECT category, SUM(amount) as total, COUNT(*) as count
       FROM transactions
       WHERE from_account_id IN (${ids}) AND category IS NOT NULL
       GROUP BY category ORDER BY total DESC`
    );

    const monthly = await pool.query(
      `SELECT strftime('%Y-%m', created_at) as month,
              SUM(CASE WHEN to_account_id IN (${ids}) THEN amount ELSE 0 END) as income,
              SUM(CASE WHEN from_account_id IN (${ids}) THEN amount ELSE 0 END) as expenses
       FROM transactions
       WHERE (from_account_id IN (${ids}) OR to_account_id IN (${ids}))
       GROUP BY month ORDER BY month DESC LIMIT 12`
    );

    const monthlyOrdered = monthly.rows.slice().reverse();
    res.json({ categories: categories.rows, monthly: monthlyOrdered });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

// ── PROFILE CHANGE REQUESTS ───────────────────────────────────────────────────
exports.getMyChangeRequests = async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM profile_change_requests WHERE user_id=? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};
