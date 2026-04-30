// src/routes/webhook.js
// Stripe sends a POST here after every successful payment.
// This is where the real automation lives — payment confirmed,
// notification sent, intake logged, all without you touching anything.

const express = require('express');
const router  = express.Router();

const PROJECT_LABELS = {
  deck:'Deck or patio', adu:'ADU / guest house', garage:'Garage conversion',
  addition:'Home addition', basement:'Basement finish', fence:'Fence or retaining wall',
  shed:'Shed or outbuilding', other:'Other',
};

const TIER_LABELS = {
  diy:'DIY ($79)', assisted:'Assisted ($249)', fullservice:'Full-Service ($499)',
};

// Stripe requires the raw body to verify webhook signatures.
// This route uses express.raw() — do NOT add express.json() here.
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig     = req.headers['stripe-signature'];
  const secret  = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  // Only handle successful payments
  if (event.type === 'checkout.session.completed') {
    const session  = event.data.object;
    const { name, email, phone, projectType, tier, message } = session.metadata;
    const amountPaid = (session.amount_total / 100).toFixed(2);

    console.log('[Payment]', {
      timestamp:   new Date().toISOString(),
      name, email, projectType, tier,
      amount:      `$${amountPaid}`,
      sessionId:   session.id,
    });

    // ── Send notification email ──────────────────────────────────────────────
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const nodemailer  = require('nodemailer');
        const smtpPort    = parseInt(process.env.SMTP_PORT, 10) || 465;
        const transporter = nodemailer.createTransport({
          host:   process.env.SMTP_HOST,
          port:   smtpPort,
          secure: smtpPort === 465,
          auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });

        const project   = PROJECT_LABELS[projectType] || projectType;
        const tierLabel = TIER_LABELS[tier] || tier;
        const submitted = new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short',
        });

        await transporter.sendMail({
          from:    '"PullMyPermit" <onboarding@pullmypermit.org>',
          to:      process.env.NOTIFY_EMAIL,
          replyTo: email,
          subject: `PAID - ${project} - ${tierLabel} - ${name}`,
          html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F0EEE8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0EEE8;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;max-width:560px;width:100%;">
  <tr><td style="background:#0C447C;padding:24px 32px;">
    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#B5D4F4;">PullMyPermit</p>
    <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;color:#ffffff;">New Paid Order</h1>
  </td></tr>
  <tr><td style="background:#EAF3DE;padding:12px 32px;border-bottom:1px solid #C0DD97;">
    <p style="margin:0;font-size:15px;color:#3B6D11;font-weight:700;">$${amountPaid} received &nbsp;·&nbsp; ${tierLabel}</p>
  </td></tr>
  <tr><td style="padding:28px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:8px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888780;width:90px;vertical-align:top;">Name</td><td style="padding:8px 0;font-size:15px;color:#1A1A18;">${name}</td></tr>
      <tr style="border-top:1px solid #F0EEE8;"><td style="padding:8px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888780;vertical-align:top;">Email</td><td style="padding:8px 0;font-size:15px;"><a href="mailto:${email}" style="color:#185FA5;text-decoration:none;">${email}</a></td></tr>
      <tr style="border-top:1px solid #F0EEE8;"><td style="padding:8px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888780;vertical-align:top;">Phone</td><td style="padding:8px 0;font-size:15px;color:#1A1A18;">${phone || 'Not provided'}</td></tr>
      <tr style="border-top:1px solid #F0EEE8;"><td style="padding:8px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888780;vertical-align:top;">Project</td><td style="padding:8px 0;font-size:15px;color:#1A1A18;">${project}</td></tr>
      <tr style="border-top:1px solid #F0EEE8;"><td style="padding:8px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888780;vertical-align:top;">Paid</td><td style="padding:8px 0;font-size:15px;color:#1A1A18;font-weight:700;">$${amountPaid}</td></tr>
    </table>
  </td></tr>
  ${message ? `
  <tr><td style="padding:20px 32px 0;">
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888780;">Project details</p>
    <div style="background:#F8F8F6;border-left:3px solid #0C447C;border-radius:4px;padding:14px 16px;">
      <p style="margin:0;font-size:15px;color:#1A1A18;line-height:1.65;">${message}</p>
    </div>
  </td></tr>` : ''}
  <tr><td style="padding:24px 32px;">
    <a href="mailto:${email}?subject=Your PullMyPermit order - next steps" style="display:inline-block;background:#0C447C;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;">Email ${name}</a>
  </td></tr>
  <tr><td style="background:#F8F8F6;border-top:1px solid #F0EEE8;padding:16px 32px;">
    <p style="margin:0;font-size:12px;color:#888780;">Stripe session: ${session.id} &nbsp;·&nbsp; ${submitted}</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`,
        });

        console.log('[Email] Payment notification sent for', email);
      } catch (emailErr) {
        console.error('[Email error]', emailErr.message);
      }
    }
  }

  res.json({ received: true });
});

module.exports = router;
