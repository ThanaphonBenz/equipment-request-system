import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import type { Role, UserDTO } from "@/types";

type UserDoc = { _id: unknown; username: string; fullname: string; role: string };

function toDTO(doc: UserDoc): UserDTO {
  return {
    id: String(doc._id),
    username: doc.username,
    fullname: doc.fullname,
    role: doc.role as Role,
  };
}

export async function findUserById(id: string): Promise<UserDTO | null> {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const doc = await UserModel.findById(id).lean();
  return doc ? toDTO(doc) : null;
}

export async function findUserByUsername(username: string): Promise<UserDTO | null> {
  await connectDB();
  const doc = await UserModel.findOne({ username: username.toLowerCase() }).lean();
  return doc ? toDTO(doc) : null;
}
