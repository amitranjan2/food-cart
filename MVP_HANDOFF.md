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
  - Dine-in: customer adds a table/seat/spot note (backend already has `dineInNote`). Pay-first for both modes.
  - Vendor app must show Pickup vs Dine-in plus the note clearly on each order card.
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

- [ ] **S2.1** Bill computed on the server. `Cart.tsx` adds a placeholder 5% tax (`TAX_RATE`) and ₹20 delivery fee (`DELIVERY_FEE`) that the server never charges, so with online payment the customer would see one amount and be charged another. Remove them (or have the server return the bill) and show exactly what the server will charge.
- [ ] **S2.2** Order type as a server-validated enum (`PICKUP` | `DINE_IN`), plus the dine-in note. Gate Subscribe / Delivery behind a flag (the Delivery tab is in `Cart.tsx`).
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
- [ ] **S4.4** `next.config.mjs` has `ignoreBuildErrors: true`, hiding 3 `tsc` errors: `[slug]/components/CategoryMenu.tsx:30` (`section` possibly null), `[slug]/page.tsx` `query` prop on a component that doesn't accept it (search is probably not wired up), `vendor/page.tsx:23`. Fix them, then remove the flag.
- [ ] **S4.5** Backend Dockerfile, MongoDB Atlas, HTTPS. Vendor app on the web uses `window.location.origin` for the API.
- [ ] **S4.6** One brand: "FoodCart" vs "Supr-Mama".
- [ ] **S4.7** Remove dead `OrderService` (unused duplicate of `CheckoutService`).
- [ ] **S4.8** Per-IP rate limit on `/api/auth/*` (reverse proxy or app). ⛔ blocks go-live: the per-number limits alone still let one attacker spend SMS credits on any number.
- [ ] **S4.9** Make `vendors.mobile` unique if the open question says one number = one stall.
- [ ] **S4.10** Repo `amitranjan2/food-cart` is **public**. Decide whether to make it private; either way, no secrets in the repo.
