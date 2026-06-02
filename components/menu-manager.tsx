"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Pencil, Plus, Tag, Trash2, UtensilsCrossed } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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

const inputClass =
  "h-11 border-border focus-visible:ring-2 focus-visible:ring-primary/30";

const primaryBtn =
  "flex items-center justify-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-primary-hover disabled:opacity-50";

const secondaryBtn =
  "flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium transition-all duration-150 hover:bg-muted disabled:opacity-50";

// Shared add/edit dialog: header + footer stay pinned, body scrolls, and the
// whole thing is capped at the viewport height so it works on phone → desktop.
function FormDialog({
  open,
  title,
  pending,
  submitLabel,
  canSubmit = true,
  onOpenChange,
  onSubmit,
  children,
}: {
  open: boolean;
  title: string;
  pending: boolean;
  submitLabel: string;
  canSubmit?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
          <DialogTitle className="text-lg">{title}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {children}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 px-5 py-4">
          <button
            type="button"
            disabled={pending}
            onClick={() => onOpenChange(false)}
            className={secondaryBtn}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={pending || !canSubmit}
            onClick={onSubmit}
            className={cn(primaryBtn, "px-6")}
          >
            {pending ? "กำลังบันทึก..." : submitLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MenuFields({
  draft,
  categories,
  onChange,
}: {
  draft: Draft;
  categories: Category[];
  onChange: (next: Draft) => void;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <div className="space-y-1.5">
          <Label htmlFor="menu-name">ชื่อเมนู</Label>
          <Input
            id="menu-name"
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            placeholder="เช่น ข้าวผัด"
            className={inputClass}
            autoFocus
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
            className={cn(inputClass, "tabular-nums")}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="menu-category">หมวดหมู่</Label>
        {categories.length === 0 ? (
          <p className="text-sm text-secondary">
            ยังไม่มีหมวดหมู่ — ไปเพิ่มที่แท็บ &quot;หมวดหมู่&quot; ก่อน
          </p>
        ) : (
          <Select
            value={draft.category || undefined}
            onValueChange={(value) =>
              onChange({ ...draft, category: value ?? "" })
            }
          >
            <SelectTrigger
              id="menu-category"
              className="h-11 w-full border-border focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <SelectValue placeholder="เลือกหมวดหมู่" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.name} value={cat.name} className="py-2.5">
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={draft.hasSpecial}
            onChange={(e) =>
              onChange({ ...draft, hasSpecial: e.target.checked })
            }
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
              onChange={(e) =>
                onChange({ ...draft, surcharge: e.target.value })
              }
              placeholder="เช่น 10"
              className={cn(inputClass, "tabular-nums sm:max-w-[200px]")}
            />
          </div>
        )}
      </div>
    </>
  );
}

// Header row shared by both tabs: a count on the left, one primary CTA on the right.
function TabHeader({
  count,
  unit,
  addLabel,
  onAdd,
}: {
  count: number;
  unit: string;
  addLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-secondary tabular-nums">
        ทั้งหมด {count} {unit}
      </p>
      <button type="button" onClick={onAdd} className={primaryBtn}>
        <Plus className="size-4" />
        {addLabel}
      </button>
    </div>
  );
}

function EmptyState({
  icon,
  message,
  addLabel,
  onAdd,
}: {
  icon: ReactNode;
  message: string;
  addLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-12">
      {icon}
      <p className="text-sm text-secondary">{message}</p>
      <button type="button" onClick={onAdd} className={primaryBtn}>
        <Plus className="size-4" />
        {addLabel}
      </button>
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openAdd() {
    setEditingName(null);
    setNameDraft("");
    setDialogOpen(true);
  }

  function openEdit(name: string) {
    setEditingName(name);
    setNameDraft(name);
    setDialogOpen(true);
  }

  function handleSubmit() {
    const name = nameDraft.trim();
    if (!name) {
      toast.error("กรุณากรอกชื่อหมวดหมู่");
      return;
    }
    if (editingName && name === editingName) {
      setDialogOpen(false);
      return;
    }
    startTransition(async () => {
      const res = editingName
        ? await renameCategory(editingName, name)
        : await createCategory(name);
      if (res.ok) {
        toast.success(editingName ? "แก้ไขหมวดหมู่เรียบร้อย" : "เพิ่มหมวดหมู่เรียบร้อย");
        setDialogOpen(false);
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
    <div className="space-y-6">
      <TabHeader
        count={categories.length}
        unit="หมวด"
        addLabel="เพิ่มหมวดหมู่"
        onAdd={openAdd}
      />

      <p className="text-sm text-secondary">
        หมวดหมู่ใช้จัดกลุ่มเมนู — แก้ชื่อแล้วเมนูในหมวดนั้นจะเปลี่ยนตาม
        ลบได้เฉพาะหมวดที่ไม่มีเมนูอยู่
      </p>

      {categories.length === 0 ? (
        <EmptyState
          icon={
            <Tag className="size-12 text-secondary opacity-50" aria-hidden="true" />
          }
          message="ยังไม่มีหมวดหมู่ — เพิ่มหมวดหมู่แรกเพื่อเริ่ม"
          addLabel="เพิ่มหมวดหมู่"
          onAdd={openAdd}
        />
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {categories.map((cat) => {
            const count = counts[cat.name] ?? 0;
            return (
              <div
                key={cat.name}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-muted/50"
              >
                <Tag className="size-4 shrink-0 text-secondary" />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {cat.name}
                </span>
                <span className="shrink-0 text-xs text-secondary tabular-nums">
                  {count} เมนู
                </span>

                {confirmDelete === cat.name ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="hidden text-xs text-secondary sm:inline">
                      ลบ?
                    </span>
                    <button
                      type="button"
                      className="rounded-lg border border-danger bg-transparent px-3 py-1.5 text-sm font-medium text-danger transition-all duration-150 hover:bg-danger/10 disabled:opacity-50"
                      disabled={pending}
                      onClick={() => submitDelete(cat.name)}
                    >
                      ลบ
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-secondary transition-all duration-150 hover:bg-muted disabled:opacity-50"
                      disabled={pending}
                      onClick={() => setConfirmDelete(null)}
                    >
                      ไม่
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-all duration-150 hover:bg-muted disabled:opacity-50"
                      disabled={pending}
                      onClick={() => openEdit(cat.name)}
                    >
                      <Pencil className="size-4" />
                      <span className="hidden sm:inline">แก้ไข</span>
                    </button>
                    <button
                      type="button"
                      className="flex size-9 items-center justify-center rounded-lg text-secondary transition-all duration-150 hover:bg-danger/10 hover:text-danger disabled:pointer-events-none disabled:opacity-40"
                      disabled={pending || count > 0}
                      onClick={() => setConfirmDelete(cat.name)}
                      aria-label={
                        count > 0 ? "ลบไม่ได้ — ยังมีเมนูในหมวดนี้" : "ลบหมวดหมู่"
                      }
                      title={count > 0 ? "ยังมีเมนูในหมวดนี้ ลบไม่ได้" : undefined}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <FormDialog
        open={dialogOpen}
        title={editingName ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}
        pending={pending}
        submitLabel={editingName ? "บันทึก" : "เพิ่มหมวด"}
        canSubmit={nameDraft.trim().length > 0}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      >
        <div className="space-y-1.5">
          <Label htmlFor="category-name">ชื่อหมวดหมู่</Label>
          <Input
            id="category-name"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="เช่น ของหวาน"
            className={inputClass}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
        </div>
      </FormDialog>
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
        "flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors",
        !menu.is_available && "bg-muted/30",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              "truncate font-medium",
              !menu.is_available && "text-secondary",
            )}
          >
            {menu.name}
          </span>
          {menu.special_surcharge != null && (
            <span className={cn(badgeClass, "bg-primary/10 text-primary")}>
              พิเศษ +{formatBaht(menu.special_surcharge)}
            </span>
          )}
        </div>
        <span
          className={cn(
            "mt-0.5 block text-sm font-semibold tabular-nums",
            menu.is_available ? "text-text-primary" : "text-secondary",
          )}
        >
          {formatBaht(menu.price)}
        </span>
      </div>

      {/* Availability — a switch reads far clearer than the old eye icon. */}
      <label className="flex shrink-0 cursor-pointer items-center gap-2">
        <Switch
          checked={menu.is_available}
          onCheckedChange={onToggle}
          disabled={pending}
          aria-label={menu.is_available ? "ปิดเมนู" : "เปิดเมนู"}
        />
        <span
          className={cn(
            "w-6 text-xs font-medium",
            menu.is_available ? "text-accent" : "text-secondary",
          )}
        >
          {menu.is_available ? "เปิด" : "ปิด"}
        </span>
      </label>

      <button
        type="button"
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-all duration-150 hover:bg-muted disabled:opacity-50"
        disabled={pending}
        onClick={onEdit}
      >
        <Pencil className="size-4" />
        <span className="hidden sm:inline">แก้ไข</span>
      </button>
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [pending, startTransition] = useTransition();

  function openAdd() {
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT, category: categories[0]?.name ?? "" });
    setDialogOpen(true);
  }

  function openEdit(menu: Menu) {
    setEditingId(menu.id);
    setDraft(toDraft(menu));
    setDialogOpen(true);
  }

  function handleSubmit() {
    const parsed = parseDraft(draft);
    if ("error" in parsed) {
      toast.error(parsed.error);
      return;
    }
    startTransition(async () => {
      const res = editingId
        ? await updateMenu(editingId, parsed)
        : await createMenu(parsed);
      if (res.ok) {
        toast.success(editingId ? "บันทึกเมนูเรียบร้อย" : "เพิ่มเมนูเรียบร้อย");
        setDialogOpen(false);
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
      <TabsList
        variant="line"
        className="w-full justify-start gap-6 border-b border-border"
      >
        <TabsTrigger
          value="menus"
          className="rounded-none border-0 px-1 pb-2.5 text-secondary after:hidden hover:text-primary/80 data-active:border-b-2 data-active:border-primary data-active:text-primary"
        >
          เมนู
        </TabsTrigger>
        <TabsTrigger
          value="categories"
          className="rounded-none border-0 px-1 pb-2.5 text-secondary after:hidden hover:text-primary/80 data-active:border-b-2 data-active:border-primary data-active:text-primary"
        >
          หมวดหมู่
        </TabsTrigger>
      </TabsList>

      <TabsContent value="menus" className="space-y-6 pt-4">
        <TabHeader
          count={menus.length}
          unit="เมนู"
          addLabel="เพิ่มเมนูใหม่"
          onAdd={openAdd}
        />

        {menus.length === 0 ? (
          <EmptyState
            icon={
              <UtensilsCrossed
                className="size-12 text-secondary opacity-50"
                aria-hidden="true"
              />
            }
            message="ยังไม่มีเมนู — เพิ่มเมนูแรกเพื่อเริ่ม"
            addLabel="เพิ่มเมนูใหม่"
            onAdd={openAdd}
          />
        ) : (
          groupOrder.map((category) => {
            const items = menus.filter((m) => m.category === category);
            if (items.length === 0) return null;

            return (
              <section key={category} className="space-y-2.5">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
                    {category}
                  </h2>
                  <span className="text-xs text-secondary tabular-nums">
                    {items.length} รายการ
                  </span>
                </div>

                <div className="grid gap-2 lg:grid-cols-2">
                  {items.map((menu) => (
                    <MenuRow
                      key={menu.id}
                      menu={menu}
                      pending={pending}
                      onEdit={() => openEdit(menu)}
                      onToggle={() => toggleAvailability(menu)}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </TabsContent>

      <TabsContent value="categories" className="pt-4">
        <CategoryManager categories={categories} counts={counts} />
      </TabsContent>

      <FormDialog
        open={dialogOpen}
        title={editingId ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่"}
        pending={pending}
        submitLabel={editingId ? "บันทึก" : "เพิ่มเมนู"}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      >
        <MenuFields draft={draft} categories={categories} onChange={setDraft} />
      </FormDialog>
    </Tabs>
  );
}
