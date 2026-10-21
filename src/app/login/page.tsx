import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentUser } from "@/lib/session";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/");

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-indigo-700">ระบบเบิกจ่ายอุปกรณ์</h1>
          <p className="mt-1 text-sm text-slate-500">เข้าสู่ระบบเพื่อใช้งาน</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
