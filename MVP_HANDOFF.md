# FoodCart MVP tracker

The single source of truth for V1 work. Every session (human or Claude) reads this first and updates it in the same commit as the work.

**How to use it**
- Work happens on `storefront-development`. Optionally use a short-lived branch per step and merge it back; remove the branch line from here once merged.
- Tick a box only after the change is on `storefront-development` **and** verified. Add the commit hash and one line saying how it was verified.
- New findings go under the step they belong to, as unchecked items. Don't keep them in chat or in separate notes files.
- Decisions go in **Decisions**, with a date. Open questions go in **Open questions** until decided.
- Items are numbered (`S2.3`). Reference the number in commit messages.

Legend: `[ ]` to do · `[~]` in progress · `[x]` done · **⛔ blocks** = must be finished before the item it names.

Last updated: Oct 9, 2026.

---

## Decisions
- **V1** (Oct 9): street-food **pickup and dine-in** orders, **paid online before the order reaches the vendor**. Delivery and Subscribe hidden behind a flag, not deleted.
  - Dine-in (decided Oct 9): **no note**. The customer only picks Pick Up or Dine In; table/spot details are sorted face to face or over a call. `dineInNote` was removed. Pay-first for both modes.
  - Vendor app shows Pickup vs Dine-in on each order card and on the order details screen.
- **V2:** self-delivery + simple daily subscriptions.
- **V3:** third-party delivery (Porter / Uber / Rapido). Check which of these actually offer an API in India before promising V3.
- **Payments** (Oct 9): online payment in V1 via Razorpay (UPI + cards).
  - Flow: server creates the order in `PAYMENT_PENDING` plus a Razorpay order → customer pays → server verifies the checkout signature **and** the `payment.captured` webhook → order becomes `PLACED` and only then shows in the vendor app.
  - Rejected or cancelled orders are refunded automatically via the Razorpay refund API.
  - Unpaid orders expire after ~15 minutes.
- **Branching** (Oct 9): `storefront-development` is the working branch.

## Open questions
- [ ] **Payout model: Razorpay Route vs collecting centrally.** Leaning Route: collecting customers' money and settling vendors by hand probably counts as acting as a payment aggregator under RBI rules, which needs a licence. **Confirm with Razorpay or a CA** before building either. With Route, hold each vendor transfer until the vendor accepts the order, so a rejection is a plain refund, not a reversal from the vendor's account.
- [ ] **Can every pilot vendor get a Route linked account?** It needs a PAN and a bank account in the business's name; some street vendors only have a personal savings account or UPI. Ask 3–5 real vendors.
- [ ] **One mobile number for two stalls?** `vendors.mobile` is indexed but not unique, yet vendor login looks vendors up by mobile. If no: make it unique (drop the old `mobile` index first, or startup index creation fails). Tracked as S4.9.
- [ ] SMS/OTP provider (suggested MSG91).
- [ ] Image storage: server disk vs R2/S3.
- [ ] Delete the old Next.js `/vendor` console (duplicates the Expo vendor app)?

## Non-code tasks (start now: these take days)
- [ ] **N1** Razorpay account + KYC (Aks). Approval takes days.
- [ ] **N2** Ask Razorpay whether Route fits a marketplace of small vendors, and what each linked account needs (Aks). Answers the payout question.
- [ ] **N3** SMS provider account + **DLT registration** of the sender ID and OTP template (Aks). Takes days. ⛔ blocks go-live: the API refuses to start outside `local` without an `OtpSender`.
- [ ] **N4** Ask 3–5 pilot vendors about PAN / business bank account (Aks).

---

## Step 1: security ✅ done
On `storefront-development` (`4028c66`, tracker update `763c99e`).

- [x] **S1.1** Real OTP: random 6-digit code stored hashed, 5-minute expiry, 5 wrong attempts, 30s resend gap, 5 sends/hour (`service/otp/*`). `DevOtpSender` (always `123456`) loads only in the `local` profile; any other profile refuses to start without a real `OtpSender`.
- [x] **S1.2** `SeedData`, `DemoData`, `CatalogEnricher` run only in `local` (before, they ran in production and changed real data).
- [x] **S1.3** Public vendor endpoints return `PublicVendor` (no mobile number).
- [x] **S1.4** Uploads: type detected from file bytes, server-chosen extension, absolute URLs via `PUBLIC_BASE_URL`, 5 MB multipart limit.
- [x] **S1.5** `spring.data.mongodb.auto-index-creation: true` (unique slug, customer mobile, session token, plus TTLs were never created).
- [x] **S1.6** Storefront cart "Send OTP" step; vendor app resend timer 30s.

Verified (Oct 9):
- `mvn test`: 21/21 pass.
- No profile → API refuses to start ("No SMS provider is configured").
- `local` profile against a live MongoDB: public vendor JSON has no mobile; OTP verify without a request, resend inside 30s, wrong code, reused code, invalid mobile and unknown vendor all return 400; customer and vendor login return tokens; HTML disguised as an image is rejected, a real PNG is accepted, 6 MB is rejected, a customer token on vendor upload gets 403; all indexes created; placing an order and the customer history endpoints work.
- `tsc`: Step 1 adds no errors. 3 older errors remain (see S4.4).

Follow-ups:
- [ ] **S1.7** Click through the OTP screens by hand in the storefront and the vendor app.
- [ ] **S1.8** Implement the chosen provider's `OtpSender` (needs N3).
- Notes: the API needs MongoDB reachable at startup (index creation runs on boot). Unknown-vendor OTP requests reveal whether a number belongs to a vendor; accepted as low risk.

## Step 2: ordering flow and payments
Order matters: **S2.1 and S2.2 ⛔ block S2.3**.

- [x] **S2.1** Customer sees exactly what the server charges (commit tagged `S2.1`, Oct 9). Removed the placeholder 5% tax and ₹20 delivery fee from `Cart.tsx`; the bill is the item total. The storefront sends `displayedTotal` with the order, and `CheckoutService` refuses the order (400 "Your cart total has changed") if it is missing or differs from the server's total after rounding to paise. S2.3 must charge Razorpay `order.total` from the server, never an amount from the browser.
  - Verified: `mvn test` 25/25 (new `CheckoutServiceTest`: exact total accepted, float noise tolerated, wrong or missing total refused with nothing saved). In a real browser against the `local` API: a cart of Veg Momos + Egg Roll shows ₹150 in the bill and pay bar (the old code showed ₹158), sends `displayedTotal: 150`, and the confirmation shows ₹150. Over HTTP: total 70 → 200, 73.5 → 400, missing → 400.
  - When V1 needs real taxes or fees, add them in `CheckoutService` and return them in a quote endpoint the cart displays, so the browser never computes charges.
- [x] **S2.2** Real order type (commit tagged `S2.2`, Oct 9). `OrderType` enum (`PICKUP` | `DINE_IN`) on the server; anything else (`DELIVERY`, lowercase, empty, missing) is refused with "Choose Pick Up or Dine In." The cart sends the mode the customer picked. Delivery and Subscribe are hidden by `frontend/app/lib/features.ts` (both `false`), not deleted; with delivery on, the cart sends `DELIVERY`, which the server refuses until V2. `dineInNote` removed everywhere. Confirmation page says "Dine in at" / "Pick up from". Vendor app details screen shows "Dine-in"/"Pickup" instead of the raw value.
  - Verified: `mvn test` 27/27 (new: type stored; bad types refused, nothing saved). `tsc` + `next build` clean. Browser: cart shows only Pick Up / Dine In and no One-Time/Subscribe row; a Dine In order is sent as `DINE_IN` with no note; vendor app (web build) shows Pickup and Dine-in on the order cards and on the details screen; `/api/vendor/orders` returns the types with no `dineInNote`.
- [ ] **S2.8** The cart's **Slot** picker (pickup time) is never sent: the order has no time field and the vendor can't see it. Decide: send it and show it to the vendor, or hide it for V1 (orders are then "as soon as possible").
- [ ] **S2.3** Razorpay payment: `PAYMENT_PENDING` status; create-payment endpoint; checkout signature verification; `payment.captured` webhook (unauthenticated endpoint, HMAC checked against the **raw** request body); `PLACED` only after capture; refunds on reject/cancel; expire unpaid orders after ~15 min; vendor app hides unpaid orders. Rename the "Pay" flow to real checkout. Keys only in environment variables, never in the repo (it is public). Payout part waits on the payout open question.
- [ ] **S2.4** Cart keyed by item id: Half + Full of one item collapse into one line. Key by item + chosen options.
- [ ] **S2.5** Vendors can only use 4 global categories (Momos/Rolls/Drinks/Chaat) via `MenuItemService.catalogCategoryId`. Let vendors create their own.
- [ ] **S2.6** Remember the customer's session so repeat orders don't need a new OTP.
- [ ] **S2.7** Customer order-status page (Paid → Accepted → Preparing → Ready/Served) by polling; a WhatsApp message is better later.

## Step 3: vendor never misses an order
- [ ] **S3.1** Vendor app only refreshes on focus or pull-to-refresh. Poll every 10–15s with a sound, then push notifications.
- [ ] **S3.2** Allow cancelling an order after it's accepted (transitions in `CheckoutService.status`), with the S2.3 refund.

## Step 4: polish and deploy
- [ ] **S4.1** Order number is `1000 + orders.count() + 1` (`CheckoutService`): global and can collide. Use a per-vendor atomic daily counter.
- [ ] **S4.2** CORS `allowedMethods` lacks `DELETE` (`CorsConfig`).
- [ ] **S4.3** `NoSuchElementException` returns 500. A bad store link stays on "Loading…" forever. Show a closed-vendor banner.
- [x] **S4.4** Type errors now fail the build (commit tagged `S4.4`, Oct 9). Removed `ignoreBuildErrors` from `next.config.mjs`; fixed the last 2 errors (`CategoryMenu.tsx` and `vendor/page.tsx`: hoisted function declarations lost a null check, now arrow functions).
  - Verified: `tsc` clean; `next build` passes; a deliberately planted type error makes `next build` fail ("Failed to compile"), then removed.
- [ ] **S4.5** Backend Dockerfile, MongoDB Atlas, HTTPS. Vendor app on the web uses `window.location.origin` for the API.
- [ ] **S4.6** One brand: "FoodCart" vs "Supr-Mama".
- [ ] **S4.7** Remove dead `OrderService` (unused duplicate of `CheckoutService`).
- [ ] **S4.8** Per-IP rate limit on `/api/auth/*` (reverse proxy or app). ⛔ blocks go-live: the per-number limits alone still let one attacker spend SMS credits on any number.
- [ ] **S4.9** Make `vendors.mobile` unique if the open question says one number = one stall.
- [ ] **S4.10** Repo `amitranjan2/food-cart` is **public**. Decide whether to make it private; either way, no secrets in the repo.
- [x] **S4.11** Storefront home header cut off and search bar missing (commit tagged `S4.11`, Oct 9). Cause: merge `f32aaa8` kept `StoreHeader.tsx` from 6f6791c (search split into `StoreSearch`) but `page.tsx` from a20e15b (which never renders it), so `.store-body`'s `margin-top:-22px` slid over the header. Fix: render `StoreSearch` under the header; removed its unused window-scroll pinning (the page scrolls `.storefront`, and CSS `position: sticky` already pins it).
  - Verified in a browser at 400px: header 0–58px with the title inside; search bar 58–130px; after scrolling 700px the search bar is pinned at 0; searching "roll" filters the menu; the S2.1 checkout still works (₹150 cart → ₹150 order).
  - Lesson: when merging both sides' edits to `page.tsx`, run `tsc` before committing.
- [ ] **S4.13** Vendor app has 8 older type errors, all in `screens/Menu/DishFormSheet.tsx` (web-only styles such as `outlineStyle: 'none'` that React Native's types reject). Not caught by any build. Fix them and add a `tsc` check for the vendor app.
- [x] **S4.12** Audit of merge `f32aaa8` (device 1 `aakashyadav-26` 6f6791c + device 2 `aakashyadav-kgp` a20e15b, both Oct 8). Result: the merge equals device 2's code, plus 3 device-1 files. Vendor app: identical to device 2.
  - `StoreHeader.tsx`: broke the home header. Fixed in S4.11.
  - `lib/customization.ts`: device 1's `requiresCustomization` / `defaultConfiguration` were unused, and `defaultConfiguration` would select nothing because device 2 changed `initialSelection`. Removed (commit tagged `S4.12`).
  - `MenuItemCard.tsx`: adds an unused `id="menu-item-…"`. Harmless, kept.
  - Device-1 work that was **dropped** because device 2 rebuilt the same feature differently (current behaviour is device 2's): item customiser scroll header (device 1: smooth morph into a fixed compact header; device 2: snap to a stacked bar + red highlight on missing required choices); category menu visibility; vendor dish form focus/error styling and pinned title. Bring back a device-1 version only by decision, from 6f6791c.
