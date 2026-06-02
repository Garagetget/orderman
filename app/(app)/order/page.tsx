import { OrderTaker } from "@/components/order-taker";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OrderPage() {
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
  const { data: menus, error } = menusRes;
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
