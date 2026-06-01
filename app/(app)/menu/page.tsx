import { MenuManager } from "@/components/menu-manager";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const supabase = await createClient();
  // Unlike the order page, show ALL menus here (including disabled ones) so the
  // owner can re-enable them.
  const { data: menus, error } = await supabase
    .from("menus")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">จัดการเมนู</h1>
        <p className="text-sm text-muted-foreground">
          เพิ่ม แก้ไข หรือปิด/เปิดเมนู — เมนูที่ปิดจะไม่แสดงในหน้าจดออเดอร์
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          โหลดเมนูไม่สำเร็จ: {error.message}
        </p>
      ) : (
        <MenuManager menus={menus ?? []} />
      )}
    </div>
  );
}
