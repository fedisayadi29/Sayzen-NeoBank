require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const DB_PATH = path.join(__dirname, '..', '..', 'sayzen.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const migrate = () => {
  try {

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20) UNIQUE,
        cin VARCHAR(20) UNIQUE,
        address TEXT,
        city VARCHAR(100),
        governorate VARCHAR(100),
        postal_code VARCHAR(10),
        date_of_birth DATE,
        gender VARCHAR(10),
        nationality VARCHAR(50) DEFAULT 'Tunisienne',
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user','admin','compliance','support')),
        kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending','in_review','verified','rejected')),
        face_verified BOOLEAN DEFAULT false,
        doc_verified BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        is_locked BOOLEAN DEFAULT false,
        two_fa_enabled BOOLEAN DEFAULT false,
        preferred_language VARCHAR(5) DEFAULT 'fr',
        credit_score INTEGER DEFAULT 500,
        risk_level VARCHAR(20) DEFAULT 'low',
        login_attempts INTEGER DEFAULT 0,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        code VARCHAR(10) NOT NULL,
        type VARCHAR(30) NOT NULL,
        is_used BOOLEAN DEFAULT false,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS kyc_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        doc_type VARCHAR(30) NOT NULL,
        file_name VARCHAR(200),
        file_url VARCHAR(500),
        ai_confidence DECIMAL(5,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        rejection_reason TEXT,
        reviewed_by UUID,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        account_number VARCHAR(25) UNIQUE NOT NULL,
        rib VARCHAR(25) UNIQUE NOT NULL,
        iban VARCHAR(34) UNIQUE NOT NULL,
        balance DECIMAL(15,3) DEFAULT 0.000,
        available_balance DECIMAL(15,3) DEFAULT 0.000,
        currency VARCHAR(3) DEFAULT 'TND',
        account_type VARCHAR(20) DEFAULT 'current' CHECK (account_type IN ('current','savings','forex','business')),
        interest_rate DECIMAL(5,3) DEFAULT 0.000,
        is_active BOOLEAN DEFAULT true,
        is_frozen BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS beneficiaries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        bank_name VARCHAR(100),
        rib VARCHAR(25),
        iban VARCHAR(34),
        phone VARCHAR(20),
        is_verified BOOLEAN DEFAULT false,
        is_internal BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        from_account_id UUID REFERENCES accounts(id),
        to_account_id UUID REFERENCES accounts(id),
        amount DECIMAL(15,3) NOT NULL,
        fees DECIMAL(15,3) DEFAULT 0.000,
        currency VARCHAR(3) DEFAULT 'TND',
        type VARCHAR(40) NOT NULL,
        status VARCHAR(20) DEFAULT 'completed',
        description TEXT,
        reference VARCHAR(60) UNIQUE NOT NULL,
        category VARCHAR(50),
        merchant_name VARCHAR(200),
        risk_score INTEGER DEFAULT 0,
        is_flagged BOOLEAN DEFAULT false,
        flag_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
        card_number VARCHAR(19) UNIQUE NOT NULL,
        card_holder VARCHAR(200) NOT NULL,
        expiry_date DATE NOT NULL,
        cvv_hash VARCHAR(255) NOT NULL,
        card_type VARCHAR(20) DEFAULT 'virtual',
        network VARCHAR(20) DEFAULT 'visa',
        is_active BOOLEAN DEFAULT true,
        is_blocked BOOLEAN DEFAULT false,
        block_reason VARCHAR(200),
        daily_limit DECIMAL(10,3) DEFAULT 2000.000,
        monthly_limit DECIMAL(10,3) DEFAULT 10000.000,
        online_payments BOOLEAN DEFAULT true,
        contactless BOOLEAN DEFAULT true,
        international BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS loans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        account_id UUID REFERENCES accounts(id),
        loan_type VARCHAR(30) NOT NULL,
        amount_requested DECIMAL(15,3) NOT NULL,
        amount_approved DECIMAL(15,3),
        outstanding_balance DECIMAL(15,3) DEFAULT 0.000,
        interest_rate DECIMAL(5,3) NOT NULL,
        duration_months INTEGER NOT NULL,
        monthly_payment DECIMAL(15,3),
        status VARCHAR(20) DEFAULT 'pending',
        purpose TEXT,
        ai_score INTEGER,
        ai_recommendation VARCHAR(20),
        next_payment_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        biller_code VARCHAR(50) NOT NULL,
        biller_name VARCHAR(100) NOT NULL,
        biller_category VARCHAR(50) NOT NULL,
        reference_number VARCHAR(100) NOT NULL,
        amount DECIMAL(15,3),
        due_date DATE,
        status VARCHAR(20) DEFAULT 'pending',
        paid_at TIMESTAMP,
        transaction_id UUID,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS savings_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        account_id UUID REFERENCES accounts(id),
        name VARCHAR(200) NOT NULL,
        target_amount DECIMAL(15,3) NOT NULL,
        current_amount DECIMAL(15,3) DEFAULT 0.000,
        target_date DATE,
        auto_save BOOLEAN DEFAULT false,
        auto_save_amount DECIMAL(15,3) DEFAULT 0.000,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(30) DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        admin_id UUID,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id UUID,
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS fraud_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        transaction_id UUID REFERENCES transactions(id),
        alert_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) DEFAULT 'medium',
        description TEXT,
        ai_confidence DECIMAL(5,2),
        status VARCHAR(20) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── SEED ADMIN ──
    const adminPwd = await bcrypt.hash('Sayzen@Admin2024', 12);
    await client.query(`
      INSERT INTO users (first_name,last_name,email,password,phone,role,kyc_status,face_verified,doc_verified,credit_score)
      VALUES ('Admin','Sayzen','admin@sayzen.tn',$1,'+21671000000','admin','verified',true,true,850)
      ON CONFLICT (email) DO NOTHING;
    `, [adminPwd]);

    // ── SEED DEMO USER ──
    const demoPwd = await bcrypt.hash('Demo@123456', 12);
    const demoRes = await client.query(`
      INSERT INTO users (first_name,last_name,email,password,phone,cin,address,city,governorate,postal_code,date_of_birth,gender,kyc_status,face_verified,doc_verified,credit_score,risk_level)
      VALUES ('Mohamed Ali','Ben Salah','demo@sayzen.tn',$1,'+21698765432','12345678','15 Rue de la République','Tunis','Tunis','1000','1990-05-15','male','verified',true,true,720,'low')
      ON CONFLICT (email) DO NOTHING RETURNING id;
    `, [demoPwd]);

    if (demoRes.rows[0]) {
      const uid = demoRes.rows[0].id;
      const ts = Date.now();

      // Current account
      const rib1 = `10006000010${ts.toString().slice(-9)}47`;
      const iban1 = `TN59${rib1}`;
      const acc1 = await client.query(`
        INSERT INTO accounts (user_id,account_number,rib,iban,balance,available_balance,currency,account_type)
        VALUES ($1,$2,$3,$4,15750.500,15750.500,'TND','current') RETURNING id;
      `, [uid, `TN${ts.toString().slice(-10)}01`, rib1, iban1]);

      // Savings account
      const rib2 = `10006000020${(ts+1).toString().slice(-9)}23`;
      const iban2 = `TN59${rib2}`;
      const acc2 = await client.query(`
        INSERT INTO accounts (user_id,account_number,rib,iban,balance,available_balance,currency,account_type,interest_rate)
        VALUES ($1,$2,$3,$4,8200.000,8200.000,'TND','savings',3.500) RETURNING id;
      `, [uid, `TN${(ts+1).toString().slice(-10)}02`, rib2, iban2]);

      const a1 = acc1.rows[0].id;
      const a2 = acc2.rows[0].id;

      // Card
      const cvvH = await bcrypt.hash('123', 10);
      await client.query(`
        INSERT INTO cards (account_id,card_number,card_holder,expiry_date,cvv_hash,card_type,network,daily_limit,monthly_limit)
        VALUES ($1,'4539 1488 0343 6467','MOHAMED ALI BEN SALAH','2027-12-31',$2,'virtual','visa',2000.000,10000.000);
      `, [a1, cvvH]);

      // Transactions
      const txs = [
        [null, a1, 3200.000, 'deposit', 'Salaire Novembre 2024', 'Salaire'],
        [a1, null, 85.500, 'payment_bill', 'Facture STEG', 'Factures'],
        [a1, null, 42.300, 'payment_bill', 'Facture SONEDE', 'Factures'],
        [a1, a2, 500.000, 'transfer_internal', 'Virement épargne', 'Épargne'],
        [a1, null, 20.000, 'recharge_mobile', 'Recharge Ooredoo +21698765432', 'Télécom'],
        [a1, null, 15.990, 'payment_bill', 'Abonnement Netflix', 'Loisirs'],
        [a1, null, 200.000, 'withdrawal', 'Retrait DAB Tunis Centre', 'Retrait'],
        [null, a1, 3200.000, 'deposit', 'Salaire Octobre 2024', 'Salaire'],
        [a1, null, 120.000, 'payment_bill', 'Facture Topnet', 'Factures'],
        [a1, null, 55.000, 'recharge_mobile', 'Recharge Tunisie Telecom', 'Télécom'],
      ];

      for (let i = 0; i < txs.length; i++) {
        const [from, to, amt, type, desc, cat] = txs[i];
        const ref = `SAY${ts}${i}${Math.random().toString(36).slice(2,5).toUpperCase()}`;
        await client.query(`
          INSERT INTO transactions (from_account_id,to_account_id,amount,type,description,reference,category,status)
          VALUES ($1,$2,$3,$4,$5,$6,$7,'completed');
        `, [from, to, amt, type, desc, ref, cat]);
      }

      // Bills
      const billers = [
        ['STEG001','STEG','Énergie','REF-STEG-2024-001',85.500,'2024-12-31','pending'],
        ['SONEDE001','SONEDE','Eau','REF-SONEDE-2024-001',42.300,'2024-12-31','pending'],
        ['TOPNET001','Topnet','Internet','REF-TOP-2024-001',49.900,'2024-12-31','pending'],
        ['OOREDOO001','Ooredoo','Télécom','REF-OOR-2024-001',35.000,'2024-12-31','pending'],
      ];
      for (const [code, name, cat, ref, amt, due, status] of billers) {
        await client.query(`
          INSERT INTO bills (user_id,biller_code,biller_name,biller_category,reference_number,amount,due_date,status)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8);
        `, [uid, code, name, cat, ref, amt, due, status]);
      }

      // Savings goal
      await client.query(`
        INSERT INTO savings_goals (user_id,account_id,name,target_amount,current_amount,target_date,auto_save,auto_save_amount)
        VALUES ($1,$2,'Voyage à Paris',5000.000,1200.000,'2025-06-01',true,200.000);
      `, [uid, a2]);

      // Notification
      await client.query(`
        INSERT INTO notifications (user_id,title,message,type)
        VALUES ($1,'Bienvenue chez Sayzen Bank 🎉','Votre compte est actif. Explorez toutes nos fonctionnalités.','success');
      `, [uid]);
    }

    await client.query('COMMIT');
    console.log('Migration Sayzen Bank OK');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
};

migrate();
