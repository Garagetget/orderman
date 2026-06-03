# orderman — Backlog

Restaurant order-taking + sales dashboard web app for a Thai restaurant.

Tech stack: Next.js 16 (App Router, TypeScript strict) · Tailwind CSS v4 · shadcn/ui · Supabase (Auth + Postgres) · Recharts

> Single source of truth. Task ID นิ่ง ห้าม renumber. อัปเดต status ที่ไฟล์นี้เท่านั้น
> Last updated: 2026-06-02 (T30 done — docs + portability packaging: README RBAC usage + "RBAC module (portable)" section + `SUPABASE_SERVICE_ROLE_KEY` env (local+Vercel); CLAUDE.md project structure + RBAC security model; `app_metadata.role` marked deprecated (kept for rollback, not deleted); schema.sql regen deferred to Docker (stale note added in-file, file intact). **Phase 5 ครบ T26–T30.** docs-only, lint+build ผ่าน clean. pending Get: set service_role key + live-test /admin/users; merge main → push Phase 5 migrations to prod before redeploy; regen schema.sql when Docker up)

---

## In Progress

_(none)_

---

## Done — Phase 7 (Testing)

### T34 — Pre-commit / pre-push git hooks (no extra deps)
- **Priority:** P2 · **Size:** S · **Status:** Done (2026-06-03) · **Depends on:** T33
- **ที่มา:** user อยากให้ "กันลืม" รัน checks ก่อน commit (2026-06-03)
- **Acceptance:**
  - [x] `.githooks/pre-commit`: รัน `npm run lint` + `npm test` — fail แล้ว block commit
  - [x] `.githooks/pre-push`: รัน `npm run build` (แยกจาก commit เพราะ build ช้า)
  - [x] activate แบบไม่ลง package: `prepare` script ตั้ง `git config core.hooksPath .githooks` ให้อัตโนมัติตอน `npm install`
  - [x] hook ทำงานจริง (verify: commit นี้ผ่าน hook)
- **Notes:** ไม่ใช้ husky/simple-git-hooks (ไม่เพิ่ม dependency). hook เป็น `#!/bin/sh` รันผ่าน Git Bash (มากับ Git for Windows). bypass ฉุกเฉิน: `git commit --no-verify` / `git push --no-verify`

### T33 — Unit tests สำหรับ pure logic (Vitest)
- **Priority:** P1 · **Size:** S–M · **Status:** Done (2026-06-03) · **Depends on:** —
- **ที่มา:** user ถามว่าทำ unit test ได้ไหม (2026-06-03). โปรเจกต์ยังไม่มี test runner. เลือกเทสต์เฉพาะ pure functions ที่คุ้ม (ไม่แตะ DB/network/React)
- **Scope:** ลง Vitest (dev dep) + config + `npm run test` / `test:watch` + เขียนเทสต์ 3 ไฟล์
- **Acceptance:**
  - [x] ลง `vitest` (4.1.8) เป็น dev dependency + `vitest.config.ts` (node environment, ไม่ต้อง jsdom). ไม่ต้อง alias — เทสต์ import เป้าหมายแบบ relative path
  - [x] เพิ่ม script `test` (`vitest run`) + `test:watch` (`vitest`) ใน package.json
  - [x] `lib/sales.test.ts`: cover `getPeriodRange` (day/week/month/year + สัปดาห์คร่อมเดือน), `sumSales` (รวม UTC+7 day-boundary + inclusive ends), `summarize`, `summarizeByMenu` (group + rank desc + manual key + out-of-range), `buildChartSeries` (24 ชม. + end-exclusive, week 7, month 30/28/29 รวม ก.พ. leap, year 12 + label ไทย). ใช้ `NOW` คงที่ deterministic
  - [x] `lib/rbac/permissions.test.ts`: `/order-history` → `ORDER_HISTORY_VIEW` (ก่อน `/order`), sub-path, no over-match (`/orderx`→null), ungated→null
  - [x] `lib/format.test.ts`: `formatBaht()` — `฿`, คั่นหลักพัน, ทศนิยม, ศูนย์
  - [x] `npm test` ผ่าน 24/24 + `npm run lint && npm run build` clean (test ไฟล์ไม่อยู่ใน route/bundle)
- **Notes:** เทสต์เฉพาะ pure logic — server actions/RPC/RLS/guards/components ไม่ทำใน item นี้ (ต้อง integration/mock, ROI ต่ำสำหรับร้านเดียว). commit ต่อท้าย develop เดียวกับ T32 (อยู่ใน PR #11)

---

## Done — Phase 6 (Performance)

### T32 — Performance: ลด roundtrip ต่อ page load + ตั้ง Vercel region
- **Priority:** P0 · **Size:** S–M · **Status:** Done (2026-06-03) · **Depends on:** T28
- **ที่มา:** feedback แรกจาก user (2026-06-03) — "ระบบช้ามาก". ไล่โค้ดแล้วเจอว่าเปิด 1 หน้า ยิงไป Supabase ~10 roundtrips หลายอัน serial: `getUser()` ถูกเรียก 5 ครั้ง/หน้า (proxy + layout + `getCurrentPermissions` + `requirePermission` + `hasPermission` — แต่ละครั้ง = network call ไป Auth server) + permission RPC 3 ครั้ง. และไม่มี `vercel.json` ตั้ง region → Vercel function default `iad1` (US East) คนละทวีปกับ Supabase Singapore (`ap-southeast-1`) → ทุก roundtrip ข้ามแปซิฟิก ~200ms
- **Acceptance:**
  - [x] `vercel.json` ตั้ง `regions: ["sin1"]` ให้ serverless function รันใกล้ DB (Singapore)
  - [x] `getUser()` ในฝั่ง RSC/action dedupe ด้วย React `cache()` (`lib/supabase/server.ts`) — ใน 1 request scope เรียก Auth จริงครั้งเดียว (layout + page guard + permission guard แชร์)
  - [x] permission resolution dedupe: `getCurrentPermissions()` cache()'d; `hasPermission()` = `(await getCurrentPermissions()).includes(perm)` (เลิกยิง `auth_has_permission` แยก + เลิก `getUser()` ซ้ำ) → RSC เหลือ 1 RPC
  - [x] proxy (edge) คงไว้ตามเดิม (คนละ runtime, React cache ไม่ครอบ) — ยอมรับ 1 getUser + 1 RPC ที่ edge
  - [x] menu/admin actions + `/admin/users` page ใช้ cached `getUser` (ตัด getUser ซ้ำต่อ action 1 ครั้ง)
  - [x] ไม่เปลี่ยน security/authorization behavior — owner เข้าได้ทุกหน้า, staff ยังถูก gate เหมือนเดิม
  - [x] `npm run lint && npm run build` ผ่าน clean
- **Notes:** แตะแค่ performance path — ไม่แตะ RLS/RPC/business logic. ผล: RSC render ต่อหน้า จาก ~5 getUser + 3 RPC เหลือ ~1 getUser + 1 RPC (บวก edge proxy 1+1). **ค้าง Get verify ตอน redeploy prod** ว่า region sin1 มีผล (ดู Vercel function region ใน deployment). cold start ของ Supabase free plan (pause หลัง idle ~7 วัน) เป็นคนละเรื่อง (P2, policy/ค่าใช้จ่าย — แจ้ง Get แยก ไม่อยู่ใน scope นี้)

---

## To Do — Phase 4 (Security Hardening)

### T25 — ปิดช่องโหว่ owner-only ที่ระดับ server action + RLS
- **Priority:** P0 · **Size:** S–M · **Status:** Done (2026-06-02) · **Depends on:** T16
- **ที่มา:** code review T16 (2026-06-02) — proxy + `requireOwner()` กั้นเฉพาะ "หน้า" แต่ menu/category server actions เช็คแค่ `requireUser()` (login) ไม่เช็ค role; RLS เป็น `for all to authenticated using (true)` ทุกตาราง. ผล: staff (login อยู่) เรียก action ตรงๆ เพื่อ **เพิ่ม/แก้/ลบเมนู + หมวดหมู่** ได้ ทั้งที่ T16 บอกว่า staff ถูกบล็อกจาก `/menu`
- **Acceptance:**
  - [x] เพิ่ม guard แบบ return boolean (เช่น `isOwner()` ใน `lib/supabase/guards.ts`) — ไม่ `redirect()` เพราะเรียกจากใน action
  - [x] `createMenu` / `updateMenu` / `setMenuAvailability` / `createCategory` / `renameCategory` / `deleteCategory` คืน `{ ok: false, error: "ไม่มีสิทธิ์" }` เมื่อผู้เรียกไม่ใช่ owner (verify โดย call action ตรงด้วย session ที่ `app_metadata.role = "staff"` → ต้องถูกปฏิเสธ)
  - [x] owner ยังเพิ่ม/แก้/ลบเมนู + หมวดหมู่ได้ตามปกติ
  - [ ] ~~(defense ลึก, แนะนำ) RLS write policy ของ `menus` + `categories`~~ — **เลื่อนไป T28 โดยตั้งใจ**: Phase 5 (T28) จะแทนด้วย RLS write policy แบบ RBAC ที่ generic กว่า (`auth_has_permission('menu.manage')`) จึงไม่สร้าง migration ใน T25 เพื่อเลี่ยงงานซ้ำ/ถูก revert
  - [x] `npm run lint && npm run build` ผ่าน clean
- **Notes:** ฝั่ง dashboard ไม่ต้องแก้ — ข้อมูลยอดขายอ่านใน RSC ที่ gate ด้วย `requireOwner()` อยู่แล้ว ไม่มี action ตัวไหน expose ออกมา. order/order-history actions เปิดให้ staff ใช้ได้ (intended) — อย่าเผลอ gate
- **⚠️ stopgap ก่อน Phase 5:** T25 เป็นด่านปิดช่องโหว่ที่ live อยู่ตอนนี้ — **ทำก่อน** RBAC. พอ Phase 5 เสร็จ (T28) guard ระดับ action จะถูกแทนด้วย `hasPermission("menu.manage")` และ RLS write policy จะถูกแทนด้วยเวอร์ชัน RBAC ที่ generic กว่า. เขียน `isOwner()` ใน T25 ให้ตรงไปตรงมา ไม่ต้อง over-engineer เพราะจะถูก refactor ใน T28

---

## Phase 5 (Custom Portable RBAC / User Management) — ✅ Done (2026-06-02)

> ✅ Phase 5 เสร็จ (2026-06-02) — T26–T30 ครบ: RBAC tables + helpers + RLS + backfill
> (migration `20260602010000`), service-role admin client + env (`SUPABASE_SERVICE_ROLE_KEY`),
> permission guard/proxy cutover (เลิกอ่าน `app_metadata.role`) + menu/category write RLS
> (`20260602020000`, ลบ `lib/roles.ts`/`lib/supabase/guards.ts`), หน้า `/admin/users`, และ docs +
> portability packaging. `npm run lint && npm run build` ผ่าน clean.
> **ยังค้าง (Get ทำเอง ก่อน live):** (1) set `SUPABASE_SERVICE_ROLE_KEY` ใน `.env.local` (dev) +
> Vercel Production (prod key) → live-test `/admin/users`; (2) ตอน merge `main`: push migration
> Phase 5 ขึ้น prod **ก่อน** redeploy โค้ด (ลำดับสำคัญ — โค้ด guard ใหม่ query RBAC tables);
> (3) regen `supabase/schema.sql` เมื่อ Docker พร้อม.

> **เป้าหมาย:** ย้าย user management จาก "ตั้ง role ผ่าน Supabase dashboard/SQL" → RBAC layer
> ของเราเองในแอป ที่ **portable ข้าม project**. คง Supabase Auth เป็น identity provider เดิม
> (login/session/JWT/password reset ไม่แตะ) — เพิ่มแค่ชั้น authorization.
>
> **Design decisions (Get, 2026-06-02):**
> 1. **Permission resolution = query DB ต่อ request** (ไม่ใช้ JWT/Auth Hook). DB (`user_roles` +
>    `role_permissions`) เป็น source of truth จริง → เปลี่ยน role มีผล **ทันทีไม่ต้อง re-login**.
>    แลกกับ +1 DB roundtrip ต่อ request (ร้านเดียว traffic ต่ำ = รับได้).
> 2. **Enforcement = App guard + Postgres RLS** (defense-in-depth). guard/action เช็ค permission
>    และ RLS write policy บน `menus`/`categories` อิง permission ผ่าน helper `auth_has_permission()`.
> 3. **เก็บ role ใน `user_roles`** (ไม่ใช่ `app_metadata`). ทุกการ "เขียน" `user_roles`/RBAC config
>    ผ่าน **service_role admin client ใน server action เท่านั้น** — RLS ปฏิเสธ write จาก
>    session ปกติทั้งหมด → user แก้สิทธิ์ตัวเองไม่ได้โดยปริยาย.
>
> **Portable deliverable:** `lib/rbac/` (โค้ด generic) + `supabase/rbac/rbac.sql` (ก้อน SQL
> self-contained) — copy 2 ก้อนนี้ไป project อื่นได้ โดยแก้แค่ส่วน "app-specific seed"
> (รายชื่อ role/permission) + route→permission map.
>
> **Permission catalog (orderman):** `order.create` · `order.history.view` · `menu.manage` ·
> `dashboard.view` · `user.manage`
> **Roles:** `owner` = ทุก permission · `staff` = `order.create` + `order.history.view`
>
> **ลำดับที่ต้องทำ:** T26 → T27 → T28 → T29 → T30 (T26 เป็น foundation ของทุกตัว)

### T26 — RBAC database schema + helper functions + RLS + backfill
- **Priority:** P0 · **Size:** L · **Status:** Done (2026-06-02) · **Depends on:** T25
- **Scope:** migration ใหม่ใน `supabase/migrations/` + regenerate `supabase/schema.sql` + สร้าง portable `supabase/rbac/rbac.sql`
- **Acceptance:**
  - [x] ตาราง `roles(key text pk, label text)`, `permissions(key text pk, label text, description text)`, `role_permissions(role_key fk→roles, permission_key fk→permissions, pk รวม)`, `user_roles(user_id uuid fk→auth.users on delete cascade, role_key fk→roles, pk รวม)` — รองรับหลาย role/หลาย permission ต่อ user (generic) แม้ orderman ใช้ role เดียว
  - [x] helper functions (SECURITY DEFINER, `search_path` ตรึง): `public.auth_has_permission(p_permission text) returns boolean` (เช็ค `auth.uid()` ผ่าน user_roles→role_permissions) และ `public.auth_user_permissions() returns setof text` (list permission ของ user ปัจจุบัน — ให้ guard ดึงครั้งเดียว)
  - [x] **RLS:** `roles`/`permissions`/`role_permissions`/`user_roles` เปิด RLS; **SELECT** ได้สำหรับ `authenticated` (ให้ guard resolve ได้); **INSERT/UPDATE/DELETE** ไม่มี policy ให้ `authenticated` (ถูกปฏิเสธทั้งหมด) → เขียนได้เฉพาะ service_role. _(verify ด้วย anon session ทำตอน T28 ตอนต่อ guard เข้าจริง)_
  - [x] seed (ส่วน app-specific, แยก section ในไฟล์ให้ชัด): 5 permission + 2 role + role_permissions ตาม catalog ข้างบน (idempotent, `on conflict do nothing`/`do update`)
  - [x] **backfill `user_roles` จาก `app_metadata.role` เดิม:** ทุก row ใน `auth.users` → `role:"staff"` ได้ role `staff`, ที่เหลือได้ `owner`. **กัน lockout:** owner เดิมต้องมี row `owner` หลัง migration. ไม่ลบ `app_metadata.role` ทิ้ง (เผื่อ rollback — โค้ดแค่เลิกอ่านมันใน T28)
  - [x] `supabase/rbac/rbac.sql` = ก้อน SQL เดียวที่ rerun ได้ (tables + helpers + RLS + seed catalog) คัดลอกไป project อื่นได้ พร้อม comment กำกับว่าส่วนไหนต้องแก้ต่อ project
  - [ ] regenerate `supabase/schema.sql` snapshot หลัง migration — **pending: `supabase db dump` ต้องใช้ Docker ซึ่งเครื่องนี้ปิดอยู่** (เหมือน snapshot เดิมที่ยังว่าง). migration เป็น source of truth และ apply ขึ้น dev แล้ว. regen เมื่อ Docker พร้อม
- **⚠️ ต้องรัน DB (Get รันเอง):** migration นี้ลง **dev ก่อน** ผ่าน `npm run db:link:dev` + `npm run db:push` (Claude ลองรันให้ก่อน — ถ้า CLI ขอ DB password ค่อยส่งให้ Get รัน). **ห้าม push prod** จนกว่าจะ merge ขึ้น `main`. **ลำดับ deploy สำคัญ:** migration (พร้อม backfill) ต้อง apply **ก่อน** โค้ด guard ใหม่ (T28) go-live — ถ้าโค้ดใหม่ขึ้นก่อนตาราง guard query จะ error = lock ทุกคน
- **Notes:** helper เป็น SECURITY DEFINER เพื่ออ่าน user_roles ได้แม้ caller ไม่มีสิทธิ์ direct select (และใช้ใน RLS policy ของ menus/categories ใน T28 ได้). อย่าใส่ business logic อื่นในก้อน rbac.sql — ให้มันเป็น auth layer ล้วนๆ เพื่อ portability

### T27 — Service-role admin client + env wiring
- **Priority:** P0 · **Size:** S–M · **Status:** Done (2026-06-02) · **Depends on:** —
- **Scope:** `lib/rbac/admin.ts`, `lib/supabase/env.ts`, `.env.local.example`, README + Vercel
- **Acceptance:**
  - [x] `lib/rbac/admin.ts` สร้าง admin client ด้วย `service_role` key (`createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })`) — **server-only** (เพิ่ม `import "server-only"` ที่หัวไฟล์ กัน import หลุดไป client bundle)
  - [x] `lib/supabase/env.ts` เพิ่ม getter `getServiceRoleKey()` แบบ lazy (required เฉพาะตอนถูกเรียก ไม่ throw ตอน build) อ่าน `SUPABASE_SERVICE_ROLE_KEY` (ชื่อ **ไม่มี** `NEXT_PUBLIC_`)
  - [x] `.env.local.example` เพิ่ม `SUPABASE_SERVICE_ROLE_KEY=` พร้อม comment เตือนว่าเป็น secret ฝั่ง server เท่านั้น ห้าม commit ค่าจริง / ห้ามขึ้น `NEXT_PUBLIC_*`
  - [x] grep ทั้ง repo ยืนยันว่า `service_role`/`SUPABASE_SERVICE_ROLE_KEY` ไม่ถูก import จาก client component ใด ๆ (ผู้อ้างอิงมีแค่ `lib/supabase/env.ts` + `lib/rbac/admin.ts` ฝั่ง server, docs/SQL/config และ `.env.local.example` — ไม่มี `"use client"` ไฟล์ใดอ้างถึง)
  - [x] `npm run lint && npm run build` ผ่าน clean (build ผ่าน **โดยไม่ต้อง** set `SUPABASE_SERVICE_ROLE_KEY` — getter lazy; `import "server-only"` resolve ผ่าน Turbopack ของ Next 16 ได้แม้ package ไม่อยู่ใน node_modules โดยตรง)
- **⚠️ ต้องเพิ่ม env var (Get ทำเอง — flagged user action, Claude ทำให้ไม่ได้):** `SUPABASE_SERVICE_ROLE_KEY` — **local** ใส่ใน `.env.local` (ค่าของ project **dev**); **Vercel** Settings → Environment Variables scope **Production** ใส่ค่า service_role ของ **orderman-prod** (และ Preview ถ้าใช้ login บน preview). ⚠️ key ของ dev/prod คนละตัว — อย่าสลับ. service_role bypass RLS → ห้ามหลุดไป browser เด็ดขาด
- **Notes:** `@supabase/supabase-js` มีอยู่แล้ว ไม่ต้องลง package ใหม่. admin client ใช้เฉพาะใน user-management actions (T29) — ไม่ใช้กับ data path ปกติ. ตัว `lib/rbac/admin.ts` ยังไม่ถูก import จากที่ไหน (จึงไม่โผล่ใน route ของ build) — T29 จะเป็นตัวแรกที่เรียก

### T28 — Permission-based guard + proxy (cutover จาก role-in-JWT → DB permission)
- **Priority:** P0 · **Size:** L · **Status:** Done (2026-06-02) · **Depends on:** T26
- **Scope:** `lib/rbac/permissions.ts` (route→permission map + constants), `lib/rbac/guards.ts`, `proxy.ts`, `lib/supabase/proxy.ts`, per-page guards (`app/(app)/dashboard|menu|order|order-history/page.tsx`), `app/(app)/menu/actions.ts` (แทน isOwner ของ T25), `lib/roles.ts` + `lib/supabase/guards.ts` (deprecate/ลบ)
- **Acceptance:**
  - [x] `lib/rbac/permissions.ts`: export permission key constants (`PERMISSIONS`) + `ROUTE_PERMISSIONS` map (ordered, `/order-history` ก่อน `/order`) + helper `requiredPermissionForPath()`. ส่วนนี้ = app-specific config (แยกจาก core guard ที่ generic)
  - [x] `lib/rbac/guards.ts`: `getCurrentPermissions()` (RSC/action — เรียก rpc `auth_user_permissions`), `requirePermission(perm)` (redirect `/login` ถ้าไม่ login, redirect `/order` ถ้าไม่มี perm), `hasPermission(perm)` (คืน boolean — สำหรับ action). RPC ยังไม่อยู่ใน generated types (snapshot ยังไม่ regen เพราะไม่มี Docker) → cast `supabase.rpc as any` แบบ localized พร้อม comment
  - [x] `lib/supabase/proxy.ts`: หลัง `getUser()` map path→required permission ด้วย `requiredPermissionForPath()` แล้ว gate ด้วย rpc `auth_has_permission(perm)` ที่ edge; ไม่มีสิทธิ์ → redirect `/order`; ลบการอ่าน `roleFromMetadata(app_metadata)`. `proxy.ts` (entry) ไม่ต้องแก้ — delegate ไป `updateSession` อยู่แล้ว
  - [x] per-page server guard: `/dashboard` + `/menu` เปลี่ยน `requireOwner()` → `requirePermission(DASHBOARD_VIEW)` / `requirePermission(MENU_MANAGE)`; `/order` + `/order-history` เพิ่ม `requirePermission(...)` ตาม perm
  - [x] menu/category actions (6 ตัว): `isOwner()` ของ T25 → `hasPermission(MENU_MANAGE)` (คืน `{ ok:false, error:"ไม่มีสิทธิ์" }` เมื่อไม่มี); คง `requireUser()` login check
  - [x] **RLS defense-in-depth:** migration `20260602020000_rbac_menu_write_policies.sql` split policy `menus` + `categories`: คง `select using(true)` + `insert/update/delete` ผ่านเฉพาะเมื่อ `auth_has_permission('menu.manage')`. idempotent, applied to **dev** แล้ว. `orders`/`order_items` ไม่แตะ
  - [x] `app-nav.tsx` ซ่อนลิงก์ตาม permission (รับ `permissions: string[]` จาก layout ผ่าน `getCurrentPermissions()`); staff ไม่เห็น dashboard/menu; เผื่อ link `/admin` (T29) ไว้แล้วผูกกับ `user.manage`
  - [x] ลบ `lib/roles.ts` + `lib/supabase/guards.ts` ทั้งไฟล์ (grep ยืนยันไม่มี code อ้างถึง `roleFromMetadata`/`requireOwner`/`isOwner` แล้ว)
  - [x] **verify ไม่ lockout (code trace):** owner (ทุก perm จาก backfill T26) เข้าได้ทุกหน้า + menu actions ผ่าน; staff (order.create + order.history.view) โดน redirect จาก /dashboard+/menu ทั้ง proxy + page, menu actions คืน "ไม่มีสิทธิ์", nav ซ่อนลิงก์ — ทั้งหมดมาจาก DB lookup จึงไม่ต้อง re-login
  - [x] `npm run lint && npm run build` ผ่าน clean
- **⚠️ ลำดับ go-live (ยังคงไว้ตอน merge `main`):** T26 migration (พร้อม backfill) + `20260602020000` ต้อง **apply ก่อน** code นี้ deploy. dev: push migration → test → deploy code ✅ (dev). prod: merge `main` → push migration prod → redeploy
- **Notes:** จุด cutover — `app_metadata.role` เลิกถูกอ่านแล้ว (ยังไม่ลบจาก DB, เก็บเผื่อ rollback). proxy ทำ rpc 1 ครั้ง/request ตาม decision. **pending:** regen `supabase/schema.sql` snapshot (ต้องใช้ Docker — เครื่องนี้ปิด); migration เป็น source of truth

### T29 — หน้า /admin/users + user-management server actions
- **Priority:** P1 · **Size:** L · **Status:** Done (2026-06-02) · **Depends on:** T26, T27, T28
- **Scope:** `app/(app)/admin/users/page.tsx` (+ `components/admin-users-view.tsx`), `app/(app)/admin/users/actions.ts`, `components/app-nav.tsx`
- **Acceptance:**
  - [x] หน้า `/admin/users` เข้าได้เฉพาะผู้มี `user.manage` (gate ทั้ง proxy via `ROUTE_PERMISSIONS` `/admin`→`user.manage` + `requirePermission` ใน page); staff โดน redirect ไป `/order`
  - [x] แสดงรายชื่อ user (email + role ที่ assign) — ดึงผ่าน admin client (`auth.admin.listUsers()` + join `user_roles` + `roles` สำหรับ label)
  - [x] เพิ่ม staff ใหม่: กรอก email + password → server action สร้าง auth user (`auth.admin.createUser`, `email_confirm: true`) + assign role ที่เลือก เขียน `user_roles` ผ่าน admin client (rollback auth user ถ้า assign role ล้ม)
  - [x] เปลี่ยน role ของ user ที่มีอยู่ (assign/unassign) ผ่าน server action (`setUserRole` — one-role-per-user: delete เก่า insert ใหม่)
  - [x] ลบ user: `auth.admin.deleteUser` (cascade ลบ `user_roles`)
  - [x] **ทุก server action re-check ผู้เรียกมี `user.manage` ก่อนทำงานเสมอ** (ไม่พึ่ง proxy อย่างเดียว) — `{ ok:false, error:"ไม่มีสิทธิ์" }` ถ้าไม่มี
  - [x] **กัน lockout/self-escalation:** ห้ามผู้เรียกถอด role owner ของ **ตัวเอง** (`setUserRole` reject + UI disable Select), ห้ามลบบัญชีตัวเอง (`deleteUser` reject + UI disable), และห้ามลบ/ถอด owner คนสุดท้าย (count check ผ่าน admin client) → ปฏิเสธพร้อมข้อความไทย
  - [x] `app-nav.tsx` โชว์ลิงก์ "จัดการผู้ใช้" (`/admin/users`) เฉพาะผู้มี `user.manage`
  - [x] UI ตาม DESIGN.md (layout template, page header, rows `rounded-xl border`, ปุ่มเพิ่ม = primary, ลบ = danger outline, empty state, toast feedback, FormDialog/Select แบบเดียวกับ menu-manager)
  - [x] `npm run lint && npm run build` ผ่าน clean (build ผ่าน **โดยไม่ต้อง** set `SUPABASE_SERVICE_ROLE_KEY` — `createAdminClient()` ถูกเรียกใน request/action handler เท่านั้น ไม่ใช่ module scope จึง getter ไม่ resolve ตอน build; `/admin/users` เป็น dynamic route)
- **⚠️ pending live test (Get):** ยังทดสอบ live ไม่ได้เพราะ `SUPABASE_SERVICE_ROLE_KEY` ยังไม่ได้ set (action ของ Get จาก T27). หลัง Get ใส่ dev service_role key ใน `.env.local` แล้ว ค่อย smoke-test: เปิด `/admin/users` (owner), เพิ่ม/เปลี่ยน role/ลบ user, ลองถอดสิทธิ์ตัวเอง → ต้องถูกบล็อก
- **Notes:** ทุก mutation ใช้ admin client (service_role) ฝั่ง server เท่านั้น — client component ส่งแค่ค่า form ผ่าน action, ไม่เคยเห็น service_role key. password validate ฝั่ง server (≥8 ตัว) + email shape + role ∈ {owner,staff}. duplicate email map เป็นข้อความไทย. ไม่ทำ password reset เอง (ใช้ Supabase Auth flow เดิม). RBAC tables (`roles`/`user_roles`) ยังไม่อยู่ใน generated types (snapshot ยังไม่ regen — ไม่มี Docker) → query ผ่าน localized `as any` cast เหมือน `lib/rbac/guards.ts`

### T30 — Docs + portability packaging + cleanup
- **Priority:** P2 · **Size:** S–M · **Status:** Done (2026-06-02) · **Depends on:** T26, T27, T28, T29
- **Acceptance:**
  - [x] README: แทน section "ตั้ง role ผ่าน SQL Editor" ด้วยวิธีใหม่ — owner เพิ่ม/ลบ staff + assign role จากหน้า `/admin/users` ในแอป (ไม่ต้องเข้า Supabase dashboard อีก); ระบุวิธี seed owner คนแรก (backfill สำหรับ project เดิม / SQL one-liner สำหรับ project ใหม่)
  - [x] README: เพิ่ม section "RBAC module (portable)" — วิธี copy `lib/rbac/` + `supabase/rbac/rbac.sql` ไป project ใหม่, จุดที่ต้องแก้ (permission catalog ใน rbac.sql + `ROUTE_PERMISSIONS` ใน permissions.ts), env `SUPABASE_SERVICE_ROLE_KEY` แยกต่อ project, และ note ว่า backfill เป็น project-specific (ไม่อยู่ใน rbac.sql)
  - [x] README: ระบุว่าเปลี่ยน role มีผลทันที (DB lookup) ไม่ต้อง re-login; Supabase Auth (login/reset password/verify email) ยังใช้ flow เดิม. เพิ่ม `SUPABASE_SERVICE_ROLE_KEY` ใน env section ทั้ง local + Vercel (server-only, ห้าม `NEXT_PUBLIC_*`, dev/prod คนละ key)
  - [x] CLAUDE.md: อัปเดต project structure (`admin/users/`, `lib/rbac/`, `supabase/rbac/rbac.sql`; note `lib/roles.ts`+`lib/supabase/guards.ts` ถูกลบ) + data/security model (permission-based RBAC, service_role write path, menu RLS gate) + deployment env note
  - [x] ~~ยืนยัน `supabase/schema.sql` snapshot ตรงกับ migration ล่าสุด~~ — **done-with-caveat:** regen ทำไม่ได้ (ต้องใช้ Docker ซึ่งเครื่องนี้ปิด). แทนที่จะเสี่ยง truncate ไฟล์ → คงไฟล์เดิมไว้ (336 บรรทัด, intact) + เพิ่ม comment หัวไฟล์ระบุชัดว่า snapshot ตามหลัง migration Phase 5 (`20260602010000`, `20260602020000`) และต้อง regen ด้วย `npx supabase db dump --linked -f supabase/schema.sql` เมื่อ Docker พร้อม. migration + `rbac.sql` เป็น source of truth ระหว่างนี้
  - [x] **decision (เลือกแล้ว):** **คง `app_metadata.role` ไว้ + mark deprecated** — ไม่เขียน migration ลบ (กัน rollback). เขียน note ใน README + CLAUDE.md + ที่นี่ว่า `app_metadata.role` เลิกถูกอ่านตั้งแต่ Phase 5; `user_roles` คือแหล่งความจริงเดียว
- **Notes:** docs-only — ไม่แตะ logic ของ `.ts`/`.tsx` (verify ด้วย `git status`: เปลี่ยนแค่ README.md / CLAUDE.md / supabase/schema.sql). `npm run lint && npm run build` ผ่าน clean. เอกสารทำให้ Get เอา RBAC (`lib/rbac/` + `supabase/rbac/rbac.sql`) ไปใช้ซ้ำ project Fastwork อื่นได้

---

## To Do — Phase 2 (Post-MVP Features)

- [x] **T13** จัดการเมนู (Menu Management UI) · P1 · L
- [x] **T18** จัดการหมวดหมู่แบบ dynamic (เพิ่ม/ลบ/แก้ชื่อ) · P1 · M _(extends T13)_
- [x] **T14** ยอดขายรายเมนูบน Dashboard · P2 · M
- [x] **T15** พิมพ์ใบเสร็จ · P2 · S _(depends on T11)_
- [x] **T16** สิทธิ์ผู้ใช้ (Owner vs. Staff) · P2 · L
- [x] **T17** จดออเดอร์แบบ manual (รายการนอกเมนู) · P2 · M

แนะนำลำดับการทำ: **T13 → T15 → T14 → T16**

### T13 — จัดการเมนู (Menu Management UI)
- **Priority:** P1 · **Size:** L · **Status:** Done (2026-06-01) · **Depends on:** —
- **Acceptance:**
  - [x] มีหน้า `/menu` สำหรับ owner จัดการเมนู (`app/(app)/menu/page.tsx` → `MenuManager`)
  - [x] เพิ่มเมนูใหม่ได้: ชื่อ, ราคา, หมวดหมู่ (`อาหาร` / `เครื่องดื่ม` / `ของเพิ่ม` — 3 หมวด)
  - [x] ตั้ง/แก้ `special_surcharge` ได้ (checkbox + ช่องส่วนเพิ่ม); ปล่อยว่าง = ไม่มีตัวเลือกพิเศษ
  - [x] แก้ไขชื่อ/ราคา/หมวดหมู่เมนูที่มีอยู่ได้ (inline form)
  - [x] ปิด/เปิดเมนู (`is_available` toggle) — เมนูที่ปิดไม่แสดงในหน้าจดออเดอร์
  - [x] หมวดหมู่จัดการได้แบบ dynamic (ดู T18 — เดิม acceptance ข้อนี้คือ "คง CHECK constraint" แต่เปลี่ยนเป็นตาราง `categories` แทน)
- **Notes:** **ไม่ต้อง migration** สำหรับตัว menu management — คอลัมน์ `is_available` (default true) มีอยู่ใน schema แล้ว และหน้า `/order` filter `is_available = true` อยู่ก่อนแล้ว. server actions: `createMenu` / `updateMenu` / `setMenuAvailability` ใน `app/(app)/menu/actions.ts` (validate ฝั่ง server, map duplicate-name 23505 เป็นข้อความไทย). **ไม่มี hard delete** — ใช้ปิดเมนูแทน เพราะ `order_items.menu_id` เป็น FK และออเดอร์เก่าต้องอ้างอิงเมนูได้. แก้ราคาเมนูไม่กระทบออเดอร์เก่า (snapshot price). เพิ่มลิงก์ "จัดการเมนู" ใน `app-nav.tsx`.

### T18 — จัดการหมวดหมู่แบบ dynamic (extends T13)
- **Priority:** P1 · **Size:** M · **Status:** Done (2026-06-01) · **Depends on:** T13
- **Acceptance:**
  - [x] เพิ่ม/ลบ/แก้ชื่อหมวดหมู่ได้จาก section "หมวดหมู่" บนหน้า `/menu`
  - [x] แก้ชื่อหมวด → เมนูในหมวดนั้นตามไปด้วยอัตโนมัติ (FK `on update cascade`)
  - [x] ลบหมวดที่ยังมีเมนูอยู่ → **ถูกบล็อก** (FK `on delete restrict`) + ขึ้นข้อความให้ย้าย/ลบเมนูก่อน
  - [x] หมวดหมู่ทั้งหน้า order (`menu-grid`) และฟอร์มเมนูใช้รายชื่อจาก DB (ไม่ hardcode)
- **Notes / ⚠️ ต้อง apply migration:** เปลี่ยน `menus.category` จาก CHECK เป็น FK ไปตาราง `categories(name PK, sort_order)`. migration ใหม่: `supabase/migrations/20260601130000_dynamic_categories.sql` (idempotent, seed 3 หมวดเดิม + backfill). **ต้องรัน `npm run db:push` (dev) ก่อนแอปทำงาน** — owner กรอก DB password เอง. types: `MenuCategory` เปลี่ยนเป็น `string` + เพิ่ม type `Category`. หมวดใหม่ต่อท้าย (sort_order = max+1); ยังไม่มี UI จัดลำดับ (reorder) — เป็น nice-to-have.

### T14 — ยอดขายรายเมนูบน Dashboard
- **Priority:** P2 · **Size:** M · **Status:** Done (2026-06-02) · **Depends on:** — (ทำหลัง T13 ได้ test data ดีกว่า)
- **Acceptance:**
  - [x] dashboard แสดงตาราง/chart ยอดขายแยกตามชื่อเมนู
  - [x] ตัวเลขนับเฉพาะออเดอร์ status = `completed` (invariant เดิม)
  - [x] filter ช่วงเวลาเดียวกับ sales cards ปัจจุบัน (วันนี้/สัปดาห์/เดือน)
  - [x] คิดเวลาใน UTC+7 เหมือน `lib/sales.ts` เดิม
- **Notes:** ขยาย aggregation ใน `lib/sales.ts` ไม่ใช่ query ใหม่ใน component. group by `menu_id` แล้วโชว์ชื่อปัจจุบันจาก `menus` (order_items snapshot ไม่มี `name` — กันเคสเมนูถูกเปลี่ยนชื่อภายหลัง).

### T15 — พิมพ์ใบเสร็จ (Browser Print)
- **Priority:** P2 · **Size:** S · **Status:** Done (2026-06-02) · **Depends on:** T11 (เสร็จแล้ว → unblocked)
- **Acceptance:**
  - [x] มีปุ่ม Print บน order detail (ใน order history) — ปุ่ม "พิมพ์ใบเสร็จ" (ใช้ได้กับออเดอร์ที่ยกเลิกด้วย)
  - [x] กดแล้วเปิด browser print dialog พร้อม layout ใบเสร็จที่อ่านได้ (ชื่อร้าน, รายการ, ราคา, รวม, หมายเหตุ)
  - [x] print CSS ซ่อน nav bar และ UI อื่นที่ไม่เกี่ยวกับใบเสร็จ (`.receipt-print` + `@media print` ใน globals.css)
  - [x] ไม่ต้องติดตั้ง package เพิ่ม — ใช้ `window.print()` + `@media print` CSS
- **Notes:** `components/receipt-print.tsx` เป็น print-only block. ชื่อร้านใช้ brand `orderman` เป็น placeholder (ยังไม่มี shop profile — ตั้งค่าได้ทีหลัง).

### T16 — สิทธิ์ผู้ใช้ (Owner vs. Staff)
- **Priority:** P2 · **Size:** L · **Status:** Done (2026-06-02) · **Depends on:** —
- **Design ที่เลือก (Get 2026-06-02):** **proxy gate** (ไม่แตะ RLS ระดับ DB). role เก็บใน `app_metadata` (ไม่ใช่ user_metadata — กัน user แก้เอง); missing → owner. staff เข้าได้ `/order` + `/order-history`, บล็อก `/dashboard` + `/menu`.
- **Acceptance:**
  - [x] role เก็บใน Supabase `app_metadata` (`role: "staff"`; ไม่ตั้ง = owner)
  - [x] staff โดน redirect กลับ `/order` เมื่อเข้า owner-only route
  - [x] owner เข้าถึงทุกหน้าได้ตามปกติ
  - [x] proxy gate บล็อกที่ edge (`proxy.ts`) **และ** server ของแต่ละหน้า (`requireOwner()`) — ไม่ใช่แค่ hide link; nav ก็ซ่อนลิงก์ owner-only ให้ staff ด้วย
  - [x] ไม่มี sign-up page — role กำหนดผ่าน Supabase dashboard (วิธีตั้งอยู่ใน README)
- **Notes:** เลือก proxy gate ตามที่ note ไว้ว่าพอสำหรับร้านเดียว. ถ้าอนาคตอยากเข้มระดับ DB ค่อยเพิ่ม policy อิง `auth.jwt()->role` เป็น backlog ใหม่. ไม่มี migration. helper: `lib/roles.ts`, guard: `lib/supabase/guards.ts`.

### T17 — จดออเดอร์แบบ manual (รายการนอกเมนู)
- **Priority:** P2 · **Size:** M · **Status:** Done (2026-06-02) · **Depends on:** —
- **ไอเดีย (จาก Get 2026-06-01):** อยากเพิ่มรายการที่ไม่มีในเมนูลงออเดอร์ได้ — กรอกชื่อ + ราคาเอง (เช่นเมนูพิเศษ off-menu / ของฝากลูกค้า)
- **Design ที่เลือก (Get 2026-06-02):** ทางเลือก (a) — `menu_id` nullable + คอลัมน์ `custom_name` ใน `order_items`. CHECK บังคับ menu-line XOR manual-line และห้าม พิเศษ บน manual line. `create_order()` validate ราคา manual ว่าเป็นตัวเลข ≥ 0 server-side (ไม่มี menus row ให้ snapshot). migration: `20260602000000_manual_order_items.sql`.
- **Acceptance:**
  - [x] หน้า `/order` มีปุ่ม "เพิ่มรายการเอง" กรอกชื่อ + ราคา + จำนวน
  - [x] รายการ manual เข้าออเดอร์ + นับใน total/dashboard ถูกต้อง (per-menu breakdown group ตามชื่อ)
  - [x] ราคา manual ถูก validate server-side (กันค่าติดลบ/ผิดรูปแบบ) ทั้งใน action + RPC
- **⚠️ ต้อง `npm run db:push` ลง dev ก่อนใช้งาน** (Get รันเอง — ใส่ DB password); หลัง merge ขึ้น prod ต้อง push ลง prod ด้วย

---

## Phase 3 (Design Refresh) — ✅ Done (2026-06-02)

> Apply [DESIGN.md](DESIGN.md) กับทุกหน้าที่มีอยู่. แตะเฉพาะ presentation — ห้ามแก้ business logic
> (RLS / RPC / `lib/sales.ts` / server actions คงเดิม). ทุก item ต้อง `npm run lint && npm run build` ผ่าน clean.

- [x] **T19** Design foundation — globals.css palette + Sarabun + theme · **P0** · S–M
- [x] **T20** Refresh หน้าจดออเดอร์ (order page) · P1 · M · _depends on T19_
- [x] **T21** Refresh หน้าประวัติออเดอร์ (order-history) · P1 · M · _depends on T19_
- [x] **T22** Refresh หน้า Dashboard + Recharts styling · P1 · M · _depends on T19_
- [x] **T23** Refresh หน้าจัดการเมนู + หมวดหมู่ · P1 · M · _depends on T19_
- [x] **T24** Refresh App nav bar · P1 · M · _depends on T19_
- [x] **T31** Refresh หน้า Login · P2 · S · _(ตกหล่นจาก Phase 3 — เพิ่มภายหลัง)_

✅ Phase 3 เสร็จ (2026-06-02) — ทุกหน้า apply DESIGN.md, `npm run lint && npm run build` ผ่าน clean

### T31 — Refresh หน้า Login
- **Priority:** P2 · **Size:** S · **Status:** Done (2026-06-03) · **Depends on:** T19
- **ที่มา:** หน้า `/login` ไม่ถูกรวมใน Phase 3 (T20–T24 ทำแค่หน้าใน `(app)` group) เลยยังเป็น default shadcn Card/Input ดูโล่ง ไม่เข้าธีม
- **Acceptance:**
  - [x] เลิกใช้ default shadcn Card/Input/Button/Label — hand-style ตาม DESIGN.md เหมือนหน้าอื่น
  - [x] เพิ่ม brand: ไอคอน (lucide `UtensilsCrossed`) ในวงกลม primary + ชื่อร้าน + subtitle
  - [x] card `rounded-xl border border-border shadow-sm`; input `h-11 rounded-lg` + focus ring `primary/30` (touch target ≥ 44px)
  - [x] ปุ่มเข้าสู่ระบบ primary orange `h-11 hover:bg-primary-hover`; error เป็น `bg-danger/10 text-danger rounded-lg`
  - [x] `npm run lint && npm run build` ผ่าน clean
- **Notes:** แตะ presentation เท่านั้น — `login` server action + `useActionState` flow คงเดิม. ไฟล์เดียว: [app/login/page.tsx](app/login/page.tsx)

### T19 — Design foundation (globals.css palette + Sarabun + theme)
- **Priority:** P0 · **Size:** S–M · **Status:** Done (2026-06-01) · **Depends on:** —
- **Why P0:** ทุก item ที่เหลือ (T20–T24) อ้าง CSS variables/utility ที่ตั้งใน item นี้ — ถ้ายังไม่มี token จะแก้หน้าอื่นไม่ได้
- **Acceptance:**
  - [x] `--primary` เป็น **warm orange** (`hsl(25 95% 53%)` หรือ oklch เทียบเท่า) — `npm run build` แล้ว primary button **เป็นสีส้ม ไม่ใช่ฟ้า/ม่วง**
  - [x] CSS variables ครบทุกตัวตาม DESIGN.md "Color palette": primary + primary-hover, accent (teal `hsl(160 60% 45%)`), danger, warning, background (warm off-white), surface, border + border-hover, text-primary, text-secondary, text-on-primary
  - [x] ฟอนต์เป็น **Sarabun** (โหลดผ่าน `next/font` ใน [app/layout.tsx](app/layout.tsx)); weights 300/400/500/600 ใช้งานได้ — body=400, heading=600, caption=300
  - [x] Tailwind theme (`@theme inline`) map token ใหม่ครบ เพื่อให้ใช้ `bg-primary` / `text-secondary` / `bg-accent` / `text-danger` / `bg-surface` ใน util ได้
  - [x] chart tokens (`--chart-1..5`) เปลี่ยนจากโทนฟ้าเป็นโทนส้ม/warm (เตรียมให้ T22)
  - [x] radius defaults: card `rounded-xl` (12px), button `rounded-lg` (8px) ใช้งานได้ตาม DESIGN.md
  - [x] `npm run lint && npm run build` ผ่าน clean
- **Notes:** ใช้ HSL ตรงตาม DESIGN.md (เลิก oklch palette เดิม). แก้แค่ `app/globals.css` + `app/layout.tsx` (โหลด Sarabun ผ่าน `next/font`) — ไม่แตะ component ใด. **Decision (Get, 2026-06-01):** `text-secondary` (Tailwind v4 = `--color-secondary`) ชนกับ `bg-secondary` button variant — เลือกให้ `--secondary` = muted gray เพื่อให้ `text-secondary` ตรง DESIGN.md; ผลคือ base-nova `variant="secondary"` button จะเป็นเทาเข้มชั่วคราว จนกว่าจะเปลี่ยนเป็น `bg-surface border` ตอน refresh component ใน T20–T24.

### T20 — Refresh หน้าจดออเดอร์ (order page)
- **Priority:** P1 · **Size:** M · **Status:** Done (2026-06-02) · **Depends on:** T19
- **Scope:** [components/menu-grid.tsx](components/menu-grid.tsx), [components/order-cart.tsx](components/order-cart.tsx), [components/order-taker.tsx](components/order-taker.tsx), [app/(app)/order/page.tsx](app/(app)/order/page.tsx)
- **Acceptance:**
  - [x] menu card เป็น `rounded-xl border border-border` (ไม่ใช่ rounded-md), selected state = `border-2 border-primary bg-primary/5`, hover มี transition
  - [x] badge "พิเศษ" = `bg-primary/10 text-primary rounded-full`
  - [x] ราคาทุกจุดเป็น `tabular-nums`
  - [x] category section header เป็น `text-sm font-semibold text-secondary uppercase tracking-wide` + separator (ไม่ใช่ left-border bar เดิม)
  - [x] ปุ่ม "บันทึกออเดอร์" เป็น primary orange (`bg-primary text-white`), touch target ≥ 44px (py-2.5+)
  - [x] layout: iPad+ grid 2 คอลัมน์ (menu + cart), mobile stack; page ใช้ template `max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6` + page header
  - [x] empty state (เมนูว่าง / ตะกร้าว่าง) centered `py-12` + icon
  - [x] `npm run lint && npm run build` ผ่าน clean
- **Notes:** แตะ presentation เท่านั้น — server action `createOrder` / RPC คงเดิม. selected-in-cart highlight เพิ่ม prop `selectedIds` (Set ของ cartLineId) จาก `order-taker` → `menu-grid` (data-wiring, ไม่แตะ logic). disabled state ไม่ทำ — หน้า order filter `is_available=true` ตั้งแต่ server แล้ว ไม่มีเคส disabled.

### T21 — Refresh หน้าประวัติออเดอร์ (order-history)
- **Priority:** P1 · **Size:** M · **Status:** Done (2026-06-02) · **Depends on:** T19
- **Scope:** [components/order-history-view.tsx](components/order-history-view.tsx), [app/(app)/order-history/page.tsx](app/(app)/order-history/page.tsx)
- **Acceptance:**
  - [x] แต่ละออเดอร์เป็น list row `bg-surface border border-border rounded-xl p-4`, hover `bg-muted/50`
  - [x] info แบ่งด้วย `flex justify-between` — เลขออเดอร์+เวลาซ้าย, ยอด+status ขวา; ยอดเป็น `tabular-nums`
  - [x] status badge: สำเร็จ = `bg-accent/10 text-accent`, ยกเลิก = `bg-danger/10 text-danger`
  - [x] expandable row มี arrow rotate animation
  - [x] ปุ่ม "ยกเลิกออเดอร์" เป็น **danger outline** (`border border-danger text-danger`, hover `bg-danger/10`) ไม่ใช่ bg แดงทึบ
  - [x] page ใช้ layout template + page header + empty state (`py-12` + icon) เมื่อไม่มีออเดอร์
  - [x] `npm run lint && npm run build` ผ่าน clean
- **Notes:** logic ยกเลิก/แก้ไข (`cancelOrder` / `updateOrderItems` / RPC) คงเดิม — แตะแค่ style + 2-step confirm UI

### T22 — Refresh หน้า Dashboard + Recharts styling
- **Priority:** P1 · **Size:** M · **Status:** Done (2026-06-02) · **Depends on:** T19
- **Scope:** [components/sales-cards.tsx](components/sales-cards.tsx), [components/sales-chart.tsx](components/sales-chart.tsx), [components/dashboard-view.tsx](components/dashboard-view.tsx), [app/(app)/dashboard/page.tsx](app/(app)/dashboard/page.tsx)
- **Acceptance:**
  - [x] stats card: label `text-xs font-light text-secondary uppercase tracking-wide`, value `text-2xl font-bold tabular-nums`, active = `border-primary bg-primary/5`
  - [x] chart bar fill เป็น **primary warm orange** (ไม่ใช่ default Recharts blue #8884d8); grid `strokeDasharray="3 3"`; bar radius `[4,4,0,0]`; axis `text-xs text-secondary`; tooltip `bg-surface border shadow-md rounded-lg`
  - [x] cards เป็น `rounded-xl shadow-sm` (ไม่มี shadow-lg)
  - [x] page ใช้ layout template + page header + empty state เมื่อไม่มีข้อมูลขาย
  - [x] `npm run lint && npm run build` ผ่าน clean
- **Notes:** **ห้ามแตะ `lib/sales.ts`** — UTC+7 bucketing + `status='completed'` invariant คงเดิม. แก้แค่ presentation ของ chart/cards

### T23 — Refresh หน้าจัดการเมนู + หมวดหมู่
- **Priority:** P1 · **Size:** M · **Status:** Done (2026-06-02) · **Depends on:** T19
- **Scope:** [components/menu-manager.tsx](components/menu-manager.tsx), [app/(app)/menu/page.tsx](app/(app)/menu/page.tsx), [components/ui/dialog.tsx], [components/ui/switch.tsx], [components/ui/select.tsx]
- **Acceptance:**
  - [x] tab "เมนู / หมวดหมู่" ใช้ active state ตาม DESIGN.md (`text-primary border-b-2 border-primary`)
  - [x] เมนู/หมวดหมู่ rows เป็น `rounded-xl border border-border`, form input `rounded-lg`
  - [x] ปุ่มเพิ่ม/บันทึก = primary orange; ปุ่มลบ = danger outline; secondary actions = secondary style
  - [x] ราคาแสดง `tabular-nums` (validation error ยังใช้ toast — ไม่ทำ inline text)
  - [x] page ใช้ layout template + page header + empty state ทั้งสอง tab
  - [x] `npm run lint && npm run build` ผ่าน clean
- **Notes:** server actions (`createMenu`/`updateMenu`/`setMenuAvailability` + category actions) + FK cascade/restrict คงเดิม — แตะแค่ presentation. **Redesign จาก feedback (Get, 2026-06-02):** เมนู+หมวดหมู่ใช้ UX เดียวกัน — ฟอร์มเพิ่ม/แก้เป็น **Dialog popup กลางจอ** (`FormDialog` ใช้ร่วม, responsive: `max-h-90dvh` + header/footer ตรึง + body scroll), เปิด/ปิดเมนูเป็น **Switch** (เลิกไอคอนตา), เลือกหมวดเป็น **Select dropdown** (scale ได้ถ้าหมวดเยอะ). เพิ่ม shadcn base-nova components ใหม่: `dialog` / `switch` / `select` (ดึงจาก `@base-ui/react` ที่มีอยู่แล้ว — ไม่ลง npm package ใหม่).

### T24 — Refresh App nav bar
- **Priority:** P1 · **Size:** M · **Status:** Done (2026-06-02) · **Depends on:** T19
- **Scope:** [components/app-nav.tsx](components/app-nav.tsx), [app/(app)/layout.tsx](app/(app)/layout.tsx)
- **Acceptance:**
  - [x] nav `bg-surface border-b border-border shadow-sm`, `h-14`, `sticky top-0 z-50`
  - [x] logo `text-xl font-bold text-primary`
  - [x] nav item active = `text-primary border-b-2 border-primary`; inactive = `text-secondary`; hover `text-primary`
  - [x] ด้านขวา: user email `text-xs text-secondary` + logout เป็น ghost button
  - [x] responsive: mobile ไม่ล้น / อ่านได้
  - [x] `npm run lint && npm run build` ผ่าน clean
- **Notes:** active state อิง `usePathname`. **เปลี่ยนจากแผนเดิม (feedback Get, 2026-06-02):** nav links **เลิกใช้ `buttonVariants()`** — ทรงปุ่ม (rounded/hover-bg/focus-ring) ดูเป็นกล่อง ไม่ตรง DESIGN.md จึงทำเป็น tab underline ตัวอักษรล้วน (h-14 + `border-b-2`). เอา `overflow-x-auto` ออกจาก `<nav>` ด้วย — มันบังคับ `overflow-y:auto` ทำให้เกิด scrollbar แนวตั้งโผล่. layout reconciliation: รวม `<main>` ให้เหลือตัวเดียวที่ `app/(app)/layout.tsx` (max-w-6xl) + แก้ dashboard ที่เคยซ้อน `<main>`.

---

## Done

### Phase 2 — Post-MVP Features

### T11 — ดูประวัติออเดอร์
- **Priority:** P1 · **Size:** M · **Status:** Done · **Depends on:** —
- **Acceptance:**
  - [x] มีหน้า `/order-history` ใน protected route group
  - [x] แสดงออเดอร์ทุกรายการ: เลขออเดอร์, วันเวลา, จำนวนรายการ, ยอดรวม, status
  - [x] กดที่ออเดอร์แล้วเห็นรายการ item ในออเดอร์นั้น (expand หรือ modal)
  - [x] ออเดอร์ที่ cancelled แสดงด้วย style ที่ต่างจากปกติ (เช่น strikethrough / dim)
  - [x] ใช้ข้อมูลจริงจาก Supabase (RLS ผ่าน)

### T12 — แก้ไข/ยกเลิกออเดอร์
- **Priority:** P1 · **Size:** M · **Status:** Done · **Depends on:** T11
- **Acceptance:**
  - [x] กดยกเลิกออเดอร์แล้ว status เปลี่ยนเป็น `cancelled` ในฐานข้อมูล
  - [x] ออเดอร์ที่ cancelled ไม่นับใน dashboard (dashboard กรอง `status = 'completed'` อยู่แล้ว)
  - [x] แก้ไข quantity ของ item ใน order แล้ว `order_items` อัปเดตถูกต้อง
  - [x] ลบรายการทั้งบรรทัดออกจากออเดอร์ได้ (เก็บไว้อย่างน้อย 1 รายการ)
  - [x] ยืนยันก่อนยกเลิก (inline 2-step confirm) ป้องกันกด cancel โดยไม่ตั้งใจ
  - [x] action เป็น server action (`cancelOrder` / `updateOrderItems`)
- **Notes:** total คำนวณใหม่ server-side ผ่าน `update_order_items()` RPC จาก snapshot price — client ส่งแค่ `item_id` + `quantity` (ราคาแก้จาก client ไม่ได้). RPC sync รายการ: บรรทัดที่ client ตัดออกจะถูกลบ. ออเดอร์ที่ cancelled แก้ไม่ได้ (RPC reject + UI ซ่อนปุ่ม). ออเดอร์ว่าง (0 รายการ) ถูกบล็อก — ให้ใช้ "ยกเลิกออเดอร์" แทน. `update_order_items()` อยู่ใน `schema.sql` แล้ว.

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
- **Order status**: `orders.status` defaults to `'completed'` (orders saved after the customer is served). `cancelled` set from order history (T12); no `pending` UI yet.
- **Menu categories**: three fixed values — `อาหาร`, `เครื่องดื่ม`, `ของเพิ่ม` (CHECK constraint in `schema.sql`).
- **Price snapshot**: `order_items.price` stores the menu price at save time (+ `special_surcharge` when `is_special`). The `create_order()` RPC looks the price up **server-side** so a tampered client payload cannot change what the customer is charged. Edits go through `update_order_items()` which also recomputes totals server-side.
- **Atomic save**: order + items inserted in one transaction via the `create_order()` Postgres function.
- **Dashboard aggregation**: counts only `status = 'completed'` orders; all date bucketing is done in fixed Bangkok time (UTC+7) so results are correct regardless of where the server runs.
- **Next.js 16**: uses the new `proxy.ts` convention (formerly `middleware.ts`).

### Notable implementation details vs. original plan
- Added **proxy.ts** (was `middleware.ts`) — Next.js 16 renamed the convention.
- Added helper files not in the original file list: `lib/supabase/env.ts`, `lib/format.ts`, `components/order-taker.tsx`, `components/dashboard-view.tsx`, `components/sales-cards.tsx`, `components/app-nav.tsx` — small, single-purpose, kept the listed components presentational.
- shadcn/ui installed as the new **base-nova** style (built on Base UI, not Radix). The `Button` has no `asChild` prop — nav links use `buttonVariants()` on `<Link>` instead.

### Conventions
- IDs are stable (`T1`, `T2`, …) — never reuse, even after deletion.
- Sections: To Do → In Progress → Done → Blocked → Notes.
