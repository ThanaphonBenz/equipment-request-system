import type { NextRequest } from "next/server";
import { destroy, update } from "@/controllers/equipment.controller";

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/equipments/[id]">) {
  const { id } = await ctx.params;
  return update(request, id);
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/equipments/[id]">) {
  const { id } = await ctx.params;
  return destroy(id);
}
