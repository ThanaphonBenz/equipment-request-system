import type { NextRequest } from "next/server";
import { ApiError, errorResponse, json } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { listLogs } from "@/services/log.service";
import type { LogTargetType } from "@/types";

const TARGET_TYPES: LogTargetType[] = ["auth", "requisition", "equipment", "category"];

// GET /api/logs?type=requisition&q=REQ-&page=1  (admin)
export async function index(request: NextRequest) {
  try {
    await requireAdmin();
    const params = request.nextUrl.searchParams;

    const type = params.get("type");
    if (type && !TARGET_TYPES.includes(type as LogTargetType)) {
      throw new ApiError(400, "type ไม่ถูกต้อง");
    }
    const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
    const q = params.get("q")?.trim().slice(0, 100) || undefined;

    const result = await listLogs({ targetType: (type as LogTargetType) || undefined, q, page });
    return json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
