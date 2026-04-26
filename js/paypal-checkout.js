const API_BASE_URL = 'https://steep-boat-15e1.artinkarshad.workers.dev';

let _activeButtons = null;

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

async function applyVerifiedPurchase(product) {
  console.log('Unlocking product', product);

  if (product === 'continue_credit') {
    console.log('Applying paid continue');

    const prevCredits = readContinueCredits();
    const nextCredits = prevCredits + 1;
    writeContinueCredits(nextCredits);

    const resume =
      typeof window.deadEndMotelUsePaidContinue === 'function'
        ? window.deadEndMotelUsePaidContinue()
        : false;

    if (!resume) {
      writeContinueCredits(prevCredits);
      setStatus('Payment verified, but game could not resume. Credit was not consumed.');
      console.warn('Paid continue could not resume after verified capture.');
      return false;
    }

    console.log('Paid continue resumed game');
    setStatus('Payment verified. Continuing current night...');
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

function closePaypalModal() {
  try {
    _activeButtons?.close?.();
  } catch {
    // ignore
  }
  _activeButtons = null;
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

function ensurePaypalLoaded() {
  return typeof window.paypal?.Buttons === 'function';
}

async function beginCheckout(product) {
  if (!product) return;

  mountPaypalModal();

  if (!ensurePaypalLoaded()) {
    setStatus('PayPal failed to load. Please refresh and try again.');
    return;
  }

  console.log('Creating order');
  setStatus('Creating order…');

  const create = await postJson(`${API_BASE_URL}/create-order`, { product });
  const orderID = create?.data?.orderID || create?.data?.id || create?.data?.orderId;

  if (!create.ok || !orderID) {
    setStatus('Could not create order. Please try again.');
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
      console.log('Capture result full', result);

      if (result?.ok === true) {
        const applied = await applyVerifiedPurchase(product);
        if (!applied) return;

        if (product === 'continue_credit') {
          // Status already set in applyVerifiedPurchase
        } else {
          setStatus('Payment verified. Purchase applied.');
        }
        window.setTimeout(() => closePaypalModal(), 900);
      } else {
        setStatus('Payment verification failed.');
        alert('Payment verification failed');
      }
    },

    onCancel: () => {
      setStatus('Payment cancelled.');
    },

    onError: () => {
      setStatus('PayPal error. Please try again.');
    }
  });

  _activeButtons.render('#paypal-button-container');
}

function bindUi() {
  $('buy-remove-ads-btn')?.addEventListener('click', () => beginCheckout('remove_ads'));
  $('buy-continue-btn')?.addEventListener('click', () => beginCheckout('continue_credit'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindUi);
} else {
  bindUi();
}
