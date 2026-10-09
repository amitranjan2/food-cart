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
- **Payments** (Oct 9): online payment in V1 (UPI + cards). **Gateway is swappable** (decided Oct 10): one `PaymentGateway` adapter is active, chosen by `PAYMENT_GATEWAY`; Cashfree and Razorpay are both candidates, not chosen yet. Per-vendor payout accounts are gateway-specific, so switching gateways later means re-onboarding vendors.
  - Flow: server creates the order in `PAYMENT_PENDING` plus a Razorpay order → customer pays → server verifies the checkout signature **and** the `payment.captured` webhook → order becomes `PLACED` and only then shows in the vendor app.
  - Rejected or cancelled orders are refunded automatically via the Razorpay refund API.
  - Unpaid orders expire after ~15 minutes.
- **Time slots** (Oct 9): orders are for a 30-minute slot. The customer picks any slot after the current one, up to the **end of tomorrow by the calendar** (last slot tomorrow 11:30 PM; tonight's after-midnight slots count as tomorrow), inside the vendor's own opening hours. Hours are set **per weekday**; a day can be closed; closing may be **after midnight** (that tail belongs to the evening it started). A vendor with **no hours set gets no slots, so no orders**. All times are India time (Asia/Kolkata).
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
- [x] **S2.8** Time slots from vendor opening hours (commit tagged `S2.8`, Oct 9). Rules in `service/slots/SlotRules` (pure, unit tested): slot = 30-min start time with opens <= start < closes, strictly after the current slot, through tomorrow's opening incl. its after-midnight part; yesterday's after-midnight tail counts too. Server computes slots (`GET /api/public/vendors/{slug}/slots` → `{hoursSet, slots: ["2026-10-09T14:30", …]}`) and re-checks the chosen slot on order (refuses past, current, outside-hours, malformed, missing; no hours → "This vendor isn't taking orders for any time slot right now."). Order stores `scheduledFor` (instant). Vendor hours: `PUT /api/vendor/me/hours`, validated (half-hour times, open ≠ close, one entry per day). Vendor app: weekly hours editor in Store settings (Open/Closed per day, 30-min time pickers, "Closes next day", copy Monday to all); order card and details show "For Today 10:30 PM". Storefront: cart shows only server slots, refreshes them on open and after a failed payment, blocks Pay with a message when there are none; confirmation shows the slot. `local` profile gives demo vendors 06:00–02:00 every day (`DemoHours`).
  - Verified: `mvn test` 38/38 (8 new `SlotRulesTest`, 3 new checkout slot tests). `tsc` + `next build` clean; vendor app adds no type errors. End to end at Fri 21:04 IST: demo hours gave 49 slots from 21:30 to Sun 01:30; in the vendor app set Fri 18:00–23:00 and Sat closed → slots became Fri 21:30/22:00/22:30; customer picked 10:30 PM → sent `2026-10-09T22:30`, confirmation "Fri, Oct 9, 10:30 PM", vendor card and details "For Today 10:30 PM"; invalid hours (09:15) refused with a message; with hours cleared the cart says the vendor hasn't set hours and Pay stays disabled.
  - Production note: existing vendors have no hours, so they take **no orders** until each one saves hours in the vendor app (as decided).
- [x] **S2.9** Cart fixes from review (commit tagged `S2.9`, Oct 9): (1) the cart opens scrolled to the top and going back returns the menu to where it was (cart and menu share the `.storefront` scroller); (2) slot section restyled as the same white card as Pick Up / Dine In: "Pick-up time" / "Dine-in time" label, "Today, 9:30 PM", Change → Today / Tomorrow tabs + 3-column time chips; (3) OTP: after 6 digits the Resend button becomes **Submit**, which verifies with the server; Pay is enabled only after "✓ Verified"; a wrong OTP shows "Invalid OTP"; changing the number clears the verification.
  - Verified in a browser: menu at 748px → cart at 0 → back to 748; slot card and picker screenshots; 000000 → Submit → "Invalid OTP", Pay disabled; 123456 → Submit → Verified, Pay enabled → order placed for the picked slot.
- [x] **S2.10** Checkout details (commit tagged `S2.10`, Oct 9): slots end at the end of tomorrow (calendar), not at tomorrow's closing; no slot is preselected and Pay needs one; after OTP verification the customer enters a name (Save), then name + number show as one locked card; returning customers with a saved name skip that step. Server: `GET`/`PATCH /api/customers/me` (name trimmed, 1–60 chars); orders without a customer name are refused ("Add your name before paying."); the name is copied onto the order and shown in the vendor app as "Name · number".
  - Verified: `mvn test` 41/41. Browser at Fri 22:10 IST: 43 slots, last Sat 11:30 PM; pill "Select a time", Pay disabled until picked; name step after Verify, "  Aakash   Yadav " saved as "Aakash Yadav", locked card, no inputs left; same number again skips the name; vendor card and details show "Aakash Yadav · 9833334444".
- [~] **S2.3** Online payment. **Done with the local fake gateway** (commit tagged `S2.3`, Oct 10): `service/payments/` — `PaymentGateway` interface (create, verify + parse webhook, refund), `PaymentService` (gateway-independent rules), `FakePaymentGateway` (`local` profile only; HMAC-signed webhooks through the same check a real one uses). Orders are created `PAYMENT_PENDING`; `POST /api/orders` returns `{order, payment}`; the browser opens the gateway's checkout (`frontend/app/lib/payments.ts`, `TestCheckout` for fake), then polls the order until the server confirms. A verified `payment.captured` for exactly `order.total` → `PLACED` (only now visible to the vendor and counted in customer history); duplicates ignored; wrong amount → refunded, `EXPIRED`; failed payment → still pending, retry possible; unpaid → `EXPIRED` after 15 min (job every minute); payment after expiry → refunded; vendor reject → refund. Vendors can't see or act on `PAYMENT_PENDING`/`EXPIRED` orders. Outside `local` the API refuses to start without a gateway (like OTP).
  - Verified: `mvn test` 54/54 (new `PaymentServiceTest` 8, checkout 3). Browser: fail → "Payment failed. Nothing was charged", close → "not completed", pay → "Paid ₹70" confirmation. API: vendor list shows only the paid order; accepting an unpaid order refused; reject → `REFUNDED`; forged webhook → 403; backdated unpaid orders → `EXPIRED` by the job; late payment → refunded with a note.
  - **Remaining:** (a) real adapter for the chosen gateway (needs test keys) — `create`, webhook signature, refund, plus its checkout script in `payments.ts`; (b) **vendor split** (Razorpay Route / Cashfree Easy Split) with transfers held until the vendor accepts — needs per-vendor payout onboarding; (c) refunds that complete later arrive as `REFUND_PROCESSED` webhooks (handled, untested against a real gateway); (d) known limit: two identical webhooks processed at the same instant could both count the visit in history (order status is unaffected).
- [ ] **S2.11** Policy pages the gateway will check before going live: Terms, Privacy, Refund & Cancellation, Contact (footer links on the storefront).
- [ ] **S2.12** Abandoned payment attempts use up order numbers (customer saw #1003 after two failed tries). Fix with S4.1 (per-vendor counter, assigned when paid).
- [ ] **S2.4** Cart keyed by item id: Half + Full of one item collapse into one line. Key by item + chosen options.
- [ ] **S2.5** Vendors can only use 4 global categories (Momos/Rolls/Drinks/Chaat) via `MenuItemService.catalogCategoryId`. Let vendors create their own.
- [x] **S2.6** Remember the customer (commit tagged `S2.6`, Oct 9). After OTP verification the session token is kept in the browser (`localStorage` key `foodcart.customer`; server sessions last 30 days). On the next visit `GET /api/customers/me` restores number + name, so the cart shows the locked card and no OTP is needed; an expired or invalid token is silently forgotten. The card has **Not you?**: it calls the new `POST /api/auth/logout` (deletes the server session), forgets the token and resets the cart to Send OTP.
  - Verified: `mvn test` 43/43 (new `AuthServiceLogoutTest`). Browser with one profile: verify + name → token saved; reload → "Riya · 9844445555" card, no OTP inputs, order placed; Not you? → number cleared, Send OTP, storage empty, old token gets 403 from the server; reload → not remembered; a bogus stored token is removed.
  - Trade-off: a token in `localStorage` can be read by any script running on the storefront. Acceptable for V1 because the storefront loads no third-party scripts; move to an HttpOnly cookie if that changes (e.g. analytics or ads).
- [ ] **S2.7** Customer order-status page (Paid → Accepted → Preparing → Ready/Served) by polling; a WhatsApp message is better later.

## Step 3: vendor never misses an order
- [ ] **S3.3** Vendor app's order list is grouped by the day an order was **placed** (`createdAt`), not its slot. An order placed tonight for tomorrow 9 AM shows only under today. Group or sort by `scheduledFor` (and show upcoming slots first).
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
