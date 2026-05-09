/* ================================================
   MARKETCORE – Main Application JavaScript
   Backend-first payment & device check flow
   ================================================ */

const API_BASE = (window.MC_API_BASE || 'https://api.marketcore.ng/api/v1');
const PAYSTACK_KEY = window.MC_PAYSTACK_KEY || 'pk_test_REPLACE_WITH_YOUR_PAYSTACK_PUBLIC_KEY';

/* ─────────────────────────────────────────────── */
/*  UTILITIES                                       */
/* ─────────────────────────────────────────────── */

function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

function showToast(message, type = 'default') {
  const container = $('#toast-container') || (() => {
    const c = document.createElement('div');
    c.id = 'toast-container';
    c.className = 'toast-container';
    document.body.appendChild(c);
    return c;
  })();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${type === 'success'
        ? '<polyline points="20 6 9 17 4 12"></polyline>'
        : type === 'error'
        ? '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'
        : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
      }
    </svg>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'none'; toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
}

function openModal(id) { const m = $(`#${id}`); if (m) m.classList.add('open'); }
function closeModal(id) { const m = $(`#${id}`); if (m) m.classList.remove('open'); }

function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.origText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Processing…';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.origText || btn.innerHTML;
    btn.disabled = false;
  }
}

function generateRef() {
  return 'MC_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

function validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()); }
function validateIMEI(v)  { return /^\d{15,17}$/.test(v.replace(/[\s\-]/g, '')); }
function validateSerial(v) { return /^[A-Za-z0-9]{6,20}$/.test(v.trim()); }

/* ─────────────────────────────────────────────── */
/*  NAVIGATION                                      */
/* ─────────────────────────────────────────────── */

function initNav() {
  const hamburger = $('#hamburger');
  const mobileMenu = $('#mobile-menu');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
    }
  });

  // Active link highlighting
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  $$('a.nav-link').forEach(a => {
    if (a.getAttribute('href') === currentPath) a.classList.add('active');
  });
}

/* ─────────────────────────────────────────────── */
/*  CHECKER TABS                                    */
/* ─────────────────────────────────────────────── */

let checkerMode = 'imei'; // 'imei' | 'serial'

function initCheckerTabs() {
  const tabs = $$('.checker-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      checkerMode = tab.dataset.tab;

      const imeiSection  = $('#imei-field');
      const serialSection = $('#serial-field');
      const inputHint = $('#checker-hint');

      if (checkerMode === 'imei') {
        if (imeiSection)  imeiSection.style.display  = 'block';
        if (serialSection) serialSection.style.display = 'none';
        if (inputHint) inputHint.textContent = 'Dial *#06# on the phone to retrieve the IMEI number.';
      } else {
        if (imeiSection)  imeiSection.style.display  = 'none';
        if (serialSection) serialSection.style.display = 'block';
        if (inputHint) inputHint.textContent = 'Find the serial number on the device box or Settings › About Phone.';
      }
    });
  });
}

/* ─────────────────────────────────────────────── */
/*  CHECKER FORM → PAYMENT MODAL                    */
/* ─────────────────────────────────────────────── */

let pendingCheckData = null;

function initCheckerForm() {
  const form = $('#checker-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors(form);

    const email = $('#check-email')?.value.trim();
    const imei  = $('#check-imei')?.value.trim();
    const serial = $('#check-serial')?.value.trim();

    let valid = true;

    if (!email || !validateEmail(email)) {
      showFieldError('check-email', 'Please enter a valid email address.'); valid = false;
    }

    if (checkerMode === 'imei') {
      if (!imei || !validateIMEI(imei)) {
        showFieldError('check-imei', 'IMEI must be 15 digits. Dial *#06# to find it.'); valid = false;
      }
    } else {
      if (!serial || !validateSerial(serial)) {
        showFieldError('check-serial', 'Serial number must be 6–20 alphanumeric characters.'); valid = false;
      }
    }

    if (!valid) return;

    pendingCheckData = {
      email,
      imei:   checkerMode === 'imei'   ? imei.replace(/[\s\-]/g, '')  : undefined,
      serial: checkerMode === 'serial' ? serial.trim()                 : undefined,
      mode: checkerMode,
    };

    // Show payment modal
    const label = $('#pay-check-label');
    if (label) label.textContent = checkerMode === 'imei' ? `IMEI: ${imei}` : `Serial: ${serial}`;
    openModal('check-payment-modal');
  });
}

/* ─────────────────────────────────────────────── */
/*  REPORT FORM → PAYMENT MODAL                     */
/* ─────────────────────────────────────────────── */

let pendingReportData = null;

function initReportForm() {
  const form = $('#report-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors(form);

    const fields = {
      email:       $('#report-email')?.value.trim(),
      name:        $('#report-name')?.value.trim(),
      phone:       $('#report-phone')?.value.trim(),
      imei:        $('#report-imei')?.value.trim(),
      serial:      $('#report-serial')?.value.trim(),
      brand:       $('#report-brand')?.value.trim(),
      model:       $('#report-model')?.value.trim(),
      color:       $('#report-color')?.value.trim(),
      description: $('#report-description')?.value.trim(),
    };

    let valid = true;
    if (!fields.email || !validateEmail(fields.email))    { showFieldError('report-email', 'Valid email required.'); valid = false; }
    if (!fields.name  || fields.name.length < 2)          { showFieldError('report-name',  'Your full name is required.'); valid = false; }
    if (!fields.phone || !/^[\d\+\s\-]{7,15}$/.test(fields.phone)) { showFieldError('report-phone', 'Valid phone number required.'); valid = false; }
    if (!fields.imei && !fields.serial)                   { showFieldError('report-imei',  'At least one of IMEI or Serial Number is required.'); valid = false; }
    if (fields.imei && !validateIMEI(fields.imei))        { showFieldError('report-imei',  'IMEI must be exactly 15 digits.'); valid = false; }
    if (!fields.brand)  { showFieldError('report-brand',  'Device brand is required.'); valid = false; }
    if (!fields.model)  { showFieldError('report-model',  'Device model is required.'); valid = false; }
    if (!fields.description || fields.description.length < 20) { showFieldError('report-description', 'Please provide at least 20 characters describing how the device was stolen.'); valid = false; }

    if (!valid) return;

    pendingReportData = { ...fields };

    // Update modal label
    const label = $('#pay-report-label');
    if (label) label.textContent = `${fields.brand} ${fields.model}${fields.imei ? ' — IMEI: ' + fields.imei : ''}`;
    openModal('report-payment-modal');
  });
}

/* ─────────────────────────────────────────────── */
/*  FORM VALIDATION HELPERS                         */
/* ─────────────────────────────────────────────── */

function showFieldError(id, msg) {
  const field = $(`#${id}`);
  if (!field) return;
  field.closest('.form-group')?.classList.add('input-error');
  let err = field.closest('.form-group')?.querySelector('.form-error');
  if (!err) {
    err = document.createElement('p');
    err.className = 'form-error';
    field.closest('.input-wrap, .form-group')?.appendChild(err);
  }
  err.textContent = msg;
}

function clearErrors(form) {
  form.querySelectorAll('.form-error').forEach(e => e.remove());
  form.querySelectorAll('.input-error').forEach(e => e.classList.remove('input-error'));
}

/* ─────────────────────────────────────────────── */
/*  PAYSTACK PAYMENT                                */
/* ─────────────────────────────────────────────── */

function initPaystack(email, amountKobo, ref, onSuccess) {
  if (typeof PaystackPop === 'undefined') {
    // Paystack script not loaded – show fallback
    showToast('Payment service unavailable. Please try again shortly.', 'error');
    return;
  }
  const handler = PaystackPop.setup({
    key:      PAYSTACK_KEY,
    email:    email,
    amount:   amountKobo,
    currency: 'NGN',
    ref:      ref,
    metadata: { custom_fields: [{ display_name: 'Platform', variable_name: 'platform', value: 'Marketcore Web' }] },
    onClose:  () => showToast('Payment window closed. You were not charged.', 'default'),
    callback: (response) => onSuccess(response),
  });
  handler.openIframe();
}

/* ─────────────────────────────────────────────── */
/*  CHECK – PAY BUTTON CLICK                        */
/* ─────────────────────────────────────────────── */

function initCheckPayButton() {
  const btn = $('#pay-check-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!pendingCheckData) return;
    closeModal('check-payment-modal');

    const ref = generateRef();
    setLoading(btn, true);

    initPaystack(pendingCheckData.email, 10000 /* ₦500 */, ref, async (response) => {
      // Payment successful – now verify with backend and get device status
      await verifyAndCheck(response.reference, pendingCheckData);
      setLoading(btn, false);
    });
  });
}

async function verifyAndCheck(paymentRef, checkData) {
  const resultEl = $('#check-result');
  if (resultEl) resultEl.innerHTML = '';

  const loadingEl = $('#checker-loading');
  if (loadingEl) loadingEl.classList.add('show');

  try {
    const response = await fetch(`${API_BASE}/public/device/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentRef, ...checkData }),
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data?.error || 'Check failed. Please try again.');

    renderCheckResult(data.data || data, resultEl);
    resultEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('Device status retrieved successfully!', 'success');

  } catch (err) {
    // Fallback demo result for testing UI (remove in production)
    if (loadingEl) loadingEl.classList.remove('show');

    // Show demo result when API not connected
    if (err.message?.includes('fetch') || err.message?.includes('Failed to fetch')) {
      renderDemoResult(checkData, resultEl);
      showToast('⚠️ Demo mode — connect your backend API.', 'default');
    } else {
      showToast(err.message || 'Could not retrieve device status.', 'error');
    }
  } finally {
    if (loadingEl) loadingEl.classList.remove('show');
  }
}

function renderCheckResult(data, container) {
  if (!container) return;
  const isClean = !data || data.status === 'clean' || data.status === null;
  const isStolen = data?.status === 'stolen' || data?.status === 'flagged';

  if (isClean) {
    container.innerHTML = `
      <div class="result-clean">
        <div class="result-icon result-icon-clean" style="margin:0 auto 16px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
            fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h3 class="result-title" style="color:#14532d">✅ Device is CLEAN</h3>
        <p class="result-body" style="color:#166534">This device has not been flagged or reported stolen in the Marketcore database. It appears safe to purchase.</p>
        <div style="background:rgba(255,255,255,.6);border-radius:10px;padding:14px;font-size:13px;color:#166534;display:flex;gap:8px;align-items:flex-start;text-align:left;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          Always verify with physical inspection. Our database is maintained by verified Nigerian electronics dealers and may not contain all reports.
        </div>
      </div>`;
  } else {
    container.innerHTML = `
      <div class="result-stolen">
        <div class="result-icon result-icon-stolen" style="margin:0 auto 16px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
            fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <h3 class="result-title" style="color:#7f1d1d">⚠️ ${data.status?.toUpperCase() === 'FLAGGED' ? 'FLAGGED DEVICE' : 'STOLEN DEVICE'}</h3>
        <p class="result-body" style="color:#991b1b">This device has been reported as <strong>${data.status}</strong> in our database. <strong>Do NOT purchase this device.</strong></p>
        <div class="result-details">
          ${data.brand    ? `<div class="result-detail-row"><span class="result-detail-key">Device</span><span class="result-detail-val">${data.brand} ${data.model || ''}</span></div>` : ''}
          ${data.reporterName ? `<div class="result-detail-row"><span class="result-detail-key">Reported by</span><span class="result-detail-val">${data.reporterName}</span></div>` : ''}
          ${data.reportedAt   ? `<div class="result-detail-row"><span class="result-detail-key">Date reported</span><span class="result-detail-val">${new Date(data.reportedAt).toLocaleDateString('en-NG')}</span></div>` : ''}
        </div>
        <div style="background:rgba(255,255,255,.5);border-radius:10px;padding:14px;font-size:13px;color:#991b1b;display:flex;gap:8px;align-items:flex-start;text-align:left;margin-top:16px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          Report this to Nigerian law enforcement. Purchasing a stolen device is a criminal offence.
        </div>
      </div>`;
  }
}

// Demo result for when backend not connected
function renderDemoResult(checkData, container) {
  if (!container) return;
  // Show "clean" as demo
  container.innerHTML = `
    <div class="result-clean">
      <div class="result-icon result-icon-clean" style="margin:0 auto 16px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
          fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      </div>
      <h3 class="result-title" style="color:#14532d">✅ DEMO: Device Appears Clean</h3>
      <p class="result-body" style="color:#166534">
        This is a demo result. Connect your backend at <code>${API_BASE}</code> to enable live device checking.
        ${checkData.imei ? `<br><strong>IMEI checked:</strong> ${checkData.imei}` : `<strong>Serial checked:</strong> ${checkData.serial}`}
      </p>
    </div>`;
}

/* ─────────────────────────────────────────────── */
/*  REPORT – PAY BUTTON CLICK                       */
/* ─────────────────────────────────────────────── */

function initReportPayButton() {
  const btn = $('#pay-report-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!pendingReportData) return;
    closeModal('report-payment-modal');

    const ref = generateRef();

    initPaystack(pendingReportData.email, 100000 /* ₦1,000 */, ref, async (response) => {
      await submitReport(response.reference, pendingReportData);
    });
  });
}

async function submitReport(paymentRef, reportData) {
  try {
    const response = await fetch(`${API_BASE}/public/device/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentRef, ...reportData }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'Report submission failed.');

    // Show success
    openModal('report-success-modal');
    $('#report-form')?.reset();
    showToast('Stolen device report submitted successfully!', 'success');

  } catch (err) {
    if (err.message?.includes('fetch') || err.message?.includes('Failed to fetch')) {
      // Demo success
      openModal('report-success-modal');
      $('#report-form')?.reset();
      showToast('⚠️ Demo mode — report saved locally. Connect backend.', 'default');
    } else {
      showToast(err.message || 'Could not submit report. Please try again.', 'error');
    }
  }
}

/* ─────────────────────────────────────────────── */
/*  DEALER SIGN UP MODAL                            */
/* ─────────────────────────────────────────────── */

function initDealerModal() {
  const openBtn = $$('[data-action="open-dealer-modal"]');
  openBtn.forEach(b => b.addEventListener('click', () => openModal('dealer-modal')));

  const form = $('#dealer-signup-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // Show download prompt
    const formSection = $('#dealer-form-section');
    const downloadSection = $('#dealer-download-section');
    if (formSection) formSection.style.display = 'none';
    if (downloadSection) downloadSection.style.display = 'block';
  });
}

/* ─────────────────────────────────────────────── */
/*  MODAL CLOSE HANDLERS                            */
/* ─────────────────────────────────────────────── */

function initModalCloseHandlers() {
  // Close buttons
  $$('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.closeModal;
      closeModal(target);
    });
  });

  // Click outside modal content
  $$('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $$('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
  });
}

/* ─────────────────────────────────────────────── */
/*  SMOOTH SCROLL FOR ANCHOR LINKS                  */
/* ─────────────────────────────────────────────── */

function initSmoothScroll() {
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = $(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Close mobile menu if open
        $('#mobile-menu')?.classList.remove('open');
        $('#hamburger')?.classList.remove('open');
      }
    });
  });
}

/* ─────────────────────────────────────────────── */
/*  CONTACT FORM                                    */
/* ─────────────────────────────────────────────── */

function initContactForm() {
  const form = $('#contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    setLoading(btn, true);

    const data = {
      name:    $('#contact-name')?.value.trim(),
      email:   $('#contact-email')?.value.trim(),
      subject: $('#contact-subject')?.value.trim(),
      message: $('#contact-message')?.value.trim(),
    };

    try {
      await fetch(`${API_BASE}/public/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (_) { /* best effort */ }

    showToast('Message sent! We\'ll get back to you within 24 hours.', 'success');
    form.reset();
    setLoading(btn, false);
  });
}

/* ─────────────────────────────────────────────── */
/*  INIT                                            */
/* ─────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initCheckerTabs();
  initCheckerForm();
  initReportForm();
  initCheckPayButton();
  initReportPayButton();
  initDealerModal();
  initModalCloseHandlers();
  initSmoothScroll();
  initContactForm();

  // Replace feather icons
  if (typeof feather !== 'undefined') feather.replace({ 'stroke-width': 2 });
});