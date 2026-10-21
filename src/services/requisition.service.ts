import { isValidObjectId, type QueryFilter } from "mongoose";
import { ApiError } from "@/lib/http";
import { connectDB } from "@/lib/mongodb";
import type { CreateRequisitionInput } from "@/lib/validations";
import { EquipmentModel } from "@/models/Equipment";
import { RequisitionModel, type Requisition } from "@/models/Requisition";
import type { RequisitionDTO, RequisitionStatus } from "@/types";

type PopulatedRequisition = {
  _id: unknown;
  request_no: string;
  user_id: { _id: unknown; username: string; fullname: string } | null;
  equipment_id: { _id: unknown; item_code: string; name: string } | null;
  quantity: number;
  reason: string;
  status: string;
  admin_note?: string;
  reviewed_by?: { _id: unknown; fullname: string } | null;
  reviewed_at?: Date | null;
  created_at: Date;
  updated_at: Date;
};

function toDTO(doc: PopulatedRequisition): RequisitionDTO {
  return {
    id: String(doc._id),
    request_no: doc.request_no,
    user: doc.user_id
      ? { id: String(doc.user_id._id), username: doc.user_id.username, fullname: doc.user_id.fullname }
      : null,
    equipment: doc.equipment_id
      ? { id: String(doc.equipment_id._id), item_code: doc.equipment_id.item_code, name: doc.equipment_id.name }
      : null,
    quantity: doc.quantity,
    reason: doc.reason,
    status: doc.status as RequisitionStatus,
    admin_note: doc.admin_note ?? "",
    reviewed_by: doc.reviewed_by ? { id: String(doc.reviewed_by._id), fullname: doc.reviewed_by.fullname } : null,
    reviewed_at: doc.reviewed_at ? doc.reviewed_at.toISOString() : null,
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at.toISOString(),
  };
}

async function findPopulated(filter: QueryFilter<Requisition>): Promise<RequisitionDTO[]> {
  const docs = await RequisitionModel.find(filter)
    .sort({ created_at: -1, _id: 1 })
    .populate("user_id", "username fullname")
    .populate("equipment_id", "item_code name")
    .populate("reviewed_by", "fullname")
    .lean<PopulatedRequisition[]>();
  return docs.map(toDTO);
}

async function findPopulatedById(id: string): Promise<RequisitionDTO> {
  const [doc] = await findPopulated({ _id: id });
  if (!doc) throw new ApiError(404, "ไม่พบคำขอเบิก");
  return doc;
}

export async function listRequisitions(filter: {
  userId?: string;
  status?: RequisitionStatus;
}): Promise<RequisitionDTO[]> {
  await connectDB();
  const query: QueryFilter<Requisition> = {};
  if (filter.userId) query.user_id = filter.userId;
  if (filter.status) query.status = filter.status;
  return findPopulated(query);
}

export async function countRequisitions(filter: { status?: RequisitionStatus }): Promise<number> {
  await connectDB();
  return RequisitionModel.countDocuments(filter.status ? { status: filter.status } : {});
}

// เลขที่คำขอ เช่น REQ-261020-K7Q2 (ใช้ร่วมกันทุกรายการที่ส่งมาพร้อมกัน)
function generateRequestNo(): string {
  const now = new Date();
  const ymd = [now.getFullYear() % 100, now.getMonth() + 1, now.getDate()]
    .map((n) => String(n).padStart(2, "0"))
    .join("");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "0");
  return `REQ-${ymd}-${random}`;
}

export async function createRequisitions(
  userId: string,
  input: CreateRequisitionInput,
): Promise<{ request_no: string; requisitions: RequisitionDTO[] }> {
  await connectDB();

  const ids = input.items.map((i) => i.equipmentId);
  // อุปกรณ์ในคลังถือว่าไม่มีอยู่ (เบิกไม่ได้)
  const equipments = await EquipmentModel.find({ _id: { $in: ids }, deleted_at: null }).lean();
  const byId = new Map(equipments.map((e) => [String(e._id), e]));

  // ตรวจทุกรายการก่อน ถ้ามีรายการไหนไม่ผ่านจะไม่บันทึกเลยสักรายการ
  // details ใช้ equipmentId เป็น key เพื่อให้ฟอร์มแสดง error ใต้รายการนั้นได้
  const itemErrors: Record<string, string[]> = {};
  for (const item of input.items) {
    const equipment = byId.get(item.equipmentId);
    if (!equipment) {
      itemErrors[item.equipmentId] = ["ไม่พบอุปกรณ์นี้"];
    } else if (equipment.status !== "available") {
      itemErrors[item.equipmentId] = [`"${equipment.name}" ปิดการเบิกอยู่`];
    } else if (item.quantity > equipment.available_qty) {
      // กฎหลักของโจทย์: จำนวนที่ขอเบิกต้องไม่เกินจำนวนคงเหลือ
      itemErrors[item.equipmentId] = [
        `"${equipment.name}" ขอเบิก ${item.quantity} เกินจำนวนคงเหลือ (${equipment.available_qty})`,
      ];
    }
  }
  const messages = Object.values(itemErrors).flat();
  if (messages.length > 0) {
    throw new ApiError(400, messages.join(", "), itemErrors);
  }

  const request_no = generateRequestNo();
  const created = await RequisitionModel.insertMany(
    input.items.map((item) => ({
      request_no,
      user_id: userId,
      equipment_id: item.equipmentId,
      quantity: item.quantity,
      reason: input.reason,
      status: "pending",
    })),
  );
  const requisitions = await findPopulated({ _id: { $in: created.map((c) => c._id) } });
  return { request_no, requisitions };
}

// เปลี่ยนสถานะได้เฉพาะตามเส้นทางนี้เท่านั้น
const ALLOWED_TRANSITIONS: Record<string, { from: RequisitionStatus; stockChange: -1 | 0 | 1 }> = {
  approved: { from: "pending", stockChange: -1 }, // อนุมัติ → ตัดสต็อก
  rejected: { from: "pending", stockChange: 0 },
  returned: { from: "approved", stockChange: 1 }, // คืนของ → คืนสต็อก
};

export interface StatusUpdateResult {
  requisition: RequisitionDTO;
  // สต็อกก่อนและหลังเปลี่ยน (null ถ้าไม่กระทบสต็อก เช่น ไม่อนุมัติ) ใช้บันทึก log
  stock: { before: number; after: number } | null;
}

export async function updateRequisitionStatus(
  id: string,
  nextStatus: "approved" | "rejected" | "returned",
  review: { adminId: string; note: string },
): Promise<StatusUpdateResult> {
  if (!isValidObjectId(id)) throw new ApiError(404, "ไม่พบคำขอเบิก");
  await connectDB();

  const rule = ALLOWED_TRANSITIONS[nextStatus];

  // 1) เปลี่ยนสถานะแบบมีเงื่อนไข: ถ้ามี admin อีกคนเปลี่ยนไปก่อนแล้ว จะได้ null
  //    ป้องกันการกดอนุมัติซ้ำจนสต็อกถูกตัดสองครั้ง
  // อนุมัติ/ไม่อนุมัติ = การพิจารณา: เก็บหมายเหตุ ผู้พิจารณา และเวลา (บันทึกการคืนไม่แตะข้อมูลส่วนนี้)
  const reviewFields =
    nextStatus === "returned"
      ? {}
      : { admin_note: review.note, reviewed_by: review.adminId, reviewed_at: new Date() };
  const claimed = await RequisitionModel.findOneAndUpdate(
    { _id: id, status: rule.from },
    { $set: { status: nextStatus, ...reviewFields } },
    { returnDocument: "before" },
  ).lean();

  if (!claimed) {
    const exists = await RequisitionModel.exists({ _id: id });
    if (!exists) throw new ApiError(404, "ไม่พบคำขอเบิก");
    throw new ApiError(409, `เปลี่ยนสถานะเป็น "${nextStatus}" ได้เฉพาะคำขอที่มีสถานะ "${rule.from}"`);
  }

  // 2) ปรับสต็อก (findOneAndUpdate คืนเอกสารก่อนแก้ จึงรู้ค่าสต็อกก่อนเปลี่ยน)
  let stock: StatusUpdateResult["stock"] = null;
  if (rule.stockChange === -1) {
    // atomic: ลดได้ก็ต่อเมื่อคงเหลือพอ ในคำสั่งเดียว จึงไม่มีทางติดลบ
    const updated = await EquipmentModel.findOneAndUpdate(
      { _id: claimed.equipment_id, status: "available", deleted_at: null, available_qty: { $gte: claimed.quantity } },
      { $inc: { available_qty: -claimed.quantity } },
    );
    if (!updated) {
      // สต็อกไม่พอ → ย้อนสถานะคำขอกลับเป็น pending
      await RequisitionModel.updateOne(
        { _id: id, status: nextStatus },
        { $set: { status: rule.from, admin_note: "", reviewed_by: null, reviewed_at: null } },
      );
      throw new ApiError(409, "จำนวนอุปกรณ์คงเหลือไม่พอ หรืออุปกรณ์ถูกซ่อนอยู่ จึงอนุมัติไม่ได้");
    }
    stock = { before: updated.available_qty, after: updated.available_qty - claimed.quantity };
  } else if (rule.stockChange === 1) {
    const updated = await EquipmentModel.findOneAndUpdate(
      { _id: claimed.equipment_id },
      { $inc: { available_qty: claimed.quantity } },
    );
    if (updated) stock = { before: updated.available_qty, after: updated.available_qty + claimed.quantity };
  }

  return { requisition: await findPopulatedById(id), stock };
}

export async function cancelRequisition(id: string, userId: string): Promise<RequisitionDTO> {
  if (!isValidObjectId(id)) throw new ApiError(404, "ไม่พบคำขอเบิก");
  await connectDB();

  const claimed = await RequisitionModel.findOneAndUpdate(
    { _id: id, user_id: userId, status: "pending" },
    { $set: { status: "cancelled" } },
  );
  if (!claimed) {
    const owned = await RequisitionModel.exists({ _id: id, user_id: userId });
    if (!owned) throw new ApiError(404, "ไม่พบคำขอเบิก");
    throw new ApiError(409, "ยกเลิกได้เฉพาะคำขอที่มีสถานะรออนุมัติ");
  }

  return findPopulatedById(id);
}
