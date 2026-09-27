"use client";

import { useEffect, useState } from "react";

export default function Docs() {
  const [uid, setUid] = useState<string>("…");
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/me")
      .then((r) => r.json())
      .then((m) => setUid(m.userId));
  }, []);
  const mcp = `${origin}/api/mcp?u=${uid}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-center text-4xl font-bold tracking-tight">Add Halo to your agent</h1>
      <p className="mt-3 text-center text-muted">Two doors: one for people using an assistant, one for people building agents.</p>

      <section className="mt-14 border-t hair pt-8">
        <h2 className="text-xl font-semibold">For your AI assistant (MCP)</h2>
        <p className="mt-2 text-sm text-muted">
          Add this server to Claude, ChatGPT or any MCP client. It is tied to your Halo id and your agent wallet.
        </p>
        <Code>{mcp}</Code>
        <p className="mt-4 text-sm text-muted">Claude Code:</p>
        <Code>{`claude mcp add --transport http halo "${mcp}"`}</Code>
        <p className="mt-4 text-sm text-muted">Then just ask:</p>
        <Code>{`"Use Halo to get me 2 tickets for Neon Harbor on Oct 12, under $0.50 each."`}</Code>
        <p className="mt-4 text-sm text-muted">
          Tools: <span className="font-mono">halo_create_mandate</span>, <span className="font-mono">halo_confirm_mandate</span>,{" "}
          <span className="font-mono">halo_pay</span>, <span className="font-mono">halo_shop</span>,{" "}
          <span className="font-mono">halo_claim</span>, <span className="font-mono">halo_status</span>.
        </p>
      </section>

      <section className="mt-14 border-t hair pt-8">
        <h2 className="text-xl font-semibold">For agent builders (SDK)</h2>
        <p className="mt-2 text-sm text-muted">Swap your x402 payment call for haloFetch. Everything else stays the same.</p>
        <Code>{`import { haloFetch } from "./sdk/halo";

const result = await haloFetch("https://shop.example/buy?item=42", {
  user: "${uid}",
  mandateId: "0x…", // from halo_create_mandate + halo_confirm_mandate
  base: "${origin}",
});

if (result.status === "ok") use(result.delivery);      // covered purchase
if (result.status === "claimed") notifyUser(result);   // wrong delivery, already paid back
if (result.status === "decline") explain(result.steps); // Halo refused to pay`}</Code>
      </section>

      <section className="mt-14 border-t hair pt-8">
        <h2 className="text-xl font-semibold">For merchants</h2>
        <p className="mt-2 text-sm text-muted">
          Publish your payout address at <span className="font-mono">/.well-known/halo.json</span> and post a USDC bond to the pool.
          Protected agents prefer bonded merchants. Your bond is only touched when a claim is your fault.
        </p>
        <Code>{`{ "halo": 1, "name": "StageDoor", "slug": "stagedoor", "payTo": "0x…" }`}</Code>
      </section>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return <pre className="mt-3 overflow-x-auto bg-soft p-4 font-mono text-xs leading-relaxed">{children}</pre>;
}
