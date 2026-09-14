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
