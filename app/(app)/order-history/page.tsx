import type { OrderWithItems } from "@/components/order-history-view";
import { OrderHistoryView } from "@/components/order-history-view";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OrderHistoryPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(id, quantity, price, is_special, menus(name))")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">ประวัติออเดอร์</h1>
        <p className="text-sm text-muted-foreground">รายการออเดอร์ทั้งหมด</p>
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          โหลดข้อมูลไม่สำเร็จ: {error.message}
        </p>
      ) : (
        <OrderHistoryView orders={(data ?? []) as OrderWithItems[]} />
      )}
    </div>
  );
}
