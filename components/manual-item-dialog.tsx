"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** "เพิ่มรายการเอง" — add an off-menu line by typing a name + price (T17). */
export function ManualItemDialog({
  onAdd,
}: {
  onAdd: (name: string, price: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setPrice("");
    setError(null);
  }

  function handleSubmit() {
    const trimmed = name.trim();
    const value = Number(price);
    if (!trimmed) {
      setError("กรุณากรอกชื่อรายการ");
      return;
    }
    if (!Number.isFinite(value) || value < 0) {
      setError("ราคาต้องเป็นตัวเลขไม่ติดลบ");
      return;
    }
    onAdd(trimmed, value);
    reset();
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm font-medium text-secondary transition-all duration-150 hover:border-border-hover hover:text-primary"
          />
        }
      >
        <Plus className="size-4" />
        เพิ่มรายการเอง
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">เพิ่มรายการนอกเมนู</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="manual-name">ชื่อรายการ</Label>
            <Input
              id="manual-name"
              value={name}
              placeholder="เช่น เมนูพิเศษ, ของฝาก"
              autoFocus
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="manual-price">ราคาต่อหน่วย (บาท)</Label>
            <Input
              id="manual-price"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={price}
              placeholder="0"
              onChange={(event) => setPrice(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSubmit();
              }}
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <DialogFooter className="mx-0 mb-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit}>เพิ่มลงออเดอร์</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
