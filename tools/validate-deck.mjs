// tools/validate-deck.mjs — 用 CDP 打开成品课件，调 window.bento.validate() 报告排版问题
//
// 用法：node tools/validate-deck.mjs <绝对路径>.bento.html [--json] [--wait 毫秒]
//   --json  只输出一行 JSON（供 tools/verify.mjs 解析）
//
// 前置：浏览器需带 --remote-debugging-port=9222 启动。
// 注意：目标请传【绝对路径】。相对路径会被拼成 file:///<相对名> 而 404。
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const args = process.argv.slice(2);
const jsonOnly = args.includes("--json");
const waitIdx = args.indexOf("--wait");
const waitMs = waitIdx >= 0 ? parseInt(args[waitIdx + 1], 10) : 13000;
const targetArg = args.find((a) => !a.startsWith("--") && a !== String(waitMs));
const target = resolve(targetArg ? targetArg : join(ROOT, "solid-geometry.bento.html"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fail(reason) {
  if (jsonOnly) console.log(JSON.stringify({ ok: false, error: reason }));
  else console.error("FAIL:", reason);
  process.exit(1);
}

(async () => {
  let ws;
  try {
    const v = await fetch("http://127.0.0.1:9222/json/version").then((r) => r.json());
    ws = new WebSocket(v.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = () => rej(new Error("无法连接 CDP websocket"));
    });
  } catch (e) {
    fail("CDP 不可用（需 --remote-debugging-port=9222 启动浏览器）：" + e.message);
  }

  let id = 0;
  const pending = new Map();
  const send = (method, params = {}, sid) =>
    new Promise((res, rej) => {
      const mid = ++id;
      pending.set(mid, { res, rej });
      ws.send(JSON.stringify({ id: mid, method, params, ...(sid ? { sessionId: sid } : {}) }));
      setTimeout(() => {
        if (pending.has(mid)) { pending.delete(mid); rej(new Error("timeout " + method)); }
      }, 25000);
    });
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result);
    }
  });

  const url = "file:///" + target.replace(/\\/g, "/") + "?v=" + Date.now();
  let ct, sid;
  try {
    ct = await send("Target.createTarget", { url });
    await send("Target.activateTarget", { targetId: ct.targetId });
    await sleep(waitMs);
    const att = await send("Target.attachToTarget", { targetId: ct.targetId, flatten: true });
    sid = att.sessionId;
  } catch (e) {
    fail("打开页面失败：" + e.message);
  }

  let out;
  try {
    const r = await send("Runtime.evaluate", {
      expression: `(() => {
        if (!window.bento || !window.bento.validate) return JSON.stringify({ boot: false });
        const v = window.bento.validate();
        const findings = (v.findings || []).filter(f => f.severity !== 'info');
        return JSON.stringify({
          boot: true,
          ok: v.ok,
          counts: v.counts || {},
          slides: window.bento.doc ? window.bento.doc.slides.length : -1,
          title: window.bento.doc ? window.bento.doc.title : null,
          findings: findings.slice(0, 40).map(f => ({
            sev: f.severity, code: f.code, slide: f.slide || '', el: f.element || '',
            msg: (f.message || '').slice(0, 140),
          })),
        });
      })()`,
      returnByValue: true,
    }, sid);
    out = JSON.parse(r.result.value);
  } catch (e) {
    fail("执行 validate() 失败：" + e.message);
  }

  try { await send("Target.closeTarget", { targetId: ct.targetId }); } catch {}
  ws.close();

  if (!out.boot) fail("页面未启动 Bento（window.bento 不存在）——可能文档损坏或等待时间不足");

  if (jsonOnly) {
    console.log(JSON.stringify(out));
  } else {
    console.log("课    件:", target);
    console.log("标    题:", out.title);
    console.log("页    数:", out.slides);
    console.log("validate:", JSON.stringify(out.counts));
    if (out.findings.length) {
      console.log("问题清单:");
      for (const f of out.findings) {
        console.log(`  [${f.sev}] ${f.code} ${f.slide}/${f.el} — ${f.msg}`);
      }
    } else {
      console.log("问题清单: （无）");
    }
  }
  process.exit(0);
})();
