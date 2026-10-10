# Supr-Mama

Mobile-first, hyperlocal ordering for neighbourhood food vendors. This repository contains a Next.js customer storefront, an Expo vendor app (`vendor-app/`) and a Java 17 Spring Boot REST API backed by MongoDB.

## Local development

1. Start MongoDB: `docker compose up -d`
2. Backend: `cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=local`
3. Frontend: `cd frontend && cp .env.local.example .env.local && npm install && npm run dev`

Visit [http://localhost:3000/raju-momos](http://localhost:3000/raju-momos). With the `local` profile the OTP is always `123456` and a demo vendor is seeded on `9999999999`; neither exists in production.

## Project layout

- `frontend/` — customer storefront, cart/checkout and order tracking (vendors use the Expo app in `vendor-app/`)
- `backend/` — controllers, services, Mongo repositories and authentication boundary
- `docker-compose.yml` — local MongoDB only

## API boundary

Public menu endpoints live under `/api/public`. Customer authenticated endpoints use `/api/customers` and `/api/orders`; vendor-scoped endpoints use `/api/vendor`. Authentication resolves the actor from a bearer session token—vendor/customer IDs are never accepted from the browser as authority.

`OrderService` is the source of truth for checkout: it reloads each item, checks vendor/item availability, calculates prices, and saves item snapshots. Vendor order updates are ownership-scoped and use a strict transition map.

## Login and OTP

`OtpService` generates a random 6-digit code, stores only its hash, expires it after 5 minutes, locks after 5 wrong attempts, and allows one send per 30 seconds and 5 per hour per number. Delivery goes through the `OtpSender` interface:

- **WhatsApp** (`WhatsAppOtpSender`): active whenever `WHATSAPP_TOKEN` is set. It sends Meta's WhatsApp Cloud API *Authentication* template with the code in the body and the "Copy code" button. All `WHATSAPP_*` variables below are then required, or the API refuses to start. A failed or timed-out send (5 s) tells the user "Couldn't send the code on WhatsApp. Try again." and allows an immediate retry (it still counts towards the hourly limit). Meta's error code is logged; the token and the code never are. WhatsApp is the only channel for the pilot, so people without WhatsApp can't sign in.
- `local` profile without `WHATSAPP_TOKEN`: `DevOtpSender` logs the code and always uses `123456`. It cannot load in any other profile. With `WHATSAPP_TOKEN` set, `local` sends real WhatsApp codes instead, which is how to test delivery before a payment gateway exists.
- Any other profile without `WHATSAPP_TOKEN`: the API **refuses to start** ("No OTP sender is configured").

Demo vendors, menus and orders (`SeedData`, `DemoData`, `CatalogEnricher`, `/api/dev/*`) only run with the `local` profile.

## Production environment

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `CORS_ORIGIN` | Storefront origin, e.g. `https://suprmama.in` |
| `PUBLIC_BASE_URL` | Public address of this API; used to build image URLs |
| `UPLOAD_DIR` | Where uploaded images are stored; must be a persistent volume |
| `WHATSAPP_TOKEN` | System-user token for the WhatsApp Business Account (`whatsapp_business_messaging`); a secret, never in the repo |
| `WHATSAPP_PHONE_NUMBER_ID` | The sender's *Phone number ID* from WhatsApp → API Setup (not the phone number itself) |
| `WHATSAPP_OTP_TEMPLATE` | Approved Authentication template name, e.g. `suprmama_otp` |
| `WHATSAPP_OTP_LANGUAGE` | The template's language code exactly as WhatsApp Manager shows it, e.g. `en` or `en_US` |
| `WHATSAPP_API_VERSION` | Graph API version, e.g. `v21.0` |
| `WHATSAPP_API_BASE` | Optional, default `https://graph.facebook.com`; only changed for testing against a stand-in |
| `NOMINATIM_CONTACT` | Email in the User-Agent for OpenStreetMap lookups (their usage policy asks for a contact) |
| `NOMINATIM_BASE` | Optional, default `https://nominatim.openstreetmap.org`; only changed for testing |
| `PUBLIC_STORE_URL` | Where customers open stores, default `https://suprmama.in`; share links and QR codes point to `{this}/{store-link}` |
| `ADMIN_TOKEN` | Turns on `POST /api/admin/vendors` (used by `ops/create-vendor.sh`); 24+ random characters, a secret. Unset = the admin API answers 404 |
| `OTP_DAILY_SEND_CAP` | WhatsApp login codes sent per India day across all numbers (default 1000); past it, logins pause until midnight and an error is logged |
| `OTP_DAILY_WRONG_CODES` | Wrong codes one number may enter per day (default 15) before its logins stop until midnight |
| `AUTH_REQUEST_OTP_PER_IP` / `AUTH_VERIFY_OTP_PER_IP` | Login requests per IP address per 10 minutes (defaults 30 / 60). Kept generous because mobile networks put many phones behind one address |
| `TRUST_PROXY` | `true` only behind a load balancer that sets `X-Forwarded-For` (the per-IP limits then use its last entry). Leave unset otherwise, or clients could fake their address |

## Adding a vendor

```
API_BASE=https://api.suprmama.in ADMIN_TOKEN='…' ops/create-vendor.sh "Raju Momos" 9876543210 [raju-momos]
```

Creates the stall (one mobile number per stall; store links that clash with site pages such as `terms` are refused) and prints its link. The vendor signs in to the vendor app with that number and fills Settings: location, colours and opening hours (no orders until hours are set). **Menu → Share your store** shows the QR code, copies the link and opens the printable A4 "Scan to order" poster (`/{store-link}/qr`).
