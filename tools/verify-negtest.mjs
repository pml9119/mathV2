// 反向测试：逐一注入真实缺陷，确认闸门能判红。
// 不能变红的闸门 = 虚假安全感，比没有闸门更糟。
import { readFileSync, writeFileSync, copyFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";

const node = process.execPath;
const bak = (p) => { copyFileSync(p, p + ".negtest.bak"); };
/** 还原源之后立即重建全部产物 —— 否则上一例弄脏的 JSON 会被下一例继承。 */
const restore = (p) => {
  copyFileSync(p + ".negtest.bak", p);
  unlinkSync(p + ".negtest.bak");
  rebuildAll();
};

/** 重建三份生成 JSON，隔离各用例状态。 */
function rebuildAll() {
  for (const g of ["tools/build-deck.mjs", "tools/build-exams.mjs", "tools/build-solid.mjs"]) {
    spawnSync(node, [g], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120000 });
  }
}

function runVerify(args) {
  const r = spawnSync(node, ["tools/verify.mjs", ...args], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 300000,
  });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

const cases = [];
function check(name, expectStep, deck) {
  const { code, out } = runVerify(deck);
  // verify 会 rebuild，被破坏的源可能让 build-json 先失败 —— 那也是判红，但要看命中哪一步
  const failedSteps = [...out.matchAll(/✗\s+\S+\s+·\s+(\S+)/g)].map((m) => m[1]);
  const hit = failedSteps.includes(expectStep);
  const red = code === 1;
  cases.push({ name, deck: deck.join(" "), red, hit, expectStep, got: failedSteps.join(",") || "(none)" });
  console.log(`  ${red ? "判红✓" : "没红✗"}  ${hit ? "命中✓" : "未命中✗"}  ${name}`);
  console.log(`          退出码=${code}  期望命中=${expectStep}  实际失败=${failedSteps.join(",") || "(无)"}`);
}

console.log("=".repeat(72));
console.log("反向测试：闸门能否判红");
console.log("=".repeat(72));

/* ── T1 内容安全：往【没有守卫】的 build-deck.mjs 注入裸 `<` ── */
console.log("\nT1 内容安全 —— 注入到 build-deck.mjs（该生成器无自带守卫，验证事后关卡能否兜住）");
{
  const p = "tools/build-deck.mjs";
  bak(p);
  const s = readFileSync(p, "utf8");
  // 找一处文本内容，塞入会被吞字的裸 <
  const needle = "'三类经典问题'";
  if (!s.includes(needle)) { console.log("  找不到注入点，跳过"); }
  else {
    writeFileSync(p, s.replace(needle, "'三类经典问题 0<m<1 测试'"), "utf8");
    check("build-deck 注入裸 <", "content-safety", ["--fast", "conic-moving-point"]);
  }
  restore(p);
}

/* ── T2 嵌入新鲜度：改掉成品里内嵌文档的标题 ── */
console.log("\nT2 嵌入新鲜度 —— 篡改成品 HTML 内嵌文档，模拟「embed 没跑、留着旧文档」");
{
  const p = "conic-moving-point.bento.html";
  bak(p);
  const s = readFileSync(p, "utf8");
  const from = '"title":"圆锥曲线的动点问题"';
  if (!s.includes(from)) { console.log("  找不到注入点，跳过"); }
  else {
    writeFileSync(p, s.replace(from, '"title":"这是一份过期的旧文档"'), "utf8");
    check("成品内嵌文档被篡改", "embed-freshness", ["--fast", "--no-build", "conic-moving-point"]);
  }
  restore(p);
}

/* ── T3 规模对表：改注册表的期望页数 ── */
console.log("\nT3 规模对表 —— 篡改注册表期望页数，模拟「内容改了但注册表没同步」");
{
  const p = "tools/lib/decks.mjs";
  bak(p);
  const s = readFileSync(p, "utf8");
  const from = 'slides: 13,';
  if (!s.includes(from)) { console.log("  找不到注入点，跳过"); }
  else {
    writeFileSync(p, s.replace(from, 'slides: 99,'), "utf8");
    check("注册表期望页数改成 99", "size-vs-registry", ["--fast", "--no-build", "conic-moving-point"]);
  }
  restore(p);
}

/* ── T4 语法：往生成器注入语法错误 ── */
console.log("\nT4 语法 —— 往 build-solid.mjs 注入语法错误");
{
  const p = "tools/build-solid.mjs";
  bak(p);
  const s = readFileSync(p, "utf8");
  writeFileSync(p, "const broken = ({ ;\n" + s, "utf8");
  check("生成器语法错误", "syntax", ["--fast", "solid-geometry"]);
  restore(p);
}

/* ── 汇总 ── */
console.log("\n" + "=".repeat(72));
const allRed = cases.every((c) => c.red && c.hit);
console.log(`反向测试：${cases.filter((c) => c.red && c.hit).length}/${cases.length} 正确判红且命中预期关卡`);
console.log(allRed ? "结论：闸门会红，且红在该红的地方 ✓" : "结论：存在不会红或红错地方的关卡 ✗");
console.log("=".repeat(72));
process.exit(allRed ? 0 : 1);
