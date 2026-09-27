"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HaloLogo } from "./HaloMark";

const LINKS = [
  ["/try", "Try it"],
  ["/dashboard", "My purchases"],
  ["/pool", "Refund fund"],
  ["/docs", "Docs"],
] as const;

export function SiteHeader() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-500 ${scrolled ? "border-b hair bg-bg/70 backdrop-blur-xl" : "border-b border-transparent"}`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-sm">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <HaloLogo /> Halo
        </Link>
        <div className="flex items-center gap-4 sm:gap-6">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className={`transition-colors hover:text-fg ${path === href ? "text-fg" : "text-muted"} ${href === "/dashboard" ? "hidden sm:inline" : ""}`}>
              {label}
            </Link>
          ))}
          <Link href="/try" className="hidden rounded-full bg-gold px-4 py-1.5 font-medium text-bg shadow-[0_0_24px_-4px_var(--gold)] transition hover:brightness-110 sm:inline">
            Try it free
          </Link>
        </div>
      </nav>
    </header>
  );
}
