"use client";

import {
  Boxes,
  ClipboardCheck,
  ClipboardList,
  ClipboardPlus,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ScrollText,
  Settings2,
  Tags,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { UserDTO } from "@/types";

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: number };
type NavGroup = { title: string; items: NavItem[] };

export function Sidebar({ user, pendingCount }: { user: UserDTO; pendingCount: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const groups: NavGroup[] = [
    {
      title: "เมนูหลัก",
      items: [
        { href: "/", label: "รายการอุปกรณ์", icon: Package },
        { href: "/requisitions/new", label: "ขอเบิกอุปกรณ์", icon: ClipboardPlus },
        { href: "/requisitions", label: "คำขอของฉัน", icon: ClipboardList },
      ],
    },
  ];
  if (user.role === "admin") {
    groups.push({
      title: "ผู้ดูแลระบบ",
      items: [
        { href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard },
        { href: "/admin/requisitions", label: "พิจารณาคำขอ", icon: ClipboardCheck, badge: pendingCount },
        { href: "/admin/equipments", label: "จัดการอุปกรณ์", icon: Settings2 },
        { href: "/admin/categories", label: "หมวดหมู่อุปกรณ์", icon: Tags },
        { href: "/admin/logs", label: "ประวัติการใช้งาน", icon: ScrollText },
      ],
    });
  }

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initial = user.fullname.trim().charAt(0) || user.username.charAt(0).toUpperCase();

  const brand = (
    <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
        <Boxes className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-slate-900">ระบบเบิกจ่ายอุปกรณ์</span>
        <span className="block text-xs text-slate-500">Equipment Request</span>
      </span>
    </Link>
  );

  return (
    <>
      {/* แถบบนสำหรับจอเล็ก */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        {brand}
        <button
          onClick={() => setOpen(true)}
          aria-label="เปิดเมนู"
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* พื้นหลังมืดตอนเปิดเมนูบนจอเล็ก */}
      {open && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform ${
          open ? "translate-x-0 shadow-xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          {brand}
          <button
            onClick={() => setOpen(false)}
            aria-label="ปิดเมนู"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                          active
                            ? "bg-indigo-50 font-medium text-indigo-700"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <Icon
                          className={`h-[18px] w-[18px] ${active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}`}
                        />
                        <span className="flex-1">{item.label}</span>
                        {item.badge ? (
                          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="mb-2">
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{user.fullname}</p>
              <p className="truncate text-xs text-slate-500">
                @{user.username} · {user.role === "admin" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
              className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
