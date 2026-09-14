const db = require('./db');
const bcrypt = require('bcrypt');

// Simple auth helpers (uid/password). For demo only; do not use in production as-is.
async function hashPassword(pw) {
  return bcrypt.hash(pw, 10);
}

// ensure an admin user exists (uid: admin / password: admin) — change in production
db.get('SELECT COUNT(*) as c FROM users', (err, row) => {
  if (err) return console.warn('auth init error', err);
  if (row && row.c === 0) {
    (async () => {
      const hash = await hashPassword('admin');
      db.run('INSERT INTO users (uid, password_hash) VALUES (?,?)', ['admin', hash]);
      console.log('Inserted default admin user (uid: admin, password: admin)');
    })();
  }
});

async function login(req, res) {
  const { uid, password } = req.body || {};
  if (!uid || !password) return res.status(400).json({ error: 'uid and password required' });
  db.get('SELECT * FROM users WHERE uid = ?', [uid], async (err, user) => {
    if (err) return res.status(500).json({ error: 'db error' });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    // simple session token (in-memory); for demo return uid
    res.json({ uid: user.uid, message: 'authenticated' });
  });
}

// middleware for admin routes: expects header x-admin-uid for demo
function requireAuth(req, res, next) {
  const uid = req.header('x-admin-uid');
  if (!uid) return res.status(401).json({ error: 'unauthenticated' });
  db.get('SELECT * FROM users WHERE uid = ?', [uid], (err, user) => {
    if (err) return res.status(500).json({ error: 'db error' });
    if (!user) return res.status(401).json({ error: 'unauthenticated' });
    req.admin = { uid: user.uid };
    next();
  });
}

module.exports = { login, requireAuth };
