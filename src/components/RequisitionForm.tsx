"use client";

import { ClipboardX, ListPlus, Minus, Package, PackageOpen, Plus, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { useConfirm } from "@/components/ConfirmDialog";
import { EquipmentPickerDialog } from "@/components/EquipmentPickerDialog";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { createRequisitionSchema, MAX_ITEMS_PER_REQUEST } from "@/lib/validations";
import type { EquipmentDTO } from "@/types";

type CartItem = { equipmentId: string; quantity: string };

const QUICK_REASONS = [
  "ใช้ในการอบรม/สัมมนา",
  "ใช้ประชุมและนำเสนองาน",
  "ทดแทนอุปกรณ์ที่ชำรุด",
  "ใช้ปฏิบัติงานนอกสถานที่",
];

export function RequisitionForm({ initialEquipmentIds = [] }: { initialEquipmentIds?: string[] }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [equipments, setEquipments] = useState<EquipmentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [items, setItems] = useState<CartItem[]>(() =>
    initialEquipmentIds.slice(0, MAX_ITEMS_PER_REQUEST).map((id) => ({ equipmentId: id, quantity: "1" })),
  );
  const [reason, setReason] = useState("");

  const [itemsError, setItemsError] = useState("");
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [reasonError, setReasonError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ equipments: EquipmentDTO[] }>("/api/equipments")
      .then((data) => {
        const available = data.equipments.filter((e) => e.status === "available" && e.available_qty > 0);
        setEquipments(available);
        // ตัดรายการที่ส่งมาทาง URL แต่เบิกไม่ได้แล้วออก
        const ids = new Set(available.map((e) => e.id));
        setItems((prev) => prev.filter((i) => ids.has(i.equipmentId)));
      })
      .catch((err: Error) => setFormError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const byId = new Map(equipments.map((e) => [e.id, e]));
  const totalPieces = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  function clearItemError(id: string) {
    setItemErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  // รับรายการที่เลือกจากหน้าต่าง: คงจำนวนของรายการเดิมไว้ รายการใหม่เริ่มที่ 1
  function applyPickerSelection(ids: string[]) {
    setItems((prev) => {
      const current = new Map(prev.map((i) => [i.equipmentId, i.quantity]));
      return ids.map((id) => ({ equipmentId: id, quantity: current.get(id) ?? "1" }));
    });
    setItemErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => ids.includes(id))));
    setItemsError("");
    setPickerOpen(false);
  }

  function setItemQuantity(id: string, value: string) {
    setItems((prev) => prev.map((i) => (i.equipmentId === id ? { ...i, quantity: value } : i)));
    clearItemError(id);
  }

  function stepItemQuantity(id: string, next: number) {
    const max = byId.get(id)?.available_qty ?? Infinity;
    setItemQuantity(id, String(Math.min(Math.max(1, next), max)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.equipmentId !== id));
    clearItemError(id);
  }

  // Client-side validation: ใช้ zod schema เดียวกับ server + เช็กแต่ละรายการไม่เกินคงเหลือ
  function validate(): boolean {
    const result = createRequisitionSchema.safeParse({ items, reason });
    const perItem: Record<string, string> = {};
    let listError = "";
    let reasonMsg = "";

    if (!result.success) {
      const fields = z.flattenError(result.error).fieldErrors;
      reasonMsg = fields.reason?.[0] ?? "";
      if (items.length === 0) listError = fields.items?.[0] ?? "กรุณาเลือกอุปกรณ์อย่างน้อย 1 รายการ";
    }
    for (const item of items) {
      const qty = Number(item.quantity);
      const equipment = byId.get(item.equipmentId);
      if (!Number.isInteger(qty) || qty < 1) perItem[item.equipmentId] = "จำนวนต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป";
      else if (equipment && qty > equipment.available_qty)
        perItem[item.equipmentId] = `เกินคงเหลือ (เบิกได้สูงสุด ${equipment.available_qty} ชิ้น)`;
    }

    setItemsError(listError);
    setItemErrors(perItem);
    setReasonError(reasonMsg);
    return !listError && !reasonMsg && Object.keys(perItem).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    // ให้ตรวจรายการอีกครั้งก่อนส่งจริง
    const ok = await confirm({
      title: "ยืนยันส่งคำขอเบิก?",
      message: "ตรวจสอบรายการให้ถูกต้อง หลังส่งแล้วจะรอผู้ดูแลระบบพิจารณา",
      tone: "primary",
      icon: Send,
      confirmLabel: "ยืนยันส่งคำขอ",
      cancelLabel: "กลับไปแก้ไข",
      content: (
        <RequestSummary
          rows={items.flatMap((i) => {
            const e = byId.get(i.equipmentId);
            return e ? [{ id: e.id, name: e.name, code: e.item_code, quantity: Number(i.quantity) }] : [];
          })}
          reason={reason.trim()}
        />
      ),
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      await apiFetch("/api/requisitions", {
        method: "POST",
        body: JSON.stringify({
          items: items.map((i) => ({ equipmentId: i.equipmentId, quantity: Number(i.quantity) })),
          reason,
        }),
      });
      router.push("/requisitions?created=1");
      router.refresh();
    } catch (err) {
      // server ส่ง details มาเป็น { [equipmentId]: [ข้อความ] }
      if (err instanceof ApiClientError && err.details) {
        const perItem: Record<string, string> = {};
        for (const [key, value] of Object.entries(err.details)) {
          if (byId.has(key) && value?.[0]) perItem[key] = value[0];
        }
        setItemErrors(perItem);
        if (err.details.reason?.[0]) setReasonError(err.details.reason[0]);
      }
      setFormError(err instanceof Error ? err.message : "ส่งคำขอไม่สำเร็จ");
      setSubmitting(false);
    }
  }

  // ยกเลิก: ถ้ากรอกอะไรไว้แล้วให้ยืนยันก่อน กันข้อมูลหายโดยไม่ตั้งใจ
  async function handleCancel() {
    const dirty = items.length > 0 || reason.trim().length > 0;
    if (dirty) {
      const ok = await confirm({
        title: "ยกเลิกคำขอนี้?",
        message: `รายการที่เลือกไว้${items.length ? ` ${items.length} รายการ` : ""}และเหตุผลที่กรอกจะหายไป ต้องการยกเลิกใช่ไหม`,
        tone: "danger",
        icon: ClipboardX,
        confirmLabel: "ยกเลิกคำขอ",
        cancelLabel: "กลับไปแก้ไขต่อ",
      });
      if (!ok) return;
    }
    router.push("/");
  }

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-96 animate-pulse rounded-xl bg-slate-200/60 lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-xl bg-slate-200/60" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid items-start gap-6 lg:grid-cols-3">
      {dialog}
      <div className="space-y-6 lg:col-span-2">
        {formError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div>
        )}

        {/* ขั้นที่ 1: เลือกอุปกรณ์และจำนวน */}
        <Section
          step={1}
          title="อุปกรณ์และจำนวน"
          description="เลือกได้หลายรายการ แล้วกำหนดจำนวนของแต่ละรายการ"
          error={itemsError || (Object.keys(itemErrors).length ? "มีรายการที่จำนวนไม่ถูกต้อง" : undefined)}
          aside={
            items.length > 0 && (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <ListPlus className="h-4 w-4" />
                เพิ่ม / แก้ไขรายการ
              </button>
            )
          }
        >
          {equipments.length === 0 ? (
            <EmptyState text="ขณะนี้ไม่มีอุปกรณ์ที่พร้อมให้เบิก" />
          ) : items.length === 0 ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 py-10 text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600"
            >
              <ListPlus className="h-8 w-8" />
              <span className="font-medium">เลือกอุปกรณ์</span>
              <span className="text-xs text-slate-400">พร้อมให้เบิก {equipments.length} รายการ</span>
            </button>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {items.map((item) => {
                const e = byId.get(item.equipmentId);
                if (!e) return null;
                const qty = Number(item.quantity);
                const error = itemErrors[item.equipmentId];
                return (
                  <li key={item.equipmentId} className={`p-4 ${error ? "bg-rose-50/50" : ""}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{e.name}</p>
                        <p className="text-xs text-slate-500">
                          <span className="font-mono text-slate-400">{e.item_code}</span> · คงเหลือ {e.available_qty} ชิ้น
                        </p>
                      </div>
                      <div
                        className={`flex items-center overflow-hidden rounded-lg border bg-white ${
                          error ? "border-rose-400" : "border-slate-300"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => stepItemQuantity(e.id, qty - 1)}
                          disabled={qty <= 1}
                          aria-label={`ลดจำนวน ${e.name}`}
                          className="px-2.5 py-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={e.available_qty}
                          step={1}
                          value={item.quantity}
                          onChange={(ev) => setItemQuantity(e.id, ev.target.value)}
                          aria-label={`จำนวน ${e.name}`}
                          className="w-14 border-x border-slate-200 py-1.5 text-center font-semibold tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => stepItemQuantity(e.id, qty + 1)}
                          disabled={qty >= e.available_qty}
                          aria-label={`เพิ่มจำนวน ${e.name}`}
                          className="px-2.5 py-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => stepItemQuantity(e.id, e.available_qty)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                      >
                        สูงสุด
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(e.id)}
                        aria-label={`เอา ${e.name} ออก`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {/* ขั้นที่ 2: เหตุผล */}
        <Section step={2} title="เหตุผลการเบิก" description="ใช้ร่วมกันทุกรายการ อย่างน้อย 5 ตัวอักษร" error={reasonError}>
          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK_REASONS.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => {
                  setReason(text);
                  setReasonError("");
                }}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  reason === text
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {text}
              </button>
            ))}
          </div>
          <textarea
            id="reason"
            rows={4}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="อธิบายเพิ่มเติม เช่น ใช้สำหรับงานอบรมวันที่ ..."
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              reasonError
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"
            }`}
          />
          <p className="mt-1 text-right text-xs text-slate-400">{reason.length}/500</p>
        </Section>
      </div>

      {/* สรุปคำขอ */}
      <aside className="space-y-4 lg:sticky lg:top-8">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">สรุปคำขอ</h2>
            {items.length > 0 && <span className="text-xs text-slate-500">{items.length} รายการ</span>}
          </div>

          <div className="px-5 py-4">
            {items.length === 0 ? (
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-slate-300">
                  <PackageOpen className="h-5 w-5" />
                </span>
                ยังไม่ได้เลือกอุปกรณ์
              </div>
            ) : (
              <ul className="max-h-64 space-y-3 overflow-y-auto">
                {items.map((item) => {
                  const e = byId.get(item.equipmentId);
                  if (!e) return null;
                  const qty = Number(item.quantity) || 0;
                  const after = e.available_qty - qty;
                  return (
                    <li key={item.equipmentId} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">{e.name}</p>
                        <p className={`text-xs ${after < 0 ? "text-rose-600" : "text-slate-400"}`}>
                          คงเหลือหลังอนุมัติ {after} ชิ้น
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums text-slate-900">× {qty}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {items.length > 0 && (
            <div className="flex justify-between border-t border-slate-200 px-5 py-3 text-sm">
              <span className="text-slate-500">รวมทั้งหมด</span>
              <span className="font-semibold tabular-nums text-slate-900">{totalPieces} ชิ้น</span>
            </div>
          )}

          <div className="space-y-2 border-t border-slate-200 px-5 py-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {submitting ? "กำลังส่งคำขอ..." : items.length > 1 ? `ส่งคำขอเบิก (${items.length} รายการ)` : "ส่งคำขอเบิก"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitting}
              className="block w-full rounded-lg px-4 py-2 text-center text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-60"
            >
              ยกเลิก
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">ขั้นตอนหลังส่งคำขอ</h3>
          <ol className="space-y-3 text-sm">
            {[
              ["ส่งคำขอ", "ทุกรายการได้เลขที่คำขอเดียวกัน สถานะ \"รออนุมัติ\""],
              ["ผู้ดูแลระบบพิจารณา", "อนุมัติหรือไม่อนุมัติแยกทีละรายการ"],
              ["รับอุปกรณ์", "ระบบตัดจำนวนคงเหลืออัตโนมัติ"],
            ].map(([title, desc], i) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-slate-800">{title}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </aside>

      {pickerOpen && (
        <EquipmentPickerDialog
          equipments={equipments}
          initialSelected={items.map((i) => i.equipmentId)}
          maxItems={MAX_ITEMS_PER_REQUEST}
          onConfirm={applyPickerSelection}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </form>
  );
}

function Section({
  step,
  title,
  description,
  error,
  aside,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  error?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border bg-white p-5 shadow-sm sm:p-6 ${error ? "border-rose-300" : "border-slate-200"}`}
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
          {step}
        </span>
        <div className="flex-1">
          <h2 className="font-semibold text-slate-900">
            {title} <span className="text-rose-500">*</span>
          </h2>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 py-10 text-sm text-slate-500">
      <PackageOpen className="h-8 w-8 text-slate-300" />
      {text}
    </div>
  );
}

// สรุปรายการใน modal ยืนยันก่อนส่ง
function RequestSummary({
  rows,
  reason,
}: {
  rows: { id: string; name: string; code: string; quantity: number }[];
  reason: string;
}) {
  const total = rows.reduce((sum, r) => sum + r.quantity, 0);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Package className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{r.name}</p>
              <p className="font-mono text-xs text-slate-400">{r.code}</p>
            </div>
            <span className="shrink-0 rounded-lg bg-indigo-50 px-2.5 py-1 text-sm font-semibold tabular-nums text-indigo-700">
              ×{r.quantity}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-sm">
        <span className="text-slate-500">รวม {rows.length} รายการ</span>
        <span className="font-semibold tabular-nums text-slate-900">{total} ชิ้น</span>
      </div>
      {reason && (
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="text-[11px] tracking-wide text-slate-400">เหตุผลการเบิก</p>
          <p className="mt-0.5 line-clamp-3 text-sm text-slate-600">{reason}</p>
        </div>
      )}
    </div>
  );
}
