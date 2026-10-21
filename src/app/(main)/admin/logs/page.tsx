import { redirect } from "next/navigation";
import { ActivityLogList } from "@/components/ActivityLogList";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/session";

export default async function AdminLogsPage() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") redirect("/");

  return (
    <div className="space-y-6">
      <PageHeader
        title="ประวัติการใช้งาน"
        description="บันทึกการเข้าสู่ระบบ การส่งและพิจารณาคำขอ และการแก้ไขอุปกรณ์ ย้อนหลังทั้งหมด"
      />
      <ActivityLogList />
    </div>
  );
}
