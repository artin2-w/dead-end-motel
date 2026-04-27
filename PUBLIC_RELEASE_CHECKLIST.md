# Dead End Motel — Public Release Checklist (v0.56)

This checklist is for the developer before shipping a public demo build (GitHub Pages / itch.io traffic).

## Payments / Store
- [ ] PayPal LIVE purchase tested end-to-end (remove_ads)
- [ ] PayPal LIVE purchase tested end-to-end (continue_pack_1 / continue_pack_3)
- [ ] Backend verification required (nothing unlocks without `/capture-order ok:true`)
- [ ] PayPal 2FA enabled on merchant account
- [ ] Cloudflare Worker secrets set for LIVE (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV=live`)
- [ ] Purchase history writes (product, orderID, captureId, timestamp) and stores max 10
- [ ] Terms checkbox required before purchase
- [ ] Store never auto-opens
- [ ] Fake rewarded-ad continue overlay disabled in live

## Continue Credits
- [ ] Continue credits add correctly (×1/×3/×10)
- [ ] Saved credit consumes only after successful restore
- [ ] Failure screen CTA shows saved credits first when available

## Replayability / v0.55
- [ ] Shift Contracts selectable from main menu
- [ ] Contract modifiers apply safely and do not break progression
- [ ] Smart store recommendations appear (optional)
- [ ] `dem.playStats` reset does not delete receipts / credits / no_ads / save

## Legal / Trust
- [ ] `privacy.html`, `terms.html`, `contact.html`, `game-guide.html` accessible
- [ ] Privacy mentions local-only stats + local purchase metadata
- [ ] Contact page requests transaction/capture ID for purchase support

## Mobile / UX
- [ ] No horizontal overflow on iPhone/Android widths
- [ ] Store modal scrolls and Close is always reachable
- [ ] Failure screen buttons stack cleanly
- [ ] Contract cards wrap cleanly
- [ ] Tap targets ~44px minimum on key buttons

## Tutorial / Sharing / Daily
- [ ] Tutorial shows on first visit and does not show again after completion/skip
- [ ] “Replay Tutorial” works
- [ ] Failure screen “Copy Result” works (clipboard or fallback toast)
- [ ] Summary screen “Copy Result” works
- [ ] Daily Shift card shows today’s challenge + streak increments once/day
- [ ] Starting Daily Shift does not break normal campaign start

## Ads / Compliance
- [ ] Adsterra scripts remain disabled during AdSense review (if applicable)
- [ ] AdSense verification script present and correct

## Stability
- [ ] No console errors during a basic playthrough
- [ ] Error toast appears on crash and offers Return to Main Menu (does not expose stack traces)

## Known limitations (document before release)
- Daily challenge modifiers are lightweight/partial (safe placeholder)
- Some recommended products are suggestions only; no forced prompts

