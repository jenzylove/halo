import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import type { OnStep, Step } from "./halo";

/** Run a lifecycle action and stream its steps to the browser as server sent events. */
export function streamSteps(run: (onStep: OnStep) => Promise<unknown>): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        const result = await run((s: Step) => send("step", s));
        send("done", result ?? {});
      } catch (e) {
        send("error", { message: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, { headers: { "content-type": "text/event-stream", "cache-control": "no-store" } });
}

/** Each browser gets its own agent wallet, keyed by a cookie. */
export async function userId(): Promise<string> {
  const jar = await cookies();
  let id = jar.get("halo_uid")?.value;
  if (!id) {
    id = randomUUID().replace(/-/g, "").slice(0, 20);
    jar.set("halo_uid", id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
  }
  return id;
}
