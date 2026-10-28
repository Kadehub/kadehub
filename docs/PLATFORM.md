# KadeHub multi-product platform

KadeHub is one platform with several products. Each product runs on its own subdomain, and one KadeHub account signs you in to all of them.

| Host | Serves |
|---|---|
| `kadehub.com`, `www.kadehub.com` | Hub: platform landing (`/`), app launcher (`/apps`), login, super admin, portfolio |
| `pos.kadehub.com` | KadeHub POS (the existing shop app) |
| `cod.kadehub.com` | KadeHub COD (coming soon, being ported from CODPlatform) |
| `tasks.kadehub.com` | KadeHub Tasks, an Airtasker-style marketplace (not listed on the hub or in the app lists) |
| `staff.kadehub.com` | KadeHub Staff: employees, rosters, attendance, leave, payroll, hiring, reviews and assets |
| `<shop>.kadehub.com` | That shop's POS |

## How it works

- **One frontend, host-based routing.** [`frontend/src/proxy.ts`](../frontend/src/proxy.ts) (Next 16's renamed middleware) reads the `Host` header:
  - Hub: `/` is rewritten to `src/app/hub`. Any POS path (for example an old `kadehub.com/dashboard` bookmark) redirects to `pos.`.
  - POS and shop subdomains: the routes at the app root, as before.
  - Other products: rewritten into their folder. `cod.kadehub.com/orders` renders `src/app/cod/orders`.
  - `/login` works on every host. Hub-only paths (`/apps`, `/super-admin`, `/portfolio`) redirect to the hub.
  - Hosts outside the root domain (an IP address, a Railway preview URL, plain `localhost`) are not routed, so everything works by path.
- **Shared login.** The auth store is saved in a `kh_auth` cookie on `.kadehub.com` ([`lib/session.ts`](../frontend/src/lib/session.ts)), not in per-origin localStorage, so a login on any subdomain counts for all of them. Existing localStorage sessions are moved over automatically. Super-admin impersonation keeps the admin's session in a `kh_sa_backup` cookie, so it survives the jump from the hub to `pos.`.
- **Product registry.** `PRODUCTS` in [`frontend/src/lib/platform.ts`](../frontend/src/lib/platform.ts) and [`backend/src/common/products.ts`](../backend/src/common/products.ts). Keep the two in sync.
- **Reserved subdomains.** Product subdomains, plus names like `api`, `accounts` and `admin`, can't be registered as shop subdomains (`RESERVED_SUBDOMAINS`, checked in both `check-subdomain` and `register`).
- **Billing per product.** `package.product` and `subscription.product` (migration `010_multi_product`, default `pos`). `GET /api/platform/my-products` returns the registry with `enabled` flags for the signed-in account, and `/apps` uses it. The migration logs a warning if an existing shop already owns a product subdomain.

## Accounts and subscriptions

- **One account, many products.** An account is a tenant plus its users. Each product the account uses is one or more `subscription` rows with that `product`.
- **Product states** (`GET /api/platform/my-products`, `GET /api/platform/account`): `not_started`, `trial`, `active`, `expired`, or `free` (Tasks, and Staff after its trial or a paid plan ends). One function (`PlatformService.summarize`) decides this for every screen.
- **`kadehub.com/account`** lets the person edit their name and phone, change the password for every app, and see each app's plan, trial days left or expiry. From there they can start an app, open it, choose a plan or renew. It's linked from the app launcher, the product switcher in POS and COD, and the Tasks user menu.
- **Starting another product:** `POST /api/platform/enable/:product` (account admins). POS shows a "Start using KadeHub POS" screen to accounts that never had it. COD and Staff send new accounts to their set-up wizards. Tasks turns itself on at the first post or offer.
- **Product pages:** the public landing page is at `/` and the app itself at `/dashboard` (POS and COD), for example `cod.kadehub.com/dashboard`.

## Adding a product

1. Add it to `PRODUCTS` in both registry files.
2. Create `frontend/src/app/<slug>/` (pages are written as if they sit at `/`; link with `productUrl()` or plain relative paths). The proxy treats `/<slug>` on every host as a link to the product, so the slug must not clash with a POS route (that's why Staff's slug is `hr`: POS owns `/staff`).
3. Set `listed: false` in the frontend registry to keep a product off the hub, the app launcher and the product switchers while its subdomain keeps working.
4. Create `backend/src/modules/<slug>/` and register it in `app.module.ts`. Gate it with `subscription.product = '<slug>'`.
5. Add a DNS record for the subdomain (below).

## KadeHub COD

- **Plans by monthly order volume** (`cod-plans.ts`, seeded into `package` with `product = 'cod'`): Free (50 orders a month), Growth (100, Rs 5,000) and Scale (200, Rs 10,000). Items are unlimited on every plan. Free never expires, and when a paid plan ends the account carries on as Free instead of being locked out.
- **Grace and warnings.** Past the monthly limit, 5 more orders still go through (`COD_ORDER_GRACE`), then new orders are blocked. A banner across the app warns from 80% of the limit, turns red during the grace orders and stays while blocked. The toast after creating an order says how many are left. The old Pro and Business plans are no longer sold; current subscribers keep them until they expire.
- **Top-ups.** On a paid Scale plan the billing page offers 100 more orders for Rs 5,000 once the seller has used 90% of the month's orders. It's a hidden package (`cod-topup-100`) sold through the shared checkout. Paying adds a `cod_order_topup` row for the current calendar month, and the plan stays as it is. The order limit is the plan's orders plus this month's top-ups.

## KadeHub Staff

- **Slug `hr`, subdomain `staff`.** Pages live in `frontend/src/app/hr`, the API under `/api/hr` (`backend/src/modules/hr`), tables are prefixed `hr_` (migrations `300`–`399` in `migrations-hr.ts`).
- **Plans** (`hr-plans.ts`, seeded into `package` with `product = 'hr'`): Free (3 staff, 1 branch), Starter, Business, Pro. New accounts get 14 days of Pro; when the trial or a paid plan ends the account drops to Free instead of being locked out. Limits are checked when adding employees and branches.
- **Roles.** The account's ADMIN is the owner (everything). Any other user listed in `hr_branch_manager` manages only those branches and never sees pay, payroll, plans or settings. Owners create manager logins from Settings → Managers.
- **Kiosk.** `staff.kadehub.com/kiosk` runs on the shop's tablet under a manager's or owner's session. Employees pick their name and enter a 4-digit PIN to clock in or out (optional photo), see their shifts, request leave, ask a colleague to swap a shift and acknowledge reviews and warnings. Five wrong PINs lock that employee out for five minutes.
- **Payroll rules** live in `hr-calc.ts` (unit-tested): no-pay for unpaid leave and absent rostered days, overtime past a minimum at a multiplier, optional late deductions, EPF on basic pay, salary advances repaid from payslips, unreturned assets charged once. Runs go draft → finalized → paid; finalizing books advance repayments and asset charges, reopening undoes them.
- **Public job pages** at `staff.kadehub.com/jobs/<token>` take applications with a CV, no sign-in.

## Deployment

- **DNS (Cloudflare):** proxied CNAME records `pos`, `cod`, `tasks` and `staff` pointing to `kadehub.com`, the same as the shop records the backend already creates. Or use one wildcard `*` record.
- **Frontend host:** add `kadehub.com` and each subdomain (or `*.kadehub.com`) as custom domains on the frontend service.
- **Frontend env:** `NEXT_PUBLIC_ROOT_DOMAIN=kadehub.com`. It's inlined at build time, so pass it as a Docker build arg.
- **Backend env:** `FRONTEND_URL=https://kadehub.com,*.kadehub.com` for CORS.

## Local development

Set `NEXT_PUBLIC_ROOT_DOMAIN=kadehub.localhost:3000` in `frontend/.env.local`, then open `http://kadehub.localhost:3000`, `http://pos.kadehub.localhost:3000`, `http://cod.kadehub.localhost:3000` and so on. Browsers resolve `*.localhost` to your machine.

Browsers won't share cookies across `*.localhost`, so you sign in separately on each subdomain there. To test the shared login, use `NEXT_PUBLIC_ROOT_DOMAIN=lvh.me:3000` (a public DNS name that points `*.lvh.me` at 127.0.0.1).

Don't use bare `localhost:3000` as the root. Next turns redirects to its own origin into relative paths, which breaks redirects from a subdomain back to the hub.
