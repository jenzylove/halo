import { recordsFor } from "@/lib/db";

// PRD G3: the full reasoning record behind any mandate, approval or claim.
export async function GET(_req: Request, ctx: { params: Promise<{ subject: string }> }) {
  return Response.json({ records: await recordsFor((await ctx.params).subject) });
}
