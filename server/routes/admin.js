const express = require('express');
const router = express.Router();
const auth = require('../auth');
const Link = require('../models/link');

// simple auth-protected route for admin UI API
router.use(auth.requireAuth);

router.get('/links', (req, res) => {
  Link.all((err, rows) => {
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

module.exports = router;
