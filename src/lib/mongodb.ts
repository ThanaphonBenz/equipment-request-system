import mongoose from "mongoose";

// ระหว่าง `next dev` โมดูลถูกโหลดใหม่ทุกครั้งที่แก้ไฟล์
// จึงเก็บ connection ไว้ใน global เพื่อไม่ให้เปิด connection ใหม่ซ้ำเรื่อยๆ
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as { mongoose?: MongooseCache };
const cache: MongooseCache = globalForMongoose.mongoose ?? { conn: null, promise: null };
globalForMongoose.mongoose = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("ไม่พบ MONGODB_URI กรุณาตั้งค่าในไฟล์ .env.local");
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, { bufferCommands: false });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}
