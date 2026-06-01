"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  createCategory,
  createMenu,
  deleteCategory,
  renameCategory,
  setMenuAvailability,
  updateMenu,
  type MenuInput,
} from "@/app/(app)/menu/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { Category, Menu } from "@/lib/database.types";
import { formatBaht } from "@/lib/format";
import { cn } from "@/lib/utils";

type Draft = {
  name: string;
  price: string;
  category: string;
  hasSpecial: boolean;
  surcharge: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  price: "",
  category: "",
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
  if (!draft.category) return { error: "กรุณาเลือกหมวดหมู่" };

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
  categories,
  onChange,
  onSubmit,
  onCancel,
  pending,
  submitLabel,
}: {
  draft: Draft;
  categories: Category[];
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
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            ยังไม่มีหมวดหมู่ — เพิ่มหมวดหมู่ด้านล่างก่อน
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Button
                key={cat.name}
                type="button"
                size="sm"
                variant={draft.category === cat.name ? "default" : "outline"}
                onClick={() => onChange({ ...draft, category: cat.name })}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        )}
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

function CategoryManager({ categories }: { categories: Category[] }) {
  const [adding, setAdding] = useState("");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitAdd() {
    const name = adding.trim();
    if (!name) return;
    startTransition(async () => {
      const res = await createCategory(name);
      if (res.ok) {
        toast.success("เพิ่มหมวดหมู่เรียบร้อย");
        setAdding("");
      } else {
        toast.error(res.error);
      }
    });
  }

  function submitRename(oldName: string) {
    const next = editValue.trim();
    if (!next || next === oldName) {
      setEditingName(null);
      return;
    }
    startTransition(async () => {
      const res = await renameCategory(oldName, next);
      if (res.ok) {
        toast.success("แก้ไขหมวดหมู่เรียบร้อย");
        setEditingName(null);
      } else {
        toast.error(res.error);
      }
    });
  }

  function submitDelete(name: string) {
    startTransition(async () => {
      const res = await deleteCategory(name);
      if (res.ok) {
        toast.success("ลบหมวดหมู่เรียบร้อย");
        setConfirmDelete(null);
      } else {
        toast.error(res.error);
        setConfirmDelete(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        หมวดหมู่ใช้จัดกลุ่มเมนู — แก้ชื่อแล้วเมนูในหมวดนั้นจะเปลี่ยนตาม ลบได้เฉพาะหมวดที่ไม่มีเมนูอยู่
      </p>

      <div className="space-y-2">
        {categories.map((cat) =>
          editingName === cat.name ? (
            <div key={cat.name} className="flex items-center gap-2">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-8 max-w-[220px]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitRename(cat.name);
                  if (e.key === "Escape") setEditingName(null);
                }}
              />
              <Button
                type="button"
                size="icon"
                className="size-8"
                disabled={pending}
                onClick={() => submitRename(cat.name)}
                aria-label="บันทึก"
              >
                <Check className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8"
                disabled={pending}
                onClick={() => setEditingName(null)}
                aria-label="ยกเลิก"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <div
              key={cat.name}
              className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5"
            >
              <span className="flex-1 text-sm font-medium">{cat.name}</span>
              {confirmDelete === cat.name ? (
                <>
                  <span className="text-xs text-muted-foreground">ลบหมวดนี้?</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => submitDelete(cat.name)}
                  >
                    ลบ
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => setConfirmDelete(null)}
                  >
                    ไม่
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 text-muted-foreground"
                    disabled={pending}
                    onClick={() => {
                      setEditingName(cat.name);
                      setEditValue(cat.name);
                    }}
                    aria-label="แก้ไขหมวดหมู่"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    disabled={pending}
                    onClick={() => setConfirmDelete(cat.name)}
                    aria-label="ลบหมวดหมู่"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              )}
            </div>
          ),
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          placeholder="ชื่อหมวดหมู่ใหม่"
          className="h-8 max-w-[220px]"
          onKeyDown={(e) => {
            if (e.key === "Enter") submitAdd();
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || adding.trim().length === 0}
          onClick={submitAdd}
        >
          <Plus className="size-3.5" />
          เพิ่มหมวด
        </Button>
      </div>
    </div>
  );
}

export function MenuManager({
  menus,
  categories,
}: {
  menus: Menu[];
  categories: Category[];
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [pending, startTransition] = useTransition();

  function openAdd() {
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT, category: categories[0]?.name ?? "" });
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

  // Group by the category display order; trailing group catches any menu whose
  // category somehow isn't in the list (shouldn't happen with the FK).
  const known = new Set(categories.map((c) => c.name));
  const orphanCategories = [
    ...new Set(menus.map((m) => m.category).filter((c) => !known.has(c))),
  ];
  const groupOrder = [...categories.map((c) => c.name), ...orphanCategories];

  return (
    <Tabs defaultValue="menus">
      <TabsList>
        <TabsTrigger value="menus">เมนู</TabsTrigger>
        <TabsTrigger value="categories">หมวดหมู่</TabsTrigger>
      </TabsList>

      <TabsContent value="menus" className="space-y-5 pt-2">
        {adding ? (
          <MenuForm
            draft={draft}
            categories={categories}
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

        {groupOrder.map((category) => {
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
                    categories={categories}
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
      </TabsContent>

      <TabsContent value="categories" className="pt-2">
        <CategoryManager categories={categories} />
      </TabsContent>
    </Tabs>
  );
}
