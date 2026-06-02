"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, UserCog, Users } from "lucide-react";
import { toast } from "sonner";

import type { AdminUser, RoleOption } from "@/app/(app)/admin/users/page";
import {
  createUser,
  deleteUser,
  setUserRole,
} from "@/app/(app)/admin/users/actions";
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
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 border-border focus-visible:ring-2 focus-visible:ring-primary/30";

const selectTriggerClass =
  "h-11 w-full border-border focus-visible:ring-2 focus-visible:ring-primary/30";

const primaryBtn =
  "flex items-center justify-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-primary-hover disabled:opacity-50";

const secondaryBtn =
  "flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium transition-all duration-150 hover:bg-muted disabled:opacity-50";

const badgeClass =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium leading-none";

const MIN_PASSWORD_LENGTH = 8;

type AddDraft = {
  email: string;
  password: string;
  role: string;
};

function roleLabel(roleOptions: RoleOption[], key: string): string {
  return roleOptions.find((r) => r.key === key)?.label ?? key;
}

function UserRow({
  user,
  roleOptions,
  isSelf,
  pending,
  onChangeRole,
  onDelete,
}: {
  user: AdminUser;
  roleOptions: RoleOption[];
  isSelf: boolean;
  pending: boolean;
  onChangeRole: (role: string) => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const currentRole = user.roles[0] ?? "";
  const isOwner = user.roles.includes("owner");

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-muted/50">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <UserCog className="size-5 shrink-0 text-secondary" aria-hidden="true" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{user.email}</span>
            {isSelf && (
              <span className={cn(badgeClass, "bg-accent/10 text-accent")}>
                คุณ
              </span>
            )}
          </div>
          <span className="mt-0.5 block text-xs text-secondary">
            {user.roles.length > 0
              ? user.roles.map((r) => roleLabel(roleOptions, r)).join(", ")
              : "ยังไม่กำหนดบทบาท"}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/* Self can't demote out of owner — disable to make it obvious; the
            server action still rejects it regardless. */}
        <Select
          value={currentRole || undefined}
          onValueChange={(value) => {
            if (value && value !== currentRole) onChangeRole(value);
          }}
          disabled={pending || (isSelf && isOwner)}
        >
          <SelectTrigger className={cn(selectTriggerClass, "h-10 w-[130px]")}>
            <SelectValue placeholder="เลือกบทบาท" />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((r) => (
              <SelectItem key={r.key} value={r.key} className="py-2.5">
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="rounded-lg border border-danger bg-transparent px-3 py-2 text-sm font-medium text-danger transition-all duration-150 hover:bg-danger/10 disabled:opacity-50"
              disabled={pending}
              onClick={onDelete}
            >
              ลบ
            </button>
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm font-medium text-secondary transition-all duration-150 hover:bg-muted disabled:opacity-50"
              disabled={pending}
              onClick={() => setConfirmDelete(false)}
            >
              ไม่
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-lg border border-border text-secondary transition-all duration-150 hover:border-danger hover:bg-danger/10 hover:text-danger disabled:pointer-events-none disabled:opacity-40"
            disabled={pending || isSelf}
            onClick={() => setConfirmDelete(true)}
            aria-label={isSelf ? "ลบบัญชีตัวเองไม่ได้" : "ลบผู้ใช้"}
            title={isSelf ? "ลบบัญชีตัวเองไม่ได้" : undefined}
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function AdminUsersView({
  users,
  roleOptions,
  currentUserId,
}: {
  users: AdminUser[];
  roleOptions: RoleOption[];
  currentUserId: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<AddDraft>({
    email: "",
    password: "",
    role: roleOptions[0]?.key ?? "",
  });
  const [pending, startTransition] = useTransition();

  function openAdd() {
    setDraft({ email: "", password: "", role: roleOptions[0]?.key ?? "staff" });
    setDialogOpen(true);
  }

  function handleCreate() {
    const email = draft.email.trim();
    if (!email) {
      toast.error("กรุณากรอกอีเมล");
      return;
    }
    if (draft.password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`);
      return;
    }
    if (!draft.role) {
      toast.error("กรุณาเลือกบทบาท");
      return;
    }
    startTransition(async () => {
      const res = await createUser({
        email,
        password: draft.password,
        role: draft.role,
      });
      if (res.ok) {
        toast.success("เพิ่มผู้ใช้เรียบร้อย");
        setDialogOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleChangeRole(userId: string, role: string) {
    startTransition(async () => {
      const res = await setUserRole({ userId, role });
      if (res.ok) {
        toast.success("เปลี่ยนบทบาทเรียบร้อย");
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleDelete(userId: string) {
    startTransition(async () => {
      const res = await deleteUser({ userId });
      if (res.ok) {
        toast.success("ลบผู้ใช้เรียบร้อย");
      } else {
        toast.error(res.error);
      }
    });
  }

  const canSubmit =
    draft.email.trim().length > 0 &&
    draft.password.length >= MIN_PASSWORD_LENGTH &&
    draft.role.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-secondary tabular-nums">
          ทั้งหมด {users.length} คน
        </p>
        <button type="button" onClick={openAdd} className={primaryBtn}>
          <Plus className="size-4" />
          เพิ่มผู้ใช้
        </button>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-12">
          <Users
            className="size-12 text-secondary opacity-50"
            aria-hidden="true"
          />
          <p className="text-sm text-secondary">ยังไม่มีผู้ใช้</p>
          <button type="button" onClick={openAdd} className={primaryBtn}>
            <Plus className="size-4" />
            เพิ่มผู้ใช้
          </button>
        </div>
      ) : (
        <div className="grid gap-2">
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              roleOptions={roleOptions}
              isSelf={user.id === currentUserId}
              pending={pending}
              onChangeRole={(role) => handleChangeRole(user.id, role)}
              onDelete={() => handleDelete(user.id)}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-md">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
            <DialogTitle className="text-lg">เพิ่มผู้ใช้ใหม่</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="user-email">อีเมล</Label>
              <Input
                id="user-email"
                type="email"
                autoComplete="off"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                placeholder="staff@example.com"
                className={inputClass}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-password">รหัสผ่าน</Label>
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                value={draft.password}
                onChange={(e) =>
                  setDraft({ ...draft, password: e.target.value })
                }
                placeholder={`อย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-role">บทบาท</Label>
              <Select
                value={draft.role || undefined}
                onValueChange={(value) =>
                  setDraft({ ...draft, role: value ?? "" })
                }
              >
                <SelectTrigger id="user-role" className={selectTriggerClass}>
                  <SelectValue placeholder="เลือกบทบาท" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => (
                    <SelectItem key={r.key} value={r.key} className="py-2.5">
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 px-5 py-4">
            <button
              type="button"
              disabled={pending}
              onClick={() => setDialogOpen(false)}
              className={secondaryBtn}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={pending || !canSubmit}
              onClick={handleCreate}
              className={cn(primaryBtn, "px-6")}
            >
              {pending ? "กำลังบันทึก..." : "เพิ่มผู้ใช้"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
