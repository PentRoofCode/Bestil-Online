# Bestil Online

A two-sided food delivery platform — customers order, restaurants prepare and fulfill. Built as a monorepo with a Node.js/Express backend and a React frontend.

> **Status:** Pre-Phase 0. The repo skeleton is in place; the application code is built incrementally per [`CLAUDE.md`](./CLAUDE.md).

---

## Tech Stack

**Backend:** Node.js 20 · TypeScript · Express · Prisma · PostgreSQL 16 · Redis 7 · Stripe · Zod · JWT
**Frontend:** React 18 · TypeScript · Vite · React Router · TanStack Query · Zustand · Tailwind · shadcn/ui · React Hook Form
**Tooling:** pnpm workspaces · Docker Compose · ESLint · Prettier · Husky · Vitest

The full rationale and locked stack are in [`CLAUDE.md`](./CLAUDE.md).

---

## Prerequisites

- **Node.js** ≥ 20 LTS
- **pnpm** ≥ 9 — install with `npm i -g pnpm`
- **Docker** & **Docker Compose** v2 — for Postgres + Redis
- **Stripe CLI** (Phase 1+) — for forwarding test webhooks: <https://stripe.com/docs/stripe-cli>

Verify:
```bash
node -v        # v20.x or higher
pnpm -v        # 9.x or higher
docker -v
```

---

## Quick Start

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Boot Postgres + Redis
pnpm db:up

# 3. (After Phase 0 scaffolding) Apply migrations and seed
pnpm db:migrate
pnpm db:seed

# 4. Start backend + frontend in parallel
pnpm dev
```

Once running:
- **Frontend:** <http://localhost:5173>
- **Backend:** <http://localhost:4000>
- **API base:** <http://localhost:4000/api/v1>
- **Health check:** <http://localhost:4000/api/v1/healthz>

---

## Working With Claude Code

This repo is built and maintained primarily by [Claude Code](https://docs.claude.com/en/docs/claude-code). The build is driven by [`CLAUDE.md`](./CLAUDE.md), which Claude Code loads automatically as project context.

**Build the project from scratch:**
```
1. Open Claude Code in this directory.
2. Prompt: "Read CLAUDE.md and execute Phase 0."
3. After completion, verify the Definition of Done from CLAUDE.md §8.
4. Prompt: "Proceed with Phase 1."
5. Repeat for each phase.
```

Each phase has explicit Definition of Done criteria — verify them before advancing. Don't skip phases.

---

## Project Structure

```
bestil-online/
├── backend/          # Node + Express + Prisma API
├── frontend/         # React + Vite SPA
├── shared/           # Zod schemas + types reused FE ↔ BE
├── docker/           # Local infra (Postgres init, etc.)
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json      # Root scripts
├── CLAUDE.md         # Build specification (the source of truth)
└── README.md         # This file
```

The `backend/`, `frontend/`, and `shared/` packages are scaffolded by Claude Code in Phase 0 per the spec.

---

## Common Commands

All commands run from the repo root.

### Development
```bash
pnpm dev                    # Start backend + frontend together
pnpm --filter backend dev   # Backend only
pnpm --filter frontend dev  # Frontend only
```

### Database
```bash
pnpm db:up         # Start Postgres + Redis (Docker)
pnpm db:down       # Stop containers (keeps volumes)
pnpm db:reset      # Stop + wipe volumes + restart (destroys data)
pnpm db:migrate    # Apply pending migrations
pnpm db:seed       # Run seed script
pnpm db:studio     # Open Prisma Studio GUI
```

### Stripe (Phase 1+)
```bash
pnpm stripe:listen   # Forward Stripe events to local webhook endpoint
```

When you run `stripe listen` it prints a webhook signing secret. Copy it into `backend/.env` as `STRIPE_WEBHOOK_SECRET`.

### Testing
```bash
pnpm test                      # Run all tests across packages
pnpm --filter backend test     # Backend tests only
pnpm --filter frontend test    # Frontend tests only
```

### Quality
```bash
pnpm lint       # ESLint across all packages
pnpm format     # Prettier write across the repo
pnpm build      # Production build for all packages
```

---

## Environment Variables

Each package has its own `.env`. Copy from `.env.example` and fill in:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

For Stripe, get test keys from <https://dashboard.stripe.com/test/apikeys>. Test card: `4242 4242 4242 4242` with any future expiry and any CVC.

---

## Database Access

The local Postgres container exposes:
- **Host:** `localhost`
- **Port:** `5432`
- **User:** `bestil`
- **Password:** `bestil`
- **Databases:** `bestil_dev`, `bestil_test`

Connect from a GUI (TablePlus, DBeaver, etc.) or the Prisma Studio (`pnpm db:studio`).

---

## Troubleshooting

**"Port 5432/6379 already in use"**
You have another Postgres/Redis running locally. Either stop it or change the host port in `docker-compose.yml`.

**"Cannot find module @prisma/client"**
Run `pnpm --filter backend prisma generate`.

**Stripe webhook signature errors**
Make sure `STRIPE_WEBHOOK_SECRET` matches the secret printed by `stripe listen` for *this* session — it changes per session.

**Migrations out of sync**
`pnpm db:reset && pnpm db:migrate && pnpm db:seed` to nuke and reseed.

---

## Documentation

- [`CLAUDE.md`](./CLAUDE.md) — Build specification (architecture, schema, API, phases)
- Backend README — generated in Phase 0 inside `backend/`
- Frontend README — generated in Phase 0 inside `frontend/`

---

## License

Proprietary — internal Bestil Online project. All rights reserved.
