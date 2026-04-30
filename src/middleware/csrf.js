// src/middleware/csrf.js
// Double-submit cookie CSRF protection.
// The frontend fetches a token from /api/csrf-token, stores it in a cookie,
// and sends it back as a field in every POST request.
// We verify both match before processing any form submission.

const { cookie: cookieConfig } = require('../../config/app');

function generateToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Issues a new CSRF token and sets it as a cookie
function issueCsrfToken(req, res) {
  const token = generateToken();
  res.cookie('_csrf', token, {
    ...cookieConfig,
    httpOnly: false, // Must be readable by JS so the form can send it
  });
  return token;
}

// Validates that the cookie token and request body token match
function verifyCsrfToken(req, res, next) {
  const cookieToken = req.cookies['_csrf'];
  const bodyToken   = req.body._csrf;

  if (!cookieToken || !bodyToken || cookieToken !== bodyToken) {
    return res.status(403).json({ error: 'Invalid request. Please refresh the page and try again.' });
  }
  next();
}

module.exports = { issueCsrfToken, verifyCsrfToken };
