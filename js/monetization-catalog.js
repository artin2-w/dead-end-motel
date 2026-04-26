/**
 * Store catalog (display + product ids sent to /create-order).
 * Backend must return the same `product` string on /capture-order for verification to pass.
 *
 * Cloudflare Worker: extend `/create-order` pricing/SKUs for every id exported here (and mirror in capture).
 * Bundle display: 3-pack and 10-pack are priced below buying the same number of singles.
 *
 * Ethical note: all SKUs are optional convenience / cosmetics — the campaign remains fully playable without purchases.
 */

const SINGLE_CONTINUE_CAD = 0.99;

function cad(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 'CA$0.00';
  return `CA$${v.toFixed(2)}`;
}

export const PRODUCTS = {
  continue_pack_1: {
    id: 'continue_pack_1',
    category: 'continue',
    title: 'Continue ×1',
    description: 'Resume a failed night once. Restores tonight\'s opening snapshot — one credit per continue.',
    priceCad: SINGLE_CONTINUE_CAD,
    priceLabel: cad(SINGLE_CONTINUE_CAD),
    highlightBadge: null,
    savingsNote: null
  },
  continue_pack_3: {
    id: 'continue_pack_3',
    category: 'continue',
    title: 'Continue ×3',
    description: 'Keep backup chances for rough nights. Better per-credit value than buying singles.',
    priceCad: 2.49,
    priceLabel: cad(2.49),
    highlightBadge: 'POPULAR',
    savingsNote: `Save ${cad(3 * SINGLE_CONTINUE_CAD - 2.49)} vs 3 singles`
  },
  continue_pack_10: {
    id: 'continue_pack_10',
    category: 'continue',
    title: 'Continue ×10',
    description: 'Best for long runs and late-night failures. Best per-credit value in the store.',
    priceCad: 6.99,
    priceLabel: cad(6.99),
    highlightBadge: 'BEST VALUE',
    savingsNote: `Save ${cad(10 * SINGLE_CONTINUE_CAD - 6.99)} vs 10 singles`
  },
  power_calm_mode: {
    id: 'power_calm_mode',
    category: 'power',
    title: 'Calm Mode (next shift)',
    description: 'Reduces pressure spikes during your next shift. One-time use — consumed at shift start.',
    priceCad: 0.99,
    priceLabel: cad(0.99),
    highlightBadge: null,
    savingsNote: null
  },
  power_double_earnings: {
    id: 'power_double_earnings',
    category: 'power',
    title: 'Double Earnings (next shift)',
    description: 'Adds a bonus payout after your next successful shift. Consumed once at dawn.',
    priceCad: 1.49,
    priceLabel: cad(1.49),
    highlightBadge: null,
    savingsNote: null
  },
  remove_ads: {
    id: 'remove_ads',
    category: 'permanent',
    title: 'Remove Ads',
    description: 'Activates Supporter Clean Mode and hides future ad placements where supported. One-time unlock.',
    priceCad: 1.99,
    priceLabel: cad(1.99),
    highlightBadge: null,
    savingsNote: null
  },
  income_boost: {
    id: 'income_boost',
    category: 'permanent',
    title: 'Income Boost',
    description: 'Permanent bonus after successful nights. CA$8 per completed shift — not required for progression.',
    priceCad: 2.99,
    priceLabel: cad(2.99),
    highlightBadge: null,
    savingsNote: null
  },
  cosmetic_desk_skin: {
    id: 'cosmetic_desk_skin',
    category: 'cosmetic',
    title: 'Desk Skin: Night Clerk',
    description: 'Cosmetic style only. No gameplay advantage.',
    priceCad: 0.99,
    priceLabel: cad(0.99),
    highlightBadge: 'Cosmetic',
    savingsNote: null
  },
  /** Legacy id — same credit grant as continue_pack_1; keep for older Worker SKUs. */
  continue_credit: {
    id: 'continue_credit',
    category: 'continue',
    title: 'Continue ×1 (legacy)',
    description: 'Same as Continue ×1. Prefer continue_pack_1 for new storefront listings.',
    priceCad: SINGLE_CONTINUE_CAD,
    priceLabel: cad(SINGLE_CONTINUE_CAD),
    highlightBadge: null,
    savingsNote: null
  }
};

export const FEATURED_PRODUCTS = [
  { productId: 'continue_pack_10', ribbon: 'BEST VALUE' },
  { productId: 'continue_pack_3', ribbon: 'POPULAR' }
];

export const STORE_SECTIONS = [
  {
    key: 'continue',
    title: 'Continue packs',
    description: 'Credits are spent when you continue after a failure — one credit per continue.',
    productIds: ['continue_pack_1', 'continue_pack_3', 'continue_pack_10']
  },
  {
    key: 'power',
    title: 'Power boosts',
    description: 'Optional shift helpers — clearly labeled, never required to finish the game.',
    productIds: ['power_calm_mode', 'power_double_earnings']
  },
  {
    key: 'permanent',
    title: 'Permanent upgrades',
    description: 'One-time unlocks that persist on this device after verified delivery.',
    productIds: ['remove_ads', 'income_boost']
  },
  {
    key: 'cosmetic',
    title: 'Cosmetics',
    description: 'Flair only — fairness first.',
    productIds: ['cosmetic_desk_skin']
  }
];

export function getProduct(productId) {
  return PRODUCTS[String(productId || '')] || null;
}

export function listAllowedProductIds() {
  return Object.keys(PRODUCTS);
}

export function continueCreditsGranted(productId) {
  const id = String(productId || '');
  if (id === 'continue_credit' || id === 'continue_pack_1') return 1;
  if (id === 'continue_pack_3') return 3;
  if (id === 'continue_pack_10') return 10;
  return 0;
}

export function isContinueProduct(productId) {
  return continueCreditsGranted(productId) > 0;
}
