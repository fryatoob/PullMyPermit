// src/middleware/logger.js
// Lightweight request logger. Replace with morgan or winston in production.

const { isProd } = require('../../config/app');

function logger(req, res, next) {
  if (isProd) return next(); // Use a proper logger in prod (e.g. morgan + log aggregator)

  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const color = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    console.log(`${color}${res.statusCode}\x1b[0m ${req.method} ${req.originalUrl} — ${ms}ms`);
  });
  next();
}

module.exports = logger;
