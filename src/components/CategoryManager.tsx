"use client";

import { Pencil, Plus, Tag, Trash } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { ConfirmCard, useConfirm } from "@/components/ConfirmDialog";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { categorySchema } from "@/lib/validations";
import type { CategoryDTO } from "@/types";

type FormState = { name: string; description: string };
type FieldErrors = Partial<Record<keyof FormState, string>>;

const inputClass = "w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2";
const okBorder = "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200";
const errBorder = "border-rose-400 focus:border-rose-500 focus:ring-rose-200";

export function CategoryManager() {
  const { confirm, dialog } = useConfirm();
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // editing: null = ปิดฟอร์ม, "new" = เพิ่มใหม่, อื่นๆ = หมวดที่กำลังแก้
  const [editing, setEditing] = useState<CategoryDTO | "new" | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", description: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ categories: CategoryDTO[] }>("/api/categories")
      .then((data) => setCategories(data.categories))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function open(target: CategoryDTO | "new") {
    setEditing(target);
    setForm(target === "new" ? { name: "", description: "" } : { name: target.name, description: target.description });
    setErrors({});
    setFormError("");
    setNotice("");
  }

  const sortByName = (list: CategoryDTO[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, "th"));

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const result = categorySchema.safeParse(form);
    if (!result.success) {
      const fields = z.flattenError(result.error).fieldErrors;
      setErrors({ name: fields.name?.[0], description: fields.description?.[0] });
      return;
    }
    setErrors({});
    if (!editing) return;

    setSaving(true);
    try {
      if (editing === "new") {
        const { category } = await apiFetch<{ category: CategoryDTO }>("/api/categories", {
          method: "POST",
          body: JSON.stringify(result.data),
        });
        setCategories((prev) => sortByName([...prev, category]));
        setNotice(`เพิ่มหมวดหมู่ "${category.name}" เรียบร้อยแล้ว`);
      } else {
        const { category } = await apiFetch<{ category: CategoryDTO }>(`/api/categories/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(result.data),
        });
        setCategories((prev) => sortByName(prev.map((c) => (c.id === category.id ? category : c))));
        setNotice(`บันทึกหมวดหมู่ "${category.name}" เรียบร้อยแล้ว`);
      }
      setEditing(null);
    } catch (err) {
      if (err instanceof ApiClientError && err.details) {
        setErrors({ name: err.details.name?.[0], description: err.details.description?.[0] });
      }
      setFormError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: CategoryDTO) {
    const ok = await confirm({
      title: "ลบหมวดหมู่นี้?",
      message:
        c.equipment_count > 0
          ? `หมวดนี้ยังมีอุปกรณ์ ${c.equipment_count} รายการ ต้องย้ายอุปกรณ์ไปหมวดอื่นก่อนจึงจะลบได้`
          : "ลบแล้วกู้คืนไม่ได้",
      tone: "danger",
      icon: Trash,
      confirmLabel: "ลบหมวดหมู่",
      content: (
        <ConfirmCard
          icon={Tag}
          tone="danger"
          title={c.name}
          subtitle={c.description || "ไม่มีคำอธิบาย"}
          badge={{ value: c.equipment_count, label: "อุปกรณ์" }}
        />
      ),
    });
    if (!ok) return;
    setDeletingId(c.id);
    setNotice("");
    setError("");
    try {
      await apiFetch(`/api/categories/${c.id}`, { method: "DELETE" });
      setCategories((prev) => prev.filter((x) => x.id !== c.id));
      if (editing !== "new" && editing?.id === c.id) setEditing(null);
      setNotice(`ลบหมวดหมู่ "${c.name}" เรียบร้อยแล้ว`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {dialog}
      <div className="flex justify-end">
        <button
          onClick={() => open("new")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          เพิ่มหมวดหมู่
        </button>
      </div>

      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {editing && (
        <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-xl border border-indigo-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            {editing === "new" ? "เพิ่มหมวดหมู่ใหม่" : `แก้ไขหมวดหมู่ "${editing.name}"`}
          </h2>
          {formError && <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="cat-name" className="block text-sm font-medium">
                ชื่อหมวดหมู่ <span className="text-rose-500">*</span>
              </label>
              <input
                id="cat-name"
                value={form.name}
                maxLength={50}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น คอมพิวเตอร์และอุปกรณ์ต่อพ่วง"
                className={`${inputClass} ${errors.name ? errBorder : okBorder}`}
              />
              {errors.name && <p className="text-sm text-rose-600">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cat-desc" className="block text-sm font-medium">
                คำอธิบาย
              </label>
              <input
                id="cat-desc"
                value={form.description}
                maxLength={200}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="ไม่บังคับ"
                className={`${inputClass} ${errors.description ? errBorder : okBorder}`}
              />
              {errors.description && <p className="text-sm text-rose-600">{errors.description}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">กำลังโหลด...</p>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-sm text-slate-500">
            <Tag className="h-8 w-8 text-slate-300" />
            ยังไม่มีหมวดหมู่
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {categories.map((c) => (
              <li
                key={c.id}
                className={`flex flex-wrap items-center gap-4 px-5 py-4 ${
                  editing !== "new" && editing?.id === c.id ? "bg-indigo-50" : "hover:bg-slate-50/60"
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <Tag className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{c.name}</p>
                  <p className="truncate text-sm text-slate-500">{c.description || "—"}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {c.equipment_count} อุปกรณ์
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => open(c)}
                    aria-label={`แก้ไข ${c.name}`}
                    className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    disabled={deletingId === c.id}
                    aria-label={`ลบ ${c.name}`}
                    title={c.equipment_count > 0 ? "ย้ายอุปกรณ์ออกจากหมวดนี้ก่อนจึงจะลบได้" : "ลบ"}
                    className="rounded-md p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
