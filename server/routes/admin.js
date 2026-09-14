const express = require('express');
const router = express.Router();
const auth = require('../auth');
const Link = require('../models/link');
const Notice = require('../models/notice');
const db = require('../db');
const bcrypt = require('bcrypt');

// simple auth-protected route for admin UI API
router.use(auth.requireAuth);

// LINKS
router.get('/links', (req, res) => {
  // return all links (admin view)
  db.all('SELECT * FROM links ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

router.post('/links', (req, res) => {
  Link.create(req.body, (err, id) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.status(201).json({ id });
  });
});

router.put('/links/:id', (req,res)=>{
  const id = req.params.id;
  const l = req.body;
  db.run('UPDATE links SET url=?,image=?,heading=?,description=?,enabled=?,theme_tag=? WHERE id=?', [l.url,l.image,l.heading,l.description,l.enabled?1:0,l.theme_tag,id], function(err){
    if(err) return res.status(500).json({ error:'db error' });
    res.json({ updated: this.changes });
  });
});

router.delete('/links/:id', (req,res)=>{
  const id=req.params.id;
  db.run('DELETE FROM links WHERE id=?',[id], function(err){
    if(err) return res.status(500).json({ error:'db error' });
    res.json({ deleted: this.changes });
  });
});

// NOTICES
router.get('/notices', (req,res)=>{
  Notice.all((err, rows)=>{
    if(err) return res.status(500).json({ error:'db error' });
    res.json(rows);
  });
});

router.post('/notices', (req,res)=>{
  Notice.create(req.body, (err,id)=>{
    if(err) return res.status(500).json({ error:'db error' });
    res.status(201).json({ id });
  });
});

router.put('/notices/:id', (req,res)=>{
  Notice.update(req.params.id, req.body, (err,changes)=>{
    if(err) return res.status(500).json({ error:'db error' });
    res.json({ updated: changes });
  });
});

router.delete('/notices/:id', (req,res)=>{
  Notice.remove(req.params.id, (err,changes)=>{
    if(err) return res.status(500).json({ error:'db error' });
    res.json({ deleted: changes });
  });
});

// ADMIN STATUS AND DB DOWNLOAD
const path = require('path');
const fs = require('fs');
const Setting = require('../models/setting');

router.get('/status', (req,res)=>{
  // return counts and DB info
  db.get('SELECT COUNT(*) AS links FROM links', (err, r1)=>{
    if(err) return res.status(500).json({ error:'db error' });
    db.get('SELECT COUNT(*) AS notices FROM notices', (err2, r2)=>{
      if(err2) return res.status(500).json({ error:'db error' });
      db.get('SELECT COUNT(*) AS users FROM users', (err3, r3)=>{
        if(err3) return res.status(500).json({ error:'db error' });
        const dbPath = path.join(__dirname, '..', 'data.db');
        let size = null;
        try{ const st = fs.statSync(dbPath); size = st.size; } catch(e){}
        res.json({ links: r1.links || 0, notices: r2.notices || 0, users: r3.users || 0, dbPath: '/admin/db', dbSize: size });
      });
    });
  });
});

router.get('/db', (req,res)=>{
  const dbPath = path.join(__dirname, '..', 'data.db');
  if (!fs.existsSync(dbPath)) return res.status(404).json({ error:'no db' });
  res.download(dbPath, 'data.db');
});

// SETTINGS
router.get('/settings', (req,res)=>{
  Setting.all((err, obj)=>{
    if(err){
      console.error('Error fetching settings for admin:', err && err.message);
      return res.status(500).json({ error: err.message || 'db error' });
    }
    res.json(obj);
  });
});

router.put('/settings', (req,res)=>{
  const payload = req.body || {};
  const keys = Object.keys(payload);
  if(keys.length===0) return res.status(400).json({ error:'no settings' });
  let remaining = keys.length;
  let hadErr = null;
  keys.forEach(k=>{
    Setting.set(k, payload[k], (err, changes)=>{
      if(err){
        hadErr = err;
        console.error('Error saving setting', k, err && err.message);
      }
      remaining--;
      if(remaining===0){
        if(hadErr) return res.status(500).json({ error: hadErr.message || 'db error' });
        res.json({ updated: keys.length });
      }
    });
  });
});

// USERS management
router.get('/users', (req,res)=>{
  db.all('SELECT id,uid FROM users', (err,rows)=>{
    if(err) return res.status(500).json({ error:'db error' });
    res.json(rows);
  });
});

router.post('/users', async (req,res)=>{
  const { uid, password } = req.body || {};
  if(!uid || !password) return res.status(400).json({ error:'uid and password required' });
  try{
    const hash = await bcrypt.hash(password,10);
    db.run('INSERT OR REPLACE INTO users(uid,password_hash) VALUES(?,?)',[uid,hash], function(err){
      if(err) return res.status(500).json({ error:'db error' });
      res.status(201).json({ uid });
    });
  }catch(e){ res.status(500).json({ error:'hash error' }); }
});

router.delete('/users/:uid', (req,res)=>{
  db.run('DELETE FROM users WHERE uid=?',[req.params.uid], function(err){
    if(err) return res.status(500).json({ error:'db error' });
    res.json({ deleted: this.changes });
  });
});

module.exports = router;
