const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const pool = require('../db/pool');

router.use(authenticate);

router.post('/message', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ message: 'Message requis' });
  try {
    const msg = message.toLowerCase();
    let response = '';

    if (msg.includes('solde') || msg.includes('balance')) {
      const accs = await pool.query('SELECT balance, currency, account_type FROM accounts WHERE user_id=? AND is_active=1', [req.user.id]);
      const total = accs.rows.reduce((s, a) => s + parseFloat(a.balance), 0);
      response = `Votre solde total est de **${total.toFixed(3)} TND** réparti sur ${accs.rows.length} compte(s).`;
    } else if (msg.includes('transaction') || msg.includes('historique')) {
      const accs = await pool.query('SELECT id FROM accounts WHERE user_id=?', [req.user.id]);
      if (!accs.rows.length) { response = "Vous n'avez pas encore de transactions."; }
      else {
        const ids = accs.rows.map(a => `'${a.id}'`).join(',');
        const txs = await pool.query(
          `SELECT description, amount, type FROM transactions WHERE from_account_id IN (${ids}) OR to_account_id IN (${ids}) ORDER BY created_at DESC LIMIT 3`
        );
        if (!txs.rows.length) { response = "Vous n'avez pas encore de transactions."; }
        else {
          const list = txs.rows.map(t => `• ${t.description || t.type}: ${parseFloat(t.amount).toFixed(3)} TND`).join('\n');
          response = `Vos 3 dernières transactions :\n\n${list}`;
        }
      }
    } else if (msg.includes('crédit') || msg.includes('prêt')) {
      const loans = await pool.query('SELECT loan_type, amount_requested, status FROM loans WHERE user_id=?', [req.user.id]);
      response = !loans.rows.length
        ? "Vous n'avez pas de crédit en cours. Rendez-vous dans **Crédits** pour faire une demande."
        : `Vous avez ${loans.rows.length} crédit(s) : ${loans.rows.map(l => `${l.loan_type} (${l.status})`).join(', ')}.`;
    } else {
      response = "Je suis **Zara**, votre assistante Sayzen Bank. Demandez-moi votre solde, vos transactions, vos crédits ou comment utiliser l'application !";
    }

    res.json({ response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ response: "Désolée, je rencontre une difficulté technique. Réessayez dans un instant." });
  }
});

module.exports = router;
