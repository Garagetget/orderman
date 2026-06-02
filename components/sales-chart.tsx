"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBaht } from "@/lib/format";
import type { ChartPoint } from "@/lib/sales";

type SalesChartProps = {
  data: ChartPoint[];
  title: string;
};

/** DESIGN.md tooltip — bg-surface border shadow-md rounded-lg p-3. */
function ChartTooltip({
  active,
  payload,
  label,
}: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0].value ?? 0);
  return (
    <div className="rounded-lg border border-border bg-surface p-3 shadow-md">
      <p className="text-xs text-secondary">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">
        {formatBaht(value)}
      </p>
    </div>
  );
}

export function SalesChart({ data, title }: SalesChartProps) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
                tickFormatter={(value: number) =>
                  value >= 1000 ? `${value / 1000}k` : `${value}`
                }
              />
              <Tooltip
                cursor={{ fill: "var(--primary)", fillOpacity: 0.08 }}
                content={<ChartTooltip />}
              />
              <Bar
                dataKey="total"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
