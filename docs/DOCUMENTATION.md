# KadeHub — Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Authentication & Multi-Tenancy](#authentication--multi-tenancy)
6. [Modules](#modules)
7. [API Reference](#api-reference)
8. [Event System](#event-system)
9. [Billing & Subscriptions](#billing--subscriptions)
10. [Frontend Architecture](#frontend-architecture)
11. [Environment Variables](#environment-variables)
12. [Local Development](#local-development)
13. [Production Deployment](#production-deployment)
14. [Scaling Path](#scaling-path)

---

## Overview

KadeHub is a multi-tenant micro-SaaS POS and shop management platform built for Sri Lankan local shops (grocery, pharmacy, retail). It follows a **modular monolith** architecture designed to be split into microservices in the future.

- Backend: **NestJS (TypeScript)** — port `3001`
- Frontend: **Next.js 14 (React)** — port `3000`
- Database: **MySQL**
- Currency: **LKR (Sri Lankan Rupee)**

## Client Presentation

### Executive Summary

KadeHub is an affordable, easy-to-use, multi-tenant Point-of-Sale and shop management platform built for small-to-medium retail businesses. It combines sales, inventory, supplier ordering, customer loyalty, basic accounting (expenses), and analytics into a single web application that runs online and supports offline-first POS workflows.

### Key Features

- Multi-tenant architecture for single or multi-store deployments
- Fast POS with cart, multiple payment methods (CASH, CARD, LANKAQR, CREDIT)
- Inventory management with reorder alerts, batch & expiry tracking
- Supplier purchase orders and automatic stock receiving
- Customer CRM with loyalty points and credit/debt tracking
- Discounts & promotions (fixed / percentage / date-bounded)
- Shift management and cash reconciliation for cashiers
- Analytics: revenue, top products, stock reports, customer summaries
- Billing & subscription modules for modular feature control
- Offline-first POS queue and automatic sync when online
- Role-based access (ADMIN, CASHIER) and audit logs for compliance

### Problems KadeHub Solves

- Manual cash reconciliation and missing shift reports
- Stockouts and overstock due to poor reorder visibility
- Lost sales when offline or when customer credit isn't tracked
- Time wasted on manual purchase orders and supplier follow-ups
- Lack of actionable reporting to guide reordering and promotions
- Difficulty running consistent promotions and loyalty programs
- Managing multiple stores or tenants from one platform

### Vision

To empower local retailers to run data-driven, profitable stores by providing a reliable, easy-to-use platform that removes operational friction and unlocks digital commerce capabilities.

### Mission

To deliver an affordable, secure, and locally-tailored POS and shop management solution that reduces administrative overhead, prevents stock loss, improves cash handling, and helps retailers grow revenue through insights and customer retention tools.

### Value Proposition / Benefits

- Simplify daily operations: from sales to supplier orders in one place
- Improve cash control and accountability with shift-based reconciliation
- Reduce stockouts and waste with batch/expiry tracking and reorder alerts
- Increase customer retention via loyalty points and targeted discounts
- Make faster decisions using built-in analytics and reports
- Deploy quickly on shared hosting or cloud; low onboarding overhead

### Ideal Customers / Use Cases

- Small grocery and convenience stores seeking a reliable POS
- Pharmacies that require batch and expiry management
- Single-location retailers ready to adopt simple subscription billing
- Growing businesses planning to scale to multiple outlets

### Deployment, Support & Pricing (Summary)

- Quick setup on a MySQL-enabled host or managed cloud instance
- Packages: Starter (core POS + inventory), Pro (analytics + suppliers), Enterprise (multi-store + custom integrations)
- Optional onboarding, training, and priority support packages available

### Next Steps / Demo

Contact us to schedule a live demo, request a trial, or get a custom quote. See the full technical details in [DOCUMENTATION.md](DOCUMENTATION.md).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend framework | NestJS 10 |
| ORM | TypeORM 0.3 |
| Database | MySQL 8 |
| Auth | JWT + Passport |
| Validation | class-validator / class-transformer |
| File uploads | Multer |
| Frontend framework | Next.js 14 (App Router) |
| State management | Zustand |
| UI components | Tailwind CSS + Lucide React |
| Charts | Recharts |
| HTTP client | Axios |
| Notifications | react-hot-toast |

---

## Project Structure

```
Kadehub/
├── backend/
│   └── src/
│       ├── common/
│       │   ├── decorators/       # @CurrentUser, @Roles, etc.
│       │   ├── events/           # AppEventEmitter (loose coupling)
│       │   ├── filters/          # Global exception filter
│       │   └── guards/           # JwtAuthGuard, RolesGuard
│       ├── config/
│       │   └── database.config.ts
│       ├── database/
│       │   ├── entities/         # TypeORM entities
│       │   ├── seeds/            # Seed data (01–05)
│       │   └── schema.sql        # Full DB schema
│       └── modules/
│           ├── auth/
│           ├── analytics/
│           ├── batch/
│           ├── billing/
│           ├── credit/
│           ├── customer/
│           ├── discount/
│           ├── expense/
│           ├── inventory/
│           ├── pos/
│           ├── staff/
│           ├── supplier/
│           └── tenant/
├── frontend/
│   └── src/
│       ├── app/                  # Next.js App Router pages
│       ├── components/           # Reusable UI components
│       ├── hooks/                # Custom React hooks
│       ├── lib/                  # API client, formatters
│       └── types/                # Shared TypeScript types
├── README.md
├── DEPLOYMENT.md
└── DOCUMENTATION.md
```

---

## Database Schema

### Entity Relationship Summary

```
tenant (1) ──< user (many)
tenant (1) ──< product (many)
tenant (1) ──< customer (many)
tenant (1) ──< supplier (many)
tenant (1) ──< sale (many)
tenant (1) ──< expense (many)
tenant (1) ──< discount (many)
tenant (1) ──< shift (many)
tenant (1) ──< subscription (many)

product (1) ──< inventory (1)       [unique]
product (1) ──< batch (many)
product (1) ──< sale_item (many)
product (1) ──< purchase_order_item (many)

sale (1) ──< sale_item (many)
sale (1) ──< credit_sale (1)

credit_sale (1) ──< credit_payment (many)

purchase_order (1) ──< purchase_order_item (many)

package (1) ──< package_module (many)
package (1) ──< subscription (many)
```

### Tables

| Table | Purpose |
|-------|---------|
| `tenant` | Shop/business identity |
| `user` | Staff accounts (ADMIN / CASHIER) |
| `company_profile` | Shop branding, address, tax number |
| `product` | Product catalog with price & cost |
| `inventory` | Stock quantity + reorder level per product |
| `batch` | Batch/lot tracking with expiry dates |
| `customer` | CRM — name, phone, loyalty points |
| `supplier` | Supplier directory |
| `purchase_order` | Supplier orders (pending → received/cancelled) |
| `purchase_order_item` | Line items on a purchase order |
| `sale` | POS transactions |
| `sale_item` | Line items on a sale |
| `credit_sale` | Credit/debt tracking per sale |
| `credit_payment` | Payments recorded against a credit sale |
| `expense` | Business expenses by category |
| `discount` | Promotions (percentage or fixed, date-bounded) |
| `shift` | Cashier shift open/close with cash amounts |
| `audit_log` | Immutable action log per user |
| `package` | Billing packages (Basic, Pro, etc.) |
| `package_module` | Modules included in each package |
| `subscription` | Active module subscriptions per tenant |
| `payment_transaction` | Billing payment records |

---

## Authentication & Multi-Tenancy

### Auth Flow

1. Client sends `POST /api/auth/login` with `{ email, password }`.
2. Backend validates credentials, returns a signed **JWT**.
3. JWT payload contains `{ sub: userId, tenantId, role }`.
4. All subsequent requests include `Authorization: Bearer <token>`.
5. `JwtAuthGuard` validates the token; `RolesGuard` checks `ADMIN` / `CASHIER`.

### Multi-Tenancy

- Every database table (except `package`) has a `tenant_id` foreign key.
- All service queries are automatically scoped to `req.user.tenantId`.
- A tenant is created on shop registration (`POST /api/auth/register`).

### Roles

| Role | Permissions |
|------|------------|
| `ADMIN` | Full access to all modules, user management, audit logs |
| `CASHIER` | POS, inventory view, customer lookup, own shifts |

---

## Modules

### Auth
- Shop registration creates a `tenant` + `ADMIN` user in one transaction.
- Passwords are hashed with **bcrypt**.

### Inventory
- Products have `price` (selling) and `cost` (purchase) fields.
- Each product has exactly one `inventory` row tracking `quantity` and `reorder_level`.
- Low-stock alert: products where `quantity ≤ reorder_level`.
- Product images are uploaded via Multer and served from `/uploads/`.

### POS
- A sale records `total_amount`, `discount`, `payment_method`, and optional `customer_id`.
- On sale completion, an event is emitted:
  - `InventoryService` decrements stock for each `sale_item`.
  - `CustomerService` awards loyalty points (1 pt per LKR 100 spent).
- Payment methods: `CASH`, `CARD`, `LANKAQR`, `CREDIT`.
- `CREDIT` sales automatically create a `credit_sale` record.

### Customer (CRM)
- Stores name, phone, and accumulated loyalty points.
- Points formula: `floor(totalAmount / 100)` per sale.

### Analytics
- Daily/weekly/monthly revenue summaries.
- Top-selling products by quantity or revenue.
- Stock report across all products.
- Customer purchase summary.

### Supplier
- Supplier directory with contact details.
- Purchase orders flow: `pending` → `received` (auto-increments stock) or `cancelled`.

### Expense
- Expenses are categorised (e.g., Rent, Utilities, Salaries).
- Supports date-range filtering and category summary for P&L.

### Discount
- Two types: `percentage` (e.g., 10%) and `fixed` (e.g., LKR 500 off).
- Optional `min_purchase` threshold and `valid_from` / `valid_to` date range.
- `GET /api/discounts/active?total=<amount>` returns applicable discounts for a cart total.

### Credit
- Tracks outstanding debt per sale/customer.
- Status lifecycle: `outstanding` → `partial` → `paid`.
- Payments recorded with method (CASH / CARD / LANKAQR).

### Batch
- Tracks batch numbers, manufactured date, expiry date, and quantity per product.
- Alerts: expiring within N days (`/api/batches/expiring?days=30`) and already expired.

### Staff
- Cashiers open a shift with an opening cash amount.
- Shift report shows sales count and total for that shift.
- Performance report aggregates sales per cashier.
- Audit log records every significant action (entity, action, details JSON).

### Tenant
- `GET /api/tenant/me` — returns tenant info + company profile.
- Admin can create additional users (cashiers) via `POST /api/tenant/users`.

### Billing
- Packages define which modules are available.
- Subscriptions link a tenant to active modules.
- `useSubscribedModules` hook on the frontend hides/shows nav items based on active subscriptions.

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | `/auth/register` | ❌ | `{ shopName, email, password }` |
| POST | `/auth/login` | ❌ | `{ email, password }` |

### Inventory
| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/inventory/products` | ✅ | Query: `?search=`, `?category=` |
| POST | `/inventory/products` | ✅ ADMIN | Multipart (image upload) |
| PATCH | `/inventory/products/:id` | ✅ ADMIN | |
| PATCH | `/inventory/products/:id/stock` | ✅ ADMIN | `{ adjustment: number }` |
| GET | `/inventory/low-stock` | ✅ | |

### POS
| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| POST | `/pos/sales` | ✅ | `{ items, paymentMethod, customerId?, discount? }` |
| GET | `/pos/sales` | ✅ | Query: `?from=`, `?to=` |
| GET | `/pos/sales/:id/receipt` | ✅ | |

### Customers
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/customers` | ✅ |
| POST | `/customers` | ✅ |
| GET | `/customers/:id` | ✅ |

### Analytics
| Method | Endpoint | Auth | Query Params |
|--------|----------|------|-------------|
| GET | `/analytics/summary` | ✅ | `?period=daily\|weekly\|monthly` |
| GET | `/analytics/revenue` | ✅ | `?from=`, `?to=` |
| GET | `/analytics/top-products` | ✅ | `?limit=10` |
| GET | `/analytics/stock-report` | ✅ | |
| GET | `/analytics/customer-summary` | ✅ | |

### Suppliers
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/suppliers` | ✅ |
| POST | `/suppliers` | ✅ ADMIN |
| PATCH | `/suppliers/:id` | ✅ ADMIN |
| GET | `/suppliers/orders` | ✅ |
| POST | `/suppliers/orders` | ✅ ADMIN |
| PATCH | `/suppliers/orders/:id/receive` | ✅ ADMIN |
| PATCH | `/suppliers/orders/:id/cancel` | ✅ ADMIN |

### Expenses
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/expenses` | ✅ | Query: `?from=`, `?to=` |
| GET | `/expenses/summary` | ✅ |
| POST | `/expenses` | ✅ |
| DELETE | `/expenses/:id` | ✅ ADMIN |

### Discounts
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/discounts` | ✅ |
| GET | `/discounts/active?total=` | ✅ |
| POST | `/discounts` | ✅ ADMIN |
| PATCH | `/discounts/:id` | ✅ ADMIN |
| DELETE | `/discounts/:id` | ✅ ADMIN |

### Credit
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/credit` | ✅ |
| GET | `/credit/outstanding` | ✅ |
| GET | `/credit/summary` | ✅ |
| POST | `/credit` | ✅ |
| POST | `/credit/:id/pay` | ✅ | `{ amount, paymentMethod }` |

### Batches
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/batches` | ✅ |
| GET | `/batches/expiring?days=30` | ✅ |
| GET | `/batches/expired` | ✅ |
| POST | `/batches` | ✅ ADMIN |
| DELETE | `/batches/:id` | ✅ ADMIN |

### Staff
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/staff/shifts` | ✅ |
| POST | `/staff/shifts` | ✅ | Open shift |
| PATCH | `/staff/shifts/:id/close` | ✅ | `{ closingCash, notes? }` |
| GET | `/staff/shifts/:id/report` | ✅ |
| GET | `/staff/performance` | ✅ ADMIN |
| GET | `/staff/audit` | ✅ ADMIN |

### Tenant
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/tenant/me` | ✅ |
| GET | `/tenant/users` | ✅ ADMIN |
| POST | `/tenant/users` | ✅ ADMIN | `{ name, email, password, role }` |

---

## Event System

KadeHub uses an internal `AppEventEmitter` (Node.js EventEmitter wrapper) for loose coupling between modules. This avoids direct service-to-service imports and mirrors a future message-broker pattern.

```
POST /pos/sales
  └─ PosService.createSale()
       ├─ emits: SALE_COMPLETED { saleId, tenantId, items, customerId, totalAmount }
       │    ├─ InventoryService.onSaleCompleted() → decrements stock per item
       │    └─ CustomerService.onSaleCompleted()  → awards loyalty points
       └─ (if paymentMethod === CREDIT)
            └─ creates credit_sale record
```

**Future migration:** Replace `AppEventEmitter` with a Kafka producer/consumer without changing service logic.

---

## Billing & Subscriptions

- Packages (e.g., Starter, Pro) are defined in the `package` table with monthly/yearly pricing.
- Each package lists its included modules in `package_module`.
- When a tenant subscribes, rows are inserted into `subscription` (one per module).
- The frontend `useSubscribedModules` hook fetches active subscriptions and conditionally renders navigation items.
- Payment gateways supported: `paypal`, `card`, `bank`.

---

## Frontend Architecture

### Routing (Next.js App Router)

```
app/
├── (auth)/login          → /login
├── (dashboard)/          → / (dashboard home)
├── inventory/            → /inventory
├── pos/                  → /pos
├── customers/            → /customers
├── products/             → /products
└── reports/              → /reports
```

### Key Hooks

| Hook | Purpose |
|------|---------|
| `useAuth` | Login, logout, JWT storage, current user |
| `useCart` | POS cart state (add, remove, update qty) |
| `useProducts` | Fetch + search products |
| `useDateRange` | Shared date range picker state |
| `useOfflineSync` | Queue sales when offline, sync on reconnect |
| `useSubscribedModules` | Active billing modules for nav visibility |

### API Client (`lib/api.ts`)
- Axios instance with `baseURL = NEXT_PUBLIC_API_URL`.
- Request interceptor attaches `Authorization: Bearer <token>` from localStorage.
- Response interceptor redirects to `/login` on `401`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USERNAME` | DB user | `kadehub_user` |
| `DB_PASSWORD` | DB password | `secret` |
| `DB_DATABASE` | DB name | `kadehub` |
| `JWT_SECRET` | JWT signing secret | `long-random-string` |
| `JWT_EXPIRES_IN` | Token expiry | `7d` |
| `NODE_ENV` | Environment | `development` |
| `PORT` | API port | `3001` |
| `FRONTEND_URL` | CORS origin | `http://localhost:3000` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3001/api` |

---

## Local Development

### Prerequisites
- Node.js 18+
- MySQL 8
- XAMPP (or any MySQL server)

### Steps

```bash
# 1. Database
# Create database 'kadehub' in MySQL
# Run backend/src/database/schema.sql
# Optionally run seed files 01–05

# 2. Backend
cd backend
cp .env.example .env        # fill in DB credentials + JWT_SECRET
npm install
npm run start:dev           # http://localhost:3001

# 3. Frontend
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

Demo login: `admin@demo.com` / `Admin@123`

---

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full cPanel guide. Summary:

1. **Database** — create MySQL DB in cPanel, run `schema.sql` via phpMyAdmin.
2. **Backend** — upload `backend/` to `~/kadehub-api/`, configure Node.js App Manager (startup: `dist/main.js`), set env vars, run `npm install && npm run build`.
3. **Frontend** — build locally with production `NEXT_PUBLIC_API_URL`, upload `frontend/` to `~/kadehub-frontend/`, startup file: `server.js`.
4. **Domains** — point `api.yourdomain.com` → backend, `yourdomain.com` → frontend.

### Memory Optimization (shared hosting)
```env
# backend/.env
NODE_OPTIONS=--max-old-space-size=256
```
Database `connectionLimit` is already set to `5` in `database.config.ts`.

---

## Scaling Path

When traffic grows, each module is ready to be extracted:

| Step | Action |
|------|--------|
| 1 | Each `src/modules/*` → standalone NestJS microservice |
| 2 | Replace `AppEventEmitter` → Kafka topics |
| 3 | Add Redis for JWT session cache + rate limiting |
| 4 | Migrate MySQL → PostgreSQL for better concurrency |
| 5 | Add CDN (CloudFront) for product image delivery |
