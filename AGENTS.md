<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# orderman — Restaurant Order + Sales Dashboard

## What this project is
- Order-taking + sales-summary web app for a Thai restaurant
- Single owner/staff use case — log in, take orders, view sales
- Fastwork freelance project (bilingual: Thai UI, English code)

## Stack
- Next.js 16 (App Router, TypeScript strict, **`proxy.ts`** not `middleware.ts`)
- Tailwind CSS v4 + shadcn/ui (**base-nova** style — built on Base UI, not Radix)
- Supabase — Auth (email/password) + Postgres with RLS
- Recharts — sales bar chart
- Deploy target: Vercel

## Project structure
- `app/login/` — login page (unauthenticated)
- `app/(app)/` — protected route group (auth-gated layout + nav shell)
  - `order/` — order-taking page + server action
  - `dashboard/` — sales summary page
- `app/auth/actions.ts` — `login` / `signOut` server actions
- `proxy.ts` — Next.js 16 auth gate (was `middleware.ts` in older versions)
- `components/` — feature components (`menu-grid`, `order-cart`, `sales-chart`, …)
- `components/ui/` — shadcn components (don't edit manually unless asked)
- `lib/supabase/` — Supabase clients: `browser.ts`, `server.ts`, `proxy.ts`, `env.ts`
- `lib/sales.ts` — sales aggregation in fixed Bangkok time (UTC+7)
- `lib/format.ts` — Thai baht formatter
- `lib/database.types.ts` — generated DB types
- `supabase/schema.sql` — full DB schema, RLS policies, `create_order()` RPC, demo seed

## Data & security model (non-negotiable)
- **RLS is on for every table.** Anonymous clients see nothing. Don't write queries that assume open access.
- **Price snapshot is server-side.** `order_items.price` is filled by the `create_order()` Postgres function looking up `menus.price` — a tampered client payload **cannot** change what the customer is charged. Do not bypass the RPC.
- **Orders are atomic.** Order + items insert in one transaction via `create_order()`. Don't split into two client-side inserts.
- **Dashboard counts `status = 'completed'` only** and buckets dates in fixed UTC+7 — keep this invariant if you touch `lib/sales.ts`.
- **Anon key only in `NEXT_PUBLIC_*`.** Never put the `service_role` key in a `NEXT_PUBLIC_*` var — it bypasses RLS and ships to the browser.

## Conventions specific to this project
- Component files: kebab-case (`menu-grid.tsx`, `sales-chart.tsx`)
- React Server Components by default; `"use client"` only when needed (interactivity, hooks, Recharts)
- Menu categories are a fixed enum: `เครื่องดื่ม` and `อาหาร` — keep Thai strings as-is, don't translate to English
- Order status defaults to `'completed'` — no pending/cancelled flow in Phase 1
- IDs in [BACKLOG.md](BACKLOG.md) are stable (`T1`, `T2`, …) — never reuse, even after deletion
- Use `buttonVariants()` on `<Link>` for nav links — the base-nova `Button` has no `asChild` prop

## Don't (project-specific)
- Don't add OAuth, magic links, or a sign-up page — users are provisioned in the Supabase dashboard
- Don't change menu categories without updating the DB CHECK constraint in `supabase/schema.sql`
- Don't bucket sales by server-local time — always UTC+7
- Don't run schema changes outside `supabase/schema.sql` (it must stay reproducible / idempotent)
- Don't install new packages without asking
