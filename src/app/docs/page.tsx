import type { ReactNode } from "react";
import Link from "next/link";
import { McpLink } from "@/components/docs/McpLink";
import { MERCHANTS } from "@/lib/merchants";

export const metadata = { title: "Halo docs" };

const POOL = "0x80eD325076DF4eA062e60F74137Bc2c39A796387";
const OPERATOR = "0xf46b12f057df9c2E369eD26e583F6A12C74DD85e";
const OWNER = "0x877f050372C1E7d6254Ef59870D454A455b11897";
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const REPO = "https://github.com/jenzylove/halo";
const addr = (a: string) => `https://sepolia.basescan.org/address/${a}`;

const NAV: [string, string][] = [
  ["overview", "Overview"],
  ["lifecycle", "How it works"],
  ["quickstart", "Quickstart"],
  ["concepts", "Concepts"],
  ["serv", "SERV and evals"],
  ["contracts", "Contracts"],
  ["economics", "Economics and limits"],
  ["api", "API reference"],
  ["security", "Security model"],
  ["faq", "FAQ"],
];

function H2({ id, kicker, children }: { id: string; kicker: string; children: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-24 border-t hair pt-14">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">{kicker}</p>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{children}</h2>
    </div>
  );
}

const P = ({ children }: { children: ReactNode }) => <p className="mt-4 leading-relaxed text-muted">{children}</p>;
const H3 = ({ children }: { children: ReactNode }) => <h3 className="mt-10 text-lg font-semibold">{children}</h3>;
const Code = ({ children }: { children: string }) => (
  <pre className="mt-3 overflow-x-auto rounded-xl border hair bg-soft p-4 font-mono text-xs leading-relaxed">{children}</pre>
);
const C = ({ children }: { children: ReactNode }) => <code className="rounded bg-soft px-1.5 py-0.5 font-mono text-[0.85em] text-fg">{children}</code>;

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-xl border hair">
      <table className="w-full text-left text-sm">
        <thead className="bg-soft text-xs uppercase tracking-wider text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="px-4 py-3 align-top text-fg/85">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const STEPS = [
  ["Mandate", "You say what to buy. SERV turns it into terms; you confirm; the agent wallet signs; the operator locks the hash on Base."],
  ["Check", "The agent finds an offer. Hard rules, a lookalike check, a SERV injection screen and a SERV semantic match decide: approve, decline or ask you."],
  ["Cover", "An approval is recorded onchain; the agent signs a 1% fee (EIP-3009) that Halo relays into the pool. The guarantee is now active."],
  ["Pay", "The agent pays the merchant over x402 from its own wallet. Halo captures what was delivered and anchors its hash onchain."],
  ["Claim", "Halo compares delivery and mandate. A mismatch is claimed automatically; you can also claim by hand. The pool pays; merchant bonds pay the pool back."],
];

export default function Docs() {
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-[200px_1fr]">
      <aside className="hidden lg:block">
        <nav className="sticky top-24 space-y-1 text-sm">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-muted">Docs</p>
          {NAV.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="block rounded-lg px-3 py-1.5 text-muted transition hover:bg-soft hover:text-fg">
              {label}
            </a>
          ))}
          <a href={REPO} target="_blank" rel="noreferrer" className="mt-4 block px-3 py-1.5 text-gold">
            Source ↗
          </a>
        </nav>
      </aside>

      <article className="min-w-0 max-w-3xl">
        {/* ---------- overview ---------- */}
        <div id="overview" className="scroll-mt-24">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Halo docs</p>
          <h1 className="mt-4 text-balance text-5xl font-semibold tracking-[-0.03em]">
            Purchase protection for agents that pay in <span className="font-serif font-normal italic text-gold">USDC</span>.
          </h1>
          <P>
            AI agents now buy things for people and pay in stablecoins over x402. A USDC transfer is final: no refund button, no
            chargeback. When an agent pays a lookalike shop, falls for an instruction hidden in a listing, or receives the wrong
            thing, the money is simply gone.
          </P>
          <P>
            Halo sits between an agent and every purchase it makes. It turns what you asked for into a contract locked onchain,
            checks every checkout against it, guarantees what it approves, and pays you back from an onchain pool when a covered
            purchase goes wrong. Merchants that cause a loss repay the pool from their bond.
          </P>
          <div className="mt-8 grid gap-px overflow-hidden rounded-xl border hair bg-line sm:grid-cols-3">
            {[
              ["People", "who let an assistant shop for them"],
              ["Agent builders", "who want users to trust their agent with money"],
              ["Merchants", "who sell to agents and want to be chosen"],
            ].map(([t, d]) => (
              <div key={t} className="bg-bg p-5">
                <p className="font-serif text-2xl italic text-gold">{t}</p>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ---------- lifecycle ---------- */}
        <H2 id="lifecycle" kicker="How it works">
          Five steps, every one onchain
        </H2>
        <ol className="mt-8 space-y-0">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="relative grid grid-cols-[48px_1fr] gap-4 pb-8">
              {i < STEPS.length - 1 && <span className="absolute left-[23px] top-12 h-[calc(100%-40px)] w-px bg-gradient-to-b from-gold/50 to-line" />}
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-gold/10 font-serif text-xl italic text-gold">
                {i + 1}
              </span>
              <div className="pt-2">
                <p className="font-semibold">{t}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
              </div>
            </li>
          ))}
        </ol>
        <P>
          Purchase status moves through <C>mandated</C> → <C>approved</C> → <C>covered</C> → <C>delivered</C> → <C>ok</C> or{" "}
          <C>refunded</C>. Declined offers never move money.
        </P>

        {/* ---------- quickstart ---------- */}
        <H2 id="quickstart" kicker="Quickstart">
          Four ways in
        </H2>

        <H3>1. Try it in the browser (no setup)</H3>
        <P>
          Open <Link href="/try" className="text-gold underline">/try</Link>. Halo gives your browser session an agent wallet
          (a Coinbase CDP server wallet) and funds it with test USDC. Write a mandate, confirm it, let the agent shop at four demo
          stores. One is a lookalike scam, one delivers the wrong date.
        </P>

        <H3>2. Connect your own wallet (become the owner)</H3>
        <P>
          On <Link href="/try" className="text-gold underline">/try</Link> or <Link href="/dashboard" className="text-gold underline">/dashboard</Link>, click
          Connect wallet and sign one free message. Your wallet becomes the owner of your agent: refunds are forwarded to you
          automatically, you can top up the agent with USDC from your wallet, and withdraw its balance back to you at any time.
          Works with MetaMask, Coinbase Wallet or Rabby on Base Sepolia.
        </P>

        <H3>3. From Claude, ChatGPT or any MCP client</H3>
        <P>Your personal MCP server. The key in it controls your agent: keep it private like a password.</P>
        <McpLink variant="url" />
        <P>Claude Code:</P>
        <McpLink variant="claude" />
        <P>Then ask: “Use Halo to get me 2 tickets for Neon Harbor on Oct 12, under $0.50 each.”</P>

        <H3>4. From your agent&apos;s code (SDK)</H3>
        <P>
          Call <C>haloFetch</C> where your agent would pay an x402 URL. Halo checks the offer against the user&apos;s mandate, pays
          only if it fits, and pays the user back if the delivery is wrong.
        </P>
        <P>
          Scope today: Halo builds the offer it checks from the merchant&apos;s Halo catalog (<C>/m/&#123;slug&#125;/catalog</C>) and
          identity file (<C>/.well-known/halo.json</C>), so it covers merchants that publish both. The four demo stores do. Plain
          x402 endpoints without a catalog are not covered yet.
        </P>
        <Code>{`import { haloFetch } from "./sdk/halo";

const result = await haloFetch("https://shop.example/buy?item=42", {
  key: "hk_…",                // your Halo API key (Docs page)
  mandateId: "0x…",            // from halo_create_mandate + halo_confirm_mandate
});

result.status  // "ok" | "claimed" | "decline" | "ask_user" | "error"
result.delivery // what the merchant delivered
result.steps    // every decision and transaction, with reasons`}</Code>

        <H3>For merchants</H3>
        <P>
          Serve your payout address at <C>/.well-known/halo.json</C> and post a USDC bond to the pool. Protected agents prefer
          bonded merchants. Your bond is only touched when a claim verdict says you delivered something other than what you
          sold.
        </P>
        <Code>{`GET /.well-known/halo.json
{ "halo": 1, "name": "StageDoor", "slug": "stagedoor", "payTo": "0x8308…A72d" }`}</Code>

        {/* ---------- concepts ---------- */}
        <H2 id="concepts" kicker="Concepts">
          The words Halo uses
        </H2>
        <Table
          head={["Term", "Meaning"]}
          rows={[
            ["Mandate", "Structured terms for one shopping job: item, quantity, price ceilings, constraints (date, size, format…), seller rule, validity. Its hash is locked onchain before the agent acts."],
            ["Agent wallet", "A Coinbase CDP server wallet per user. It signs mandates (EIP-712), fees (EIP-3009) and x402 payments. It never needs ETH: Halo relays."],
            ["Owner", "The person's own wallet, linked by a signature. Refunds are forwarded there; it can top up and withdraw the agent wallet."],
            ["Checkout check", "Rules first (budget, quantity, expiry, currency, lookalike names), then SERV: an injection screen and a semantic match. Outcome: approve, decline or ask the user."],
            ["Coverage", "An approved purchase whose 1% fee reached the pool. Only covered purchases can be claimed, for 1 day."],
            ["Claim", "Automatic when the delivery contradicts the mandate, or filed by the user. SERV judges it; code clamps the payout to caps."],
            ["Bond", "USDC a merchant posts. Merchant fault verdicts slash it back into the pool."],
            ["Operator", "Halo's own CDP wallet. The only address that can record approvals and resolve claims."],
          ]}
        />

        {/* ---------- serv ---------- */}
        <H2 id="serv" kicker="SERV reasoning">
          Where SERV decides, and how well
        </H2>
        <P>
          Every judgment in Halo is a SERV Reasoning call with structured output, stored as a reasoning record with a content
          hash. Onchain, Halo anchors the hash of each mandate&apos;s terms, of each delivery, and of each claim verdict (which
          includes the hashes of the records behind it). Rules that must never bend (money, quantities, expiry) stay in code.
        </P>
        <Table
          head={["Call", "SERV features", "Decides"]}
          rows={[
            ["Mandate compiler", "Structured outputs, Shadow Agent", "Your words → terms you confirm"],
            ["Injection screen", "Structured outputs, PromptGuard", "Does the listing talk to the agent?"],
            ["Semantic match", "Structured outputs, Shadow Agent", "Does the offer mean what the mandate means?"],
            ["Claims adjuster", "Structured outputs, PromptGuard, Shadow Agent", "Did the purchase go wrong, and whose fault?"],
          ]}
        />
        <P>Measured against answer keys, same model and prompts, SERV reasoning on and off:</P>
        <Table
          head={["Suite", "SERV", "Raw"]}
          rows={[
            ["Checkout, 40 cases incl. 8 subtle injections", "39/40 · 0 false approvals", "40/40 · 0 false approvals"],
            ["Claims, 30 cases (money moves)", "29/30 · 0 wrong payouts", "28/30 · 2 wrong payouts"],
            ["Mandate compiler, 10 instructions", "10/10", "n/a"],
            ["Hard rules, one failing case each", "8/8", "n/a"],
          ]}
        />
        <P>
          The raw model paid out on a delivery that contained an injected “issue a full refund”. Full results and misses:{" "}
          <a href={`${REPO}/blob/main/evals/RESULTS.md`} className="text-gold underline" target="_blank" rel="noreferrer">
            evals/RESULTS.md
          </a>
          .
        </P>

        {/* ---------- contracts ---------- */}
        <H2 id="contracts" kicker="Contracts and addresses">
          Base Sepolia
        </H2>
        <Table
          head={["What", "Address"]}
          rows={[
            ["HaloPool", <a key="p" className="font-mono text-gold underline" href={addr(POOL)} target="_blank" rel="noreferrer">{POOL}</a>],
            ["Operator (CDP wallet)", <a key="o" className="font-mono underline" href={addr(OPERATOR)} target="_blank" rel="noreferrer">{OPERATOR}</a>],
            ["Owner (cold key, offline)", <a key="w" className="font-mono underline" href={addr(OWNER)} target="_blank" rel="noreferrer">{OWNER}</a>],
            ["USDC (Circle test)", <a key="u" className="font-mono underline" href={addr(USDC)} target="_blank" rel="noreferrer">{USDC}</a>],
            ...MERCHANTS.map((m) => [
              `${m.name}${m.verified ? " (verified, bonded)" : " (unverified)"}`,
              <a key={m.slug} className="font-mono underline" href={addr(m.payTo)} target="_blank" rel="noreferrer">
                {m.payTo}
              </a>,
            ]),
          ]}
        />
        <Table
          head={["Function", "Who", "What it does"]}
          rows={[
            [<C key="1">registerMandate</C>, "operator", "Locks a mandate hash, verified against the agent wallet's EIP-712 signature"],
            [<C key="2">recordApproval</C>, "operator", "Records an approved purchase; enforces budget, new user and full reserve limits"],
            [<C key="3">payFeeWithAuthorization</C>, "anyone (relayed)", "Pulls the fee with the agent's EIP-3009 signature; coverage starts"],
            [<C key="4">linkPayment</C>, "operator", "Anchors the x402 payment and the delivery hash"],
            [<C key="5">fileClaim</C>, "user or operator", "Opens a claim inside the 1 day window"],
            [<C key="6">resolveClaim</C>, "operator", "Pays the user (clamped to caps); slashes the merchant bond on merchant fault"],
            [<C key="7">depositBond / withdrawBond</C>, "merchant", "Bond in; out only after an unbond delay"],
            [<C key="8">release</C>, "anyone", "Frees capacity for expired approvals and closed claim windows"],
          ]}
        />
        <P>30 Foundry tests cover every money path. Events drive the public <Link href="/pool" className="text-gold underline">/pool</Link> page.</P>

        {/* ---------- economics ---------- */}
        <H2 id="economics" kicker="Economics and limits">
          How the pool stays solvent
        </H2>
        <P>
          Every covered purchase pays 1% (minimum 0.02 USDC) into the pool. Halo only guarantees what it checked, so a payout means
          Halo or the merchant got it wrong, and merchant faults are recovered from bonds. On a 50 USDC purchase with assumed claim
          rates, Halo keeps about 0.42 USDC.
        </P>
        <Table
          head={["Limit", "Demo value", "Why"]}
          rows={[
            ["Reserve", "open coverage ≤ 1× the fund (full reserve)", "Every protected dollar is already in the fund"],
            ["Per claim cap", "25 USDC", "No single event can drain the pool"],
            ["Per user cap", "50 USDC per 30 days", "Limits claim farming"],
            ["New users", "10 USDC per purchase for 7 days", "Fresh accounts cannot farm large claims"],
            ["Refund window", "1 day after the purchase", "Deliveries are checked instantly; you can still ask by hand for a day"],
            ["Unverified merchants", "0.20 USDC without asking you", "Unknown sellers need your approval"],
          ]}
        />
        <P>Demo prices are scaled down 10× because testnet USDC is scarce; demo merchant revenue is recycled into bonds and the treasury.</P>

        {/* ---------- api ---------- */}
        <H2 id="api" kicker="API reference">
          Endpoints
        </H2>
        <Table
          head={["Route", "Does"]}
          rows={[
            [<C key="1">POST /api/mandates</C>, "Compile an instruction into terms (or a question)"],
            [<C key="2">POST /api/mandates/:id/confirm</C>, "Sign and lock the mandate onchain (streams steps)"],
            [<C key="3">POST /api/mandates/:id/run</C>, "Hosted agent shops under the mandate (streams steps)"],
            [<C key="4">POST /api/pay</C>, "SDK entry (header x-halo-key): check, pay and guarantee one x402 URL"],
            [<C key="5">POST /api/purchases/:id/claim</C>, "File a claim with evidence (streams steps)"],
            [<C key="6">GET/POST /api/owner</C>, "Owner link, agent balance; POST links a wallet by signature"],
            [<C key="7">POST /api/owner/withdraw</C>, "Send the agent balance to the owner, gasless"],
            [<C key="8">GET /api/records/:id</C>, "Full SERV reasoning records for a mandate, purchase or claim"],
            [<C key="9">GET /api/pool</C>, "Pool numbers from chain events"],
            [<C key="10">/api/mcp?k=…</C>, "MCP server (streamable HTTP), identified by your API key"],
          ]}
        />
        <Table
          head={["MCP tool", "Does"]}
          rows={[
            [<C key="1">halo_create_mandate</C>, "Draft a mandate from the user's words"],
            [<C key="2">halo_confirm_mandate</C>, "Lock it onchain after the user confirms"],
            [<C key="3">halo_pay</C>, "Buy from an x402 URL with protection"],
            [<C key="4">halo_shop</C>, "Let Halo's agent shop the demo stores"],
            [<C key="5">halo_claim</C>, "Claim on a purchase that went wrong"],
            [<C key="6">halo_status</C>, "Purchases, claims and payouts"],
          ]}
        />

        {/* ---------- security ---------- */}
        <H2 id="security" kicker="Security model">
          What to trust, and what not to
        </H2>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted">
          <li>
            <span className="text-fg">Agent wallets are server wallets.</span> Halo&apos;s server can sign for them, which is what
            lets the agent act without you. Link your own wallet as owner so refunds and withdrawals land with you.
          </li>
          <li>
            <span className="text-fg">Your API key is delegated spending authority.</span> Whoever holds it (your assistant, or
            anyone you share it with) can approve rules and spend your agent&apos;s balance within them. The assistant is asked to
            confirm with you, but the key itself does not prove a human said yes. Keep it private and keep the agent&apos;s balance
            small.
          </li>
          <li>
            <span className="text-fg">The contract owner key is offline.</span> Changing the operator, the limits or pausing the pool
            needs a cold key that never touches the servers. The server keys can only operate within the contract&apos;s rules.
          </li>
          <li>
            <span className="text-fg">SERV cannot move money on its own.</span> Budget, quantity, expiry, caps and leverage are
            enforced in code and in the contract. SERV decides meaning; code decides limits.
          </li>
          <li>
            <span className="text-fg">Merchant text is untrusted.</span> Listings and deliveries are screened for instructions aimed
            at the agent or the adjuster.
          </li>
          <li>
            <span className="text-fg">Everything is recorded.</span> Mandate hashes, approvals, fees, payments, delivery hashes and
            verdict hashes are onchain; the words behind them are in the reasoning records.
          </li>
          <li>
            <span className="text-fg">Every protected dollar is backed.</span> The pool runs at full reserve: the contract refuses
            new protection unless the fund already holds enough to refund every open purchase. A refund Halo cannot decide stays open
            for a person to review; it is never denied automatically.
          </li>
          <li>
            <span className="text-fg">Abuse limits.</span> 3 new agent wallets per network per day, 25 per day overall, 20 mandate
            drafts per visitor per day.
          </li>
        </ul>

        {/* ---------- faq ---------- */}
        <H2 id="faq" kicker="FAQ">
          Questions
        </H2>
        {[
          ["Is this insurance?", "No. Halo guarantees its own approval decisions, the way fraud tools guarantee the orders they approve. If Halo approved it and it went wrong, Halo pays."],
          ["What if the merchant is honest and the user just changed their mind?", "Not covered. The adjuster checks the delivery against the mandate; a correct delivery is resolved as not covered, onchain."],
          ["Who funds the pool?", "Fees on every covered purchase, plus merchant bonds when merchants are at fault. The pool page shows every number from chain events."],
          ["Why do payouts not come from the agent?", "They come from the pool. The agent wallet is where the loss happened; the pool is what makes it whole."],
          ["Can I use real money?", "Not yet. Halo runs on Base Sepolia with test USDC."],
        ].map(([q, a]) => (
          <details key={q} className="group mt-4 rounded-xl border hair p-5 open:bg-soft/50">
            <summary className="cursor-pointer list-none font-medium">
              <span className="mr-2 text-gold transition group-open:rotate-45 inline-block">+</span>
              {q}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
          </details>
        ))}
      </article>
    </div>
  );
}
