const db = require('../db');

function get(key, callback){
  db.get('SELECT value FROM settings WHERE key=?',[key], (err, row)=>{
    if(err) return callback(err);
    callback(null, row ? row.value : null);
  });
}

function set(key, value, callback){
  db.run('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',[key, value], function(err){
    callback(err, this && this.changes);
  });
}

function all(callback){
  db.all('SELECT key,value FROM settings', [], (err, rows)=>{
    if(err) return callback(err);
    const out = {};
    (rows||[]).forEach(r=> out[r.key] = r.value);
    callback(null, out);
  });
}

module.exports = { get, set, all };