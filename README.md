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

### 5. ตั้งค่า environment variables

```bash
cp .env.local.example .env.local
```

แล้วกรอกค่าจาก Supabase Dashboard → **Project Settings → API**:

| ตัวแปร | ค่า |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key |

> ⚠️ ใส่เฉพาะ **anon key** เท่านั้น — ห้ามนำ `service_role` key มาใส่ในตัวแปร
> `NEXT_PUBLIC_*` เพราะมันจะถูกส่งไปฝั่ง browser และ bypass RLS ได้

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

**Project Settings → Environment Variables** เพิ่มสองตัวนี้ (ติ๊กครบทั้ง
*Production*, *Preview*, *Development*):

| ตัวแปร | ค่า |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL จาก Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key จาก Supabase |

> ⚠️ ห้ามใส่ `service_role` key เด็ดขาด — มันจะ bypass RLS และหลุดไป browser

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
  auth/actions.ts     # server actions: login / signOut
  login/page.tsx      # หน้าเข้าสู่ระบบ
components/
  ui/                 # shadcn/ui components
  *.tsx               # menu-grid, order-cart, sales-chart ฯลฯ
lib/
  supabase/           # Supabase helpers (client / server / proxy / env)
  database.types.ts   # TypeScript types ของ DB schema
  sales.ts            # ฟังก์ชันรวมยอดขาย
  format.ts           # จัดรูปแบบเงินบาท
proxy.ts              # auth gate ทุก request (Next.js 16 — เดิมชื่อ middleware.ts)
supabase/schema.sql   # DB schema — รันใน Supabase SQL editor
```

## Security notes

- Row Level Security เปิดทุกตาราง — เฉพาะผู้ใช้ที่ล็อกอินแล้วเท่านั้นที่เข้าถึงข้อมูลได้
- ราคาแต่ละรายการถูก snapshot จากตาราง `menus` **ฝั่ง database** ในฟังก์ชัน
  `create_order()` — payload ที่ถูกแก้จาก client เปลี่ยนราคาที่ลูกค้าจ่ายไม่ได้
- `.env.local` อยู่ใน `.gitignore` — อย่า commit credentials จริง

## Available scripts

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | รัน dev server |
| `npm run build` | build production |
| `npm run start` | รัน production build |
| `npm run lint` | ตรวจ ESLint |

## Roadmap

ดูสิ่งที่ทำแล้ว/กำลังทำ/รอทำใน [`BACKLOG.md`](BACKLOG.md)
