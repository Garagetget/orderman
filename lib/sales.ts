// Sales aggregation helpers.
//
// All bucketing is done in Bangkok wall-clock time (UTC+7, no DST) so a sales
// "day" is a Bangkok day regardless of where the server runs. Every function
// takes `nowMs` (an absolute timestamp) so server render and client hydration
// produce identical output — no hydration mismatch, no useEffect needed.

export type Period = "day" | "week" | "month" | "year";

export type SalesOrder = {
  created_at: string;
  total: number;
};

export type Range = { startMs: number; endMs: number };

export type ChartPoint = { label: string; total: number };

export const PERIODS: { value: Period; label: string }[] = [
  { value: "day", label: "วันนี้" },
  { value: "week", label: "7 วัน" },
  { value: "month", label: "เดือนนี้" },
  { value: "year", label: "ปีนี้" },
];

const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Round to 2 decimals (satang). DB totals are exact `numeric`, but re-summing
 *  them as JS floats can drift (0.1 + 0.2 = 0.30000000000000004); round so the
 *  dashboard never shows a long-tail figure. (T39) */
function round2(amount: number): number {
  return Math.round(amount * 100) / 100;
}

const THAI_WEEKDAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/** Bangkok wall-clock parts of an absolute timestamp. */
function bkkParts(absMs: number) {
  const shifted = new Date(absMs + BKK_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

/** Absolute timestamp for a Bangkok wall-clock moment. */
function bkkToAbs(
  year: number,
  month: number,
  day: number,
  hour = 0,
): number {
  // Date.UTC normalises out-of-range day/month values (e.g. day 0, day 32).
  return Date.UTC(year, month, day, hour) - BKK_OFFSET_MS;
}

/** Inclusive range covering a period up to `nowMs`. */
export function getPeriodRange(period: Period, nowMs: number): Range {
  const { year, month, day } = bkkParts(nowMs);
  let startMs: number;
  switch (period) {
    case "day":
      startMs = bkkToAbs(year, month, day);
      break;
    case "week":
      startMs = bkkToAbs(year, month, day - 6); // today + previous 6 days
      break;
    case "month":
      startMs = bkkToAbs(year, month, 1);
      break;
    case "year":
      startMs = bkkToAbs(year, 0, 1);
      break;
  }
  return { startMs, endMs: nowMs };
}

/** Sums order totals whose created_at falls within the range. */
export function sumSales(orders: SalesOrder[], range: Range): number {
  const sum = orders.reduce((acc, order) => {
    const t = Date.parse(order.created_at);
    return t >= range.startMs && t <= range.endMs ? acc + order.total : acc;
  }, 0);
  return round2(sum);
}

/** The four headline totals shown on the dashboard cards. */
export function summarize(
  orders: SalesOrder[],
  nowMs: number,
): Record<Period, number> {
  return {
    day: sumSales(orders, getPeriodRange("day", nowMs)),
    week: sumSales(orders, getPeriodRange("week", nowMs)),
    month: sumSales(orders, getPeriodRange("month", nowMs)),
    year: sumSales(orders, getPeriodRange("year", nowMs)),
  };
}

export type SalesItem = {
  // The parent order's timestamp — order_items has no created_at of its own.
  created_at: string;
  // Group key: the menu id, or `manual:<name>` for an off-menu line.
  key: string;
  // Current menu name (so a later rename shows through), or the manual line's
  // typed name. order_items stores only menu_id + price for menu lines.
  name: string;
  quantity: number;
  // Snapshotted unit price (surcharge already included for พิเศษ lines).
  price: number;
};

export type MenuSalesRow = {
  key: string;
  name: string;
  quantity: number;
  revenue: number;
};

/** Per-menu quantity + revenue within the range, ranked by revenue (desc). */
export function summarizeByMenu(
  items: SalesItem[],
  range: Range,
): MenuSalesRow[] {
  const byMenu = new Map<string, MenuSalesRow>();
  for (const item of items) {
    const t = Date.parse(item.created_at);
    if (t < range.startMs || t > range.endMs) continue;

    const revenue = item.price * item.quantity;
    const existing = byMenu.get(item.key);
    if (existing) {
      existing.quantity += item.quantity;
      existing.revenue += revenue;
    } else {
      byMenu.set(item.key, {
        key: item.key,
        name: item.name,
        quantity: item.quantity,
        revenue,
      });
    }
  }
  return [...byMenu.values()]
    .map((row) => ({ ...row, revenue: round2(row.revenue) }))
    .sort((a, b) => b.revenue - a.revenue);
}

type Bucket = { label: string; startMs: number; endMs: number };

function makeBuckets(period: Period, nowMs: number): Bucket[] {
  const { year, month, day } = bkkParts(nowMs);

  switch (period) {
    case "day":
      return Array.from({ length: 24 }, (_, hour) => ({
        label: `${hour}:00`,
        startMs: bkkToAbs(year, month, day, hour),
        endMs: bkkToAbs(year, month, day, hour + 1),
      }));

    case "week":
      return Array.from({ length: 7 }, (_, i) => {
        const d = day - 6 + i;
        const weekday = new Date(Date.UTC(year, month, d)).getUTCDay();
        return {
          label: THAI_WEEKDAYS[weekday],
          startMs: bkkToAbs(year, month, d),
          endMs: bkkToAbs(year, month, d + 1),
        };
      });

    case "month": {
      const daysInMonth = new Date(
        Date.UTC(year, month + 1, 0),
      ).getUTCDate();
      return Array.from({ length: daysInMonth }, (_, i) => ({
        label: `${i + 1}`,
        startMs: bkkToAbs(year, month, i + 1),
        endMs: bkkToAbs(year, month, i + 2),
      }));
    }

    case "year":
      return Array.from({ length: 12 }, (_, i) => ({
        label: THAI_MONTHS[i],
        startMs: bkkToAbs(year, i, 1),
        endMs: bkkToAbs(year, i + 1, 1),
      }));
  }
}

/** Builds the time-bucketed series for the sales chart. */
export function buildChartSeries(
  orders: SalesOrder[],
  period: Period,
  nowMs: number,
): ChartPoint[] {
  const buckets = makeBuckets(period, nowMs);
  const series: ChartPoint[] = buckets.map((b) => ({
    label: b.label,
    total: 0,
  }));

  for (const order of orders) {
    const t = Date.parse(order.created_at);
    const idx = buckets.findIndex((b) => t >= b.startMs && t < b.endMs);
    if (idx !== -1) {
      series[idx].total += order.total;
    }
  }
  return series.map((point) => ({ ...point, total: round2(point.total) }));
}

export function chartTitle(period: Period): string {
  switch (period) {
    case "day":
      return "ยอดขายรายชั่วโมง — วันนี้";
    case "week":
      return "ยอดขายรายวัน — 7 วันล่าสุด";
    case "month":
      return "ยอดขายรายวัน — เดือนนี้";
    case "year":
      return "ยอดขายรายเดือน — ปีนี้";
  }
}
