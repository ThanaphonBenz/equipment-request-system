import { errorResponse, json, readJson } from "@/lib/http";
import { FIELD_LABELS, formatFieldValue } from "@/lib/log-labels";
import { requireAdmin, requireUser } from "@/lib/session";
import { categorySchema } from "@/lib/validations";
import { createCategory, deleteCategory, listCategories, updateCategory } from "@/services/category.service";
import { logActivity } from "@/services/log.service";

// GET /api/categories
export async function index() {
  try {
    await requireUser();
    const categories = await listCategories();
    return json({ categories });
  } catch (err) {
    return errorResponse(err);
  }
}

// POST /api/categories  (admin)
export async function store(request: Request) {
  try {
    const admin = await requireAdmin();
    const input = categorySchema.parse(await readJson(request));
    const category = await createCategory(input);
    await logActivity(admin, {
      action: "category.create",
      target_type: "category",
      target_id: category.id,
      target_label: category.name,
      description: `เพิ่มหมวดหมู่ "${category.name}"`,
    });
    return json({ category }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}

// PUT /api/categories/:id  (admin)
export async function update(request: Request, id: string) {
  try {
    const admin = await requireAdmin();
    const input = categorySchema.parse(await readJson(request));
    const { category, changes } = await updateCategory(id, input);
    if (changes.length > 0) {
      const text = changes
        .map((c) => `${FIELD_LABELS[c.field] ?? c.field} ${formatFieldValue(c.from)} → ${formatFieldValue(c.to)}`)
        .join(", ");
      await logActivity(admin, {
        action: "category.update",
        target_type: "category",
        target_id: category.id,
        target_label: category.name,
        description: `แก้ไขหมวดหมู่ "${category.name}": ${text}`,
        details: { changes },
      });
    }
    return json({ category });
  } catch (err) {
    return errorResponse(err);
  }
}

// DELETE /api/categories/:id  (admin)
export async function destroy(id: string) {
  try {
    const admin = await requireAdmin();
    const deleted = await deleteCategory(id);
    await logActivity(admin, {
      action: "category.delete",
      target_type: "category",
      target_id: deleted.id,
      target_label: deleted.name,
      description: `ลบหมวดหมู่ "${deleted.name}"`,
    });
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
