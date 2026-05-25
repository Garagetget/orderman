# orderman — Backlog

Restaurant order-taking + sales dashboard web app for a Thai restaurant.

Tech stack: Next.js 16 (App Router, TypeScript strict) · Tailwind CSS v4 · shadcn/ui · Supabase (Auth + Postgres) · Recharts

---

## In Progress

_(none)_

---

## To Do

_(Phase 1 complete — see Phase 2 ideas under Notes)_

---

## Done

### Phase 1 — MVP (completed 2026-05-22)

- [x] **T1** Scaffold Next.js 16 project (App Router, TypeScript strict, Tailwind v4, ESLint)
- [x] **T2** Install dependencies (@supabase/supabase-js, @supabase/ssr, recharts) + init shadcn/ui
- [x] **T3** Setup Supabase clients — browser / server / proxy, with lazy env validation
- [x] **T4** Create `.env.local.example` template + gitignore exception
- [x] **T5** Create DB schema SQL — tables, RLS, `create_order()` RPC, demo menu seed
- [x] **T6** Build Login page + auth proxy (route protection)
- [x] **T7** App shell + protected layout (nav between Order + Dashboard)
- [x] **T8** Build Order-taking page — menu grid → cart → save
- [x] **T9** Build Dashboard — sales summary cards + Recharts chart
- [x] **T10** README with setup instructions

> `npm run lint` and `npm run build` both pass clean.

---

## Blocked / Needs user action

Before the app runs, **Get** must:
1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor.
3. Create a test user (Authentication → Users → Add user, Auto Confirm).
4. Copy `.env.local.example` → `.env.local` and fill in the Supabase URL + anon key.

See [`README.md`](README.md) for full setup steps.

---

## Notes

### Key decisions
- **Auth**: Supabase email/password only. No OAuth, no magic links, no sign-up page — test users created in the Supabase dashboard.
- **Order status**: `orders.status` defaults to `'completed'` (orders saved after the customer is served). No pending/cancelled flow in Phase 1.
- **Menu categories**: two fixed values — `เครื่องดื่ม` and `อาหาร`.
- **Price snapshot**: `order_items.price` stores the menu price at save time. The `create_order()` RPC looks the price up **server-side** so a tampered client payload cannot change what the customer is charged.
- **Atomic save**: order + items inserted in one transaction via the `create_order()` Postgres function.
- **Dashboard aggregation**: counts only `status = 'completed'` orders; all date bucketing is done in fixed Bangkok time (UTC+7) so results are correct regardless of where the server runs.
- **Next.js 16**: uses the new `proxy.ts` convention (formerly `middleware.ts`).

### Notable implementation details vs. original plan
- Added **proxy.ts** (was `middleware.ts`) — Next.js 16 renamed the convention.
- Added helper files not in the original file list: `lib/supabase/env.ts`, `lib/format.ts`, `components/order-taker.tsx`, `components/dashboard-view.tsx` — small, single-purpose, kept the listed components presentational.
- shadcn/ui installed as the new **base-nova** style (built on Base UI, not Radix). The `Button` has no `asChild` prop — nav links use `buttonVariants()` on `<Link>` instead.

### Phase 2 ideas (not started)
- Order history / view past orders, edit & cancel
- Menu management UI (add/edit/disable menu items)
- Per-item sales breakdown on the dashboard
- Receipt printing
- Multi-user roles (owner vs. staff)

### Conventions
- IDs are stable (`T1`, `T2`, …) — never reuse, even after deletion.
- Sections: To Do → In Progress → Done → Blocked → Notes.
