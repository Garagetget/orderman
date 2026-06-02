import { DashboardView } from "@/components/dashboard-view";
import { createClient } from "@/lib/supabase/server";
import type { SalesItem } from "@/lib/sales";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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
    // filter and menus for the current name; group + bucket happens client-side
    // in lib/sales so it stays in sync with the cards' active period.
    supabase
      .from("order_items")
      .select(
        "quantity, price, menu_id, menus!inner(name), orders!inner(created_at, status)",
      )
      .eq("orders.status", "completed")
      .gte("orders.created_at", since),
  ]);

  const { data: orders, error } = ordersResult;
  const { data: itemRows, error: itemsError } = itemsResult;

  const items: SalesItem[] = (itemRows ?? []).map((row) => ({
    created_at: row.orders.created_at,
    menu_id: row.menu_id,
    name: row.menus.name,
    quantity: row.quantity,
    price: row.price,
  }));

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
