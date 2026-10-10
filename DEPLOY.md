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

**Two phases.** The API refuses to start in production without a payment gateway and the WhatsApp settings (so a test
login code or fake payment can never run publicly). So:
- **Phase 1, now**: storefront and policy pages live on `suprmama.in`. Razorpay and Meta review these.
- **Phase 2**, once the gateway (S2.3) and WhatsApp (N3) are ready: API, database, vendor web app.

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
- `frontend/app/lib/legal.ts`: fill company, address, phone, hours, grievance officer and jurisdiction before
  Razorpay reviews the site. Until then the policy pages show a "Draft" banner.

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
   | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_OTP_TEMPLATE` (`suprmama_otp`), `WHATSAPP_OTP_LANGUAGE`, `WHATSAPP_API_VERSION` | from N3 |
   | `PAYMENT_GATEWAY` + the gateway's keys | once S2.3 picks Cashfree or Razorpay |

   `PORT` and `UPLOAD_DIR` are set by Railway and the image; leave them.
5. **Networking → Custom Domain** → `api.suprmama.in`. Add the record Railway shows at Hostinger:
   `CNAME` `api` → `….up.railway.app`.

### 6. Vendor web app (second Vercel project)
1. Vercel → Add New → Project → same repo, **Root Directory** `vendor-app` (`vercel.json` there sets the build).
2. Environment variable `EXPO_PUBLIC_WEB_API_URL` = `https://api.suprmama.in`.
3. Domains → `vendor.suprmama.in` → at Hostinger: `CNAME` `vendor` → `cname.vercel-dns.com`.

### 7. Smoke test
1. `https://api.suprmama.in/api/health` → `{"status":"ok"}`.
2. `API_BASE=https://api.suprmama.in ADMIN_TOKEN=… ops/create-vendor.sh "Test Stall" <your number>`.
3. Sign in at `vendor.suprmama.in` with the WhatsApp code; set location, colours and hours; add one dish.
4. Open `suprmama.in/test-stall` on a phone, order the dish for the smallest real amount, pay, accept it in the vendor
   app, mark ready, hand over with the code.
5. Place a second order and refund it with `ops/refund-order.sh`; check the refund arrives.
6. Print the QR poster from the vendor app and scan it with a phone.

### Costs (rough, check current prices)
Vercel Pro ~$20/month (both projects) · Railway Hobby ~$5/month plus usage · Atlas M0 free (M10 ~$60/month when you
need backups) · WhatsApp per login code · gateway fees per payment.
