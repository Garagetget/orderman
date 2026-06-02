"use client";

import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

import { ManualItemDialog } from "@/components/manual-item-dialog";
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

export type MenuCartLine = {
  kind: "menu";
  menu: Menu;
  quantity: number;
  isSpecial: boolean;
};

/** An off-menu line typed in by staff (T17): its own name + price. */
export type ManualCartLine = {
  kind: "manual";
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type CartLine = MenuCartLine | ManualCartLine;

/** Stable key per cart line; separates the ธรรมดา and พิเศษ menu variants. */
export function cartLineId(
  line:
    | Pick<MenuCartLine, "kind" | "menu" | "isSpecial">
    | Pick<ManualCartLine, "kind" | "id">,
) {
  if (line.kind === "manual") return `manual:${line.id}`;
  return line.isSpecial ? `${line.menu.id}:special` : line.menu.id;
}

/** Charged price per unit, surcharge included for the พิเศษ variant. */
export function cartLineUnitPrice(
  line:
    | Pick<MenuCartLine, "kind" | "menu" | "isSpecial">
    | Pick<ManualCartLine, "kind" | "price">,
) {
  if (line.kind === "manual") return line.price;
  return (
    line.menu.price + (line.isSpecial ? (line.menu.special_surcharge ?? 0) : 0)
  );
}

type OrderCartProps = {
  lines: CartLine[];
  total: number;
  note: string;
  saving: boolean;
  onNoteChange: (note: string) => void;
  /** Pass quantity 0 (or less) to remove the line. */
  onChangeQuantity: (lineId: string, quantity: number) => void;
  onAddManual: (name: string, price: number) => void;
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
  onAddManual,
  onClear,
  onSave,
}: OrderCartProps) {
  const isEmpty = lines.length === 0;

  return (
    <Card className="rounded-xl border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">ออเดอร์ปัจจุบัน</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEmpty ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <ShoppingCart className="size-12 text-secondary opacity-50" />
            <p className="text-sm text-secondary">ยังไม่มีรายการ — แตะเมนูเพื่อเพิ่ม</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {lines.map((line) => {
              const lineId = cartLineId(line);
              const unitPrice = cartLineUnitPrice(line);
              const { quantity } = line;
              const name = line.kind === "manual" ? line.name : line.menu.name;

              return (
                <li key={lineId} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {name}
                      {line.kind === "menu" && line.isSpecial && (
                        <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          พิเศษ
                        </span>
                      )}
                      {line.kind === "manual" && (
                        <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-light text-secondary">
                          นอกเมนู
                        </span>
                      )}
                    </p>
                    <p className="text-xs tabular-nums text-secondary">
                      {formatBaht(unitPrice)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-7"
                      onClick={() => onChangeQuantity(lineId, quantity - 1)}
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
                      onClick={() => onChangeQuantity(lineId, quantity + 1)}
                      aria-label="เพิ่มจำนวน"
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>

                  <span className="w-16 text-right text-sm font-medium tabular-nums">
                    {formatBaht(unitPrice * quantity)}
                  </span>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7 text-secondary hover:text-danger"
                    onClick={() => onChangeQuantity(lineId, 0)}
                    aria-label="ลบรายการ"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <ManualItemDialog onAdd={onAddManual} />

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
          <span className="text-sm text-secondary">ยอดรวม</span>
          <span className="text-2xl font-bold tabular-nums text-primary">
            {formatBaht(total)}
          </span>
        </div>
        <div className="flex w-full gap-2">
          <button
            type="button"
            className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium transition-all duration-150 hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            onClick={onClear}
            disabled={isEmpty || saving}
          >
            ล้าง
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-50"
            onClick={onSave}
            disabled={isEmpty || saving}
          >
            {saving ? "กำลังบันทึก..." : "บันทึกออเดอร์"}
          </button>
        </div>
      </CardFooter>
    </Card>
  );
}
