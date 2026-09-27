import { merchantBySlug } from "@/lib/merchants";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const m = merchantBySlug((await ctx.params).slug);
  if (!m) return Response.json({ error: "unknown merchant" }, { status: 404 });
  return Response.json({
    merchant: { slug: m.slug, name: m.name },
    listings: m.listings.map(({ id, title, description, attributes, unitPrice }) => ({
      id,
      title,
      description,
      attributes,
      unitPrice,
      currency: "USDC",
      buy: `/m/${m.slug}/buy?listing=${id}&qty={qty}`,
    })),
  });
}
