require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const compression  = require('compression');
const path         = require('path');

const { helmetConfig, corsConfig, globalRateLimit, formRateLimit } = require('./config/security');
const { port, cookieSecret } = require('./config/app');
const { issueCsrfToken }     = require('./src/middleware/csrf');
const logger                 = require('./src/middleware/logger');
const errorHandler           = require('./src/middleware/errorHandler');
const contactRouter          = require('./src/routes/contact');
const checkoutRouter         = require('./src/routes/checkout');
const webhookRouter          = require('./src/routes/webhook');

const app = express();

app.use(helmet(helmetConfig));
app.use(cors(corsConfig));
app.use(rateLimit(globalRateLimit));

// Webhook MUST come before express.json() — Stripe requires raw body for signature verification
app.use('/api/webhook', webhookRouter);

app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser(cookieSecret));

app.use(logger);

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  },
}));

app.get('/api/csrf-token', (req, res) => {
  const token = issueCsrfToken(req, res);
  res.json({ csrfToken: token });
});

app.use('/api/contact',  rateLimit(formRateLimit), contactRouter);
app.use('/api/checkout', rateLimit(formRateLimit), checkoutRouter);

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(errorHandler);

app.listen(port, () => {
  console.log('PullMyPermit running -> http://localhost:' + port);
});

module.exports = app;
