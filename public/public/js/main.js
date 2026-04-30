'use strict';

document.getElementById('year').textContent = new Date().getFullYear();

// ── Mobile nav ────────────────────────────────────────────────────────────
const burger     = document.querySelector('.nav__burger');
const mobileMenu = document.getElementById('mobile-menu');

burger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', String(isOpen));
  mobileMenu.setAttribute('aria-hidden', String(!isOpen));
});
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
  });
});

// ── Scroll nav highlight ──────────────────────────────────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.nav__links a[href^="#"]');
const observer  = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === `#${entry.target.id}`));
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });
sections.forEach(s => observer.observe(s));

// ── Char counter ──────────────────────────────────────────────────────────
const messageField = document.getElementById('message');
const charCount    = document.getElementById('char-count');
messageField.addEventListener('input', () => {
  const len = messageField.value.length;
  charCount.textContent = `${len} / 1000`;
  charCount.style.color = len > 900 ? '#C0392B' : '';
});

// ── Field error helpers ───────────────────────────────────────────────────
function showFieldError(id, msg) {
  const el  = document.getElementById(id);
  const err = document.getElementById(`${id}-error`);
  if (el)  el.classList.add('is-invalid');
  if (err) err.textContent = msg;
}
function clearFieldError(id) {
  const el  = document.getElementById(id);
  const err = document.getElementById(`${id}-error`);
  if (el)  el.classList.remove('is-invalid');
  if (err) err.textContent = '';
}
function clearAllErrors() {
  ['name','email','phone','projectType','message'].forEach(clearFieldError);
  const te = document.getElementById('tier-error');
  if (te) te.textContent = '';
  document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

// ── Client validation ─────────────────────────────────────────────────────
function validateForm(data) {
  let valid = true;
  if (!data.name || data.name.trim().length < 2) { showFieldError('name', 'Please enter your full name.'); valid = false; }
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { showFieldError('email', 'Please enter a valid email address.'); valid = false; }
  if (!data.projectType) { showFieldError('projectType', 'Please select a project type.'); valid = false; }
  if (!data.tier) { const te = document.getElementById('tier-error'); if (te) te.textContent = 'Please select a service tier.'; valid = false; }
  if (!data.message || data.message.trim().length < 10) { showFieldError('message', 'Please describe your project (at least 10 characters).'); valid = false; }
  return valid;
}

function sanitize(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;').trim();
}

// ── CSRF ──────────────────────────────────────────────────────────────────
let csrfToken = null;
async function fetchCsrfToken() {
  try {
    const res = await fetch('/api/csrf-token', { credentials: 'include' });
    if (res.ok) csrfToken = (await res.json()).csrfToken;
  } catch (e) { console.warn('CSRF fetch failed'); }
}
fetchCsrfToken();

// ── Update submit button label based on tier selection ────────────────────
const tierRadios = document.querySelectorAll('input[name="tier"]');
const btnText    = document.getElementById('btn-text');

const TIER_PRICES = { diy: '$79', assisted: '$249', fullservice: '$499' };

tierRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    const price = TIER_PRICES[radio.value];
    if (btnText) btnText.textContent = `Pay ${price} & get started`;
  });
});

// ── Form submit → Stripe Checkout ─────────────────────────────────────────
const form       = document.getElementById('contact-form');
const submitBtn  = document.getElementById('submit-btn');
const btnLoading = document.getElementById('btn-loading');
const formSuccess = document.getElementById('form-success');
const formError   = document.getElementById('form-error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAllErrors();
  formSuccess.hidden = true;
  formError.hidden   = true;

  const data = {
    name:        form.name.value,
    email:       form.email.value,
    phone:       form.phone.value,
    projectType: form.projectType.value,
    tier:        form.querySelector('input[name="tier"]:checked')?.value || '',
    message:     form.message.value,
    _csrf:       csrfToken || '',
  };

  if (!validateForm(data)) {
    const first = form.querySelector('.is-invalid');
    if (first) first.focus();
    return;
  }

  // Sanitize
  const payload = {};
  for (const [k, v] of Object.entries(data)) {
    payload[k] = k === '_csrf' ? v : sanitize(v);
  }

  // Loading state
  submitBtn.disabled  = true;
  btnText.hidden      = true;
  btnLoading.hidden   = false;

  try {
    const res    = await fetch('/api/checkout', {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'include',
      body:        JSON.stringify(payload),
    });

    const result = await res.json();

    if (res.ok && result.url) {
      // Redirect to Stripe Checkout
      window.location.href = result.url;
    } else {
      formError.textContent = result.error || 'Something went wrong. Please try again.';
      formError.hidden = false;
    }
  } catch (err) {
    formError.textContent = 'Could not connect. Please email us at hello@pullmypermit.org.';
    formError.hidden = false;
  } finally {
    submitBtn.disabled = false;
    btnText.hidden     = false;
    btnLoading.hidden  = true;
  }
});

// Clear errors on input
['name','email','phone','projectType','message'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input',  () => clearFieldError(id));
    el.addEventListener('change', () => clearFieldError(id));
  }
});
tierRadios.forEach(r => r.addEventListener('change', () => {
  const te = document.getElementById('tier-error');
  if (te) te.textContent = '';
}));
