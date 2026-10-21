"use client";

import { Archive, ArchiveRestore, Eye, EyeOff, Package, Pencil, Search, Trash, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { ConfirmCard, useConfirm } from "@/components/ConfirmDialog";
import { EquipmentStatusBadge } from "@/components/StatusBadge";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { matchesCategory, NO_CATEGORY } from "@/lib/categories";
import { equipmentSchema } from "@/lib/validations";
import type { CategoryDTO, EquipmentDTO, EquipmentStatus } from "@/types";

// category_id = "" หมายถึงไม่ระบุหมวดหมู่
type FormState = { item_code: string; name: string; total_qty: string; status: EquipmentStatus; category_id: string };
type FieldErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = { item_code: "", name: "", total_qty: "0", status: "available", category_id: "" };

const archivedAt = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" });

const inputClass = "w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2";
const okBorder = "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200";
const errBorder = "border-rose-400 focus:border-rose-500 focus:ring-rose-200";

export function EquipmentManager() {
  const { confirm, dialog } = useConfirm();
  const [equipments, setEquipments] = useState<EquipmentDTO[]>([]);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // editing: null = ปิดฟอร์ม, "new" = เพิ่มใหม่, อื่นๆ = อุปกรณ์ที่กำลังแก้
  const [editing, setEditing] = useState<EquipmentDTO | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // คลัง: อุปกรณ์ที่ลบแล้วแต่มีประวัติการเบิก (กู้คืนได้)
  const [view, setView] = useState<"active" | "archived">("active");
  const [archived, setArchived] = useState<EquipmentDTO[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<{ equipments: EquipmentDTO[] }>("/api/equipments"),
      apiFetch<{ equipments: EquipmentDTO[] }>("/api/equipments?archived=1"),
      apiFetch<{ categories: CategoryDTO[] }>("/api/categories"),
    ])
      .then(([eq, arc, cat]) => {
        setEquipments(eq.equipments);
        setArchived(arc.equipments);
        setCategories(cat.categories);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const keyword = search.trim().toLowerCase();
  const visible = (view === "active" ? equipments : archived).filter(
    (e) =>
      matchesCategory(e, categoryFilter) &&
      (e.name.toLowerCase().includes(keyword) || e.item_code.toLowerCase().includes(keyword)),
  );

  const inUse = editing && editing !== "new" ? editing.total_qty - editing.available_qty : 0;
  const totalNumber = Number(form.total_qty);
  const previewAvailable = Number.isInteger(totalNumber) ? totalNumber - inUse : null;

  function openCreate() {
    setEditing("new");
    setForm(EMPTY_FORM);
    setErrors({});
    setFormError("");
    setNotice("");
  }

  function openEdit(e: EquipmentDTO) {
    setEditing(e);
    setForm({
      item_code: e.item_code,
      name: e.name,
      total_qty: String(e.total_qty),
      status: e.status,
      category_id: e.category?.id ?? "",
    });
    setErrors({});
    setFormError("");
    setNotice("");
  }

  function closeForm() {
    setEditing(null);
  }

  function validate(): FieldErrors {
    const result = equipmentSchema.safeParse({ ...form, category_id: form.category_id || null });
    const next: FieldErrors = {};
    if (!result.success) {
      const fields = z.flattenError(result.error).fieldErrors;
      next.item_code = fields.item_code?.[0];
      next.name = fields.name?.[0];
      next.total_qty = fields.total_qty?.[0];
      next.status = fields.status?.[0];
      next.category_id = fields.category_id?.[0];
    }
    if (!next.total_qty && totalNumber < inUse) {
      next.total_qty = `ต้องไม่น้อยกว่า ${inUse} (จำนวนที่ถูกเบิกอยู่)`;
    }
    return Object.fromEntries(Object.entries(next).filter(([, v]) => v)) as FieldErrors;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0 || !editing) return;

    setSaving(true);
    const body = JSON.stringify({ ...form, total_qty: totalNumber, category_id: form.category_id || null });
    try {
      if (editing === "new") {
        const { equipment } = await apiFetch<{ equipment: EquipmentDTO }>("/api/equipments", {
          method: "POST",
          body,
        });
        setEquipments((prev) => [...prev, equipment].sort((a, b) => a.item_code.localeCompare(b.item_code)));
        setNotice(`เพิ่มอุปกรณ์ ${equipment.name} เรียบร้อยแล้ว`);
      } else {
        const { equipment } = await apiFetch<{ equipment: EquipmentDTO }>(`/api/equipments/${editing.id}`, {
          method: "PUT",
          body,
        });
        // PUT ไม่ส่ง requisition_count กลับมา: คงค่าเดิมไว้ (ใช้ตัดสินว่าลบถาวรหรือเก็บเข้าคลัง)
        const merged = { ...equipment, requisition_count: editing.requisition_count };
        setEquipments((prev) =>
          prev
            .map((x) => (x.id === equipment.id ? merged : x))
            .sort((a, b) => a.item_code.localeCompare(b.item_code)),
        );
        setNotice(`บันทึกการแก้ไข ${equipment.name} เรียบร้อยแล้ว`);
      }
      setEditing(null);
    } catch (err) {
      const d = err instanceof ApiClientError ? err.details : undefined;
      const fieldErrors: FieldErrors = {
        item_code: d?.item_code?.[0],
        name: d?.name?.[0],
        total_qty: d?.total_qty?.[0],
        status: d?.status?.[0],
        category_id: d?.category_id?.[0],
      };
      setErrors(fieldErrors);
      // ถ้า error ชี้ไปที่ช่องใดช่องหนึ่งแล้ว ไม่ต้องแสดงซ้ำด้านบนฟอร์ม
      if (!Object.values(fieldErrors).some(Boolean)) {
        setFormError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e: EquipmentDTO) {
    // มีประวัติการเบิก → เก็บเข้าคลัง (กู้คืนได้), ไม่มี → ลบถาวร
    const willArchive = (e.requisition_count ?? 0) > 0;
    const ok = await confirm({
      title: willArchive ? "เก็บอุปกรณ์นี้เข้าคลัง?" : "ลบอุปกรณ์นี้ถาวร?",
      message: willArchive
        ? `อุปกรณ์นี้มีประวัติการเบิก ${e.requisition_count} รายการ จึงจะถูกเก็บเข้าคลังแทนการลบ ประวัติยังดูได้ครบ และกู้คืนได้ภายหลัง`
        : "อุปกรณ์นี้ยังไม่เคยมีใครขอเบิก จะถูกลบออกจากระบบถาวร กู้คืนไม่ได้",
      tone: "danger",
      icon: willArchive ? Archive : Trash,
      confirmLabel: willArchive ? "เก็บเข้าคลัง" : "ลบถาวร",
      content: (
        <ConfirmCard
          icon={Package}
          tone="danger"
          title={e.name}
          subtitle={<span className="font-mono">{e.item_code}</span>}
          badge={{ value: e.total_qty, label: "ชิ้น" }}
          meta={[
            { label: "หมวดหมู่", value: e.category?.name ?? "ไม่ระบุ" },
            { label: "คงเหลือ / ทั้งหมด", value: `${e.available_qty} / ${e.total_qty} ชิ้น` },
          ]}
        />
      ),
    });
    if (!ok) return;
    setDeletingId(e.id);
    setNotice("");
    setError("");
    try {
      const res = await apiFetch<{ mode: "deleted" | "archived"; equipment: EquipmentDTO }>(`/api/equipments/${e.id}`, {
        method: "DELETE",
      });
      setEquipments((prev) => prev.filter((x) => x.id !== e.id));
      if (res.mode === "archived") {
        setArchived((prev) => [{ ...res.equipment, requisition_count: e.requisition_count }, ...prev]);
        setNotice(`เก็บ ${e.name} เข้าคลังแล้ว (ดูและกู้คืนได้ที่แท็บ "คลัง")`);
      } else {
        setNotice(`ลบอุปกรณ์ ${e.name} ถาวรเรียบร้อยแล้ว`);
      }
      if (editing !== "new" && editing?.id === e.id) setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setDeletingId(null);
    }
  }

  // ปุ่มตา: สลับแสดง/ซ่อน โดยส่งค่าเดิมทุก field กลับไป เปลี่ยนแค่ status
  async function handleToggleVisibility(e: EquipmentDTO) {
    const next: EquipmentStatus = e.status === "available" ? "unavailable" : "available";
    setTogglingId(e.id);
    setNotice("");
    setError("");
    try {
      const { equipment } = await apiFetch<{ equipment: EquipmentDTO }>(`/api/equipments/${e.id}`, {
        method: "PUT",
        body: JSON.stringify({
          item_code: e.item_code,
          name: e.name,
          total_qty: e.total_qty,
          status: next,
          category_id: e.category?.id ?? null,
        }),
      });
      const merged = { ...equipment, requisition_count: e.requisition_count };
      setEquipments((prev) => prev.map((x) => (x.id === e.id ? merged : x)));
      // ถ้ากำลังเปิดฟอร์มแก้ไขตัวเดียวกันอยู่ ให้ฟอร์มรู้สถานะใหม่ด้วย (กันบันทึกฟอร์มแล้วสถานะย้อนกลับ)
      if (editing !== null && editing !== "new" && editing.id === e.id) {
        setEditing(merged);
        setForm((f) => ({ ...f, status: next }));
      }
      setNotice(
        next === "unavailable"
          ? `ซ่อน ${e.name} แล้ว ผู้ใช้จะมองไม่เห็นและเบิกไม่ได้`
          : `แสดง ${e.name} ให้ผู้ใช้เบิกได้แล้ว`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "เปลี่ยนการแสดงผลไม่สำเร็จ");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleRestore(e: EquipmentDTO) {
    setRestoringId(e.id);
    setNotice("");
    setError("");
    try {
      const { equipment } = await apiFetch<{ equipment: EquipmentDTO }>(`/api/equipments/${e.id}/restore`, {
        method: "POST",
      });
      setArchived((prev) => prev.filter((x) => x.id !== e.id));
      setEquipments((prev) =>
        [...prev, { ...equipment, requisition_count: e.requisition_count }].sort((a, b) =>
          a.item_code.localeCompare(b.item_code),
        ),
      );
      setNotice(`กู้คืน ${e.name} เรียบร้อยแล้ว`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "กู้คืนไม่สำเร็จ");
    } finally {
      setRestoringId(null);
    }
  }

  function switchView(next: "active" | "archived") {
    setView(next);
    setEditing(null);
    setNotice("");
    setError("");
  }

  return (
    <div className="space-y-4">
      {dialog}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
          {(
            [
              ["active", `ใช้งานอยู่ (${equipments.length})`],
              ["archived", `คลัง (${archived.length})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => switchView(value)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 ${
                view === value ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {value === "archived" && <Archive className="h-3.5 w-3.5" />}
              {label}
            </button>
          ))}
        </div>
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหารหัสหรือชื่อ"
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="กรองตามหมวดหมู่"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">ทุกหมวดหมู่</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value={NO_CATEGORY}>ไม่ระบุหมวดหมู่</option>
        </select>
        {view === "active" && (
          <button
            onClick={openCreate}
            className="ml-auto rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + เพิ่มอุปกรณ์
          </button>
        )}
      </div>

      {view === "archived" && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          อุปกรณ์ที่ลบแล้วแต่มีประวัติการเบิก จะถูกเก็บไว้ที่นี่เพื่อให้ประวัติยังแสดงชื่อและรหัสได้ครบ ผู้ใช้มองไม่เห็นและเบิกไม่ได้
          รหัสยังถูกจองไว้ กด &quot;กู้คืน&quot; เพื่อนำกลับมาใช้งาน
        </p>
      )}

      {notice && <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
      {error && <div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {/* ฟอร์มเพิ่ม/แก้ไขเปิดเป็น modal: หน้าไม่ต้องเลื่อน และกลับมาที่แถวเดิมหลังปิด */}
      {editing && (
        <FormDialog
          title={editing === "new" ? "เพิ่มอุปกรณ์ใหม่" : `แก้ไขอุปกรณ์ ${editing.item_code}`}
          subtitle={editing === "new" ? undefined : editing.name}
          initialFocus={editing === "new" ? "#item_code" : "#name"}
          onClose={closeForm}
        >
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 px-6 py-5">
          {formError && <div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="รหัสอุปกรณ์" htmlFor="item_code" error={errors.item_code}>
              <input
                id="item_code"
                value={form.item_code}
                onChange={(e) => setForm({ ...form, item_code: e.target.value.toUpperCase() })}
                placeholder="เช่น EQ-007"
                maxLength={20}
                className={`${inputClass} font-mono ${errors.item_code ? errBorder : okBorder}`}
              />
            </Field>
            <Field label="ชื่ออุปกรณ์" htmlFor="name" error={errors.name}>
              <input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={100}
                className={`${inputClass} ${errors.name ? errBorder : okBorder}`}
              />
            </Field>
            <Field
              label="จำนวนทั้งหมด"
              htmlFor="total_qty"
              error={errors.total_qty}
              hint={
                editing === "new"
                  ? "คงเหลือเริ่มต้นจะเท่ากับจำนวนทั้งหมด"
                  : `ถูกเบิกอยู่ ${inUse} ชิ้น${previewAvailable !== null && previewAvailable >= 0 ? ` · คงเหลือหลังบันทึก ${previewAvailable} ชิ้น` : ""}`
              }
            >
              <input
                id="total_qty"
                type="number"
                min={inUse}
                step={1}
                value={form.total_qty}
                onChange={(e) => setForm({ ...form, total_qty: e.target.value })}
                className={`${inputClass} ${errors.total_qty ? errBorder : okBorder}`}
              />
            </Field>
            <Field label="หมวดหมู่" htmlFor="category_id" error={errors.category_id} required={false}>
              <select
                id="category_id"
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className={`${inputClass} ${errors.category_id ? errBorder : okBorder}`}
              >
                <option value="">— ไม่ระบุหมวดหมู่ —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "กำลังบันทึก..." : editing === "new" ? "เพิ่มอุปกรณ์" : "บันทึกการแก้ไข"}
            </button>
          </div>
        </form>
        </FormDialog>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">รหัส</th>
              <th className="px-4 py-3 font-medium">ชื่ออุปกรณ์</th>
              <th className="px-4 py-3 font-medium">หมวดหมู่</th>
              <th className="px-4 py-3 text-right font-medium">ทั้งหมด</th>
              {view === "active" ? (
                <>
                  <th className="px-4 py-3 text-right font-medium">ถูกเบิกอยู่</th>
                  <th className="px-4 py-3 text-right font-medium">คงเหลือ</th>
                  <th className="px-4 py-3 font-medium">สถานะ</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3 text-right font-medium">ประวัติการเบิก</th>
                  <th className="px-4 py-3 font-medium" colSpan={2}>
                    เก็บเข้าคลังเมื่อ
                  </th>
                </>
              )}
              <th className="px-4 py-3 font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">กำลังโหลด...</td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  {view === "archived"
                    ? archived.length === 0
                      ? "คลังว่างอยู่"
                      : "ไม่พบอุปกรณ์ที่ค้นหา"
                    : equipments.length === 0
                      ? "ยังไม่มีอุปกรณ์"
                      : "ไม่พบอุปกรณ์ที่ค้นหา"}
                </td>
              </tr>
            ) : (
              visible.map((e) => (
                <tr
                  key={e.id}
                  className={editing !== "new" && editing?.id === e.id ? "bg-indigo-50" : "hover:bg-slate-50"}
                >
                  <td className="px-4 py-3 font-mono text-slate-500">{e.item_code}</td>
                  <td className="px-4 py-3">{e.name}</td>
                  <td className="px-4 py-3">
                    {e.category ? (
                      <span className="whitespace-nowrap rounded-md bg-violet-50 px-2 py-0.5 text-xs text-violet-700">
                        {e.category.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{e.total_qty}</td>
                  {view === "archived" ? (
                    <>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500">{e.requisition_count ?? 0} รายการ</td>
                      <td className="px-4 py-3 text-slate-500" colSpan={2}>
                        {e.deleted_at ? archivedAt.format(new Date(e.deleted_at)) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleRestore(e)}
                          disabled={restoringId === e.id}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          <ArchiveRestore className="h-3.5 w-3.5" />
                          กู้คืน
                        </button>
                      </td>
                    </>
                  ) : (
                  <>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">{e.total_qty - e.available_qty}</td>
                  <td
                    className={`px-4 py-3 text-right font-semibold tabular-nums ${
                      e.available_qty === 0 ? "text-rose-600" : ""
                    }`}
                  >
                    {e.available_qty}
                  </td>
                  <td className="px-4 py-3">
                    <EquipmentStatusBadge equipment={e} />
                  </td>
                  <td className="px-4 py-3">
                    <RowActions
                      equipment={e}
                      busy={deletingId === e.id || togglingId === e.id}
                      onEdit={() => openEdit(e)}
                      onToggleVisibility={() => handleToggleVisibility(e)}
                      onDelete={() => handleDelete(e)}
                    />
                  </td>
                  </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  required = true,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {error ? <p className="text-sm text-rose-600">{error}</p> : hint && <p className="text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

// ปุ่มจัดการในแต่ละแถว: แก้ไข / แสดง-ซ่อน / ลบ
function RowActions({
  equipment: e,
  busy,
  onEdit,
  onToggleVisibility,
  onDelete,
}: {
  equipment: EquipmentDTO;
  busy: boolean;
  onEdit: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}) {
  const hidden = e.status === "unavailable";
  const inUse = e.total_qty - e.available_qty;
  // ซ่อนไม่ได้ถ้ามีผู้ยืมอยู่ (คำขอที่รออนุมัติ server จะเช็กซ้ำอีกชั้น)
  const cannotHide = !hidden && inUse > 0;
  const willArchive = (e.requisition_count ?? 0) > 0;

  return (
    <div className="flex items-center gap-1">
      <IconButton icon={Pencil} label={`แก้ไข ${e.name}`} onClick={onEdit} disabled={busy} />
      <IconButton
        icon={hidden ? EyeOff : Eye}
        tone={hidden ? "warning" : "default"}
        label={
          hidden
            ? "ซ่อนอยู่ — คลิกเพื่อแสดงให้ผู้ใช้เบิก"
            : cannotHide
              ? `มีผู้ยืมอยู่ ${inUse} ชิ้น ซ่อนได้หลังคืนครบ`
              : "แสดงอยู่ — คลิกเพื่อซ่อนจากผู้ใช้"
        }
        onClick={onToggleVisibility}
        disabled={busy || cannotHide}
      />
      <IconButton
        icon={Trash}
        tone="danger"
        label={willArchive ? `ลบ ${e.name} (มีประวัติ จะเก็บเข้าคลัง)` : `ลบ ${e.name} ถาวร`}
        onClick={onDelete}
        disabled={busy}
      />
    </div>
  );
}

const ICON_TONES = {
  default: "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
  warning: "bg-amber-50 text-amber-600 hover:bg-amber-100",
  danger: "text-slate-500 hover:bg-rose-50 hover:text-rose-600",
};

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: keyof typeof ICON_TONES;
}) {
  // ห่อด้วย span เพื่อให้ tooltip (title) ยังขึ้นตอนปุ่ม disabled
  return (
    <span title={label} className="inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-35 ${ICON_TONES[tone]}`}
      >
        <Icon className="h-4 w-4" />
      </button>
    </span>
  );
}

// modal สำหรับฟอร์มเพิ่ม/แก้ไข (กด Esc หรือ ✕ เพื่อปิด, ไม่ปิดเมื่อคลิกพื้นหลัง กันข้อมูลที่กรอกหาย)
function FormDialog({
  title,
  subtitle,
  initialFocus,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  initialFocus: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.querySelector<HTMLElement>(initialFocus)?.focus();
  }, [initialFocus]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="equipment-form-title"
      className="dialog-pop m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <div className="min-w-0">
          <h2 id="equipment-form-title" className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          {subtitle && <p className="truncate text-sm text-slate-500">{subtitle}</p>}
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
      {children}
    </dialog>
  );
}
