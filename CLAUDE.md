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
  - `order/page.tsx` — order-taking page (server component → `order-taker` container)
  - `order/actions.ts` — `createOrder` server action (calls the `create_order()` RPC)
  - `dashboard/page.tsx` — sales summary page (server component → `dashboard-view` container)
  - `order-history/page.tsx` — order history page (server component → `order-history-view` container)
  - `order-history/actions.ts` — `cancelOrder` / `updateOrderItems` server actions (T12; `updateOrderItems` calls the `update_order_items()` RPC)
- `app/auth/actions.ts` — `login` / `signOut` server actions
- `proxy.ts` — Next.js 16 auth gate (was `middleware.ts` in older versions). Delegates to `lib/supabase/proxy.ts#updateSession`
- `components/` — feature components
  - Containers (`"use client"`, wire actions to UI): `order-taker.tsx`, `dashboard-view.tsx`, `order-history-view.tsx`
  - Presentational: `menu-grid.tsx`, `order-cart.tsx`, `sales-cards.tsx`, `sales-chart.tsx`, `app-nav.tsx`
- `components/ui/` — shadcn components (don't edit manually unless asked)
- `lib/supabase/` — Supabase helpers: `client.ts` (browser), `server.ts` (RSC/actions), `proxy.ts` (session refresh in auth gate), `env.ts` (lazy env validation)
- `lib/sales.ts` — sales aggregation in fixed Bangkok time (UTC+7)
- `lib/format.ts` — Thai baht formatter
- `lib/database.types.ts` — generated DB types
- `supabase/schema.sql` — full DB schema, RLS policies, `create_order()` + `update_order_items()` RPCs, menu seed

## Scripts
- `npm run dev` — Next.js dev server
- `npm run lint` — ESLint (must pass clean before commit)
- `npm run build` — production build (must pass clean before commit)
- No test runner is configured — verify changes via `npm run lint` + `npm run build`

## Data & security model (non-negotiable)
- **RLS is on for every table.** Anonymous clients see nothing. Don't write queries that assume open access.
- **Price snapshot is server-side.** `order_items.price` is filled by the `create_order()` Postgres function looking up `menus.price` (+ `special_surcharge` when `is_special`) — a tampered client payload **cannot** change what the customer is charged. Do not bypass the RPC.
- **Edits recompute totals server-side too.** `update_order_items()` takes only `{ item_id, quantity }`, syncs the order's lines (unlisted lines are deleted), and recomputes `orders.total` from the stored snapshot prices. The client never sends a price. An order must keep ≥1 item (cancel instead of emptying); cancelled orders are immutable (RPC rejects them).
- **Orders are atomic.** Order + items insert in one transaction via `create_order()`. Don't split into two client-side inserts.
- **The "พิเศษ" (extra portion) variant** adds `menus.special_surcharge` to the unit price. `special_surcharge = NULL` means the menu has no พิเศษ option, and requesting `is_special` on it raises in the RPC.
- **Dashboard counts `status = 'completed'` only** and buckets dates in fixed UTC+7 — keep this invariant if you touch `lib/sales.ts`.
- **Anon key only in `NEXT_PUBLIC_*`.** Never put the `service_role` key in a `NEXT_PUBLIC_*` var — it bypasses RLS and ships to the browser.

## Conventions specific to this project
- Component files: kebab-case (`menu-grid.tsx`, `sales-chart.tsx`)
- React Server Components by default; `"use client"` only when needed (interactivity, hooks, Recharts)
- Menu categories are a fixed enum: `อาหาร`, `เครื่องดื่ม`, and `ของเพิ่ม` — keep Thai strings as-is, don't translate to English
- Order status (`completed` | `pending` | `cancelled`) defaults to `'completed'`. No `pending` UI exists yet; `cancelled` is set from order history (T12) and excluded from the dashboard
- IDs in [BACKLOG.md](BACKLOG.md) are stable (`T1`, `T2`, …) — never reuse, even after deletion
- Use `buttonVariants()` on `<Link>` for nav links — the base-nova `Button` has no `asChild` prop

## Git workflow (Claude Code must follow)
1. **Before any code change:** `git checkout develop || git checkout -b develop` — never commit directly to `main`
2. **Commit often, small units.** Message format: `type(BACKLOG_ID): description`
   - Example: `feat(T5): add order history page`, `fix(T3): fix price calculation`
   - Types: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`
3. **Before commit:** `npm run lint && npm run build` — must pass clean
4. **After finishing a backlog item:**
   - Update `BACKLOG.md` — mark item as `Done`, add completion date
   - Commit the backlog update: `docs(T5): mark T5 done in BACKLOG.md`
   - Push: `git push -u origin develop`
   - Create PR: `gh pr create --base main --head develop --title "feat(T5): ..." --body "Closes T5"` (requires GitHub CLI)
5. **Don't merge PR** — Get reviews and merges manually

## Don't (project-specific)
- Don't add OAuth, magic links, or a sign-up page — users are provisioned in the Supabase dashboard
- Don't change menu categories without updating the DB CHECK constraint in `supabase/schema.sql`
- Don't bucket sales by server-local time — always UTC+7
- Don't run schema changes outside `supabase/schema.sql` (it must stay reproducible / idempotent)
- Don't install new packages without asking
- Don't commit or push to `main` directly
