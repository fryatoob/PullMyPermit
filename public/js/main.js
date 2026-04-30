'use strict';

// ── Year ──────────────────────────────────────────────────────────────────
document.getElementById('year').textContent = new Date().getFullYear();

// ── Mobile nav ────────────────────────────────────────────────────────────
const burger = document.querySelector('.nav__burger');
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

// ── Smooth nav highlight on scroll ───────────────────────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav__links a[href^="#"]');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.classList.toggle(
          'is-active',
          link.getAttribute('href') === `#${entry.target.id}`
        );
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => observer.observe(s));

// ── Char counter ──────────────────────────────────────────────────────────
const messageField = document.getElementById('message');
const charCount = document.getElementById('char-count');

messageField.addEventListener('input', () => {
  const len = messageField.value.length;
  charCount.textContent = `${len} / 1000`;
  charCount.style.color = len > 900 ? '#C0392B' : '';
});

// ── Client-side validation helpers ───────────────────────────────────────
function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errEl = document.getElementById(`${fieldId}-error`);
  if (field) field.classList.add('is-invalid');
  if (errEl) errEl.textContent = message;
}

function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  const errEl = document.getElementById(`${fieldId}-error`);
  if (field) field.classList.remove('is-invalid');
  if (errEl) errEl.textContent = '';
}

function clearAllErrors() {
  ['name','email','phone','projectType','message'].forEach(clearFieldError);
  document.getElementById('tier-error').textContent = '';
  document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

function validateForm(data) {
  let valid = true;

  if (!data.name || data.name.trim().length < 2) {
    showFieldError('name', 'Please enter your full name.');
    valid = false;
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRe.test(data.email)) {
    showFieldError('email', 'Please enter a valid email address.');
    valid = false;
  }

  if (!data.projectType) {
    showFieldError('projectType', 'Please select a project type.');
    valid = false;
  }

  if (!data.tier) {
    document.getElementById('tier-error').textContent = 'Please select a service tier.';
    valid = false;
  }

  if (!data.message || data.message.trim().length < 10) {
    showFieldError('message', 'Please describe your project (at least 10 characters).');
    valid = false;
  }

  return valid;
}

// ── Sanitize input before sending ────────────────────────────────────────
function sanitizeString(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

// ── Contact form submission ───────────────────────────────────────────────
const form = document.getElementById('contact-form');
const submitBtn = document.getElementById('submit-btn');
const btnText = document.getElementById('btn-text');
const btnLoading = document.getElementById('btn-loading');
const formSuccess = document.getElementById('form-success');
const formError = document.getElementById('form-error');

let csrfToken = null;

// Fetch CSRF token on page load
async function fetchCsrfToken() {
  try {
    const res = await fetch('/api/csrf-token', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      csrfToken = data.csrfToken;
    }
  } catch (e) {
    console.warn('Could not fetch CSRF token.');
  }
}
fetchCsrfToken();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAllErrors();
  formSuccess.hidden = true;
  formError.hidden = true;

  const data = {
    name: form.name.value,
    email: form.email.value,
    phone: form.phone.value,
    projectType: form.projectType.value,
    tier: form.querySelector('input[name="tier"]:checked')?.value || '',
    message: form.message.value,
    _csrf: csrfToken || '',
  };

  if (!validateForm(data)) {
    // Focus first invalid field
    const firstInvalid = form.querySelector('.is-invalid');
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  // Sanitize before sending
  const payload = {};
  for (const [key, val] of Object.entries(data)) {
    payload[key] = key === '_csrf' ? val : sanitizeString(val);
  }

  // UI loading state
  submitBtn.disabled = true;
  btnText.hidden = true;
  btnLoading.hidden = false;

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (res.ok && result.success) {
      form.reset();
      charCount.textContent = '0 / 1000';
      formSuccess.hidden = false;
      formSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      // Refresh CSRF token after successful submit
      await fetchCsrfToken();
    } else if (res.status === 422 && result.fields) {
      result.fields.forEach(({ field, message }) => {
        if (field === 'tier') {
          document.getElementById('tier-error').textContent = message;
        } else {
          showFieldError(field, message);
        }
      });
      formError.textContent = result.error || 'Please fix the errors above.';
      formError.hidden = false;
    } else {
      formError.textContent = result.error || 'Something went wrong. Please try again or email us directly.';
      formError.hidden = false;
    }
  } catch (err) {
    formError.textContent = 'Could not send your message. Please email us at hello@pullmypermit.org.';
    formError.hidden = false;
  } finally {
    submitBtn.disabled = false;
    btnText.hidden = false;
    btnLoading.hidden = true;
  }
});

// Clear field errors on change
['name','email','phone','projectType','message'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', () => clearFieldError(id));
    el.addEventListener('change', () => clearFieldError(id));
  }
});

form.querySelectorAll('input[name="tier"]').forEach(radio => {
  radio.addEventListener('change', () => {
    document.getElementById('tier-error').textContent = '';
  });
});
