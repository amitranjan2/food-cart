# FoodCart

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

- `local` profile: `DevOtpSender` logs the code and always uses `123456`. It cannot load in any other profile.
- Any other profile: the API **refuses to start** until a real `OtpSender` (SMS provider) is configured.

Demo vendors, menus and orders (`SeedData`, `DemoData`, `CatalogEnricher`, `/api/dev/*`) only run with the `local` profile.

## Production environment

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `CORS_ORIGIN` | Storefront origin, e.g. `https://foodcart.in` |
| `PUBLIC_BASE_URL` | Public address of this API; used to build image URLs |
| `UPLOAD_DIR` | Where uploaded images are stored; must be a persistent volume |

Add per-IP rate limiting on `/api/auth/*` at the reverse proxy.
