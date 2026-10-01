
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const outDir = process.argv[3] || join(ROOT, "shots", "exams3");
mkdirSync(outDir, { recursive: true });
const target = process.argv[2] || join(ROOT, "conic-exams.bento.html");

(async () => {
  const v = await fetch("http://127.0.0.1:9222/json/version").then(r => r.json());
  const ws = new WebSocket(v.webSocketDebuggerUrl);
  await new Promise(res => ws.onopen = res);
  let id = 0; const pending = new Map();
  const send = (method, params = {}, sid) => new Promise((res, rej) => {
    const mid = ++id; pending.set(mid, { res, rej });
    ws.send(JSON.stringify({ id: mid, method, params, ...(sid ? { sessionId: sid } : {}) }));
    setTimeout(() => { if (pending.has(mid)) { pending.delete(mid); rej(new Error("timeout " + method)); } }, 15000);
  });
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  });

  const ct = await send("Target.createTarget", { url: "file:///" + target.replace(/\\/g, "/") + "?v=" + Date.now() });
  await send("Target.activateTarget", { targetId: ct.targetId });
  await sleep(5000);
  const att = await send("Target.attachToTarget", { targetId: ct.targetId, flatten: true });
  const sid = att.sessionId;
  await send("Runtime.enable", {}, sid);
  try { await send("Network.enable", {}, sid); await send("Page.enable", {}, sid); } catch(e) {}
  await send("Page.reload", { ignoreCache: true }, sid);
  await sleep(15000);

  // 验证
  const val = await send("Runtime.evaluate", { expression: `(() => { const d = window.bento && window.bento.doc; const v = window.bento && window.bento.validate ? window.bento.validate() : null; return JSON.stringify({ n: d ? d.slides.length : -1, ok: v ? v.ok : null, counts: v ? v.counts : null, errs: v ? (v.findings || []).filter(f => f.severity !== "info").map(f => ({ code: f.code, sev: f.severity, msg: (f.message || "").slice(0, 100) })) : [] }); })()`, returnByValue: true }, sid);
  console.log("VALIDATE:", (val.result && val.result.value || "").slice(0, 3500));

  // 进入放映
  const ent = await send("Runtime.evaluate", { expression: `(() => { const b = [...document.querySelectorAll("button")].find(x => /幻灯片放映|Present/.test(x.textContent || "")); if (b) { b.click(); return "clicked"; } return "nobtn"; })()`, returnByValue: true }, sid);
  console.log("enter:", ent.result.value);
  await sleep(3000);

  // 截图每一页
  const cap = async (name) => { const s = await send("Page.captureScreenshot", { format: "png" }, sid); writeFileSync(join(outDir, name), Buffer.from(s.data, "base64")); };
  for (let i = 0; i < 17; i++) {
    await sleep(1200);
    await cap("slide-" + String(i + 1).padStart(2, "0") + ".png");
    console.log("shot", i + 1);
    if (i < 16) await send("Runtime.evaluate", { expression: 'document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))' }, sid);
    await sleep(1500);
  }
  await send("Target.closeTarget", { targetId: ct.targetId });
  ws.close();
  process.exit(0);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
