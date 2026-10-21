import type { NextRequest } from "next/server";
import { updateStatus } from "@/controllers/requisition.controller";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/requisitions/[id]">) {
  const { id } = await ctx.params;
  return updateStatus(request, id);
}
