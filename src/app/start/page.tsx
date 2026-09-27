import Link from "next/link";
import type { ReactNode } from "react";
import { McpLink } from "@/components/docs/McpLink";
import { WalletPanel } from "@/components/WalletPanel";

export const metadata = { title: "Set up your agent · Halo" };

// The real path: your wallet owns the agent, you fund it, you plug it into your own assistant, you give it jobs.

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 border-t hair py-12 md:grid-cols-[120px_1fr]">
      <p className="font-serif text-5xl italic text-gold">{String(n).padStart(2, "0")}</p>
      <div className="min-w-0">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <div className="mt-3 leading-relaxed text-muted">{children}</div>
      </div>
    </section>
  );
}

export default function Start() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <p className="text-center text-xs uppercase tracking-[0.35em] text-gold">Get started</p>
      <h1 className="mt-4 text-balance text-center text-5xl font-semibold tracking-[-0.04em]">Set up your own protected agent</h1>
      <p className="mx-auto mt-5 max-w-xl text-center text-lg text-muted">
        Four steps. Your wallet owns the agent, you decide how much it can spend, and every purchase it makes is checked and
        refundable.
      </p>

      <div className="mt-14">
        <Step n={1} title="Connect your wallet">
          <p>Your wallet becomes the owner of your agent. Refunds go to it, and you can pull the agent&apos;s money back any time. Signing costs nothing.</p>
          <div className="mt-6">
            <WalletPanel />
          </div>
        </Step>

        <Step n={2} title="Fund your agent">
          <p>
            Send your agent the USDC it may spend, using <span className="text-fg">Top up agent</span> above. Keep it small: that is all it
            can ever spend. This runs on Base Sepolia, so get free test USDC from{" "}
            <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="text-gold underline decoration-gold/40">
              faucet.circle.com
            </a>{" "}
            (choose Base Sepolia).
          </p>
        </Step>

        <Step n={3} title="Connect your AI assistant">
          <p>Add Halo to Claude, ChatGPT or any MCP client. This link carries your key: whoever holds it can spend your agent&apos;s balance, so keep it private.</p>
          <McpLink variant="url" />
          <p className="mt-4">Claude Code:</p>
          <McpLink variant="claude" />
          <p className="mt-4">
            Then ask your assistant: <span className="text-fg">“Use Halo to get me 2 tickets for Neon Harbor on Oct 12, under $0.50 each.”</span> It writes
            the rules, asks you to confirm, and shops with protection.
          </p>
        </Step>

        <Step n={4} title="Or give it a job right here">
          <p>No assistant? Give your agent a job in the browser. It uses the money you funded it with.</p>
          <Link href="/try" className="mt-6 inline-block rounded-full bg-gold px-6 py-3 text-sm font-semibold text-bg shadow-[0_0_30px_-8px_var(--gold)]">
            Give your agent a job →
          </Link>
          <p className="mt-6 text-sm">
            Today Halo protects purchases from stores that publish a Halo catalog (four test stores on Base Sepolia). Every purchase shows up in{" "}
            <Link href="/dashboard" className="text-gold underline decoration-gold/40">
              My purchases
            </Link>
            .
          </p>
        </Step>
      </div>
    </div>
  );
}
