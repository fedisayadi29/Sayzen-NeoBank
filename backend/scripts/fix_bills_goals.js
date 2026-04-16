require('dotenv').config();
const { randomUUID } = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'sayzen.db'));
db.pragma('foreign_keys = ON');

// ── Delete all existing bills and savings goals ───────────────────────────────
db.prepare('DELETE FROM bills').run();
db.prepare('DELETE FROM savings_goals').run();
console.log('🗑  Anciennes factures et objectifs supprimés\n');

// ── Bills per user — unique billers, Tunisia-specific ─────────────────────────
const BILLERS_POOL = [
  // Énergie & Eau
  { code:'STEG',    name:'STEG',              cat:'Énergie',    min:55,  max:140 },
  { code:'SONEDE',  name:'SONEDE',            cat:'Eau',        min:25,  max:65  },
  // Télécom
  { code:'OOREDOO', name:'Ooredoo Tunisie',   cat:'Télécom',    min:29,  max:79  },
  { code:'TUNTEL',  name:'Tunisie Telecom',   cat:'Télécom',    min:25,  max:69  },
  { code:'ORANGE',  name:'Orange Tunisie',    cat:'Télécom',    min:29,  max:75  },
  // Internet
  { code:'TOPNET',  name:'Topnet',            cat:'Internet',   min:39,  max:69  },
  { code:'HEXABYTE',name:'Hexabyte',          cat:'Internet',   min:35,  max:65  },
  { code:'GLOBALNET',name:'GlobalNet',        cat:'Internet',   min:39,  max:59  },
  // Streaming & Abonnements
  { code:'NETFLIX', name:'Netflix',           cat:'Streaming',  min:15,  max:20  },
  { code:'SPOTIFY', name:'Spotify Premium',   cat:'Streaming',  min:8,   max:12  },
  { code:'YOUTUBE', name:'YouTube Premium',   cat:'Streaming',  min:8,   max:10  },
  { code:'OSN',     name:'OSN+',              cat:'Streaming',  min:25,  max:35  },
  { code:'SHAHID',  name:'Shahid VIP',        cat:'Streaming',  min:15,  max:20  },
  { code:'CANVA',   name:'Canva Pro',         cat:'Abonnements',min:12,  max:15  },
  // Assurances
  { code:'STAR',    name:'STAR Assurances',   cat:'Assurances', min:45,  max:120 },
  { code:'GAT',     name:'GAT Assurances',    cat:'Assurances', min:40,  max:100 },
  { code:'COMAR',   name:'COMAR Assurances',  cat:'Assurances', min:50,  max:130 },
  // Éducation
  { code:'UNIV',    name:'Frais universitaires',cat:'Éducation',min:150, max:400 },
  { code:'COURS',   name:'Cours de langue AMIDEAST',cat:'Éducation',min:200,max:500},
  // Santé
  { code:'CNAM',    name:'CNAM Cotisation',   cat:'Santé',      min:30,  max:80  },
  { code:'CLINIQUE',name:'Clinique El Manar', cat:'Santé',      min:80,  max:300 },
  // Transport
  { code:'TRANSTU', name:'TRANSTU Abonnement',cat:'Transport',  min:15,  max:30  },
  { code:'PARKING', name:'Parking Lac Berges',cat:'Transport',  min:20,  max:50  },
];

// Assign unique billers per user (no repeats)
const users = db.prepare(`SELECT id, email FROM users WHERE role='user' ORDER BY created_at`).all();

const insertBill = db.prepare(`
  INSERT INTO bills (id,user_id,biller_code,biller_name,biller_category,reference_number,amount,due_date,status)
  VALUES (?,?,?,?,?,?,?,?,?)
`);

const rnd = (min, max) => parseFloat((Math.random()*(max-min)+min).toFixed(3));
const dueDate = (offset) => {
  const d = new Date('2025-01-31');
  d.setDate(d.getDate() + offset * 15);
  return d.toISOString().split('T')[0];
};

users.forEach((u, uidx) => {
  // Each user gets 5-8 unique billers
  const shuffled = [...BILLERS_POOL].sort(() => Math.random() - 0.5);
  const count = 5 + (uidx % 4);
  const selected = shuffled.slice(0, count);

  // Always include STEG + SONEDE for everyone
  const hasST = selected.find(b => b.code === 'STEG');
  const hasSO = selected.find(b => b.code === 'SONEDE');
  if (!hasST) selected[0] = BILLERS_POOL.find(b => b.code === 'STEG');
  if (!hasSO) selected[1] = BILLERS_POOL.find(b => b.code === 'SONEDE');

  // Fedi gets premium billers
  const isFedi = u.email === 'sayadifedi@gmail.com';
  const finalBillers = isFedi
    ? [
        BILLERS_POOL.find(b=>b.code==='STEG'),
        BILLERS_POOL.find(b=>b.code==='SONEDE'),
        BILLERS_POOL.find(b=>b.code==='NETFLIX'),
        BILLERS_POOL.find(b=>b.code==='SPOTIFY'),
        BILLERS_POOL.find(b=>b.code==='OSN'),
        BILLERS_POOL.find(b=>b.code==='STAR'),
        BILLERS_POOL.find(b=>b.code==='COMAR'),
        BILLERS_POOL.find(b=>b.code==='OOREDOO'),
      ]
    : selected;

  finalBillers.forEach((b, bi) => {
    const amt = rnd(b.min, b.max);
    const status = bi < 2 ? 'pending' : (Math.random() > 0.4 ? 'pending' : 'paid');
    insertBill.run(
      randomUUID(), u.id,
      b.code, b.name, b.cat,
      `REF-${b.code}-${u.id.slice(0,6).toUpperCase()}-${bi+1}`,
      amt, dueDate(bi), status
    );
  });

  console.log(`✅ ${u.email.padEnd(35)} → ${finalBillers.length} factures uniques`);
});

// ── Savings Goals — diversified, Tunisia-specific ─────────────────────────────
const GOALS_POOL = [
  { name:'Voyage à Paris 🗼',          target:5000,   current:1800, date:'2025-06-01', auto:200 },
  { name:'Voiture Peugeot 208 🚗',     target:28000,  current:8500, date:'2026-01-01', auto:500 },
  { name:'Mariage 💍',                  target:15000,  current:4200, date:'2025-09-01', auto:400 },
  { name:'Fonds d\'urgence 🛡',         target:10000,  current:6000, date:'2025-12-31', auto:300 },
  { name:'Études Master à l\'étranger 🎓',target:20000,current:3000,date:'2026-09-01', auto:350 },
  { name:'Rénovation appartement 🏠',   target:30000,  current:12000,date:'2026-06-01', auto:600 },
  { name:'Hajj & Omra 🕌',             target:8000,   current:2500, date:'2025-12-01', auto:250 },
  { name:'Achat terrain Nabeul 🌊',     target:50000,  current:15000,date:'2027-01-01', auto:800 },
  { name:'Retraite anticipée 🌴',       target:100000, current:25000,date:'2030-01-01', auto:1000},
  { name:'Voyage Dubaï ✈',             target:4000,   current:1200, date:'2025-08-01', auto:150 },
  { name:'Laptop MacBook Pro 💻',       target:3500,   current:900,  date:'2025-04-01', auto:200 },
  { name:'Startup capital 💼',          target:40000,  current:8000, date:'2026-12-01', auto:700 },
  { name:'Voiture électrique Tesla 🔋', target:80000,  current:20000,date:'2027-06-01', auto:1200},
  { name:'Villa Hammamet 🏖',           target:200000, current:45000,date:'2028-01-01', auto:2000},
  { name:'Fonds scolarité enfants 📚',  target:25000,  current:5000, date:'2027-09-01', auto:400 },
];

const insertGoal = db.prepare(`
  INSERT INTO savings_goals (id,user_id,account_id,name,target_amount,current_amount,target_date,auto_save,auto_save_amount,status)
  VALUES (?,?,?,?,?,?,?,?,?,?)
`);

users.forEach((u, uidx) => {
  const savAcc = db.prepare(`SELECT id FROM accounts WHERE user_id=? AND account_type='savings'`).get(u.id);
  if (!savAcc) return;

  const isFedi = u.email === 'sayadifedi@gmail.com';

  if (isFedi) {
    // Fedi gets 3 premium goals
    [
      { name:'Fonds souverain familial 🏛', target:2000000000, current:250000000, date:'2030-01-01', auto:5000000 },
      { name:'Achat immeuble Lac 2 🏢',     target:5000000,    current:1200000,   date:'2026-01-01', auto:100000  },
      { name:'Investissement bourse TN 📈', target:1000000,    current:350000,    date:'2025-12-01', auto:50000   },
    ].forEach(g => {
      insertGoal.run(randomUUID(), u.id, savAcc.id, g.name, g.target, g.current, g.date, 1, g.auto, 'active');
    });
  } else {
    // Each user gets 2-3 unique goals
    const shuffled = [...GOALS_POOL].sort(() => Math.random() - 0.5);
    const count = 2 + (uidx % 2);
    shuffled.slice(0, count).forEach(g => {
      const variation = 0.8 + Math.random() * 0.4;
      insertGoal.run(
        randomUUID(), u.id, savAcc.id,
        g.name,
        parseFloat((g.target * variation).toFixed(3)),
        parseFloat((g.current * variation).toFixed(3)),
        g.date, 1,
        parseFloat((g.auto * variation).toFixed(3)),
        'active'
      );
    });
  }

  const goalCount = db.prepare(`SELECT COUNT(*) as c FROM savings_goals WHERE user_id=?`).get(u.id);
  console.log(`💎 ${u.email.padEnd(35)} → ${goalCount.c} objectif(s) d'épargne`);
});

// ── Summary ───────────────────────────────────────────────────────────────────
const billCount = db.prepare("SELECT COUNT(*) as c FROM bills").get();
const goalCount = db.prepare("SELECT COUNT(*) as c FROM savings_goals").get();
const pendingBills = db.prepare("SELECT COUNT(*) as c FROM bills WHERE status='pending'").get();

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ FACTURES & OBJECTIFS — TERMINÉ');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`📄 Total factures    : ${billCount.c} (${pendingBills.c} en attente)`);
console.log(`💎 Total objectifs   : ${goalCount.c}`);
console.log('═══════════════════════════════════════════════════════════════\n');

db.close();
