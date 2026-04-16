# 🏦 Sayzen Bank — NEOBank Digitale Tunisienne

> Plateforme bancaire digitale complète développée avec React, Node.js et SQLite. Conçue pour le marché tunisien avec conformité BCT, codes tunisiens (+216, TND, RIB/IBAN TN59...).

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![React](https://img.shields.io/badge/react-18.2.0-61dafb)

---

## ✨ Fonctionnalités

### Côté Client
- **Authentification** — Inscription/Connexion sécurisée avec JWT, verrouillage après 5 tentatives
- **KYC intelligent** — Upload documents (CIN, passeport, selfie), score IA simulé
- **Comptes bancaires** — Courant + Épargne avec RIB/IBAN tunisiens (TN59...)
- **Virements** — Interne (instantané), interbancaire, SWIFT international
- **Cartes bancaires** — Visa/Mastercard virtuelles & physiques, gestion plafonds, NFC
- **Factures & Services** — STEG, SONEDE, Topnet, Ooredoo, Netflix, Spotify...
- **Recharge mobile** — Ooredoo, Tunisie Telecom, Orange Tunisie
- **Crédits** — Personnel, auto, immobilier, étudiant, professionnel avec simulateur IA
- **Épargne** — Objectifs personnalisés, épargne automatique
- **Analytique** — Graphiques dépenses/revenus, catégorisation automatique
- **SayzenBot** — Assistant IA intégré (chatbot)
- **Demandes de modification** — Changements de coordonnées validés par l'admin

### Côté Admin
- **Dashboard** — KPIs temps réel, graphiques volume/transactions
- **Gestion clients** — CRM complet, KYC, suspension, verrouillage, dépôts
- **Profil utilisateur détaillé** — Comptes, cartes, crédits, analytique, logs d'accès
- **Transactions** — Monitoring, signalement fraude
- **Crédits** — Validation/refus avec score IA
- **Alertes fraude** — Détection, investigation, résolution
- **Audit logs** — Traçabilité complète
- **Demandes de modification** — Approbation/rejet des changements de profil

---

## 🛠️ Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18, React Router 6, Recharts, Lucide React |
| Backend | Node.js, Express.js |
| Base de données | SQLite (better-sqlite3) — sans configuration requise |
| Auth | JWT + bcryptjs |
| Styles | CSS-in-JS (inline styles) |

---

## 🚀 Installation & Démarrage

### Prérequis
- Node.js >= 18.0.0
- npm >= 9.0.0

### 1. Cloner le projet
```bash
git clone https://github.com/votre-username/sayzen-bank.git
cd sayzen-bank/neobank
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env    # Configurer les variables d'environnement
npm run migrate         # Créer la base de données + seed admin
npm run seed            # Ajouter les utilisateurs de démonstration
npm run seed:enrich     # Enrichir avec des transactions réalistes
npm run seed:cards      # Ajouter les cartes bancaires
npm run seed:bills      # Configurer les factures
npm run dev             # Démarrer en mode développement
```

### 3. Frontend
```bash
cd frontend
npm install
npm start               # Démarrer sur http://localhost:3000
```

---

## 🔑 Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | `admin@sayzen.tn` | `Sayzen@Admin2024` |
| Client | `demo@sayzen.tn` | `Demo@123456` |
| Client VIP | `sayadifedi@gmail.com` | `Sayzen@2024` |
| Client | `amenallah@sayzen.tn` | `Sayzen@2024` |
| Client | `firyal@sayzen.tn` | `Sayzen@2024` |
| Client | `arij@sayzen.tn` | `Sayzen@2024` |
| Client | `yasmin@sayzen.tn` | `Sayzen@2024` |
| Client | `medfahd@sayzen.tn` | `Sayzen@2024` |
| Client | `medali@sayzen.tn` | `Sayzen@2024` |
| Client | `ahmed@sayzen.tn` | `Sayzen@2024` |

---

## 📁 Structure du projet

```
neobank/
├── backend/
│   ├── scripts/              # Scripts de seed et utilitaires
│   │   ├── seed_users.js
│   │   ├── enrich_data.js
│   │   ├── add_cards_analytics.js
│   │   ├── fix_bills_goals.js
│   │   └── fedi_vip.js
│   ├── src/
│   │   ├── controllers/      # Logique métier
│   │   │   ├── authController.js
│   │   │   ├── accountController.js
│   │   │   └── adminController.js
│   │   ├── db/               # Base de données
│   │   │   ├── sqlite.js     # Connexion + schéma + seed initial
│   │   │   ├── pool.js       # Export du pool
│   │   │   └── migrate.js    # Migrations
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT middleware
│   │   ├── routes/           # Routes API
│   │   │   ├── auth.js
│   │   │   ├── account.js
│   │   │   ├── admin.js
│   │   │   └── chatbot.js
│   │   └── index.js          # Point d'entrée Express
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── public/
    └── src/
        ├── api/
        │   └── axios.js      # Client HTTP configuré
        ├── components/
        │   ├── Layout.jsx    # Layout principal avec sidebar
        │   └── Chatbot.jsx   # SayzenBot assistant IA
        ├── context/
        │   └── AuthContext.jsx
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── user/         # Pages client
        │   │   ├── Dashboard.jsx
        │   │   ├── Transactions.jsx
        │   │   ├── Transfer.jsx
        │   │   ├── Cards.jsx
        │   │   ├── Bills.jsx
        │   │   ├── Loans.jsx
        │   │   ├── Savings.jsx
        │   │   ├── Analytics.jsx
        │   │   ├── KYC.jsx
        │   │   └── Profile.jsx
        │   └── admin/        # Pages administrateur
        │       ├── AdminDashboard.jsx
        │       ├── AdminUsers.jsx
        │       ├── UserDetail.jsx
        │       ├── AdminTransactions.jsx
        │       ├── AdminLoans.jsx
        │       ├── FraudAlerts.jsx
        │       └── AuditLogs.jsx
        ├── App.jsx
        └── index.js
```

---

## 🌐 API Endpoints

### Auth
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/login` | Connexion |
| GET | `/api/auth/me` | Profil connecté |
| PUT | `/api/auth/change-password` | Changer mot de passe |
| POST | `/api/auth/otp/send` | Envoyer OTP |
| POST | `/api/auth/otp/verify` | Vérifier OTP |

### Utilisateur (authentifié)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/user/accounts` | Mes comptes |
| GET | `/api/user/transactions` | Historique transactions |
| POST | `/api/user/transfer` | Effectuer un virement |
| GET | `/api/user/cards` | Mes cartes |
| PATCH | `/api/user/cards/:id` | Modifier carte |
| GET | `/api/user/bills` | Mes factures |
| POST | `/api/user/bills/pay` | Payer une facture |
| POST | `/api/user/recharge` | Recharge mobile |
| GET | `/api/user/loans` | Mes crédits |
| POST | `/api/user/loans/apply` | Demander un crédit |
| GET | `/api/user/analytics` | Analytique financière |
| GET | `/api/user/savings-goals` | Objectifs épargne |
| POST | `/api/user/kyc/upload` | Upload document KYC |

### Admin (admin uniquement)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/admin/stats` | Statistiques globales |
| GET | `/api/admin/users` | Liste clients |
| GET | `/api/admin/users/:id` | Détail client |
| GET | `/api/admin/users/:id/analytics` | Analytique client |
| PATCH | `/api/admin/users/:id/kyc` | Mettre à jour KYC |
| PATCH | `/api/admin/users/:id/toggle` | Activer/Suspendre |
| POST | `/api/admin/deposit` | Dépôt administrateur |
| GET | `/api/admin/change-requests` | Demandes de modification |
| PATCH | `/api/admin/change-requests/:id` | Approuver/Rejeter |
| GET | `/api/admin/fraud-alerts` | Alertes fraude |
| GET | `/api/admin/audit-logs` | Logs d'audit |

---

## 🔒 Sécurité

- Authentification JWT avec expiration configurable
- Hachage des mots de passe avec bcrypt (salt rounds: 12)
- Verrouillage automatique après 5 tentatives échouées
- Validation du format téléphone tunisien (+216 + 8 chiffres)
- Validation des modifications sensibles par l'administrateur
- Middleware de protection des routes par rôle

---

## 🇹🇳 Spécificités Tunisiennes

- Format téléphone : `+216XXXXXXXX` (8 chiffres obligatoires)
- Devise : **TND** (Dinar Tunisien) avec 3 décimales
- Format IBAN : `TN59` + 20 chiffres
- Code banque : `10006` (Sayzen Bank fictive)
- Gouvernorats : 24 gouvernorats tunisiens
- Opérateurs mobiles : Ooredoo, Tunisie Telecom, Orange Tunisie
- Organismes : STEG, SONEDE, Topnet, Hexabyte, GlobalNet

---

## 📄 Licence

MIT © 2024 Sayzen Bank — Projet éducatif / démonstration

---

> **Note** : Ce projet est une démonstration éducative. Ne pas utiliser en production sans audit de sécurité complet.
