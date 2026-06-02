import { DashboardView } from "@/components/dashboard-view";
import { requireOwner } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";
import type { SalesItem } from "@/lib/sales";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireOwner();

  const supabase = await createClient();

  // One trailing year of data covers every dashboard period (day → year).
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const since = oneYearAgo.toISOString();

  const [ordersResult, itemsResult] = await Promise.all([
    supabase
      .from("orders")
      .select("created_at, total")
      .eq("status", "completed")
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
    // Per-menu breakdown (T14). Inner-join orders for the same status/time
    // filter; left-join menus (manual lines have no menu_id). Grouping +
    // bucketing happens client-side in lib/sales, in sync with the cards' period.
    supabase
      .from("order_items")
      .select(
        "quantity, price, menu_id, custom_name, menus(name), orders!inner(created_at, status)",
      )
      .eq("orders.status", "completed")
      .gte("orders.created_at", since),
  ]);

  const { data: orders, error } = ordersResult;
  const { data: itemRows, error: itemsError } = itemsResult;

  const items: SalesItem[] = (itemRows ?? []).map((row) => {
    const isManual = row.menu_id === null;
    return {
      created_at: row.orders.created_at,
      key: isManual ? `manual:${row.custom_name}` : row.menu_id!,
      name: isManual
        ? (row.custom_name ?? "รายการอื่น")
        : (row.menus?.name ?? "—"),
      quantity: row.quantity,
      price: row.price,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">สรุปยอดขาย</h1>
        <p className="mt-1 text-sm text-secondary">
          ยอดขายรวมตามช่วงเวลา (นับเฉพาะออเดอร์ที่สำเร็จ)
        </p>
      </div>

      {error || itemsError ? (
        <p className="text-sm text-danger">
          โหลดข้อมูลไม่สำเร็จ: {(error ?? itemsError)?.message}
        </p>
      ) : (
        <DashboardView orders={orders ?? []} items={items} />
      )}
    </div>
  );
}
