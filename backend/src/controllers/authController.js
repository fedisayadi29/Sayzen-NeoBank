require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const pool = require('../db/pool');
const notifyAdmin = require('../utils/notifyAdmin');

const genRIB = () => {
  const ts = Date.now().toString().slice(-9);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `10006000${random}${ts}47`;
};

const genUniqueRIB = async (pool) => {
  let rib;
  let attempts = 0;
  do {
    rib = genRIB();
    const existing = await pool.query('SELECT id FROM accounts WHERE rib=?', [rib]);
    attempts++;
    if (attempts > 10) {
      // Si trop de collisions, ajouter plus d'entropie
      rib = genRIB() + Math.floor(Math.random() * 100).toString().padStart(2, '0');
    }
  } while (existing.rows.length > 0 && attempts < 20);
  return rib;
};
const genIBAN = (rib) => `TN59${rib}`;
const genAccNum = () => `TN${Date.now().toString().slice(-10)}${Math.floor(Math.random()*99).toString().padStart(2,'0')}`;
const genRef = (p='SAY') => `${p}${Date.now()}${Math.random().toString(36).slice(2,6).toUpperCase()}`;

exports.register = async (req, res) => {
  const { first_name, last_name, email, password, phone, cin, date_of_birth, gender, address, city, governorate } = req.body;
  if (!first_name || !last_name || !email || !password || !phone) {
    return res.status(400).json({ message: 'Champs obligatoires manquants' });
  }
  if (!/^\+216[0-9]{8}$/.test(phone)) {
    return res.status(400).json({ message: 'Numéro tunisien invalide. Format: +216XXXXXXXX' });
  }

  try {
    const exists = await pool.query('SELECT id FROM users WHERE email=? OR phone=?', [email, phone]);
    if (exists.rows.length) return res.status(409).json({ message: 'Email ou téléphone déjà utilisé' });

    const hashed = await bcrypt.hash(password, 12);
    const userId = randomUUID();
    await pool.query(
      `INSERT INTO users (id,first_name,last_name,email,password,phone,cin,date_of_birth,gender,address,city,governorate)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [userId, first_name, last_name, email, hashed, phone, cin||null, date_of_birth||null, gender||null, address||null, city||null, governorate||null]
    );

    const rib = await genUniqueRIB(pool);
    const iban = genIBAN(rib);
    const accNum = genAccNum();
    const accId = randomUUID();
    await pool.query(
      `INSERT INTO accounts (id,user_id,account_number,rib,iban,balance,available_balance,currency,account_type)
       VALUES (?,?,?,?,?,0.0,0.0,'TND','current')`,
      [accId, userId, accNum, rib, iban]
    );

    const cvvHash = await bcrypt.hash(Math.floor(100+Math.random()*900).toString(), 10);
    const expiry = new Date(); expiry.setFullYear(expiry.getFullYear()+3);
    const cardNum = '4' + Array.from({length:15},()=>Math.floor(Math.random()*10)).join('');
    const formatted = cardNum.match(/.{1,4}/g).join(' ');
    await pool.query(
      `INSERT INTO cards (id,account_id,card_number,card_holder,expiry_date,cvv_hash,card_type,network)
       VALUES (?,?,?,?,?,?,'virtual','visa')`,
      [randomUUID(), accId, formatted, `${first_name.toUpperCase()} ${last_name.toUpperCase()}`, expiry.toISOString().split('T')[0], cvvHash]
    );

    await pool.query(
      `INSERT INTO notifications (id,user_id,title,message,type)
       VALUES (?,?,?,?,?)`,
      [randomUUID(), userId, 'Bienvenue chez Sayzen Bank 🎉', 'Votre compte a été créé. Complétez votre KYC pour débloquer toutes les fonctionnalités.', 'success']
    );

    const user = { id: userId, first_name, last_name, email, phone, role: 'user', kyc_status: 'pending' };
    const token = jwt.sign({ id: userId, role: 'user' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

    // Notify admins of new registration
    await notifyAdmin(
      'Nouveau client inscrit',
      `${first_name} ${last_name} (${email}) vient de créer un compte.`,
      'info',
      `/admin/users/${userId}`
    );

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email et mot de passe requis' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE email=?', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ message: 'Identifiants incorrects' });
    if (user.is_locked) return res.status(403).json({ message: 'Compte verrouillé. Contactez le support.' });
    if (!user.is_active) return res.status(403).json({ message: 'Compte suspendu' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const attempts = user.login_attempts + 1;
      const locked = attempts >= 5 ? 1 : 0;
      await pool.query('UPDATE users SET login_attempts=?, is_locked=? WHERE id=?', [attempts, locked, user.id]);
      if (locked) return res.status(403).json({ message: 'Compte verrouillé après 5 tentatives' });
      return res.status(401).json({ message: `Identifiants incorrects (${5-attempts} tentatives restantes)` });
    }

    await pool.query("UPDATE users SET login_attempts=0, last_login=datetime('now') WHERE id=?", [user.id]);
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    const { password: _, ...safeUser } = user;
    if (safeUser.email === 'admin@sayzen.tn') {
      safeUser.first_name = 'Admin';
      safeUser.last_name = 'Sayzen';
    }
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id,first_name,last_name,email,phone,cin,address,city,governorate,postal_code,
              date_of_birth,nationality,gender,role,kyc_status,face_verified,doc_verified,
              is_active,is_locked,two_fa_enabled,preferred_language,credit_score,risk_level,
              last_login,created_at
       FROM users WHERE id=?`,
      [req.user.id]
    );
    const user = r.rows[0];
    if (user && user.email === 'admin@sayzen.tn') {
      user.first_name = 'Admin';
      user.last_name = 'Sayzen';
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.sendOTP = async (req, res) => {
  const { type } = req.body;
  try {
    await pool.query('UPDATE otp_codes SET is_used=1 WHERE user_id=? AND type=? AND is_used=0', [req.user.id, type]);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await pool.query(
      'INSERT INTO otp_codes (id,user_id,code,type,expires_at) VALUES (?,?,?,?,?)',
      [randomUUID(), req.user.id, code, type, expiresAt]
    );
    console.log(`[OTP] ${req.user.id} => ${code}`);
    res.json({ message: 'Code OTP envoyé', expires_in: 600, demo_code: code });
  } catch (err) {
    res.status(500).json({ message: 'Erreur envoi OTP' });
  }
};

exports.verifyOTP = async (req, res) => {
  const { code, type } = req.body;
  try {
    const r = await pool.query(
      `SELECT * FROM otp_codes WHERE user_id=? AND code=? AND type=? AND is_used=0 AND expires_at>datetime('now')
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id, code, type]
    );
    if (!r.rows[0]) return res.status(400).json({ message: 'Code OTP invalide ou expiré' });
    await pool.query('UPDATE otp_codes SET is_used=1 WHERE id=?', [r.rows[0].id]);
    res.json({ verified: true });
  } catch (err) {
    res.status(500).json({ message: 'Erreur vérification OTP' });
  }
};

exports.changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  try {
    const r = await pool.query('SELECT password FROM users WHERE id=?', [req.user.id]);
    const valid = await bcrypt.compare(current_password, r.rows[0].password);
    if (!valid) return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
    const hashed = await bcrypt.hash(new_password, 12);
    await pool.query("UPDATE users SET password=?, updated_at=datetime('now') WHERE id=?", [hashed, req.user.id]);
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
