import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These load optional chain SDKs at runtime; bundling them breaks on imports they never use here.
  serverExternalPackages: ["@coinbase/cdp-sdk", "@coinbase/agentkit", "x402", "@solana/kit"],
};

export default nextConfig;
