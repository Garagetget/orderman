import type { OrderWithItems } from "@/components/order-history-view";
import { formatBaht } from "@/lib/format";

// No shop profile is stored yet — use the app brand as the receipt header.
// Swap this for a configurable name if the owner later wants one.
const SHOP_NAME = "orderman";

function formatBangkokDateTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "short",
    timeStyle: "short",
  });
}

/**
 * Print-only receipt for one order (T15). Hidden on screen via the
 * `.receipt-print` rule in globals.css; `window.print()` reveals just this
 * block and hides the rest of the app.
 */
export function ReceiptPrint({ order }: { order: OrderWithItems }) {
  const isCancelled = order.status === "cancelled";

  return (
    <div className="receipt-print mx-auto max-w-xs p-4 text-sm text-black">
      <div className="text-center">
        <p className="text-lg font-bold">{SHOP_NAME}</p>
        <p className="text-sm">ใบเสร็จรับเงิน</p>
        {isCancelled && (
          <p className="mt-1 text-sm font-semibold">** ออเดอร์ถูกยกเลิก **</p>
        )}
      </div>

      <div className="my-2 border-t border-dashed border-black" />

      <div className="flex justify-between text-xs">
        <span>เลขที่ #{order.id.slice(0, 8)}</span>
        <span>{formatBangkokDateTime(order.created_at)}</span>
      </div>

      <div className="my-2 border-t border-dashed border-black" />

      <table className="w-full">
        <thead>
          <tr className="text-left text-xs">
            <th className="pb-1 font-medium">รายการ</th>
            <th className="pb-1 text-right font-medium">จำนวน</th>
            <th className="pb-1 text-right font-medium">รวม</th>
          </tr>
        </thead>
        <tbody>
          {order.order_items.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="py-0.5">
                {item.menus?.name ?? item.custom_name ?? "—"}
                {item.is_special && " (พิเศษ)"}
                {!item.menus && item.custom_name && " (นอกเมนู)"}
                <span className="block text-xs">
                  @ {formatBaht(item.price)}
                </span>
              </td>
              <td className="py-0.5 text-right tabular-nums">
                {item.quantity}
              </td>
              <td className="py-0.5 text-right tabular-nums">
                {formatBaht(item.price * item.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="my-2 border-t border-dashed border-black" />

      <div className="flex justify-between text-base font-bold">
        <span>รวมทั้งสิ้น</span>
        <span className="tabular-nums">{formatBaht(order.total)}</span>
      </div>

      {order.note && <p className="mt-2 text-xs">หมายเหตุ: {order.note}</p>}

      <p className="mt-4 text-center text-xs">ขอบคุณที่ใช้บริการ</p>
    </div>
  );
}
