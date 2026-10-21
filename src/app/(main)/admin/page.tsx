import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  PackageMinus,
  PackageOpen,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DailyColumnChart } from "@/components/charts/DailyColumnChart";
import { HorizontalBarList } from "@/components/charts/HorizontalBarList";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { StockBar } from "@/components/StockBar";
import { ACTION_LABELS } from "@/lib/log-labels";
import { getCurrentUser } from "@/lib/session";
import { getDashboardData } from "@/services/dashboard.service";
import type { RequisitionStatus } from "@/types";

const dateTime = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
const fullDate = new Intl.DateTimeFormat("th-TH", { dateStyle: "full", timeZone: "Asia/Bangkok" });

const STATUS_ORDER: RequisitionStatus[] = ["pending", "approved", "returned", "rejected", "cancelled"];

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") redirect("/");

  const data = await getDashboardData();
  const { kpi } = data;
  const inUsePercent = kpi.totalQty > 0 ? Math.round((kpi.inUseQty / kpi.totalQty) * 100) : 0;
  const dailyTotal = data.daily.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="แดชบอร์ด"
        description={`ภาพรวมระบบ ณ ${fullDate.format(new Date())}`}
        action={
          kpi.pendingItems > 0 && (
            <Link
              href="/admin/requisitions"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              พิจารณาคำขอ ({kpi.pendingItems})
              <ArrowRight className="h-4 w-4" />
            </Link>
          )
        }
      />

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={ClipboardCheck}
          tone="amber"
          label="รออนุมัติ"
          value={kpi.pendingItems}
          unit="รายการ"
          sub={`จาก ${kpi.pendingRequests} คำขอ`}
          href="/admin/requisitions"
        />
        <StatTile
          icon={CalendarDays}
          tone="indigo"
          label="ขอเบิกเดือนนี้"
          value={kpi.itemsThisMonth}
          unit="รายการ"
          sub={`${dailyTotal} รายการใน 14 วันล่าสุด`}
        />
        <StatTile
          icon={PackageOpen}
          tone="sky"
          label="ถูกเบิกออกไปอยู่"
          value={kpi.inUseQty}
          unit={`/ ${kpi.totalQty} ชิ้น`}
          meter={inUsePercent}
          sub={`${inUsePercent}% ของอุปกรณ์ทั้งหมด`}
        />
        <StatTile
          icon={PackageMinus}
          tone="rose"
          label="หมด / ใกล้หมด"
          value={kpi.outOfStock}
          unit={`หมด · ${kpi.lowStock} ใกล้หมด`}
          sub="ใกล้หมด = เหลือไม่เกิน 30%"
          href="/admin/equipments"
        />
      </div>

      {/* กราฟ */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="คำขอเบิกรายวัน" subtitle="จำนวนรายการที่ขอเบิก 14 วันล่าสุด" className="lg:col-span-2">
          <DailyColumnChart data={data.daily} />
        </Card>
        <Card title="สถานะคำขอทั้งหมด" subtitle="นับตามรายการอุปกรณ์">
          <HorizontalBarList
            unit="รายการ"
            items={STATUS_ORDER.map((s) => ({
              key: s,
              label: <StatusBadge status={s} />,
              value: data.statusCounts[s],
            }))}
          />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="อุปกรณ์ที่ถูกเบิกมากที่สุด" subtitle="รวมจำนวนชิ้นจากคำขอที่อนุมัติแล้ว (รวมที่คืนแล้ว)">
          <HorizontalBarList
            unit="ชิ้น"
            emptyText="ยังไม่มีการอนุมัติคำขอ"
            items={data.topEquipments.map((e) => ({
              key: e.item_code,
              label: (
                <span>
                  <span className="font-medium text-slate-800">{e.name}</span>{" "}
                  <span className="font-mono text-xs text-slate-400">{e.item_code}</span>
                </span>
              ),
              value: e.quantity,
            }))}
          />
        </Card>

        <Card
          title="อุปกรณ์ที่ต้องเติม"
          subtitle="หมดหรือเหลือไม่เกิน 30%"
          action={<CardLink href="/admin/equipments">จัดการอุปกรณ์</CardLink>}
        >
          {data.lowStockItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">สต็อกทุกรายการยังเพียงพอ</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.lowStockItems.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{e.name}</p>
                    <p className="font-mono text-xs text-slate-400">{e.item_code}</p>
                  </div>
                  <StockBar available={e.available_qty} total={e.total_qty} className="w-32 shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="คำขอรออนุมัติล่าสุด"
          action={<CardLink href="/admin/requisitions">ดูทั้งหมด</CardLink>}
        >
          {data.latestPending.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">ไม่มีคำขอที่รออนุมัติ</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.latestPending.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {r.equipment?.name ?? "(ถูกลบ)"} <span className="font-normal text-slate-500">×{r.quantity}</span>
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      <span className="font-mono text-indigo-600">{r.request_no}</span> · {r.user?.fullname} ·{" "}
                      {dateTime.format(new Date(r.created_at))}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="กิจกรรมล่าสุด" action={<CardLink href="/admin/logs">ดูประวัติทั้งหมด</CardLink>}>
          {data.recentLogs.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">ยังไม่มีกิจกรรม</p>
          ) : (
            <ol className="relative space-y-4 border-l border-slate-200 pl-5">
              {data.recentLogs.map((log) => (
                <li key={log.id} className="relative">
                  <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo-500" />
                  <p className="text-sm text-slate-800">
                    <span className="font-medium">{log.actor.fullname}</span>{" "}
                    <span className="text-slate-500">{ACTION_LABELS[log.action]}</span>
                  </p>
                  <p className="truncate text-xs text-slate-500" title={log.description}>
                    {log.description}
                  </p>
                  <p className="text-xs text-slate-400">{dateTime.format(new Date(log.created_at))}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}

const TONES = {
  amber: "bg-amber-50 text-amber-600",
  indigo: "bg-indigo-50 text-indigo-600",
  sky: "bg-sky-50 text-sky-600",
  rose: "bg-rose-50 text-rose-600",
};

function StatTile({
  icon: Icon,
  tone,
  label,
  value,
  unit,
  sub,
  meter,
  href,
}: {
  icon: LucideIcon;
  tone: keyof typeof TONES;
  label: string;
  value: number;
  unit: string;
  sub?: string;
  meter?: number;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${TONES[tone]}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        {value} <span className="text-sm font-normal tracking-normal text-slate-400">{unit}</span>
      </p>
      {meter !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-r-[4px] bg-[#2a78d6]" style={{ width: `${meter}%` }} />
        </div>
      )}
      {sub && <p className="mt-2 text-xs text-slate-500">{sub}</p>}
    </>
  );

  const className = "block rounded-xl border border-slate-200 bg-white p-5 shadow-sm";
  return href ? (
    <Link href={href} className={`${className} transition hover:border-indigo-300 hover:shadow`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function Card({
  title,
  subtitle,
  action,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="px-5 pb-5 pt-3">{children}</div>
    </section>
  );
}

function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700">
      {children}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}
