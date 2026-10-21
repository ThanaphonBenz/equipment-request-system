import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RequisitionTable } from "@/components/RequisitionTable";

export default async function MyRequisitionsPage({ searchParams }: PageProps<"/requisitions">) {
  const { created } = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="คำขอเบิกของฉัน"
        description="ติดตามสถานะคำขอที่ส่งไปแล้ว"
        action={
          <Link
            href="/requisitions/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            + ขอเบิกอุปกรณ์
          </Link>
        }
      />
      {created && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          ส่งคำขอเบิกเรียบร้อยแล้ว รอผู้ดูแลระบบพิจารณา
        </div>
      )}
      <RequisitionTable mode="mine" />
    </div>
  );
}
