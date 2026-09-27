import Link from "next/link";
import { PoolStrip } from "@/components/PoolStrip";

export const revalidate = 30;

const steps = [
  ["Say what you want", "\"2 tickets for Oct 12, under $5 each.\" Halo turns it into a contract and locks it onchain before your agent spends a cent."],
  ["Halo checks every checkout", "Lookalike shops, injected listings, wrong dates and over budget carts are declined. What passes is guaranteed."],
  ["Wrong delivery? Paid back", "Halo compares what arrived with what you asked for. If it is wrong, you are paid back from the pool in seconds."],
];

export default function Home() {
  return (
    <div>
      <section className="mx-auto max-w-3xl px-4 pb-16 pt-24 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Purchase protection for AI agents</p>
        <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Your agent pays in USDC.
          <br />
          Nobody gives refunds.
          <br />
          We do.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
          Stablecoin payments have no chargebacks. Halo checks every purchase your agent makes and pays you back when one goes
          wrong.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/try" className="rounded-full bg-fg px-6 py-3 text-sm font-medium text-bg">
            Try it with a live agent
          </Link>
          <Link href="/docs" className="rounded-full border hair px-6 py-3 text-sm font-medium">
            Add Halo to your agent
          </Link>
        </div>
      </section>

      <PoolStrip />

      <section className="mx-auto grid max-w-5xl gap-10 px-4 py-20 sm:grid-cols-3">
        {steps.map(([t, d], i) => (
          <div key={t} className="border-t hair pt-5">
            <p className="font-mono text-xs text-muted">0{i + 1}</p>
            <h2 className="mt-2 text-lg font-semibold">{t}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
          </div>
        ))}
      </section>

      <section className="border-t hair">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Halo pays for its own mistakes</h2>
          <p className="mt-4 text-muted">
            Every covered purchase pays a 1% fee into an onchain pool. Halo only guarantees purchases it checked, so a payout means
            Halo got it wrong or the merchant did. When the merchant did, its bond pays the pool back.
          </p>
          <Link href="/pool" className="mt-6 inline-block text-sm underline">
            See the pool, live from the chain
          </Link>
        </div>
      </section>
    </div>
  );
}
