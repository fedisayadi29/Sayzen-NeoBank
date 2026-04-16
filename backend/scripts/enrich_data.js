require('dotenv').config();
const { randomUUID } = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'sayzen.db'));
db.pragma('foreign_keys = ON');

// ── Helpers ──────────────────────────────────────────────────────────────────
const ref = (p) => `${p}${Date.now()}${Math.random().toString(36).slice(2,7).toUpperCase()}`;
const rnd = (min, max, dec=3) => parseFloat((Math.random()*(max-min)+min).toFixed(dec));
const pick = (arr) => arr[Math.floor(Math.random()*arr.length)];
const dateStr = (y,m,d,h=10,min=0) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')} ${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}:00`;

const insertTx = db.prepare(`
  INSERT OR IGNORE INTO transactions
  (id,from_account_id,to_account_id,amount,fees,type,description,reference,category,status,created_at)
  VALUES (?,?,?,?,?,?,?,?,?,'completed',?)
`);

const insertLoan = db.prepare(`
  INSERT OR IGNORE INTO loans
  (id,user_id,loan_type,amount_requested,amount_approved,outstanding_balance,interest_rate,duration_months,monthly_payment,status,purpose,ai_score,ai_recommendation,created_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`);

const insertGoal = db.prepare(`
  INSERT OR IGNORE INTO savings_goals
  (id,user_id,account_id,name,target_amount,current_amount,target_date,auto_save,auto_save_amount,status)
  VALUES (?,?,?,?,?,?,?,?,?,?)
`);

const insertAlert = db.prepare(`
  INSERT OR IGNORE INTO fraud_alerts
  (id,user_id,transaction_id,alert_type,severity,description,ai_confidence,status,created_at)
  VALUES (?,?,?,?,?,?,?,?,?)
`);

const insertNotif = db.prepare(`
  INSERT OR IGNORE INTO notifications (id,user_id,title,message,type,created_at)
  VALUES (?,?,?,?,?,?)
`);

const updateBalance = db.prepare(`
  UPDATE accounts SET balance=balance+?, available_balance=available_balance+? WHERE id=?
`);

// ── Load all users (excluding admin) ─────────────────────────────────────────
const users = db.prepare(`
  SELECT u.id, u.first_name, u.last_name, u.email, u.phone,
         a1.id as acc1, a1.rib as rib1, a1.iban as iban1,
         a2.id as acc2, a2.rib as rib2
  FROM users u
  JOIN accounts a1 ON a1.user_id=u.id AND a1.account_type='current'
  LEFT JOIN accounts a2 ON a2.user_id=u.id AND a2.account_type='savings'
  WHERE u.role='user'
`).all();

console.log(`Found ${users.length} users to enrich\n`);

// ── Per-user enrichment ───────────────────────────────────────────────────────
users.forEach((u, idx) => {
  const name = `${u.first_name} ${u.last_name}`;
  console.log(`Enriching: ${name}`);

  // ── 6 months of detailed transactions ──────────────────────────────────────
  const months = [
    { y:2024, m:7 }, { y:2024, m:8 }, { y:2024, m:9 },
    { y:2024, m:10 }, { y:2024, m:11 }, { y:2024, m:12 },
  ];

  const salaries = [3600,3800,3700,4000,3900,4200];

  months.forEach(({ y, m }, mi) => {
    const sal = salaries[mi] + idx * 200;

    // Salary
    insertTx.run(randomUUID(), null, u.acc1, sal, 0, 'deposit',
      `Salaire ${y}-${String(m).padStart(2,'0')}`, ref('SAL'), 'Salaire', dateStr(y,m,1,8,0));
    updateBalance.run(sal, sal, u.acc1);

    // STEG
    const steg = rnd(65,110);
    insertTx.run(randomUUID(), u.acc1, null, steg, 0, 'payment_bill',
      'Facture STEG', ref('STEG'), 'Factures', dateStr(y,m,3,9,0));
    updateBalance.run(-steg, -steg, u.acc1);

    // SONEDE
    const son = rnd(30,55);
    insertTx.run(randomUUID(), u.acc1, null, son, 0, 'payment_bill',
      'Facture SONEDE', ref('SON'), 'Factures', dateStr(y,m,4,9,30));
    updateBalance.run(-son, -son, u.acc1);

    // Internet
    const net = pick([39.9, 49.9, 59.9]);
    insertTx.run(randomUUID(), u.acc1, null, net, 0, 'payment_bill',
      pick(['Facture Topnet','Facture Hexabyte','Facture Orange Internet']),
      ref('NET'), 'Factures', dateStr(y,m,5,10,0));
    updateBalance.run(-net, -net, u.acc1);

    // Mobile recharge
    const rch = pick([10,15,20,25,30]);
    insertTx.run(randomUUID(), u.acc1, null, rch, 0, 'recharge_mobile',
      `Recharge ${pick(['Ooredoo','Tunisie Telecom','Orange'])} ${u.phone}`,
      ref('RCH'), 'Télécom', dateStr(y,m,8,11,0));
    updateBalance.run(-rch, -rch, u.acc1);

    // Supermarket
    const food = rnd(80,200);
    insertTx.run(randomUUID(), u.acc1, null, food, 0, 'payment_bill',
      pick(['Carrefour Market','Monoprix','Géant Casino','Aziza Supermarché']),
      ref('FOOD'), 'Alimentation', dateStr(y,m,10,12,0));
    updateBalance.run(-food, -food, u.acc1);

    // Restaurant
    const resto = rnd(25,80);
    insertTx.run(randomUUID(), u.acc1, null, resto, 0, 'payment_bill',
      pick(['Restaurant Le Carthage','Café Saf-Saf','Pizza Hut Tunis','Burger King Lac']),
      ref('REST'), 'Loisirs', dateStr(y,m,14,13,30));
    updateBalance.run(-resto, -resto, u.acc1);

    // Transport / Carburant
    const fuel = rnd(40,90);
    insertTx.run(randomUUID(), u.acc1, null, fuel, 0, 'payment_bill',
      pick(['Carburant Total','Station Shell','Carburant Agil']),
      ref('FUEL'), 'Transport', dateStr(y,m,16,8,0));
    updateBalance.run(-fuel, -fuel, u.acc1);

    // Streaming / Abonnements
    const sub = pick([15.99, 19.99, 12.99, 9.99]);
    insertTx.run(randomUUID(), u.acc1, null, sub, 0, 'payment_bill',
      pick(['Abonnement Netflix','Abonnement Spotify','Abonnement YouTube Premium','Abonnement OSN']),
      ref('SUB'), 'Loisirs', dateStr(y,m,20,10,0));
    updateBalance.run(-sub, -sub, u.acc1);

    // Savings transfer
    if (u.acc2) {
      const sav = rnd(200,600);
      insertTx.run(randomUUID(), u.acc1, u.acc2, sav, 0, 'transfer_internal',
        'Virement épargne mensuel', ref('SAV'), 'Épargne', dateStr(y,m,25,9,0));
      updateBalance.run(-sav, -sav, u.acc1);
      updateBalance.run(sav, sav, u.acc2);
    }

    // Health
    if (mi % 2 === 0) {
      const health = rnd(30,120);
      insertTx.run(randomUUID(), u.acc1, null, health, 0, 'payment_bill',
        pick(['Pharmacie Centrale','Clinique Taoufik','Laboratoire Pasteur']),
        ref('HLTH'), 'Santé', dateStr(y,m,18,11,0));
      updateBalance.run(-health, -health, u.acc1);
    }

    // Education (some users)
    if (idx % 3 === 0 && mi % 3 === 0) {
      const edu = rnd(50,200);
      insertTx.run(randomUUID(), u.acc1, null, edu, 0, 'payment_bill',
        pick(['Frais scolaires','Cours de langue','Formation en ligne Coursera']),
        ref('EDU'), 'Éducation', dateStr(y,m,22,10,0));
      updateBalance.run(-edu, -edu, u.acc1);
    }
  });

  // ── Cross-user transfers ────────────────────────────────────────────────────
  const otherUsers = users.filter(x => x.id !== u.id);
  const target1 = otherUsers[idx % otherUsers.length];
  const target2 = otherUsers[(idx + 2) % otherUsers.length];

  // Transfer to target1
  const amt1 = rnd(150, 800);
  const fees1 = parseFloat((amt1 * 0.001).toFixed(3));
  insertTx.run(randomUUID(), u.acc1, target1.acc1, amt1, fees1, 'transfer_internal',
    `Virement à ${target1.first_name} ${target1.last_name}`,
    ref('TRF'), 'Virements', dateStr(2024,11,15,14,0));
  updateBalance.run(-(amt1+fees1), -(amt1+fees1), u.acc1);
  updateBalance.run(amt1, amt1, target1.acc1);

  // Transfer to target2
  const amt2 = rnd(100, 500);
  insertTx.run(randomUUID(), u.acc1, target2.acc1, amt2, 0, 'transfer_internal',
    `Remboursement ${target2.first_name}`,
    ref('RMB'), 'Virements', dateStr(2024,12,5,10,30));
  updateBalance.run(-amt2, -amt2, u.acc1);
  updateBalance.run(amt2, amt2, target2.acc1);

  // Receive from someone
  const sender = otherUsers[(idx + 1) % otherUsers.length];
  const rcv = rnd(200, 1000);
  insertTx.run(randomUUID(), sender.acc1, u.acc1, rcv, 0, 'transfer_internal',
    `Virement de ${sender.first_name} ${sender.last_name}`,
    ref('RCV'), 'Virements', dateStr(2024,12,10,16,0));
  updateBalance.run(-rcv, -rcv, sender.acc1);
  updateBalance.run(rcv, rcv, u.acc1);

  // ── Interbank transfer (some users) ────────────────────────────────────────
  if (idx % 2 === 0) {
    const ibAmt = rnd(500, 2000);
    const ibFees = parseFloat((ibAmt * 0.005).toFixed(3));
    insertTx.run(randomUUID(), u.acc1, null, ibAmt, ibFees, 'transfer_interbank',
      `Virement interbancaire ${pick(['BNA','STB','BIAT','Attijari Bank'])}`,
      ref('IB'), 'Virements', dateStr(2024,11,20,11,0));
    updateBalance.run(-(ibAmt+ibFees), -(ibAmt+ibFees), u.acc1);
  }

  // ── QR / NFC payments ──────────────────────────────────────────────────────
  [1,2,3].forEach(i => {
    const qr = rnd(5, 50);
    insertTx.run(randomUUID(), u.acc1, null, qr, 0, 'payment_qr',
      pick(['Paiement QR Monoprix','Paiement QR Café','Paiement QR Parking']),
      ref('QR'), 'Paiements', dateStr(2024,12,i*5,12,0));
    updateBalance.run(-qr, -qr, u.acc1);
  });

  // ── Loans (varied per user) ─────────────────────────────────────────────────
  const loanProfiles = [
    { type:'personal', amt:12000, dur:36, rate:8.5, purpose:'Rénovation appartement', status:'active' },
    { type:'auto',     amt:28000, dur:60, rate:7.2, purpose:'Achat véhicule Peugeot 208', status:'active' },
    { type:'mortgage', amt:150000,dur:240,rate:5.5, purpose:'Achat appartement Lac 2', status:'active' },
    { type:'student',  amt:8000,  dur:48, rate:4.5, purpose:'Frais universitaires Master', status:'active' },
    { type:'business', amt:45000, dur:84, rate:9.0, purpose:'Création entreprise', status:'under_review' },
    { type:'personal', amt:5000,  dur:24, rate:8.5, purpose:'Voyage et loisirs', status:'rejected' },
    { type:'auto',     amt:35000, dur:72, rate:7.2, purpose:'Achat SUV Toyota', status:'approved' },
  ];
  const lp = loanProfiles[idx % loanProfiles.length];
  const r = lp.rate/100/12;
  const monthly = (lp.amt * r) / (1 - Math.pow(1+r, -lp.dur));
  const aiScore = 600 + Math.floor(Math.random()*200);
  insertLoan.run(
    randomUUID(), u.id, lp.type, lp.amt, lp.amt, lp.amt*0.8,
    lp.rate, lp.dur, monthly.toFixed(3),
    lp.status, lp.purpose, aiScore, 'approved',
    dateStr(2024, 9+idx%3, 10+idx, 9, 0)
  );

  // Loan disbursement transaction for active loans
  if (lp.status === 'active') {
    insertTx.run(randomUUID(), null, u.acc1, lp.amt, 0, 'loan_disbursement',
      `Déblocage crédit ${lp.type}`, ref('LOAN'), 'Crédit', dateStr(2024,9+idx%3,12,10,0));
    updateBalance.run(lp.amt, lp.amt, u.acc1);

    // Monthly repayments
    [10,11,12].forEach(m => {
      insertTx.run(randomUUID(), u.acc1, null, parseFloat(monthly.toFixed(3)), 0, 'loan_repayment',
        `Remboursement crédit ${lp.type}`, ref('REP'), 'Crédit', dateStr(2024,m,5,8,0));
      updateBalance.run(-monthly, -monthly, u.acc1);
    });
  }

  // ── Savings goals ───────────────────────────────────────────────────────────
  const goalProfiles = [
    { name:'Voyage à Paris 🗼', target:5000, current:1800, date:'2025-06-01' },
    { name:'Voiture neuve 🚗', target:25000, current:8500, date:'2026-01-01' },
    { name:'Mariage 💍', target:15000, current:4200, date:'2025-09-01' },
    { name:'Fonds urgence 🛡', target:10000, current:6000, date:'2025-12-31' },
    { name:'Études enfants 🎓', target:20000, current:3000, date:'2027-09-01' },
    { name:'Rénovation maison 🏠', target:30000, current:12000, date:'2026-06-01' },
    { name:'Retraite anticipée 🌴', target:50000, current:15000, date:'2030-01-01' },
  ];
  if (u.acc2) {
    const gp = goalProfiles[idx % goalProfiles.length];
    insertGoal.run(randomUUID(), u.id, u.acc2, gp.name, gp.target, gp.current, gp.date, 1, rnd(100,400,0), 'active');
  }

  // ── Fraud alerts (for some users) ──────────────────────────────────────────
  if (idx % 3 === 0) {
    const txId = randomUUID();
    const suspAmt = rnd(800, 3000);
    insertTx.run(txId, u.acc1, null, suspAmt, 0, 'payment_bill',
      'Transaction suspecte détectée', ref('SUSP'), 'Paiements', dateStr(2024,12,28,3,0));
    insertAlert.run(
      randomUUID(), u.id, txId,
      pick(['Paiement inhabituel','Transaction nocturne','Montant anormal','Localisation suspecte']),
      pick(['medium','high']),
      `Transaction de ${suspAmt.toFixed(3)} TND détectée à 3h du matin`,
      rnd(75,98,1), 'open', dateStr(2024,12,28,3,5)
    );
  }

  // ── Notifications ───────────────────────────────────────────────────────────
  const notifs = [
    { title:'Virement reçu 💰', msg:`Vous avez reçu ${rnd(100,500).toFixed(3)} TND`, type:'success' },
    { title:'Facture payée ✓', msg:'Votre facture STEG a été payée avec succès', type:'success' },
    { title:'Alerte solde ⚠', msg:'Votre solde est inférieur à 500 TND', type:'warning' },
    { title:'Crédit approuvé 🎉', msg:`Votre demande de crédit ${lp.type} a été approuvée`, type:'success' },
    { title:'Nouveau relevé disponible 📄', msg:'Votre relevé de compte Décembre 2024 est disponible', type:'info' },
  ];
  notifs.forEach((n, ni) => {
    insertNotif.run(randomUUID(), u.id, n.title, n.msg, n.type, dateStr(2024,12,20+ni,10,ni*10));
  });

  console.log(`  ✅ ${name} — transactions, virements, crédit, objectif épargne ajoutés`);
});

// ── Global stats ──────────────────────────────────────────────────────────────
const txCount = db.prepare("SELECT COUNT(*) as c FROM transactions").get();
const userCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='user'").get();
const loanCount = db.prepare("SELECT COUNT(*) as c FROM loans").get();
const alertCount = db.prepare("SELECT COUNT(*) as c FROM fraud_alerts").get();

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ ENRICHISSEMENT TERMINÉ');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`👥 Utilisateurs : ${userCount.c}`);
console.log(`💳 Transactions : ${txCount.c}`);
console.log(`🏦 Crédits      : ${loanCount.c}`);
console.log(`🚨 Alertes      : ${alertCount.c}`);
console.log('═══════════════════════════════════════════════════════════════');
console.log('\n📋 COMPTES DE CONNEXION (mot de passe: Sayzen@2024)');
console.log('───────────────────────────────────────────────────────────────');

const allUsers = db.prepare("SELECT first_name,last_name,email FROM users WHERE role='user' ORDER BY created_at").all();
allUsers.forEach(u => {
  console.log(`  ${(u.first_name+' '+u.last_name).padEnd(25)} → ${u.email}`);
});
console.log('───────────────────────────────────────────────────────────────');
console.log('  demo@sayzen.tn (Mohamed Ali Ben Salah) → Demo@123456');
console.log('  admin@sayzen.tn                        → Sayzen@Admin2024');
console.log('═══════════════════════════════════════════════════════════════\n');

db.close();
