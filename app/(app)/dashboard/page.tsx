import { DashboardView } from "@/components/dashboard-view";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  // One trailing year of data covers every dashboard period (day → year).
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const { data: orders, error } = await supabase
    .from("orders")
    .select("created_at, total")
    .eq("status", "completed")
    .gte("created_at", oneYearAgo.toISOString())
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">สรุปยอดขาย</p>
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          โหลดข้อมูลไม่สำเร็จ: {error.message}
        </p>
      ) : (
        <DashboardView orders={orders ?? []} />
      )}
    </div>
  );
}
