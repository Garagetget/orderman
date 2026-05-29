"use client";

import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Menu } from "@/lib/database.types";
import { formatBaht } from "@/lib/format";

export type CartLine = { menu: Menu; quantity: number };

type OrderCartProps = {
  lines: CartLine[];
  total: number;
  note: string;
  saving: boolean;
  onNoteChange: (note: string) => void;
  /** Pass quantity 0 (or less) to remove the line. */
  onChangeQuantity: (menuId: string, quantity: number) => void;
  onClear: () => void;
  onSave: () => void;
};

export function OrderCart({
  lines,
  total,
  note,
  saving,
  onNoteChange,
  onChangeQuantity,
  onClear,
  onSave,
}: OrderCartProps) {
  const isEmpty = lines.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>ออเดอร์ปัจจุบัน</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEmpty ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <ShoppingCart className="size-8 opacity-40" />
            <p className="text-center text-sm">ยังไม่มีรายการ — แตะเมนูเพื่อเพิ่ม</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {lines.map(({ menu, quantity }) => (
              <li key={menu.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{menu.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBaht(menu.price)}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-7"
                    onClick={() => onChangeQuantity(menu.id, quantity - 1)}
                    aria-label="ลดจำนวน"
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <span className="w-6 text-center text-sm tabular-nums">
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-7"
                    onClick={() => onChangeQuantity(menu.id, quantity + 1)}
                    aria-label="เพิ่มจำนวน"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>

                <span className="w-16 text-right text-sm font-medium tabular-nums">
                  {formatBaht(menu.price * quantity)}
                </span>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onChangeQuantity(menu.id, 0)}
                  aria-label="ลบรายการ"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="order-note">หมายเหตุ</Label>
          <Input
            id="order-note"
            value={note}
            placeholder="เช่น ไม่ใส่ผัก, เผ็ดน้อย"
            onChange={(event) => onNoteChange(event.target.value)}
          />
        </div>
      </CardContent>

      <CardFooter className="flex-col gap-3">
        <Separator />
        <div className="flex w-full items-center justify-between">
          <span className="text-sm text-muted-foreground">ยอดรวม</span>
          <span className="text-xl font-bold tabular-nums text-primary">
            {formatBaht(total)}
          </span>
        </div>
        <div className="flex w-full gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClear}
            disabled={isEmpty || saving}
          >
            ล้าง
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={onSave}
            disabled={isEmpty || saving}
          >
            {saving ? "กำลังบันทึก..." : "บันทึกออเดอร์"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
