// src/routes/checkout.js
// Creates a Stripe Checkout session for the selected tier.
// The homeowner pays upfront — no chasing invoices.

const express = require('express');
const router  = express.Router();

const PRICES = {
  diy:         { amount: 7900,  label: 'DIY Package',          desc: 'Permit forms, checklist & submission instructions' },
  assisted:    { amount: 24900, label: 'Assisted Package',      desc: 'Ready-to-submit package, we review everything' },
  fullservice: { amount: 49900, label: 'Full-Service Package',  desc: 'We handle the entire filing start to finish' },
};

// POST /api/checkout  { tier, name, email, projectType, message, phone? }
router.post('/', async (req, res) => {
  const { tier, name, email, projectType, message, phone } = req.body;

  if (!PRICES[tier]) {
    return res.status(400).json({ error: 'Invalid tier selected.' });
  }

  if (!email || !name) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  try {
    const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const price   = PRICES[tier];
    const baseUrl = process.env.BASE_URL || 'https://pullmypermit.org';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: price.amount,
          product_data: {
            name:        price.label,
            description: price.desc,
          },
        },
        quantity: 1,
      }],
      metadata: {
        name,
        email,
        phone:       phone || '',
        projectType,
        tier,
        message:     message?.slice(0, 500) || '',
      },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${baseUrl}/#contact`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe error]', err.message);
    res.status(500).json({ error: 'Could not create checkout session. Please try again.' });
  }
});

module.exports = router;
