# ShopVerse — Full-Stack E-Commerce Platform

**Every wish, one cart away.** A professional, Flipkart-style e-commerce store built with React, FastAPI, JWT auth and Docker.

## Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Frontend  | React 18, React Router 7, Vite 6              |
| Backend   | FastAPI, SQLAlchemy 2, Pydantic 2             |
| Auth      | JWT (HS256, bcrypt password hashing)          |
| Database  | PostgreSQL 16 (SQLite fallback for local dev) |
| Infra     | Docker Compose, Nginx reverse proxy           |

## Features

- 🔐 **JWT auth** — register, login, protected routes, token validation on every request
- 🛍️ **Full catalog** — 53 seeded products across 6 categories, search, filter, sort
- 🛒 **Server-side cart** — add/update/remove, stock-aware, persisted per user
- 📦 **Orders** — checkout with delivery details, stock deduction, order history
- 💳 **Stripe payments** — hosted Stripe Checkout, signature-verified webhooks, client-side verification, payment status on every order; sandbox simulation when no keys are configured
- 🛠️ **Admin dashboard** — revenue stats, product CRUD (create/edit/delete, featured toggle), order fulfilment (confirm → ship → deliver → cancel), COD auto-paid on delivery
- 💸 **Rupee pricing** — ₹ formatting, discount badges, free-delivery progress bar
- ✨ **Modern UI** — gradient hero, sticky header with live search, product cards, toasts, skeletons, modals, fully responsive

## Quick Start (Docker)

```bash
docker compose up --build
```

Then open **http://localhost:8080** — the app runs on one origin; Nginx serves the React build and proxies `/api` to FastAPI.

- API docs: http://localhost:8080/api/docs (or http://localhost:8001/docs)
- Admin seed account: `admin@shopverse.com` / `admin123`
- Change `SECRET_KEY` via env before any production use.

### Enabling card payments (Stripe)

1. Create a free account at [stripe.com](https://stripe.com) — test mode keys are free and instant.
2. Export your test keys (Dashboard → Developers → API keys):
   ```bash
   $env:STRIPE_SECRET_KEY = "sk_test_..."
   $env:STRIPE_PUBLIC_KEY = "pk_test_..."
   # docker: use a .env file with STRIPE_SECRET_KEY=... and STRIPE_PUBLIC_KEY=...
   ```
3. (Optional) Add the webhook endpoint `https://<your-host>/api/payments/webhook` in
   https://dashboard.stripe.com/webhooks so orders confirm instantly. For local dev:
   ```bash
   stripe listen --forward-to localhost:8001/api/payments/webhook   # prints a whsec_... secret
   $env:STRIPE_WEBHOOK_SECRET = "whsec_..."
   ```
4. Set the charge currency with `STRIPE_CURRENCY` (`inr` default — Stripe supports INR natively on
   any account, `usd` fallback available).
5. Use Stripe's test card `4242 4242 4242 4242` (any future expiry / any CVV) to simulate payment.

Without keys the store runs in **sandbox mode** — card checkout redirects to a local
`/sandbox/pay` page that simulates success/failure so you can demo the full flow.

## Local Development (no Docker)

**Backend** (uses SQLite so you don't need Postgres):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows  |  source .venv/bin/activate (macOS/Linux)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001   # SQLite is used by default locally
```

**Frontend**:

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173 (proxies /api -> :8001)
```

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, lifespan (creates tables + seeds)
│   │   ├── config.py         # Settings from env vars
│   │   ├── database.py       # SQLAlchemy engine/session
│   │   ├── models.py         # User, Category, Product, CartItem, Order, OrderItem
│   │   ├── schemas.py        # Pydantic request/response models
│   │   ├── security.py       # bcrypt hashing + JWT create/decode
│   │   ├── deps.py           # get_current_user / require_admin
│   │   ├── seed.py           # Demo catalog + admin account
│   │   └── routers/          # auth, products, cart, orders, payments, admin
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/client.js     # fetch wrapper with JWT injection + 401 handling
│   │   ├── context/          # Auth, Cart, Toast providers
│   │   ├── components/       # Header, Footer, ProductCard, Shared
│   │   ├── pages/            # Home, Products, ProductDetail, Cart, Checkout,
│   │   │                     # Orders, Profile, Login, Register, Admin, SandboxPay
│   │   └── styles.css        # Full design system (CSS variables, responsive)
│   ├── nginx/nginx.conf      # SPA + /api proxy
│   └── Dockerfile            # multi-stage: node build -> nginx
└── docker-compose.yml        # db + backend + frontend with healthchecks
```

## API Overview

| Method | Endpoint                  | Auth | Description                  |
|--------|---------------------------|------|------------------------------|
| POST   | `/api/auth/register`      | —    | Create account, get JWT      |
| POST   | `/api/auth/login`         | —    | Login, get JWT               |
| GET    | `/api/auth/me`            | ✅   | Current user profile         |
| GET    | `/api/categories`         | —    | Category list                |
| GET    | `/api/products`           | —    | Search / filter / sort       |
| GET    | `/api/products/{slug}`    | —    | Product detail               |
| GET    | `/api/products/related/{slug}` | — | Related products          |
| GET    | `/api/cart`               | ✅   | Cart with totals             |
| POST   | `/api/cart/items`         | ✅   | Add item                     |
| PUT    | `/api/cart/items/{id}`    | ✅   | Update quantity              |
| DELETE | `/api/cart/items/{id}`    | ✅   | Remove item                  |
| POST   | `/api/orders/checkout`    | ✅   | Place order (deducts stock)  |
| GET    | `/api/orders`             | ✅   | Order history                |
| POST   | `/api/payments/initialize`| ✅   | Create Stripe Checkout session (or sandbox) |
| GET    | `/api/payments/verify/{reference}` | ✅ | Verify + confirm order |
| POST   | `/api/payments/webhook`   | 🔑   | Stripe webhook (signature-verified) |
| POST   | `/api/payments/sandbox/complete` | ✅ | Simulate success/failure (no keys) |
| GET    | `/api/admin/stats`        | 🔐   | Revenue & counts             |
| POST   | `/api/admin/products`     | 🔐   | Create product               |
| PUT    | `/api/admin/products/{id}`| 🔐   | Update product               |
| DELETE | `/api/admin/products/{id}`| 🔐   | Delete product               |
| GET    | `/api/admin/orders`       | 🔐   | All orders with customers    |
| PATCH  | `/api/admin/orders/{id}/status` | 🔐 | Fulfil orders           |

🔐 = admin only · 🔑 = webhook signature

## Security Notes

- Passwords hashed with bcrypt (never stored in plain text)
- JWT signed with HS256; expiry configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`
- Cart/orders scoped to the authenticated user server-side
- CORS restricted to configured origins
- Nginx caches static assets with immutable headers