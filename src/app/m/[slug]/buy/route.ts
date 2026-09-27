import { merchantBySlug } from "@/lib/merchants";
import { collect, paymentRequired, paymentResponseHeader, requirements } from "@/lib/x402server";

// A paid x402 endpoint: 402 with payment requirements, then goods once the payment settles.
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const m = merchantBySlug((await ctx.params).slug);
  if (!m) return Response.json({ error: "unknown merchant" }, { status: 404 });
  const url = new URL(req.url);
  const listing = m.listings.find((l) => l.id === url.searchParams.get("listing"));
  const qty = Math.max(1, Math.min(10, Number(url.searchParams.get("qty") || 1)));
  if (!listing) return Response.json({ error: "unknown listing" }, { status: 404 });

  const req402 = requirements({
    priceUsdc: Math.round(listing.unitPrice * qty * 100) / 100,
    payTo: m.payTo,
    resource: `${url.origin}${url.pathname}?listing=${listing.id}&qty=${qty}`,
    description: `${qty} x ${listing.title} from ${m.name}`,
  });
  const header = req.headers.get("x-payment");
  if (!header) return paymentRequired(req402);

  const paid = await collect(header, req402);
  if (!paid.ok) return paid.response;
  return Response.json(
    { merchant: m.name, listing: listing.id, quantity: qty, delivery: m.deliver(listing, qty, paid.payer) },
    { headers: { "X-PAYMENT-RESPONSE": paymentResponseHeader(paid.tx, paid.payer) } },
  );
}
