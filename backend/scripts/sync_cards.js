/**
 * Sync card_holder names with actual user names in the database.
 * Run once: node scripts/sync_cards.js
 */
const pool = require('../src/db/sqlite');

async function syncCardHolders() {
  const rows = await pool.query(`
    SELECT u.id, u.first_name, u.last_name, c.id AS card_id, c.card_holder
    FROM users u
    JOIN accounts a ON a.user_id = u.id
    JOIN cards c ON c.account_id = a.id
    WHERE u.role = 'user'
  `);

  let fixed = 0;
  for (const row of rows.rows) {
    const correct = `${row.first_name.toUpperCase()} ${row.last_name.toUpperCase()}`;
    if (row.card_holder !== correct) {
      await pool.query('UPDATE cards SET card_holder = ? WHERE id = ?', [correct, row.card_id]);
      console.log(`  Fixed: "${row.card_holder}" → "${correct}"`);
      fixed++;
    }
  }

  if (fixed === 0) console.log('  All card holders already correct.');
  else console.log(`\n✅ ${fixed} card(s) updated.`);
}

syncCardHolders().catch(console.error);
