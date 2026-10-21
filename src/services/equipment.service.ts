import { isValidObjectId, Types } from "mongoose";
import { ApiError } from "@/lib/http";
import { connectDB } from "@/lib/mongodb";
import type { EquipmentInput } from "@/lib/validations";
import { EquipmentModel } from "@/models/Equipment";
import { RequisitionModel } from "@/models/Requisition";
import { findCategoryById } from "@/services/category.service";
import type { EquipmentDTO, EquipmentStatus, FieldChange } from "@/types";

type EquipmentDoc = {
  _id: unknown;
  // populate แล้วจะเป็น { _id, name } ถ้ายังไม่ populate จะเป็น ObjectId หรือ null
  category_id?: unknown;
  item_code: string;
  name: string;
  total_qty: number;
  available_qty: number;
  status: string;
  deleted_at?: Date | null;
};

export function toEquipmentDTO(doc: EquipmentDoc): EquipmentDTO {
  const cat = doc.category_id as { _id?: unknown; name?: string } | null | undefined;
  return {
    id: String(doc._id),
    category: cat && typeof cat.name === "string" ? { id: String(cat._id), name: cat.name } : null,
    item_code: doc.item_code,
    name: doc.name,
    total_qty: doc.total_qty,
    available_qty: doc.available_qty,
    status: doc.status as EquipmentStatus,
    deleted_at: doc.deleted_at ? doc.deleted_at.toISOString() : null,
  };
}

// เงื่อนไข "ยังใช้งานอยู่" (ไม่ได้เก็บเข้าคลัง) ใช้ทุกที่ที่เกี่ยวกับการเบิก
export const ACTIVE_EQUIPMENT = { deleted_at: null };

function isDuplicateKey(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

// รหัสซ้ำ: บอกด้วยว่าชนกับอุปกรณ์ในคลังหรือไม่ (รหัสในคลังยังถูกจองไว้เพื่อประวัติ)
async function duplicateCodeError(code: string): Promise<ApiError> {
  const existing = await EquipmentModel.findOne({ item_code: code.toUpperCase() }, { deleted_at: 1 }).lean();
  const archived = !!existing?.deleted_at;
  const message = archived
    ? `รหัสอุปกรณ์ ${code.toUpperCase()} ถูกใช้โดยอุปกรณ์ในคลัง (กู้คืนอุปกรณ์นั้นแทนได้)`
    : `รหัสอุปกรณ์ ${code.toUpperCase()} มีอยู่แล้ว`;
  return new ApiError(409, message, { item_code: [archived ? "รหัสนี้ถูกใช้โดยอุปกรณ์ในคลัง" : "รหัสนี้ถูกใช้แล้ว"] });
}

/**
 * รายการอุปกรณ์
 * - includeHidden = false: ตัดอุปกรณ์ที่ซ่อนอยู่ออก (ผู้ใช้ทั่วไป)
 * - archived = true: เฉพาะอุปกรณ์ในคลัง (admin)
 * - withRequisitionCount: แนบจำนวนคำขอที่เคยอ้างถึง (admin ใช้ตัดสินว่าลบถาวรหรือเก็บเข้าคลัง)
 */
export async function listEquipments(options: {
  includeHidden: boolean;
  archived?: boolean;
  withRequisitionCount?: boolean;
}): Promise<EquipmentDTO[]> {
  await connectDB();
  const filter: Record<string, unknown> = options.archived ? { deleted_at: { $ne: null } } : { ...ACTIVE_EQUIPMENT };
  if (!options.includeHidden) filter.status = "available";

  const docs = await EquipmentModel.find(filter)
    .sort(options.archived ? { deleted_at: -1 } : { item_code: 1 })
    .populate("category_id", "name")
    .lean();
  const list = docs.map(toEquipmentDTO);
  if (!options.withRequisitionCount || list.length === 0) return list;

  const counts = await RequisitionModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { equipment_id: { $in: docs.map((d) => d._id) } } },
    { $group: { _id: "$equipment_id", count: { $sum: 1 } } },
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.count]));
  return list.map((e) => ({ ...e, requisition_count: byId.get(e.id) ?? 0 }));
}

// ตรวจว่าหมวดหมู่ที่ส่งมามีอยู่จริง (null = ไม่ระบุหมวดหมู่)
async function resolveCategory(categoryId: string | null): Promise<EquipmentDTO["category"]> {
  if (!categoryId) return null;
  const category = await findCategoryById(categoryId);
  if (!category) throw new ApiError(400, "ไม่พบหมวดหมู่ที่เลือก", { category_id: ["ไม่พบหมวดหมู่นี้"] });
  return { id: category.id, name: category.name };
}

export async function createEquipment(input: EquipmentInput): Promise<EquipmentDTO> {
  await connectDB();
  const category = await resolveCategory(input.category_id);
  try {
    // อุปกรณ์ใหม่ยังไม่มีใครเบิก คงเหลือจึงเท่ากับจำนวนทั้งหมด
    const doc = await EquipmentModel.create({ ...input, available_qty: input.total_qty });
    return { ...toEquipmentDTO(doc), category, requisition_count: 0 };
  } catch (err) {
    if (isDuplicateKey(err)) throw await duplicateCodeError(input.item_code);
    throw err;
  }
}

// อุปกรณ์ที่ยังมีคำขอค้าง (รออนุมัติ หรือยืมอยู่ยังไม่คืน) ห้ามซ่อนหรือลบ
async function assertNoActiveRequisitions(id: string, action: "ซ่อน" | "ลบ"): Promise<void> {
  const counts = await RequisitionModel.aggregate<{ _id: "pending" | "approved"; count: number }>([
    { $match: { equipment_id: new Types.ObjectId(id), status: { $in: ["pending", "approved"] } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const inUse = counts.find((c) => c._id === "approved")?.count ?? 0;
  const pending = counts.find((c) => c._id === "pending")?.count ?? 0;
  if (inUse === 0 && pending === 0) return;

  const reasons = [
    inUse > 0 ? `มีผู้ยืมอยู่ยังไม่คืน ${inUse} รายการ` : "",
    pending > 0 ? `มีคำขอรออนุมัติ ${pending} รายการ` : "",
  ].filter(Boolean);
  const message = `${action}ไม่ได้ เพราะ${reasons.join(" และ")} กรุณารอให้คืนอุปกรณ์และพิจารณาคำขอให้เสร็จก่อน`;
  throw new ApiError(409, message, action === "ซ่อน" ? { status: [message] } : undefined);
}

export async function updateEquipment(
  id: string,
  input: EquipmentInput,
): Promise<{ equipment: EquipmentDTO; changes: FieldChange[] }> {
  if (!isValidObjectId(id)) throw new ApiError(404, "ไม่พบอุปกรณ์");
  await connectDB();
  const category = await resolveCategory(input.category_id);

  const current = await EquipmentModel.findOne({ _id: id, ...ACTIVE_EQUIPMENT }, { status: 1 }).lean();
  if (!current) throw new ApiError(404, "ไม่พบอุปกรณ์ (หรืออยู่ในคลัง ต้องกู้คืนก่อนจึงจะแก้ไขได้)");

  // เปลี่ยนจาก "แสดง" เป็น "ซ่อน": ต้องไม่มีคำขอค้าง (ถ้าซ่อนอยู่แล้ว แก้ field อื่นได้ตามปกติ)
  if (input.status === "unavailable" && current.status !== "unavailable") {
    await assertNoActiveRequisitions(id, "ซ่อน");
  }

  // จำนวนที่ถูกเบิกออกไปอยู่ (in use) = total_qty - available_qty
  // เมื่อแก้ total_qty ให้ปรับ available_qty ตามส่วนต่าง เพื่อให้ in use เท่าเดิม
  // และห้ามตั้ง total_qty ต่ำกว่าจำนวนที่ถูกเบิกออกไป (คงเหลือจะติดลบ)
  // ทำในคำสั่งเดียว (update pipeline) เพื่อไม่ชนกับการอนุมัติที่เกิดพร้อมกัน
  let before;
  try {
    // คืนค่าก่อนแก้ เพื่อนำไปเทียบว่าแก้อะไรบ้าง (สำหรับ log)
    before = await EquipmentModel.findOneAndUpdate(
      {
        _id: id,
        ...ACTIVE_EQUIPMENT,
        $expr: { $gte: [input.total_qty, { $subtract: ["$total_qty", "$available_qty"] }] },
      },
      [
        {
          $set: {
            available_qty: { $add: ["$available_qty", { $subtract: [input.total_qty, "$total_qty"] }] },
            total_qty: input.total_qty,
            // $literal กันข้อความที่ขึ้นต้นด้วย $ ถูกตีความเป็นชื่อ field ใน pipeline
            item_code: { $literal: input.item_code.toUpperCase() },
            name: { $literal: input.name },
            status: { $literal: input.status },
            category_id: { $literal: input.category_id ? new Types.ObjectId(input.category_id) : null },
            updated_at: "$$NOW",
          },
        },
      ],
      { returnDocument: "before", updatePipeline: true },
    )
      .populate("category_id", "name")
      .lean();
  } catch (err) {
    if (isDuplicateKey(err)) throw await duplicateCodeError(input.item_code);
    throw err;
  }

  if (!before) {
    const latest = await EquipmentModel.findById(id).lean();
    if (!latest || latest.deleted_at) throw new ApiError(404, "ไม่พบอุปกรณ์");
    const inUse = latest.total_qty - latest.available_qty;
    throw new ApiError(
      409,
      `ตั้งจำนวนทั้งหมดต่ำกว่า ${inUse} ไม่ได้ เพราะมีการเบิกออกไปแล้ว ${inUse} ชิ้น`,
      { total_qty: [`ต้องไม่น้อยกว่า ${inUse} (จำนวนที่ถูกเบิกอยู่)`] },
    );
  }
  const prev = toEquipmentDTO(before);
  // ค่าหลังแก้คำนวณจากค่าก่อนแก้ด้วยสูตรเดียวกับใน pipeline
  const equipment: EquipmentDTO = {
    ...prev,
    item_code: input.item_code.toUpperCase(),
    name: input.name,
    total_qty: input.total_qty,
    available_qty: prev.available_qty + (input.total_qty - prev.total_qty),
    status: input.status,
    category,
  };
  const fields = ["item_code", "name", "total_qty", "available_qty", "status"] as const;
  const changes: FieldChange[] = fields
    .filter((f) => prev[f] !== equipment[f])
    .map((f) => ({ field: f, from: prev[f], to: equipment[f] }));
  if ((prev.category?.id ?? null) !== (category?.id ?? null)) {
    changes.push({ field: "category", from: prev.category?.name ?? "-", to: category?.name ?? "-" });
  }

  return { equipment, changes };
}

/**
 * ลบอุปกรณ์
 * - ยังมีคำขอค้าง → ไม่ให้ลบ
 * - ไม่เคยมีใครขอเบิก → ลบถาวร
 * - เคยมีประวัติการเบิก → เก็บเข้าคลัง (soft delete) เพื่อให้ประวัติยังแสดงชื่อ/รหัสได้
 */
export async function deleteEquipment(id: string): Promise<{ mode: "deleted" | "archived"; equipment: EquipmentDTO }> {
  if (!isValidObjectId(id)) throw new ApiError(404, "ไม่พบอุปกรณ์");
  await connectDB();

  const exists = await EquipmentModel.exists({ _id: id, ...ACTIVE_EQUIPMENT });
  if (!exists) throw new ApiError(404, "ไม่พบอุปกรณ์");

  await assertNoActiveRequisitions(id, "ลบ");

  const hasHistory = await RequisitionModel.exists({ equipment_id: id });
  if (!hasHistory) {
    const deleted = await EquipmentModel.findOneAndDelete({ _id: id, ...ACTIVE_EQUIPMENT })
      .populate("category_id", "name")
      .lean();
    if (!deleted) throw new ApiError(404, "ไม่พบอุปกรณ์");
    return { mode: "deleted", equipment: toEquipmentDTO(deleted) };
  }

  const archived = await EquipmentModel.findOneAndUpdate(
    { _id: id, ...ACTIVE_EQUIPMENT },
    { $set: { deleted_at: new Date() } },
    { returnDocument: "after" },
  )
    .populate("category_id", "name")
    .lean();
  if (!archived) throw new ApiError(404, "ไม่พบอุปกรณ์");
  return { mode: "archived", equipment: toEquipmentDTO(archived) };
}

// กู้คืนจากคลัง
export async function restoreEquipment(id: string): Promise<EquipmentDTO> {
  if (!isValidObjectId(id)) throw new ApiError(404, "ไม่พบอุปกรณ์ในคลัง");
  await connectDB();
  const restored = await EquipmentModel.findOneAndUpdate(
    { _id: id, deleted_at: { $ne: null } },
    { $set: { deleted_at: null } },
    { returnDocument: "after" },
  )
    .populate("category_id", "name")
    .lean();
  if (!restored) throw new ApiError(404, "ไม่พบอุปกรณ์ในคลัง");
  return toEquipmentDTO(restored);
}
