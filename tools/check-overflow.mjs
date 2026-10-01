// check-overflow.mjs — open the deck in CDP Chrome and print window.bento.validate()
// findings for layout overflow / errors.
// Usage: node tools/check-overflow.mjs [file]
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const target = process.argv[2] || join(ROOT, "conic-exams.bento.html");

(async () => {
  const v = await fetch("http://127.0.0.1:9222/json/version").then((r) => r.json());
  const ws = new WebSocket(v.webSocketDebuggerUrl);
  await new Promise((res) => (ws.onopen = res));
  let id = 0;
  const pending = new Map();
  const send = (method, params, sid) =>
    new Promise((res) => {
      const mid = ++id;
      pending.set(mid, res);
      ws.send(JSON.stringify({ id: mid, method, params, ...(sid ? { sessionId: sid } : {}) }));
    });
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m.result);
      pending.delete(m.id);
    }
  });

  const url = "file:///" + target.replace(/\\/g, "/") + "?v=" + Date.now();
  const ct = await send("Target.createTarget", { url });
  await sleep(14000);
  const att = await send("Target.attachToTarget", { targetId: ct.targetId, flatten: true });
  const sid = att.sessionId;
  const r = await send(
    "Runtime.evaluate",
    {
      expression:
        '(() => { const v = window.bento.validate(); return JSON.stringify(v.findings.filter(f => f.severity !== "info").map(f => ({ code: f.code, sev: f.severity, msg: (f.message || "").slice(0, 160), slide: f.slide || "", el: f.element || "" }))); })()',
      returnByValue: true,
    },
    sid
  );
  console.log("溢出详情:", r.result.value);
  await send("Target.closeTarget", { targetId: ct.targetId });
  ws.close();
  process.exit(0);
})();
