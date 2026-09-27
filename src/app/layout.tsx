import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Halo",
  description: "Purchase protection for AI agents paying in USDC. If your agent's purchase goes wrong, you are paid back in seconds.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b hair">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 text-sm">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="inline-block h-4 w-4 rounded-full border-2 border-fg" /> Halo
            </Link>
            <div className="flex gap-5 text-muted">
              <Link href="/try" className="hover:text-fg">Try it</Link>
              <Link href="/dashboard" className="hover:text-fg">Dashboard</Link>
              <Link href="/pool" className="hover:text-fg">Pool</Link>
              <Link href="/docs" className="hover:text-fg">Docs</Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t hair">
          <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-muted">
            Halo runs on Base Sepolia with test USDC. Reasoning by SERV. Wallets by Coinbase AgentKit. Payments over x402.
          </div>
        </footer>
      </body>
    </html>
  );
}
