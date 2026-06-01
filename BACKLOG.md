# orderman — Backlog

Restaurant order-taking + sales dashboard web app for a Thai restaurant.

Tech stack: Next.js 16 (App Router, TypeScript strict) · Tailwind CSS v4 · shadcn/ui · Supabase (Auth + Postgres) · Recharts

> Single source of truth. Task ID นิ่ง ห้าม renumber. อัปเดต status ที่ไฟล์นี้เท่านั้น
> Last updated: 2026-06-01 (backlog cleanup — รวม section ซ้ำ, ย้าย T11/T12 ไป Done, refresh T13)

---

## In Progress

_(none)_

---

## To Do — Phase 2 (Post-MVP Features)

- [x] **T13** จัดการเมนู (Menu Management UI) · P1 · L
- [x] **T18** จัดการหมวดหมู่แบบ dynamic (เพิ่ม/ลบ/แก้ชื่อ) · P1 · M _(extends T13)_
- [ ] **T14** ยอดขายรายเมนูบน Dashboard · P2 · M
- [ ] **T15** พิมพ์ใบเสร็จ · P2 · S _(depends on T11)_
- [ ] **T16** สิทธิ์ผู้ใช้ (Owner vs. Staff) · P2 · L
- [ ] **T17** จดออเดอร์แบบ manual (รายการนอกเมนู) · P2 · M

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
- **Priority:** P2 · **Size:** M · **Status:** Todo · **Depends on:** — (ทำหลัง T13 ได้ test data ดีกว่า)
- **Acceptance:**
  - [ ] dashboard แสดงตาราง/chart ยอดขายแยกตามชื่อเมนู
  - [ ] ตัวเลขนับเฉพาะออเดอร์ status = `completed` (invariant เดิม)
  - [ ] filter ช่วงเวลาเดียวกับ sales cards ปัจจุบัน (วันนี้/สัปดาห์/เดือน)
  - [ ] คิดเวลาใน UTC+7 เหมือน `lib/sales.ts` เดิม
- **Notes:** ขยาย aggregation ใน `lib/sales.ts` ไม่ใช่ query ใหม่ใน component. group by `menu_id` แล้วโชว์ชื่อปัจจุบันจาก `menus` (order_items snapshot ไม่มี `name` — กันเคสเมนูถูกเปลี่ยนชื่อภายหลัง).

### T15 — พิมพ์ใบเสร็จ (Browser Print)
- **Priority:** P2 · **Size:** S · **Status:** Todo · **Depends on:** T11 (เสร็จแล้ว → unblocked)
- **Acceptance:**
  - [ ] มีปุ่ม Print บน order detail (ใน order history)
  - [ ] กดแล้วเปิด browser print dialog พร้อม layout ใบเสร็จที่อ่านได้ (ชื่อร้าน, รายการ, ราคา, รวม)
  - [ ] print CSS ซ่อน nav bar และ UI อื่นที่ไม่เกี่ยวกับใบเสร็จ
  - [ ] ไม่ต้องติดตั้ง package เพิ่ม — ใช้ `window.print()` + `@media print` CSS
- **Notes:** quick win ขอบเขตเล็กชัด ทำได้ทันที.

### T16 — สิทธิ์ผู้ใช้ (Owner vs. Staff)
- **Priority:** P2 · **Size:** L · **Status:** Todo · **Depends on:** —
- **Acceptance:**
  - [ ] Supabase user metadata มี `role: owner | staff`
  - [ ] staff login แล้วถูก redirect ไปหน้า order เท่านั้น (dashboard, menu management ถูก block)
  - [ ] owner เข้าถึงทุกหน้าได้ตามปกติ
  - [ ] RLS/proxy gate บล็อก staff จาก route ที่ไม่ได้รับอนุญาต (ไม่ใช่แค่ hide link)
  - [ ] ไม่มี sign-up page — role กำหนดผ่าน Supabase dashboard เหมือนเดิม
- **Notes / ต้องตัดสินใจก่อนเริ่ม:** RLS ปัจจุบันเปิดให้ `authenticated` ทำได้ทุกอย่าง (`using (true)`). ถ้าจะบล็อก staff ระดับ DB จริง ต้องเขียน policy อิง `auth.jwt() -> role` ใหม่ทุกตาราง (effort สูงกว่า L). ถ้าแค่ proxy gate (block route) ก็พอสำหรับ use case ร้านเดียว — เจ้าของเลือกระดับความเข้ม.

### T17 — จดออเดอร์แบบ manual (รายการนอกเมนู)
- **Priority:** P2 · **Size:** M · **Status:** Todo · **Depends on:** —
- **ไอเดีย (จาก Get 2026-06-01):** อยากเพิ่มรายการที่ไม่มีในเมนูลงออเดอร์ได้ — กรอกชื่อ + ราคาเอง (เช่นเมนูพิเศษ off-menu / ของฝากลูกค้า)
- **ต้องตัดสินใจ design ก่อน:** `order_items.menu_id` เป็น NOT NULL FK → ทำ manual item ต้องเลือกทางใดทางหนึ่ง:
  - (a) ทำ `menu_id` nullable + เพิ่มคอลัมน์ `custom_name` ใน `order_items` (migration + แก้ `create_order()` RPC ให้รับ snapshot price จาก client เฉพาะ manual item — ⚠️ เปิดช่อง client กำหนดราคาเอง ต้อง validate)
  - (b) สร้าง menu ad-hoc (is_available=false) ตอนจด แล้วอ้างอิงปกติ — ไม่ต้องแก้ schema แต่เมนูรกขึ้น
- **Acceptance (ร่าง — รอ finalize):**
  - [ ] หน้า `/order` มีปุ่ม "เพิ่มรายการเอง" กรอกชื่อ + ราคา + จำนวน
  - [ ] รายการ manual เข้าออเดอร์ + นับใน total/dashboard ถูกต้อง
  - [ ] ราคา manual ถูก validate server-side (กันค่าติดลบ/ผิดรูปแบบ)

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
