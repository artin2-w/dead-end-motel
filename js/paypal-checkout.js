const API_BASE_URL = 'https://steep-boat-15e1.artinkarshad.workers.dev';

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
  }
  if (product === 'continue_credit') {
    localStorage.setItem('credit', '1');
  }
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

function $(id) {
  return document.getElementById(id);
}

function setStatus(msg) {
  const el = $('paypal-status');
  if (el) el.textContent = msg || '';
}

function ensurePaypalLoaded() {
  return typeof window.paypal?.Buttons === 'function';
}

async function beginCheckout(product) {
  if (!product) return;

  if (!ensurePaypalLoaded()) {
    setStatus('PayPal failed to load. Please refresh and try again.');
    return;
  }

  setStatus('Creating order…');
  const create = await postJson(`${API_BASE_URL}/create-order`, { product });
  const orderID = create?.data?.orderID || create?.data?.id || create?.data?.orderId;

  if (!create.ok || !orderID) {
    setStatus('Could not create order. Please try again.');
    return;
  }

  setStatus('Ready. Complete payment with PayPal below.');
  const container = $('paypal-container');
  if (!container) return;
  container.innerHTML = '';

  window.paypal.Buttons({
    createOrder: () => orderID,

    onApprove: async (data) => {
      setStatus('Verifying payment…');
      const capture = await postJson(`${API_BASE_URL}/capture-order`, {
        orderID: data.orderID,
        userId: getUserId()
      });

      if (capture.ok && capture?.data?.ok) {
        unlockProduct(product);
        setStatus('Payment verified. Purchase applied.');
        window.setTimeout(() => setStatus(''), 1200);
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
  }).render('#paypal-container');
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

