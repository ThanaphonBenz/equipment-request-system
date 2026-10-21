import type { NextRequest } from "next/server";
import { ApiError, errorResponse, json, readJson } from "@/lib/http";
import { requireAdmin, requireUser } from "@/lib/session";
import { createRequisitionSchema, updateRequisitionStatusSchema } from "@/lib/validations";
import {
  cancelRequisition,
  createRequisitions,
  listRequisitions,
  updateRequisitionStatus,
} from "@/services/requisition.service";
import { logActivity } from "@/services/log.service";
import type { LogAction, RequisitionStatus } from "@/types";

const STATUS_LOG: Record<"approved" | "rejected" | "returned", { action: LogAction; label: string }> = {
  approved: { action: "requisition.approve", label: "อนุมัติคำขอ" },
  rejected: { action: "requisition.reject", label: "ไม่อนุมัติคำขอ" },
  returned: { action: "requisition.return", label: "บันทึกการคืน" },
};

const STATUSES: RequisitionStatus[] = ["pending", "approved", "rejected", "returned", "cancelled"];

// GET /api/requisitions?scope=all&status=pending
// ผู้ใช้ทั่วไปเห็นเฉพาะคำขอของตัวเอง, admin ส่ง scope=all เพื่อดูทั้งหมด
export async function index(request: NextRequest) {
  try {
    const user = await requireUser();
    const params = request.nextUrl.searchParams;

    const scope = params.get("scope");
    if (scope === "all" && user.role !== "admin") {
      throw new ApiError(403, "เฉพาะผู้ดูแลระบบเท่านั้น");
    }

    const statusParam = params.get("status");
    if (statusParam && !STATUSES.includes(statusParam as RequisitionStatus)) {
      throw new ApiError(400, "status ไม่ถูกต้อง");
    }

    const requisitions = await listRequisitions({
      userId: scope === "all" ? undefined : user.id,
      status: (statusParam as RequisitionStatus) || undefined,
    });
    return json({ requisitions });
  } catch (err) {
    return errorResponse(err);
  }
}

// POST /api/requisitions  body: { items: [{ equipmentId, quantity }], reason }
export async function store(request: Request) {
  try {
    const user = await requireUser();
    const input = createRequisitionSchema.parse(await readJson(request));
    const result = await createRequisitions(user.id, input);

    const summary = result.requisitions.map((r) => `${r.equipment?.name} ×${r.quantity}`).join(", ");
    await logActivity(user, {
      action: "requisition.create",
      target_type: "requisition",
      target_label: result.request_no,
      description: `ส่งคำขอ ${result.request_no} (${result.requisitions.length} รายการ): ${summary}`,
      details: {
        request_no: result.request_no,
        reason: input.reason,
        items: result.requisitions.map((r) => ({
          item_code: r.equipment?.item_code,
          name: r.equipment?.name,
          quantity: r.quantity,
        })),
      },
    });
    return json(result, 201);
  } catch (err) {
    return errorResponse(err);
  }
}

// PATCH /api/requisitions/:id  body: { status, note? }
// note บังคับเมื่อ status = "rejected"
export async function updateStatus(request: Request, id: string) {
  try {
    const { status, note } = updateRequisitionStatusSchema.parse(await readJson(request));
    if (status === "cancelled") {
      const user = await requireUser();
      const requisition = await cancelRequisition(id, user.id);
      const item = `${requisition.equipment?.name ?? "อุปกรณ์"} ×${requisition.quantity}`;
      await logActivity(user, {
        action: "requisition.cancel",
        target_type: "requisition",
        target_id: requisition.id,
        target_label: `${requisition.request_no} · ${requisition.equipment?.item_code ?? "-"}`,
        description: `ยกเลิกคำขอ ${requisition.request_no}: ${item}`,
        details: {
          request_no: requisition.request_no,
          item_code: requisition.equipment?.item_code,
          quantity: requisition.quantity,
        },
      });
      return json({ requisition });
    }

    const admin = await requireAdmin();
    const { requisition, stock } = await updateRequisitionStatus(id, status, {
      adminId: admin.id,
      note: status === "returned" ? "" : note,
    });

    const verb = STATUS_LOG[status];
    const item = `${requisition.equipment?.name ?? "อุปกรณ์"} ×${requisition.quantity}`;
    const stockText = stock ? ` (คงเหลือ ${stock.before} → ${stock.after})` : "";
    await logActivity(admin, {
      action: verb.action,
      target_type: "requisition",
      target_id: requisition.id,
      target_label: `${requisition.request_no} · ${requisition.equipment?.item_code ?? "-"}`,
      description: `${verb.label} ${requisition.request_no}: ${item} ของ ${requisition.user?.fullname ?? "-"}${stockText}${
        requisition.admin_note && status !== "returned" ? ` · หมายเหตุ: ${requisition.admin_note}` : ""
      }`,
      details: {
        request_no: requisition.request_no,
        item_code: requisition.equipment?.item_code,
        quantity: requisition.quantity,
        requester: requisition.user?.username,
        stock,
        note: status === "returned" ? undefined : requisition.admin_note || undefined,
      },
    });
    return json({ requisition });
  } catch (err) {
    return errorResponse(err);
  }
}
