"use client";

import { useMemo, useState } from "react";

import { SalesCards } from "@/components/sales-cards";
import { SalesChart } from "@/components/sales-chart";
import {
  buildChartSeries,
  chartTitle,
  summarize,
  type Period,
  type SalesOrder,
} from "@/lib/sales";

export function DashboardView({ orders }: { orders: SalesOrder[] }) {
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

  return (
    <div className="space-y-5">
      <SalesCards totals={totals} active={period} onSelect={setPeriod} />
      <SalesChart data={series} title={chartTitle(period)} />
    </div>
  );
}
