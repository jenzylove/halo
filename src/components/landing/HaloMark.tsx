/** The halo: a slow burning ring with payments orbiting through it. Mint passes, red gets turned away. */
export function HaloMark({ size = 620, orbits = true }: { size?: number; orbits?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none relative" style={{ width: size, height: size, maxWidth: "92vw", maxHeight: "92vw" }}>
      <div className="halo-glow" />
      <div className="halo-track" />
      <div className="halo-ring" />
      <div className="halo-ring slow" style={{ inset: "7%" }} />
      <div className="halo-track" style={{ inset: "7%", opacity: 0.6 }} />
      {orbits && (
        <>
          <div className="orbit" style={{ ["--dur" as string]: "11s" }}>
            <i />
          </div>
          <div className="orbit" style={{ ["--dur" as string]: "17s", ["--delay" as string]: "-6s", ["--c" as string]: "var(--gold-2)" }}>
            <i />
          </div>
          <div className="orbit" style={{ inset: "7%", ["--dur" as string]: "13s", ["--delay" as string]: "-3s", ["--c" as string]: "var(--bad)" }}>
            <i />
          </div>
          <div className="orbit" style={{ inset: "7%", ["--dur" as string]: "23s", ["--delay" as string]: "-11s" }}>
            <i />
          </div>
        </>
      )}
    </div>
  );
}

export function HaloLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-block h-5 w-5 ${className}`} aria-hidden>
      <span className="absolute inset-0 rounded-full border-2 border-gold shadow-[0_0_14px_rgba(242,193,78,0.55)]" />
      <span className="absolute inset-[5px] rounded-full bg-gold/15" />
    </span>
  );
}
