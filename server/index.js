const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const apiRouter = require('./routes/api');
const adminRouter = require('./routes/admin');
const auth = require('./auth');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// public static (frontend placeholder)
app.use(express.static(path.join(__dirname, 'public')));

// auth endpoints
app.post('/auth/login', auth.login);

// API and admin routes
app.use('/api', apiRouter);
app.use('/admin', adminRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`CRTA server listening on port ${PORT}`);
});
