require('dotenv').config();
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'sayzen.db'));
db.pragma('foreign_keys = ON');

const users = [
  { first: 'Amen Allah', last: 'Ben Lella',      email: 'amenallah@sayzen.tn',  phone: '+21620111001', cin: '11100001', city: 'Tunis',    gov: 'Tunis',    dob: '1992-03-14', gender: 'male',   balance1: 28500.750, balance2: 12000.000 },
  { first: 'Firyal',     last: 'Ghiss',           email: 'firyal@sayzen.tn',     phone: '+21620111002', cin: '11100002', city: 'Sfax',     gov: 'Sfax',     dob: '1988-07-22', gender: 'female', balance1: 45200.500, balance2: 18500.000 },
  { first: 'Arij',       last: 'Nassr',           email: 'arij@sayzen.tn',       phone: '+21620111003', cin: '11100003', city: 'Sousse',   gov: 'Sousse',   dob: '1995-11-05', gender: 'female', balance1: 19800.250, balance2: 7500.000  },
  { first: 'Yasmin',     last: 'Ben Abdallah',    email: 'yasmin@sayzen.tn',     phone: '+21620111004', cin: '11100004', city: 'Monastir', gov: 'Monastir', dob: '1990-01-30', gender: 'female', balance1: 62100.000, balance2: 25000.000 },
  { first: 'Med Fahd',   last: 'Chebbi',          email: 'medfahd@sayzen.tn',    phone: '+21620111005', cin: '11100005', city: 'Nabeul',   gov: 'Nabeul',   dob: '1985-09-18', gender: 'male',   balance1: 38750.500, balance2: 15000.000 },
  { first: 'Med Ali',    last: 'Souki',           email: 'medali@sayzen.tn',     phone: '+21620111006', cin: '11100006', city: 'Bizerte',  gov: 'Bizerte',  dob: '1993-06-12', gender: 'male',   balance1: 22300.000, balance2: 9800.000  },
  { first: 'Ahmed',      last: 'Skhiri',          email: 'ahmed@sayzen.tn',      phone: '+21620111007', cin: '11100007', city: 'Ariana',   gov: 'Ariana',   dob: '1987-04-25', gender: 'male',   balance1: 51600.750, balance2: 20000.000 },
];

const pwd = bcrypt.hashSync('Sayzen@2024', 12);
const cvvH = bcrypt.hashSync('456', 10);
const ts = Date.now();

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (id,first_name,last_name,email,password,phone,cin,address,city,governorate,date_of_birth,gender,kyc_status,face_verified,doc_verified,credit_score,risk_level,is_active)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'verified',1,1,?,?,1)
`);

const insertAcc = db.prepare(`
  INSERT OR IGNORE INTO accounts (id,user_id,account_number,rib,iban,balance,available_balance,currency,account_type,interest_rate)
  VALUES (?,?,?,?,?,?,?,?,?,?)
`);

const insertCard = db.prepare(`
  INSERT OR IGNORE INTO cards (id,account_id,card_number,card_holder,expiry_date,cvv_hash,card_type,network,daily_limit,monthly_limit)
  VALUES (?,?,?,?,?,?,?,?,?,?)
`);

const insertTx = db.prepare(`
  INSERT OR IGNORE INTO transactions (id,from_account_id,to_account_id,amount,type,description,reference,category,status,created_at)
  VALUES (?,?,?,?,?,?,?,?,'completed',?)
`);

const insertBill = db.prepare(`
  INSERT OR IGNORE INTO bills (id,user_id,biller_code,biller_name,biller_category,reference_number,amount,due_date,status)
  VALUES (?,?,?,?,?,?,?,?,?)
`);

const insertNotif = db.prepare(`
  INSERT OR IGNORE INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)
`);

const insertLoan = db.prepare(`
  INSERT OR IGNORE INTO loans (id,user_id,loan_type,amount_requested,amount_approved,interest_rate,duration_months,monthly_payment,status,purpose,ai_score,ai_recommendation)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
`);

// Get demo account for internal transfers
const demoAcc = db.prepare("SELECT id,rib FROM accounts WHERE account_type='current' LIMIT 1").get();

const allAccIds = [];

users.forEach((u, idx) => {
  const uid = randomUUID();
  const score = 650 + Math.floor(Math.random() * 150);
  insertUser.run(uid, u.first, u.last, u.email, pwd, u.phone, u.cin,
    `${10 + idx} Rue Habib Bourguiba`, u.city, u.gov, u.dob, u.gender, score, 'low');

  // Current account
  const rib1 = `10006000${(30 + idx).toString().padStart(3,'0')}${(ts + idx).toString().slice(-9)}47`;
  const acc1Id = randomUUID();
  const accNum1 = `TN${(ts + idx).toString().slice(-10)}${(10+idx).toString().padStart(2,'0')}`;
  insertAcc.run(acc1Id, uid, accNum1, rib1, `TN59${rib1}`, u.balance1, u.balance1, 'TND', 'current', 0);

  // Savings account
  const rib2 = `10006000${(40 + idx).toString().padStart(3,'0')}${(ts + idx + 1).toString().slice(-9)}23`;
  const acc2Id = randomUUID();
  const accNum2 = `TN${(ts + idx + 1).toString().slice(-10)}${(20+idx).toString().padStart(2,'0')}`;
  insertAcc.run(acc2Id, uid, accNum2, rib2, `TN59${rib2}`, u.balance2, u.balance2, 'TND', 'savings', 3.5);

  allAccIds.push({ uid, acc1Id, acc2Id, rib1, name: `${u.first} ${u.last}` });

  // Visa card
  const cardNum = '4' + Array.from({length:15}, () => Math.floor(Math.random()*10)).join('');
  const formatted = cardNum.match(/.{1,4}/g).join(' ');
  insertCard.run(randomUUID(), acc1Id, formatted, `${u.first.toUpperCase()} ${u.last.toUpperCase()}`,
    '2027-12-31', cvvH, 'virtual', 'visa', 3000.0, 15000.0);

  // ── Transactions history (6 months) ──────────────────────────────────────
  const months = ['2024-07','2024-08','2024-09','2024-10','2024-11','2024-12'];
  const salaries = [3800, 4200, 3900, 4100, 4300, 4000];

  months.forEach((m, mi) => {
    const day = (d) => `${m}-${d.toString().padStart(2,'0')} ${String(8+mi).padStart(2,'0')}:00:00`;

    // Salary deposit
    insertTx.run(randomUUID(), null, acc1Id, salaries[mi], 'deposit',
      `Salaire ${m}`, `SAL${uid.slice(0,8)}${mi}`, 'Salaire', day(1));

    // STEG bill
    insertTx.run(randomUUID(), acc1Id, null, 75 + Math.random()*30, 'payment_bill',
      'Facture STEG', `STEG${uid.slice(0,6)}${mi}`, 'Factures', day(5));

    // SONEDE bill
    insertTx.run(randomUUID(), acc1Id, null, 35 + Math.random()*15, 'payment_bill',
      'Facture SONEDE', `SON${uid.slice(0,6)}${mi}`, 'Factures', day(6));

    // Internet
    insertTx.run(randomUUID(), acc1Id, null, 49.9, 'payment_bill',
      'Facture Topnet', `TOP${uid.slice(0,6)}${mi}`, 'Factures', day(7));

    // Mobile recharge
    insertTx.run(randomUUID(), acc1Id, null, 20 + Math.floor(Math.random()*30), 'recharge_mobile',
      `Recharge Ooredoo ${u.phone}`, `RCH${uid.slice(0,6)}${mi}`, 'Télécom', day(10));

    // Savings transfer
    insertTx.run(randomUUID(), acc1Id, acc2Id, 300 + Math.floor(Math.random()*200), 'transfer_internal',
      'Virement épargne mensuel', `SAV${uid.slice(0,6)}${mi}`, 'Épargne', day(15));

    // Supermarket
    insertTx.run(randomUUID(), acc1Id, null, 120 + Math.random()*80, 'payment_bill',
      'Carrefour Market', `CAR${uid.slice(0,6)}${mi}`, 'Alimentation', day(18));

    // Restaurant
    insertTx.run(randomUUID(), acc1Id, null, 45 + Math.random()*35, 'payment_bill',
      'Restaurant Le Carthage', `REST${uid.slice(0,6)}${mi}`, 'Loisirs', day(20));

    // Transport
    insertTx.run(randomUUID(), acc1Id, null, 30 + Math.random()*20, 'payment_bill',
      'Carburant Total', `FUEL${uid.slice(0,6)}${mi}`, 'Transport', day(22));

    // Netflix
    insertTx.run(randomUUID(), acc1Id, null, 15.99, 'payment_bill',
      'Abonnement Netflix', `NET${uid.slice(0,6)}${mi}`, 'Loisirs', day(25));
  });

  // Internal transfer to demo account
  if (demoAcc) {
    insertTx.run(randomUUID(), acc1Id, demoAcc.id, 500 + Math.floor(Math.random()*500),
      'transfer_internal', `Virement de ${u.first} ${u.last}`,
      `INT${uid.slice(0,8)}`, 'Virements', `2024-12-10 10:00:00`);
  }

  // Bills pending
  [
    ['STEG001','STEG','Énergie',`REF-STEG-${uid.slice(0,6)}`,88.5,'2025-01-31'],
    ['SONEDE001','SONEDE','Eau',`REF-SON-${uid.slice(0,6)}`,44.0,'2025-01-31'],
    ['TOPNET001','Topnet','Internet',`REF-TOP-${uid.slice(0,6)}`,49.9,'2025-01-31'],
  ].forEach(b => insertBill.run(randomUUID(), uid, ...b, 'pending'));

  // Loan for some users
  if (idx % 2 === 0) {
    const loanTypes = ['personal','auto','mortgage'];
    const ltype = loanTypes[idx % 3];
    const rates = { personal:8.5, auto:7.2, mortgage:5.5 };
    const amounts = { personal:15000, auto:35000, mortgage:180000 };
    const durations = { personal:36, auto:60, mortgage:240 };
    const r = rates[ltype]/100/12;
    const n = durations[ltype];
    const p = amounts[ltype];
    const monthly = (p * r) / (1 - Math.pow(1+r, -n));
    const aiScore = 650 + Math.floor(Math.random()*150);
    insertLoan.run(randomUUID(), uid, ltype, p, p, rates[ltype], n,
      monthly.toFixed(3), 'active', `Financement ${ltype}`, aiScore, 'approved');
  }

  // Notification
  insertNotif.run(randomUUID(), uid, 'Bienvenue chez Sayzen Bank 🎉',
    'Votre compte est actif avec toutes les fonctionnalités débloquées.', 'success');

  console.log(`✅ ${u.first} ${u.last} — ${u.email} — Mot de passe: Sayzen@2024`);
  console.log(`   Compte courant: TN59${rib1} | Solde: ${u.balance1} TND`);
  console.log(`   Compte épargne: TN59${rib2} | Solde: ${u.balance2} TND`);
});

// Cross-transfers between users
console.log('\n🔄 Création des virements croisés...');
for (let i = 0; i < allAccIds.length - 1; i++) {
  const from = allAccIds[i];
  const to   = allAccIds[i + 1];
  const amt  = 200 + Math.floor(Math.random() * 800);
  insertTx.run(randomUUID(), from.acc1Id, to.acc1Id, amt, 'transfer_internal',
    `Virement ${from.name} → ${to.name}`,
    `CROSS${i}${Date.now()}`, 'Virements', `2024-12-${(15+i).toString().padStart(2,'0')} 14:00:00`);
}

console.log('\n✅ Tous les comptes créés avec succès!\n');
console.log('═══════════════════════════════════════════════════════');
console.log('COMPTES CRÉÉS — MOT DE PASSE COMMUN: Sayzen@2024');
console.log('═══════════════════════════════════════════════════════');
users.forEach(u => {
  console.log(`👤 ${u.first} ${u.last.padEnd(15)} → ${u.email}`);
});
console.log('═══════════════════════════════════════════════════════');

db.close();
