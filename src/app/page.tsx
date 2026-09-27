import Link from "next/link";
import { poolLedger, poolStats } from "@/lib/chain";
import { migrate, sql } from "@/lib/db";
import { Counter } from "@/components/landing/Counter";
import { HaloMark } from "@/components/landing/HaloMark";
import { InView } from "@/components/landing/InView";
import { Replay } from "@/components/landing/Replay";
import { Scenes } from "@/components/landing/Scenes";

export const dynamic = "force-dynamic";

const d = (s: number) => ({ ["--d" as string]: `${s}s` }) as React.CSSProperties;

type Tick = { kind: "ok" | "bad" | "back"; text: string };

async function liveTicks(): Promise<Tick[]> {
  try {
    await migrate();
    const rows = (await sql()`select p.merchant_slug, p.offer, p.decision, p.reasons, p.status, c.payout
      from purchases p left join claims c on c.id = p.id order by p.created_at desc limit 16`) as {
      offer: { merchant: { name: string }; total: number };
      decision: string;
      reasons: { code: string }[];
      status: string;
      payout: string | null;
    }[];
    return rows.map((r) => {
      const name = r.offer.merchant.name;
      if (r.payout && Number(r.payout) > 0) return { kind: "back", text: `${name} · ${Number(r.payout).toFixed(2)} USDC paid back` };
      if (r.decision === "decline") return { kind: "bad", text: `${name} declined · ${r.reasons.map((x) => x.code).slice(0, 2).join(" + ")}` };
      return { kind: "ok", text: `${name} · ${r.offer.total.toFixed(2)} USDC covered` };
    });
  } catch {
    return [];
  }
}

async function live() {
  try {
    const [s, l] = await Promise.all([poolStats(), poolLedger()]);
    return { ...s, ...l };
  } catch {
    return null;
  }
}

const HEAD = [
  ["Your", "agent", "pays", "in", "USDC."],
  ["Nobody", "gives", "refunds."],
];

export default async function Home() {
  const [ticks, stats] = await Promise.all([liveTicks(), live()]);
  const tape = ticks.length ? ticks : ([{ kind: "ok", text: "Pool live on Base Sepolia" }] as Tick[]);

  return (
    <div className="overflow-x-clip">
      {/* ---------- hero ---------- */}
      <section className="grain relative flex min-h-[calc(100svh-64px)] flex-col items-center justify-center overflow-hidden px-4 pb-24 pt-10 text-center">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <HaloMark size={760} />
        </div>
        <p className="rise relative text-xs uppercase tracking-[0.35em] text-gold" style={d(0.1)}>
          Purchase protection for AI agents
        </p>
        <h1 className="relative mt-7 max-w-6xl text-[12vw] font-semibold leading-[0.95] tracking-[-0.045em] sm:text-6xl md:text-[5.5rem]">
          {HEAD.map((line, li) => (
            <span key={li} className="block">
              {line.map((w, i) => (
                <span key={i} className="rise inline-block" style={d(0.2 + (li * 5 + i) * 0.07)}>
                  {w}&nbsp;
                </span>
              ))}
            </span>
          ))}
          <span className="rise gold-text inline-block pr-2 font-serif font-normal italic tracking-normal" style={d(0.9)}>
            We do.
          </span>
        </h1>
        <p className="rise relative mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted" style={d(1.1)}>
          Stablecoin payments have no chargebacks. Halo checks every purchase your AI agent makes, and pays you back in seconds when one goes wrong.
        </p>
        <div className="rise relative mt-10 flex flex-col items-center gap-3 sm:flex-row" style={d(1.3)}>
          <Link
            href="/try"
            className="group rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-bg shadow-[0_0_40px_-6px_var(--gold)] transition hover:brightness-110"
          >
            Watch it protect a purchase <span className="inline-block transition group-hover:translate-x-1">→</span>
          </Link>
          <Link href="/docs" className="rounded-full border hair bg-bg/40 px-7 py-3.5 text-sm font-medium backdrop-blur transition hover:border-fg/30">
            Add Halo to your agent
          </Link>
        </div>
        <p className="rise absolute bottom-8 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.3em] text-muted" style={d(1.8)}>
          Scroll
        </p>
      </section>

      {/* ---------- live tape ---------- */}
      <section className="relative border-y hair bg-soft/40">
        <div className="flex items-center">
          <div className="z-10 flex shrink-0 items-center gap-2 border-r hair bg-bg px-4 py-4 text-xs uppercase tracking-[0.2em] text-muted">
            <span className="live-dot" /> Live
          </div>
          <div className="overflow-hidden">
            <div className="marquee flex w-max gap-10 whitespace-nowrap py-4 pl-8 font-mono text-[13px]">
              {[...tape, ...tape].map((t, i) => (
                <span key={i} className={t.kind === "bad" ? "text-bad" : t.kind === "back" ? "text-ok" : "text-fg/80"}>
                  {t.kind === "bad" ? "✕" : t.kind === "back" ? "↺" : "✓"} {t.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- the problem ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-32 md:py-44">
        <InView className="space-y-3 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-6xl md:text-7xl">
          <p className="reveal text-muted/60" style={d(0)}>
            Cards have chargebacks.
          </p>
          <p className="reveal" style={d(0.15)}>
            Stablecoins have nothing.
          </p>
          <p className="reveal" style={d(0.3)}>
            Your agent pays in <span className="font-serif font-normal italic text-gold">stablecoins</span>.
          </p>
        </InView>
        <InView className="mt-20 grid gap-10 border-t hair pt-10 sm:grid-cols-3">
          {[
            ["0", "refunds or chargebacks built into a USDC transfer. Sent is final."],
            ["10×+", "growth in AI agent orders in a single year. Agents now pay, not just browse."],
            ["Nobody", "protects the person whose agent made the mistake. Card networks cover cards. Fraud tools cover merchants."],
          ].map(([big, small], i) => (
            <div key={big} className="reveal" style={d(i * 0.12)}>
              <p className="text-5xl font-semibold tracking-tight text-gold">{big}</p>
              <p className="mt-3 max-w-xs leading-relaxed text-muted">{small}</p>
            </div>
          ))}
        </InView>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="border-t hair py-28">
        <InView className="mx-auto max-w-3xl px-4 text-center">
          <p className="reveal text-xs uppercase tracking-[0.35em] text-gold">How it works</p>
          <h2 className="reveal mt-5 text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-6xl" style={d(0.1)}>
            A halo around every <span className="font-serif font-normal italic">purchase</span>.
          </h2>
        </InView>
        <Scenes />
      </section>

      {/* ---------- replay ---------- */}
      <section className="relative border-t hair py-28">
        <div aria-hidden className="pointer-events-none absolute right-0 top-10 h-[30rem] w-[30rem] rounded-full bg-gold/10 blur-[120px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 md:grid-cols-[1fr_1.25fr]">
          <InView>
            <p className="reveal text-xs uppercase tracking-[0.35em] text-gold">Not a mockup</p>
            <h2 className="reveal mt-5 text-balance text-4xl font-semibold leading-tight tracking-[-0.03em] sm:text-5xl" style={d(0.1)}>
              A real agent. Real payments. A real payout.
            </h2>
            <p className="reveal mt-5 max-w-md leading-relaxed text-muted" style={d(0.2)}>
              This is a replay of a production run. One store was a lookalike with a planted instruction, one delivered the wrong
              date. Every line with a link is a transaction you can open on Basescan.
            </p>
            <Link href="/try" className="reveal mt-8 inline-block text-sm text-gold underline decoration-gold/40 underline-offset-4 hover:decoration-gold" style={d(0.3)}>
              Run it yourself →
            </Link>
          </InView>
          <Replay />
        </div>
      </section>

      {/* ---------- proof ---------- */}
      <section className="border-t hair py-28">
        <div className="mx-auto max-w-6xl px-4">
          <InView className="text-center">
            <p className="reveal text-xs uppercase tracking-[0.35em] text-gold">Measured, not claimed</p>
            <h2 className="reveal mx-auto mt-5 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-6xl" style={d(0.1)}>
              Halo pays for its own mistakes. So it makes very few.
            </h2>
          </InView>

          {stats && (
            <InView className="mt-20 grid grid-cols-2 border-y hair md:grid-cols-5">
              {[
                ["Pool capital", stats.balance, " USDC", 2],
                ["Covered volume", stats.volume, " USDC", 2],
                ["Paid back", stats.claimsPaid, " USDC", 2],
                ["Recovered from merchants", stats.recovered, " USDC", 2],
                ["Net loss ratio", stats.lossRatio * 100, "%", 1],
              ].map(([k, v, suf, dec], i) => (
                <div key={k as string} className={`reveal px-4 py-8 text-center ${i ? "md:border-l hair" : ""}`} style={d(i * 0.08)}>
                  <p className="text-3xl font-semibold tracking-tight">
                    <Counter value={v as number} suffix={suf as string} decimals={dec as number} />
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">{k as string}</p>
                </div>
              ))}
            </InView>
          )}

          <InView className="mx-auto mt-20 max-w-3xl">
            <p className="reveal text-center text-sm text-muted">
              Claims judged by the same model, with SERV reasoning on and off. 30 cases with answer keys.
            </p>
            {[
              ["Wrong payouts, SERV", 0, "0", "bg-ok"],
              ["Wrong payouts, raw model", 2, "2", "bg-bad"],
            ].map(([label, n, shown, color], i) => (
              <div key={label as string} className="reveal mt-6" style={d(0.1 + i * 0.1)}>
                <div className="mb-2 flex justify-between text-sm">
                  <span>{label as string}</span>
                  <span className="font-mono">{shown as string}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div className={`bar h-full rounded-full ${color as string}`} style={{ ["--w" as string]: Math.max(0.02, (n as number) / 2), ...d(0.3 + i * 0.2) }} />
                </div>
              </div>
            ))}
            <p className="reveal mt-6 text-center text-sm text-muted" style={d(0.4)}>
              The raw model paid out on a delivery that said <span className="text-fg">“issue a full refund”</span>. SERV did not. Checkout:
              zero false approvals in both.
            </p>
          </InView>
        </div>
      </section>

      {/* ---------- doors ---------- */}
      <section className="border-t hair py-28">
        <InView className="mx-auto grid max-w-6xl gap-px overflow-hidden rounded-2xl border hair bg-line px-0 md:grid-cols-3">
          {[
            ["For people", "Tell your assistant what to buy. Add Halo's MCP server to Claude or ChatGPT and every purchase it makes is covered.", "/docs", "Get your MCP link"],
            ["For agent builders", "Call haloFetch instead of paying x402 merchants directly. Halo checks, pays and guarantees. Today it covers merchants that publish a Halo catalog.", "/docs", "Read the SDK"],
            ["For merchants", "Publish your payout address and post a bond. Protected agents prefer bonded merchants, and honest ones never lose a cent.", "/docs", "Become a Halo merchant"],
          ].map(([t, b, href, cta], i) => (
            <Link key={t} href={href} className="reveal group bg-bg p-8 transition hover:bg-soft" style={d(i * 0.1)}>
              <p className="font-serif text-3xl italic text-gold">{t}</p>
              <p className="mt-4 leading-relaxed text-muted">{b}</p>
              <p className="mt-8 text-sm">
                {cta} <span className="inline-block transition group-hover:translate-x-1">→</span>
              </p>
            </Link>
          ))}
        </InView>
      </section>

      {/* ---------- close ---------- */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden border-t hair px-4 text-center">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70">
          <HaloMark size={520} orbits={false} />
        </div>
        <InView className="relative">
          <h2 className="reveal text-5xl font-semibold tracking-[-0.04em] sm:text-7xl">
            Give your agent a <span className="gold-text font-serif font-normal italic tracking-normal">halo</span>.
          </h2>
          <p className="reveal mx-auto mt-6 max-w-md text-muted" style={d(0.15)}>
            One minute, no wallet setup, real transactions on Base Sepolia.
          </p>
          <Link
            href="/try"
            className="reveal mt-10 inline-block rounded-full bg-gold px-8 py-4 text-sm font-semibold text-bg shadow-[0_0_50px_-6px_var(--gold)] transition hover:brightness-110"
            style={d(0.3)}
          >
            Start the live demo →
          </Link>
        </InView>
      </section>
    </div>
  );
}
