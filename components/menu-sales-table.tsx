"use client";

import { UtensilsCrossed } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBaht } from "@/lib/format";
import type { MenuSalesRow } from "@/lib/sales";

/** Ranked per-menu quantity + revenue for the dashboard's active period. */
export function MenuSalesTable({
  rows,
  title,
}: {
  rows: MenuSalesRow[];
  title: string;
}) {
  return (
    <Card className="rounded-xl border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>

      <CardContent>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <UtensilsCrossed className="h-12 w-12 text-secondary opacity-50" />
            <p className="mt-4 text-sm text-secondary">
              ยังไม่มียอดขายในช่วงเวลานี้
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            <li className="flex items-center gap-3 pb-2 text-xs font-light uppercase tracking-wide text-secondary">
              <span className="w-6">#</span>
              <span className="flex-1">เมนู</span>
              <span className="w-16 text-right">จำนวน</span>
              <span className="w-24 text-right">ยอดขาย</span>
            </li>
            {rows.map((row, index) => (
              <li
                key={row.menu_id}
                className="flex items-center gap-3 py-3 text-sm"
              >
                <span className="w-6 tabular-nums text-secondary">
                  {index + 1}
                </span>
                <span className="flex-1 truncate font-medium">{row.name}</span>
                <span className="w-16 text-right tabular-nums text-secondary">
                  {row.quantity.toLocaleString("th-TH")}
                </span>
                <span className="w-24 text-right font-medium tabular-nums">
                  {formatBaht(row.revenue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
