"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api-client";
import { loginSchema } from "@/lib/validations";
import type { UserDTO } from "@/types";

// ผู้ใช้ตัวอย่างจาก database/seed.ts
const DEMO_USERS = [
  { username: "admin", label: "ผู้ดูแลระบบ" },
  { username: "somchai", label: "ผู้ใช้ทั่วไป" },
  { username: "somying", label: "ผู้ใช้ทั่วไป" },
  { username: "wichai", label: "ผู้ใช้ทั่วไป" },
];

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = loginSchema.safeParse({ username });
    if (!result.success) {
      setError(result.error.issues[0].message);
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

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <div className="space-y-1.5">
          <label htmlFor="username" className="block text-sm font-medium">
            ชื่อผู้ใช้
          </label>
          <input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              error
                ? "border-rose-400 focus:ring-rose-200"
                : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"
            }`}
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>

      <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm">
        <p className="mb-2 text-slate-500">ผู้ใช้ตัวอย่าง (คลิกเพื่อกรอก)</p>
        <div className="flex flex-wrap gap-2">
          {DEMO_USERS.map((u) => (
            <button
              key={u.username}
              type="button"
              onClick={() => setUsername(u.username)}
              className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-700 hover:bg-slate-200"
            >
              {u.username} <span className="text-xs text-slate-400">({u.label})</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
