// ตัวช่วยเรียก API จากฝั่ง client: แปลง response ที่ไม่ใช่ 2xx เป็น ApiClientError

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, string[] | undefined>,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      // session หมดอายุ: โหลดหน้าใหม่ทั้งหน้าไปที่ login (ฟังก์ชันนี้ไม่ได้อยู่ใน component จึงใช้ router ไม่ได้)
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }
    throw new ApiClientError(res.status, body.error ?? "เกิดข้อผิดพลาด", body.details);
  }
  return body as T;
}
