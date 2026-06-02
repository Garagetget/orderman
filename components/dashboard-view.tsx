"use client";

import { BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";

import { MenuSalesTable } from "@/components/menu-sales-table";
import { SalesCards } from "@/components/sales-cards";
import { SalesChart } from "@/components/sales-chart";
import {
  buildChartSeries,
  chartTitle,
  getPeriodRange,
  PERIODS,
  summarize,
  summarizeByMenu,
  type Period,
  type SalesItem,
  type SalesOrder,
} from "@/lib/sales";

export function DashboardView({
  orders,
  items,
}: {
  orders: SalesOrder[];
  items: SalesItem[];
}) {
  const [period, setPeriod] = useState<Period>("day");
  // Resolved once on first render. The Bangkok-fixed date math in lib/sales
  // makes the result identical whether that render is server or client, so
  // there is no hydration mismatch despite "now" differing by a few ms.
  const [nowMs] = useState(() => Date.now());

  const totals = useMemo(() => summarize(orders, nowMs), [orders, nowMs]);
  const series = useMemo(
    () => buildChartSeries(orders, period, nowMs),
    [orders, period, nowMs],
  );
  const menuRows = useMemo(
    () => summarizeByMenu(items, getPeriodRange(period, nowMs)),
    [items, period, nowMs],
  );
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? "";

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-12 text-center shadow-sm">
        <BarChart3 className="h-12 w-12 text-secondary opacity-50" />
        <p className="mt-4 text-sm text-secondary">
          ยังไม่มีข้อมูลยอดขาย — เริ่มจดออเดอร์เพื่อดูสรุปยอดขายที่นี่
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SalesCards totals={totals} active={period} onSelect={setPeriod} />
      <SalesChart data={series} title={chartTitle(period)} />
      <MenuSalesTable rows={menuRows} title={`ยอดขายรายเมนู — ${periodLabel}`} />
    </div>
  );
}
