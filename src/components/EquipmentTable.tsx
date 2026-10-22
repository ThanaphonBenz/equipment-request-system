"use client";

import { ArrowRight, Boxes, ChevronDown, PackageCheck, PackageX, Search, Tags, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EquipmentStatusBadge, stockState } from "@/components/StatusBadge";
import { StockBar } from "@/components/StockBar";
import { apiFetch } from "@/lib/api-client";
import { categoriesOf, matchesCategory, NO_CATEGORY } from "@/lib/categories";
import { MAX_ITEMS_PER_REQUEST } from "@/lib/validations";
import type { EquipmentDTO } from "@/types";

const canRequest = (e: EquipmentDTO) => e.status === "available" && e.available_qty > 0;

export function EquipmentTable() {
  const router = useRouter();
  const [equipments, setEquipments] = useState<EquipmentDTO[]>([]);
  // รายการที่ติ๊กเลือกไว้ (คงอยู่แม้เปลี่ยนตัวกรอง/คำค้น)
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    apiFetch<{ equipments: EquipmentDTO[] }>("/api/equipments")
      .then((data) => setEquipments(data.equipments))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const keyword = search.trim().toLowerCase();
  const filtered = equipments.filter(
    (e) =>
      matchesCategory(e, category) &&
      (e.name.toLowerCase().includes(keyword) || e.item_code.toLowerCase().includes(keyword)),
  );
  const categories = categoriesOf(equipments);
  const hasUncategorized = equipments.some((e) => !e.category);
  const options = [
    { value: "", label: "ทุกหมวดหมู่" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
    ...(hasUncategorized ? [{ value: NO_CATEGORY, label: "ไม่ระบุหมวดหมู่" }] : []),
  ].map((o) => ({
    ...o,
    count: o.value ? equipments.filter((e) => matchesCategory(e, o.value)).length : equipments.length,
  }));

  const readyCount = equipments.filter(canRequest).length;

  const selectedSet = new Set(selected);
  const atLimit = selected.length >= MAX_ITEMS_PER_REQUEST;
  const visibleRequestable = filtered.filter(canRequest);
  const visibleSelected = visibleRequestable.filter((e) => selectedSet.has(e.id)).length;
  const allVisibleSelected = visibleRequestable.length > 0 && visibleSelected === visibleRequestable.length;

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_ITEMS_PER_REQUEST ? prev : [...prev, id],
    );
  }

  // เลือก/ยกเลิกทั้งหมดที่มองเห็นอยู่ (ตามตัวกรองปัจจุบัน)
  function toggleAllVisible() {
    const ids = visibleRequestable.map((e) => e.id);
    setSelected((prev) =>
      allVisibleSelected
        ? prev.filter((id) => !ids.includes(id))
        : [...prev, ...ids.filter((id) => !prev.includes(id))].slice(0, MAX_ITEMS_PER_REQUEST),
    );
  }

  const selectedItems = selected
    .map((id) => equipments.find((e) => e.id === id))
    .filter((e): e is EquipmentDTO => !!e);
  const outCount = equipments.filter((e) => stockState(e) === "out").length;

  return (
    <div className={`space-y-6 ${selected.length > 0 ? "pb-24" : ""}`}>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard icon={Boxes} label="อุปกรณ์ทั้งหมด" value={equipments.length} unit="รายการ" tone="indigo" loading={loading} />
        <StatCard icon={PackageCheck} label="พร้อมให้เบิก" value={readyCount} unit="รายการ" tone="emerald" loading={loading} />
        <StatCard icon={PackageX} label="หมดสต็อก" value={outCount} unit="รายการ" tone="rose" loading={loading} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            รายการอุปกรณ์
            {(category || keyword) && !loading && (
              <span className="ml-2 text-sm font-normal text-slate-400">
                {filtered.length} จาก {equipments.length}
              </span>
            )}
          </h2>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {categories.length > 0 && (
              <div className="relative">
                <Tags className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  aria-label="กรองตามหมวดหมู่"
                  // ไม่ล็อกความกว้าง: <select> จะกว้างตามตัวเลือกที่ยาวที่สุดเอง (จำกัดสูงสุดไว้ไม่ให้เบียดช่องค้นหา)
                  className={`w-full min-w-0 appearance-none truncate rounded-lg border bg-white py-2 pl-9 pr-9 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:w-auto sm:min-w-52 sm:max-w-sm ${
                    category ? "border-indigo-300 text-slate-900" : "border-slate-300 text-slate-700"
                  }`}
                >
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label} ({o.count})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            )}
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาด้วยรหัสหรือชื่ออุปกรณ์"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-12 py-3 pl-5 pr-0">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = visibleSelected > 0 && !allVisibleSelected;
                    }}
                    onChange={toggleAllVisible}
                    disabled={visibleRequestable.length === 0}
                    aria-label="เลือกทั้งหมดที่แสดงอยู่"
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600 disabled:cursor-not-allowed"
                  />
                </th>
                <th className="px-5 py-3 font-medium">อุปกรณ์</th>
                <th className="px-5 py-3 font-medium">คงเหลือ / ทั้งหมด</th>
                <th className="px-5 py-3 font-medium">สถานะ</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500">กำลังโหลด...</td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-rose-600">{error}</td>
                </tr>
              )}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500">ไม่พบอุปกรณ์</td>
                </tr>
              )}
              {filtered.map((e) => {
                const requestable = canRequest(e);
                const checked = selectedSet.has(e.id);
                const disabled = !requestable || (!checked && atLimit);
                return (
                  <tr
                    key={e.id}
                    onClick={() => !disabled && toggle(e.id)}
                    className={`${disabled ? "" : "cursor-pointer"} ${checked ? "bg-indigo-50/60" : "hover:bg-slate-50/70"}`}
                  >
                    <td className="py-4 pl-5 pr-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(e.id)}
                        onClick={(ev) => ev.stopPropagation()}
                        aria-label={`เลือก ${e.name}`}
                        title={
                          !requestable
                            ? stockState(e) === "out"
                              ? "ของหมด รอผู้ยืมคืน"
                              : "อุปกรณ์นี้ถูกซ่อนอยู่"
                            : disabled
                              ? `เลือกได้สูงสุด ${MAX_ITEMS_PER_REQUEST} รายการ`
                              : undefined
                        }
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <p className="min-w-40 font-medium text-slate-900">{e.name}</p>
                      <p className="text-xs text-slate-400">
                        <span className="font-mono">{e.item_code}</span>
                        {e.category && <span> · {e.category.name}</span>}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <StockBar available={e.available_qty} total={e.total_qty} />
                    </td>
                    <td className="px-5 py-4">
                      <EquipmentStatusBadge equipment={e} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      {requestable ? (
                        <Link
                          href={`/requisitions/new?equipment=${e.id}`}
                          onClick={(ev) => ev.stopPropagation()}
                          className="inline-flex whitespace-nowrap rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
                        >
                          ขอเบิก
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">{stockState(e) === "out" ? "รอของคืน" : "ซ่อนอยู่"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* แถบลอยด้านล่าง: แสดงเมื่อมีรายการที่เลือก */}
      {selected.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 lg:pl-64">
          <div className="pointer-events-auto flex w-full max-w-3xl flex-wrap items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl ring-1 ring-black/10 sm:flex-nowrap sm:px-5">
            <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-indigo-500 px-2 text-sm font-semibold">
              {selected.length}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                เลือกแล้ว {selected.length} รายการ
                {atLimit && <span className="ml-1 text-amber-300">(ครบจำนวนสูงสุด)</span>}
              </p>
              <p className="truncate text-xs text-slate-400">
                {selectedItems.slice(0, 3).map((e) => e.name).join(", ")}
                {selectedItems.length > 3 && ` และอีก ${selectedItems.length - 3} รายการ`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
              ล้าง
            </button>
            <button
              type="button"
              onClick={() => router.push(`/requisitions/new?equipment=${selected.join(",")}`)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400"
            >
              ขอเบิก {selected.length} รายการ
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const TONES = {
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
};

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  tone,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  unit: string;
  tone: keyof typeof TONES;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
      <span className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg sm:flex ${TONES[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs text-slate-500 sm:text-sm">{label}</p>
        <p className="text-2xl font-semibold tabular-nums text-slate-900">
          {loading ? "–" : value} <span className="text-sm font-normal text-slate-400">{unit}</span>
        </p>
      </div>
    </div>
  );
}
