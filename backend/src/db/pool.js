const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'sayzen.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Wrapper to provide async pool-like interface for SQLite
 * Converts prepare().all/run patterns to async query() style
 */
class PoolWrapper {
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      try {
        // Replace ? placeholders with actual values for SQLite
        const stmt = db.prepare(sql);
        
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          // SELECT queries
          const rows = stmt.all(...params);
          resolve({ rows, rowCount: rows.length });
        } else {
          // INSERT/UPDATE/DELETE queries
          const result = stmt.run(...params);
          resolve({ rows: [], changes: result.changes, lastID: result.lastInsertRowid });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  connect() {
    return Promise.resolve(new TransactionClient(db));
  }
}

class TransactionClient {
  constructor(dbInstance) {
    this.db = dbInstance;
    this.inTransaction = false;
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      try {
        const stmt = this.db.prepare(sql);
        
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          const rows = stmt.all(...params);
          resolve({ rows, rowCount: rows.length });
        } else {
          const result = stmt.run(...params);
          resolve({ rows: [], changes: result.changes, lastID: result.lastInsertRowid });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  async execute(sql) {
    return new Promise((resolve, reject) => {
      try {
        this.db.exec(sql);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      try {
        const stmt = this.db.prepare(sql);
        
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          const rows = stmt.all(...params);
          resolve({ rows, rowCount: rows.length });
        } else {
          const result = stmt.run(...params);
          resolve({ rows: [], changes: result.changes });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  release() {
    // No-op for SQLite
  }
}

module.exports = new PoolWrapper();
module.exports.rawDb = db;
