import { poolAddress, poolLedger, poolStats } from "@/lib/chain";

export const dynamic = "force-dynamic";

// PRD H4: the pool, computed from onchain events.
export default async function Pool() {
  let data;
  try {
    const [s, l] = await Promise.all([poolStats(), poolLedger()]);
    data = { ...s, ...l, address: poolAddress() };
  } catch (e) {
    return <p className="py-24 text-center text-muted">Pool not reachable: {String(e)}</p>;
  }
  const leverage = data.balance > 0 ? data.openCoverage / data.balance : 0;
  const rows: [string, string, string][] = [
    ["In the fund", `${data.balance.toFixed(2)} USDC`, "Money available for refunds (store deposits are kept separately)"],
    ["Store deposits", `${data.bonds.toFixed(2)} USDC`, "Trusted stores put these down; a store at fault pays the fund back from it"],
    ["Purchases protected", `${data.covered}`, `${data.volume.toFixed(2)} USDC of agent purchases, each paying 1% in`],
    ["Added by purchases", `${data.fees.toFixed(2)} USDC`, "1% of every protected purchase (at least 0.02)"],
    ["Refunded to people", `${data.claimsPaid.toFixed(2)} USDC`, `${data.claims} refund decisions so far`],
    ["Paid back by stores at fault", `${data.recovered.toFixed(2)} USDC`, "Taken from the deposit of the store that got it wrong"],
    ["Still protected right now", `${data.openCoverage.toFixed(2)} USDC`, "Purchases that can still be refunded (1 day window)"],
    ["Backing", `${leverage.toFixed(2)}x of 1x`, "Full reserve: the contract refuses new protection unless the fund can refund every open purchase"],
  ];
  const net = data.claimsPaid - data.recovered;
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-center text-xs uppercase tracking-[0.35em] text-gold">The refund fund</p>
      <h1 className="mt-4 text-balance text-center text-4xl font-bold sm:text-5xl">Where your refunds come from</h1>
      <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-muted">
        Every protected purchase adds 1% to this fund. So far it has refunded{" "}
        <span className="text-ok">{data.claimsPaid.toFixed(2)} USDC</span> to people, and the stores at fault paid back{" "}
        <span className="text-gold">{data.recovered.toFixed(2)} USDC</span> of it
        {net <= 0.001 ? ", so refunds have cost the fund nothing." : `, so refunds have cost the fund ${net.toFixed(2)} USDC.`}
      </p>
      <p className="mt-4 text-center text-sm text-muted">
        Read live from the{" "}
        <a className="underline decoration-dotted" href={`https://sepolia.basescan.org/address/${data.address}`} target="_blank" rel="noreferrer">
          HaloPool contract
        </a>{" "}
        on Base Sepolia ({data.events} events).
      </p>
      <h2 className="mt-14 text-sm uppercase tracking-[0.25em] text-muted">The details</h2>
      <dl className="mt-4 divide-y divide-line border-y hair">
        {rows.map(([k, v, d]) => (
          <div key={k} className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-3">
            <dt className="font-medium">{k}</dt>
            <dd className="font-mono">{v}</dd>
            <dd className="text-sm text-muted">{d}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
