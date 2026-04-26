const API_BASE_URL = 'https://steep-boat-15e1.artinkarshad.workers.dev';

let _activeButtons = null;
window.__demCheckoutActive = window.__demCheckoutActive === true;

const ALLOWED_PRODUCTS = new Set(['remove_ads', 'continue_credit']);

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

async function applyVerifiedPurchase(product, verifiedResult) {
  console.log('Unlocking product', product);
  if (!isAllowedProduct(product)) return false;

  if (product === 'continue_credit') {
    console.log('Applying paid continue');

    const prevCredits = readContinueCredits();
    writeContinueCredits(prevCredits + 1);

    const resume =
      typeof window.deadEndMotelUsePaidContinue === 'function'
        ? window.deadEndMotelUsePaidContinue()
        : false;

    if (resume) {
      // Consume exactly one credit only after a successful resume.
      const nowCredits = readContinueCredits();
      writeContinueCredits(Math.max(0, nowCredits - 1));
      console.log('Paid continue resumed game');
      setStatus('Payment verified. Continuing current night...');
      return true;
    }

    if (isFailureUiPresent()) {
      setStatus('Payment verified, but the game could not resume automatically. Your Continue Credit was saved for your next failure.');
      console.warn('Paid continue could not resume after verified capture.');
      return true;
    }

    setStatus('Continue Credit saved. It will be used on your next failure.');
    return true;
  }

  if (product === 'remove_ads') {
    unlockProduct(product);
    return true;
  }

  unlockProduct(product);
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
  root.innerHTML = '';
}

function setPurchaseButtonsDisabled(disabled) {
  const ids = [
    'buy-remove-ads-btn',
    'buy-continue-btn',
    'store-buy-remove-ads',
    'store-buy-continue-credit',
    'support-store-btn'
  ];

  ids.forEach((id) => {
    const el = $(id);
    if (!el) return;
    try {
      el.disabled = Boolean(disabled);
      el.setAttribute('aria-disabled', Boolean(disabled) ? 'true' : 'false');
      el.classList.toggle('is-disabled', Boolean(disabled));
    } catch {
      // ignore
    }
  });
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

function openStoreModal() {
  console.log('Opening global store');
  clearPaypalRoot();
  const root = $('paypal-root');
  if (!root) return;

  root.innerHTML = `
    <div id="paypal-modal">
      <div class="modal-content">
        <h2>Support Dead End Motel</h2>
        <div id="paypal-status" aria-live="polite"></div>
        <p class="muted" style="margin: 0; line-height: 1.45;">Make sure you want to continue before purchasing.</p>
        <label class="muted" style="display:flex; gap:10px; align-items:flex-start; margin: 10px 0 0; line-height: 1.35;">
          <input id="dem-terms-accept-store" type="checkbox" />
          <span>I understand this is a digital purchase and is non-refundable after successful delivery.</span>
        </label>
        <div class="store-actions" style="display:grid;gap:10px;margin-top:10px;">
          <button id="store-buy-remove-ads" type="button">Remove Ads (CA$1.99)</button>
          <button id="store-buy-continue-credit" type="button">Continue Credit (CA$0.99)</button>
        </div>
        <div id="dem-purchase-history" class="muted" style="margin-top: 12px;"></div>
        <button id="close-paypal" type="button">Close</button>
      </div>
    </div>
  `;

  const modal = $('paypal-modal');
  modal?.classList.add('is-open');

  $('close-paypal')?.addEventListener('click', () => {
    closePaypalModal();
  });

  const termsBox = $('dem-terms-accept-store');
  const storeRemoveAds = $('store-buy-remove-ads');
  const storeContinue = $('store-buy-continue-credit');

  function syncStoreTermsGate() {
    const ok = Boolean(termsBox?.checked);
    if (storeRemoveAds) storeRemoveAds.disabled = !ok;
    if (storeContinue) storeContinue.disabled = !ok;
  }

  termsBox?.addEventListener('change', syncStoreTermsGate);
  syncStoreTermsGate();

  const historyHost = $('dem-purchase-history');
  if (historyHost) {
    const receipts = readReceiptLog();
    if (!receipts.length) {
      historyHost.innerHTML = `<strong>Purchase History</strong><div style="margin-top:6px;">No purchases on this device yet.</div>`;
    } else {
      const rows = receipts.slice(0, 10).map((r) => {
        const when = new Date(Number(r.timestamp || 0)).toLocaleString();
        const p = String(r.product || '');
        const o = String(r.orderID || '').slice(0, 10);
        const c = String(r.captureId || '').slice(0, 10);
        return `<div style="margin-top:6px;">${when} — <strong>${p}</strong><div style="opacity:.9;">Order: ${o}… · Capture: ${c}…</div></div>`;
      });
      historyHost.innerHTML = `<strong>Purchase History</strong>${rows.join('')}`;
    }
  }

  $('store-buy-remove-ads')?.addEventListener('click', () => {
    console.log('Starting checkout from store');
    beginCheckout('remove_ads');
  });

  $('store-buy-continue-credit')?.addEventListener('click', () => {
    console.log('Starting checkout from store');
    beginCheckout('continue_credit');
  });

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

  window.__demCheckoutActive = true;
  setPurchaseButtonsDisabled(true);
  setStatus('Opening secure checkout...');

  mountPaypalModal();

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

  console.log('Order created', orderID);
  setStatus('Order created. Complete payment with PayPal below.');

  const btnHost = $('paypal-button-container');
  if (!btnHost) return;

  // Clear only the button host (never remove the element while PayPal is active).
  btnHost.innerHTML = '';

  _activeButtons = window.paypal.Buttons({
    createOrder: () => orderID,

    onApprove: async (data) => {
      console.log('Approved');
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

      const applied = await applyVerifiedPurchase(product, result);
      if (!applied) {
        window.__demCheckoutActive = false;
        setPurchaseButtonsDisabled(false);
        return;
      }

      if (product !== 'continue_credit') {
        setStatus('Payment verified. Purchase applied.');
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

function bindUi() {
  const failureTerms = $('dem-terms-accept-failure');
  const failureRemoveAds = $('buy-remove-ads-btn');
  const failureContinue = $('buy-continue-btn');

  function syncFailureTermsGate() {
    const ok = Boolean(failureTerms?.checked);
    if (failureRemoveAds) failureRemoveAds.disabled = !ok;
    if (failureContinue) failureContinue.disabled = !ok;
  }

  failureTerms?.addEventListener('change', syncFailureTermsGate);
  syncFailureTermsGate();

  failureRemoveAds?.addEventListener('click', () => beginCheckout('remove_ads'));
  failureContinue?.addEventListener('click', () => beginCheckout('continue_credit'));

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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindUi);
} else {
  bindUi();
}
