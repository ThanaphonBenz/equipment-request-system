import type { NextRequest } from "next/server";
import { destroy, update } from "@/controllers/category.controller";

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/categories/[id]">) {
  const { id } = await ctx.params;
  return update(request, id);
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/categories/[id]">) {
  const { id } = await ctx.params;
  return destroy(id);
}
