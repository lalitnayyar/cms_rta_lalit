const db = require('../db');

// Priority ordering: High > Medium > Low. Use CASE to map text to numeric weight for ordering.
const priorityCase = `CASE priority WHEN 'High' THEN 3 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 1 ELSE 0 END`;

function allActive(callback) {
  const now = new Date().toISOString().slice(0,19).replace('T',' ');
  const sql = `SELECT * FROM notices WHERE (publish_at IS NULL OR publish_at <= ?) AND (expires_at IS NULL OR expires_at > ?) ORDER BY ${priorityCase} DESC, COALESCE(publish_at, created_at) DESC, created_at DESC`;
  db.all(sql, [now, now], callback);
}

function all(callback) {
  const sql = `SELECT * FROM notices ORDER BY ${priorityCase} DESC, COALESCE(publish_at, created_at) DESC, created_at DESC`;
  db.all(sql, [], callback);
}

function create(n, callback) {
  const stmt = db.prepare(`INSERT INTO notices (image,heading,description,publish_at,expires_at,priority) VALUES (?,?,?,?,?,?)`);
  stmt.run(n.image||null, n.heading||null, n.description||null, n.publish_at||null, n.expires_at||null, n.priority||'Medium', function(err){
    callback(err, this && this.lastID);
  });
}

function update(id, n, callback) {
  db.run(`UPDATE notices SET image=?,heading=?,description=?,publish_at=?,expires_at=?,priority=? WHERE id=?`, [n.image||null,n.heading||null,n.description||null,n.publish_at||null,n.expires_at||null,n.priority||'Medium',id], function(err){
    callback(err, this && this.changes);
  });
}

function remove(id, callback) {
  db.run(`DELETE FROM notices WHERE id=?`, [id], function(err){
    callback(err, this && this.changes);
  });
}

module.exports = { allActive, all, create, update, remove };