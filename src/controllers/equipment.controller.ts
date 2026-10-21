import type { NextRequest } from "next/server";
import { ApiError, errorResponse, json, readJson } from "@/lib/http";
import { FIELD_LABELS, formatFieldValue } from "@/lib/log-labels";
import { requireAdmin, requireUser } from "@/lib/session";
import { equipmentSchema } from "@/lib/validations";
import {
  createEquipment,
  deleteEquipment,
  listEquipments,
  restoreEquipment,
  updateEquipment,
} from "@/services/equipment.service";
import { logActivity } from "@/services/log.service";

// GET /api/equipments            อุปกรณ์ที่ใช้งานอยู่ (admin เห็นที่ซ่อนด้วย ผู้ใช้ทั่วไปไม่เห็น)
// GET /api/equipments?archived=1 อุปกรณ์ในคลัง (admin)
export async function index(request: NextRequest) {
  try {
    const user = await requireUser();
    const isAdmin = user.role === "admin";
    const archived = request.nextUrl.searchParams.get("archived") === "1";
    if (archived && !isAdmin) throw new ApiError(403, "เฉพาะผู้ดูแลระบบเท่านั้น");

    const equipments = await listEquipments({
      includeHidden: isAdmin,
      archived,
      withRequisitionCount: isAdmin,
    });
    return json({ equipments });
  } catch (err) {
    return errorResponse(err);
  }
}

// POST /api/equipments  (admin)
export async function store(request: Request) {
  try {
    const admin = await requireAdmin();
    const input = equipmentSchema.parse(await readJson(request));
    const equipment = await createEquipment(input);
    await logActivity(admin, {
      action: "equipment.create",
      target_type: "equipment",
      target_id: equipment.id,
      target_label: `${equipment.item_code} · ${equipment.name}`,
      description: `เพิ่มอุปกรณ์ ${equipment.item_code} ${equipment.name} จำนวน ${equipment.total_qty} ชิ้น${
        equipment.category ? ` ในหมวด "${equipment.category.name}"` : ""
      }`,
      details: { after: equipment },
    });
    return json({ equipment }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}

// PUT /api/equipments/:id  (admin)
export async function update(request: Request, id: string) {
  try {
    const admin = await requireAdmin();
    const input = equipmentSchema.parse(await readJson(request));
    const { equipment, changes } = await updateEquipment(id, input);
    // บันทึก log เฉพาะเมื่อมีการเปลี่ยนแปลงจริง
    if (changes.length > 0) {
      const text = changes
        .map((c) => `${FIELD_LABELS[c.field] ?? c.field} ${formatFieldValue(c.from)} → ${formatFieldValue(c.to)}`)
        .join(", ");
      await logActivity(admin, {
        action: "equipment.update",
        target_type: "equipment",
        target_id: equipment.id,
        target_label: `${equipment.item_code} · ${equipment.name}`,
        description: `แก้ไขอุปกรณ์ ${equipment.item_code}: ${text}`,
        details: { changes },
      });
    }
    return json({ equipment });
  } catch (err) {
    return errorResponse(err);
  }
}

// DELETE /api/equipments/:id  (admin)
// ไม่เคยมีประวัติการเบิก → ลบถาวร, มีประวัติ → เก็บเข้าคลัง (response บอก mode)
export async function destroy(id: string) {
  try {
    const admin = await requireAdmin();
    const { mode, equipment } = await deleteEquipment(id);
    const label = `${equipment.item_code} · ${equipment.name}`;
    await logActivity(admin, {
      action: mode === "deleted" ? "equipment.delete" : "equipment.archive",
      target_type: "equipment",
      target_id: equipment.id,
      target_label: label,
      description:
        mode === "deleted"
          ? `ลบอุปกรณ์ ${equipment.item_code} ${equipment.name} ถาวร (ไม่มีประวัติการเบิก)`
          : `เก็บอุปกรณ์ ${equipment.item_code} ${equipment.name} เข้าคลัง (มีประวัติการเบิก)`,
      details: { before: equipment },
    });
    return json({ mode, equipment });
  } catch (err) {
    return errorResponse(err);
  }
}

// POST /api/equipments/:id/restore  (admin) กู้คืนจากคลัง
export async function restore(id: string) {
  try {
    const admin = await requireAdmin();
    const equipment = await restoreEquipment(id);
    await logActivity(admin, {
      action: "equipment.restore",
      target_type: "equipment",
      target_id: equipment.id,
      target_label: `${equipment.item_code} · ${equipment.name}`,
      description: `กู้คืนอุปกรณ์ ${equipment.item_code} ${equipment.name} จากคลัง`,
    });
    return json({ equipment });
  } catch (err) {
    return errorResponse(err);
  }
}
