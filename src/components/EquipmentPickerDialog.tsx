"use client";

import { Check, ChevronLeft, ChevronRight, PackageOpen, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { StockBar } from "@/components/StockBar";
import { categoriesOf, matchesCategory, NO_CATEGORY } from "@/lib/categories";
import type { EquipmentDTO } from "@/types";

const PAGE_SIZE = 8;

// หน้าต่างเลือกอุปกรณ์ (เลือกได้หลายรายการ) ใช้ <dialog> ของเบราว์เซอร์:
// กด Esc ปิดได้ และโฟกัสอยู่ในหน้าต่างให้เอง
export function EquipmentPickerDialog({
  equipments,
  initialSelected,
  maxItems,
  onConfirm,
  onClose,
}: {
  equipments: EquipmentDTO[];
  initialSelected: string[];
  maxItems: number;
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "selected">("all");
  const [category, setCategory] = useState("");
  const categories = categoriesOf(equipments);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dialogRef.current?.showModal();
    // showModal() ย้ายโฟกัสไปปุ่มแรก (ปุ่ม ✕) จึงสั่งโฟกัสช่องค้นหาเองหลังเปิด
    searchRef.current?.focus();
  }, []);

  const selectedSet = new Set(selected);
  const keyword = search.trim().toLowerCase();
  const filtered = equipments.filter(
    (e) =>
      (tab === "all" || selectedSet.has(e.id)) &&
      matchesCategory(e, category) &&
      (e.name.toLowerCase().includes(keyword) || e.item_code.toLowerCase().includes(keyword)),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const atLimit = selected.length >= maxItems;

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= maxItems ? prev : [...prev, id],
    );
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && onClose()}
      aria-labelledby="picker-title"
      className="dialog-pop m-auto w-[calc(100%-2rem)] max-w-3xl rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-slate-900/50"
    >
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="picker-title" className="text-lg font-semibold text-slate-900">
              เลือกอุปกรณ์
            </h2>
            <p className="text-sm text-slate-500">
              พร้อมให้เบิก {equipments.length} รายการ · เลือกได้สูงสุด {maxItems} รายการ
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-6 py-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              ref={searchRef}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="ค้นหาด้วยรหัสหรือชื่ออุปกรณ์"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          {categories.length > 0 && (
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              aria-label="กรองตามหมวดหมู่"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">ทุกหมวดหมู่</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              {equipments.some((e) => !e.category) && <option value={NO_CATEGORY}>ไม่ระบุหมวดหมู่</option>}
            </select>
          )}
          <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
            {(
              [
                ["all", "ทั้งหมด"],
                ["selected", `ที่เลือก (${selected.length})`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTab(value);
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1 ${
                  tab === value ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-sm text-slate-500">
              <PackageOpen className="h-8 w-8 text-slate-300" />
              {tab === "selected" && !keyword ? "ยังไม่ได้เลือกอุปกรณ์" : "ไม่พบอุปกรณ์ที่ค้นหา"}
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="w-12 px-6 py-2.5" />
                  <th className="px-2 py-2.5 font-medium">อุปกรณ์</th>
                  <th className="hidden px-6 py-2.5 font-medium sm:table-cell">คงเหลือ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((e) => {
                  const checked = selectedSet.has(e.id);
                  const disabled = !checked && atLimit;
                  return (
                    <tr
                      key={e.id}
                      onClick={() => !disabled && toggle(e.id)}
                      className={`${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${
                        checked ? "bg-indigo-50/60" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-6 py-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggle(e.id)}
                          onClick={(ev) => ev.stopPropagation()}
                          aria-label={`เลือก ${e.name}`}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <p className="font-medium text-slate-900">{e.name}</p>
                        <p className="font-mono text-xs text-slate-400">
                          {e.item_code}
                          {e.category && <span className="font-sans"> · {e.category.name}</span>}
                          <span className="font-sans sm:hidden"> · คงเหลือ {e.available_qty}</span>
                        </p>
                      </td>
                      <td className="hidden px-6 py-3 sm:table-cell">
                        <StockBar available={e.available_qty} total={e.total_qty} className="w-36" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-2.5 text-sm text-slate-500">
            <span>
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} จาก{" "}
              {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="หน้าก่อนหน้า"
                className="rounded-md border border-slate-300 p-1.5 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                aria-label="หน้าถัดไป"
                className="rounded-md border border-slate-300 p-1.5 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <p className="text-sm text-slate-600">
            เลือกแล้ว <span className="font-semibold text-slate-900">{selected.length}</span> รายการ
            {atLimit && <span className="text-amber-600"> (ครบจำนวนสูงสุดแล้ว)</span>}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => onConfirm(selected)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <Check className="h-4 w-4" />
              ยืนยันการเลือก
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
