# FoodCart

Mobile-first, hyperlocal ordering for neighbourhood food vendors. This repository contains one Next.js customer/vendor PWA and one Java 17 Spring Boot REST API backed by MongoDB.

## Local development

1. Start MongoDB: `docker compose up -d`
2. Backend: `cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=local`
3. Frontend: `cd frontend && cp .env.local.example .env.local && npm install && npm run dev`

Visit [http://localhost:3000/raju-momos](http://localhost:3000/raju-momos). The development OTP is `123456`; seeded vendor mobile is `9999999999`.

## Project layout

- `frontend/` — customer storefront, cart/checkout, order tracking and vendor console
- `backend/` — controllers, services, Mongo repositories and authentication boundary
- `docker-compose.yml` — local MongoDB only

## API boundary

Public menu endpoints live under `/api/public`. Customer authenticated endpoints use `/api/customers` and `/api/orders`; vendor-scoped endpoints use `/api/vendor`. Authentication resolves the actor from a bearer session token—vendor/customer IDs are never accepted from the browser as authority.

`OrderService` is the source of truth for checkout: it reloads each item, checks vendor/item availability, calculates prices, and saves item snapshots. Vendor order updates are ownership-scoped and use a strict transition map.

## Production notes

Set `MONGODB_URI`, `CORS_ORIGIN`, and a cryptographically random `SESSION_SECRET`. OTP delivery is an interface; the local implementation deliberately only accepts `123456`. Add gateway rate limiting at the reverse proxy and retain the per-mobile request limit in the OTP service before connecting an SMS vendor.
