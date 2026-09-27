// Client helper: POST and read server sent events from the response body.
export async function postStream(
  url: string,
  body: unknown,
  on: (event: string, data: unknown) => void,
): Promise<void> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
  if (!res.body) throw new Error(`no stream (${res.status})`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const event = /^event: (.*)$/m.exec(chunk)?.[1] ?? "message";
      const data = /^data: (.*)$/m.exec(chunk)?.[1];
      on(event, data ? JSON.parse(data) : null);
    }
  }
}
