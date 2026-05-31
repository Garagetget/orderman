# orderman — Backlog

Restaurant order-taking + sales dashboard web app for a Thai restaurant.

Tech stack: Next.js 16 (App Router, TypeScript strict) · Tailwind CSS v4 · shadcn/ui · Supabase (Auth + Postgres) · Recharts

> Single source of truth. Task ID นิ่ง ห้าม renumber. อัปเดต status ที่ไฟล์นี้เท่านั้น
> Last updated: 2026-06-01 (T12 done + pushed)

---

## In Progress

_(none)_

---

## To Do

### Phase 2 — Post-MVP Features

- [x] **T11** ดูประวัติออเดอร์
- [x] **T12** แก้ไข/ยกเลิกออเดอร์ _(depends on T11)_
- [ ] **T13** จัดการเมนู (Menu Management UI)
- [ ] **T14** ยอดขายรายเมนูบน Dashboard
- [ ] **T15** พิมพ์ใบเสร็จ _(depends on T11)_
- [ ] **T16** สิทธิ์ผู้ใช้ (Owner vs. Staff)

---

## Phase 2 — Post-MVP Features

### T11 — ดูประวัติออเดอร์
- **Priority:** P1 · **Size:** M · **Status:** Done · **Depends on:** —
- **Acceptance:**
  - [ ] มีหน้า `/order-history` ใน protected route group
  - [ ] แสดงออเดอร์ทุกรายการ: เลขออเดอร์, วันเวลา, จำนวนรายการ, ยอดรวม, status
  - [ ] กดที่ออเดอร์แล้วเห็นรายการ item ในออเดอร์นั้น (expand หรือ modal)
  - [ ] ออเดอร์ที่ cancelled แสดงด้วย style ที่ต่างจากปกติ (เช่น strikethrough / dim)
  - [ ] ใช้ข้อมูลจริงจาก Supabase (RLS ผ่าน)

---

## To Do — Phase 2 (Post-MVP Features)

### T12 — แก้ไข/ยกเลิกออเดอร์
- **Priority:** P1 · **Size:** M · **Status:** Done · **Depends on:** T11
- **Acceptance:**
  - [x] กดยกเลิกออเดอร์แล้ว status เปลี่ยนเป็น `cancelled` ในฐานข้อมูล
  - [x] ออเดอร์ที่ cancelled ไม่นับใน dashboard (dashboard กรอง `status = 'completed'` อยู่แล้ว)
  - [x] แก้ไข quantity ของ item ใน order แล้ว `order_items` อัปเดตถูกต้อง
  - [x] ลบรายการทั้งบรรทัดออกจากออเดอร์ได้ (เก็บไว้อย่างน้อย 1 รายการ)
  - [x] ยืนยันก่อนยกเลิก (inline 2-step confirm) ป้องกันกด cancel โดยไม่ตั้งใจ
  - [x] action เป็น server action (`cancelOrder` / `updateOrderItems`)
- **Notes:** total คำนวณใหม่ server-side ผ่าน `update_order_items()` RPC จาก snapshot price — client ส่งแค่ `item_id` + `quantity` (ราคาแก้จาก client ไม่ได้). RPC sync รายการ: บรรทัดที่ client ตัดออกจะถูกลบ. ออเดอร์ที่ cancelled แก้ไม่ได้ (RPC reject + UI ซ่อนปุ่ม). ออเดอร์ว่าง (0 รายการ) ถูกบล็อก — ให้ใช้ "ยกเลิกออเดอร์" แทน.
- **PR:** branch `feat/t12-edit-cancel-order` (รอ merge เข้า master). ⚠️ ต้องรัน `supabase/schema.sql` ใหม่หลัง merge เพื่อสร้าง RPC.

### T13 — จัดการเมนู (Menu Management UI)
- **Priority:** P1 · **Size:** L · **Status:** Todo · **Depends on:** —
- **Acceptance:**
  - [ ] มีหน้า `/menu` สำหรับ owner จัดการเมนู
  - [ ] เพิ่มเมนูใหม่ได้: ชื่อ, ราคา, หมวดหมู่ (`เครื่องดื่ม` / `อาหาร`)
  - [ ] แก้ไขชื่อและราคาเมนูที่มีอยู่ได้
  - [ ] ปิด/เปิดเมนูชั่วคราว (เมนูที่ปิดไม่แสดงในหน้ารับออเดอร์)
  - [ ] schema.sql อัปเดตรองรับ `is_active` flag บนตาราง `menus`
  - [ ] CHECK constraint ของ category ยังคงอยู่ใน schema.sql

### T14 — ยอดขายรายเมนูบน Dashboard
- **Priority:** P2 · **Size:** M · **Status:** Todo · **Depends on:** —
- **Acceptance:**
  - [ ] dashboard แสดงตาราง/chart ยอดขายแยกตามชื่อเมนู
  - [ ] ตัวเลขนับเฉพาะออเดอร์ status = `completed` (invariant เดิม)
  - [ ] filter ช่วงเวลาเดียวกับ sales cards ปัจจุบัน (วันนี้/สัปดาห์/เดือน)
  - [ ] คิดเวลาใน UTC+7 เหมือน `lib/sales.ts` เดิม

### T15 — พิมพ์ใบเสร็จ (Browser Print)
- **Priority:** P2 · **Size:** S · **Status:** Todo · **Depends on:** T11
- **Acceptance:**
  - [ ] มีปุ่ม Print บน order detail (ใน order history)
  - [ ] กดแล้วเปิด browser print dialog พร้อม layout ใบเสร็จที่อ่านได้ (ชื่อร้าน, รายการ, ราคา, รวม)
  - [ ] print CSS ซ่อน nav bar และ UI อื่นที่ไม่เกี่ยวกับใบเสร็จ
  - [ ] ไม่ต้องติดตั้ง package เพิ่ม — ใช้ `window.print()` + `@media print` CSS

### T16 — สิทธิ์ผู้ใช้ (Owner vs. Staff)
- **Priority:** P2 · **Size:** L · **Status:** Todo · **Depends on:** —
- **Acceptance:**
  - [ ] Supabase user metadata มี `role: owner | staff`
  - [ ] staff login แล้วถูก redirect ไปหน้า order เท่านั้น (dashboard, menu management ถูก block)
  - [ ] owner เข้าถึงทุกหน้าได้ตามปกติ
  - [ ] RLS/proxy gate บล็อก staff จาก route ที่ไม่ได้รับอนุญาต (ไม่ใช่แค่ hide link)
  - [ ] ไม่มี sign-up page — role กำหนดผ่าน Supabase dashboard เหมือนเดิม

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
- Added helper files not in the original file list: `lib/supabase/env.ts`, `lib/format.ts`, `components/order-taker.tsx`, `components/dashboard-view.tsx`, `components/sales-cards.tsx`, `components/app-nav.tsx` — small, single-purpose, kept the listed components presentational.
- shadcn/ui installed as the new **base-nova** style (built on Base UI, not Radix). The `Button` has no `asChild` prop — nav links use `buttonVariants()` on `<Link>` instead.

### Phase 2 ideas
Migrated to backlog as T11–T16 (2026-05-29).

### Conventions
- IDs are stable (`T1`, `T2`, …) — never reuse, even after deletion.
- Sections: To Do → In Progress → Done → Blocked → Notes.
