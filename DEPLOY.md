# Deploying Supr-Mama

| Part | Host | Address |
|---|---|---|
| Storefront + policy pages (`frontend/`) | Vercel | `suprmama.in` (and `www.` → redirect) |
| API (`backend/`, Docker) | Railway | `api.suprmama.in` |
| Database | MongoDB Atlas | — |
| Vendor web app (`vendor-app/`, static) | Vercel | `vendor.suprmama.in` |
| Domain, DNS, `tech@suprmama.in` mailbox | Hostinger (stays) | — |

Secrets (tokens, passwords, connection strings) go only into the hosts' environment-variable screens. Never into
the repo, never in chat.

**Two phases.** The API refuses to start in production without the WhatsApp settings (so a test login code can never run
publicly). Online payment is not needed for launch: with `PAYMENT_GATEWAY=none` customers pay at the stall (S2.19). So:
- **Phase 1, now**: storefront and policy pages live on `suprmama.in`. Razorpay and Meta review these.
- **Phase 2**, once WhatsApp (N3) is ready: API, database, vendor web app. Add the gateway (S2.3) later without redeploying
  anything else.

Until phase 2, store links show "No store at this link"; that's expected.

---

## Phase 1: storefront on suprmama.in

### 1. Vercel project
1. vercel.com → sign up with GitHub → **Add New → Project** → import `amitranjan2/food-cart` (allow the Vercel GitHub
   app to see the repo; it works with a private repo).
2. **Root Directory**: `frontend`. Framework: Next.js (detected).
3. **Environment variable**: `NEXT_PUBLIC_API_URL` = `https://api.suprmama.in`.
4. **Production branch**: Settings → Git → `storefront-development` (or merge to `main` first and keep `main`).
5. Deploy. Open the `….vercel.app` address it gives you and check `/terms`, `/privacy`, `/refunds`, `/contact`.

Plan: Vercel's free Hobby plan is for non-commercial use; a business pilot belongs on **Pro** (about $20/month).

### 2. Point the domain (Hostinger hPanel → Domains → suprmama.in → DNS / Nameservers)
1. **Screenshot every existing record first.**
2. In Vercel: Project → Settings → **Domains** → add `suprmama.in` and `www.suprmama.in` (choose "redirect www to
   suprmama.in"). Vercel then shows the exact records to add; use those values. Usually:

   | Type | Name | Value |
   |---|---|---|
   | A | `@` | `76.76.21.21` |
   | CNAME | `www` | `cname.vercel-dns.com` |

3. Delete only the **old** `A @` and `CNAME www` records that point at the Hostinger website.
4. **Don't touch** the email records: `MX`, the `TXT` starting `v=spf1`, the DKIM records (`…_domainkey`) and
   `_dmarc`. Deleting them stops mail to `tech@suprmama.in`.
5. Wait for Vercel to show the domain as valid (minutes to a few hours). HTTPS is automatic.

### 3. Check
- `https://suprmama.in/terms` and `https://www.suprmama.in` (redirects) load with the padlock.
- Send a test email to `tech@suprmama.in` from another account; it still arrives.
- `frontend/app/lib/legal.ts` is filled, so the policy pages carry no "Draft" banner. GSTIN `06AAMCC1614M1ZL` is in;
  `platformChargesSac` is still empty (only tax invoices show it) and must be filled before the first real order (N6).

---

## Phase 2: API, database, vendor web app

### 4. MongoDB Atlas
1. cloud.mongodb.com → new project → **Create cluster**: M0 (free) to start, region **Mumbai (ap-south-1)**.
2. **Database Access**: user `suprmama-api` with *readWrite* on database `suprmama`; a second user `support-readonly`
   with *read* only, for `ops/handover-code.sh`. Long generated passwords, kept in a password manager.
3. **Network Access**: `0.0.0.0/0` (Railway has no fixed outgoing address; the password protects the database).
4. **Connect → Drivers**: copy the `mongodb+srv://…` string, put `/suprmama` before the `?` and the API user's
   password in it. This is `MONGODB_URI`.
5. Backups: M0 has none. Move to a paid tier (M10) before real money flows, or export regularly.

### 5. Railway (API)
1. railway.com → **New Project → Deploy from GitHub repo** → `food-cart`.
2. Service → Settings: **Root Directory** `backend` (it builds `backend/Dockerfile`); **Healthcheck Path**
   `/api/health`; same production branch as Vercel.
3. **Volumes** → add one, mount path `/data` (dish photos live in `/data/uploads`; without a volume they vanish on
   every deploy).
4. **Variables** (see the README's table for details):

   | Variable | Value |
   |---|---|
   | `MONGODB_URI` | from step 4 |
   | `CORS_ORIGIN` | `https://suprmama.in,https://vendor.suprmama.in` |
   | `PUBLIC_BASE_URL` | `https://api.suprmama.in` |
   | `PUBLIC_STORE_URL` | `https://suprmama.in` |
   | `TRUST_PROXY` | `true` (Railway sits in front of the API) |
   | `ADMIN_TOKEN` | 32+ random characters (`openssl rand -base64 32`) |
   | `NOMINATIM_CONTACT` | `tech@suprmama.in` |
   | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_OTP_TEMPLATE` (`suprmama_otp`), `WHATSAPP_OTP_LANGUAGE`, `WHATSAPP_API_VERSION` | from N3 (`1374337695763992`, `en`, `v26.0`). Never set `WHATSAPP_TEST_MODE` here: the API refuses to start with it |
   | `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | delivery webhook (step 5b): the app secret from developers.facebook.com → Supr-Mama → App settings → Basic → App secret; the verify token is any 32+ random characters you make up (`openssl rand -hex 32`) |
   | `PAYMENT_GATEWAY` | `none` at launch (pay at the stall only); later `razorpay` or `cashfree` + its keys (S2.3) |
   | `PAYMENT_CASH` | leave unset (`true`); `false` only to stop pay at the stall once online payment exists |
   | `ANTHROPIC_API_KEY` | optional: icons for new categories. Create a key for this app only (console.anthropic.com), set a monthly spend limit on it, and keep it here. Without it new categories show the generic plate. Check drawings with `ops/category-icons.sh list` |
   | `BILLING_START`, `BILLING_TEST_MOBILES`, `BILLING_PAY_TO_UPI`, `BILLING_SAC` | launch day, the team's numbers, the company UPI ID, the SAC from the CA (vendor billing) |

   `PORT` and `UPLOAD_DIR` are set by Railway and the image; leave them.
5. **Networking → Custom Domain** → `api.suprmama.in`. Add the record Railway shows at Hostinger:
   `CNAME` `api` → `….up.railway.app`.

### 5b. WhatsApp delivery webhook (after the API answers on `api.suprmama.in`)
1. developers.facebook.com → Supr-Mama → **Use cases → Connect on WhatsApp → Customize → Step 2: Production setup →
   Configure Webhooks**.
2. **Callback URL** `https://api.suprmama.in/api/whatsapp/webhook`, **Verify token** = the same value as
   `WHATSAPP_WEBHOOK_VERIFY_TOKEN` → **Verify and save**. (Meta calls the URL straight away; it fails if the API isn't
   live or the two tokens differ.)
3. Under **Webhook fields**, subscribe to **messages** only (it carries the sent / delivered / read / failed statuses).
4. Send yourself a login code, then `API_BASE=https://api.suprmama.in ADMIN_TOKEN=… ops/whatsapp-stats.sh 1`: it should
   show 1 sent and, within seconds, 1 delivered.

### 6. Vendor web app (second Vercel project)
1. Vercel → Add New → Project → same repo, **Root Directory** `vendor-app` (`vercel.json` there sets the build).
2. Environment variable `EXPO_PUBLIC_WEB_API_URL` = `https://api.suprmama.in`.
3. Domains → `vendor.suprmama.in` → at Hostinger: `CNAME` `vendor` → `cname.vercel-dns.com`.

### 7. Smoke test
1. `https://api.suprmama.in/api/health` → `{"status":"ok"}`.
2. `API_BASE=https://api.suprmama.in ADMIN_TOKEN=… ops/create-vendor.sh "Test Stall" <your number>`.
3. Sign in at `vendor.suprmama.in` with the WhatsApp code; set location, colours and hours; add one dish.
4. Open `suprmama.in/test-stall` on a phone and order the dish (pay at the stall); accept it in the vendor app, mark
   ready, pay the stall, hand over with the code. The order page then links to its tax invoice.
5. Place a second order, accept it, and after 30 minutes past its slot mark it "Didn't come"; reset your number with
   `ops/cash-reset.sh`. Once online payment exists (S2.3), also refund one with `ops/refund-order.sh`.
6. Print the QR poster from the vendor app and scan it with a phone.

### Costs (rough, check current prices)
Vercel Pro ~$20/month (both projects) · Railway Hobby ~$5/month plus usage · Atlas M0 free (M10 ~$60/month when you
need backups) · WhatsApp per login code · gateway fees per payment.
