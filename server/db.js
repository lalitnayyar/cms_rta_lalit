const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'data.db');

const db = new sqlite3.Database(dbPath);

// Initialize schema
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    image TEXT,
    heading TEXT,
    description TEXT,
    enabled INTEGER DEFAULT 1,
    theme_tag TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT UNIQUE,
    password_hash TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id INTEGER,
    ip TEXT,
    visited_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Notices table: supports publish_at and expires_at (nullable)
  db.run(`CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image TEXT,
    heading TEXT,
    description TEXT,
    publish_at DATETIME,
    expires_at DATETIME,
    priority TEXT DEFAULT 'Medium',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // If notices table exists but lacks priority column (older DB), add it.
  db.all("PRAGMA table_info(notices)", (err, cols) => {
    if (!err && Array.isArray(cols)) {
      const hasPriority = cols.some(c => c && c.name === 'priority');
      if (!hasPriority) {
        db.run("ALTER TABLE notices ADD COLUMN priority TEXT DEFAULT 'Medium'", (e) => {
          if (e) console.warn('Could not add priority column to notices:', e.message);
        });
      }
    }
  });
});

module.exports = db;
