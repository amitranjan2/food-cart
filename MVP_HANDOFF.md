# FoodCart MVP handoff

Context carried over from a previous Claude session (Oct 9, 2026). Read this before planning.

## Decisions made by Aks
- **V1:** street-food **pickup and dine-in** orders, **paid online before the order reaches the vendor**. Delivery and Subscribe hidden behind a flag, not deleted.
  - Dine-in: customer adds a table/seat/spot note (backend already has `dineInNote`). Pay-first for both modes.
  - Vendor app must show Pickup vs Dine-in plus the note clearly on each order card.
- **V2:** self-delivery + simple daily subscriptions.
- **V3:** third-party delivery (Porter / Uber / Rapido). Check which of these actually offer an API in India before promising V3.
- **Payments:** online payment collection in V1 for pickup and dine-in (decided Oct 9). Not built yet. Suggested: Razorpay (UPI + cards).
  - Flow: server creates an order in `PAYMENT_PENDING` and a Razorpay order → customer pays → server verifies the signature and the `payment.captured` webhook → order becomes `PLACED` and only then shows in the vendor app.
  - Rejected or cancelled orders need an automatic refund via the Razorpay refund API.
  - Unpaid orders expire after ~15 minutes.
  - Payout: Razorpay Route (split to vendor accounts) vs collecting centrally and settling vendors manually is still open.
  - Start Razorpay KYC now; approval takes days.
- **Still open:** SMS/OTP provider (suggested MSG91; start DLT registration early because it takes days); image storage (server disk vs R2/S3); delete the old Next.js `/vendor` console (duplicates the Expo vendor app)?

## Step 1 (security): applied and verified (Oct 9, 2026)
Branch `mvp/step1-security`, commit `4028c66`. Start Step 2 from this branch.

What it does:
- Real OTP: random 6-digit code, stored hashed, 5-minute expiry, 5 wrong attempts, 30s resend gap, 5 sends/hour (`service/otp/*`). `DevOtpSender` (always 123456) loads only in the `local` profile. In any other profile the API **refuses to start** until a real `OtpSender` exists. Next: implement the chosen SMS provider's `OtpSender`.
- `SeedData`, `DemoData` and `CatalogEnricher` now run only with the `local` profile (before, they ran in production and overwrote data).
- Public vendor endpoints return `PublicVendor` (no mobile number).
- Uploads: type detected from file bytes, extension chosen by the server, absolute URLs via `PUBLIC_BASE_URL`, 5 MB multipart limit.
- `spring.data.mongodb.auto-index-creation: true` (unique slug, mobile and token indexes plus the session TTL were never being created).
- Storefront cart: "Send OTP" step before paying. Vendor app resend timer changed to 30s.

Verified:
- `mvn test`: 21/21 pass.
- With no profile, the API refuses to start ("No SMS provider is configured").
- With the `local` profile, against a live MongoDB: public vendor JSON has no mobile; OTP verify without a request, resend inside 30s, wrong code, reused code, invalid mobile and unknown vendor all return 400; customer and vendor login return tokens; an HTML file uploaded as `.jpg` is rejected and a real PNG is accepted; indexes are created (unique slug, customer mobile and token; TTL indexes on sessions and OTP challenges).
- The storefront TSX added by Step 1 type-checks. `tsc` shows 3 older errors in other files (`CategoryMenu.tsx:30`, `[slug]/page.tsx:272` `query` prop, `vendor/page.tsx:23`) that `ignoreBuildErrors` hides (see Step 4).
- Not yet checked by hand: the OTP screens in the storefront and the vendor app.

Notes:
- The API now needs MongoDB reachable at startup (index creation runs when it boots).
- **Open:** `vendors.mobile` is indexed but **not unique**, yet vendor login looks vendors up by mobile. Decide whether one number can run two stalls. If not, make it unique, and drop the old `mobile` index first, or startup index creation fails.

## Remaining V1 checklist
**Step 2: ordering flow**
- Gate Subscribe / Delivery behind a flag. Keep Pick Up + Dine In; send the real type (`PICKUP` | `DINE_IN`) and the dine-in note. Make `type` an enum validated on the server.
- Remove placeholder 5% tax and ₹20 delivery fee (`Cart.tsx`), or compute the bill on the server.
- Online payment (Razorpay): `PAYMENT_PENDING` status, create-payment endpoint, signature + webhook verification, refunds on reject/cancel, expiry of unpaid orders. Rename the 'Pay' button flow to real checkout.
- Cart is keyed by item id: Half + Full of one item collapse into one line. Key by item + chosen options.
- Vendors can only use 4 global categories (Momos/Rolls/Drinks/Chaat): `MenuItemService.catalogCategoryId`. Let vendors create their own.
- Remember the customer's session so repeat orders don't need a new OTP.
- Customer order-status page (Paid → Accepted → Preparing → Ready/Served) by polling; WhatsApp message is better.

**Step 3: vendor never misses an order**
- Vendor app only refreshes on focus or pull-to-refresh. Add polling every 10–15s with a sound, then push notifications.
- Allow cancelling an order after it's accepted (backend transitions in `CheckoutService.status`).

**Step 4: polish and deploy**
- Order number is `1000 + orders.count() + 1` (global, can collide). Use a per-vendor atomic daily counter.
- CORS `allowedMethods` lacks `DELETE` (`CorsConfig`).
- `NoSuchElementException` returns 500. Bad store link stays on "Loading…" forever. Show a closed-vendor banner.
- `next.config.mjs` has `ignoreBuildErrors: true`.
- Backend Dockerfile, MongoDB Atlas, HTTPS. Vendor app on the web calls `window.location.origin` for the API.
- One brand: "FoodCart" vs "Supr-Mama".
- Remove dead `OrderService` (unused duplicate of `CheckoutService`).
- Repo `amitranjan2/food-cart` is **public**: keep it private, or make sure Step 1 ships before go-live.
