# Bestil Online — Build Specification

> **READ FIRST.** This document is the single source of truth for building the Bestil Online food delivery platform. Build features in the order specified in **Section 8 (Implementation Phases)**. Do **not** skip phases or invent features outside scope. When implementing, prefer simplicity and clarity over cleverness. Ask the user only when business logic is genuinely ambiguous — for technical decisions, follow this doc.

---

## 1. Project Overview

**Name:** Bestil Online
**Type:** Two-sided food delivery marketplace (customers ↔ restaurants)
**Scale target:** Mid-scale (10k–100k orders/month)
**Initial platform:** Web (responsive). Architect so a React Native shell can reuse the API and types later.
**Repo style:** Monorepo (`backend/`, `frontend/`, `shared/`).

### Feature priorities

| Priority | Feature | Phase |
|---|---|---|
| 5/5 | Restaurant management & menus | 1 |
| 5/5 | Order management | 1 |
| 5/5 | Payment processing (Stripe) | 1 |
| 3/5 | Admin dashboard | 2 |
| 2/5 | User auth & profiles | 1 (minimum viable; expand in 2) |
| 1/5 | Ratings & reviews | 3 |
| 0/5 | Real-time delivery tracking | Out of scope |

Auth is listed 2/5 by the user but is structurally required for ordering/payments. Implement a minimum-viable auth in Phase 1; expand in Phase 2.

---

## 2. Tech Stack (Locked)

### Backend
- **Runtime:** Node.js 20 LTS
- **Language:** TypeScript 5.x (strict mode)
- **Framework:** Express 4.x
- **Database:** PostgreSQL 16
- **ORM:** Prisma 5.x
- **Cache:** Redis 7.x (sessions, rate limiting, hot menu cache)
- **Validation:** Zod (request bodies, env vars, shared schemas)
- **Auth:** `jsonwebtoken` + `bcrypt`
- **Payments:** Stripe Node SDK
- **Logging:** Pino (+ pino-http)
- **Testing:** Vitest + Supertest

### Frontend
- **Framework:** React 18
- **Language:** TypeScript 5.x (strict mode)
- **Build:** Vite 5.x
- **Routing:** React Router 6
- **Server state:** TanStack Query v5
- **Client state:** Zustand (cart, auth user)
- **Styling:** Tailwind CSS 3 + shadcn/ui (Radix primitives)
- **Forms:** React Hook Form + Zod resolver
- **HTTP:** Axios with interceptors
- **Icons:** lucide-react
- **Testing:** Vitest + React Testing Library

### Tooling
- **Package manager:** pnpm with workspaces
- **Linting:** ESLint + Prettier
- **Git hooks:** Husky + lint-staged
- **Containers:** Docker Compose for Postgres + Redis (dev only)
- **CI:** GitHub Actions (lint + test on PR)

**Do not introduce alternative libraries without flagging it.** If a need arises that this stack doesn't cover (e.g., a charting library for admin), pick the simplest popular option and proceed.

---

## 3. Project Structure

```
bestil-online/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/                # env, db, redis, stripe clients
│   │   ├── modules/               # vertical slices per feature
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── restaurants/
│   │   │   ├── menus/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   ├── reviews/
│   │   │   └── admin/
│   │   ├── middleware/            # auth, role, error, validate, rateLimit
│   │   ├── utils/                 # logger, ApiError, ApiResponse, asyncHandler
│   │   ├── types/                 # express.d.ts augmentations
│   │   ├── app.ts                 # Express app composition
│   │   └── server.ts              # Entry point
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/                   # axios client + per-module API fns
│   │   ├── components/
│   │   │   ├── ui/                # shadcn/ui primitives
│   │   │   ├── layout/            # Header, Footer, Sidebar
│   │   │   ├── restaurant/
│   │   │   ├── order/
│   │   │   └── admin/
│   │   ├── pages/
│   │   │   ├── customer/
│   │   │   ├── restaurant/        # restaurant owner pages
│   │   │   └── admin/
│   │   ├── hooks/                 # useAuth, useCart, etc.
│   │   ├── stores/                # Zustand stores
│   │   ├── lib/                   # cn(), formatters, validators
│   │   ├── routes/                # Route tree + guards (RequireAuth, RequireRole)
│   │   ├── types/                 # imports from shared/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── shared/
│   ├── src/
│   │   ├── schemas/               # Zod schemas reused FE + BE
│   │   └── types/                 # Inferred types from schemas
│   └── package.json
│
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json
├── .gitignore
├── .editorconfig
└── README.md
```

**Module pattern (backend, every feature):**
```
modules/<feature>/
├── <feature>.controller.ts   # HTTP layer, calls service, returns response
├── <feature>.service.ts      # Business logic, calls Prisma
├── <feature>.routes.ts       # Express router, attaches middleware
├── <feature>.schemas.ts      # Zod schemas for requests
└── <feature>.types.ts        # Internal types
```

---

## 4. Database Schema (Prisma)

Use this `schema.prisma` exactly. Add fields only when a feature requires them. Run `prisma migrate dev` after each schema change.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============= USERS =============
enum UserRole {
  CUSTOMER
  RESTAURANT_OWNER
  ADMIN
  SUPER_ADMIN
}

model User {
  id               String   @id @default(uuid())
  email            String   @unique
  passwordHash     String
  phone            String?
  firstName        String
  lastName         String
  role             UserRole @default(CUSTOMER)
  emailVerified    Boolean  @default(false)
  isActive         Boolean  @default(true)
  profilePicture   String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  addresses        Address[]
  orders           Order[]
  reviews          Review[]
  ownedRestaurants Restaurant[] @relation("RestaurantOwner")

  @@index([email])
  @@index([role])
}

model Address {
  id         String   @id @default(uuid())
  userId     String
  label      String
  street     String
  city       String
  postalCode String
  country    String   @default("DK")
  latitude   Float?
  longitude  Float?
  isDefault  Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  orders     Order[]

  @@index([userId])
}

// ============= RESTAURANTS =============
model Restaurant {
  id                 String   @id @default(uuid())
  ownerId            String
  name               String
  slug               String   @unique
  description        String?
  logoUrl            String?
  bannerUrl          String?
  phone              String
  email              String
  street             String
  city               String
  postalCode         String
  country            String   @default("DK")
  latitude           Float?
  longitude          Float?
  cuisines           String[]
  openingHours       Json     // { mon: {open, close, closed?}, ... }
  isActive           Boolean  @default(false)  // Owner toggle
  isVerified         Boolean  @default(false)  // Admin gate
  avgRating          Float    @default(0)
  reviewCount        Int      @default(0)
  deliveryTimeMin    Int      @default(30)
  deliveryFee        Decimal  @db.Decimal(10, 2) @default(0)
  minimumOrderAmount Decimal  @db.Decimal(10, 2) @default(0)
  commissionRate     Decimal  @db.Decimal(5, 4)  @default(0.15)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  owner       User           @relation("RestaurantOwner", fields: [ownerId], references: [id])
  categories  MenuCategory[]
  menuItems   MenuItem[]
  orders      Order[]
  reviews     Review[]

  @@index([slug])
  @@index([isActive, isVerified])
  @@index([city])
}

// ============= MENU =============
model MenuCategory {
  id           String   @id @default(uuid())
  restaurantId String
  name         String
  description  String?
  displayOrder Int      @default(0)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  restaurant Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  menuItems  MenuItem[]

  @@index([restaurantId, displayOrder])
}

model MenuItem {
  id                 String   @id @default(uuid())
  restaurantId       String
  categoryId         String
  name               String
  description        String?
  price              Decimal  @db.Decimal(10, 2)
  imageUrl           String?
  isAvailable        Boolean  @default(true)
  preparationTimeMin Int      @default(15)
  isVegetarian       Boolean  @default(false)
  isVegan            Boolean  @default(false)
  allergens          String[]
  displayOrder       Int      @default(0)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  restaurant   Restaurant            @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  category     MenuCategory          @relation(fields: [categoryId], references: [id])
  optionGroups MenuItemOptionGroup[]
  orderItems   OrderItem[]

  @@index([restaurantId, isAvailable])
  @@index([categoryId])
}

model MenuItemOptionGroup {
  id            String  @id @default(uuid())
  menuItemId    String
  name          String  // e.g. "Size", "Add-ons"
  isRequired    Boolean @default(false)
  isMultiSelect Boolean @default(false)
  displayOrder  Int     @default(0)

  menuItem MenuItem         @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  options  MenuItemOption[]
}

model MenuItemOption {
  id            String  @id @default(uuid())
  optionGroupId String
  name          String
  priceModifier Decimal @db.Decimal(10, 2) @default(0)
  displayOrder  Int     @default(0)

  optionGroup MenuItemOptionGroup @relation(fields: [optionGroupId], references: [id], onDelete: Cascade)
}

// ============= ORDERS =============
enum OrderStatus {
  PENDING_PAYMENT
  PAYMENT_FAILED
  PENDING_CONFIRMATION
  CONFIRMED
  PREPARING
  READY_FOR_PICKUP
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
  REFUNDED
}

model Order {
  id                  String      @id @default(uuid())
  orderNumber         String      @unique  // BO-YYYYMMDD-XXXXXX
  userId              String
  restaurantId        String
  deliveryAddressId   String
  status              OrderStatus @default(PENDING_PAYMENT)
  subtotal            Decimal     @db.Decimal(10, 2)
  deliveryFee         Decimal     @db.Decimal(10, 2)
  tax                 Decimal     @db.Decimal(10, 2)
  discount            Decimal     @db.Decimal(10, 2) @default(0)
  totalAmount         Decimal     @db.Decimal(10, 2)
  platformCommission  Decimal     @db.Decimal(10, 2)
  restaurantPayout    Decimal     @db.Decimal(10, 2)
  specialInstructions String?
  estimatedDeliveryAt DateTime?
  confirmedAt         DateTime?
  preparingAt         DateTime?
  readyAt             DateTime?
  deliveredAt         DateTime?
  cancelledAt         DateTime?
  cancellationReason  String?
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  user            User        @relation(fields: [userId], references: [id])
  restaurant      Restaurant  @relation(fields: [restaurantId], references: [id])
  deliveryAddress Address     @relation(fields: [deliveryAddressId], references: [id])
  items           OrderItem[]
  payment         Payment?
  review          Review?

  @@index([userId, createdAt(sort: Desc)])
  @@index([restaurantId, status])
  @@index([orderNumber])
  @@index([status])
}

model OrderItem {
  id                  String   @id @default(uuid())
  orderId             String
  menuItemId          String
  menuItemName        String   // snapshot
  quantity            Int
  unitPrice           Decimal  @db.Decimal(10, 2)
  itemTotal           Decimal  @db.Decimal(10, 2)
  selectedOptions     Json?    // [{groupName, optionName, priceModifier}]
  specialInstructions String?

  order    Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  menuItem MenuItem @relation(fields: [menuItemId], references: [id])

  @@index([orderId])
}

// ============= PAYMENTS =============
enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
}

enum PaymentMethod {
  CARD
  WALLET
  CASH_ON_DELIVERY
}

model Payment {
  id                    String        @id @default(uuid())
  orderId               String        @unique
  amount                Decimal       @db.Decimal(10, 2)
  currency              String        @default("DKK")
  status                PaymentStatus @default(PENDING)
  method                PaymentMethod
  stripePaymentIntentId String?       @unique
  stripeChargeId        String?
  failureReason         String?
  refundedAmount        Decimal?      @db.Decimal(10, 2)
  createdAt             DateTime      @default(now())
  completedAt           DateTime?
  updatedAt             DateTime      @updatedAt

  order Order @relation(fields: [orderId], references: [id])

  @@index([stripePaymentIntentId])
  @@index([status])
}

// ============= REVIEWS (Phase 3) =============
model Review {
  id             String   @id @default(uuid())
  orderId        String   @unique
  userId         String
  restaurantId   String
  rating         Int      // 1-5, overall
  foodRating     Int?
  deliveryRating Int?
  comment        String?
  isVisible      Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  order      Order      @relation(fields: [orderId], references: [id])
  user       User       @relation(fields: [userId], references: [id])
  restaurant Restaurant @relation(fields: [restaurantId], references: [id])

  @@index([restaurantId, isVisible])
}
```

**Money handling:** Always use Prisma `Decimal` for amounts. In application code, use the `decimal.js` library that ships with Prisma — never coerce to JS `number` for math. Default currency: **DKK**.

**Order number generation:** `BO-{YYYYMMDD}-{6-char nanoid uppercase}`.

---

## 5. API Conventions (apply to every endpoint)

**Base URL:** `/api/v1`

**Standard response envelope:**
```ts
// Success
{ success: true, data: T, meta?: { pagination?: { page, limit, total, totalPages } } }

// Error
{ success: false, error: { code: string, message: string, details?: unknown } }
```

**HTTP status codes:**
- `200` OK · `201` Created · `204` No Content
- `400` Validation/Bad Request · `401` Unauthorized · `403` Forbidden
- `404` Not Found · `409` Conflict · `422` Unprocessable
- `429` Rate Limited · `500` Server Error

**Auth model:**
- Access token: JWT, 15 min expiry, sent in `Authorization: Bearer <token>` header.
- Refresh token: opaque, 7 day expiry, stored in `httpOnly` `Secure` `SameSite=Lax` cookie.
- `/auth/refresh` rotates the refresh token on every use.

**Pagination:** `?page=1&limit=20`. Default `limit=20`, max `100`.

**Sorting:** `?sortBy=createdAt&order=desc` where allowed.

**Filtering:** Document supported filters per endpoint. Reject unknown query params with 400.

**Validation:** All request bodies, params, and queries are validated by Zod via `validate.middleware.ts`. Validation failures return `400` with `error.code = "VALIDATION_ERROR"` and field-level `details`.

**Error codes (use exactly these strings):**
`VALIDATION_ERROR`, `UNAUTHORIZED`, `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `PAYMENT_FAILED`, `INTERNAL_ERROR`.

---

## 6. API Endpoints

### 6.1 Phase 1 (Core)

#### Auth (`/auth`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register customer or restaurant owner |
| POST | `/auth/login` | — | Returns `{ accessToken, user }`, sets refresh cookie |
| POST | `/auth/logout` | Any | Clears refresh cookie, revokes server-side |
| POST | `/auth/refresh` | Cookie | Rotates tokens |
| GET  | `/auth/me` | Any | Current user |

#### Restaurants (`/restaurants`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/restaurants` | Public | List active+verified. Filters: `?city=&cuisine=&search=&minRating=` |
| GET  | `/restaurants/:slug` | Public | Public detail page |
| POST | `/restaurants` | OWNER | Create (becomes pending verification) |
| PATCH | `/restaurants/:id` | OWNER (own) / ADMIN | Update |
| GET  | `/restaurants/me` | OWNER | Owned restaurants |

#### Menu (`/restaurants/:restaurantId/menu`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `.../menu` | Public | Full menu (categories + items + options) |
| POST | `.../categories` | OWNER (own) | Create category |
| PATCH | `.../categories/:id` | OWNER (own) | Update |
| DELETE | `.../categories/:id` | OWNER (own) | Delete (soft via `isActive=false` if has items) |
| POST | `.../items` | OWNER (own) | Create item |
| PATCH | `.../items/:id` | OWNER (own) | Update item |
| PATCH | `.../items/:id/availability` | OWNER (own) | Toggle availability |
| DELETE | `.../items/:id` | OWNER (own) | Delete |
| POST | `.../items/:id/option-groups` | OWNER (own) | Create option group + options |

#### Orders (`/orders`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/orders` | CUSTOMER | Create order. Returns order + Stripe `clientSecret`. Status starts `PENDING_PAYMENT`. |
| GET  | `/orders` | CUSTOMER | My orders |
| GET  | `/orders/:id` | CUSTOMER (own) / OWNER (restaurant) / ADMIN | Detail |
| PATCH | `/orders/:id/status` | OWNER (restaurant) / ADMIN | Transition status (validate allowed transitions) |
| POST | `/orders/:id/cancel` | CUSTOMER (own, if cancellable) / ADMIN | Cancel + refund if paid |
| GET  | `/restaurants/:id/orders` | OWNER (own) / ADMIN | Restaurant order queue |

**Allowed status transitions (enforce in service):**
```
PENDING_PAYMENT → PAYMENT_FAILED | PENDING_CONFIRMATION
PENDING_CONFIRMATION → CONFIRMED | CANCELLED
CONFIRMED → PREPARING | CANCELLED
PREPARING → READY_FOR_PICKUP | CANCELLED
READY_FOR_PICKUP → OUT_FOR_DELIVERY | DELIVERED
OUT_FOR_DELIVERY → DELIVERED
DELIVERED → REFUNDED   (admin-only edge case)
CANCELLED → REFUNDED   (if had paid)
```
Any other transition returns `409 CONFLICT`.

#### Payments (`/payments`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/payments/webhook` | Stripe sig | Stripe webhook (raw body, verified) |
| POST | `/payments/:orderId/refund` | ADMIN | Manual refund |

Payment intents are created server-side inside `POST /orders`. The frontend confirms with the returned `clientSecret`. The webhook is the source of truth for payment success/failure — do not trust client confirmation alone.

### 6.2 Phase 2 (Admin + expanded auth)

#### Users (`/users`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/users/me` | Any | Profile |
| PATCH | `/users/me` | Any | Update profile |
| GET  | `/users/me/addresses` | Any | List addresses |
| POST | `/users/me/addresses` | Any | Create |
| PATCH | `/users/me/addresses/:id` | Any | Update |
| DELETE | `/users/me/addresses/:id` | Any | Delete |
| POST | `/users/me/change-password` | Any | Change password |

#### Admin (`/admin`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/admin/stats/overview` | ADMIN | Today/30d totals: orders, revenue, AOV, active restaurants |
| GET  | `/admin/restaurants` | ADMIN | List with `?status=pending|verified|all` |
| POST | `/admin/restaurants/:id/verify` | ADMIN | Mark verified |
| POST | `/admin/restaurants/:id/suspend` | ADMIN | `isActive=false`, requires reason |
| GET  | `/admin/orders` | ADMIN | All orders, filterable |
| GET  | `/admin/payments` | ADMIN | Payments list |
| GET  | `/admin/users` | ADMIN | Users list |
| PATCH | `/admin/users/:id/status` | SUPER_ADMIN | Activate/deactivate |
| GET  | `/admin/reports/revenue` | ADMIN | `?from=&to=&groupBy=day|week|month` |

### 6.3 Phase 3 (Reviews)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/orders/:id/review` | CUSTOMER (own delivered order) | Create review (one per order) |
| GET  | `/restaurants/:id/reviews` | Public | Paginated, only `isVisible=true` |
| PATCH | `/admin/reviews/:id/visibility` | ADMIN | Hide/unhide |

---

## 7. Frontend Architecture

### 7.1 Routing

Top-level route groups, each with its own layout:

```
/                         → CustomerLayout
  /                       → HomePage (browse restaurants)
  /restaurants/:slug      → RestaurantPage (menu + cart drawer)
  /checkout               → CheckoutPage (auth required)
  /orders                 → OrdersListPage (auth required)
  /orders/:id             → OrderDetailPage
  /account                → AccountPage (profile, addresses)
  /login, /register       → AuthPages

/restaurant               → OwnerLayout (RESTAURANT_OWNER role)
  /dashboard              → OwnerDashboardPage
  /menu                   → MenuManagerPage
  /orders                 → OrderQueuePage
  /settings               → RestaurantSettingsPage

/admin                    → AdminLayout (ADMIN role)
  /dashboard              → AdminDashboardPage
  /restaurants            → RestaurantsAdminPage
  /orders                 → OrdersAdminPage
  /users                  → UsersAdminPage
  /reports                → ReportsPage
```

**Route guards:** `<RequireAuth>` and `<RequireRole roles={[...]}>` HOCs read from the auth Zustand store. Unauthenticated users are redirected to `/login?redirect=<original>`.

### 7.2 State management

- **Server state → TanStack Query.** Define query/mutation hooks per resource in `src/api/<resource>.api.ts` and consume them in components. Standard query keys: `['restaurants', filters]`, `['restaurant', slug]`, `['orders', 'me']`, `['order', id]`.
- **Auth state → Zustand store** (`useAuthStore`). Persist access token in memory only; refresh token lives in httpOnly cookie. On app load, call `/auth/me` to hydrate.
- **Cart state → Zustand store** (`useCartStore`), persisted to `localStorage`. One restaurant per cart — switching restaurants prompts to clear.
- **UI state (modals, drawers) → local `useState`** unless shared cross-tree.

### 7.3 Forms

Every form uses React Hook Form with the Zod resolver. Schemas live in `shared/src/schemas` so the same validation runs on both ends.

### 7.4 Styling

Tailwind utility-first. shadcn/ui for primitives (Button, Dialog, Form, Toast, Tabs, Table, Sheet). Use `cn()` helper for conditional classes. Mobile-first breakpoints. Dark mode is **not** in scope for v1.

---

## 8. Implementation Phases

Build in this order. **Do not skip ahead.** Each phase has a "Definition of Done" — confirm with the user before starting the next phase.

### Phase 0 — Foundation (do this once)
1. Initialize monorepo: `pnpm init`, set up `pnpm-workspace.yaml` with `backend`, `frontend`, `shared`.
2. Set up `docker-compose.yml` with Postgres 16 and Redis 7.
3. Backend scaffold: TS, Express, Pino, error middleware, health check at `GET /healthz`.
4. Frontend scaffold: Vite + React + TS, Tailwind, shadcn/ui init, base layout.
5. Shared package: Zod schemas barrel export.
6. Set up ESLint, Prettier, Husky, lint-staged, `.editorconfig`.
7. Write a thorough root `README.md` with setup instructions.
8. Create `.env.example` files for both packages.

**Definition of Done:** `pnpm dev` starts both backend (`http://localhost:4000`) and frontend (`http://localhost:5173`); `GET /api/v1/healthz` returns `{ success: true, data: { status: "ok" } }`; the frontend shows a styled "Bestil Online" landing placeholder.

### Phase 1 — Core (Restaurants, Menus, Orders, Payments, MVP Auth)

Order within phase matters:

1. **Database & Prisma:** Apply the full schema from Section 4. Generate migrations. Write a `seed.ts` that creates: 1 admin, 2 restaurant owners, 3 restaurants (verified+active) with full menus (categories, items, option groups), 1 customer with addresses.
2. **MVP Auth:** Register/login/logout/refresh/me. Bcrypt cost 12. JWT with `JWT_SECRET` from env. Refresh token cookie. Role enforcement middleware.
3. **Restaurants module:** CRUD per Section 6.1. Public listing filters. Slug auto-generation (kebab-case + nanoid suffix on collision). Owner-only edit guard.
4. **Menu module:** Categories, items, option groups, options. Owner-only writes. Public read. Cache full menu in Redis with key `menu:{restaurantId}`, TTL 5 min, invalidate on any write.
5. **Customer browsing UI:** Home page lists restaurants with filters, restaurant detail page with menu, cart drawer (Zustand), add-to-cart with option selection.
6. **Restaurant owner UI:** Dashboard skeleton, menu manager (categories list + item editor with image upload placeholder).
7. **Orders module:** Create order endpoint validates: restaurant active+verified, all items belong to that restaurant, all items available, address belongs to user, subtotal ≥ minimum order. Snapshots names/prices into `OrderItem`. Computes `tax` (use 25% Danish VAT — make configurable via env), `platformCommission = subtotal * commissionRate`, `restaurantPayout = subtotal - platformCommission`. Generates order number. Creates Stripe PaymentIntent. Returns order + `clientSecret`. Sets status `PENDING_PAYMENT`.
8. **Payments module:** Stripe webhook handler (verify signature with `STRIPE_WEBHOOK_SECRET`, raw body). On `payment_intent.succeeded`: update Payment to COMPLETED, transition order to `PENDING_CONFIRMATION`. On `payment_intent.payment_failed`: Payment FAILED, order `PAYMENT_FAILED`. Idempotent (use `stripePaymentIntentId` as dedup key).
9. **Order status transitions:** Owner can advance their orders. Validate transitions per Section 6.1. Customer can cancel only in `PENDING_PAYMENT` or `PENDING_CONFIRMATION`. Refund on cancel-after-payment via Stripe Refunds API.
10. **Customer checkout UI:** Address selector (or quick-add inline), order summary, Stripe Elements card input, place order, redirect to order detail showing live status.
11. **Owner order queue UI:** Realtime-ish via TanStack Query polling every 15s (no websockets in v1). Buttons to advance status. Visible toast on new orders.
12. **Tests:** Unit tests for order total calculation, status transition validator, slug generation. Integration tests for the full happy path: register → browse → cart → checkout → webhook → owner confirms → delivered.

**Definition of Done:**
- A seeded customer can place a paid order using Stripe test card `4242 4242 4242 4242`.
- The webhook moves the order to `PENDING_CONFIRMATION`.
- The restaurant owner can advance the order all the way to `DELIVERED`.
- A customer cancellation after payment triggers a Stripe refund and order moves to `REFUNDED`.
- All happy-path integration tests pass.

### Phase 2 — Admin Dashboard + Expanded Auth

1. Admin endpoints per Section 6.2.
2. Admin layout + dashboard with stat cards (today's orders, revenue, AOV, active restaurants), driven by `/admin/stats/overview`.
3. Restaurants admin page: table with verify/suspend actions. Pending queue at top.
4. Orders admin page: filterable table, drill-in to order detail.
5. Users admin page (super_admin only for status changes).
6. Reports page: revenue chart (Recharts) over selectable date range.
7. Profile + address management UI for customers (`/account`).
8. Email verification flow (use Nodemailer, log emails to console in dev).
9. Forgot/reset password flow.
10. Rate limiting via Redis on `/auth/login`, `/auth/register`, `/auth/forgot-password` (5/min/IP).

**Definition of Done:** Admin can verify a new restaurant, view aggregated stats, and run a revenue report. Customers can manage their profile, addresses, and reset passwords end-to-end.

### Phase 3 — Reviews

1. Review endpoints per Section 6.3.
2. After `DELIVERED`, the customer's order detail page shows a "Leave a review" CTA.
3. Reviews list on the restaurant public page, paginated.
4. Aggregate update: on review create/visibility change, recompute `avgRating` and `reviewCount` on Restaurant in a transaction.
5. Admin moderation UI: hide/unhide reviews.

**Definition of Done:** A customer can rate a delivered order; reviews show on the restaurant page; the restaurant's average rating updates correctly.

---

## 9. Coding Standards

### General
- TypeScript **strict mode** on both packages. No `any` — use `unknown` and narrow.
- No default exports except for React route components and Vite config files.
- Imports order: node built-ins → external packages → `@/` aliases → relative.
- Use absolute imports (`@/modules/orders/...`) configured in `tsconfig.json` and `vite.config.ts`.

### Backend
- Controllers are thin: parse → call service → format response. **No Prisma calls in controllers.**
- Services contain business logic and own all Prisma access.
- Wrap async route handlers with `asyncHandler` to forward errors.
- Throw `ApiError(statusCode, code, message, details?)` for known failures. The error middleware formats them.
- Never log secrets, tokens, full card details, or raw request bodies for payment routes.
- All money math uses `Prisma.Decimal` or `decimal.js`. Never `+`/`-` on `number` for money.
- Database writes that span multiple tables use `prisma.$transaction`.

### Frontend
- One component per file. Co-locate component-specific hooks and small subcomponents.
- All API calls go through `src/api/*` modules — never call axios directly from a component.
- Loading, error, and empty states are required for every fetched view. No silent failures.
- Toasts (shadcn/ui `useToast`) for mutation feedback (success + error).
- Forms always show field-level validation errors from the server's `details` payload.
- Accessibility: keyboard-navigable, semantic HTML, labels on all inputs, focus visible.

### Naming
- Files: `kebab-case.ts` for backend, `PascalCase.tsx` for React components, `camelCase.ts` for hooks/utilities.
- Database: `snake_case` is **not** used — Prisma maps to camelCase by default; keep it that way.
- Branches: `feature/<short-description>`, `fix/<short-description>`.
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`).

### Testing
- Phase 1 must hit ≥60% coverage on services (the parts with logic). Controllers and routes can have lower.
- Always test order total math, status transitions, auth guards, and the payment webhook.
- Integration tests use a separate test database (`bestil_test`); reset between tests.

---

## 10. Environment Variables

### `backend/.env.example`
```
NODE_ENV=development
PORT=4000
LOG_LEVEL=debug

DATABASE_URL=postgresql://bestil:bestil@localhost:5432/bestil_dev
REDIS_URL=redis://localhost:6379

JWT_SECRET=replace-with-long-random-string
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
COOKIE_DOMAIN=localhost

STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_CURRENCY=DKK

VAT_RATE=0.25
DEFAULT_COMMISSION_RATE=0.15

# Phase 2+
SENDGRID_API_KEY=
EMAIL_FROM=no-reply@bestil.online
FRONTEND_URL=http://localhost:5173
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=eu-north-1
```

### `frontend/.env.example`
```
VITE_API_URL=http://localhost:4000/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

Validate env vars at startup with Zod (`config/env.ts`). Crash fast with a readable error if anything required is missing.

---

## 11. Setup Commands

```bash
# Initial setup
pnpm install
docker compose up -d                       # Postgres + Redis
pnpm --filter backend prisma migrate dev   # Apply migrations
pnpm --filter backend prisma db seed       # Seed dev data

# Daily dev (run from repo root)
pnpm dev                                   # Concurrently runs backend + frontend

# Stripe webhooks in dev
stripe listen --forward-to http://localhost:4000/api/v1/payments/webhook

# Tests
pnpm test                                  # All packages
pnpm --filter backend test
pnpm --filter frontend test

# Build
pnpm build
```

Add these scripts to the root `package.json` so `pnpm dev`, `pnpm test`, `pnpm build`, and `pnpm lint` all work from the root.

---

## 12. What This Spec Does Not Cover (Out of Scope for v1)

- Real-time delivery tracking (websockets, courier app, geolocation)
- Mobile native apps (architecture supports it, but no implementation)
- Multi-language / i18n (English only for v1; Danish-friendly defaults like DKK and 25% VAT)
- Loyalty programs, coupons, promo codes
- Restaurant analytics dashboard beyond basic admin reports
- Multi-currency
- Driver/courier management

If the user requests any of these mid-build, ask whether to defer or adjust the spec.

---

## 13. When You're Stuck

- **Schema decision needed?** Default to the simplest option that satisfies the priority features. Document the choice.
- **API design ambiguity?** Follow REST conventions and the patterns already established in this doc.
- **Library choice?** Prefer libraries already in the stack. If a new one is genuinely needed, pick the most popular maintained option, mention it in the PR description, and proceed.
- **Business logic ambiguity (e.g., what's the refund window? does cash-on-delivery skip Stripe?)?** Ask the user once, then encode the answer in this doc.

Build cleanly, build in order, and confirm Definition of Done with the user at the end of each phase.
