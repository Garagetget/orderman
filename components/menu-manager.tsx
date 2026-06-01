"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  createMenu,
  setMenuAvailability,
  updateMenu,
  type MenuInput,
} from "@/app/(app)/menu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Menu, MenuCategory } from "@/lib/database.types";
import { formatBaht } from "@/lib/format";
import { cn } from "@/lib/utils";

// Same display order as the order page menu-grid.
const CATEGORIES: MenuCategory[] = ["อาหาร", "ของเพิ่ม", "เครื่องดื่ม"];

type Draft = {
  name: string;
  price: string;
  category: MenuCategory;
  hasSpecial: boolean;
  surcharge: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  price: "",
  category: "อาหาร",
  hasSpecial: false,
  surcharge: "",
};

function toDraft(menu: Menu): Draft {
  const hasSpecial = menu.special_surcharge != null;
  return {
    name: menu.name,
    price: String(menu.price),
    category: menu.category,
    hasSpecial,
    surcharge: hasSpecial ? String(menu.special_surcharge) : "",
  };
}

function parseDraft(draft: Draft): MenuInput | { error: string } {
  const name = draft.name.trim();
  if (!name) return { error: "กรุณากรอกชื่อเมนู" };

  const price = Number(draft.price);
  if (!Number.isFinite(price) || price < 0) return { error: "ราคาไม่ถูกต้อง" };

  let special_surcharge: number | null = null;
  if (draft.hasSpecial) {
    const surcharge = Number(draft.surcharge);
    if (!Number.isFinite(surcharge) || surcharge <= 0) {
      return { error: "ราคาส่วนพิเศษต้องมากกว่า 0" };
    }
    special_surcharge = surcharge;
  }

  return { name, price, category: draft.category, special_surcharge };
}

function MenuForm({
  draft,
  onChange,
  onSubmit,
  onCancel,
  pending,
  submitLabel,
}: {
  draft: Draft;
  onChange: (next: Draft) => void;
  onSubmit: () => void;
  onCancel: () => void;
  pending: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="menu-name">ชื่อเมนู</Label>
          <Input
            id="menu-name"
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            placeholder="เช่น ข้าวผัด"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="menu-price">ราคา (บาท)</Label>
          <Input
            id="menu-price"
            inputMode="decimal"
            value={draft.price}
            onChange={(e) => onChange({ ...draft, price: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>หมวดหมู่</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              type="button"
              size="sm"
              variant={draft.category === cat ? "default" : "outline"}
              onClick={() => onChange({ ...draft, category: cat })}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.hasSpecial}
            onChange={(e) => onChange({ ...draft, hasSpecial: e.target.checked })}
            className="size-4 accent-primary"
          />
          มีตัวเลือก &quot;พิเศษ&quot; (คิดราคาส่วนเพิ่ม)
        </label>
        {draft.hasSpecial && (
          <div className="space-y-1.5">
            <Label htmlFor="menu-surcharge">ส่วนเพิ่มพิเศษ (บาท)</Label>
            <Input
              id="menu-surcharge"
              inputMode="decimal"
              value={draft.surcharge}
              onChange={(e) => onChange({ ...draft, surcharge: e.target.value })}
              placeholder="เช่น 10"
              className="sm:max-w-[200px]"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={onCancel}
        >
          ยกเลิก
        </Button>
        <Button type="button" size="sm" disabled={pending} onClick={onSubmit}>
          {pending ? "กำลังบันทึก..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}

export function MenuManager({ menus }: { menus: Menu[] }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [pending, startTransition] = useTransition();

  function openAdd() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setAdding(true);
  }

  function openEdit(menu: Menu) {
    setAdding(false);
    setDraft(toDraft(menu));
    setEditingId(menu.id);
  }

  function close() {
    setAdding(false);
    setEditingId(null);
  }

  function submitAdd() {
    const parsed = parseDraft(draft);
    if ("error" in parsed) {
      toast.error(parsed.error);
      return;
    }
    startTransition(async () => {
      const res = await createMenu(parsed);
      if (res.ok) {
        toast.success("เพิ่มเมนูเรียบร้อย");
        close();
      } else {
        toast.error(res.error);
      }
    });
  }

  function submitEdit(id: string) {
    const parsed = parseDraft(draft);
    if ("error" in parsed) {
      toast.error(parsed.error);
      return;
    }
    startTransition(async () => {
      const res = await updateMenu(id, parsed);
      if (res.ok) {
        toast.success("บันทึกเมนูเรียบร้อย");
        close();
      } else {
        toast.error(res.error);
      }
    });
  }

  function toggleAvailability(menu: Menu) {
    startTransition(async () => {
      const res = await setMenuAvailability(menu.id, !menu.is_available);
      if (res.ok) {
        toast.success(menu.is_available ? "ปิดเมนูแล้ว" : "เปิดเมนูแล้ว");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-5">
      {adding ? (
        <MenuForm
          draft={draft}
          onChange={setDraft}
          onSubmit={submitAdd}
          onCancel={close}
          pending={pending}
          submitLabel="เพิ่มเมนู"
        />
      ) : (
        <Button type="button" onClick={openAdd}>
          <Plus className="size-4" />
          เพิ่มเมนูใหม่
        </Button>
      )}

      {CATEGORIES.map((category) => {
        const items = menus.filter((m) => m.category === category);
        if (items.length === 0) return null;

        return (
          <section key={category} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-4 w-0.5 rounded-full bg-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold">{category}</h2>
            </div>
            <div className="space-y-2">
              {items.map((menu) =>
                editingId === menu.id ? (
                  <MenuForm
                    key={menu.id}
                    draft={draft}
                    onChange={setDraft}
                    onSubmit={() => submitEdit(menu.id)}
                    onCancel={close}
                    pending={pending}
                    submitLabel="บันทึก"
                  />
                ) : (
                  <div
                    key={menu.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border bg-card px-4 py-3",
                      !menu.is_available && "opacity-60",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{menu.name}</span>
                        {!menu.is_available && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            ปิดอยู่
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatBaht(menu.price)}
                        {menu.special_surcharge != null && (
                          <> · พิเศษ +{formatBaht(menu.special_surcharge)}</>
                        )}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => openEdit(menu)}
                    >
                      <Pencil className="size-3.5" />
                      แก้ไข
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={menu.is_available ? "ghost" : "secondary"}
                      disabled={pending}
                      onClick={() => toggleAvailability(menu)}
                    >
                      {menu.is_available ? "ปิด" : "เปิด"}
                    </Button>
                  </div>
                ),
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
