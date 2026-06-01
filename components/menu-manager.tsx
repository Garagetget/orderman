"use client";

import { useState, useTransition } from "react";
import {
  Check,
  Eye,
  EyeOff,
  FolderPlus,
  Pencil,
  Plus,
  Tag,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
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

const badgeClass =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium leading-none";

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
    <div className="max-w-2xl space-y-4 rounded-xl bg-card p-4 shadow-sm ring-1 ring-foreground/10">
      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
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
            className="tabular-nums"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>หมวดหมู่</Label>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            ยังไม่มีหมวดหมู่ — ไปเพิ่มที่แท็บ &quot;หมวดหมู่&quot; ก่อน
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

      <div className="rounded-lg bg-muted/40 p-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={draft.hasSpecial}
            onChange={(e) => onChange({ ...draft, hasSpecial: e.target.checked })}
            className="size-4 accent-primary"
          />
          มีตัวเลือก &quot;พิเศษ&quot; (คิดราคาส่วนเพิ่ม)
        </label>
        {draft.hasSpecial && (
          <div className="mt-3 space-y-1.5">
            <Label htmlFor="menu-surcharge">ส่วนเพิ่มพิเศษ (บาท)</Label>
            <Input
              id="menu-surcharge"
              inputMode="decimal"
              value={draft.surcharge}
              onChange={(e) => onChange({ ...draft, surcharge: e.target.value })}
              placeholder="เช่น 10"
              className="tabular-nums sm:max-w-[200px]"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={onCancel}
        >
          ยกเลิก
        </Button>
        <Button type="button" disabled={pending} onClick={onSubmit}>
          {pending ? "กำลังบันทึก..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}

function CategoryManager({
  categories,
  counts,
}: {
  categories: Category[];
  counts: Record<string, number>;
}) {
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
      } else {
        toast.error(res.error);
      }
      setConfirmDelete(null);
    });
  }

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground">
        หมวดหมู่ใช้จัดกลุ่มเมนู — แก้ชื่อแล้วเมนูในหมวดนั้นจะเปลี่ยนตาม
        ลบได้เฉพาะหมวดที่ไม่มีเมนูอยู่
      </p>

      <div className="space-y-2">
        {categories.map((cat) => {
          const count = counts[cat.name] ?? 0;
          if (editingName === cat.name) {
            return (
              <div
                key={cat.name}
                className="flex items-center gap-2 rounded-xl bg-card p-2 ring-1 ring-primary/40"
              >
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-9"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitRename(cat.name);
                    if (e.key === "Escape") setEditingName(null);
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  className="size-9 shrink-0"
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
                  className="size-9 shrink-0"
                  disabled={pending}
                  onClick={() => setEditingName(null)}
                  aria-label="ยกเลิก"
                >
                  <X className="size-4" />
                </Button>
              </div>
            );
          }

          return (
            <div
              key={cat.name}
              className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10"
            >
              <Tag className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 font-medium">{cat.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {count} เมนู
              </span>

              {confirmDelete === cat.name ? (
                <div className="flex items-center gap-1.5">
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    ลบ?
                  </span>
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
                </div>
              ) : (
                <div className="flex items-center gap-0.5">
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
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 text-muted-foreground hover:text-destructive disabled:opacity-40"
                    disabled={pending || count > 0}
                    onClick={() => setConfirmDelete(cat.name)}
                    aria-label={
                      count > 0 ? "ลบไม่ได้ — ยังมีเมนูในหมวดนี้" : "ลบหมวดหมู่"
                    }
                    title={count > 0 ? "ยังมีเมนูในหมวดนี้ ลบไม่ได้" : undefined}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-dashed p-2">
        <Input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          placeholder="ชื่อหมวดหมู่ใหม่"
          className="h-9 border-0 shadow-none focus-visible:ring-0"
          onKeyDown={(e) => {
            if (e.key === "Enter") submitAdd();
          }}
        />
        <Button
          type="button"
          variant="secondary"
          className="shrink-0"
          disabled={pending || adding.trim().length === 0}
          onClick={submitAdd}
        >
          <FolderPlus className="size-4" />
          เพิ่มหมวด
        </Button>
      </div>
    </div>
  );
}

function MenuRow({
  menu,
  pending,
  onEdit,
  onToggle,
}: {
  menu: Menu;
  pending: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 transition hover:ring-foreground/20",
        !menu.is_available && "bg-muted/30",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              "truncate font-medium",
              !menu.is_available && "text-muted-foreground",
            )}
          >
            {menu.name}
          </span>
          {menu.special_surcharge != null && (
            <span className={cn(badgeClass, "bg-primary/10 text-primary")}>
              พิเศษ +{formatBaht(menu.special_surcharge)}
            </span>
          )}
          {!menu.is_available && (
            <span className={cn(badgeClass, "bg-muted text-muted-foreground")}>
              ปิดอยู่
            </span>
          )}
        </div>
      </div>

      <span
        className={cn(
          "shrink-0 font-semibold tabular-nums",
          !menu.is_available && "text-muted-foreground",
        )}
      >
        {formatBaht(menu.price)}
      </span>

      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 text-muted-foreground"
          disabled={pending}
          onClick={onEdit}
          aria-label="แก้ไขเมนู"
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(
            "size-8",
            menu.is_available
              ? "text-muted-foreground"
              : "text-primary hover:text-primary",
          )}
          disabled={pending}
          onClick={onToggle}
          aria-label={menu.is_available ? "ปิดเมนู (ซ่อนจากหน้าจดออเดอร์)" : "เปิดเมนู"}
          title={menu.is_available ? "ปิดเมนู" : "เปิดเมนู"}
        >
          {menu.is_available ? (
            <Eye className="size-4" />
          ) : (
            <EyeOff className="size-4" />
          )}
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

  // Group by category display order; trailing groups catch any menu whose
  // category somehow isn't in the list (shouldn't happen with the FK).
  const known = new Set(categories.map((c) => c.name));
  const orphanCategories = [
    ...new Set(menus.map((m) => m.category).filter((c) => !known.has(c))),
  ];
  const groupOrder = [...categories.map((c) => c.name), ...orphanCategories];

  const counts: Record<string, number> = {};
  for (const m of menus) counts[m.category] = (counts[m.category] ?? 0) + 1;

  return (
    <Tabs defaultValue="menus">
      <TabsList variant="line" className="gap-4 border-b">
        <TabsTrigger value="menus">เมนู</TabsTrigger>
        <TabsTrigger value="categories">หมวดหมู่</TabsTrigger>
      </TabsList>

      <TabsContent value="menus" className="space-y-6 pt-3">
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

        {menus.length === 0 && !adding && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-muted-foreground">
            <UtensilsCrossed className="size-8 opacity-40" />
            <p className="text-sm">ยังไม่มีเมนู — กด &quot;เพิ่มเมนูใหม่&quot; เพื่อเริ่ม</p>
          </div>
        )}

        {groupOrder.map((category) => {
          const items = menus.filter((m) => m.category === category);
          if (items.length === 0) return null;

          return (
            <section key={category} className="space-y-2.5">
              <div className="flex items-baseline gap-2">
                <span
                  className="h-4 w-1 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <h2 className="text-sm font-semibold">{category}</h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {items.length} รายการ
                </span>
              </div>

              <div className="grid gap-2 lg:grid-cols-2">
                {items.map((menu) =>
                  editingId === menu.id ? (
                    <div key={menu.id} className="lg:col-span-2">
                      <MenuForm
                        draft={draft}
                        categories={categories}
                        onChange={setDraft}
                        onSubmit={() => submitEdit(menu.id)}
                        onCancel={close}
                        pending={pending}
                        submitLabel="บันทึก"
                      />
                    </div>
                  ) : (
                    <MenuRow
                      key={menu.id}
                      menu={menu}
                      pending={pending}
                      onEdit={() => openEdit(menu)}
                      onToggle={() => toggleAvailability(menu)}
                    />
                  ),
                )}
              </div>
            </section>
          );
        })}
      </TabsContent>

      <TabsContent value="categories" className="pt-3">
        <CategoryManager categories={categories} counts={counts} />
      </TabsContent>
    </Tabs>
  );
}
