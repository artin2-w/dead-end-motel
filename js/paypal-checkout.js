import {
  FEATURED_PRODUCTS,
  STORE_SECTIONS,
  continueCreditsGranted,
  getProduct,
  isContinueProduct,
  listAllowedProductIds
} from './monetization-catalog.js';

/**
 * Ethical monetization guardrails (frontend):
 * - Purchases are optional — Retry / Restart / Main Menu remain fully viable paths.
 * - Never claim fake scarcity, countdowns, or rigged outcomes; near-win copy uses read-only context only.
 * - Continue credits are progress protection / convenience, not a paywall.
 * - Unlocking only happens after the existing Cloudflare `/capture-order` verification (unchanged).
 */

const API_BASE_URL = 'https://steep-boat-15e1.artinkarshad.workers.dev';

let _activeButtons = null;
window.__demCheckoutActive = window.__demCheckoutActive === true;

const ALLOWED_PRODUCTS = new Set(listAllowedProductIds());

function isAllowedProduct(product) {
  return ALLOWED_PRODUCTS.has(String(product || ''));
}

function getUserId() {
  let id = localStorage.getItem('userId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('userId', id);
  }
  return id;
}

function unlockProduct(product) {
  // IMPORTANT: Only call this after /capture-order verifies payment.
  if (!isAllowedProduct(product)) {
    console.warn('Refusing to unlock unknown product', product);
    return;
  }

  if (product === 'remove_ads') {
    localStorage.setItem('no_ads', 'true');
    hidePurchasedAds();
    return;
  }

  if (product === 'income_boost') {
    localStorage.setItem('dem_upgrade_income_boost', 'true');
    return;
  }

  if (product === 'power_calm_mode') {
    localStorage.setItem('dem_boost_calm_pending', '1');
    return;
  }

  if (product === 'power_double_earnings') {
    localStorage.setItem('dem_boost_double_earnings_pending', '1');
    return;
  }

  if (product === 'cosmetic_desk_skin') {
    localStorage.setItem('dem_cosmetic_desk_skin', 'true');
    return;
  }
}

function readContinueCredits() {
  const raw = localStorage.getItem('credit');
  return Math.max(0, Number.parseInt(String(raw || '0'), 10) || 0);
}

function writeContinueCredits(n) {
  const safe = Math.max(0, Number(n || 0));
  localStorage.setItem('credit', String(safe));
}

function setVerifiedPurchaseUxFlags() {
  try {
    localStorage.setItem('dem.lastVerifiedPurchase', String(Date.now()));
  } catch {
    // ignore
  }
}

function readReceiptLog() {
  try {
    const raw = localStorage.getItem('dem.purchaseReceipts');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeReceiptLog(receipts) {
  try {
    localStorage.setItem('dem.purchaseReceipts', JSON.stringify(receipts.slice(0, 10)));
  } catch {
    // ignore
  }
}

function pushReceipt({ product, orderID, captureId }) {
  const entry = {
    product: String(product || ''),
    orderID: String(orderID || ''),
    captureId: String(captureId || ''),
    timestamp: Date.now()
  };
  const receipts = readReceiptLog();
  receipts.unshift(entry);
  writeReceiptLog(receipts);
}

function hidePurchasedAds() {
  document.documentElement.classList.add('no-ads-purchase');
  document.body.classList.add('no-ads-purchase');
  const selectors = [
    '[data-ad-slot]',
    '[data-ad]',
    '.adsense',
    '.adsense-slot',
    '.ad-slot',
    '.ad-container',
    '.adsterra',
    '.ad-banner',
    '.site-ad'
  ];
  selectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      try {
        el.setAttribute('hidden', '');
        el.setAttribute('aria-hidden', 'true');
        el.style.display = 'none';
      } catch {
        // ignore
      }
    });
  });
}

function isFailureUiPresent() {
  return Boolean(
    document.getElementById('failure-store') ||
      document.getElementById('failure-screen') ||
      document.querySelector('.failure-screen')
  );
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderProductCard(productId, options = {}) {
  const p = getProduct(productId);
  if (!p) return '';
  const featured = Boolean(options.featured);
  const ribbon = options.ribbon ? escapeHtml(options.ribbon) : '';
  const badge =
    !options.hideProductBadge && p.highlightBadge
      ? `<span class="dem-card-badge">${escapeHtml(p.highlightBadge)}</span>`
      : '';
  const savings = p.savingsNote ? `<p class="dem-card-savings">${escapeHtml(p.savingsNote)}</p>` : '';

  return `
    <article class="dem-product-card${featured ? ' is-featured' : ''}" data-product-wrap="${escapeHtml(p.id)}">
      ${ribbon ? `<div class="dem-card-ribbon">${ribbon}</div>` : ''}
      <div class="dem-card-head">
        <h4>${escapeHtml(p.title)}</h4>
        ${badge}
      </div>
      <p class="dem-card-desc">${escapeHtml(p.description)}</p>
      ${savings}
      <div class="dem-card-foot">
        <span class="dem-card-price">${escapeHtml(p.priceLabel)}</span>
        <button type="button" class="button button-secondary" data-dem-checkout-btn data-product="${escapeHtml(p.id)}">Buy</button>
      </div>
    </article>
  `;
}

function buildStoreHtml() {
  const featuredHtml = FEATURED_PRODUCTS.map((f) => {
    const p = getProduct(f.productId);
    if (!p) return '';
    return renderProductCard(f.productId, { featured: true, ribbon: f.ribbon, hideProductBadge: true });
  }).join('');

  const sectionsHtml = STORE_SECTIONS.map((section) => {
    const cards = section.productIds.map((id) => renderProductCard(id)).join('');
    return `
      <section class="dem-store-section" aria-label="${escapeHtml(section.title)}">
        <h3>${escapeHtml(section.title)}</h3>
        <p class="dem-section-desc">${escapeHtml(section.description)}</p>
        <div class="dem-product-grid" role="list">
          ${cards}
        </div>
      </section>
    `;
  }).join('');

  return `
    <div id="paypal-modal">
      <div class="modal-content dem-store-shell">
        <h2 class="dem-store-hero">Support Dead End Motel</h2>
        <p class="dem-store-sub">Thank you for supporting development. Everything here is optional — the full campaign stays playable without spending.</p>
        <p class="dem-store-trust">Purchases are verified securely through PayPal before anything unlocks.</p>
        <p class="dem-store-delivery">Digital items are delivered instantly after successful verification (stored locally on this device for receipts).</p>
        <div id="paypal-status" aria-live="polite"></div>

        <p class="dem-store-note">Make sure you want to continue before purchasing.</p>
        <label class="dem-terms-row">
          <input id="dem-terms-accept-store" type="checkbox" />
          <span>I understand this is a digital purchase and is non-refundable after successful delivery.</span>
        </label>

        <div class="dem-featured">
          <h3>Featured</h3>
          <p class="dem-featured-intro muted">
            Best for long runs (×10) and a practical backup (×3). Compare savings in each card — no hidden timers, no fake scarcity.
          </p>
          <div class="dem-featured-grid" role="list">
            ${featuredHtml}
          </div>
        </div>

        ${sectionsHtml}

        <div id="dem-purchase-history" class="dem-purchase-history muted"></div>
        <button id="close-paypal" type="button" class="button button-secondary dem-store-close">Close</button>
      </div>
    </div>
  `;
}

function applyVerifiedPurchase(product) {
  console.log('Unlocking product', product);
  if (!isAllowedProduct(product)) return false;

  if (isContinueProduct(product)) {
    console.log('Applying paid continue');
    const grant = continueCreditsGranted(product);
    const prevCredits = readContinueCredits();
    writeContinueCredits(prevCredits + grant);

    const resume =
      typeof window.deadEndMotelUsePaidContinue === 'function'
        ? window.deadEndMotelUsePaidContinue()
        : false;

    if (resume) {
      const nowCredits = readContinueCredits();
      writeContinueCredits(Math.max(0, nowCredits - 1));
      console.log('Paid continue resumed game');
      const finalCredits = readContinueCredits();
      setStatus(`Payment verified. Continuing current night… ${finalCredits} credit${finalCredits !== 1 ? 's' : ''} remaining.`);
      refreshDemActiveEffects();
      return true;
    }

    if (isFailureUiPresent()) {
      const totalNow = readContinueCredits();
      setStatus(
        `Payment verified. ${grant} Continue Credit${grant > 1 ? 's' : ''} delivered — you now have ${totalNow}. Use them from the Continue overlay after your next failure.`
      );
      console.warn('Paid continue could not resume after verified capture.');
      refreshDemActiveEffects();
      return true;
    }

    const totalNow = readContinueCredits();
    setStatus(`Payment verified. ${grant} Continue Credit${grant > 1 ? 's' : ''} delivered. You now have ${totalNow} Continue Credit${totalNow !== 1 ? 's' : ''}.`);
    refreshDemActiveEffects();
    return true;
  }

  if (product === 'remove_ads') {
    unlockProduct(product);
    setStatus('Payment verified. Supporter Clean Mode active — future ad slots will stay hidden on this browser.');
    refreshDemActiveEffects();
    return true;
  }

  if (product === 'income_boost') {
    unlockProduct(product);
    setStatus('Payment verified. Income Boost is now active — CA$8 bonus applies after each completed shift.');
    refreshDemActiveEffects();
    return true;
  }

  if (product === 'power_calm_mode') {
    unlockProduct(product);
    setStatus('Payment verified. Calm Mode saved for your next shift — pressure spikes will be reduced.');
    refreshDemActiveEffects();
    return true;
  }

  if (product === 'power_double_earnings') {
    unlockProduct(product);
    setStatus('Payment verified. Double Earnings saved for your next successful shift — bonus payout at dawn.');
    refreshDemActiveEffects();
    return true;
  }

  if (product === 'cosmetic_desk_skin') {
    unlockProduct(product);
    setStatus('Payment verified. Desk Skin unlocked.');
    refreshDemActiveEffects();
    return true;
  }

  unlockProduct(product);
  setStatus('Payment verified. Purchase applied.');
  return true;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

function $(id) {
  return document.getElementById(id);
}

function setStatus(msg) {
  const el = $('paypal-status');
  if (el) el.textContent = msg || '';
}

function clearPaypalRoot() {
  const root = $('paypal-root');
  if (!root) return;
  root.onclick = null;
  root.innerHTML = '';
}

function setPurchaseButtonsDisabled(disabled) {
  document.querySelectorAll('[data-dem-checkout-btn]').forEach((el) => {
    try {
      el.disabled = Boolean(disabled);
      el.setAttribute('aria-disabled', Boolean(disabled) ? 'true' : 'false');
      el.classList.toggle('is-disabled', Boolean(disabled));
    } catch {
      // ignore
    }
  });

  const sup = $('support-store-btn');
  if (sup) {
    try {
      sup.disabled = Boolean(disabled);
      sup.setAttribute('aria-disabled', Boolean(disabled) ? 'true' : 'false');
      sup.classList.toggle('is-disabled', Boolean(disabled));
    } catch {
      // ignore
    }
  }
}

function closePaypalModal() {
  try {
    _activeButtons?.close?.();
  } catch {
    // ignore
  }
  _activeButtons = null;
  window.__demCheckoutActive = false;
  setPurchaseButtonsDisabled(false);
  clearPaypalRoot();
}

function mountPaypalModal() {
  clearPaypalRoot();
  const root = $('paypal-root');
  if (!root) return;

  root.innerHTML = `
    <div id="paypal-modal">
      <div class="modal-content">
        <h2>Complete Purchase</h2>
        <div id="paypal-status" aria-live="polite"></div>
        <div id="paypal-button-container"></div>
        <button id="close-paypal" type="button">Close</button>
      </div>
    </div>
  `;

  const modal = $('paypal-modal');
  modal?.classList.add('is-open');

  $('close-paypal')?.addEventListener('click', () => {
    closePaypalModal();
  });

  window.addEventListener(
    'keydown',
    (ev) => {
      if (ev.key === 'Escape') closePaypalModal();
    },
    { once: true }
  );
}

function renderPurchaseHistory(host) {
  if (!host) return;
  const receipts = readReceiptLog();
  if (!receipts.length) {
    host.innerHTML = `<strong>Purchase History</strong><div style="margin-top:6px;">No purchases on this device yet.</div>`;
    return;
  }
  const rows = receipts.slice(0, 10).map((r) => {
    const when = new Date(Number(r.timestamp || 0)).toLocaleString();
    const p = String(r.product || '');
    const o = String(r.orderID || '').slice(0, 10);
    const c = String(r.captureId || '').slice(0, 10);
    return `<div style="margin-top:6px;">${escapeHtml(when)} — <strong>${escapeHtml(p)}</strong><div style="opacity:.9;">Order: ${escapeHtml(o)}… · Capture: ${escapeHtml(c)}…</div></div>`;
  });
  host.innerHTML = `<strong>Purchase History</strong>${rows.join('')}`;
}

function openStoreModal() {
  console.log('Opening global store');
  clearPaypalRoot();
  const root = $('paypal-root');
  if (!root) return;

  root.innerHTML = buildStoreHtml();

  const modal = $('paypal-modal');
  modal?.classList.add('is-open');

  $('close-paypal')?.addEventListener('click', () => {
    closePaypalModal();
  });

  const termsBox = $('dem-terms-accept-store');
  const productButtons = root.querySelectorAll('button[data-product]');

  function syncStoreTermsGate() {
    const ok = Boolean(termsBox?.checked);
    productButtons.forEach((btn) => {
      btn.disabled = !ok;
    });
  }

  termsBox?.addEventListener('change', syncStoreTermsGate);
  syncStoreTermsGate();

  renderPurchaseHistory($('dem-purchase-history'));

  root.onclick = (ev) => {
    const btn = ev.target?.closest?.('button[data-product]');
    if (!btn) return;
    if (!termsBox?.checked) return;
    const pid = btn.getAttribute('data-product');
    console.log('Store product selected', { product: pid });
    console.log('Starting checkout from store');
    beginCheckout(pid);
  };

  window.addEventListener(
    'keydown',
    (ev) => {
      if (ev.key === 'Escape') closePaypalModal();
    },
    { once: true }
  );
}

window.openDeadEndMotelStore = function openDeadEndMotelStore() {
  openStoreModal();
};

function ensurePaypalLoaded() {
  return typeof window.paypal?.Buttons === 'function';
}

async function beginCheckout(product) {
  if (window.__demCheckoutActive) return;
  if (!product) return;
  if (!isAllowedProduct(product)) return;

  if (product === 'continue_pack_1' || product === 'continue_credit') {
    console.log('Paid continue selected', { product });
  }

  window.__demCheckoutActive = true;
  setPurchaseButtonsDisabled(true);

  mountPaypalModal();
  setStatus('Opening secure checkout...');

  if (!ensurePaypalLoaded()) {
    setStatus('PayPal failed to load. Please refresh and try again.');
    window.__demCheckoutActive = false;
    setPurchaseButtonsDisabled(false);
    return;
  }

  console.log('Creating order');
  setStatus('Creating order…');

  const create = await postJson(`${API_BASE_URL}/create-order`, { product });
  const orderID = create?.data?.orderID || create?.data?.id || create?.data?.orderId;

  if (!create.ok || !orderID) {
    setStatus('Could not create order. Please try again.');
    window.__demCheckoutActive = false;
    setPurchaseButtonsDisabled(false);
    return;
  }

  console.log('Order created', { orderID, product });
  setStatus('Order created. Complete payment with PayPal below.');

  const btnHost = $('paypal-button-container');
  if (!btnHost) {
    window.__demCheckoutActive = false;
    setPurchaseButtonsDisabled(false);
    return;
  }

  btnHost.innerHTML = '';

  _activeButtons = window.paypal.Buttons({
    createOrder: () => orderID,

    onApprove: async (data) => {
      console.log('Approved', { orderID: data?.orderID });
      console.log('Calling capture');
      setStatus('Verifying payment…');

      const capture = await postJson(`${API_BASE_URL}/capture-order`, {
        orderID: data.orderID,
        userId: getUserId()
      });

      const result = capture.data;
      const summary = {
        ok: result?.ok,
        product: result?.product,
        orderID: result?.orderID,
        captureId: result?.captureId
      };
      console.log('Capture result', summary);

      const verified =
        result?.ok === true &&
        result?.product === product &&
        Boolean(result?.orderID) &&
        Boolean(result?.captureId) &&
        String(result.orderID) === String(data.orderID) &&
        String(result.orderID) === String(orderID);

      if (!verified) {
        console.warn('Verification mismatch', result);
        setStatus('Payment verification failed. Please contact support.');
        window.__demCheckoutActive = false;
        setPurchaseButtonsDisabled(false);
        return;
      }

      setVerifiedPurchaseUxFlags();
      pushReceipt({ product, orderID: result.orderID, captureId: result.captureId });

      const applied = applyVerifiedPurchase(product);
      if (!applied) {
        window.__demCheckoutActive = false;
        setPurchaseButtonsDisabled(false);
        return;
      }

      window.setTimeout(() => closePaypalModal(), 900);
    },

    onCancel: () => {
      setStatus('Payment cancelled.');
      window.__demCheckoutActive = false;
      setPurchaseButtonsDisabled(false);
    },

    onError: () => {
      setStatus('PayPal error. Please try again.');
      window.__demCheckoutActive = false;
      setPurchaseButtonsDisabled(false);
    }
  });

  _activeButtons.render('#paypal-button-container');
}

function refreshFailurePurchaseUi() {
  const failureScreen = document.getElementById('failure-screen');
  const active = Boolean(failureScreen?.classList.contains('active'));

  const ctx =
    typeof window.deadEndMotelGetFailureContext === 'function' ? window.deadEndMotelGetFailureContext() : null;
  if (ctx) {
    console.log('Failure monetization context', {
      progressPercent: ctx.progressPercent,
      night: ctx.night,
      nearWin: ctx.nearWin,
      suggestedProduct: ctx.suggestedProduct,
      savedCredits: ctx.savedCredits,
      reason: ctx.reason
    });
  }

  const emotional = $('failure-emotional-line');
  const subline = $('failure-context-subline');
  const creditsReady = $('failure-credits-ready-line');
  const buy3Label = $('failure-buy-3-price-label');
  const p1 = getProduct('continue_pack_1');
  const p3 = getProduct('continue_pack_3');
  if (buy3Label && p3) buy3Label.textContent = p3.priceLabel;

  const cred = Number(ctx?.savedCredits ?? readContinueCredits() ?? 0) || 0;

  if (emotional && active) {
    if (cred > 0) {
      emotional.textContent = 'You have saved Continue Credits ready.';
    } else if (ctx?.nearWin) {
      emotional.textContent = 'You were so close to dawn.';
    } else {
      emotional.textContent = 'The motel broke before the night could stabilize.';
    }
  }

  if (subline) {
    if (active && ctx?.nearWin && cred === 0) {
      subline.hidden = false;
      subline.textContent =
        'You made real progress this shift — a Continue restores tonight’s opening snapshot so you can try again without replaying the whole run.';
    } else {
      subline.hidden = true;
      subline.textContent = '';
    }
  }

  if (creditsReady) {
    if (active && cred > 0) {
      creditsReady.hidden = false;
      creditsReady.innerHTML = `Saved credits: <strong id="failure-credits-count">${cred}</strong> (each successful Continue uses 1).`;
    } else {
      creditsReady.hidden = true;
      creditsReady.textContent = '';
    }
  }

  const savedBtn = $('use-saved-credit-btn');
  const paidBtn = $('buy-continue-btn');
  const bundleHint = $('failure-bundle-hint');

  if (savedBtn) {
    if (active && cred > 0) {
      savedBtn.hidden = false;
      savedBtn.textContent = `Continue with saved credit (×${cred})`;
      savedBtn.classList.add('failure-cta-main');
    } else {
      savedBtn.hidden = true;
      savedBtn.classList.remove('failure-cta-main');
    }
  }

  if (paidBtn) {
    if (active && cred === 0) {
      paidBtn.hidden = false;
      paidBtn.classList.add('failure-cta-main');
      const label = escapeHtml(p1?.priceLabel || 'CA$0.99');
      paidBtn.innerHTML = `Continue instantly — <span id="buy-continue-price-label">${label}</span>`;
    } else {
      paidBtn.hidden = true;
      paidBtn.classList.remove('failure-cta-main');
    }
  }

  if (bundleHint) {
    if (active && cred === 0) {
      bundleHint.hidden = false;
      if (ctx?.nearWin) console.log('Bundle suggested', { context: 'failure_screen_near_win' });
    } else {
      bundleHint.hidden = true;
    }
  }
}

window.refreshDemFailureMonetization = refreshFailurePurchaseUi;

function ensureDemEffectsStrip() {
  let strip = document.getElementById('dem-active-effects-strip');
  if (!strip) {
    strip = document.createElement('p');
    strip.id = 'dem-active-effects-strip';
    strip.className = 'dem-active-effects-strip';
    strip.setAttribute('aria-live', 'polite');
    strip.hidden = true;
    const anchor = document.getElementById('active-upgrades-inline');
    if (anchor) anchor.insertAdjacentElement('afterend', strip);
  }
  return strip;
}

function refreshDemActiveEffects() {
  const strip = ensureDemEffectsStrip();
  if (!strip) return;

  const parts = [];
  try {
    const credits = readContinueCredits();
    if (credits > 0) parts.push(`Continue Credits: ×${credits}`);

    if (localStorage.getItem('dem_boost_calm_pending') === '1') {
      parts.push('Calm Mode: ready for next shift');
    } else if (window.demCalmModeActive) {
      parts.push('Calm Mode: active this shift');
    }

    if (localStorage.getItem('dem_boost_double_earnings_pending') === '1') {
      parts.push('Double Earnings: ready for next successful shift');
    }
    if (localStorage.getItem('dem_upgrade_income_boost') === 'true') {
      parts.push('Income Boost: +CA$8 per successful night');
    }
    if (localStorage.getItem('no_ads') === 'true') {
      parts.push('Supporter Clean Mode: active');
    }
  } catch {
    // ignore localStorage errors
  }

  if (parts.length === 0) {
    strip.hidden = true;
    strip.textContent = '';
  } else {
    strip.hidden = false;
    strip.textContent = `Active: ${parts.join(' · ')}`;
  }
}

window.refreshDemActiveEffects = refreshDemActiveEffects;

function attemptSavedContinue() {
  if (window.__demCheckoutActive) return;
  console.log('Saved continue clicked');
  window.__demCheckoutActive = true;
  setPurchaseButtonsDisabled(true);

  const fn = window.deadEndMotelUseSavedContinue;
  const ok = typeof fn === 'function' ? Boolean(fn()) : false;

  window.__demCheckoutActive = false;
  setPurchaseButtonsDisabled(false);
  refreshFailurePurchaseUi();

  if (!ok) {
    alert('No saved Continue credits available, or the night could not be resumed.');
  }
}

function bindUi() {
  const failureTerms = $('dem-terms-accept-failure');
  const failureRemoveAds = $('buy-remove-ads-btn');
  const failureContinue = $('buy-continue-btn');
  const failureSaved = $('use-saved-credit-btn');
  const failureBuy3 = $('failure-buy-continue-3-btn');

  function syncFailureTermsGate() {
    const ok = Boolean(failureTerms?.checked);
    if (failureRemoveAds) failureRemoveAds.disabled = !ok;
    if (failureContinue) failureContinue.disabled = !ok;
    if (failureBuy3) failureBuy3.disabled = !ok;
  }

  failureTerms?.addEventListener('change', syncFailureTermsGate);
  syncFailureTermsGate();

  failureRemoveAds?.addEventListener('click', () => beginCheckout('remove_ads'));
  failureContinue?.addEventListener('click', () => {
    console.log('Paid continue selected', { product: 'continue_pack_1' });
    beginCheckout('continue_pack_1');
  });
  failureBuy3?.addEventListener('click', () => {
    console.log('Bundle suggested', { product: 'continue_pack_3', source: 'failure_screen' });
    beginCheckout('continue_pack_3');
  });
  failureSaved?.addEventListener('click', () => attemptSavedContinue());

  $('support-store-btn')?.addEventListener('click', (ev) => {
    console.log('Support store clicked');
    ev?.preventDefault?.();
    try {
      if (location.hash === '#failure-store') history.replaceState(null, '', location.pathname + location.search);
    } catch {
      // ignore
    }
    window.openDeadEndMotelStore?.();
  });

  const fs = document.getElementById('failure-screen');
  if (fs) {
    const mo = new MutationObserver(() => refreshFailurePurchaseUi());
    mo.observe(fs, { attributes: true, attributeFilter: ['class'] });
  }
  refreshFailurePurchaseUi();
  refreshDemActiveEffects();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindUi);
} else {
  bindUi();
}
