"use client";

import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  ClipboardPlus,
  ClipboardX,
  LogIn,
  PackagePlus,
  PackageX,
  Archive,
  ArchiveRestore,
  Pencil,
  RotateCcw,
  Search,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ACTION_LABELS, FIELD_LABELS, formatFieldValue } from "@/lib/log-labels";
import type { ActivityLogDTO, FieldChange, LogAction, LogTargetType } from "@/types";

type LogsResponse = { logs: ActivityLogDTO[]; total: number; page: number; pageSize: number };

const FILTERS: { value: LogTargetType | ""; label: string }[] = [
  { value: "", label: "ทั้งหมด" },
  { value: "requisition", label: "คำขอเบิก" },
  { value: "equipment", label: "อุปกรณ์" },
  { value: "category", label: "หมวดหมู่" },
  { value: "auth", label: "เข้าสู่ระบบ" },
];

const ACTION_STYLES: Record<LogAction, { icon: LucideIcon; className: string }> = {
  "auth.login": { icon: LogIn, className: "bg-slate-100 text-slate-600" },
  "requisition.create": { icon: ClipboardPlus, className: "bg-indigo-50 text-indigo-600" },
  "requisition.approve": { icon: ClipboardCheck, className: "bg-emerald-50 text-emerald-600" },
  "requisition.reject": { icon: ClipboardX, className: "bg-rose-50 text-rose-600" },
  "requisition.return": { icon: RotateCcw, className: "bg-sky-50 text-sky-600" },
  "requisition.cancel": { icon: ClipboardX, className: "bg-slate-100 text-slate-600" },
  "equipment.create": { icon: PackagePlus, className: "bg-violet-50 text-violet-600" },
  "equipment.update": { icon: Pencil, className: "bg-amber-50 text-amber-600" },
  "equipment.delete": { icon: PackageX, className: "bg-rose-50 text-rose-600" },
  "equipment.archive": { icon: Archive, className: "bg-slate-100 text-slate-600" },
  "equipment.restore": { icon: ArchiveRestore, className: "bg-emerald-50 text-emerald-600" },
  "category.create": { icon: Tag, className: "bg-violet-50 text-violet-600" },
  "category.update": { icon: Pencil, className: "bg-amber-50 text-amber-600" },
  "category.delete": { icon: Tag, className: "bg-rose-50 text-rose-600" },
};

const dateFormatter = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "medium" });

export function ActivityLogList() {
  const [type, setType] = useState<LogTargetType | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // หน่วงเวลาค้นหา 300ms หลังหยุดพิมพ์
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchInput.trim();
      if (next !== q) {
        setLoading(true);
        setPage(1);
        setQ(next);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, q]);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (type) params.set("type", type);
    if (q) params.set("q", q);

    let ignore = false;
    apiFetch<LogsResponse>(`/api/logs?${params}`)
      .then((res) => {
        if (ignore) return;
        setData(res);
        setError("");
      })
      .catch((err: Error) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [type, q, page]);

  function changeType(value: LogTargetType | "") {
    if (value === type) return;
    setLoading(true);
    setPage(1);
    setType(value);
  }

  function goToPage(next: number) {
    setLoading(true);
    setPage(next);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const from = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => changeType(f.value)}
              className={`rounded-full px-3 py-1 text-sm ${
                type === f.value
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหา เลขที่คำขอ, รหัส, ชื่อผู้ใช้"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      {error && <div className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">{error}</div>}

      <ul className={`divide-y divide-slate-100 transition-opacity ${loading && data ? "opacity-50" : ""}`}>
        {!data && loading ? (
          Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="flex gap-4 px-5 py-4">
              <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
              </div>
            </li>
          ))
        ) : data && data.logs.length === 0 ? (
          <li className="flex flex-col items-center gap-2 px-5 py-14 text-sm text-slate-500">
            <ClipboardList className="h-8 w-8 text-slate-300" />
            ไม่พบประวัติการใช้งาน
          </li>
        ) : (
          data?.logs.map((log) => <LogRow key={log.id} log={log} />)
        )}
      </ul>

      {data && data.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm">
          <span className="text-slate-500">
            แสดง {from}–{to} จาก {data.total} รายการ
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || loading}
              aria-label="หน้าก่อนหน้า"
              className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 tabular-nums text-slate-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages || loading}
              aria-label="หน้าถัดไป"
              className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LogRow({ log }: { log: ActivityLogDTO }) {
  const style = ACTION_STYLES[log.action];
  const Icon = style.icon;
  const changes = (log.details?.changes as FieldChange[] | undefined) ?? [];
  const items =
    log.action === "requisition.create"
      ? ((log.details?.items as { item_code: string; name: string; quantity: number }[]) ?? [])
      : [];

  return (
    <li className="flex gap-4 px-5 py-4 hover:bg-slate-50/60">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.className}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-sm font-medium text-slate-900">{ACTION_LABELS[log.action]}</p>
          <time className="text-xs tabular-nums text-slate-400" dateTime={log.created_at}>
            {dateFormatter.format(new Date(log.created_at))}
          </time>
        </div>
        <p className="mt-0.5 text-sm text-slate-600">{log.description}</p>

        {changes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {changes.map((c) => (
              <span key={c.field} className="rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                {FIELD_LABELS[c.field] ?? c.field}: <span className="line-through opacity-60">{formatFieldValue(c.from)}</span>{" "}
                → <span className="font-medium">{formatFieldValue(c.to)}</span>
              </span>
            ))}
          </div>
        )}
        {items.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {items.map((it) => (
              <span key={it.item_code} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                <span className="font-mono text-slate-400">{it.item_code}</span> {it.name} ×{it.quantity}
              </span>
            ))}
          </div>
        )}

        <p className="mt-1.5 text-xs text-slate-400">
          โดย <span className="text-slate-600">{log.actor.fullname}</span> (@{log.actor.username})
        </p>
      </div>
    </li>
  );
}
