"use client";

import { useActionState } from "react";
import { UtensilsCrossed } from "lucide-react";

import { login, type LoginState } from "@/app/auth/actions";

const initialState: LoginState = { error: null };

const fieldClass =
  "h-11 rounded-lg border border-border bg-surface px-3 text-sm outline-none transition-all duration-150 placeholder:text-secondary/60 focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/30";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <main className="flex min-h-svh items-center justify-center bg-gradient-to-br from-primary/10 to-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
            <UtensilsCrossed className="size-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold text-primary">orderman</h1>
          <p className="mt-1 text-sm text-secondary">
            เข้าสู่ระบบเพื่อจัดการออเดอร์
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm md:p-7">
          <form action={formAction} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                อีเมล
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                className={fieldClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                รหัสผ่าน
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className={fieldClass}
              />
            </div>

            {state.error ? (
              <p
                className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger"
                role="alert"
              >
                {state.error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 flex h-11 w-full items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-white transition-all duration-150 hover:bg-primary-hover disabled:opacity-50"
            >
              {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
