"use client";

import { useEffect, useState } from "react";

/** The visitor's personal MCP URL (tied to their Halo session and agent wallet). */
export function McpLink({ variant }: { variant: "url" | "claude" }) {
  const [v, setV] = useState({ uid: "…", origin: "" });
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((m) => setV({ uid: m.userId, origin: window.location.origin }));
  }, []);
  const url = `${v.origin}/api/mcp?u=${v.uid}`;
  const text = variant === "url" ? url : `claude mcp add --transport http halo "${url}"`;
  return (
    <div className="group relative mt-3">
      <pre className="overflow-x-auto rounded-xl border hair bg-soft p-4 pr-20 font-mono text-xs leading-relaxed">{text}</pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute right-3 top-3 rounded-full border hair bg-bg px-3 py-1 text-xs text-muted hover:text-gold"
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}
