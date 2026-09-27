import type { ReactNode } from "react";
import { InView } from "./InView";

// How it works: four scenes, each animating its own little piece of the real flow when it scrolls into view.

const d = (s: number) => ({ ["--d" as string]: `${s}s` }) as React.CSSProperties;

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="relative rounded-2xl border hair bg-soft/70 p-5 font-mono text-[12.5px] shadow-[0_30px_80px_-40px_rgba(242,193,78,0.35)] backdrop-blur sm:p-6">
      {children}
    </div>
  );
}

function Row({ k, v, delay }: { k: string; v: string; delay: number }) {
  return (
    <div className="beat flex justify-between border-b hair py-2 last:border-0" style={d(delay)}>
      <span className="text-muted">{k}</span>
      <span>{v}</span>
    </div>
  );
}

const SCENES: { n: string; title: string; body: string; visual: ReactNode }[] = [
  {
    n: "01",
    title: "Say what you want. It becomes a contract.",
    body: "SERV turns your words into a mandate: the item, how many, the price ceiling, every detail that has to match. You confirm it in plain words, your agent wallet signs it, and it is locked on Base before a single cent moves. Nobody can rewrite it afterwards, including us.",
    visual: (
      <Panel>
        <p className="beat mb-3 text-xs uppercase tracking-[0.2em] text-muted" style={d(0)}>
          Mandate
        </p>
        <Row k="item" v="Neon Harbor tickets" delay={0.15} />
        <Row k="quantity" v="2" delay={0.3} />
        <Row k="max each" v="0.50 USDC" delay={0.45} />
        <Row k="date" v="2026-10-12" delay={0.6} />
        <Row k="sellers" v="verified only" delay={0.75} />
        <div className="beat mt-4 flex items-center gap-3 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-gold" style={d(1.1)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          signed and locked on Base
        </div>
      </Panel>
    ),
  },
  {
    n: "02",
    title: "Every checkout goes through Halo first.",
    body: "Hard rules that no model can override: budget, quantity, expiry, lookalike names. Then SERV reads the listing the way a careful person would, and screens it for instructions planted for your agent. What passes is guaranteed. What fails never gets paid.",
    visual: (
      <Panel>
        {[
          { name: "StageDo0r", price: "0.78", ok: false, note: "lookalike · injected listing" },
          { name: "SeatSwap", price: "0.90", ok: true, note: "event ✓ date ✓ qty ✓" },
          { name: "StageDoor", price: "0.95", ok: true, note: "event ✓ date ✓ qty ✓" },
        ].map((m, i) => (
          <div key={m.name} className="beat relative flex items-center justify-between border-b hair py-3 last:border-0" style={d(0.2 + i * 0.35)}>
            <div>
              <p className={m.ok ? "" : "text-bad"}>{m.name}</p>
              <p className="text-[11px] text-muted">{m.note}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted">{m.price}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${m.ok ? "border-ok/60 text-ok" : "border-bad/60 text-bad"}`}>
                {m.ok ? "approved" : "declined"}
              </span>
            </div>
            {!m.ok && <span className="strike absolute left-0 right-40 top-1/2 h-px bg-bad/70" style={d(0.8)} />}
          </div>
        ))}
      </Panel>
    ),
  },
  {
    n: "03",
    title: "Your agent pays. Halo covers it.",
    body: "The agent pays the merchant over x402, straight from its own wallet. A 1% fee flows into an onchain pool and the guarantee switches on. Your agent never needs ETH: Halo relays the fee signature for it.",
    visual: (
      <Panel>
        <p className="beat text-muted" style={d(0)}>
          GET /m/seatswap/buy?qty=2
        </p>
        <p className="beat mt-1 text-warn" style={d(0.3)}>
          402 Payment Required · 0.90 USDC · base-sepolia
        </p>
        <div className="beat relative my-6 h-px bg-line" style={d(0.6)}>
          <span className="packet absolute -top-[5px] h-[11px] w-[11px] rounded-full bg-gold shadow-[0_0_18px_var(--gold)]" />
          <span className="absolute -top-5 left-0 text-[10px] text-muted">agent wallet</span>
          <span className="absolute -top-5 right-0 text-[10px] text-muted">merchant</span>
        </div>
        <p className="beat text-ok" style={d(0.9)}>
          200 OK · settled onchain
        </p>
        <p className="beat mt-1 text-gold" style={d(1.2)}>
          fee 0.02 → pool · purchase covered
        </p>
      </Panel>
    ),
  },
  {
    n: "04",
    title: "Wrong delivery? You are paid back in seconds.",
    body: "The moment goods arrive, Halo compares them with your mandate. A mismatch becomes a claim with no forms and no waiting. The pool pays you in USDC. If the merchant was at fault, its bond pays the pool back.",
    visual: (
      <Panel>
        <div className="grid grid-cols-2 gap-3">
          <div className="beat rounded-lg border hair p-3" style={d(0.1)}>
            <p className="text-[10px] uppercase tracking-widest text-muted">you asked</p>
            <p className="mt-1 text-lg">2026-10-12</p>
          </div>
          <div className="beat rounded-lg border border-bad/50 bg-bad/10 p-3" style={d(0.4)}>
            <p className="text-[10px] uppercase tracking-widest text-bad">delivered</p>
            <p className="mt-1 text-lg text-bad">2026-10-21</p>
          </div>
        </div>
        <p className="beat mt-4 text-muted" style={d(0.8)}>
          verdict: not as mandated · merchant at fault
        </p>
        <div className="beat relative mt-4 flex items-center justify-between rounded-lg border border-ok/40 bg-ok/10 px-3 py-3 text-ok" style={d(1.1)}>
          <span className="font-semibold">+0.90 USDC paid back</span>
          <span className="text-[11px] opacity-80">bond slashed −0.90</span>
          <span className="coin absolute right-6 top-2 text-base" style={d(1.3)}>
            ●
          </span>
        </div>
      </Panel>
    ),
  },
];

export function Scenes() {
  return (
    <div className="relative mx-auto max-w-6xl px-4">
      <div aria-hidden className="absolute bottom-0 left-4 top-0 w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent md:left-1/2" />
      <div className="space-y-28 py-10 md:space-y-40">
        {SCENES.map((s, i) => (
          <InView key={s.n} className="scene grid items-center gap-10 md:grid-cols-2 md:gap-20" threshold={0.35}>
            <div className={`beat pl-8 md:pl-0 ${i % 2 ? "md:order-2" : ""}`} style={d(0)}>
              <p className="font-serif text-5xl italic text-gold">{s.n}</p>
              <h3 className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{s.title}</h3>
              <p className="mt-4 max-w-md leading-relaxed text-muted">{s.body}</p>
            </div>
            <div className={`pl-8 md:pl-0 ${i % 2 ? "md:order-1" : ""}`}>{s.visual}</div>
          </InView>
        ))}
      </div>
    </div>
  );
}
