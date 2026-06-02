# Design Rules — orderman

> เพิ่ม section นี้ลงใน AGENTS.md เพื่อให้ Claude Code follow design standard ทุกครั้งที่สร้าง/แก้ UI

## Design philosophy

POS app สำหรับร้านอาหารไทย — ใช้บน iPad เป็นหลัก, ต้องกดเร็ว อ่านง่าย ไม่รกตา
สไตล์: **Clean Warm Minimal** — สะอาด อุ่น ไม่เย็นชา ไม่ fancy เกินไป

## Color palette

ใช้ CSS variables ใน `globals.css` — ห้ามใช้สี hardcode ตรงๆ

```
Primary:        hsl(25, 95%, 53%)    // warm orange — brand color, CTA buttons
Primary hover:  hsl(25, 95%, 45%)    // darker orange
Accent:         hsl(160, 60%, 45%)   // teal green — success, completed status
Danger:         hsl(0, 72%, 51%)     // red — cancel, delete, destructive
Warning:        hsl(38, 92%, 50%)    // amber — pending status, alerts

Background:     hsl(30, 20%, 98%)    // warm off-white (ไม่ขาวจั๊ด)
Surface:        hsl(0, 0%, 100%)     // white — cards, panels
Border:         hsl(30, 10%, 90%)    // warm gray border
Border hover:   hsl(25, 40%, 80%)    // orange-tinted on hover/selected

Text primary:   hsl(20, 10%, 15%)    // near-black warm
Text secondary: hsl(20, 5%, 45%)     // muted gray
Text on primary: hsl(0, 0%, 100%)    // white on orange buttons
```

ห้าม: ใช้ pure blue (`#3b82f6`) เป็น primary — มันเย็นเกินสำหรับ restaurant app
ห้าม: ใช้สี default shadcn โดยไม่ override — ต้อง apply palette นี้ก่อน

## Typography

```
Font family:    'Sarabun', sans-serif
Heading weight: 600 (semibold)
Body weight:    400 (regular)
Small/label:    300 (light)

Scale (mobile-first):
- Page title:      text-2xl (1.5rem) font-semibold
- Section heading:  text-lg (1.125rem) font-semibold
- Card title:       text-base (1rem) font-medium
- Body:             text-sm (0.875rem) font-normal
- Caption/label:    text-xs (0.75rem) font-light text-secondary
- Price (large):    text-3xl (1.875rem) font-bold tabular-nums
- Price (inline):   text-base font-semibold tabular-nums
```

ห้าม: ใช้ `font-bold` กับทุกอย่าง — heading = semibold, body = normal, caption = light
ห้าม: ใช้ราคาแบบ proportional — ราคาต้อง `tabular-nums` เสมอเพื่อ alignment

## Spacing & Layout

```
Page padding:       px-4 md:px-6 lg:px-8
Section gap:        space-y-6
Card padding:       p-4 md:p-5
Card gap (grid):    gap-3
Inner element gap:  gap-2
Nav height:         h-14 (56px)
Content max-width:  max-w-6xl mx-auto
```

กฎสำคัญ:
- ใช้ spacing scale ของ Tailwind (4, 6, 8) — ห้ามใช้ arbitrary values เช่น `p-[13px]`
- Section ต่างกันต้องมี gap ชัดเจน (`space-y-6` ขึ้นไป)
- Card ข้างในต้องหายใจ (`p-4` minimum)
- Empty state ต้อง centered + มี padding เยอะ (`py-12`)

## Border & Radius

```
Card radius:        rounded-xl (12px)
Button radius:      rounded-lg (8px)
Badge radius:       rounded-full
Input radius:       rounded-lg (8px)
Border width:       border (1px) — ไม่ใช้ border-2 ยกเว้น selected state
Selected state:     border-2 border-primary (ring แบบเดิมเปลี่ยนเป็น border)
```

ห้าม: ใช้ `rounded-md` กับ cards — ดูตึงเกินไป, ใช้ `rounded-xl` เสมอ
ห้าม: ใช้ `shadow-lg` หรือ `shadow-xl` — ใช้ `shadow-sm` หรือไม่มี shadow เลย

## Shadow & Elevation

```
Card:               shadow-sm (default) | shadow-none (flat variant)
Card hover:         shadow-md + slight translateY(-1px) transition
Sticky nav:         shadow-sm
Modal/dialog:       shadow-lg (exception — only here)
Dropdown:           shadow-md
```

ใช้ shadow น้อยที่สุด — ให้ border + background ทำหน้าที่แบ่ง layer แทน

## Button styles

```
Primary (CTA):      bg-primary text-white rounded-lg px-6 py-2.5 font-medium
                    hover: bg-primary-hover
                    ใช้กับ: บันทึกออเดอร์, เพิ่มเมนู, confirm actions

Secondary:          bg-surface border border-border rounded-lg px-4 py-2.5
                    hover: bg-muted
                    ใช้กับ: ล้าง, แก้ไข, secondary actions

Danger:             bg-transparent border border-danger text-danger rounded-lg
                    hover: bg-danger/10
                    ใช้กับ: ยกเลิกออเดอร์, ลบ

Ghost:              bg-transparent hover:bg-muted rounded-lg px-3 py-2
                    ใช้กับ: icon buttons, nav links
```

กฎสำคัญ:
- ปุ่ม CTA ต้องมีสีเดียวต่อหน้า (primary orange) — ไม่มี 2 ปุ่มส้มข้างกัน
- ปุ่ม danger ไม่ใช้ bg-danger ตรงๆ — ใช้ outline + text-danger (ลดโอกาสกดพลาด)
- Touch target ≥ 44px (py-2.5 minimum) สำหรับ iPad

## Card patterns

### Menu card (หน้าจดออเดอร์)
```
- bg-surface border border-border rounded-xl p-4
- hover: border-primary/50 shadow-sm transition-all duration-150
- selected (ในตะกร้า): border-2 border-primary bg-primary/5
- disabled: opacity-50 pointer-events-none
- ชื่อเมนู: text-base font-medium
- ราคา: text-sm text-secondary tabular-nums
- Badge "พิเศษ": bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full
```

### Stats card (Dashboard)
```
- bg-surface border border-border rounded-xl p-5
- Label: text-xs font-light text-secondary uppercase tracking-wide
- Value: text-2xl font-bold tabular-nums mt-1
- Active/selected: border-primary bg-primary/5
- เพิ่ม: icon เล็กๆ ข้างซ้าย label (optional) ใช้ lucide-react
```

### List row (ประวัติออเดอร์)
```
- bg-surface border border-border rounded-xl p-4
- hover: bg-muted/50 transition-colors
- Expandable: ใช้ collapsible, arrow rotate animation
- แบ่ง info ด้วย flex justify-between — ID+time ซ้าย, amount+status ขวา
- Status badge:
  - สำเร็จ: bg-accent/10 text-accent
  - ยกเลิก: bg-danger/10 text-danger
```

## Category section header

```
แทน left-border bar เดิม ใช้:
- text-sm font-semibold text-secondary uppercase tracking-wide
- มี small dot หรือ icon ข้างหน้า (color = primary)
- ด้านล่าง: thin separator line (border-b border-border)
- spacing: mt-6 mb-3
```

## Navigation bar

```
- bg-surface border-b border-border shadow-sm
- Logo: text-xl font-bold text-primary
- Nav items: text-sm font-medium text-secondary
  - Active: text-primary border-b-2 border-primary
  - Hover: text-primary/80
- ด้านขวา: user email text-xs text-secondary + logout ghost button
- Height: h-14 with items-center
- Sticky: sticky top-0 z-50
```

## Page layout template

ทุกหน้าต้อง follow structure นี้:

```tsx
<main className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6">
  {/* Page header */}
  <div className="mb-6">
    <h1 className="text-2xl font-semibold">ชื่อหน้า</h1>
    <p className="text-sm text-secondary mt-1">คำอธิบายสั้น</p>
  </div>

  {/* Content */}
  <div className="space-y-6">
    ...
  </div>
</main>
```

## Interactive states & Feedback

```
Hover:          transition-all duration-150 ease-in-out
Active/pressed: scale-[0.98] (สำหรับ cards ที่ clickable)
Focus:          ring-2 ring-primary/30 ring-offset-2
Loading:        skeleton pulse (bg-muted animate-pulse rounded)
Toast/success:  ใช้ sonner — bg-accent text-white, auto-dismiss 3s
Error:          text-danger text-sm mt-1 ใต้ input
```

กฎ: ทุก interactive element ต้องมี hover + focus state — ห้ามปล่อยเฉยๆ

## Responsive breakpoints

```
iPad target:    md (768px) — layout หลักออกแบบที่ขนาดนี้
Mobile:         < 768px — stack เป็น column, ซ่อน sidebar
Desktop:        lg (1024px)+ — เต็ม layout, max-width cap
```

หน้าจดออเดอร์:
- iPad+: grid 2 columns (menu grid + cart sidebar)
- Mobile: menu grid full width, cart เป็น sticky bottom sheet

## Chart styling (Recharts)

```
Bar fill:       primary color (warm orange)
Grid:           stroke-muted, strokeDasharray="3 3"
Axis text:      text-xs text-secondary
Tooltip:        bg-surface border shadow-md rounded-lg p-3
Bar radius:     [4, 4, 0, 0] (rounded top)
```

ห้าม: ใช้สี default Recharts (blue #8884d8) — override เป็น primary เสมอ

## Empty states

ทุก list/grid ที่ว่าง ต้องมี empty state:
```
- centered, py-12
- icon (lucide) ขนาด 48px, text-muted opacity-50
- ข้อความ: text-sm text-secondary
- optional: CTA button ถ้ามี action ที่ทำได้
```

## Do & Don't summary

DO:
- ใช้ warm orange เป็น brand color ทั้ง project
- ทุก card ใช้ rounded-xl
- spacing ใช้ scale 4/6/8 เท่านั้น
- ราคาใช้ tabular-nums เสมอ
- touch target ≥ 44px สำหรับ iPad
- transition-all duration-150 ทุก interactive element

DON'T:
- ห้ามใช้ pure blue เป็น primary
- ห้ามใช้ shadow-lg กับ cards ปกติ
- ห้ามใช้ rounded-md กับ cards (ใช้ rounded-xl)
- ห้ามใช้ font-bold ทุกที่ (ใช้ font-semibold สำหรับ headings)
- ห้ามใช้สี hardcode — ต้องผ่าน CSS variables
- ห้ามใช้ arbitrary spacing เช่น `p-[13px]`
- ห้ามมีหน้าไหนไม่มี empty state