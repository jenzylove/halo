import { ImageResponse } from "next/og";

export const alt = "Halo: let an AI agent shop for you. If it buys the wrong thing, you get your money back.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The share card for links on X and elsewhere.
export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#07070a", color: "#f4f1ea", fontFamily: "sans-serif", position: "relative" }}>
        <div style={{ position: "absolute", width: 560, height: 560, borderRadius: 9999, border: "3px solid rgba(242,193,78,0.55)", boxShadow: "0 0 120px rgba(242,193,78,0.25)" }} />
        <div style={{ fontSize: 26, letterSpacing: 8, color: "#f2c14e", textTransform: "uppercase" }}>Refunds for AI agent purchases</div>
        <div style={{ fontSize: 76, fontWeight: 700, marginTop: 28, textAlign: "center", lineHeight: 1.05, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span>Let an AI agent shop for you.</span>
          <span style={{ color: "#8b8880" }}>If it buys the wrong thing,</span>
          <span style={{ color: "#f2c14e", fontStyle: "italic" }}>you get your money back.</span>
        </div>
        <div style={{ marginTop: 36, fontSize: 24, color: "#8b8880" }}>halo · SERV reasoning · Coinbase AgentKit · x402 on Base</div>
      </div>
    ),
    size,
  );
}
