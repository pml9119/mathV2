// tools/verify.mjs — 课件产出闸门（唯一入口）
//
// 存在理由：
//   本工作区的缺陷不是"没写检查"，而是"检查是自愿的"——
//   6 个工具、6 个时刻，靠人想起来才跑。会话中 6 个缺陷里 5 个本可机械拦截，
//   却分别由 5 个不同工具在 5 个不同时刻发现，其中 2 个是事后才补的。
//   这个脚本把那 6 个工具串成一条不会忘的线：任一关失败即整体非零退出。
//
// 用法：
//   node tools/verify.mjs                       # 全部课件 · 全量档（含浏览器）
//   node tools/verify.mjs solid-geometry        # 指定课件 · 全量档
//   node tools/verify.mjs --fast                # 全部课件 · 快档（纯离线，无浏览器）
//   node tools/verify.mjs --fast solid-geometry # 指定课件 · 快档
//   node tools/verify.mjs --no-build            # 只检查，不重新生成
//
// 两档设计：
//   快档 = 语法 → 生成 → 内容安全 → 嵌入 → 注入幂等 → 结构 → 一致性 → 页数
//   全量 = 快档 + CDP 可用 → validate 零告警 → 逐页双帧截图 → 像素差分（动效对表）
//
// 退出码：0 全绿（允许有 SKIP，但会显式列出）；1 有 FAIL。

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { DECKS, deckKeys, resolveDeck } from "./lib/decks.mjs";
import {
  scanTextHazards, findDuplicateIds, loadDocJson,
  extractEmbeddedDoc, compareDocs, docStats,
} from "./lib/deckcheck.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

/* ─────────────────────────── 参数解析 ─────────────────────────── */
const argv = process.argv.slice(2);
const fast = argv.includes("--fast");
const noBuild = argv.includes("--no-build");
const named = argv.filter((a) => !a.startsWith("--"));

const targets = named.length
  ? named.map((n) => {
      const d = resolveDeck(n);
      if (!d) { console.error(`未知课件「${n}」。可选：${deckKeys().join(", ")}`); process.exit(2); }
      return d;
    })
  : deckKeys().map((k) => ({ key: k, ...DECKS[k] }));

/* ─────────────────────────── 结果收集 ─────────────────────────── */
const results = [];   // { deck, step, state: PASS|FAIL|SKIP, detail }

function record(deck, step, state, detail = "") {
  results.push({ deck, step, state, detail });
  const icon = state === "PASS" ? "  ok " : state === "FAIL" ? " FAIL" : " skip";
  const line = `[${icon}] ${deck} · ${step}${detail ? " — " + detail : ""}`;
  console.log(line);
}

/** 跑子进程并捕获输出。 */
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: opts.timeout ?? 180000,
    ...opts,
  });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", error: r.error };
}

const node = process.execPath;
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const abs = (p) => resolve(ROOT, p);

/* ─────────────────────── 快档：每份课件的离线关 ─────────────────────── */
function verifyFast(deck) {
  const K = deck.key;

  // 1) 生成器语法
  const syn = run(node, ["--check", deck.generator]);
  if (syn.status !== 0) {
    record(K, "syntax", "FAIL", (syn.stderr || "").split("\n").slice(0, 3).join(" ").trim());
    return;   // 语法错就别往下跑了 —— 后续步骤会连锁失败
  }
  record(K, "syntax", "PASS");

  if (!noBuild) {
    // 2) 生成 JSON（不带 --embed）
    const gen = run(node, [deck.generator]);
    if (gen.status !== 0) {
      record(K, "build-json", "FAIL", (gen.stderr || "").split("\n").slice(0, 3).join(" ").trim());
      return;
    }
    const m = /slides:\s*(\d+)\s*\|\s*elements:\s*(\d+)/.exec(gen.stdout);
    record(K, "build-json", "PASS", m ? `${m[1]} 页 / ${m[2]} 元素` : "已生成");

    // 3) 生成器自报的重复 id（有的生成器会打 !! dup ids，有的不报全 —— 后面还会自查）
    if (/!!\s*dup ids/.test(gen.stdout)) {
      record(K, "dup-ids(generator)", "FAIL", "生成器自检报出重复 id");
    }

    // 4) 嵌入成品
    const emb = run(node, [deck.generator, "--embed"]);
    if (emb.status !== 0) {
      record(K, "embed", "FAIL", (emb.stderr || "").split("\n").slice(0, 3).join(" ").trim());
      return;
    }
    record(K, "embed", "PASS");

    // 5) 注入控制条
    const inj = run(node, ["tools/inject-controller.mjs", deck.html]);
    if (inj.status !== 0) {
      record(K, "inject-controller", "FAIL", (inj.stderr || "").split("\n").slice(0, 2).join(" ").trim());
      return;
    }
    record(K, "inject-controller", "PASS");

    // 6) 注入幂等（连续两次内容哈希必须一致）
    const h1 = sha(abs(deck.html));
    run(node, ["tools/inject-controller.mjs", deck.html]);
    const h2 = sha(abs(deck.html));
    if (h1 !== h2) {
      record(K, "inject-idempotent", "FAIL", "重复注入后内容变化 —— 注入器不幂等");
    } else {
      record(K, "inject-idempotent", "PASS");
    }
  }

  // 7) 成品结构（check-doc）
  if (!existsSync(abs(deck.html))) {
    record(K, "structure", "FAIL", `成品不存在：${deck.html}`);
    return;
  }
  const cd = run(node, ["tools/check-doc.mjs", deck.html]);
  const cdOut = cd.stdout;
  const problems = [];
  if (!/doc block:\s*found/.test(cdOut)) problems.push("bento-doc 块缺失");
  if (!/JSON OK/.test(cdOut)) problems.push("文档 JSON 不可解析");
  if (!/bento-rt block:\s*found/.test(cdOut)) problems.push("bento-rt 运行时块缺失");
  if (problems.length) {
    record(K, "structure", "FAIL", problems.join("；"));
  } else {
    record(K, "structure", "PASS");
  }

  // 8) 控制条标记恰好一对
  const html = readFileSync(abs(deck.html), "utf8");
  const sN = (html.match(/animctl:START/g) || []).length;
  const eN = (html.match(/animctl:END/g) || []).length;
  if (sN !== 1 || eN !== 1) {
    record(K, "animctl-markers", "FAIL", `START=${sN} END=${eN}（应为各 1）`);
  } else {
    record(K, "animctl-markers", "PASS");
  }

  // 9) 生成 JSON 与内嵌文档必须一致 ← 拦「静默残留旧文档」
  let jsonDoc = null;
  if (existsSync(abs(deck.json))) {
    try { jsonDoc = loadDocJson(abs(deck.json)); }
    catch (e) { record(K, "json-parse", "FAIL", e.message); }
  } else {
    record(K, "json-parse", "FAIL", `生成 JSON 不存在：${deck.json}`);
  }

  // 9b) 产物新鲜度：生成物不得比其来源更旧
  //     这条是反向测试逼出来的：T1 弄脏 deck.json 后，后续用 --no-build 的用例
  //     一路继承那份污染，却看不出是"上一次跑留下的"。--no-build 检查的是磁盘现状，
  //     现状可能包含上次中断的残骸 —— 必须显式判出来。
  if (existsSync(abs(deck.json)) && existsSync(abs(deck.generator))) {
    const jm = statSync(abs(deck.json)).mtimeMs;
    const gm = statSync(abs(deck.generator)).mtimeMs;
    if (jm < gm) {
      record(K, "artifact-freshness", "FAIL",
        `${deck.json} 比 ${deck.generator} 旧 —— 上次构建可能失败/中断，磁盘上是残骸（去掉 --no-build 可自动重建）`);
    } else {
      record(K, "artifact-freshness", "PASS");
    }
  }

  if (jsonDoc) {
    const emb = extractEmbeddedDoc(abs(deck.html));
    if (!emb.ok) {
      record(K, "embed-freshness", "FAIL", emb.reason);
    } else {
      const issues = compareDocs(jsonDoc, emb.doc);
      if (issues.length) {
        record(K, "embed-freshness", "FAIL", issues.join("；") + " ← 成品里可能是上一份课件的文档");
      } else {
        record(K, "embed-freshness", "PASS", `内嵌 ${emb.doc.slides.length} 页与生成 JSON 一致`);
      }
    }
  }

  // 10) 内容安全（裸 `<` 会被 HTML 吞字）
  if (jsonDoc) {
    const hz = scanTextHazards(jsonDoc);
    if (hz.length) {
      record(K, "content-safety", "FAIL", `${hz.length} 处裸 < 会被吞字，例：${hz[0].slide}/${hz[0].el} ${hz[0].frag}`);
    } else {
      record(K, "content-safety", "PASS");
    }

    // 11) 页内重复 id
    const dup = findDuplicateIds(jsonDoc);
    if (dup.length) {
      record(K, "dup-ids", "FAIL", dup.slice(0, 3).map((d) => `${d.slide}/${d.id}×${d.count}`).join(", "));
    } else {
      record(K, "dup-ids", "PASS");
    }

    // 12) 规模对表（注册表期望值）
    const st = docStats(jsonDoc);
    const drift = [];
    if (st.slides !== deck.slides) drift.push(`页数 ${st.slides}≠${deck.slides}`);
    if (deck.elements && st.elements !== deck.elements) drift.push(`元素数 ${st.elements}≠${deck.elements}`);
    if (drift.length) {
      record(K, "size-vs-registry", "FAIL", drift.join("；") + " ← 内容变了？请同步 tools/lib/decks.mjs");
    } else {
      record(K, "size-vs-registry", "PASS", `${st.slides} 页 / ${st.elements} 元素`);
    }
  }
}

/* ─────────────────────── 全量档：浏览器关（逐课件） ─────────────────────── */
function cdpReachable() {
  const r = spawnSync(node, ["-e", `
    fetch("http://127.0.0.1:9222/json/version")
      .then(r => r.json()).then(() => process.exit(0))
      .catch(() => process.exit(1));
  `], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 8000 });
  return r.status === 0;
}

function verifyFull(deck) {
  const K = deck.key;

  // 13) validate 零告警
  const v = run(node, ["tools/validate-deck.mjs", abs(deck.html), "--json"], { timeout: 120000 });
  let vj = null;
  try { vj = JSON.parse((v.stdout || "").trim().split("\n").pop()); } catch {}
  if (!vj || vj.ok === false || vj.boot === false) {
    record(K, "validate", "FAIL", vj?.error || "validate 未返回可解析结果");
  } else {
    const { error = 0, warning = 0 } = vj.counts ?? {};
    if (error || warning) {
      const first = (vj.findings || [])[0];
      record(K, "validate", "FAIL",
        `error=${error} warning=${warning}` + (first ? `，例：${first.slide}/${first.el} ${first.msg}` : ""));
    } else {
      record(K, "validate", "PASS", `error=0 warning=0（${vj.slides} 页）`);
    }
    // validate 顺带确认内嵌页数与注册表一致
    if (vj.slides !== deck.slides) {
      record(K, "validate-slides", "FAIL", `浏览器加载到 ${vj.slides} 页，注册表期望 ${deck.slides} 页`);
    }
  }

  // 14) 逐页双帧截图
  const sh = run(node, ["tools/shoot-deck.mjs", abs(deck.html), deck.shots], { timeout: 600000 });
  if (sh.status !== 0) {
    record(K, "shoot", "FAIL", (sh.stderr || "").split("\n").slice(0, 2).join(" ").trim());
    return;
  }
  const shotSlides = (sh.stdout.match(/^shot \d+$/gm) || []).length;
  if (shotSlides !== deck.slides) {
    record(K, "shoot", "FAIL", `只拍到 ${shotSlides} 页，期望 ${deck.slides} 页`);
  } else {
    record(K, "shoot", "PASS", `${shotSlides} 页 × a/b 双帧`);
  }

  // 15) 像素差分 + 动效对表
  if (deck.animated === null) {
    record(K, "pixdiff", "SKIP", deck.animatedSkipReason || "注册表未声明期望动效页");
    return;
  }
  const pd = run(node, ["tools/pixdiff.mjs", deck.shots, "--json"], { timeout: 180000 });
  let pj = null;
  try { pj = JSON.parse((pd.stdout || "").trim().split("\n").pop()); } catch {}
  if (!pj) {
    record(K, "pixdiff", "FAIL", "pixdiff 未返回可解析结果");
    return;
  }
  const got = pj.results.filter((r) => r.animated).map((r) => r.slide).sort((a, b) => a - b);
  const want = [...deck.animated].sort((a, b) => a - b);
  const missing = want.filter((x) => !got.includes(x));
  const extra = got.filter((x) => !want.includes(x));
  if (missing.length || extra.length) {
    const parts = [];
    if (missing.length) parts.push(`该动没动：S${missing.join(",S")}`);
    if (extra.length) parts.push(`不该动却动了：S${extra.join(",S")}`);
    record(K, "pixdiff", "FAIL", parts.join("；"));
  } else {
    record(K, "pixdiff", "PASS", `动效对表一致（${want.length} 页在动 / ${pj.results.length} 页）`);
  }
}

/* ─────────────────────────── 主流程 ─────────────────────────── */
const t0 = Date.now();
console.log("═".repeat(72));
console.log(`课件闸门 verify  ·  ${fast ? "快档（离线）" : "全量档（含浏览器）"}  ·  ${targets.length} 份课件`);
console.log("═".repeat(72));

let cdpOk = null;
if (!fast) {
  cdpOk = cdpReachable();
  console.log(cdpOk
    ? "CDP: 9222 可用\n"
    : "CDP: 9222 不可用 —— 浏览器关将全部 SKIP（起法见 AGENTS.md）\n");
}

for (const deck of targets) {
  console.log(`── ${deck.key}（${deck.title}）`);
  verifyFast(deck);
  if (!fast) {
    if (cdpOk) verifyFull(deck);
    else {
      record(deck.key, "validate", "SKIP", "CDP 不可用");
      record(deck.key, "shoot", "SKIP", "CDP 不可用");
      record(deck.key, "pixdiff", "SKIP", "CDP 不可用");
    }
  }
  console.log("");
}

/* ─────────────────────────── 汇总 ─────────────────────────── */
const fail = results.filter((r) => r.state === "FAIL");
const skip = results.filter((r) => r.state === "SKIP");
const pass = results.filter((r) => r.state === "PASS");
const secs = ((Date.now() - t0) / 1000).toFixed(1);

console.log("═".repeat(72));
console.log(`结果：${pass.length} 通过 / ${fail.length} 失败 / ${skip.length} 跳过  ·  ${secs}s`);
if (skip.length) {
  console.log("\n跳过项（不是通过，请你判断是否可接受）：");
  for (const s of skip) console.log(`  · ${s.deck} · ${s.step} — ${s.detail}`);
}
if (fail.length) {
  console.log("\n失败项：");
  for (const f of fail) console.log(`  ✗ ${f.deck} · ${f.step} — ${f.detail}`);
  console.log("\n修复后重跑：node tools/verify.mjs" + (fast ? " --fast" : ""));
}
console.log("═".repeat(72));
process.exit(fail.length ? 1 : 0);
