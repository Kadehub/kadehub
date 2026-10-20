# KadeHub multi-product platform

KadeHub is one platform with several products. Each product runs on its own subdomain, and one KadeHub account signs you in to all of them.

| Host | Serves |
|---|---|
| `kadehub.com`, `www.kadehub.com` | Hub: platform landing (`/`), app launcher (`/apps`), login, super admin, portfolio |
| `pos.kadehub.com` | KadeHub POS (the existing shop app) |
| `cod.kadehub.com` | KadeHub COD (coming soon, being ported from CODPlatform) |
| `tasks.kadehub.com` | KadeHub Tasks, an Airtasker-style marketplace (coming soon) |
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
- **Product states** (`GET /api/platform/my-products`, `GET /api/platform/account`): `not_started`, `trial`, `active`, `expired`, or `free` (Tasks). One function (`PlatformService.summarize`) decides this for every screen.
- **`kadehub.com/account`** lets the person edit their name and phone, change the password for every app, and see each app's plan, trial days left or expiry. From there they can start an app, open it, choose a plan or renew. It's linked from the app launcher, the product switcher in POS and COD, and the Tasks user menu.
- **Starting another product:** `POST /api/platform/enable/:product` (account admins). POS shows a "Start using KadeHub POS" screen to accounts that never had it. COD sends new accounts to its set-up wizard. Tasks turns itself on at the first post or offer.
- **Product pages:** the public landing page is at `/` and the app itself at `/dashboard` (POS and COD), for example `cod.kadehub.com/dashboard`.

## Adding a product

1. Add it to `PRODUCTS` in both registry files.
2. Create `frontend/src/app/<slug>/` (pages are written as if they sit at `/`; link with `productUrl()` or plain relative paths).
3. Create `backend/src/modules/<slug>/` and register it in `app.module.ts`. Gate it with `subscription.product = '<slug>'`.
4. Add a DNS record for the subdomain (below).

## Deployment

- **DNS (Cloudflare):** proxied CNAME records `pos`, `cod` and `tasks` pointing to `kadehub.com`, the same as the shop records the backend already creates. Or use one wildcard `*` record.
- **Frontend host:** add `kadehub.com` and each subdomain (or `*.kadehub.com`) as custom domains on the frontend service.
- **Frontend env:** `NEXT_PUBLIC_ROOT_DOMAIN=kadehub.com`. It's inlined at build time, so pass it as a Docker build arg.
- **Backend env:** `FRONTEND_URL=https://kadehub.com,*.kadehub.com` for CORS.

## Local development

Set `NEXT_PUBLIC_ROOT_DOMAIN=kadehub.localhost:3000` in `frontend/.env.local`, then open `http://kadehub.localhost:3000`, `http://pos.kadehub.localhost:3000`, `http://cod.kadehub.localhost:3000` and so on. Browsers resolve `*.localhost` to your machine.

Browsers won't share cookies across `*.localhost`, so you sign in separately on each subdomain there. To test the shared login, use `NEXT_PUBLIC_ROOT_DOMAIN=lvh.me:3000` (a public DNS name that points `*.lvh.me` at 127.0.0.1).

Don't use bare `localhost:3000` as the root. Next turns redirects to its own origin into relative paths, which breaks redirects from a subdomain back to the hub.
