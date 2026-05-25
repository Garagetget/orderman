"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
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

export function SalesChart({ data, title }: SalesChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
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
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickFormatter={(value: number) =>
                  value >= 1000 ? `${value / 1000}k` : `${value}`
                }
              />
              <Tooltip
                cursor={{ fill: "var(--accent)" }}
                formatter={(value) => [formatBaht(Number(value)), "ยอดขาย"]}
                contentStyle={{
                  borderRadius: "0.5rem",
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  fontSize: "0.8125rem",
                }}
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
