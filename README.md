# KadeHub - Smart Shop Platform

A production-ready modular micro-SaaS for Sri Lankan local shops (grocery, pharmacy, retail).

## Architecture

```
Modular Monolith → Future Microservices
├── Backend: NestJS (TypeScript) on port 3001
└── Frontend: Next.js (React) on port 3000
```

## Modules

| Module | Features |
|--------|----------|
| Auth | JWT login, shop registration, multi-tenant |
| POS | Cart, sales, CASH/CARD/LANKAQR/CREDIT payments |
| Inventory | Products, stock tracking, low-stock alerts |
| Customer | CRM, loyalty points (1pt per LKR 100) |
| Analytics | Daily summary, top products, revenue chart |
| Supplier | Supplier management, purchase orders, stock receiving |
| Expense | Expense tracking by category, P&L support |
| Discount | Promotions, percentage/fixed discounts, validity periods |
| Credit | Credit sales, debt tracking, payment recording |
| Batch | Batch/expiry tracking, expiring-soon alerts |
| Staff | Cashier shifts, audit logs, performance reports |

## Quick Start (Local)

### Backend
```bash
cd backend
cp .env.example .env        # fill in DB credentials
npm install
# Run schema.sql on your MySQL
npm run start:dev
```

### Frontend
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Visit: http://localhost:3000/login
Demo credentials: `admin@demo.com` / `Admin@123`

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new shop |
| POST | /api/auth/login | Login |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/inventory/products | List products |
| POST | /api/inventory/products | Create product |
| PATCH | /api/inventory/products/:id | Update product |
| PATCH | /api/inventory/products/:id/stock | Adjust stock |
| GET | /api/inventory/low-stock | Low stock alerts |

### POS
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/pos/sales | Create sale |
| GET | /api/pos/sales | List sales |
| GET | /api/pos/sales/:id/receipt | Get receipt |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/customers | List customers |
| POST | /api/customers | Create customer |
| GET | /api/customers/:id | Get customer |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/summary | Sales summary |
| GET | /api/analytics/revenue | Revenue by period |
| GET | /api/analytics/top-products | Top products |
| GET | /api/analytics/stock-report | Stock report |
| GET | /api/analytics/customer-summary | CRM summary |

### Suppliers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/suppliers | List suppliers |
| POST | /api/suppliers | Create supplier |
| PATCH | /api/suppliers/:id | Update supplier |
| GET | /api/suppliers/orders | List purchase orders |
| POST | /api/suppliers/orders | Create purchase order |
| PATCH | /api/suppliers/orders/:id/receive | Receive order (updates stock) |
| PATCH | /api/suppliers/orders/:id/cancel | Cancel order |

### Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/expenses | List expenses (with date range) |
| GET | /api/expenses/summary | Category summary |
| POST | /api/expenses | Create expense |
| DELETE | /api/expenses/:id | Delete expense |

### Discounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/discounts | List all discounts |
| GET | /api/discounts/active?total= | Get applicable discounts for cart total |
| POST | /api/discounts | Create discount |
| PATCH | /api/discounts/:id | Update/toggle discount |
| DELETE | /api/discounts/:id | Delete discount |

### Credit Sales
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/credit | List all credit sales |
| GET | /api/credit/outstanding | Outstanding/partial credits |
| GET | /api/credit/summary | Credit summary stats |
| POST | /api/credit | Create credit sale |
| POST | /api/credit/:id/pay | Record payment |

### Batches
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/batches | List all batches |
| GET | /api/batches/expiring?days=30 | Expiring soon |
| GET | /api/batches/expired | Expired batches |
| POST | /api/batches | Add batch |
| DELETE | /api/batches/:id | Delete batch |

### Staff
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/staff/shifts | List shifts |
| POST | /api/staff/shifts | Open shift |
| PATCH | /api/staff/shifts/:id/close | Close shift |
| GET | /api/staff/shifts/:id/report | Shift report |
| GET | /api/staff/performance | Cashier performance |
| GET | /api/staff/audit | Audit logs (ADMIN) |

### Tenant
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tenant/me | Tenant info |
| GET | /api/tenant/users | List users (ADMIN) |
| POST | /api/tenant/users | Create user (ADMIN) |

## Event Flow (Loose Coupling)

```
POST /pos/sales
  → PosService saves sale
  → emits SALE_COMPLETED event
      → InventoryService listens → decrements stock
      → CustomerService listens → adds loyalty points
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full cPanel deployment guide.
