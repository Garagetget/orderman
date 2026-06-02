import { OrderTaker } from "@/components/order-taker";
import { requirePermission } from "@/lib/rbac/guards";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OrderPage() {
  await requirePermission(PERMISSIONS.ORDER_CREATE);

  const supabase = await createClient();
  const [menusRes, categoriesRes] = await Promise.all([
    supabase
      .from("menus")
      .select("*")
      .eq("is_available", true)
      .order("name", { ascending: true }),
    supabase
      .from("categories")
      .select("name")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);
  // Surface either query's error — a failed categories load leaves categoryOrder
  // empty, which silently hides every menu (the grid only renders known categories).
  const error = menusRes.error ?? categoriesRes.error;
  const menus = menusRes.data;
  const categoryOrder = (categoriesRes.data ?? []).map((c) => c.name);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">จดออเดอร์</h1>
        <p className="mt-1 text-sm text-secondary">
          แตะเมนูเพื่อเพิ่มลงออเดอร์ แล้วกดบันทึก
        </p>
      </div>

      {error ? (
        <p className="text-sm text-danger">
          โหลดเมนูไม่สำเร็จ: {error.message}
        </p>
      ) : (
        <OrderTaker menus={menus ?? []} categoryOrder={categoryOrder} />
      )}
    </div>
  );
}
