import { merchantBySlug } from "@/lib/merchants";

// PRD E1: a merchant proves it controls its storefront by publishing its payout address here.
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const m = merchantBySlug((await ctx.params).slug);
  if (!m) return Response.json({ error: "unknown merchant" }, { status: 404 });
  return Response.json({ halo: 1, name: m.name, slug: m.slug, payTo: m.payTo });
}
