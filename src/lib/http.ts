import { ZodError, z } from "zod";

// error ที่ตั้งใจโยนจาก service/controller พร้อม HTTP status
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function json<T>(data: T, status = 200) {
  return Response.json(data, { status });
}

// แปลง error ทุกชนิดให้เป็น JSON response รูปแบบเดียวกัน: { error, details? }
export function errorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return json({ error: err.message, details: err.details }, err.status);
  }
  if (err instanceof ZodError) {
    return json(
      { error: "ข้อมูลไม่ถูกต้อง", details: z.flattenError(err).fieldErrors },
      400,
    );
  }
  console.error(err);
  return json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" }, 500);
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "รูปแบบ JSON ไม่ถูกต้อง");
  }
}
