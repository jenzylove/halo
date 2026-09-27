import OpenAI from "openai";
import { createHash } from "node:crypto";

// SERV Reasoning is OpenAI compatible. Every reasoning call in Halo goes through here (PRD G1).
const BASE_URL = "https://inference-api.openserv.ai/v1";

let client: OpenAI | null = null;
function servClient(): OpenAI {
  if (!process.env.SERV_API_KEY) throw new Error("SERV_API_KEY is not set");
  client ??= new OpenAI({ apiKey: process.env.SERV_API_KEY, baseURL: BASE_URL });
  return client;
}

export const servModel = () => process.env.SERV_MODEL || "gpt-5.4-mini";

export type JsonSchema = Record<string, unknown>;

export interface ServCall<T> {
  data: T | null;
  blocked: boolean; // PromptGuard refused the request
  refusal: string | null;
  record: ReasoningRecord;
}

export interface ReasoningRecord {
  id: string;
  kind: string;
  model: string;
  mode: "serv" | "raw";
  guard: boolean;
  shadow: boolean;
  system: string;
  input: string;
  output: string;
  requestId: string | null;
  latencyMs: number;
  tokens: number | null;
  hash: string; // sha256 of the canonical record, anchored onchain next to decisions
  createdAt: string;
}

export interface ServOptions {
  kind: string; // what this call decides, for the record
  name: string; // schema name
  schema: JsonSchema;
  system: string;
  input: string;
  guard?: boolean; // PromptGuard: screen the input for injected instructions
  shadowHint?: string; // Shadow Agent: validate the draft against this hint, revise on failure
  raw?: boolean; // disable SERV reasoning (evals only)
}

export function sha256(s: string): string {
  return "0x" + createHash("sha256").update(s).digest("hex");
}

export async function servJson<T>(opts: ServOptions): Promise<ServCall<T>> {
  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [];
  if (opts.guard && !opts.raw) tools.push({ type: "function", function: { name: "serv_prompt_guard" } });
  if (opts.shadowHint && !opts.raw) {
    tools.push({
      type: "function",
      function: {
        name: "serv_shadow_agent",
        parameters: {
          type: "object",
          properties: {
            hint: { type: "string", default: opts.shadowHint },
            max_iterations: { type: "integer", default: 3 },
          },
        },
      },
    });
  }

  const started = Date.now();
  // SERV intermittently returns an unusable draft or rejects its own max_tokens; one retry clears it.
  for (let attempt = 0; ; attempt++) {
    try {
      const result = await attemptOnce<T>(opts, tools, started);
      if (result.data !== null || result.refusal || attempt >= 2) return result;
    } catch (e) {
      if (attempt >= 2) throw e;
    }
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
}

async function attemptOnce<T>(
  opts: ServOptions,
  tools: OpenAI.Chat.Completions.ChatCompletionTool[],
  started: number,
): Promise<ServCall<T>> {
  const { data: completion, response } = await servClient()
    .chat.completions.create(
      {
        model: servModel(),
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.input },
        ],
        response_format: { type: "json_schema", json_schema: { name: opts.name, strict: true, schema: opts.schema } },
        // An explicit cap stops SERV from sizing max_tokens past the model's limit (a SERV bug seen in testing).
        max_completion_tokens: 4000,
        ...(tools.length ? { tools } : {}),
      },
      opts.raw ? { headers: { "x-openserv-disable-braid": "true" } } : undefined,
    )
    .withResponse();
  const latencyMs = Date.now() - started;

  const msg = completion.choices?.[0]?.message;
  const content = msg?.content ?? "";
  const refusal = (msg as { refusal?: string | null } | undefined)?.refusal ?? null;
  let data: T | null = null;
  try {
    data = content ? (JSON.parse(content) as T) : null;
  } catch {
    data = null;
  }
  // PromptGuard answers with an endpoint shaped refusal instead of calling the model. An empty draft is not a block.
  const blocked = Boolean(opts.guard && !opts.raw && refusal);

  const base = {
    kind: opts.kind,
    model: servModel(),
    mode: (opts.raw ? "raw" : "serv") as "raw" | "serv",
    guard: Boolean(opts.guard && !opts.raw),
    shadow: Boolean(opts.shadowHint && !opts.raw),
    system: opts.system,
    input: opts.input,
    output: refusal ? `REFUSAL: ${refusal}` : content,
    requestId: response.headers.get("x-openserv-request-id"),
    latencyMs,
    tokens: completion.usage?.total_tokens ?? null,
    createdAt: new Date().toISOString(),
  };
  const hash = sha256(JSON.stringify(base));
  const record: ReasoningRecord = { id: hash.slice(2, 18), ...base, hash };
  return { data, blocked, refusal, record };
}
