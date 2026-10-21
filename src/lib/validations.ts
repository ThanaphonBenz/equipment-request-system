import { z } from "zod";

// schema ชุดเดียวกันใช้ทั้งในฟอร์มฝั่ง client และใน controller ฝั่ง server

const objectId = z.string().regex(/^[a-f\d]{24}$/i, { error: "รหัสอ้างอิงไม่ถูกต้อง" });

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, { error: "กรุณากรอกชื่อผู้ใช้" })
    .max(50, { error: "ชื่อผู้ใช้ยาวเกินไป" }),
});

export const MAX_ITEMS_PER_REQUEST = 20;

export const requisitionItemSchema = z.object({
  equipmentId: objectId,
  quantity: z.coerce
    .number({ error: "กรุณากรอกจำนวนเป็นตัวเลข" })
    .int({ error: "จำนวนต้องเป็นจำนวนเต็ม" })
    .min(1, { error: "จำนวนต้องมากกว่า 0" }),
});

// คำขอหนึ่งครั้งเบิกได้หลายอุปกรณ์ (ใช้เหตุผลเดียวกัน)
export const createRequisitionSchema = z.object({
  items: z
    .array(requisitionItemSchema)
    .min(1, { error: "กรุณาเลือกอุปกรณ์อย่างน้อย 1 รายการ" })
    .max(MAX_ITEMS_PER_REQUEST, { error: `เบิกได้ไม่เกิน ${MAX_ITEMS_PER_REQUEST} รายการต่อครั้ง` })
    .refine((items) => new Set(items.map((i) => i.equipmentId)).size === items.length, {
      error: "เลือกอุปกรณ์ซ้ำกัน",
    }),
  reason: z
    .string()
    .trim()
    .min(5, { error: "กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร" })
    .max(500, { error: "เหตุผลต้องไม่เกิน 500 ตัวอักษร" }),
});

export const REJECT_NOTE_MIN = 5;

export const updateRequisitionStatusSchema = z
  .object({
    status: z.enum(["approved", "rejected", "returned", "cancelled"], {
      error: "สถานะไม่ถูกต้อง",
    }),
    // หมายเหตุถึงผู้ขอ: บังคับเมื่อไม่อนุมัติ
    note: z.string().trim().max(300, { error: "หมายเหตุต้องไม่เกิน 300 ตัวอักษร" }).default(""),
  })
  .refine((d) => d.status !== "rejected" || d.note.length >= REJECT_NOTE_MIN, {
    path: ["note"],
    error: `กรุณาระบุเหตุผลที่ไม่อนุมัติ อย่างน้อย ${REJECT_NOTE_MIN} ตัวอักษร`,
  });

export const equipmentSchema = z.object({
  item_code: z
    .string()
    .trim()
    .min(1, { error: "กรุณากรอกรหัสอุปกรณ์" })
    .max(20, { error: "รหัสต้องไม่เกิน 20 ตัวอักษร" })
    .regex(/^[A-Za-z0-9-]+$/, { error: "รหัสใช้ได้เฉพาะ A-Z, 0-9 และ -" }),
  name: z
    .string()
    .trim()
    .min(1, { error: "กรุณากรอกชื่ออุปกรณ์" })
    .max(100, { error: "ชื่อต้องไม่เกิน 100 ตัวอักษร" }),
  total_qty: z.coerce
    .number({ error: "กรุณากรอกจำนวนเป็นตัวเลข" })
    .int({ error: "จำนวนต้องเป็นจำนวนเต็ม" })
    .min(0, { error: "จำนวนต้องไม่ติดลบ" })
    .max(100000, { error: "จำนวนมากเกินไป" }),
  status: z.enum(["available", "unavailable"], { error: "สถานะไม่ถูกต้อง" }),
  // ไม่บังคับ: null = ไม่ระบุหมวดหมู่
  category_id: objectId.nullable().default(null),
});

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "กรุณากรอกชื่อหมวดหมู่" })
    .max(50, { error: "ชื่อหมวดหมู่ต้องไม่เกิน 50 ตัวอักษร" }),
  description: z.string().trim().max(200, { error: "คำอธิบายต้องไม่เกิน 200 ตัวอักษร" }).default(""),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type EquipmentInput = z.infer<typeof equipmentSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type RequisitionItemInput = z.infer<typeof requisitionItemSchema>;
export type CreateRequisitionInput = z.infer<typeof createRequisitionSchema>;
export type UpdateRequisitionStatusInput = z.infer<typeof updateRequisitionStatusSchema>;
