require('dotenv').config();
const { randomUUID } = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'sayzen.db'));
db.pragma('foreign_keys = ON');

const ref = (p) => `${p}${Date.now()}${Math.random().toString(36).slice(2,8).toUpperCase()}`;
const dateStr = (y,m,d,h=10,mn=0) =>
  `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')} ${String(h).padStart(2,'0')}:${String(mn).padStart(2,'0')}:00`;

// ── Find Fedi Sayadi ──────────────────────────────────────────────────────────
const fedi = db.prepare(`
  SELECT u.id, u.first_name, u.last_name,
         a.id as acc_id, a.rib, a.iban, a.balance
  FROM users u
  JOIN accounts a ON a.user_id=u.id AND a.account_type='current'
  WHERE u.email='sayadifedi@gmail.com'
`).get();

if (!fedi) {
  console.error('❌ Fedi Sayadi introuvable. Vérifiez l\'email.');
  process.exit(1);
}

console.log(`✅ Trouvé: ${fedi.first_name} ${fedi.last_name}`);
console.log(`   Compte: ${fedi.acc_id}`);
console.log(`   Solde actuel: ${fedi.balance.toLocaleString()} TND\n`);

const MONTANT_VIP = 1634988000.000; // 1 634 988 000 DT

// ── 1. Créditer le compte ─────────────────────────────────────────────────────
db.prepare(`UPDATE accounts SET balance=?, available_balance=? WHERE id=?`)
  .run(MONTANT_VIP, MONTANT_VIP, fedi.acc_id);

console.log(`💰 Solde mis à jour: ${MONTANT_VIP.toLocaleString()} TND`);

// ── 2. Transaction de dépôt initial ──────────────────────────────────────────
const insertTx = db.prepare(`
  INSERT OR IGNORE INTO transactions
  (id,from_account_id,to_account_id,amount,fees,type,description,reference,category,status,created_at)
  VALUES (?,?,?,?,?,?,?,?,?,'completed',?)
`);

insertTx.run(randomUUID(), null, fedi.acc_id, 1634988000.000, 0, 'deposit',
  'Virement international SWIFT — Fonds patrimoniaux Sayadi Holding',
  ref('SWIFT'), 'Patrimoine', dateStr(2024,1,15,9,0));

insertTx.run(randomUUID(), null, fedi.acc_id, 500000000.000, 0, 'deposit',
  'Dividendes annuels — Sayadi Group International',
  ref('DIV'), 'Revenus', dateStr(2024,3,1,10,0));

insertTx.run(randomUUID(), null, fedi.acc_id, 250000000.000, 0, 'deposit',
  'Cession parts société — Sayadi Real Estate TN',
  ref('CESS'), 'Patrimoine', dateStr(2024,5,20,11,0));

// ── 3. Virements sortants (grands montants) ───────────────────────────────────
const otherAccounts = db.prepare(`
  SELECT a.id, a.rib, u.first_name, u.last_name
  FROM accounts a JOIN users u ON a.user_id=u.id
  WHERE u.role='user' AND u.email != 'sayadifedi@gmail.com' AND a.account_type='current'
  LIMIT 5
`).all();

const virements = [
  { desc:'Investissement immobilier — Résidence Les Jardins de Carthage', amt:85000000.000, cat:'Investissement' },
  { desc:'Acquisition terrain zone industrielle Sfax', amt:42000000.000, cat:'Investissement' },
  { desc:'Financement projet hôtelier Hammamet', amt:120000000.000, cat:'Investissement' },
  { desc:'Transfert SWIFT — Compte Dubaï ADCB Bank', amt:200000000.000, cat:'International' },
  { desc:'Transfert SWIFT — Compte Paris BNP Paribas', amt:150000000.000, cat:'International' },
  { desc:'Achat obligations État tunisien', amt:50000000.000, cat:'Placement' },
  { desc:'Placement fonds monétaire STB', amt:75000000.000, cat:'Placement' },
  { desc:'Donation fondation caritative Sayadi', amt:5000000.000, cat:'Dons' },
  { desc:'Achat villa Sidi Bou Saïd', amt:3500000.000, cat:'Immobilier' },
  { desc:'Achat yacht — Port de La Goulette', amt:8000000.000, cat:'Luxe' },
];

virements.forEach((v, i) => {
  const toAcc = otherAccounts[i % otherAccounts.length];
  insertTx.run(randomUUID(), fedi.acc_id, toAcc ? toAcc.id : null,
    v.amt, parseFloat((v.amt * 0.001).toFixed(3)),
    toAcc ? 'transfer_interbank' : 'transfer_swift',
    v.desc, ref('VIR'), v.cat, dateStr(2024, 2+i, 10+i%15, 10, i*5));
});

// ── 4. Virements reçus depuis autres comptes ──────────────────────────────────
otherAccounts.forEach((acc, i) => {
  const rcvAmt = 100000 + i * 50000;
  insertTx.run(randomUUID(), acc.id, fedi.acc_id, rcvAmt, 0, 'transfer_internal',
    `Virement de ${acc.first_name} ${acc.last_name} — Participation projet`,
    ref('RCV'), 'Virements', dateStr(2024, 6+i, 5+i, 14, 0));
});

// ── 5. Paiements luxe & services ─────────────────────────────────────────────
const paiements = [
  { desc:'Abonnement jet privé — Tunisair Executive', amt:180000.000, cat:'Luxe' },
  { desc:'Assurance vie premium — STAR Assurances', amt:95000.000, cat:'Assurances' },
  { desc:'Honoraires cabinet juridique Maître Belhaj', amt:45000.000, cat:'Services' },
  { desc:'Audit financier annuel — Deloitte Tunisie', amt:120000.000, cat:'Services' },
  { desc:'Rénovation villa Gammarth', amt:850000.000, cat:'Immobilier' },
  { desc:'Achat œuvres d\'art — Galerie Carthage', amt:320000.000, cat:'Luxe' },
  { desc:'Frais scolarité enfants — Lycée Français Tunis', amt:28000.000, cat:'Éducation' },
  { desc:'Voyage affaires — Paris, Dubaï, Londres', amt:75000.000, cat:'Voyages' },
  { desc:'Facture STEG — Complexe industriel', amt:42500.000, cat:'Factures' },
  { desc:'Facture SONEDE — Propriétés multiples', amt:18000.000, cat:'Factures' },
  { desc:'Abonnement Bloomberg Terminal', amt:8500.000, cat:'Services' },
  { desc:'Cotisation Club Africain VIP', amt:15000.000, cat:'Loisirs' },
];

paiements.forEach((p, i) => {
  insertTx.run(randomUUID(), fedi.acc_id, null, p.amt, 0, 'payment_bill',
    p.desc, ref('PAY'), p.cat, dateStr(2024, 4+Math.floor(i/2), 1+i*2, 9+i%8, i*3));
});

// ── 6. Recharges mobiles (multiples lignes) ───────────────────────────────────
['+21698000001','+21698000002','+21698000003'].forEach((phone, i) => {
  insertTx.run(randomUUID(), fedi.acc_id, null, 50, 0, 'recharge_mobile',
    `Recharge Ooredoo ${phone}`, ref('RCH'), 'Télécom', dateStr(2024,12,10+i,11,0));
});

// ── 7. Crédit VIP ─────────────────────────────────────────────────────────────
const existingLoan = db.prepare(`SELECT id FROM loans WHERE user_id=? LIMIT 1`).get(fedi.id);
if (!existingLoan) {
  db.prepare(`
    INSERT INTO loans (id,user_id,loan_type,amount_requested,amount_approved,outstanding_balance,
      interest_rate,duration_months,monthly_payment,status,purpose,ai_score,ai_recommendation)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(randomUUID(), fedi.id, 'business', 500000000, 500000000, 450000000,
    3.5, 120, 4950000, 'active',
    'Financement expansion Sayadi Group — Projet Tunis Financial City', 850, 'approved');
}

// ── 8. Objectif épargne ───────────────────────────────────────────────────────
const savAcc = db.prepare(`SELECT id FROM accounts WHERE user_id=? AND account_type='savings'`).get(fedi.id);
if (savAcc) {
  db.prepare(`UPDATE accounts SET balance=250000000, available_balance=250000000 WHERE id=?`).run(savAcc.id);
  const existingGoal = db.prepare(`SELECT id FROM savings_goals WHERE user_id=? LIMIT 1`).get(fedi.id);
  if (!existingGoal) {
    db.prepare(`
      INSERT INTO savings_goals (id,user_id,account_id,name,target_amount,current_amount,target_date,auto_save,auto_save_amount,status)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(randomUUID(), fedi.id, savAcc.id,
      'Fonds souverain familial 🏛', 2000000000, 250000000, '2030-01-01', 1, 5000000, 'active');
  }
}

// ── 9. Notifications ──────────────────────────────────────────────────────────
const notifs = [
  { title:'Virement SWIFT reçu 💰', msg:'1 634 988 000 TND crédités sur votre compte', type:'success' },
  { title:'Crédit VIP approuvé ✅', msg:'Votre crédit business de 500 000 000 TND a été approuvé', type:'success' },
  { title:'Alerte grande transaction 🔔', msg:'Transaction de 200 000 000 TND vers ADCB Dubai effectuée', type:'info' },
  { title:'Relevé mensuel disponible 📄', msg:'Votre relevé Décembre 2024 est disponible', type:'info' },
];
const insertNotif = db.prepare(`INSERT OR IGNORE INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)`);
notifs.forEach(n => insertNotif.run(randomUUID(), fedi.id, n.title, n.msg, n.type));

// ── Résumé ────────────────────────────────────────────────────────────────────
const txCount = db.prepare(`
  SELECT COUNT(*) as c FROM transactions
  WHERE from_account_id=? OR to_account_id=?
`).get(fedi.acc_id, fedi.acc_id);

const newBalance = db.prepare(`SELECT balance FROM accounts WHERE id=?`).get(fedi.acc_id);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ COMPTE FEDI SAYADI — MIS À JOUR');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`💰 Solde compte courant : ${newBalance.balance.toLocaleString('fr-TN')} TND`);
console.log(`💎 Solde compte épargne : 250 000 000 TND`);
console.log(`📋 Total transactions   : ${txCount.c}`);
console.log(`🏦 Crédit business      : 500 000 000 TND @ 3.5%`);
console.log(`🎯 Objectif épargne     : 2 000 000 000 TND`);
console.log('═══════════════════════════════════════════════════════════════');
console.log(`\n🔑 Connexion: sayadifedi@gmail.com / Sayzen@2024`);

db.close();
