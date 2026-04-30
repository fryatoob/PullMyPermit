// src/routes/contact.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { verifyCsrfToken } = require('../middleware/csrf');

const router = express.Router();

const PROJECT_TYPES  = ['deck','adu','garage','addition','basement','fence','shed','other'];
const TIERS          = ['diy','assisted','fullservice'];
const PROJECT_LABELS = { deck:'Deck or patio', adu:'ADU / guest house', garage:'Garage conversion', addition:'Home addition', basement:'Basement finish', fence:'Fence or retaining wall', shed:'Shed or outbuilding', other:'Other' };
const TIER_LABELS    = { diy:'DIY ($49-99)', assisted:'Assisted ($199-299)', fullservice:'Full-Service ($400-600)' };

const validate = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ min:2, max:80 }).withMessage('Name must be 2-80 characters.').escape(),
  body('email').trim().notEmpty().withMessage('Email is required.').isEmail().withMessage('Please enter a valid email address.').normalizeEmail().isLength({ max:254 }),
  body('phone').optional({ checkFalsy:true }).trim().isMobilePhone('en-US').withMessage('Please enter a valid US phone number.').isLength({ max:20 }),
  body('projectType').trim().notEmpty().withMessage('Please select a project type.').isIn(PROJECT_TYPES).withMessage('Invalid project type.'),
  body('tier').trim().notEmpty().withMessage('Please select a service tier.').isIn(TIERS).withMessage('Invalid service tier.'),
  body('message').trim().notEmpty().withMessage('Please describe your project.').isLength({ min:10, max:1000 }).withMessage('Message must be 10-1000 characters.').escape(),
];

router.post('/', verifyCsrfToken, validate, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Please fix the errors below.',
      fields: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }

  const { name, email, phone, projectType, tier, message } = req.body;

  console.log('[Contact]', { timestamp: new Date().toISOString(), name, email, phone: phone || 'not provided', projectType, tier, ip: req.ip });

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: `"PullMyPermit" <${process.env.SMTP_USER}>`,
        to: process.env.NOTIFY_EMAIL || process.env.SMTP_USER,
        subject: `New inquiry - ${PROJECT_LABELS[projectType]} - ${TIER_LABELS[tier]}`,
        text: `From: ${name} <${email}>\nPhone: ${phone || 'not provided'}\nProject: ${PROJECT_LABELS[projectType]}\nTier: ${TIER_LABELS[tier]}\n\n${message}`,
      });
    } catch (emailErr) {
      console.error('[Email error]', emailErr.message);
    }
  }

  res.status(200).json({ success: true, message: "Got it - we'll be in touch within one business day." });
});

module.exports = router;
