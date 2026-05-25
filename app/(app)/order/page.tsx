import { OrderTaker } from "@/components/order-taker";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OrderPage() {
  const supabase = await createClient();
  const { data: menus, error } = await supabase
    .from("menus")
    .select("*")
    .eq("is_available", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">จดออเดอร์</h1>
        <p className="text-sm text-muted-foreground">
          แตะเมนูเพื่อเพิ่มลงออเดอร์ แล้วกดบันทึก
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          โหลดเมนูไม่สำเร็จ: {error.message}
        </p>
      ) : (
        <OrderTaker menus={menus ?? []} />
      )}
    </div>
  );
}
