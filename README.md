# orderman

ระบบจดออเดอร์และสรุปยอดขายสำหรับร้านอาหาร — เลือกเมนู เพิ่มลงออเดอร์ บันทึก
แล้วดูสรุปยอดขายราย วัน / สัปดาห์ / เดือน / ปี พร้อมกราฟ

## Tech stack

- **Next.js 16** (App Router) + **TypeScript** (strict)
- **Tailwind CSS v4** + **shadcn/ui**
- **Supabase** — Auth (email/password) + Postgres
- **Recharts** — กราฟยอดขาย

## Features (Phase 1 — MVP)

- 🔐 เข้าสู่ระบบด้วย Supabase Auth (email/password) + ป้องกัน route ด้วย `proxy.ts` (Next.js 16)
- 📝 หน้าจดออเดอร์ — เลือกเมนู → ปรับจำนวน → บันทึก
- 📊 Dashboard — สรุปยอดขาย วัน/สัปดาห์/เดือน/ปี + กราฟแท่ง

## Prerequisites

- Node.js 20+ และ npm
- บัญชี [Supabase](https://supabase.com) (มี free tier)

## Setup

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. สร้าง Supabase project

สร้าง project ใหม่ที่ [app.supabase.com](https://app.supabase.com)

### 3. รัน database schema

เปิด **SQL Editor** ใน Supabase Dashboard → **New query** →
คัดลอกเนื้อหาทั้งหมดจาก [`supabase/schema.sql`](supabase/schema.sql) มาวาง → **Run**

สคริปต์นี้จะสร้างตาราง (`menus`, `orders`, `order_items`), เปิด Row Level
Security, สร้างฟังก์ชัน `create_order()` และเพิ่มเมนูตัวอย่าง 8 รายการ
(รันซ้ำได้ปลอดภัย)

### 4. สร้าง user สำหรับทดสอบ

ยังไม่มีหน้าสมัครสมาชิก — สร้าง user เองที่
**Authentication → Users → Add user** (ใส่อีเมล + รหัสผ่าน,
ติ๊ก *Auto Confirm User* เพื่อข้ามการยืนยันอีเมล)

**สิทธิ์ผู้ใช้ (owner / staff):** สิทธิ์เก็บใน **ตาราง RBAC** (`user_roles` + `role_permissions`)
ของแอป — **ไม่ใช่** `app_metadata` แล้ว (ดู Phase 5). owner จัดการ staff ได้
**ในแอปที่หน้า `/admin/users`** โดยตรง:

- เพิ่ม/ลบ user และกำหนด role (owner / staff) ได้จากหน้านี้ — **ไม่ต้องเข้า
  Supabase dashboard เพื่อแก้ role อีกต่อไป** (ไม่มีการแก้ `raw_app_meta_data` ผ่าน SQL)
- `owner` = ทุก permission (เข้าได้ทุกหน้า); `staff` = `order.create` + `order.history.view`
  → เข้าได้แค่ **จดออเดอร์ + ประวัติ**; `/dashboard`, `/menu`, `/admin/users` ถูกบล็อก
  (redirect กลับ `/order`) ทั้งที่ `proxy.ts` และ server ของแต่ละหน้า
- **เปลี่ยน role มีผลทันที — ไม่ต้อง logout/login ใหม่** (สิทธิ์ถูก resolve จาก DB
  ทุก request ไม่ได้ฝังใน JWT). Supabase Auth (login / reset password / verify email)
  ยังใช้ flow เดิมทุกอย่าง

**owner คนแรก:** ถ้าเป็น project เดิมที่เคยมี user อยู่แล้ว — migration backfill ของ Phase 5
(`20260602010000_rbac_foundation`) จะตั้ง user เดิมทุกคนที่ไม่ใช่ `staff` ให้เป็น `owner`
อัตโนมัติ จึงไม่มีปัญหา lockout. ถ้าเป็น **project ใหม่ทั้งหมด** (ยังไม่มี user_roles เลย)
ให้ seed owner คนแรกด้วยมือครั้งเดียวผ่าน SQL Editor หลังสร้าง user แรก:

```sql
-- หา user id จากอีเมลแล้ว assign owner (ครั้งเดียว เพื่อกัน lockout)
insert into public.user_roles (user_id, role_key)
select id, 'owner' from auth.users where email = 'owner@example.com'
on conflict do nothing;
```

หลังจากนั้น owner คนแรกเพิ่ม/จัดการ user ที่เหลือได้จากหน้า `/admin/users` ทั้งหมด

> ℹ️ `app_metadata.role` (จากเวอร์ชันก่อน Phase 5) **เลิกถูกอ่านแล้ว** — โค้ดไม่แตะมัน
> อีกต่อไป; ยังคงค่าไว้ใน DB เพื่อความปลอดภัยเวลา rollback เท่านั้น. ตาราง `user_roles`
> คือแหล่งความจริงเดียวของสิทธิ์

### 5. ตั้งค่า environment variables

```bash
cp .env.local.example .env.local
```

แล้วกรอกค่าจาก Supabase Dashboard → **Project Settings → API**:

| ตัวแปร | ค่า |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (สำหรับ user management — ฝั่ง server เท่านั้น) |

> ⚠️ ใส่เฉพาะ **anon key** ในตัวแปร `NEXT_PUBLIC_*` เท่านั้น — ห้ามนำ `service_role` key
> มาใส่ในตัวแปร `NEXT_PUBLIC_*` เพราะมันจะถูกส่งไปฝั่ง browser และ bypass RLS ได้
>
> `SUPABASE_SERVICE_ROLE_KEY` เป็น **secret ฝั่ง server เท่านั้น** (ไม่มี prefix `NEXT_PUBLIC_`)
> — ใช้โดยหน้า `/admin/users` เพื่อจัดการ user. local ใส่ค่า service_role ของ project **dev**.
> ห้าม commit ค่าจริง (`.env.local` อยู่ใน `.gitignore` แล้ว). ถ้ายังไม่ตั้ง key นี้ แอปยังรันได้ปกติ
> แต่หน้า `/admin/users` จะใช้งานไม่ได้

### 6. รัน dev server

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) → จะถูก redirect ไปหน้า
`/login` → เข้าสู่ระบบด้วย user ที่สร้างไว้ในขั้นตอนที่ 4

## Deploy to Vercel

> ⚠️ ถ้า deploy แล้วขึ้น **Internal Server Error** ทุกหน้า — แทบทุกครั้งเกิดจาก
> ยังไม่ได้ตั้ง env vars บน Vercel ทำให้ `proxy.ts` throw ทุก request

### 1. Import โปรเจกต์เข้า Vercel

ผูก GitHub repo เข้า Vercel ตามปกติ — Vercel จะ detect Next.js ให้เอง
ไม่ต้องตั้ง build command หรือ output directory เพิ่ม

### 2. ตั้ง environment variables

**Project Settings → Environment Variables** เพิ่มตัวแปรเหล่านี้ (ติ๊กครบทั้ง
*Production*, *Preview*, *Development*):

| ตัวแปร | ค่า |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL จาก Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key จาก Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (server-only — สำหรับ `/admin/users`) |

> ⚠️ ห้ามใส่ `service_role` key ในตัวแปร `NEXT_PUBLIC_*` เด็ดขาด — มันจะ bypass RLS
> และหลุดไป browser. ตั้งเป็นชื่อ `SUPABASE_SERVICE_ROLE_KEY` (ไม่มี `NEXT_PUBLIC_`) เท่านั้น
>
> ⚠️ **key ของ dev/prod คนละตัว — อย่าสลับ.** scope **Production** ต้องใส่ค่า service_role
> ของ project **orderman-prod**; ถ้าใช้ login บน Preview ก็ใส่ค่า dev ใน scope Preview ด้วย.
> ห้าม commit ค่าจริงลง repo

### 3. Redeploy

หลังตั้ง env vars ต้องสั่ง **Redeploy** ครั้งใหม่ (Deployments → … → Redeploy)
เพราะ Vercel ไม่ inject env vars เข้า deployment ที่ build ไปแล้ว

### 4. ตั้งค่า Supabase Auth URLs

เพื่อให้ login บน production ทำงานถูกต้อง:

**Supabase Dashboard → Authentication → URL Configuration**
- *Site URL*: `https://<your-app>.vercel.app`
- *Redirect URLs*: เพิ่ม `https://<your-app>.vercel.app/**`

(ถ้ามี Vercel preview URLs ที่ใช้ login ด้วย ก็เพิ่ม pattern ของ
`https://<your-app>-*.vercel.app/**` เข้าไปอีกหนึ่ง entry)

## Project structure

```
app/
  (app)/              # กลุ่ม route ที่ต้องล็อกอิน (มี nav shell)
    layout.tsx        # ตรวจ auth + app shell
    order/            # หน้าจดออเดอร์ + server action
    dashboard/        # หน้า dashboard
    admin/users/      # หน้าจัดการผู้ใช้ (RBAC) + user-management server actions
  auth/actions.ts     # server actions: login / signOut
  login/page.tsx      # หน้าเข้าสู่ระบบ
components/
  ui/                 # shadcn/ui components
  *.tsx               # menu-grid, order-cart, sales-chart ฯลฯ
lib/
  supabase/           # Supabase helpers (client / server / proxy / env)
  rbac/               # RBAC layer — permissions.ts (app config) / guards.ts / admin.ts
  database.types.ts   # TypeScript types ของ DB schema
  sales.ts            # ฟังก์ชันรวมยอดขาย
  format.ts           # จัดรูปแบบเงินบาท
proxy.ts              # auth gate ทุก request (Next.js 16 — เดิมชื่อ middleware.ts)
supabase/schema.sql   # DB schema snapshot — รันใน Supabase SQL editor
supabase/rbac/rbac.sql # RBAC layer แบบ portable (tables + helpers + RLS + seed)
```

## RBAC module (portable)

ชั้น authorization ของแอป (Phase 5) ออกแบบให้ **ยกไปใช้ซ้ำใน project อื่นได้** — copy
สองก้อนนี้ไปวาง:

1. **`lib/rbac/`** — โค้ด guard/admin แบบ generic
   - `guards.ts` — core guard (`getCurrentPermissions()` / `requirePermission()` /
     `hasPermission()`) เรียก rpc `auth_user_permissions` / `auth_has_permission` — **ไม่ต้องแก้**
   - `admin.ts` — service-role admin client (`import "server-only"`) สำหรับเขียน RBAC tables — **ไม่ต้องแก้**
   - `permissions.ts` — **app-specific config** (permission catalog + `ROUTE_PERMISSIONS` map)
2. **`supabase/rbac/rbac.sql`** — ก้อน SQL เดียว self-contained (tables + helper functions +
   RLS + seed) paste ลง SQL Editor แล้ว Run ได้เลย (idempotent, rerun ปลอดภัย)

**สิ่งที่ต้องแก้ต่อ project:**
- ใน `supabase/rbac/rbac.sql` — section **"APP-SPECIFIC SEED"**: รายชื่อ permission, role
  และ role→permission grants
- ใน `lib/rbac/permissions.ts` — `PERMISSIONS` constants + `ROUTE_PERMISSIONS` (path → permission)
- ตั้ง env `SUPABASE_SERVICE_ROLE_KEY` **ของแต่ละ project แยกกัน** (server-only)

**หมายเหตุ:** การ backfill `user_roles` จาก state เดิม (ใน migration `20260602010000` ของ
orderman) เป็นงาน **เฉพาะ project นี้** — ไม่ได้รวมอยู่ใน `rbac.sql`. project ใหม่ให้ seed owner
คนแรกด้วยมือครั้งเดียว (ดู comment หัวไฟล์ `rbac.sql` ข้อ 4). สิทธิ์ถูก resolve จาก DB ทุก request
→ เปลี่ยน role มีผลทันทีไม่ต้อง re-login.

## Security notes

- Row Level Security เปิดทุกตาราง — เฉพาะผู้ใช้ที่ล็อกอินแล้วเท่านั้นที่เข้าถึงข้อมูลได้
- ราคาแต่ละรายการถูก snapshot จากตาราง `menus` **ฝั่ง database** ในฟังก์ชัน
  `create_order()` — payload ที่ถูกแก้จาก client เปลี่ยนราคาที่ลูกค้าจ่ายไม่ได้
- **Authorization เป็นแบบ permission-based (RBAC)** — สิทธิ์ resolve จากตาราง `user_roles` →
  `role_permissions` ทุก request (helper `auth_has_permission` / `auth_user_permissions`).
  การ "เขียน" ตาราง RBAC ทำได้เฉพาะผ่าน service-role admin client ใน server action ที่เช็ค
  `user.manage` แล้วเท่านั้น — RLS ปฏิเสธ write จาก session ปกติ → user แก้สิทธิ์ตัวเองไม่ได้
- `app_metadata.role` (ก่อน Phase 5) **เลิกใช้แล้ว** — เก็บไว้เฉพาะเผื่อ rollback; `user_roles`
  คือแหล่งความจริงเดียว
- `.env.local` อยู่ใน `.gitignore` — อย่า commit credentials จริง (รวมถึง `SUPABASE_SERVICE_ROLE_KEY`)

## Available scripts

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | รัน dev server |
| `npm run build` | build production |
| `npm run start` | รัน production build |
| `npm run lint` | ตรวจ ESLint |

## Roadmap

ดูสิ่งที่ทำแล้ว/กำลังทำ/รอทำใน [`BACKLOG.md`](BACKLOG.md)
