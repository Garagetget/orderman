"use client";

import { formatBaht } from "@/lib/format";
import { PERIODS, type Period } from "@/lib/sales";
import { cn } from "@/lib/utils";

type SalesCardsProps = {
  totals: Record<Period, number>;
  active: Period;
  onSelect: (period: Period) => void;
};

/** The four headline totals — also act as the chart's period switcher. */
export function SalesCards({ totals, active, onSelect }: SalesCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {PERIODS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          aria-pressed={active === value}
          className={cn(
            "rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent",
            active === value && "border-primary ring-2 ring-primary/20",
          )}
        >
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {formatBaht(totals[value])}
          </p>
        </button>
      ))}
    </div>
  );
}
