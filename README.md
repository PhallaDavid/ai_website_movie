# MerlRg KH

Nuxt 4 storefront with a NestJS, Prisma, and SQLite API. Firebase Authentication handles Google sign-in. Customers get profiles, notifications, orders, and a library. Admin accounts can upload and publish MP4 movies, view or suspend users, inspect orders, and confirm payment.

## Local setup

1. Install dependencies in the root and `api` directories with `npm install`.
2. In the Firebase console, create a Web app, enable **Authentication → Sign-in method → Google**, and add `localhost` to authorized domains if needed. Copy the Web app's config into the root `.env` using `.env.example`. If `measurementId` is present and Analytics is enabled in Firebase, the client initializes Analytics in supported browsers.
3. Copy `api/.env.example` to `api/.env`. Set a random `JWT_SECRET` of at least 32 characters, `FIREBASE_PROJECT_ID` to the same project ID, and `ADMIN_EMAILS` to the Google email addresses allowed to manage the dashboard. A service-account file is optional for token revocation checks; if used, set `GOOGLE_APPLICATION_CREDENTIALS` to its path outside this repository. Never commit the service-account file.
4. Install API dependencies with `npm install --prefix api` (once).
5. In the root, run `npm run dev`. This applies pending database migrations, generates Prisma Client, and starts both the API (port 4000) and the site (port 3000).
6. For online payment, set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `api/.env`. Point a Stripe webhook at `http://localhost:4000/api/webhooks/stripe` and subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. For local testing, use the Stripe CLI to forward events to that URL.

The API's SQLite file and uploaded videos stay in `api/prisma` and `api/uploads`. Back up both for production.

## Purchase flow

Customers select a published movie and create an order. Free movies become available immediately. Paid orders open Stripe Checkout when configured. A signed Stripe webhook marks the order paid and grants access. Without Stripe configuration, paid orders remain `PENDING` until an admin verifies payment outside the app and marks them `PAID` in the dashboard. The API enforces paid access before issuing a short-lived playback link. Playback supports HTTP byte ranges.

## API routes

All routes start with `/api`. Public: `GET /health`, `POST /auth/firebase`, `GET /movies`, `GET /movies/:id`, `POST /webhooks/stripe` (signature verified). Authenticated: `GET/PATCH /users/me`, `GET /notifications`, `PATCH /notifications/:id/read`, `POST /orders`, `GET /orders/me`, `POST /orders/:id/checkout`, `GET /movies/:id/play-token`. Admin: `GET /dashboard/stats`, `GET /dashboard/users`, `PATCH /dashboard/users/:id/status`, `GET /movies/admin/all`, `POST /movies`, `PATCH /movies/:id`, `POST /movies/:id/upload`, `GET /orders`, `PATCH /orders/:id/status`.
