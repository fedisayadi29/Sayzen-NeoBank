require('dotenv').config();
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'sayzen.db'));
db.pragma('foreign_keys = ON');

const cvvHash = bcrypt.hashSync('456', 10);
const cvvHash2 = bcrypt.hashSync('789', 10);

const genCard = (prefix) => {
  const digits = Array.from({length:15}, () => Math.floor(Math.random()*10)).join('');
  return (prefix + digits).match(/.{1,4}/g).join(' ');
};

const dateStr = (y,m,d,h=10,mn=0) =>
  `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')} ${String(h).padStart(2,'0')}:${String(mn).padStart(2,'0')}:00`;

const ref = (p) => `${p}${Date.now()}${Math.random().toString(36).slice(2,7).toUpperCase()}`;

// ── Statements ────────────────────────────────────────────────────────────────
const insertCard = db.prepare(`
  INSERT OR IGNORE INTO cards
  (id,account_id,card_number,card_holder,expiry_date,cvv_hash,card_type,network,
   is_active,is_blocked,daily_limit,monthly_limit,online_payments,contactless,international)
  VALUES (?,?,?,?,?,?,?,?,1,0,?,?,1,1,?)
`);

const insertTx = db.prepare(`
  INSERT OR IGNORE INTO transactions
  (id,from_account_id,to_account_id,amount,fees,type,description,reference,category,status,created_at)
  VALUES (?,?,?,?,?,?,?,?,?,'completed',?)
`);

const updateBalance = db.prepare(`
  UPDATE accounts SET balance=balance+?, available_balance=available_balance+? WHERE id=?
`);

// ── Load all users ────────────────────────────────────────────────────────────
const users = db.prepare(`
  SELECT u.id, u.first_name, u.last_name, u.email,
         a.id as acc_id, a.account_type, a.balance
  FROM users u
  JOIN accounts a ON a.user_id=u.id
  WHERE u.role='user'
  ORDER BY u.created_at, a.account_type
`).all();

// Group by user
const userMap = {};
users.forEach(row => {
  if (!userMap[row.id]) userMap[row.id] = { ...row, accounts: [] };
  userMap[row.id].accounts.push({ id: row.acc_id, type: row.account_type, balance: row.balance });
});

const allUsers = Object.values(userMap);
console.log(`\n🃏 Ajout de cartes bancaires pour ${allUsers.length} utilisateurs...\n`);

// ── Card profiles per user ────────────────────────────────────────────────────
const cardProfiles = [
  // Visa Virtual + Mastercard Physical
  [
    { type:'virtual',  network:'visa',       daily:2000,   monthly:10000,  intl:0 },
    { type:'physical', network:'mastercard', daily:5000,   monthly:25000,  intl:1 },
  ],
  // Visa Physical + Visa Virtual
  [
    { type:'physical', network:'visa',       daily:3000,   monthly:15000,  intl:1 },
    { type:'virtual',  network:'visa',       daily:1000,   monthly:5000,   intl:0 },
  ],
  // Mastercard Physical + Mastercard Virtual
  [
    { type:'physical', network:'mastercard', daily:4000,   monthly:20000,  intl:1 },
    { type:'virtual',  network:'mastercard', daily:1500,   monthly:8000,   intl:0 },
  ],
  // Visa Virtual only (student/low balance)
  [
    { type:'virtual',  network:'visa',       daily:500,    monthly:2000,   intl:0 },
  ],
  // Premium: Visa Infinite + Mastercard World
  [
    { type:'physical', network:'visa',       daily:20000,  monthly:100000, intl:1 },
    { type:'physical', network:'mastercard', daily:15000,  monthly:80000,  intl:1 },
    { type:'virtual',  network:'visa',       daily:5000,   monthly:30000,  intl:1 },
  ],
];

allUsers.forEach((u, idx) => {
  const fullName = `${u.first_name.toUpperCase()} ${u.last_name.toUpperCase()}`;
  const currentAcc = u.accounts.find(a => a.type === 'current');
  if (!currentAcc) return;

  // Check existing cards
  const existingCards = db.prepare(`SELECT COUNT(*) as c FROM cards WHERE account_id=?`).get(currentAcc.id);

  // Pick card profile based on user index
  const isFedi = u.email === 'sayadifedi@gmail.com';
  const profile = isFedi ? cardProfiles[4] : cardProfiles[idx % (cardProfiles.length - 1)];

  let added = 0;
  profile.forEach((cp, ci) => {
    // Skip if already has enough cards
    if (existingCards.c > ci) return;

    const prefix = cp.network === 'visa' ? '4' : '5';
    const cardNum = genCard(prefix);
    const expYear = 2026 + Math.floor(ci / 2);
    const expiry = `${expYear}-12-31`;
    const hash = ci === 0 ? cvvHash : cvvHash2;

    insertCard.run(
      randomUUID(), currentAcc.id, cardNum, fullName, expiry, hash,
      cp.type, cp.network, cp.daily, cp.monthly, cp.intl
    );
    added++;
  });

  console.log(`✅ ${fullName.padEnd(30)} → ${added} carte(s) ajoutée(s) (total: ${existingCards.c + added})`);
});

// ── Enrich analytics data ─────────────────────────────────────────────────────
console.log('\n📊 Enrichissement des données analytiques...\n');

const analyticsUsers = db.prepare(`
  SELECT u.id, u.first_name, u.last_name,
         a.id as acc_id, a.balance
  FROM users u
  JOIN accounts a ON a.user_id=u.id AND a.account_type='current'
  WHERE u.role='user'
`).all();

// Categories with realistic amounts per category
const categoryData = [
  { cat:'Alimentation',  min:80,   max:250,  freq:4 },
  { cat:'Transport',     min:30,   max:120,  freq:3 },
  { cat:'Santé',         min:20,   max:150,  freq:2 },
  { cat:'Loisirs',       min:15,   max:100,  freq:3 },
  { cat:'Éducation',     min:50,   max:300,  freq:1 },
  { cat:'Vêtements',     min:40,   max:200,  freq:2 },
  { cat:'Électronique',  min:100,  max:800,  freq:1 },
  { cat:'Restaurants',   min:20,   max:80,   freq:4 },
  { cat:'Voyages',       min:200,  max:1500, freq:1 },
  { cat:'Abonnements',   min:10,   max:50,   freq:2 },
];

const months2024 = [
  {y:2024,m:1},{y:2024,m:2},{y:2024,m:3},
  {y:2024,m:4},{y:2024,m:5},{y:2024,m:6},
  {y:2024,m:7},{y:2024,m:8},{y:2024,m:9},
  {y:2024,m:10},{y:2024,m:11},{y:2024,m:12},
];

analyticsUsers.forEach((u, uidx) => {
  const isFedi = u.email === 'sayadifedi@gmail.com';
  const multiplier = isFedi ? 1000 : 1;

  months2024.forEach(({ y, m }, mi) => {
    // Salary for first half of year (not already added)
    const existingSalary = db.prepare(`
      SELECT COUNT(*) as c FROM transactions
      WHERE to_account_id=? AND category='Salaire'
      AND created_at LIKE '${y}-${String(m).padStart(2,'0')}%'
    `).get(u.acc_id);

    if (existingSalary.c === 0) {
      const sal = isFedi ? 500000 : (3500 + uidx * 150 + mi * 50);
      insertTx.run(randomUUID(), null, u.acc_id, sal, 0, 'deposit',
        `Salaire ${y}-${String(m).padStart(2,'0')}`, ref('SAL'), 'Salaire',
        dateStr(y, m, 1, 8, 0));
      updateBalance.run(sal, sal, u.acc_id);
    }

    // Category spending
    categoryData.forEach((cat, ci) => {
      // Only add if not too many transactions already
      const existing = db.prepare(`
        SELECT COUNT(*) as c FROM transactions
        WHERE from_account_id=? AND category=?
        AND created_at LIKE '${y}-${String(m).padStart(2,'0')}%'
      `).get(u.acc_id, cat.cat);

      if (existing.c < cat.freq) {
        const toAdd = cat.freq - existing.c;
        for (let f = 0; f < toAdd; f++) {
          const amt = parseFloat(((cat.min + Math.random()*(cat.max-cat.min)) * multiplier).toFixed(3));
          const day = 2 + ci * 2 + f;
          const merchants = {
            'Alimentation': ['Carrefour Market','Monoprix Tunis','Géant Casino','Aziza','MG'],
            'Transport': ['Station Shell','Carburant Total','Taxi Bolt','TRANSTU','Parking Lac'],
            'Santé': ['Pharmacie Centrale','Clinique Taoufik','Laboratoire Pasteur','Dentiste Dr. Slim'],
            'Loisirs': ['Cinéma CityStars','Bowling Lac','Escape Game Tunis','Karting Ariana'],
            'Éducation': ['Librairie Clairefontaine','Cours de langue','Formation Udemy','ISET Tunis'],
            'Vêtements': ['Zara Tunis','H&M City Center','Mango Lac','Bershka'],
            'Électronique': ['Tunisianet','MyTek','Electroplanet','Jumia Tunisie'],
            'Restaurants': ['McDonald\'s Lac','KFC Ariana','Pizza Hut','Burger King','Café Saf-Saf'],
            'Voyages': ['Tunisair','Carthage Travel','Marhaba Tours','Booking.com'],
            'Abonnements': ['Netflix','Spotify','YouTube Premium','OSN+','Canva Pro'],
          };
          const merchant = (merchants[cat.cat] || [cat.cat])[Math.floor(Math.random()*(merchants[cat.cat]||[cat.cat]).length)];
          insertTx.run(randomUUID(), u.acc_id, null, amt, 0, 'payment_bill',
            merchant, ref(cat.cat.slice(0,3).toUpperCase()), cat.cat,
            dateStr(y, m, Math.min(day, 28), 10 + f*2, f*15));
          updateBalance.run(-amt, -amt, u.acc_id);
        }
      }
    });
  });

  console.log(`📊 ${u.first_name} ${u.last_name} — données analytiques enrichies`);
});

// ── Final stats ───────────────────────────────────────────────────────────────
const cardCount = db.prepare("SELECT COUNT(*) as c FROM cards").get();
const txCount   = db.prepare("SELECT COUNT(*) as c FROM transactions").get();
const catCount  = db.prepare("SELECT COUNT(DISTINCT category) as c FROM transactions WHERE category IS NOT NULL").get();

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ CARTES & ANALYTIQUE — TERMINÉ');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`🃏 Total cartes      : ${cardCount.c}`);
console.log(`💳 Total transactions: ${txCount.c}`);
console.log(`📂 Catégories        : ${catCount.c}`);
console.log('═══════════════════════════════════════════════════════════════');
console.log('\n📋 Résumé cartes par utilisateur:');
const cardSummary = db.prepare(`
  SELECT u.first_name||' '||u.last_name as name, COUNT(c.id) as nb,
         GROUP_CONCAT(c.network||' '||c.card_type, ' | ') as cards
  FROM users u
  JOIN accounts a ON a.user_id=u.id AND a.account_type='current'
  LEFT JOIN cards c ON c.account_id=a.id
  WHERE u.role='user'
  GROUP BY u.id
`).all();
cardSummary.forEach(r => {
  console.log(`  ${r.name.padEnd(28)} → ${r.nb} carte(s): ${r.cards || 'aucune'}`);
});
console.log('═══════════════════════════════════════════════════════════════\n');

db.close();
