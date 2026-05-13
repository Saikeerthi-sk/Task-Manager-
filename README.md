# Team Task Manager (Full‑Stack)

A full-stack web app to manage **projects**, **team members**, and **tasks** with **Admin/Member role-based access**, plus a **dashboard** for status + overdue tracking.

## Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, React Router
- **Backend**: Node.js, Express, Prisma, PostgreSQL
- **Auth**: Short-lived **JWT access** token (httpOnly cookie) + **opaque refresh** token (httpOnly cookie, stored hashed in DB), bcrypt password hashing, rate limits, Helmet
- **Deploy**: Railway (single service: API serves built UI)

## Features

- **Authentication**: Signup / Login / Logout / Refresh / Me; **Forgot password** + **Reset password** (email via Resend when configured); sessions survive refresh (refresh cookie); duplicate email prevention; password rules (min 8 + digit)
- **Projects**: Create projects, view projects you belong to
- **Team management (Admin)**: Invite/add members to a project, change role, remove member
- **Tasks**: Create tasks, assign to members, update status, due dates, overdue tracking
- **Dashboard**: Your assigned tasks, status counts, overdue tasks

## Auth API (REST)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Create account; sets httpOnly cookies |
| POST | `/api/auth/login` | Login; sets httpOnly cookies |
| POST | `/api/auth/logout` | Revokes refresh session; clears cookies |
| POST | `/api/auth/refresh` | Issues new access cookie from refresh cookie |
| POST | `/api/auth/forgot-password` | `{ "email" }` — always returns generic success; sends email when `RESEND_API_KEY` is set |
| POST | `/api/auth/reset-password` | `{ "token", "password" }` — sets new password, revokes other sessions, signs you in (cookies) |
| GET | `/api/auth/me` | Current user (Bearer optional; cookies preferred) |
| GET | `/api/me` | Alias of `/api/auth/me` |

The SPA uses `fetch(..., { credentials: 'include' })` so cookies are sent on same-site / proxied dev requests.

## Local setup

### 1) Prereqs

- Node 18+ (recommended 20+)
- PostgreSQL

### 2) Configure env

Copy `server/.env.example` to `server/.env` and edit:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?schema=public"
JWT_SECRET="use-a-long-random-secret-in-production-32plus-chars"
WEB_ORIGIN="http://localhost:5173"
PORT=3000
```

Optional:

- `JWT_ACCESS_MINUTES` — access token lifetime (default `15`)
- `REFRESH_TOKEN_DAYS` — refresh session lifetime (default `14`)
- `TRUST_PROXY=1` — set on Railway so rate limits see real client IPs
- `COOKIE_SECURE=true` — force Secure cookies (defaults on when `NODE_ENV=production`)
- `RESEND_API_KEY` — [Resend](https://resend.com) API key so **forgot-password** emails work in production
- `EMAIL_FROM` — sender for Resend (e.g. `App <noreply@yourdomain.com>`); defaults to Resend onboarding sender in code if empty

### 3) Install

```bash
npm install
```

### 4) DB migrate

```bash
npm run db:migrate
```

First-time or after schema changes, from `server/` you can also run:

```bash
npx prisma migrate dev
```

### 5) Run dev

From the **repository root**:

```bash
npm run dev
```

- UI: `http://localhost:5173` (Vite proxies `/api` → `http://127.0.0.1:3000`)
- API: `http://localhost:3000/api/health`

### Password rules (signup & reset)

- At least **8** characters  
- At least **one digit** (0–9)

### Forgot password (email)

- **Real inbox delivery** needs **[Resend](https://resend.com)** (or you swap in another provider in `server/src/mail.ts`).
- In `server/.env` set **`RESEND_API_KEY`** and **`EMAIL_FROM`** (must be allowed in your Resend account / domain).
- **Local dev without Resend:** the API may return a **`resetPath`** (in-app only, no host) so the user can continue in the browser without email.

Without `RESEND_API_KEY`, **no email is sent** — that is expected until you configure it.

## Railway deployment

### 1) Create a Railway project

- Deploy from your GitHub repo.
- Add **PostgreSQL**.

### 2) Environment variables

- `DATABASE_URL` — from Railway Postgres
- `JWT_SECRET` — **≥ 32 characters** in production
- `WEB_ORIGIN` — your public app URL, e.g. `https://your-app.up.railway.app` (must match the browser origin exactly; no trailing slash unless you use it in the browser)
- `NODE_ENV=production`
- `TRUST_PROXY=1` (recommended behind Railway’s proxy)

### 3) Build & start

Railway runs `npm run build` then `npm run start` (see `railway.json`).

### 4) Migrations

After deploy (or as a deploy step):

```bash
npm run db:migrate
```

### 5) CORS + cookies in production

With the **single-service** layout, the browser loads the UI and calls `/api` on the **same origin**, so cookies and CORS stay simple. `WEB_ORIGIN` must match the URL users type in the address bar.

## Demo video (2–5 minutes)

- Signup / Login
- Create a project (you become Admin)
- Add a member (Admin-only)
- Create tasks, assign, update status
- Dashboard (counts + overdue)
