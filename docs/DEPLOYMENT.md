# KadeHub - cPanel Deployment Guide

## Prerequisites
- cPanel with Node.js App Manager (Node.js 18+)
- MySQL database created in cPanel

---

## Step 1: Database Setup
1. In cPanel → MySQL Databases, create database: `kadehub`
2. Create a MySQL user and assign ALL PRIVILEGES to the database
3. Open phpMyAdmin and run `backend/schema.sql`

---

## Step 2: Backend Deployment

1. Upload `backend/` folder to `/home/<user>/kadehub-api/`

2. In cPanel → Node.js App Manager:
   - Click "Create Application"
   - Node.js version: 18.x
   - Application mode: Production
   - Application root: `kadehub-api`
   - Application URL: `api.yourdomain.com` (or subdomain)
   - Application startup file: `dist/main.js`

3. Set Environment Variables in App Manager:
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USERNAME=your_cpanel_db_user
   DB_PASSWORD=your_db_password
   DB_DATABASE=kadehub
   JWT_SECRET=generate_a_long_random_string_here
   JWT_EXPIRES_IN=7d
   NODE_ENV=production
   PORT=3001
   FRONTEND_URL=https://yourdomain.com
   ```

4. In the App Manager terminal or SSH:
   ```bash
   cd ~/kadehub-api
   npm install
   npm run build
   ```

5. Click "Restart" in App Manager

---

## Step 3: Frontend Deployment

1. Locally, build the frontend:
   ```bash
   cd frontend
   cp .env.local.example .env.local
   # Edit .env.local: NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
   npm install
   npm run build
   ```

2. Upload the entire `frontend/` folder to `/home/<user>/kadehub-frontend/`

3. In cPanel → Node.js App Manager:
   - Create another application
   - Application root: `kadehub-frontend`
   - Application URL: `yourdomain.com`
   - Startup file: `server.js`
   - Node.js version: 18.x

4. Set Environment Variables:
   ```
   NODE_ENV=production
   PORT=3000
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
   ```

5. In terminal:
   ```bash
   cd ~/kadehub-frontend
   npm install --production
   ```

6. Click "Restart"

---

## Step 4: Domain Configuration

In cPanel → Subdomains:
- Create `api.yourdomain.com` pointing to `kadehub-api` folder
- The main domain points to `kadehub-frontend`

---

## Step 5: Verify

- Visit `https://yourdomain.com/login`
- Login with: `admin@demo.com` / `Admin@123`
- Test a sale in POS

---

## Memory Optimization (Low-resource servers)

In `backend/src/config/database.config.ts`, `connectionLimit` is already set to 5.

Add to backend `.env`:
```
NODE_OPTIONS=--max-old-space-size=256
```

---

## Future Scaling Path

When ready to split into microservices:
1. Each `src/modules/*` folder becomes its own NestJS app
2. Replace `AppEventEmitter` with Kafka producer/consumer
3. Add Redis for session/cache layer
4. Migrate to PostgreSQL for better performance
