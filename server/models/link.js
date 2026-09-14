const db = require('../db');

function all(callback) {
  db.all('SELECT * FROM links WHERE enabled=1', callback);
}

function create(link, callback) {
  const stmt = db.prepare(`INSERT INTO links (url,image,heading,description,enabled,theme_tag) VALUES (?,?,?,?,?,?)`);
  stmt.run(link.url, link.image || null, link.heading || null, link.description || null, link.enabled ? 1 : 0, link.theme_tag || null, function(err) {
    callback(err, this && this.lastID);
  });
}

module.exports = { all, create };
