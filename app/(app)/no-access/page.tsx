import { ShieldX } from "lucide-react";

import { signOut } from "@/app/auth/actions";

// Landing for an authenticated user who holds no permission for the page they
// hit. Reachable by everyone signed-in (no RBAC gate in ROUTE_PERMISSIONS), so
// it breaks the /order→/order redirect loop a permission-less user would
// otherwise fall into, and gives them a working way out (sign out). (T35)
export default function NoAccessPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <ShieldX className="size-12 text-secondary opacity-50" />
      <h1 className="mt-4 text-2xl font-semibold">ไม่มีสิทธิ์เข้าใช้งาน</h1>
      <p className="mt-1 max-w-sm text-sm text-secondary">
        บัญชีนี้ยังไม่ได้รับสิทธิ์ในระบบ — กรุณาติดต่อเจ้าของร้านเพื่อกำหนดบทบาท
      </p>
      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-6 text-sm font-medium transition-all duration-150 hover:bg-muted"
        >
          ออกจากระบบ
        </button>
      </form>
    </div>
  );
}
