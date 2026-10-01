// shoot-deck.mjs — drive the Bento deck in the live CDP Chrome, enter present
// mode, capture every slide twice (t, t+3.5s) to verify SVG/SMIL animation.
// Usage: node tools/shoot-deck.mjs <file-or-url> <outdir> [--first N] [--last N]
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const target = process.argv[2] || join(ROOT, "conic-moving-point.bento.html");
const outDir = process.argv[3] || join(ROOT, "shots", "svg");
mkdirSync(outDir, { recursive: true });
const args = process.argv;
const first = args.indexOf("--first") >= 0 ? parseInt(args[args.indexOf("--first") + 1]) : 0;
const last = args.indexOf("--last") >= 0 ? parseInt(args[args.indexOf("--last") + 1]) : 99;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const v = await fetch("http://127.0.0.1:9222/json/version").then((r) => r.json());
  const ws = new WebSocket(v.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = (e) => rej(new Error("browser ws error")); });
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}, sid) => new Promise((res, rej) => {
    const msgId = ++id;
    pending.set(msgId, { res, rej });
    const msg = { id: msgId, method, params };
    if (sid) msg.sessionId = sid;
    ws.send(JSON.stringify(msg));
    setTimeout(() => { if (pending.has(msgId)) { pending.delete(msgId); rej(new Error("timeout " + method)); } }, 12000);
  });
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  });

  const url = target.includes("://") ? target : "file:///" + target.replace(/\\/g, "/");
  const ct = await send("Target.createTarget", { url });
  console.log("new tab:", ct.targetId);
  await send("Target.activateTarget", { targetId: ct.targetId });
  await sleep(11000); // let the fresh tab boot the deck
  const att = await send("Target.attachToTarget", { targetId: ct.targetId, flatten: true });
  const sid = att.sessionId;
  await send("Page.enable", {}, sid);
  await send("Runtime.enable", {}, sid);

  // enter present mode (click the 幻灯片放映 button; fallback F5)
  let entered = false;
  try {
    const r = await send("Runtime.evaluate", {
      expression: `(() => { const b = [...document.querySelectorAll("button")].find((x) => /幻灯片放映|Present/.test(x.textContent || "")); if (b) { b.click(); return "clicked:" + b.textContent.trim(); } return "no-button"; })()`,
      returnByValue: true,
    }, sid);
    console.log("enter present:", r.result.value);
    entered = String(r.result.value).startsWith("clicked");
  } catch (e) { console.log("click fail", e.message); }
  if (!entered) {
    await send("Runtime.evaluate", { expression: `document.dispatchEvent(new KeyboardEvent("keydown", { key: "F5", bubbles: true }))` }, sid);
  }
  await sleep(2600);

  const nRes = await send("Runtime.evaluate", { expression: `(window.bento && window.bento.doc) ? window.bento.doc.slides.length : -1`, returnByValue: true }, sid);
  const n = nRes.result.value;
  console.log("slides:", n);
  const cap = async (name) => {
    const s = await send("Page.captureScreenshot", { format: "png" }, sid);
    writeFileSync(join(outDir, name), Buffer.from(s.data, "base64"));
  };
  for (let i = first; i < Math.min(n, last); i++) {
    await cap("slide-" + String(i + 1).padStart(2, "0") + "-a.png");
    await sleep(3500);
    await cap("slide-" + String(i + 1).padStart(2, "0") + "-b.png");
    await send("Runtime.evaluate", { expression: `document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))` }, sid);
    await sleep(2400);
    console.log("shot", i + 1);
  }
  ws.close();
  process.exit(0);
}

main().catch((e) => { console.error("FAIL", e.message); process.exit(1); });