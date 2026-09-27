import Link from "next/link";

const POOL = "0x80eD325076DF4eA062e60F74137Bc2c39A796387";
const REPO = "https://github.com/jenzylove/halo";

const COLS: [string, [string, string][]][] = [
  [
    "Product",
    [
      ["Get started", "/start"],
      ["Try the demo", "/try"],
      ["My purchases", "/dashboard"],
      ["Refund fund", "/pool"],
    ],
  ],
  [
    "Build",
    [
      ["MCP server", "/docs"],
      ["SDK", "/docs"],
      ["Merchants", "/docs"],
      ["Source", REPO],
    ],
  ],
  [
    "Proof",
    [
      ["HaloPool on Basescan", `https://sepolia.basescan.org/address/${POOL}`],
      ["Eval results", `${REPO}/blob/main/evals/RESULTS.md`],
      ["PRD audit", `${REPO}/blob/main/docs/AUDIT.md`],
    ],
  ],
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t hair">
      <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-10 pt-20 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="max-w-xs text-2xl font-semibold leading-snug tracking-tight">
            Let an AI agent shop for you. <span className="font-serif font-normal italic text-gold">Wrong buy? Money back.</span>
          </p>
          <Link href="/start" className="mt-5 inline-block text-sm text-gold underline decoration-gold/40 underline-offset-4 hover:decoration-gold">
            Set up your agent →
          </Link>
        </div>
        {COLS.map(([title, links]) => (
          <div key={title}>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">{title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {links.map(([label, href]) => (
                <li key={label}>
                  {href.startsWith("/") ? (
                    <Link href={href} className="text-fg/80 transition hover:text-gold">
                      {label}
                    </Link>
                  ) : (
                    <a href={href} target="_blank" rel="noreferrer" className="text-fg/80 transition hover:text-gold">
                      {label} ↗
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div aria-hidden className="relative select-none px-4 text-center">
        <p
          className="gold-text font-semibold leading-[0.8] tracking-[-0.06em] opacity-80"
          style={{
            fontSize: "clamp(6rem, 26vw, 22rem)",
            WebkitMaskImage: "linear-gradient(to bottom, #000 15%, transparent 92%)",
            maskImage: "linear-gradient(to bottom, #000 15%, transparent 92%)",
          }}
        >
          halo
        </p>
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-2 border-t hair px-4 py-6 text-xs text-muted sm:flex-row sm:justify-between">
        <span>Test USDC on Base Sepolia. Demo prices scaled down for testnet.</span>
        <span>Reasoning by SERV · Wallets by Coinbase AgentKit · Payments over x402</span>
      </div>
    </footer>
  );
}
