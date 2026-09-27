import { NextResponse, type NextRequest } from "next/server";

// Give every browser its Halo session id on its very first request, before any page or API code runs.
// Without this, parallel first requests each mint their own id and split one person across two agent wallets.
export function proxy(request: NextRequest) {
  if (request.cookies.get("halo_uid")) return NextResponse.next();
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const headers = new Headers(request.headers);
  headers.set("cookie", [request.headers.get("cookie"), `halo_uid=${id}`].filter(Boolean).join("; "));
  const res = NextResponse.next({ request: { headers } });
  res.cookies.set("halo_uid", id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return res;
}

export const config = {
  // Pages and the app's own APIs; not static files, merchant endpoints or the MCP server (which identifies by ?u=).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|m/|api/mcp).*)"],
};
