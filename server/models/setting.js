const db = require('../db');

function get(key, callback){
  db.get('SELECT value FROM settings WHERE key=?',[key], (err, row)=>{
    if(err){
      console.error('SETTINGS GET ERROR', err && err.message);
      return callback(err);
    }
    callback(null, row ? row.value : null);
  });
}

function set(key, value, callback){
  // Use INSERT OR REPLACE for broader SQLite compatibility
  db.run('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)',[key, value], function(err){
    if(err) console.error('SETTINGS SET ERROR', key, err && err.message);
    callback(err, this && this.changes);
  });
}

function all(callback){
  db.all('SELECT key,value FROM settings', [], (err, rows)=>{
    if(err){
      console.error('SETTINGS ALL ERROR', err && err.message);
      return callback(err);
    }
    const out = {};
    (rows||[]).forEach(r=> out[r.key] = r.value);
    callback(null, out);
  });
}

module.exports = { get, set, all };