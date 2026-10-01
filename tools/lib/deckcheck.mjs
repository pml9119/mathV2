// tools/lib/deckcheck.mjs — 共享内容检查器
//
// 存在理由（本工作区最贵的一条教训）：
//   「文本里裸露的 `<` 会被 HTML 解析器当成标签开头，吞掉后面整段文字」
//   这个坑在《期中真题精讲》踩过一次（0<m<1），在《立体几何》又踩了一次（$0<k<1$）。
//   教训被**记录**了两次，却只在 build-solid.mjs 里被**强制**了一次。
//
//   所以：守卫不该长在某个生成器里（那样只保护它自己），
//   而该长在「事后检查产物」这个位置——不改生成器就能覆盖全部课件。
//
// 本模块只读产物（生成的 JSON / 成品 HTML），不依赖任何生成器。

import { readFileSync } from "node:fs";

/** Bento 文本元素允许出现的行内标签白名单。 */
const SAFE_TAG = /^<\/?(?:b|i|br|em|strong|u|s|sub|sup|span|a)(?:\s[^>]*)?>$/;

/**
 * 扫描文档对象，找出会被 HTML 吞掉的裸 `<`。
 *
 * 对齐 HTML5 词法规则：只有 `<` 后紧跟 字母 / `/` / `!` / `?` 才开启标签或注释，
 * 才可能吞掉后续文字；`< BM`（后跟空格）与 `<1`（后跟数字）都是安全的字面量，
 * 若一并报错会造成大量误报（实测 s4-t1「< BM ≤ 2/3」就被误报过）。
 */
export function scanTextHazards(doc) {
  const bad = [];
  for (const s of doc.slides ?? []) {
    for (const el of s.elements ?? []) {
      if (el.type !== "text" || typeof el.html !== "string") continue;
      const re = /<[A-Za-z/!?][^>]{0,80}/g;
      let m;
      while ((m = re.exec(el.html))) {
        const gt = el.html.indexOf(">", m.index);
        const tag = gt < 0 ? el.html.slice(m.index) : el.html.slice(m.index, gt + 1);
        if (!SAFE_TAG.test(tag)) {
          bad.push({ slide: s.id, el: el.id, frag: tag.slice(0, 70) });
        }
      }
    }
  }
  return bad;
}

/** 找出同一页内重复的元素 id（Bento 要求页内唯一）。 */
export function findDuplicateIds(doc) {
  const dups = [];
  for (const s of doc.slides ?? []) {
    const seen = new Map();
    for (const el of s.elements ?? []) {
      seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
    }
    for (const [id, n] of seen) if (n > 1) dups.push({ slide: s.id, id, count: n });
  }
  return dups;
}

/** 读生成的文档 JSON（把 \\u003c 还原回 `<` 再解析，与生成器一致）。 */
export function loadDocJson(path) {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw.replace(/\\u003c/g, "<"));
}

/** 从成品 HTML 里抽出真正落盘的 bento-doc（这才是"发出去的东西"）。 */
export function extractEmbeddedDoc(htmlPath) {
  const html = readFileSync(htmlPath, "utf8");
  const open = '<script type="application/bento+json" id="bento-doc">';
  const close = "</" + "script>";
  const i = html.indexOf(open);
  if (i < 0) return { ok: false, reason: "bento-doc 块缺失" };
  const j = html.indexOf(close, i);
  if (j < 0) return { ok: false, reason: "bento-doc 关闭标签缺失" };
  try {
    const doc = JSON.parse(html.slice(i + open.length, j).replace(/\\u003c/g, "<"));
    return { ok: true, doc };
  } catch (e) {
    return { ok: false, reason: "bento-doc JSON 解析失败: " + e.message };
  }
}

/**
 * 比对「生成的 JSON」与「HTML 里真正嵌进去的文档」。
 *
 * 这是对本次会话第 2 个缺陷的机械化拦截：
 *   生成器因语法错误没执行 --embed，但后续命令照跑，
 *   成品里留着上一份课件的文档 —— 从文件名和体积看毫无异常。
 *   当时靠 check-doc 打出 slides:17 才发现。现在自动判红。
 */
export function compareDocs(jsonDoc, embeddedDoc) {
  const issues = [];
  const a = jsonDoc.slides?.length ?? -1;
  const b = embeddedDoc.slides?.length ?? -1;
  if (a !== b) issues.push(`页数不一致：生成 JSON=${a}，成品 HTML 内嵌=${b}`);
  if (jsonDoc.title !== embeddedDoc.title) {
    issues.push(`标题不一致：生成 JSON="${jsonDoc.title}"，成品 HTML 内嵌="${embeddedDoc.title}"`);
  }
  return issues;
}

/** 统计文档规模。 */
export function docStats(doc) {
  const slides = doc.slides ?? [];
  return {
    slides: slides.length,
    elements: slides.reduce((a, s) => a + (s.elements?.length ?? 0), 0),
    texts: slides.reduce((a, s) => a + (s.elements ?? []).filter((e) => e.type === "text").length, 0),
  };
}
