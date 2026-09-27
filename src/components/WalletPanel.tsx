"use client";

import { useCallback, useEffect, useState } from "react";
import { encodeFunctionData, erc20Abi, parseUnits, type Hex } from "viem";

// The owner layer in the UI: connect a browser wallet, link it to your agent, top up, withdraw.
// No wallet library: a plain EIP-1193 provider (MetaMask, Coinbase Wallet, Rabby).

type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
const eth = () => (typeof window !== "undefined" ? (window as unknown as { ethereum?: Eth }).ethereum : undefined);

const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const BASE_SEPOLIA = {
  chainId: "0x14a34",
  chainName: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"],
};
const scan = (tx: string) => `https://sepolia.basescan.org/tx/${tx}`;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

interface State {
  agent: string;
  owner: string | null;
  agentUsdc: number;
  link: { issued: string; message: string };
}

export function WalletPanel({ compact = false }: { compact?: boolean }) {
  const [s, setS] = useState<State | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ text: string; tx?: string; bad?: boolean } | null>(null);
  const [amount, setAmount] = useState("1");

  const load = useCallback(() => fetch("/api/owner").then((r) => r.json()).then(setS), []);
  useEffect(() => {
    load();
  }, [load]);

  async function ensureChain(p: Eth) {
    try {
      await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BASE_SEPOLIA.chainId }] });
    } catch {
      await p.request({ method: "wallet_addEthereumChain", params: [BASE_SEPOLIA] });
    }
  }

  async function connect() {
    const p = eth();
    if (!p) return setNote({ text: "No browser wallet found. Install MetaMask or Coinbase Wallet, or keep using Halo without one.", bad: true });
    setBusy("Connecting");
    setNote(null);
    try {
      const [address] = (await p.request({ method: "eth_requestAccounts" })) as string[];
      const fresh = (await fetch("/api/owner").then((r) => r.json())) as State;
      const signature = (await p.request({ method: "personal_sign", params: [fresh.link.message, address] })) as string;
      const r = await fetch("/api/owner", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, signature, issued: fresh.link.issued }),
      }).then((r) => r.json());
      if (r.error) setNote({ text: r.error, bad: true });
      else setNote({ text: `Linked. Refunds now go to ${short(address)}.` });
      await load();
    } catch (e) {
      setNote({ text: (e as { message?: string }).message ?? String(e), bad: true });
    } finally {
      setBusy(null);
    }
  }

  async function topUp() {
    const p = eth();
    if (!p || !s?.owner) return;
    setBusy("Waiting for your wallet");
    setNote(null);
    try {
      await ensureChain(p);
      const [from] = (await p.request({ method: "eth_requestAccounts" })) as string[];
      const data = encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [s.agent as Hex, parseUnits(amount || "0", 6)] });
      const tx = (await p.request({ method: "eth_sendTransaction", params: [{ from, to: USDC, data }] })) as string;
      setNote({ text: `Sent ${amount} USDC to your agent.`, tx });
      setTimeout(load, 4000);
    } catch (e) {
      setNote({ text: (e as { message?: string }).message ?? String(e), bad: true });
    } finally {
      setBusy(null);
    }
  }

  async function withdraw() {
    setBusy("Withdrawing");
    setNote(null);
    try {
      const r = await fetch("/api/owner/withdraw", { method: "POST" }).then((r) => r.json());
      if (r.error) setNote({ text: r.error, bad: true });
      else setNote({ text: `Withdrew ${r.amount.toFixed(2)} USDC to ${short(r.to)}.`, tx: r.tx });
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (!s) return null;

  return (
    <div className={`rounded-2xl border hair bg-soft/60 ${compact ? "p-4" : "p-6"}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 text-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Your agent</p>
          <p className="font-mono">
            <a className="underline decoration-dotted" href={`https://sepolia.basescan.org/address/${s.agent}`} target="_blank" rel="noreferrer">
              {short(s.agent)}
            </a>{" "}
            · <span className="text-gold">{s.agentUsdc.toFixed(2)} USDC</span>
          </p>
          <p className="text-muted">
            Owner:{" "}
            {s.owner ? (
              <span className="font-mono text-ok">{short(s.owner)}</span>
            ) : (
              <span>not linked. Halo still works, refunds stay in the agent wallet.</span>
            )}
          </p>
        </div>
        {!s.owner ? (
          <button onClick={connect} disabled={!!busy} className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-bg shadow-[0_0_30px_-8px_var(--gold)] disabled:opacity-50">
            Connect wallet
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-20 rounded-full border hair bg-transparent px-3 py-2 text-right font-mono text-sm outline-none focus:border-gold"
              aria-label="USDC to send"
            />
            <button onClick={topUp} disabled={!!busy} className="rounded-full border hair px-4 py-2 text-sm hover:border-gold disabled:opacity-50">
              Top up agent
            </button>
            <button onClick={withdraw} disabled={!!busy} className="rounded-full border hair px-4 py-2 text-sm hover:border-gold disabled:opacity-50">
              Withdraw to me
            </button>
          </div>
        )}
      </div>
      {(busy || note) && (
        <p className={`mt-3 text-sm ${note?.bad ? "text-bad" : "text-muted"}`}>
          {busy ? `${busy}…` : note?.text}{" "}
          {note?.tx && (
            <a className="underline" href={scan(note.tx)} target="_blank" rel="noreferrer">
              view tx
            </a>
          )}
        </p>
      )}
    </div>
  );
}
