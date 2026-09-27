import { servJson, sha256, type ReasoningRecord } from "./serv";
import type { Category, Constraint, MandateTerms } from "./types";

// PRD A1, A2, A4: turn a plain instruction into structured terms, or ask a question when it is ambiguous.

const SYSTEM = `You turn a person's shopping instruction for their AI agent into a strict purchase mandate.
The mandate is a contract: the agent may only buy what it allows, so never invent limits the person did not give, and never drop limits they did give.

Rules:
- status "clarify" when a purchase cannot be bounded: no budget at all (neither a per item price nor a total), or the item is too vague to recognise a match. Put one short question in "question".
- quantity: the number of items. Default 1 only if the instruction clearly implies one.
- max_unit_price: the per item cap in USD if given, else null. max_total: the overall cap in USD if given, else null.
- category: ticket, digital_good, data, subscription or other.
- constraints: every concrete requirement that a delivered item must satisfy (date as YYYY-MM-DD resolved against today's date, time, venue, event, format, size, colour, language, seller). Use short lowercase names.
- merchant_rule: "any" only if the person explicitly allows unknown sellers, else "verified_only".
- valid_hours: how long the agent may shop; default 24.
- summary: one plain sentence the person will confirm, starting with "Your agent may spend up to". Include the item, quantity, limits and constraints.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "status",
    "question",
    "summary",
    "item",
    "category",
    "quantity",
    "max_unit_price",
    "max_total",
    "merchant_rule",
    "valid_hours",
    "constraints",
  ],
  properties: {
    status: { type: "string", enum: ["ok", "clarify"] },
    question: { type: "string" },
    summary: { type: "string" },
    item: { type: "string" },
    category: { type: "string", enum: ["ticket", "digital_good", "data", "subscription", "other"] },
    quantity: { type: "integer" },
    max_unit_price: { type: ["number", "null"] },
    max_total: { type: ["number", "null"] },
    merchant_rule: { type: "string", enum: ["verified_only", "any"] },
    valid_hours: { type: "integer" },
    constraints: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "value"],
        properties: { name: { type: "string" }, value: { type: "string" } },
      },
    },
  },
};

interface Raw {
  status: "ok" | "clarify";
  question: string;
  summary: string;
  item: string;
  category: Category;
  quantity: number;
  max_unit_price: number | null;
  max_total: number | null;
  merchant_rule: "verified_only" | "any";
  valid_hours: number;
  constraints: Constraint[];
}

export type CompileResult =
  | { status: "ok"; terms: MandateTerms; termsHash: string; record: ReasoningRecord }
  | { status: "clarify"; question: string; record: ReasoningRecord }
  | { status: "error"; error: string; record: ReasoningRecord | null };

export async function compileMandate(instruction: string, opts: { raw?: boolean; today?: string } = {}): Promise<CompileResult> {
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const call = await servJson<Raw>({
    kind: "mandate",
    name: "mandate",
    schema: SCHEMA,
    system: SYSTEM,
    input: `Today is ${today}.\nInstruction: ${instruction}`,
    shadowHint:
      "Every limit and requirement in the instruction must appear in the mandate, nothing may be invented, and dates must be resolved to YYYY-MM-DD.",
    raw: opts.raw,
  });
  const r = call.data;
  if (!r) return { status: "error", error: "SERV returned no usable mandate", record: call.record };
  if (r.status === "clarify") return { status: "clarify", question: r.question, record: call.record };

  // Hard rules in code (PRD principle 1): a mandate must be bounded.
  const qty = Math.max(1, Math.floor(r.quantity || 1));
  const fromUnit = r.max_unit_price != null ? r.max_unit_price * qty : Infinity;
  const fromTotal = r.max_total ?? Infinity;
  const maxTotal = Math.min(fromUnit, fromTotal);
  if (!Number.isFinite(maxTotal) || maxTotal <= 0) {
    return { status: "clarify", question: "What is the most your agent may spend?", record: call.record };
  }

  const terms: MandateTerms = {
    summary: r.summary,
    item: r.item,
    category: r.category,
    quantity: qty,
    maxUnitPrice: r.max_unit_price,
    maxTotal: round2(maxTotal),
    merchantRule: r.merchant_rule,
    validHours: Math.min(Math.max(r.valid_hours || 24, 1), 24 * 30),
    constraints: r.constraints.map((c) => ({ name: c.name.toLowerCase().trim(), value: c.value.trim() })),
  };
  return { status: "ok", terms, termsHash: termsHash(terms), record: call.record };
}

/** Canonical hash of the terms. This is what the user signs and what goes onchain (PRD A3). */
export function termsHash(terms: MandateTerms): `0x${string}` {
  return sha256(canonical(terms)) as `0x${string}`;
}

/** JSON with object keys sorted at every level, so the same terms always hash the same. */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
