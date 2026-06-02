import type { OrderWithItems } from "@/components/order-history-view";
import { OrderHistoryView } from "@/components/order-history-view";
import { requirePermission } from "@/lib/rbac/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OrderHistoryPage() {
  await requirePermission(PERMISSIONS.ORDER_HISTORY_VIEW);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "*, order_items(id, quantity, price, is_special, custom_name, menus(name))",
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">ประวัติออเดอร์</h1>
        <p className="mt-1 text-sm text-secondary">รายการออเดอร์ทั้งหมด</p>
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
