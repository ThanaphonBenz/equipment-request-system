import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RequisitionTable } from "@/components/RequisitionTable";
import { getCurrentUser } from "@/lib/session";

export default async function AdminRequisitionsPage() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") redirect("/");

  return (
    <div className="space-y-6">
      <PageHeader
        title="พิจารณาคำขอเบิก"
        description="เมื่ออนุมัติ ระบบจะลดจำนวนคงเหลือให้อัตโนมัติ และคืนจำนวนเมื่อบันทึกการคืน"
      />
      <RequisitionTable mode="admin" initialStatus="pending" />
    </div>
  );
}
