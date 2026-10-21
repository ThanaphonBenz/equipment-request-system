import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ApiError } from "@/lib/http";
import { findUserById } from "@/services/user.service";
import type { UserDTO } from "@/types";

// session แบบง่าย: เก็บ user id ใน cookie แล้วเซ็นด้วย HMAC กันการปลอมค่า
const COOKIE_NAME = "session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 ชั่วโมง

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("ไม่พบ SESSION_SECRET กรุณาตั้งค่าในไฟล์ .env.local");
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function verify(token: string): string | null {
  const [value, signature] = token.split(".");
  if (!value || !signature) return null;
  const expected = Buffer.from(sign(value));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return value;
}

export async function createSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, `${userId}.${sign(userId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<UserDTO | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const userId = verify(token);
  if (!userId) return null;
  return findUserById(userId);
}

export async function requireUser(): Promise<UserDTO> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "กรุณาเข้าสู่ระบบ");
  return user;
}

export async function requireAdmin(): Promise<UserDTO> {
  const user = await requireUser();
  if (user.role !== "admin") throw new ApiError(403, "เฉพาะผู้ดูแลระบบเท่านั้น");
  return user;
}
