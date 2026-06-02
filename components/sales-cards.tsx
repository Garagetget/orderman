"use client";

import { CalendarDays, CalendarRange, CalendarClock, CalendarCheck } from "lucide-react";
import type { ComponentType } from "react";

import { formatBaht } from "@/lib/format";
import { PERIODS, type Period } from "@/lib/sales";
import { cn } from "@/lib/utils";

type SalesCardsProps = {
  totals: Record<Period, number>;
  active: Period;
  onSelect: (period: Period) => void;
};

const PERIOD_ICON: Record<Period, ComponentType<{ className?: string }>> = {
  day: CalendarDays,
  week: CalendarRange,
  month: CalendarClock,
  year: CalendarCheck,
};

/** The four headline totals — also act as the chart's period switcher. */
export function SalesCards({ totals, active, onSelect }: SalesCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {PERIODS.map(({ value, label }) => {
        const Icon = PERIOD_ICON[value];
        const isActive = active === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            aria-pressed={isActive}
            className={cn(
              "rounded-xl border border-border bg-surface p-5 text-left shadow-sm transition-all duration-150 hover:border-border-hover",
              isActive && "border-primary bg-primary/5",
            )}
          >
            <p className="flex items-center gap-1.5 text-xs font-light uppercase tracking-wide text-secondary">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {formatBaht(totals[value])}
            </p>
          </button>
        );
      })}
    </div>
  );
}
