"use client";

import { ArrowRight, Check, LoaderCircle, ShieldCheck, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api-client";
import { loginSchema } from "@/lib/validations";
import type { UserDTO } from "@/types";

// ผู้ใช้ตัวอย่างจาก database/seed.ts
const DEMO_USERS = [
  { username: "admin", fullname: "ผู้ดูแลระบบ", admin: true, avatar: "bg-indigo-50 text-indigo-700" },
  { username: "somchai", fullname: "สมชาย ใจดี", admin: false, avatar: "bg-emerald-50 text-emerald-700" },
  { username: "somying", fullname: "สมหญิง รักงาน", admin: false, avatar: "bg-amber-50 text-amber-700" },
  { username: "wichai", fullname: "วิชัย ขยันยิ่ง", admin: false, avatar: "bg-rose-50 text-rose-700" },
];

export function LoginForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = loginSchema.safeParse({ username });
    if (!result.success) {
      setError(result.error.issues[0].message);
      inputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const { user } = await apiFetch<{ user: UserDTO }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(result.data),
      });
      // admin เข้าหน้าแดชบอร์ด, ผู้ใช้ทั่วไปเข้าหน้ารายการอุปกรณ์
      router.push(user.role === "admin" ? "/admin" : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
      setSubmitting(false);
    }
  }

  function pickDemo(name: string) {
    setUsername(name);
    setError("");
    inputRef.current?.focus();
  }

  const selected = username.trim().toLowerCase();

  return (
    <div className="rounded-2xl bg-white p-6 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200 sm:p-7">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="username" className="block text-sm font-medium text-slate-700">
            ชื่อผู้ใช้
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
            <input
              id="username"
              ref={inputRef}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError("");
              }}
              placeholder="กรอกชื่อผู้ใช้ เช่น admin"
              aria-invalid={!!error}
              aria-describedby={error ? "username-error" : undefined}
              className={`h-12 w-full rounded-xl border bg-white pl-11 pr-4 text-[15px] transition focus:outline-none focus:ring-4 ${
                error
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/15"
              }`}
            />
          </div>
          {error && (
            <p id="username-error" className="text-sm text-rose-600">
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:brightness-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-70"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}
        >
          {submitting ? (
            <>
              <LoaderCircle className="h-[18px] w-[18px] animate-spin" />
              กำลังเข้าสู่ระบบ...
            </>
          ) : (
            <>
              เข้าสู่ระบบ
              <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        หรือเลือกผู้ใช้ตัวอย่าง
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {DEMO_USERS.map((u) => {
          const active = selected === u.username;
          return (
            <button
              key={u.username}
              type="button"
              onClick={() => pickDemo(u.username)}
              aria-pressed={active}
              className={`relative flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${
                active
                  ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${u.avatar}`}
              >
                {u.fullname.charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800">{u.username}</span>
                <span className="flex items-center gap-1 truncate text-[11px] text-slate-500">
                  {u.admin && <ShieldCheck className="h-3 w-3 shrink-0 text-indigo-500" />}
                  {u.admin ? "ผู้ดูแลระบบ" : u.fullname}
                </span>
              </span>
              {active && (
                <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
