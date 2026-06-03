import Link from "next/link";

import type { OrderWithItems } from "@/components/order-history-view";
import { OrderHistoryView } from "@/components/order-history-view";
import { requirePermission } from "@/lib/rbac/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Hard safety cap on a single load. The default view is bounded by date range
// below; this stops "ทั้งหมด" from pulling an unbounded history into one page. (T37)
const MAX_ROWS = 200;

const RANGES = [
  { key: "today", label: "วันนี้", days: 1 },
  { key: "7d", label: "7 วัน", days: 7 },
  { key: "30d", label: "30 วัน", days: 30 },
  { key: "all", label: "ทั้งหมด", days: null },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];
const DEFAULT_RANGE: RangeKey = "7d";

const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** ISO timestamp for the start of the Bangkok day `days-1` days ago (UTC+7),
 *  so "วันนี้" / "7 วัน" buckets match the dashboard's wall-clock day. */
function sinceForDays(days: number): string {
  const shifted = new Date(Date.now() + BKK_OFFSET_MS);
  const startMs =
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate() - (days - 1),
    ) - BKK_OFFSET_MS;
  return new Date(startMs).toISOString();
}

export default async function OrderHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requirePermission(PERMISSIONS.ORDER_HISTORY_VIEW);

  const { range } = await searchParams;
  const active: RangeKey =
    RANGES.find((r) => r.key === range)?.key ?? DEFAULT_RANGE;
  const days = RANGES.find((r) => r.key === active)!.days;

  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      "*, order_items(id, quantity, price, is_special, custom_name, menus(name))",
    )
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  if (days !== null) {
    query = query.gte("created_at", sinceForDays(days));
  }
  const { data, error } = await query;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">ประวัติออเดอร์</h1>
        <p className="mt-1 text-sm text-secondary">
          เลือกช่วงเวลาเพื่อดูออเดอร์ย้อนหลัง
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={
              r.key === DEFAULT_RANGE
                ? "/order-history"
                : `/order-history?range=${r.key}`
            }
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-150",
              r.key === active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-secondary hover:border-primary/50 hover:text-primary",
            )}
          >
            {r.label}
          </Link>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-danger">
          โหลดข้อมูลไม่สำเร็จ: {error.message}
        </p>
      ) : (
        <OrderHistoryView orders={(data ?? []) as OrderWithItems[]} />
      )}
    </div>
  );
}
