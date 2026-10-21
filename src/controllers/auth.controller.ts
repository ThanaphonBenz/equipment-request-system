import { ApiError, errorResponse, json, readJson } from "@/lib/http";
import { createSession, destroySession, requireUser } from "@/lib/session";
import { loginSchema } from "@/lib/validations";
import { logActivity } from "@/services/log.service";
import { findUserByUsername } from "@/services/user.service";

// POST /api/auth/login
export async function login(request: Request) {
  try {
    const { username } = loginSchema.parse(await readJson(request));
    const user = await findUserByUsername(username);
    if (!user) throw new ApiError(401, "ไม่พบชื่อผู้ใช้นี้ในระบบ");
    await createSession(user.id);
    await logActivity(user, {
      action: "auth.login",
      target_type: "auth",
      target_id: user.id,
      target_label: user.username,
      description: "เข้าสู่ระบบ",
    });
    return json({ user });
  } catch (err) {
    return errorResponse(err);
  }
}

// POST /api/auth/logout
export async function logout() {
  try {
    await destroySession();
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

// GET /api/auth/me
export async function me() {
  try {
    const user = await requireUser();
    return json({ user });
  } catch (err) {
    return errorResponse(err);
  }
}
