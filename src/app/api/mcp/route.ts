import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { confirmMandate, draftMandate, ensureUser, manualClaim, purchase, runAgent, type Step } from "@/lib/halo";
import { migrate, sql } from "@/lib/db";

export const maxDuration = 300;

// PRD H5: Halo as an MCP server. Add https://<host>/api/mcp?u=<your id> to Claude or ChatGPT.

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

function describe(steps: Step[]): string {
  return steps
    .map((s) => {
      switch (s.kind) {
        case "info":
          return s.text;
        case "tx":
          return `${s.label}: https://sepolia.basescan.org/tx/${s.tx}`;
        case "offer":
          return `Offer: ${s.title} from ${s.merchant}, ${s.total.toFixed(2)} USDC`;
        case "decision":
          return `Halo ${s.decision.toUpperCase()} ${s.merchant}: ${s.reasons.map((r) => r.text).join(" ")}`;
        case "delivered":
          return `Delivered by ${s.merchant}: ${JSON.stringify(s.delivery)}`;
        case "verdict":
          return `Delivery check: ${s.verdict.covered ? `${s.verdict.type}, pays ${s.verdict.payout} USDC` : "matches the mandate"}. ${s.verdict.reason}`;
        case "payout":
          return `Paid back ${s.amount} USDC: https://sepolia.basescan.org/tx/${s.tx}`;
      }
    })
    .join("\n");
}

function build(uid: string, origin: string) {
  const server = new McpServer({ name: "halo", version: "1.0.0" });
  const collect = () => {
    const steps: Step[] = [];
    return { steps, onStep: (s: Step) => void steps.push(s) };
  };

  server.registerTool(
    "halo_create_mandate",
    {
      description:
        "Turn the user's shopping instruction into a Halo mandate (what the agent may buy, max price, constraints). Show the summary to the user and ask them to confirm before calling halo_confirm_mandate.",
      inputSchema: { instruction: z.string().describe("The user's instruction, e.g. '2 tickets for Neon Harbor on Oct 12, under $5 each'") },
    },
    async ({ instruction }) => {
      const r = await draftMandate(uid, instruction);
      if (r.status === "clarify") return text(`Question for the user: ${r.question}`);
      if (r.status === "error") return text(`Error: ${r.error}`);
      return text(`Mandate ${r.id}\n${r.terms.summary}\nAsk the user to confirm, then call halo_confirm_mandate.`);
    },
  );

  server.registerTool(
    "halo_confirm_mandate",
    { description: "Lock a mandate onchain after the user confirmed it. Required before any purchase.", inputSchema: { mandate_id: z.string() } },
    async ({ mandate_id }) => {
      const c = collect();
      await ensureUser(uid, c.onStep);
      await confirmMandate(uid, mandate_id as `0x${string}`, c.onStep);
      return text(describe(c.steps));
    },
  );

  server.registerTool(
    "halo_pay",
    {
      description:
        "Buy from an x402 merchant URL under a confirmed mandate. Halo checks the offer, pays only if it fits the mandate, and pays the user back automatically if the delivery is wrong.",
      inputSchema: { mandate_id: z.string(), url: z.string().url().describe("The merchant's x402 purchase URL") },
    },
    async ({ mandate_id, url }) => {
      const c = collect();
      const r = await purchase(uid, mandate_id as `0x${string}`, url, c.onStep);
      return text(`${describe(c.steps)}\nResult: ${JSON.stringify(r)}`);
    },
  );

  server.registerTool(
    "halo_shop",
    { description: "Let Halo's shopping agent search the demo merchants and buy under a confirmed mandate.", inputSchema: { mandate_id: z.string() } },
    async ({ mandate_id }) => {
      const c = collect();
      await runAgent(uid, mandate_id as `0x${string}`, origin, c.onStep);
      return text(describe(c.steps));
    },
  );

  server.registerTool(
    "halo_claim",
    {
      description: "File a claim on a covered purchase that went wrong. Halo judges it and pays the user back if covered.",
      inputSchema: { purchase_id: z.string(), evidence: z.string().describe("What went wrong, in the user's words") },
    },
    async ({ purchase_id, evidence }) => {
      const c = collect();
      await manualClaim(uid, purchase_id as `0x${string}`, evidence, c.onStep);
      return text(describe(c.steps));
    },
  );

  server.registerTool("halo_status", { description: "The user's mandates, purchases, claims and payouts.", inputSchema: {} }, async () => {
    await migrate();
    const rows = (await sql()`select p.id, p.merchant_slug, p.amount, p.status, c.payout from purchases p
      left join claims c on c.id = p.id where p.user_id = ${uid} order by p.created_at desc limit 20`) as Record<string, unknown>[];
    return text(rows.length ? rows.map((r) => JSON.stringify(r)).join("\n") : "No purchases yet.");
  });

  return server;
}

async function handle(req: Request) {
  const url = new URL(req.url);
  const uid = (url.searchParams.get("u") || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
  if (!uid) return Response.json({ error: "add ?u=<your Halo id> to the MCP URL" }, { status: 401 });
  const server = build(uid, url.origin);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export { handle as GET, handle as POST, handle as DELETE };
