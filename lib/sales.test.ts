import { describe, expect, it } from "vitest";

import {
  buildChartSeries,
  getPeriodRange,
  summarize,
  summarizeByMenu,
  sumSales,
  type SalesItem,
  type SalesOrder,
} from "./sales";

const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Absolute ms for a Bangkok wall-clock moment (mirrors lib/sales internals). */
function bkk(
  y: number,
  m: number,
  d: number,
  h = 0,
  min = 0,
): number {
  return Date.UTC(y, m, d, h, min) - BKK_OFFSET_MS;
}

/** An order at a Bangkok wall-clock moment with the given total. */
function order(total: number, ms: number): SalesOrder {
  return { created_at: new Date(ms).toISOString(), total };
}

// Anchor every period/range test on a fixed instant: 2026-06-15 14:30 Bangkok.
const NOW = bkk(2026, 5, 15, 14, 30);

describe("getPeriodRange (Bangkok wall-clock)", () => {
  it("day starts at Bangkok midnight and ends at now", () => {
    expect(getPeriodRange("day", NOW)).toEqual({
      startMs: bkk(2026, 5, 15, 0),
      endMs: NOW,
    });
  });

  it("week spans today + previous 6 Bangkok days", () => {
    expect(getPeriodRange("week", NOW).startMs).toBe(bkk(2026, 5, 9, 0));
  });

  it("month starts on the 1st in Bangkok time", () => {
    expect(getPeriodRange("month", NOW).startMs).toBe(bkk(2026, 5, 1, 0));
  });

  it("year starts on Jan 1 in Bangkok time", () => {
    expect(getPeriodRange("year", NOW).startMs).toBe(bkk(2026, 0, 1, 0));
  });

  it("week reaches into the previous month when near month start", () => {
    const earlyJune = bkk(2026, 5, 3, 12); // June 3 → week back to May 28
    expect(getPeriodRange("week", earlyJune).startMs).toBe(bkk(2026, 4, 28, 0));
  });
});

describe("sumSales — UTC+7 day boundary", () => {
  it("counts an order just after Bangkok midnight but excludes one just before", () => {
    const range = getPeriodRange("day", NOW);
    const orders = [
      order(100, bkk(2026, 5, 15, 0, 30)), // 00:30 today (BKK) → in
      order(999, bkk(2026, 5, 14, 23, 30)), // 23:30 yesterday (BKK) → out
    ];
    // A naive UTC bucketing would mis-place these; the +7h offset is what keeps
    // them on the correct Bangkok day.
    expect(sumSales(orders, range)).toBe(100);
  });

  it("is inclusive of both range ends", () => {
    const range = { startMs: 1000, endMs: 2000 };
    const orders = [
      order(1, 1000),
      order(2, 2000),
      order(4, 1500),
      order(8, 2001),
    ];
    expect(sumSales(orders, range)).toBe(7);
  });
});

describe("summarize", () => {
  it("returns all four period totals", () => {
    const orders = [
      order(100, bkk(2026, 5, 15, 9)), // today
      order(50, bkk(2026, 5, 11, 9)), // this week + month + year
      order(30, bkk(2026, 5, 2, 9)), // this month + year
      order(20, bkk(2026, 0, 9, 9)), // this year only
    ];
    expect(summarize(orders, NOW)).toEqual({
      day: 100,
      week: 150,
      month: 180,
      year: 200,
    });
  });
});

describe("summarizeByMenu", () => {
  const range = getPeriodRange("day", NOW);
  const o = (day: number, hour: number) =>
    new Date(bkk(2026, 5, day, hour)).toISOString();
  const items: SalesItem[] = [
    { created_at: o(15, 9), key: "m1", name: "ผัดไทย", quantity: 2, price: 60 },
    { created_at: o(15, 10), key: "m1", name: "ผัดไทย", quantity: 1, price: 60 },
    { created_at: o(15, 11), key: "m2", name: "ชาเย็น", quantity: 5, price: 30 },
    {
      created_at: o(15, 12),
      key: "manual:ขนม",
      name: "ขนม",
      quantity: 1,
      price: 25,
    },
    // Out of today's range → must be ignored.
    { created_at: o(14, 12), key: "m1", name: "ผัดไทย", quantity: 9, price: 60 },
  ];

  it("groups by key and sums quantity + revenue", () => {
    const rows = summarizeByMenu(items, range);
    const m1 = rows.find((r) => r.key === "m1")!;
    expect(m1.quantity).toBe(3); // 2 + 1, the day-14 row excluded
    expect(m1.revenue).toBe(180);
  });

  it("ranks by revenue descending", () => {
    const rows = summarizeByMenu(items, range);
    expect(rows.map((r) => r.key)).toEqual(["m1", "m2", "manual:ขนม"]);
    // 180, 150, 25
    expect(rows.map((r) => r.revenue)).toEqual([180, 150, 25]);
  });

  it("keeps manual lines as their own group", () => {
    const rows = summarizeByMenu(items, range);
    expect(rows.find((r) => r.key === "manual:ขนม")?.name).toBe("ขนม");
  });
});

describe("buildChartSeries", () => {
  it("day → 24 hourly buckets placing an order in the right hour", () => {
    const series = buildChartSeries(
      [
        order(100, bkk(2026, 5, 15, 14)), // 14:00 → bucket 14
        order(50, bkk(2026, 5, 15, 15)), // 15:00 → next bucket (end-exclusive)
      ],
      "day",
      NOW,
    );
    expect(series).toHaveLength(24);
    expect(series[14]).toEqual({ label: "14:00", total: 100 });
    expect(series[15].total).toBe(50);
  });

  it("week → 7 daily buckets", () => {
    expect(buildChartSeries([], "week", NOW)).toHaveLength(7);
  });

  it("month → one bucket per day of that month", () => {
    expect(buildChartSeries([], "month", NOW)).toHaveLength(30); // June
    expect(buildChartSeries([], "month", bkk(2026, 1, 15)).length).toBe(28); // Feb 2026
    expect(buildChartSeries([], "month", bkk(2024, 1, 15)).length).toBe(29); // Feb 2024 (leap)
  });

  it("year → 12 month buckets with Thai labels", () => {
    const series = buildChartSeries([], "year", NOW);
    expect(series).toHaveLength(12);
    expect(series[0].label).toBe("ม.ค.");
    expect(series[11].label).toBe("ธ.ค.");
  });
});
