import { isValidObjectId } from "mongoose";
import { ApiError } from "@/lib/http";
import { connectDB } from "@/lib/mongodb";
import type { CategoryInput } from "@/lib/validations";
import { CategoryModel } from "@/models/Category";
import { EquipmentModel } from "@/models/Equipment";
import type { CategoryDTO, FieldChange } from "@/types";

type CategoryDoc = { _id: unknown; name: string; description?: string };

function toDTO(doc: CategoryDoc, equipmentCount = 0): CategoryDTO {
  return { id: String(doc._id), name: doc.name, description: doc.description ?? "", equipment_count: equipmentCount };
}

function isDuplicateKey(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

function duplicateNameError(name: string) {
  return new ApiError(409, `หมวดหมู่ "${name}" มีอยู่แล้ว`, { name: ["ชื่อนี้ถูกใช้แล้ว"] });
}

// นับเฉพาะอุปกรณ์ที่ใช้งานอยู่ (ไม่รวมที่เก็บเข้าคลัง)
async function countEquipments(categoryId: string): Promise<number> {
  return EquipmentModel.countDocuments({ category_id: categoryId, deleted_at: null });
}

export async function listCategories(): Promise<CategoryDTO[]> {
  await connectDB();
  const [docs, counts] = await Promise.all([
    CategoryModel.find().sort({ name: 1 }).lean(),
    EquipmentModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { category_id: { $ne: null }, deleted_at: null } },
      { $group: { _id: "$category_id", count: { $sum: 1 } } },
    ]),
  ]);
  const countById = new Map(counts.map((c) => [String(c._id), c.count]));
  return docs.map((d) => toDTO(d, countById.get(String(d._id)) ?? 0));
}

export async function findCategoryById(id: string): Promise<CategoryDTO | null> {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const doc = await CategoryModel.findById(id).lean();
  return doc ? toDTO(doc) : null;
}

export async function createCategory(input: CategoryInput): Promise<CategoryDTO> {
  await connectDB();
  try {
    const doc = await CategoryModel.create(input);
    return toDTO(doc);
  } catch (err) {
    if (isDuplicateKey(err)) throw duplicateNameError(input.name);
    throw err;
  }
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
): Promise<{ category: CategoryDTO; changes: FieldChange[] }> {
  if (!isValidObjectId(id)) throw new ApiError(404, "ไม่พบหมวดหมู่");
  await connectDB();

  let before;
  try {
    before = await CategoryModel.findByIdAndUpdate(id, { $set: input }, { returnDocument: "before", runValidators: true }).lean();
  } catch (err) {
    if (isDuplicateKey(err)) throw duplicateNameError(input.name);
    throw err;
  }
  if (!before) throw new ApiError(404, "ไม่พบหมวดหมู่");

  const changes: FieldChange[] = (["name", "description"] as const)
    .filter((f) => (before[f] ?? "") !== input[f])
    .map((f) => ({ field: f, from: before[f] || "-", to: input[f] || "-" }));

  return { category: toDTO({ _id: before._id, ...input }, await countEquipments(id)), changes };
}

export async function deleteCategory(id: string): Promise<CategoryDTO> {
  if (!isValidObjectId(id)) throw new ApiError(404, "ไม่พบหมวดหมู่");
  await connectDB();

  // ห้ามลบหมวดที่ยังมีอุปกรณ์ เพื่อไม่ให้อุปกรณ์ชี้ไปหมวดที่ไม่มีอยู่
  const inUse = await countEquipments(id);
  if (inUse > 0) {
    throw new ApiError(409, `ลบไม่ได้ เพราะยังมีอุปกรณ์ในหมวดนี้ ${inUse} รายการ (ย้ายอุปกรณ์ไปหมวดอื่นก่อน)`);
  }
  const deleted = await CategoryModel.findByIdAndDelete(id).lean();
  if (!deleted) throw new ApiError(404, "ไม่พบหมวดหมู่");
  // อุปกรณ์ในคลังที่ยังอ้างหมวดนี้อยู่ → เป็น "ไม่ระบุหมวดหมู่" (ถ้ากู้คืนภายหลังจะได้ไม่ชี้ไปหมวดที่ไม่มีแล้ว)
  await EquipmentModel.updateMany({ category_id: id, deleted_at: { $ne: null } }, { $set: { category_id: null } });
  return toDTO(deleted);
}
