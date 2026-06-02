# orderman — Backlog

Restaurant order-taking + sales dashboard web app for a Thai restaurant.

Tech stack: Next.js 16 (App Router, TypeScript strict) · Tailwind CSS v4 · shadcn/ui · Supabase (Auth + Postgres) · Recharts

> Single source of truth. Task ID นิ่ง ห้าม renumber. อัปเดต status ที่ไฟล์นี้เท่านั้น
> Last updated: 2026-06-02 (Phase 3 Design Refresh T19–T24 เสร็จ + /menu redesign)

---

## In Progress

_(none)_

---

## To Do — Phase 2 (Post-MVP Features)

- [x] **T13** จัดการเมนู (Menu Management UI) · P1 · L
- [x] **T18** จัดการหมวดหมู่แบบ dynamic (เพิ่ม/ลบ/แก้ชื่อ) · P1 · M _(extends T13)_
- [x] **T14** ยอดขายรายเมนูบน Dashboard · P2 · M
- [x] **T15** พิมพ์ใบเสร็จ · P2 · S _(depends on T11)_
- [ ] **T16** สิทธิ์ผู้ใช้ (Owner vs. Staff) · P2 · L
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
- **Priority:** P2 · **Size:** L · **Status:** Todo · **Depends on:** —
- **Acceptance:**
  - [ ] Supabase user metadata มี `role: owner | staff`
  - [ ] staff login แล้วถูก redirect ไปหน้า order เท่านั้น (dashboard, menu management ถูก block)
  - [ ] owner เข้าถึงทุกหน้าได้ตามปกติ
  - [ ] RLS/proxy gate บล็อก staff จาก route ที่ไม่ได้รับอนุญาต (ไม่ใช่แค่ hide link)
  - [ ] ไม่มี sign-up page — role กำหนดผ่าน Supabase dashboard เหมือนเดิม
- **Notes / ต้องตัดสินใจก่อนเริ่ม:** RLS ปัจจุบันเปิดให้ `authenticated` ทำได้ทุกอย่าง (`using (true)`). ถ้าจะบล็อก staff ระดับ DB จริง ต้องเขียน policy อิง `auth.jwt() -> role` ใหม่ทุกตาราง (effort สูงกว่า L). ถ้าแค่ proxy gate (block route) ก็พอสำหรับ use case ร้านเดียว — เจ้าของเลือกระดับความเข้ม.

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

✅ Phase 3 เสร็จ (2026-06-02) — ทุกหน้า apply DESIGN.md, `npm run lint && npm run build` ผ่าน clean

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
