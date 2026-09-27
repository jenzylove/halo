"use client";

import { useEffect, useRef, useState } from "react";

// A replay of a real production run (the transactions are on Base Sepolia).
type Line = { t: "cmd" | "info" | "ok" | "bad" | "tx" | "back"; text: string; href?: string };

const SCAN = "https://sepolia.basescan.org/tx/";
const LINES: Line[] = [
  { t: "cmd", text: "“Get me 2 tickets for Neon Harbor on Oct 12, under $0.50 each”" },
  { t: "info", text: "rules  2 tickets · Neon Harbor · Oct 12 · max $0.50 each" },
  { t: "tx", text: "rules saved on Base", href: `${SCAN}0x12eb93f281bf2d848dec57ca876db78e677f3d445fc02842c1c5ef373f2de294` },
  { t: "info", text: "agent tries StageDo0r · $0.78 · the cheapest" },
  { t: "bad", text: "BLOCKED  fake store copying “StageDoor”, and its listing tells the agent to ignore the budget" },
  { t: "info", text: "agent tries SeatSwap · $0.90" },
  { t: "ok", text: "ALLOWED  matches your rules · purchase protected" },
  { t: "tx", text: "agent paid $0.90", href: `${SCAN}0x295766f56ec71e92875d09c323ff3e2b148f413f7bfd0f56dcb96f2fdf5076bc` },
  { t: "bad", text: "ARRIVED  tickets for Oct 21, but you asked for Oct 12" },
  { t: "back", text: "REFUNDED  $0.90 to you · SeatSwap pays the fund back", href: `${SCAN}0x6bc1bab4310504598c8aa28ec3c086a61f31d88a7c555ced45fd85ab4c08765a` },
  { t: "info", text: "agent tries StageDoor · $0.95" },
  { t: "ok", text: "ALLOWED → paid → 2 tickets for Oct 12 · done" },
];

const color: Record<Line["t"], string> = {
  cmd: "text-fg",
  info: "text-muted",
  ok: "text-ok",
  bad: "text-bad",
  tx: "text-gold",
  back: "text-ok font-semibold",
};

const prefix: Record<Line["t"], string> = { cmd: "›", info: "·", ok: "✓", bad: "✕", tx: "⛓", back: "↺" };

export function Replay() {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    const step = (i: number) => {
      setN(i);
      timer = setTimeout(() => step(i >= LINES.length ? 0 : i + 1), i >= LINES.length ? 4200 : i === 0 ? 700 : 950);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        step(1);
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={ref} className="relative overflow-hidden rounded-2xl border hair bg-soft/80 shadow-[0_0_80px_-20px_rgba(242,193,78,0.25)] backdrop-blur">
      <div className="flex items-center gap-2 border-b hair px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-bad/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-ok/70" />
        <span className="ml-3 font-mono text-xs text-muted">halo · a real run on Base</span>
      </div>
      <ol className="min-h-[360px] space-y-2 p-5 font-mono text-[12.5px] leading-relaxed sm:text-[13px]">
        {LINES.slice(0, n).map((l, i) => (
          <li key={i} className={`rise flex gap-3 ${color[l.t]}`} style={{ ["--d" as string]: "0s" }}>
            <span className="w-3 shrink-0 opacity-70">{prefix[l.t]}</span>
            {l.href ? (
              <a href={l.href} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-4 hover:opacity-80">
                {l.text}
              </a>
            ) : (
              <span>{l.text}</span>
            )}
          </li>
        ))}
        {n < LINES.length && <li className="caret text-muted" />}
      </ol>
    </div>
  );
}
