import { connectDB } from "@/lib/mongodb";
import { EquipmentModel } from "@/models/Equipment";
import { RequisitionModel } from "@/models/Requisition";
import { listLogs } from "@/services/log.service";
import { listRequisitions } from "@/services/requisition.service";
import { toEquipmentDTO } from "@/services/equipment.service";
import type { ActivityLogDTO, EquipmentDTO, RequisitionDTO, RequisitionStatus } from "@/types";

const TIMEZONE = "Asia/Bangkok";
const DAILY_RANGE = 14;
const LOW_STOCK_RATIO = 0.3;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface DashboardData {
  kpi: {
    pendingItems: number;
    pendingRequests: number;
    itemsThisMonth: number;
    inUseQty: number;
    totalQty: number;
    outOfStock: number;
    lowStock: number;
  };
  daily: { date: string; count: number }[];
  statusCounts: Record<RequisitionStatus, number>;
  topEquipments: { item_code: string; name: string; quantity: number }[];
  lowStockItems: EquipmentDTO[];
  latestPending: RequisitionDTO[];
  recentLogs: ActivityLogDTO[];
}

// วันที่ในรูปแบบ YYYY-MM-DD ตามเวลาไทย
function bangkokDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(date);
}

export async function getDashboardData(): Promise<DashboardData> {
  await connectDB();

  const now = new Date();
  const today = bangkokDate(now);
  const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00+07:00`);
  // เวลาไทยไม่มี daylight saving จึงบวกลบทีละ 24 ชั่วโมงได้ตรงๆ
  const rangeStart = new Date(new Date(`${today}T00:00:00+07:00`).getTime() - (DAILY_RANGE - 1) * DAY_MS);

  const [statusAgg, pendingRequestNos, itemsThisMonth, dailyAgg, stockAgg, topAgg, lowStockDocs, pending, logs] =
    await Promise.all([
      RequisitionModel.aggregate<{ _id: RequisitionStatus; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      RequisitionModel.distinct("request_no", { status: "pending" }),
      RequisitionModel.countDocuments({ created_at: { $gte: monthStart } }),
      // จำนวนรายการที่ขอเบิกต่อวัน (ตามเวลาไทย)
      RequisitionModel.aggregate<{ _id: string; count: number }>([
        { $match: { created_at: { $gte: rangeStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at", timezone: TIMEZONE } },
            count: { $sum: 1 },
          },
        },
      ]),
      EquipmentModel.aggregate<{ total: number; available: number; out: number; low: number }>([
        // สต็อกปัจจุบัน: ไม่นับอุปกรณ์ที่เก็บเข้าคลังแล้ว
        { $match: { deleted_at: null } },
        {
          $group: {
            _id: null,
            total: { $sum: "$total_qty" },
            available: { $sum: "$available_qty" },
            // หมด/ใกล้หมด นับเฉพาะอุปกรณ์ที่แสดงให้เบิก (ที่ซ่อนอยู่ไม่ต้องเติม)
            out: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "available"] }, { $eq: ["$available_qty", 0] }] }, 1, 0] } },
            low: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "available"] },
                      { $gt: ["$available_qty", 0] },
                      { $lte: ["$available_qty", { $multiply: ["$total_qty", LOW_STOCK_RATIO] }] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      // อุปกรณ์ที่ถูกเบิกออกไปมากที่สุด (นับคำขอที่อนุมัติแล้วและคืนแล้ว)
      RequisitionModel.aggregate<{ quantity: number; item_code: string; name: string }>([
        { $match: { status: { $in: ["approved", "returned"] } } },
        { $group: { _id: "$equipment_id", quantity: { $sum: "$quantity" } } },
        { $sort: { quantity: -1 } },
        { $limit: 5 },
        { $lookup: { from: "equipments", localField: "_id", foreignField: "_id", as: "equipment" } },
        { $unwind: "$equipment" },
        { $project: { _id: 0, quantity: 1, item_code: "$equipment.item_code", name: "$equipment.name" } },
      ]),
      // อุปกรณ์ที่หมดหรือเหลือไม่เกิน 30% เรียงจากเหลือน้อยสุด
      EquipmentModel.aggregate([
        { $match: { status: "available", deleted_at: null, total_qty: { $gt: 0 }, $expr: { $lte: ["$available_qty", { $multiply: ["$total_qty", LOW_STOCK_RATIO] }] } } },
        { $addFields: { ratio: { $divide: ["$available_qty", "$total_qty"] } } },
        { $sort: { ratio: 1, item_code: 1 } },
        { $limit: 5 },
      ]),
      listRequisitions({ status: "pending" }),
      listLogs({ page: 1 }),
    ]);

  const statusCounts: Record<RequisitionStatus, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
    returned: 0,
    cancelled: 0,
  };
  for (const s of statusAgg) statusCounts[s._id] = s.count;

  // เติมวันที่ไม่มีคำขอให้เป็น 0
  const countsByDate = new Map(dailyAgg.map((d) => [d._id, d.count]));
  const daily = Array.from({ length: DAILY_RANGE }, (_, i) => {
    const key = bangkokDate(new Date(rangeStart.getTime() + i * DAY_MS));
    return { date: key, count: countsByDate.get(key) ?? 0 };
  });

  const stock = stockAgg[0] ?? { total: 0, available: 0, out: 0, low: 0 };

  return {
    kpi: {
      pendingItems: statusCounts.pending,
      pendingRequests: pendingRequestNos.length,
      itemsThisMonth,
      inUseQty: stock.total - stock.available,
      totalQty: stock.total,
      outOfStock: stock.out,
      lowStock: stock.low,
    },
    daily,
    statusCounts,
    topEquipments: topAgg,
    lowStockItems: lowStockDocs.map(toEquipmentDTO),
    latestPending: pending.slice(0, 5),
    recentLogs: logs.logs.slice(0, 6),
  };
}
