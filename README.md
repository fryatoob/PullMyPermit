# PullMyPermit

Permit filing service for Louisville, KY homeowners.

---

## Project structure

```
pullmypermit/
├── server.js                   # App entry point — middleware stack, route mounting
├── package.json
├── .env.example                # Copy to .env and fill in your values
│
├── config/
│   ├── app.js                  # Port, environment, cookie settings
│   └── security.js             # Helmet CSP, CORS, rate limit configs
│
├── src/
│   ├── middleware/
│   │   ├── csrf.js             # CSRF token issue + verify helpers
│   │   ├── errorHandler.js     # Central error handler
│   │   └── logger.js           # Dev request logger
│   └── routes/
│       └── contact.js          # POST /api/contact — validation, sanitization, email
│
└── public/                     # Static files served directly
    ├── index.html
    ├── css/
    │   └── style.css
    ├── js/
    │   └── main.js
    └── images/
```

---

## Getting started

```bash
npm install
cp .env.example .env
# Edit .env — set COOKIE_SECRET at minimum
npm run dev
```

Visit http://localhost:3000

---

## Security features

| Layer | What it does |
|---|---|
| Helmet | Sets 11 HTTP security headers including CSP and HSTS |
| CORS | Locked to ALLOWED_ORIGINS in .env |
| Rate limiting | 100 req/15min globally, 5 form submissions/hour |
| CSRF | Double-submit cookie pattern on all POST requests |
| Input validation | express-validator — every field checked server-side |
| Input sanitization | .escape() on text, .normalizeEmail() on email, allowlist on selects |
| Body size cap | 10kb limit on JSON and URL-encoded bodies |

---

## Connecting email

Fill in the SMTP block in .env to receive contact form submissions by email.

Works with Gmail (use an App Password), Mailgun, Postmark, or any SMTP provider.
Until configured, all submissions are printed to the server console.

---

## Deploying

**Railway** (easiest): push to GitHub, connect repo, set env vars in dashboard.

**Render**: New Web Service, build command `npm install`, start command `node server.js`.

**VPS**: install Node, clone repo, `npm install --production`, set up pm2 + nginx + Certbot.
