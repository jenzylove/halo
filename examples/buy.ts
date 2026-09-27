// Usage: HALO_USER=... HALO_MANDATE=0x... HALO_BASE=https://... npx tsx examples/buy.ts
import { haloFetch } from "../sdk/halo";

const base = process.env.HALO_BASE ?? "http://localhost:3000";
const result = await haloFetch(`${base}/m/stagedoor/buy?listing=nh-1012&qty=2`, {
  user: process.env.HALO_USER!,
  mandateId: process.env.HALO_MANDATE!,
  base,
});

console.log(result.status, result.delivery);
for (const s of result.steps) console.log(" ", JSON.stringify(s));
