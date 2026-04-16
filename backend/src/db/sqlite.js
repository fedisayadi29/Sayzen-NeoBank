const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const DB_PATH = path.join(__dirname, '..', '..', 'sayzen.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT UNIQUE,
    cin TEXT UNIQUE,
    address TEXT,
    city TEXT,
    governorate TEXT,
    postal_code TEXT,
    date_of_birth TEXT,
    gender TEXT,
    nationality TEXT DEFAULT 'Tunisienne',
    role TEXT DEFAULT 'user',
    kyc_status TEXT DEFAULT 'pending',
    face_verified INTEGER DEFAULT 0,
    doc_verified INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    is_locked INTEGER DEFAULT 0,
    two_fa_enabled INTEGER DEFAULT 0,
    preferred_language TEXT DEFAULT 'fr',
    credit_score INTEGER DEFAULT 500,
    risk_level TEXT DEFAULT 'low',
    login_attempts INTEGER DEFAULT 0,
    last_login TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS otp_codes (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    type TEXT NOT NULL,
    is_used INTEGER DEFAULT 0,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS kyc_documents (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL,
    file_name TEXT,
    file_url TEXT,
    ai_confidence REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_by TEXT,
    reviewed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    account_number TEXT UNIQUE NOT NULL,
    rib TEXT UNIQUE NOT NULL,
    iban TEXT UNIQUE NOT NULL,
    balance REAL DEFAULT 0.0,
    available_balance REAL DEFAULT 0.0,
    currency TEXT DEFAULT 'TND',
    account_type TEXT DEFAULT 'current',
    interest_rate REAL DEFAULT 0.0,
    is_active INTEGER DEFAULT 1,
    is_frozen INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS beneficiaries (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bank_name TEXT,
    rib TEXT,
    iban TEXT,
    phone TEXT,
    is_verified INTEGER DEFAULT 0,
    is_internal INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    from_account_id TEXT REFERENCES accounts(id),
    to_account_id TEXT REFERENCES accounts(id),
    amount REAL NOT NULL,
    fees REAL DEFAULT 0.0,
    currency TEXT DEFAULT 'TND',
    type TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    description TEXT,
    reference TEXT UNIQUE NOT NULL,
    category TEXT,
    merchant_name TEXT,
    risk_score INTEGER DEFAULT 0,
    is_flagged INTEGER DEFAULT 0,
    flag_reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
    card_number TEXT UNIQUE NOT NULL,
    card_holder TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    cvv_hash TEXT NOT NULL,
    card_type TEXT DEFAULT 'virtual',
    network TEXT DEFAULT 'visa',
    is_active INTEGER DEFAULT 1,
    is_blocked INTEGER DEFAULT 0,
    block_reason TEXT,
    daily_limit REAL DEFAULT 2000.0,
    monthly_limit REAL DEFAULT 10000.0,
    online_payments INTEGER DEFAULT 1,
    contactless INTEGER DEFAULT 1,
    international INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    account_id TEXT,
    loan_type TEXT NOT NULL,
    amount_requested REAL NOT NULL,
    amount_approved REAL,
    outstanding_balance REAL DEFAULT 0.0,
    interest_rate REAL NOT NULL,
    duration_months INTEGER NOT NULL,
    monthly_payment REAL,
    status TEXT DEFAULT 'pending',
    purpose TEXT,
    ai_score INTEGER,
    ai_recommendation TEXT,
    next_payment_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    biller_code TEXT NOT NULL,
    biller_name TEXT NOT NULL,
    biller_category TEXT NOT NULL,
    reference_number TEXT NOT NULL,
    amount REAL,
    due_date TEXT,
    status TEXT DEFAULT 'pending',
    paid_at TEXT,
    transaction_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS savings_goals (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    account_id TEXT,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0.0,
    target_date TEXT,
    auto_save INTEGER DEFAULT 0,
    auto_save_amount REAL DEFAULT 0.0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    admin_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS fraud_alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    transaction_id TEXT REFERENCES transactions(id),
    alert_type TEXT NOT NULL,
    severity TEXT DEFAULT 'medium',
    description TEXT,
    ai_confidence REAL,
    status TEXT DEFAULT 'open',
    resolved_by TEXT,
    resolved_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ── Seed ─────────────────────────────────────────────────────────────────────
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount.c === 0) {
  const adminPwd = bcrypt.hashSync('Sayzen@Admin2024', 12);
  const demoPwd  = bcrypt.hashSync('Demo@123456', 12);
  const adminId  = randomUUID();
  const demoId   = randomUUID();
  const ts       = Date.now();

  db.prepare(`INSERT INTO users (id,first_name,last_name,email,password,phone,role,kyc_status,face_verified,doc_verified,credit_score)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(adminId,'Admin','Sayzen','admin@sayzen.tn',adminPwd,'+21671000000','admin','verified',1,1,850);

  db.prepare(`INSERT INTO users (id,first_name,last_name,email,password,phone,cin,address,city,governorate,postal_code,date_of_birth,gender,kyc_status,face_verified,doc_verified,credit_score,risk_level)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(demoId,'Mohamed Ali','Ben Salah','demo@sayzen.tn',demoPwd,'+21698765432','12345678','15 Rue de la République','Tunis','Tunis','1000','1990-05-15','male','verified',1,1,720,'low');

  const rib1  = `10006000010${ts.toString().slice(-9)}47`;
  const acc1Id = randomUUID();
  db.prepare(`INSERT INTO accounts (id,user_id,account_number,rib,iban,balance,available_balance,currency,account_type)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(acc1Id,demoId,`TN${ts.toString().slice(-10)}01`,rib1,`TN59${rib1}`,15750.5,15750.5,'TND','current');

  const rib2  = `10006000020${(ts+1).toString().slice(-9)}23`;
  const acc2Id = randomUUID();
  db.prepare(`INSERT INTO accounts (id,user_id,account_number,rib,iban,balance,available_balance,currency,account_type,interest_rate)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(acc2Id,demoId,`TN${(ts+1).toString().slice(-10)}02`,rib2,`TN59${rib2}`,8200.0,8200.0,'TND','savings',3.5);

  const cvvH = bcrypt.hashSync('123',10);
  db.prepare(`INSERT INTO cards (id,account_id,card_number,card_holder,expiry_date,cvv_hash,card_type,network,daily_limit,monthly_limit)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(randomUUID(), acc1Id, '4539 1488 0343 6467', 'MOHAMED ALI BEN SALAH', '2027-12-31', cvvH, 'virtual', 'visa', 2000.0, 10000.0);

  const txStmt = db.prepare(`INSERT INTO transactions (id,from_account_id,to_account_id,amount,type,description,reference,category,status) VALUES (?,?,?,?,?,?,?,?,?)`);
  [
    [null,acc1Id,3200.0,'deposit','Salaire Novembre 2024','Salaire'],
    [acc1Id,null,85.5,'payment_bill','Facture STEG','Factures'],
    [acc1Id,null,42.3,'payment_bill','Facture SONEDE','Factures'],
    [acc1Id,acc2Id,500.0,'transfer_internal','Virement épargne','Épargne'],
    [acc1Id,null,20.0,'recharge_mobile','Recharge Ooredoo','Télécom'],
    [acc1Id,null,15.99,'payment_bill','Abonnement Netflix','Loisirs'],
    [acc1Id,null,200.0,'withdrawal','Retrait DAB Tunis Centre','Retrait'],
    [null,acc1Id,3200.0,'deposit','Salaire Octobre 2024','Salaire'],
    [acc1Id,null,120.0,'payment_bill','Facture Topnet','Factures'],
    [acc1Id,null,55.0,'recharge_mobile','Recharge Tunisie Telecom','Télécom'],
  ].forEach((t,i) => txStmt.run(randomUUID(),t[0],t[1],t[2],t[3],t[4],`SAY${ts}${i}X`,t[5],'completed'));

  const billStmt = db.prepare(`INSERT INTO bills (id,user_id,biller_code,biller_name,biller_category,reference_number,amount,due_date,status) VALUES (?,?,?,?,?,?,?,?,?)`);
  [
    ['STEG001','STEG','Énergie','REF-STEG-2024-001',85.5,'2024-12-31'],
    ['SONEDE001','SONEDE','Eau','REF-SONEDE-2024-001',42.3,'2024-12-31'],
    ['TOPNET001','Topnet','Internet','REF-TOP-2024-001',49.9,'2024-12-31'],
    ['OOREDOO001','Ooredoo','Télécom','REF-OOR-2024-001',35.0,'2024-12-31'],
  ].forEach(b => billStmt.run(randomUUID(),demoId,...b,'pending'));

  db.prepare(`INSERT INTO savings_goals (id,user_id,account_id,name,target_amount,current_amount,target_date,auto_save,auto_save_amount)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(randomUUID(),demoId,acc2Id,'Voyage à Paris',5000.0,1200.0,'2025-06-01',1,200.0);

  db.prepare(`INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)`)
    .run(randomUUID(),demoId,'Bienvenue chez Sayzen Bank 🎉','Votre compte est actif. Explorez toutes nos fonctionnalités.','success');

  console.log('✅ Sayzen DB seeded');
}

// ── Pool interface ────────────────────────────────────────────────────────────
const pool = {
  rawDb: db,

  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      try {
        // Normalise SQL for SQLite
        let q = sql
          .replace(/\$(\d+)/g, '?')                          // $1 → ?
          .replace(/NOW\(\)/gi, "datetime('now')")
          .replace(/ILIKE/gi, 'LIKE')
          .replace(/::[\w]+/g, '')                            // cast removal
          .replace(/\bTRUE\b/gi, '1')
          .replace(/\bFALSE\b/gi, '0')
          .trim();

        // Strip RETURNING clause — handle separately
        const returningMatch = q.match(/RETURNING\s+([\w,\s*]+)$/i);
        if (returningMatch) {
          q = q.replace(/RETURNING\s+[\w,\s*]+$/i, '').trim();
        }

        // Strip ON CONFLICT ... DO NOTHING
        q = q.replace(/ON CONFLICT\s*\([^)]*\)\s*DO NOTHING/gi, '').trim();
        q = q.replace(/ON CONFLICT\s+DO NOTHING/gi, '').trim();

        const isSelect = /^\s*(SELECT|WITH|PRAGMA)/i.test(q);

        if (isSelect) {
          const rows = db.prepare(q).all(...params);
          resolve({ rows });
        } else {
          const stmt = db.prepare(q);
          const info = stmt.run(...params);
          // If RETURNING was requested, fetch the last inserted/updated row
          if (returningMatch) {
            const cols = returningMatch[1].trim();
            if (cols === '*' || cols === 'id') {
              // Try to get the row by rowid
              const tableName = q.match(/(?:INTO|UPDATE)\s+(\w+)/i)?.[1];
              if (tableName && info.lastInsertRowid) {
                try {
                  const row = db.prepare(`SELECT * FROM ${tableName} WHERE rowid=?`).get(info.lastInsertRowid);
                  resolve({ rows: row ? [row] : [] });
                  return;
                } catch(_) {}
              }
            }
          }
          resolve({ rows: [], rowCount: info.changes });
        }
      } catch (err) {
        console.error('SQLite query error:', err.message, '\nSQL:', sql, '\nParams:', params);
        reject(err);
      }
    });
  },

  connect: () => {
    const client = {
      _txActive: false,
      query: async (sql, params = []) => {
        if (/^\s*BEGIN/i.test(sql))    { client._txActive = true;  return { rows: [] }; }
        if (/^\s*COMMIT/i.test(sql))   { client._txActive = false; return { rows: [] }; }
        if (/^\s*ROLLBACK/i.test(sql)) { client._txActive = false; return { rows: [] }; }
        return pool.query(sql, params);
      },
      release: () => {},
    };
    return Promise.resolve(client);
  },

  end: () => {},
};

module.exports = pool;
