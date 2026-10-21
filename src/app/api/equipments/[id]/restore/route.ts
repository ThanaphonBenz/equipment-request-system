import type { NextRequest } from "next/server";
import { restore } from "@/controllers/equipment.controller";

export async function POST(_request: NextRequest, ctx: RouteContext<"/api/equipments/[id]/restore">) {
  const { id } = await ctx.params;
  return restore(id);
}
