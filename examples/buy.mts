// Usage: HALO_KEY=hk_... HALO_MANDATE=0x... HALO_BASE=https://... npx tsx examples/buy.mts
import { haloFetch } from "../sdk/halo";

const base = process.env.HALO_BASE ?? "http://localhost:3000";
const result = await haloFetch(process.env.HALO_URL ?? `${base}/m/stagedoor/buy?listing=nh-1012&qty=2`, {
  key: process.env.HALO_KEY!,
  mandateId: process.env.HALO_MANDATE!,
  base,
});

console.log(result.status, result.delivery);
for (const s of result.steps) console.log(" ", JSON.stringify(s));
