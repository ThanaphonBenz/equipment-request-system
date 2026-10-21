import { connectDB } from "@/lib/mongodb";
import { ActivityLogModel, type ActivityLog } from "@/models/ActivityLog";
import type { ActivityLogDTO, LogAction, LogTargetType, UserDTO } from "@/types";
import type { QueryFilter } from "mongoose";

export const LOG_PAGE_SIZE = 20;

export interface LogEntry {
  action: LogAction;
  target_type: LogTargetType;
  target_id?: string;
  target_label: string;
  description: string;
  details?: Record<string, unknown>;
}

// บันทึก log แบบ best-effort: ถ้าบันทึกไม่สำเร็จจะไม่ทำให้งานหลักล้มเหลว
export async function logActivity(actor: UserDTO, entry: LogEntry): Promise<void> {
  try {
    await connectDB();
    await ActivityLogModel.create({
      actor_id: actor.id,
      actor_username: actor.username,
      actor_fullname: actor.fullname,
      ...entry,
    });
  } catch (err) {
    console.error("บันทึก activity log ไม่สำเร็จ", err);
  }
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listLogs(filter: {
  targetType?: LogTargetType;
  q?: string;
  page: number;
}): Promise<{ logs: ActivityLogDTO[]; total: number; page: number; pageSize: number }> {
  await connectDB();

  const query: QueryFilter<ActivityLog> = {};
  if (filter.targetType) query.target_type = filter.targetType;
  if (filter.q) {
    const re = new RegExp(escapeRegex(filter.q), "i");
    query.$or = [{ description: re }, { target_label: re }, { actor_username: re }, { actor_fullname: re }];
  }

  const [docs, total] = await Promise.all([
    ActivityLogModel.find(query)
      .sort({ created_at: -1, _id: -1 })
      .skip((filter.page - 1) * LOG_PAGE_SIZE)
      .limit(LOG_PAGE_SIZE)
      .lean(),
    ActivityLogModel.countDocuments(query),
  ]);

  const logs = docs.map((d) => ({
    id: String(d._id),
    actor: { id: String(d.actor_id), username: d.actor_username, fullname: d.actor_fullname },
    action: d.action,
    target_type: d.target_type,
    target_id: d.target_id ? String(d.target_id) : null,
    target_label: d.target_label,
    description: d.description,
    details: d.details ?? null,
    created_at: d.created_at.toISOString(),
  }));

  return { logs, total, page: filter.page, pageSize: LOG_PAGE_SIZE };
}
