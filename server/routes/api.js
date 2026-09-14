const express = require('express');
const router = express.Router();
const Link = require('../models/link');
const Notice = require('../models/notice');

// GET /api/links
router.get('/links', (req, res) => {
  Link.all((err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

// GET /api/notices (only active notices)
router.get('/notices', (req, res) => {
  Notice.allActive((err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

// POST /api/links (admin-created; admin UI should call /admin)
router.post('/links', (req, res) => {
  const payload = req.body;
  Link.create(payload, (err, id) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.status(201).json({ id });
  });
});

module.exports = router;
