// src/middleware/errorHandler.js
// Central error handler. Keeps error logic out of server.js.

const { isProd } = require('../../config/app');

function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  // Don't leak stack traces or internal messages in production
  const message = isProd
    ? 'Something went wrong. Please try again.'
    : err.message;

  // Log full error server-side regardless of environment
  if (status >= 500) {
    console.error(`[${new Date().toISOString()}] ${status} ${req.method} ${req.path}`, err);
  }

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
