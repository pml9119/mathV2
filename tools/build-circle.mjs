// build-circle.mjs — 《直线与圆的位置关系》教学课件生成器
//
// 内容主线（13 页）：概念 → 两种判定 → 弦长 → 切线 → 最值 → 例题 → 真题 → 总结。
// 全部数值结论在代码里由坐标算出或逐式复核，不靠记忆：
//   · S5/S11 弦长 |AB| = 2√(r²−d²) 与代数法 |AB| = √(1+k²)·√Δ/|p| 两条路互相对照；
//   · S8 切线长 2√3、切点弦 x=1、∠APB=60° 三条结论同源同图（都长在 Rt△PTO 里）；
//   · S12 真题（点在圆上/圆内/圆外 ⇒ d 与 r）与左侧三联图逐格对应。
//
// 图形策略：解析几何是平面问题，不需要 mathV2 的隐式曲线引擎，
//           也不需要立体几何的 3D 投影 —— 全部用「世界坐标 → 屏幕坐标」的
//           一次性线性变换 + 内联 SVG 手写（与 build-solid.mjs 同一套白名单标签：
//           circle / line / path / text / animate）。
// 动画策略：SMIL 只驱动 <line> 的 x1,y1,x2,y2、<circle> 的 cx,cy、<text> 的 x,y，
//           采样成 values 值表（既有课件已验证的可靠写法）；
//           直角标记一律画成两段 <line>，不动 path 的 d。
//
// 图内说明文字：统一放【左下角】—— 智能控制条浮在右下角，
//   既有课件里居中的图注被控制条压住过，这是本次刻意规避的排版坑。
//
// 用法：node tools/build-circle.mjs [--embed]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const TARGET = join(ROOT, "line-circle.bento.html");

/* ─────────────────────────── 配色与字体 ─────────────────────────── */
const BG = "#0B1020", INK = "#E9EEF8";
const INK_SOFT = "rgba(233,238,248,0.62)", INK_DIM = "rgba(233,238,248,0.38)";
const ACCENT = "#4CC9F0", AMBER = "#F9C74F", GREEN = "#7CDFB0", ROSE = "#FF7B8C";
const CARD = "rgba(255,255,255,0.035)", CARD_STROKE = "rgba(255,255,255,0.11)";
const EDGE = "rgba(233,238,248,0.42)";
const FONT = "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif";
const M2W = 560, M2H = 430;

/* ─────────────────────────── 画板工厂 ─────────────────────────── */
function T(id, x, y, w, h, html, o = {}) {
  return {
    id, type: "text", x, y, w, h: o.autoH ? 0 : h, rotation: 0, opacity: 1, html,
    fontSize: o.fontSize ?? 19, fontFamily: FONT, fontWeight: o.fontWeight ?? 500,
    color: o.color ?? INK, align: o.align ?? "left", valign: o.valign ?? "top",
    lineHeight: o.lineHeight ?? 1.5, ...(o.letterSpacing ? { letterSpacing: o.letterSpacing } : {}),
  };
}
function R(id, x, y, w, h, o = {}) {
  return {
    id, type: "shape", shape: "rect", x, y, w, h, rotation: 0, opacity: 1,
    fill: o.fill ?? CARD, stroke: o.stroke ?? CARD_STROKE, strokeWidth: o.strokeWidth ?? 1,
    radius: o.radius ?? 18,
  };
}
/** 强调色高亮条 */
function band(id, x, y, w, h, o = {}) {
  return R(id, x, y, w, h, {
    fill: o.fill ?? "rgba(76,201,240,0.12)",
    stroke: o.stroke ?? "rgba(76,201,240,0.38)",
    radius: o.radius ?? 14,
  });
}
function slide(id, background, transition, notes, elements) {
  return { id, background, transition, notes, elements };
}
const svgEl = (id, x, y, w, h, markup, anim = false) => ({
  id, type: "svg", x, y, w, h, rotation: 0, opacity: 1,
  markup: anim ? markup.replace("<svg ", '<svg data-anim="1" ') : markup,
});
const kick = (t, o = {}) => T("k", 96, 62, 760, 30, t, { fontSize: 15, fontWeight: 700, letterSpacing: 3.5, color: ACCENT, ...o });
const title = (t, o = {}) => T("ttl", 96, 100, 1088, 96, t, { fontSize: 46, fontWeight: 800, color: INK, lineHeight: 1.12, ...o });

/* ─────────────────── 文字高度估算（盒高跟内容走） ───────────────────
   红线：盒高不要手填。手填值必然与内容失配（实测积累出 21 处 overflow）。
   autoH 是估算而非实测，价值在于「随内容同步变化」：改字号/改文案时盒高自动跟上，
   最终把关靠 validate（浏览器实测）。

   本课实测教训（首轮 validate 报 7 处溢出，全是「少算一整行」）：
   按源码字符数估算 **含行内公式** 的段落会系统性偏窄 —— $\dfrac{}{}$、$\sqrt{}$、
   上下标在 KaTeX 里占的横向宽度明显大于它在源码里看起来的长度。
   所以：先把 &lt;/&gt;/&nbsp; 还原成 1 个字符，再对含 $ 的段落乘 1.5 放量。
   行高系数不必再放大：实测浏览器每行约 fs×1.31~1.50，而 lh 取 1.5+ 已覆盖。

   放量系数 1.35 → 1.50（本次实测）：全量档 validate 在 s6-d2 上给出的是
   「间歇性」溢出 —— 同一条命令、同一份成品，一次报 warning=2，紧接着单跑又报
   warning=0。根因不是宽度误差，而是**换行点**：行内公式是不可断的字形整块，
   贪心换行在它前后提前断行，实际行数可能比按总宽度算出的理想行数多一行。
   系数 1.35 恰好卡在「估算 2 行 / 实际 3 行」的边界上，同一段文字于是能随机翻红。
   取 1.5 后 s6-d2 稳稳算作 3 行（估算 68px，浏览器实测只需 50px）。
   宁可整体多留一行，也不要留一个会随机变红的下界。 */
export function estimateTextH(el) {
  const fs = el.fontSize ?? 19;
  const lh = el.lineHeight ?? 1.5;
  const boxW = el.w ?? 400;
  const widthOf = (s) => [...s].reduce((a, ch) => a + (ch.charCodeAt(0) > 0x2e80 ? 1 : 0.55), 0);
  const perLine = Math.max(1, Math.floor(boxW / fs));
  let lines = 0;
  for (const seg of String(el.html).split(/<br\s*\/?>/i)) {
    const plain = seg
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
    const w = widthOf(plain) * (/\$/.test(plain) ? 1.5 : 1);
    lines += Math.max(1, Math.ceil(w / perLine));
  }
  return Math.ceil(lines * fs * lh + 8);
}
function resolveAutoHeights(doc) {
  for (const s of doc.slides) {
    for (const el of s.elements) {
      if (el.type === "text" && el.h === 0) el.h = estimateTextH(el);
    }
  }
  return doc;
}

/* ─────────────────── SVG 片段工厂（白名单标签） ─────────────────── */
const f1 = (v) => Number(v).toFixed(1);
const Fd = (x, y, r, c) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${c}"/>`;
const Tx = (x, y, t, o = {}) =>
  `<text x="${f1(x)}" y="${f1(y)}" fill="${o.color ?? INK_SOFT}" font-size="${o.size ?? 14}" font-weight="${o.weight ?? 600}" text-anchor="${o.anchor ?? "middle"}" font-family="${FONT}">${t}</text>`;
const Ln = (x1, y1, x2, y2, o = {}) =>
  `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${o.stroke ?? EDGE}" stroke-width="${o.w ?? 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>`;
/** 闭合多边形 → path（polygon 不在 sanitizer 白名单，统一用 path） */
const polyD = (pts) => pts.map((p, i) => `${i ? "L" : "M"} ${f1(p[0])} ${f1(p[1])}`).join(" ") + " Z";
const poly = (pts, o = {}) =>
  `<path d="${polyD(pts)}" fill="${o.fill ?? "none"}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.w ?? 1.6}"` : ""}${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>`;
const circ = (cx, cy, r, o = {}) =>
  `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="${o.fill ?? "none"}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.w ?? 1.6}"` : ""}${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>`;

/** SMIL：沿采样点序列驱动属性（既有课件已验证的可靠写法） */
const MOVE = (attr, vals, dur) =>
  `<animate attributeName="${attr}" values="${vals}" dur="${dur}" repeatCount="indefinite" calcMode="linear"/>`;
const PULSE = (a = 6.5, b = 9) => `<animate attributeName="r" values="${a};${b};${a}" dur="1.6s" repeatCount="indefinite"/>`;
const seq = (pts, i) => pts.map((p) => f1(p[i])).join(";");

/** 动线段：pts 为采样序列，每项 [x1,y1,x2,y2]；只给一项 = 静止线段。 */
function animLine(pts, o = {}) {
  const p0 = pts[0];
  const anim = pts.length > 1
    ? ["x1", "y1", "x2", "y2"].map((a, i) => MOVE(a, seq(pts, i), o.dur)).join("")
    : "";
  return `<line x1="${f1(p0[0])}" y1="${f1(p0[1])}" x2="${f1(p0[2])}" y2="${f1(p0[3])}" stroke="${o.stroke ?? EDGE}" stroke-width="${o.w ?? 1.6}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}>${anim}</line>`;
}
/** 动点：pts 为采样序列，每项 [x,y] */
function animDot(pts, r, fill, o = {}) {
  const anim = pts.length > 1
    ? MOVE("cx", seq(pts, 0), o.dur) + MOVE("cy", seq(pts, 1), o.dur)
    : "";
  return `<circle cx="${f1(pts[0][0])}" cy="${f1(pts[0][1])}" r="${r}" fill="${fill}">${anim}${o.pulse && pts.length > 1 ? PULSE() : ""}</circle>`;
}
/** 动标签：text 的 x、y 一起动画 */
function animText(pts, txt, o = {}) {
  const anim = pts.length > 1 ? MOVE("x", seq(pts, 0), o.dur) + MOVE("y", seq(pts, 1), o.dur) : "";
  return `<text x="${f1(pts[0][0])}" y="${f1(pts[0][1])}" fill="${o.color ?? INK_SOFT}" font-size="${o.size ?? 14}" font-weight="${o.weight ?? 600}" text-anchor="${o.anchor ?? "middle"}" font-family="${FONT}">${txt}${anim}</text>`;
}
const unit = (dx, dy) => { const n = Math.hypot(dx, dy) || 1; return [dx / n, dy / n]; };

/**
 * 直角标记：顶点采样序列 Qs，两条边各给一个「指向」的采样序列 As、Bs。
 * 画成两段 <line>（不动 path 的 d），可随图形一起动。
 */
function rightAngle(Qs, As, Bs, o = {}) {
  const L = o.len ?? 16, st = o.stroke ?? AMBER;
  const p1 = [], p2 = [], p3 = [];
  for (let i = 0; i < Qs.length; i++) {
    const Q = Qs[i];
    const ua = unit(As[i][0] - Q[0], As[i][1] - Q[1]);
    const ub = unit(Bs[i][0] - Q[0], Bs[i][1] - Q[1]);
    const m1 = [Q[0] + ua[0] * L, Q[1] + ua[1] * L];
    const m3 = [Q[0] + ub[0] * L, Q[1] + ub[1] * L];
    p1.push(m1);
    p2.push([m1[0] + ub[0] * L, m1[1] + ub[1] * L]);
    p3.push(m3);
  }
  const seg1 = animLine(p1.map((p, i) => [p[0], p[1], p2[i][0], p2[i][1]]), { stroke: st, w: o.w ?? 1.4, dur: o.dur });
  const seg2 = animLine(p2.map((p, i) => [p[0], p[1], p3[i][0], p3[i][1]]), { stroke: st, w: o.w ?? 1.4, dur: o.dur });
  return seg1 + seg2;
}

/* ─────────────────── 世界坐标 → 屏幕坐标 ─────────────────── */
/** 数学坐标（y 向上）→ SVG 屏幕坐标（y 向下）：s 像素/单位，原点落在 (ox,oy)。 */
function view(s, ox, oy) {
  const P = (x, y) => [ox + x * s, oy - y * s];
  return { P, s, ox, oy };
}
/** 圆上一点（数学极角，逆时针为正） */
const onC = (cx, cy, R, th) => [cx + R * Math.cos(th), cy - R * Math.sin(th)];
/** 直线（过 P、方向角 th）与圆（圆心 C、半径 R）的交点；无交点返回 [] */
function lineCircle(P, th, C, R) {
  const u = [Math.cos(th), Math.sin(th)];
  const w = [P[0] - C[0], P[1] - C[1]];
  const t = w[0] * u[0] + w[1] * u[1];
  const F = [P[0] - u[0] * t, P[1] - u[1] * t];      // 圆心在直线上的垂足
  const d = Math.hypot(F[0] - C[0], F[1] - C[1]);
  if (d > R) return [];
  const h = Math.sqrt(Math.max(0, R * R - d * d));
  return [[F[0] - u[0] * h, F[1] - u[1] * h], [F[0] + u[0] * h, F[1] + u[1] * h]];
}
const svgWrap = (w, h, g) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%">${g}</svg>`;

/**
 * 图注宽度的粗略估计（px）：CJK 按 1 字宽、ASCII 0.5、空格 0.28。
 * 只用于给图注做「自动让位」，不参与版面高度计算。
 */
function textW(t, fs) {
  const u = [...String(t)].reduce((a, ch) => a + (ch === " " ? 0.28 : ch.charCodeAt(0) > 0x2e80 ? 1 : 0.5), 0);
  return u * fs;
}
/**
 * 图内说明：统一左下角。
 * 右下角被智能控制条占用（实测其左缘 ≈ viewBox x 288），图注必须待在 x < 288 的
 * 安全区里 —— 宽度超限就自动缩字号，而不是让它压到控制条底下。
 * （S5 首轮拍屏就出现过图注被控制条压掉半句，这里用代码堵住。）
 */
const CAP_SAFE = 262;
function cap(main, sub) {
  const fit = (t, fs) => Math.max(10.5, Math.min(fs, (CAP_SAFE / Math.max(1, textW(t, fs))) * fs));
  const r1 = (v) => Math.round(v * 10) / 10;
  let g = Tx(10, 402, main, { color: ACCENT, size: r1(fit(main, 14.5)), weight: 700, anchor: "start" });
  if (sub) g += Tx(10, 424, sub, { color: INK_DIM, size: r1(fit(sub, 12.5)), weight: 600, anchor: "start" });
  return g;
}
/** 圆心标记 + 名称 */
function center(C, name = "O", o = {}) {
  return Fd(C[0], C[1], 4.5, "rgba(233,238,248,0.85)") +
    Tx(C[0] + (o.dx ?? -16), C[1] + (o.dy ?? 20), name, { color: INK_SOFT, size: 14.5, weight: 800 });
}

/* ══════════════════════ S1 封面图：切线随切点转动 ══════════════════════ */
function coverFig() {
  const C = [286, 208], R = 150, N = 48, DUR = "18s";
  const p = [], tan = [], radii = [], ra3 = [];
  for (let i = 0; i <= N; i++) {
    const th = (2 * Math.PI * i) / N;
    const q = onC(C[0], C[1], R, th);
    p.push(q);
    radii.push([q[0], q[1], C[0], C[1]]);
    const u = [Math.sin(th), Math.cos(th)];               // 屏幕坐标下的切线单位方向
    tan.push([q[0] - u[0] * 230, q[1] - u[1] * 230, q[0] + u[0] * 230, q[1] + u[1] * 230]);
    ra3.push([q[0] + u[0] * 16, q[1] + u[1] * 16]);
  }
  let g = "";
  g += circ(C[0], C[1], R, { stroke: "rgba(76,201,240,0.55)", w: 1.8 });
  g += circ(C[0], C[1], R + 26, { stroke: "rgba(76,201,240,0.14)", w: 1.2 });
  g += animLine(tan, { stroke: AMBER, w: 2, dur: DUR });
  g += animLine(radii, { stroke: GREEN, w: 1.8, dash: "6 4", dur: DUR });
  g += rightAngle(p, radii.map((r) => [r[2], r[3]]), ra3, { len: 16, stroke: AMBER, dur: DUR });
  g += center(C, "O");
  g += animDot(p, 8, ROSE, { dur: DUR, pulse: true });
  g += Tx(24, 30, "切点 P 在圆上运动", { color: ROSE, size: 14.5, weight: 700, anchor: "start" });
  g += Tx(24, 52, "切线始终 ⊥ 半径 OP", { color: AMBER, size: 14.5, weight: 700, anchor: "start" });
  g += cap("每一个切点，唯一一条切线", "拖动控制条可让 P 停在任意位置");
  return svgWrap(M2W, M2H, g);
}

/* ══════════════════════ S2 三种位置关系（静态三行） ══════════════════════ */
function threeCasesFig() {
  const R = 42, CX = 330;
  const rows = [
    { name: "相离", rel: "d &gt; r", dy: -66, vc: ROSE, pts: "0 个公共点" },
    { name: "相切", rel: "d = r", dy: -R, vc: AMBER, pts: "1 个公共点" },
    { name: "相交", rel: "d &lt; r", dy: -24, vc: GREEN, pts: "2 个公共点" },
  ];
  let g = "";
  rows.forEach((r, i) => {
    const cy = 84 + i * 134;
    const ly = cy + r.dy;
    // 左侧色条 + 名称
    g += Ln(26, cy - 26, 26, cy + 62, { stroke: "rgba(255,255,255,0.10)", w: 3 });
    g += Ln(24.5, cy - 26, 24.5, cy + 14, { stroke: r.vc, w: 3 });
    g += Tx(44, cy - 2, r.name, { color: r.vc, size: 22, weight: 900, anchor: "start" });
    g += Tx(120, cy + 26, r.rel, { color: r.vc, size: 16, weight: 800, anchor: "start" });
    g += Tx(44, cy + 52, r.pts, { color: INK_DIM, size: 12.5, weight: 600, anchor: "start" });
    // 圆与直线
    g += circ(CX, cy, R, { stroke: i === 1 ? AMBER : "rgba(76,201,240,0.6)", w: 1.8 });
    g += Ln(130, ly, 520, ly, { stroke: r.vc, w: 2.2 });
    // 半径 r（水平向左）与圆心到直线的距离 d（竖直）
    g += Ln(CX, cy, CX - R, cy, { stroke: GREEN, w: 1.8, dash: "5 4" });
    g += Tx(CX - R - 12, cy + 5, "r", { color: GREEN, size: 14.5, weight: 800 });
    g += Ln(CX, cy, CX, ly, { stroke: AMBER, w: 2.2 });
    g += Tx(CX + 14, (cy + ly) / 2 + 5, "d", { color: AMBER, size: 14.5, weight: 800, anchor: "start" });
    g += Fd(CX, cy, 4, "rgba(233,238,248,0.8)");
    g += Tx(CX - 14, cy + 4, "O", { color: INK_SOFT, size: 14, weight: 800 });
    g += Fd(CX, ly, 3.6, r.vc);
    if (r.name === "相交") {
      const h = Math.sqrt(R * R - 24 * 24);               // 半弦由勾股算出，不是画上去的
      g += Fd(CX - h, ly, 5.5, GREEN);
      g += Fd(CX + h, ly, 5.5, GREEN);
      g += Tx(CX - h - 12, ly - 8, "A", { color: GREEN, size: 14, weight: 800 });
      g += Tx(CX + h + 12, ly - 8, "B", { color: GREEN, size: 14, weight: 800 });
    }
  });
  return svgWrap(M2W, M2H, g);
}

/* ══════════════════════ S3 几何法：直线平移，d 由大变小 ══════════════════════ */
function geometricFig() {
  const C = [300, 232], R = 92, N = 40, DUR = "13s";
  const yTop = C[1] - 152, yBot = C[1] + 46;             // d: 152 → 46（r = 92）
  const lines = [], foot = [], seg = [];
  for (let i = 0; i <= N; i++) {
    const y = yTop + ((yBot - yTop) * i) / N;
    lines.push([54, y, 546, y]);
    foot.push([C[0], y]);
    seg.push([C[0], C[1], C[0], y]);
  }
  let g = "";
  g += circ(C[0], C[1], R, { stroke: "rgba(76,201,240,0.65)", w: 1.8 });
  // 相切参考线（d = r）
  g += Ln(54, C[1] - R, 546, C[1] - R, { stroke: "rgba(249,199,79,0.32)", w: 1.4, dash: "6 6" });
  g += Tx(544, C[1] - R - 8, "d = r", { color: "rgba(249,199,79,0.8)", size: 12.5, weight: 700, anchor: "end" });
  g += animLine(lines, { stroke: ROSE, w: 2.4, dur: DUR });
  g += animLine(seg, { stroke: AMBER, w: 2.2, dur: DUR });
  g += animDot(foot, 5, AMBER, { dur: DUR });
  g += Ln(C[0], C[1], C[0] - R, C[1], { stroke: GREEN, w: 1.8, dash: "5 4" });
  g += Tx(C[0] - R - 14, C[1] + 5, "r", { color: GREEN, size: 15, weight: 800 });
  g += Tx(C[0] + 14, C[1] - 46 + 6, "d", { color: AMBER, size: 14.5, weight: 800, anchor: "start" });
  g += center(C, "O");
  g += Tx(300, 74, "直线 l", { color: ROSE, size: 14, weight: 700 });
  g += cap("直线平移 ⇒ 距离 d 由 d &gt; r 变到 d &lt; r", "拖动控制条可停在 d = r（相切）的瞬间");
  return svgWrap(M2W, M2H, g);
}

/* ══════════════════════ S5 弦长：垂径定理 ══════════════════════ */
function chordFig() {
  const C = [286, 212], R = 104, N = 34, DUR = "12s";
  const yTop = C[1] - 95, yBot = C[1] + 84;
  const line = [], dotA = [], dotB = [], mid = [], seg = [], labA = [], labB = [], labM = [];
  for (let i = 0; i <= N; i++) {
    const y = yTop + ((yBot - yTop) * i) / N;
    const d = Math.abs(y - C[1]);
    const h = Math.sqrt(Math.max(0, R * R - d * d));
    const A = [C[0] - h, y], B = [C[0] + h, y], M = [C[0], y];
    line.push([A[0] - 34, y, B[0] + 34, y]);
    dotA.push(A); dotB.push(B); mid.push(M);
    seg.push([C[0], C[1], M[0], M[1]]);
    labA.push([A[0] - 16, y + 6]); labB.push([B[0] + 16, y + 6]); labM.push([M[0] - 14, y - 10]);
  }
  let g = "";
  g += circ(C[0], C[1], R, { stroke: "rgba(76,201,240,0.65)", w: 1.8 });
  g += animLine(line, { stroke: "rgba(255,123,140,0.5)", w: 1.6, dur: DUR });
  g += animLine(seg, { stroke: AMBER, w: 2.2, dur: DUR });
  g += animLine(dotA.map((A, i) => [A[0], A[1], dotB[i][0], dotB[i][1]]), { stroke: ACCENT, w: 3, dur: DUR });
  g += rightAngle(mid, dotA, mid.map(() => C), { len: 15, stroke: AMBER, dur: DUR });
  g += animDot(dotA, 6, ACCENT, { dur: DUR });
  g += animDot(dotB, 6, ACCENT, { dur: DUR });
  g += animDot(mid, 4.5, AMBER, { dur: DUR });
  g += animText(labA, "A", { color: ACCENT, size: 15, weight: 800, dur: DUR });
  g += animText(labB, "B", { color: ACCENT, size: 15, weight: 800, dur: DUR });
  g += animText(labM, "M", { color: AMBER, size: 14, weight: 800, dur: DUR });
  g += Ln(C[0], C[1], C[0] - R, C[1], { stroke: GREEN, w: 1.8, dash: "5 4" });
  g += Tx(C[0] - R - 14, C[1] + 5, "r", { color: GREEN, size: 15, weight: 800 });
  g += Tx(C[0] + 16, C[1] + 5, "d", { color: AMBER, size: 14.5, weight: 800, anchor: "start" });
  g += center(C, "O");
  g += cap("OM ⊥ AB ⇒ |AB| = 2√(r² − d²)", "M 是 AB 中点；d 越大弦越短");
  return svgWrap(M2W, M2H, g);
}

/* ══════════════════════ S6 过圆内定点的弦：最长与最短 ══════════════════════ */
function shortestChordFig() {
  const S = 21.6, C = [282, 214], R = 5 * S, N = 40, DUR = "14s";
  const P = [C[0] + 3 * S, C[1] - 1 * S];                // 例中 P(3,1)，圆 x²+y²=25
  const chords = [], dA = [], dB = [];
  for (let i = 0; i <= N; i++) {
    const th = (Math.PI * i) / N;                        // 弦的方向以 π 为周期
    const pts = lineCircle(P, th, C, R);
    if (pts.length < 2) continue;
    chords.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
    dA.push(pts[0]); dB.push(pts[1]);
  }
  const cpTh = Math.atan2(P[1] - C[1], P[0] - C[0]);
  const shortPts = lineCircle(P, cpTh + Math.PI / 2, C, R);
  const longPts = lineCircle(P, cpTh, C, R);
  let g = "";
  g += circ(C[0], C[1], R, { stroke: "rgba(76,201,240,0.65)", w: 1.8 });
  g += Ln(...longPts[0], ...longPts[1], { stroke: GREEN, w: 2, dash: "7 5" });
  g += Ln(...shortPts[0], ...shortPts[1], { stroke: ROSE, w: 2, dash: "7 5" });
  g += animLine(chords, { stroke: ACCENT, w: 2.6, dur: DUR });
  g += animDot(dA, 5.5, ACCENT, { dur: DUR });
  g += animDot(dB, 5.5, ACCENT, { dur: DUR });
  g += Ln(C[0], C[1], P[0], P[1], { stroke: AMBER, w: 2 });
  g += center(C, "C");
  g += Fd(P[0], P[1], 6, ROSE);
  g += Tx(P[0] + 14, P[1] - 8, "P(3, 1)", { color: ROSE, size: 14, weight: 800, anchor: "start" });
  g += Tx((C[0] + P[0]) / 2 + 4, (C[1] + P[1]) / 2 - 12, "|CP| = √10", { color: AMBER, size: 13, weight: 700 });
  g += Tx(longPts[1][0] - 8, longPts[1][1] - 10, "最长 = 2r = 10", { color: GREEN, size: 13, weight: 700, anchor: "end" });
  g += Tx(shortPts[0][0] - 8, shortPts[0][1] + 20, "最短 = 2√15", { color: ROSE, size: 13, weight: 700, anchor: "end" });
  g += cap("过圆内定点：直径最长，⊥ CP 最短", "弦长只由「圆心到弦的距离」决定");
  return svgWrap(M2W, M2H, g);
}

/* ══════════════════════ S7 过圆上一点：唯一一条切线 ══════════════════════ */
function tangentPointFig() {
  const C = [286, 210], R = 108, N = 44, DUR = "16s";
  const P = [], tan = [], radii = [], ra3 = [];
  for (let i = 0; i <= N; i++) {
    const th = (2 * Math.PI * i) / N;
    const q = onC(C[0], C[1], R, th);
    P.push(q);
    radii.push([q[0], q[1], C[0], C[1]]);
    const u = [Math.sin(th), Math.cos(th)];
    tan.push([q[0] - u[0] * 200, q[1] - u[1] * 200, q[0] + u[0] * 200, q[1] + u[1] * 200]);
    ra3.push([q[0] + u[0] * 16, q[1] + u[1] * 16]);
  }
  let g = "";
  g += circ(C[0], C[1], R, { stroke: "rgba(76,201,240,0.65)", w: 1.8 });
  g += animLine(tan, { stroke: AMBER, w: 2.4, dur: DUR });
  g += animLine(radii, { stroke: GREEN, w: 2, dur: DUR });
  g += rightAngle(P, radii.map((r) => [r[2], r[3]]), ra3, { len: 16, stroke: AMBER, dur: DUR });
  g += center(C, "O");
  g += animDot(P, 7.5, ROSE, { dur: DUR, pulse: true });
  g += Tx(24, 30, "切点 P", { color: ROSE, size: 14.5, weight: 700, anchor: "start" });
  g += Tx(24, 52, "切线 ⊥ OP", { color: AMBER, size: 14.5, weight: 700, anchor: "start" });
  g += cap("过圆上一点 P：有且只有一条切线", "把 P 换到圆内，一条切线也作不出来");
  return svgWrap(M2W, M2H, g);
}

/* ══════════════════════ S8 过圆外一点：两条切线（静态） ══════════════════════ */
function twoTangentsFig() {
  const V = view(52, 170, 262);
  const P4 = V.P(4, 0), T1 = V.P(1, Math.sqrt(3)), T2 = V.P(1, -Math.sqrt(3)), O = V.P(0, 0);
  const R = 2 * V.s;
  let g = "";
  g += circ(O[0], O[1], R, { stroke: "rgba(76,201,240,0.65)", w: 1.8 });
  g += Ln(...T1, ...T2, { stroke: ACCENT, w: 2.6 });                    // 切点弦 x = 1
  g += Ln(...P4, ...T1, { stroke: AMBER, w: 2.2 });
  g += Ln(...P4, ...T2, { stroke: AMBER, w: 2.2 });
  g += Ln(...O, ...T1, { stroke: GREEN, w: 1.8, dash: "5 4" });
  g += Ln(...O, ...T2, { stroke: GREEN, w: 1.8, dash: "5 4" });
  g += Ln(...O, ...P4, { stroke: INK_DIM, w: 1.6, dash: "4 4" });
  g += rightAngle([T1], [P4], [O], { len: 16, stroke: AMBER });
  g += rightAngle([T2], [P4], [O], { len: 16, stroke: AMBER });
  g += center(O, "O");
  g += Fd(...P4, 6, ROSE);
  g += Tx(P4[0] + 10, P4[1] + 22, "P(4, 0)", { color: ROSE, size: 14.5, weight: 800, anchor: "start" });
  g += Fd(...T1, 6, GREEN);
  g += Fd(...T2, 6, GREEN);
  g += Tx(T1[0] - 12, T1[1] - 10, "T₁(1, √3)", { color: GREEN, size: 13.5, weight: 700, anchor: "end" });
  g += Tx(T2[0] - 12, T2[1] + 20, "T₂(1, −√3)", { color: GREEN, size: 13.5, weight: 700, anchor: "end" });
  g += Tx((T1[0] + T2[0]) / 2 + 14, 216, "切点弦 x = 1", { color: ACCENT, size: 13, weight: 700, anchor: "start" });
  g += Tx((O[0] + P4[0]) / 2, O[1] + 22, "|PO| = 4", { color: INK_DIM, size: 12.5, weight: 600 });
  g += cap("|PT| = √(|PO|² − r²) = √12 = 2√3", "两切点连线（切点弦）：x₀x + y₀y = r² ⇒ x = 1");
  return svgWrap(M2W, M2H, g);
}

/* ══════════════════════ S9 圆上点到直线的距离最值 ══════════════════════ */
function maxMinFig() {
  const C = [268, 186], R = 84, N = 40, DUR = "13s";
  const LY = 378;
  const M = [], seg = [];
  for (let i = 0; i <= N; i++) {
    const th = (2 * Math.PI * i) / N;
    const q = onC(C[0], C[1], R, th);
    M.push(q);
    seg.push([q[0], q[1], q[0], LY]);
  }
  let g = "";
  g += Ln(40, LY, 520, LY, { stroke: ROSE, w: 2.4 });
  g += Tx(514, LY - 12, "l", { color: ROSE, size: 15, weight: 800, anchor: "end" });
  g += circ(C[0], C[1], R, { stroke: "rgba(76,201,240,0.65)", w: 1.8 });
  g += Ln(C[0], C[1], C[0], LY, { stroke: INK_DIM, w: 1.4, dash: "4 4" });
  g += Tx(C[0] + 12, (C[1] + LY) / 2, "d", { color: INK_SOFT, size: 14, weight: 800, anchor: "start" });
  g += Ln(C[0], C[1] - R, C[0], LY, { stroke: GREEN, w: 1.6, dash: "5 4" });   // d + r
  g += Ln(C[0], C[1] + R, C[0], LY, { stroke: ROSE, w: 1.6, dash: "5 4" });    // d − r
  g += Fd(C[0], C[1] - R, 6, GREEN);
  g += Fd(C[0], C[1] + R, 6, ROSE);
  g += Tx(C[0] + 12, C[1] - R + 5, "d + r", { color: GREEN, size: 13.5, weight: 700, anchor: "start" });
  g += Tx(C[0] + 12, C[1] + R + 5, "d − r", { color: ROSE, size: 13.5, weight: 700, anchor: "start" });
  g += animLine(seg, { stroke: "rgba(76,201,240,0.75)", w: 2, dur: DUR });
  g += animDot(M, 7, ACCENT, { dur: DUR, pulse: true });
  g += Fd(C[0], C[1], 4.5, "rgba(233,238,248,0.85)");
  g += Tx(C[0] - 16, C[1] + 6, "C", { color: INK_SOFT, size: 14.5, weight: 800 });
  g += cap("到直线 l 的距离 ∈ [d − r, d + r]", "例：d = 5、r = 2 ⇒ 距离范围 [3, 7]");
  return svgWrap(M2W, M2H, g);
}

/* ══════════════════════ S10 直线绕圆内定点转动 ⇒ 恒相交 ══════════════════════ */
function fixedPointFig() {
  const V = view(21, 229, 257);                          // C(1,2) 落在屏幕 (250,215)
  const Cw = V.P(1, 2), Pw = V.P(3, 1), R = 5 * V.s;
  const N = 36, DUR = "13s";
  const lines = [], chord = [], dA = [], dB = [];
  for (let i = 0; i <= N; i++) {
    const th = (Math.PI * i) / N;
    const u = [Math.cos(th), Math.sin(th)];
    const TL = 250;
    lines.push([Pw[0] - u[0] * TL, Pw[1] - u[1] * TL, Pw[0] + u[0] * TL, Pw[1] + u[1] * TL]);
    const pts = lineCircle(Pw, th, Cw, R);
    if (pts.length === 2) {
      chord.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
      dA.push(pts[0]); dB.push(pts[1]);
    }
  }
  let g = "";
  g += circ(Cw[0], Cw[1], R, { stroke: "rgba(76,201,240,0.65)", w: 1.8 });
  g += animLine(lines, { stroke: "rgba(255,123,140,0.7)", w: 2, dur: DUR });
  g += animLine(chord, { stroke: ACCENT, w: 2.8, dur: DUR });
  g += animDot(dA, 6, ACCENT, { dur: DUR });
  g += animDot(dB, 6, ACCENT, { dur: DUR });
  g += Ln(...Cw, ...Pw, { stroke: AMBER, w: 2 });
  g += center(Cw, "C");
  g += Fd(Pw[0], Pw[1], 6.5, ROSE);
  g += Tx(Pw[0] + 14, Pw[1] - 8, "P(3, 1)", { color: ROSE, size: 14, weight: 800, anchor: "start" });
  g += Tx((Cw[0] + Pw[0]) / 2 - 28, (Cw[1] + Pw[1]) / 2 + 16, "|CP| = √5", { color: AMBER, size: 13, weight: 700 });
  g += Tx(18, 30, "l: (2m+1)x + (m+1)y = 7m+4", { color: INK_SOFT, size: 13, weight: 700, anchor: "start" });
  g += cap("l 恒过圆内定点 ⇒ 与圆有两个交点", "因为 d ≤ |CP| = √5 &lt; 5 = r");
  return svgWrap(M2W, M2H, g);
}

/* ══════════════════════ S11 弦长计算图（静态，几何法三步） ══════════════════════ */
function chordCalcFig() {
  const V = view(84, 250, 236);
  const O = V.P(0, 0), R = 2 * V.s;
  // 直线 x − y + 1 = 0 与圆 x²+y²=4 的交点
  const A = V.P((-1 + Math.sqrt(7)) / 2, (1 + Math.sqrt(7)) / 2);
  const B = V.P((-1 - Math.sqrt(7)) / 2, (1 - Math.sqrt(7)) / 2);
  const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  const u = [V.s * Math.SQRT1_2, -V.s * Math.SQRT1_2];
  let g = "";
  g += circ(O[0], O[1], R, { stroke: "rgba(76,201,240,0.65)", w: 1.8 });
  g += Ln(A[0] - u[0] * 1.7, A[1] - u[1] * 1.7, B[0] + u[0] * 1.7, B[1] + u[1] * 1.7, { stroke: "rgba(255,123,140,0.55)", w: 1.8 });
  g += Ln(...A, ...B, { stroke: ACCENT, w: 3 });
  g += Ln(...O, ...M, { stroke: AMBER, w: 2.2 });
  g += Ln(...O, ...A, { stroke: GREEN, w: 1.8, dash: "5 4" });
  g += rightAngle([M], [A], [O], { len: 15, stroke: AMBER });
  g += Fd(O[0], O[1], 4.5, "rgba(233,238,248,0.85)");
  g += Fd(...A, 6, ACCENT);
  g += Fd(...B, 6, ACCENT);
  g += Fd(...M, 5, AMBER);
  g += Tx(O[0] - 10, O[1] + 22, "O", { color: INK_SOFT, size: 15, weight: 800 });
  g += Tx(A[0] + 18, A[1] - 12, "A", { color: ACCENT, size: 15, weight: 800 });
  g += Tx(B[0] - 18, B[1] + 22, "B", { color: ACCENT, size: 15, weight: 800 });
  g += Tx(M[0] + 18, M[1] - 8, "M", { color: AMBER, size: 14, weight: 800, anchor: "start" });
  g += Tx(M[0] + 26, M[1] + 34, "d = √2⁄2", { color: AMBER, size: 13, weight: 700, anchor: "start" });
  g += Tx((O[0] + A[0]) / 2 - 10, (O[1] + A[1]) / 2 + 4, "r = 2", { color: GREEN, size: 13, weight: 700, anchor: "end" });
  g += Tx((A[0] + M[0]) / 2, (A[1] + M[1]) / 2 - 12, "√14⁄2", { color: ACCENT, size: 13, weight: 700 });
  g += Tx(30, 48, "l: x − y + 1 = 0", { color: ROSE, size: 14, weight: 700, anchor: "start" });
  g += cap("|AB| = 2|AM| = 2√(r² − d²) = √14", "直角三角形 OMA 是全部弦长问题的骨架");
  return svgWrap(M2W, M2H, g);
}

/* ══════════════════════ S12 真题三联图（静态，viewBox 560×330） ══════════════════════ */
function examFig() {
  const s = 16, R = 32, CY = 138;
  const panels = [
    { cx: 96, a: 2, d: 32, tag: "A 在圆上", sub: "a² + b² = r²", verdict: "d = r ⇒ 相切", vc: GREEN },
    { cx: 280, a: 1, d: 64, tag: "A 在圆内", sub: "a² + b² &lt; r²", verdict: "d &gt; r ⇒ 相离", vc: ROSE },
    { cx: 464, a: 4, d: 16, tag: "A 在圆外", sub: "a² + b² &gt; r²", verdict: "d &lt; r ⇒ 相交", vc: ACCENT },
  ];
  let g = "";
  for (const p of panels) {
    const lx = p.cx + p.d, ax = p.cx + p.a * s;
    g += Tx(p.cx, 24, p.sub, { color: INK_SOFT, size: 13, weight: 700 });
    g += circ(p.cx, CY, R, { stroke: "rgba(76,201,240,0.6)", w: 1.7 });
    g += Ln(lx, 50, lx, 222, { stroke: p.vc, w: 2.2 });
    g += Ln(p.cx, CY, lx, CY, { stroke: AMBER, w: 2 });
    g += Fd(p.cx, CY, 4, "rgba(233,238,248,0.8)");
    g += Fd(ax, CY, 5.5, ROSE);
    g += Tx(ax, CY - 14, "A", { color: ROSE, size: 14, weight: 800 });
    if (p.a === 2) g += Fd(lx, CY, 5.5, GREEN);
    if (p.a === 4) {
      const h = Math.sqrt(R * R - p.d * p.d);
      g += Fd(lx, CY - h, 5, ACCENT);
      g += Fd(lx, CY + h, 5, ACCENT);
    }
    g += Tx(p.cx, 254, p.tag, { color: INK, size: 15, weight: 800 });
    g += Tx(p.cx, 280, p.verdict, { color: p.vc, size: 14, weight: 700 });
    g += Tx(p.cx, 306, "l: ax + by = r²", { color: INK_DIM, size: 12.5, weight: 600 });
  }
  return svgWrap(M2W, 330, g);
}

/* ══════════════════════ 页面装配 ══════════════════════ */
/**
 * 右侧步骤卡：高度按【内容需求】分配，而不是手填。
 *   need_i = 标题行 + 正文估算高度 + 内边距
 *   再按 need 的比例铺满 top..bottom 的整列 —— 内容多的卡自然拿到更多高度。
 * 内容总需求超过列高时显式告警：这类溢出必须回改文案，不能靠压扁卡片糊过去。
 */
function stepCards(id, steps, o = {}) {
  const n = steps.length;
  const top = o.top ?? 200, bottom = o.bottom ?? 690, gap = o.gap ?? 11;
  const fs = o.fs ?? 13, lh = o.lh ?? 1.52, ts = o.ts ?? 16.5;
  const W = 488, PAD = 22, inner = W - PAD * 2;
  const avail = bottom - top - gap * (n - 1);
  const needs = steps.map((st) => 12 + Math.ceil(ts * 1.5) + 6 + estimateTextH({ html: st.d, fontSize: fs, lineHeight: lh, w: inner }) + 10);
  const sum = needs.reduce((a, b) => a + b, 0);
  if (sum > avail) {
    console.warn(`!! 步骤卡内容需求 ${sum}px > 可用 ${avail}px（${id}）—— 文案偏长，建议精简`);
  }
  let y = top;
  const els = [];
  steps.forEach((st, i) => {
    const h = i === n - 1 ? bottom - y : Math.round((avail * needs[i]) / sum);
    els.push(R(`${id}-s${i}`, 696, y, W, h, { radius: 14, fill: st.fill ?? CARD, stroke: st.stroke ?? CARD_STROKE }));
    els.push(T(`${id}-t${i}`, 718, y + 12, inner, Math.ceil(ts * 1.5), st.t, { fontSize: ts, fontWeight: 800, color: st.tc ?? ACCENT }));
    els.push(T(`${id}-d${i}`, 718, y + 18 + Math.ceil(ts * 1.5), inner, 0, st.d, { autoH: true, fontSize: fs, lineHeight: lh, color: st.dc ?? INK }));
    y += h + gap;
  });
  return els;
}
/** 讲解页：左图 + 右侧 n 张步骤卡 */
function figSlide(id, kickT, titleT, fig, steps, notes, o = {}) {
  return slide(id, BG, o.transition ?? "none", notes, [
    kick(kickT), title(titleT),
    svgEl(`${id}-fig`, 96, o.figY ?? 218, o.figW ?? M2W, o.figH ?? M2H, fig, o.anim !== false),
    ...stepCards(id, steps, o),
  ]);
}
/** 右列底部结论条 */
function colBand(id, y, h, text, o = {}) {
  return [
    band(`${id}-band`, 696, y, 488, h, o),
    T(`${id}-bandt`, 722, y + 16, 436, 0, text, { autoH: true, fontSize: o.fs ?? 15.5, fontWeight: 700, color: o.color ?? ACCENT, align: "center", lineHeight: 1.5 }),
  ];
}

/* ══════════════════════ 文档 ══════════════════════ */
export function buildDoc() {
  const slides = [];

  /* ── S1 封面 ─────────────────────────────────────────────── */
  slides.push(slide("s1", BG, "none",
    "开场：直线与圆的关系，本质只有一个量——圆心到直线的距离 d。这一页让切点绕圆运动，先让学生看见「切线跟着切点转，且始终垂直于半径」。提问：如果直线和圆都不动，怎么用算式判断它们的位置关系？",
    [
      svgEl("cover-fig", 646, 96, 560, 430, coverFig(), true),
      T("ct", 96, 120, 520, 190, "直线与圆<br>的位置关系", { fontSize: 66, fontWeight: 900, lineHeight: 1.12 }),
      T("cs", 96, 356, 520, 34, "判定 · 弦长 · 切线 · 最值 —— 四种题型一套方法", { fontSize: 19, fontWeight: 500, color: INK_SOFT }),
      R("cline", 96, 404, 92, 3, { fill: ACCENT, stroke: "none", strokeWidth: 0, radius: 2 }),
      T("c1", 96, 428, 520, 30, "判定：比较 d 与 r（或看 Δ 的符号）", { fontSize: 16.5, color: ACCENT }),
      T("c2", 96, 462, 520, 30, "弦长：|AB| = 2√(r² − d²)", { fontSize: 16.5, color: GREEN }),
      T("c3", 96, 496, 520, 30, "切线：d = r 的特殊情形", { fontSize: 16.5, color: AMBER }),
      T("c4", 96, 530, 520, 30, "最值：把圆上的点换成圆心，再加减半径", { fontSize: 16.5, color: ROSE }),
      T("ck", 96, 592, 520, 26, "高中数学 · 解析几何专题复习", { fontSize: 15, fontWeight: 700, letterSpacing: 2.5, color: INK_DIM }),
      T("cp", 96, 668, 300, 22, "{{page:2}}", { fontSize: 13, fontWeight: 700, letterSpacing: 2, color: INK_DIM }),
    ]));

  /* ── S2 三种位置关系 ─────────────────────────────────────── */
  const s2 = [
    kick("概念 · 三种位置关系"),
    title("直线与圆的三种位置关系"),
    svgEl("s2-fig", 96, 206, M2W, M2H, threeCasesFig()),
    ...stepCards("s2", [
      { t: "相离：d &gt; r", d: "直线与圆没有公共点。联立消元后一元二次方程<b>无实根</b>（Δ &lt; 0）—— 圆心到直线的距离比半径大。", tc: ROSE, fill: "rgba(255,123,140,0.07)", stroke: "rgba(255,123,140,0.26)" },
      { t: "相切：d = r", d: "直线与圆<b>恰有 1 个</b>公共点。这个点叫切点，这条直线叫圆的切线。此时 Δ = 0。", tc: AMBER, fill: "rgba(249,199,79,0.07)", stroke: "rgba(249,199,79,0.28)" },
      { t: "相交：d &lt; r", d: "直线与圆有<b>2 个</b>公共点。直线被圆截得的线段叫弦，两个公共点就是弦的两端。此时 Δ &gt; 0。", tc: GREEN, fill: "rgba(124,223,176,0.07)", stroke: "rgba(124,223,176,0.28)" },
    ], { top: 200, bottom: 592 }),
    ...colBand("s2", 606, 84, "核心：位置关系 ⇔ d 与 r 的大小 ⇔ Δ 的符号", { fs: 16 }),
  ];
  slides.push(slide("s2", BG, "none",
    "三种位置关系不是三个独立知识点，而是同一个比较的三种结果。强调 d 与 r 这一对量的地位：初中用「公共点个数」定义，高中用「距离比较」判定——后者才是能算的。左图三行对照，要求学生自己说出每一行 d 与 r 的关系。",
    s2));

  /* ── S3 几何法 ───────────────────────────────────────────── */
  slides.push(figSlide("s3", "判定 · 方法一", "几何法：比较 d 与 r", geometricFig(),
    [
      { t: "① 化成标准式", d: "把圆写成 $(x-a)^2+(y-b)^2=r^2$，直接读出圆心 $(a,b)$ 与半径 $r$。" },
      { t: "② 算圆心到直线的距离", d: "直线 $l: Ax+By+C=0$ ⇒ $d=\\dfrac{|Aa+Bb+C|}{\\sqrt{A^2+B^2}}$。" },
      { t: "③ 比大小，下结论", d: "$d&gt;r$ ⇒ 相离（0 个公共点）<br>$d=r$ ⇒ 相切（1 个公共点）<br>$d&lt;r$ ⇒ 相交（2 个公共点）" },
      { t: "例：圆 x² + y² = 4 与 l: 3x + 4y − 5 = 0", d: "$d=\\dfrac{|3\\times 0+4\\times 0-5|}{\\sqrt{3^2+4^2}}=\\dfrac{5}{5}=1$，而 $r=2$ ⇒ $d&lt;r$ ⇒ <b>相交</b>（两个公共点）。", tc: GREEN, fill: "rgba(124,223,176,0.10)", stroke: "rgba(124,223,176,0.32)" },
    ],
    "几何法的全部计算只有一次点到直线的距离。左图可拖动：直线慢慢下移，d 从大于 r 变到小于 r，在 d = r 的瞬间直线与圆恰好只有一个公共点。让学生自己用控制条把那个瞬间找出来。",
    { fs: 13.5, lh: 1.55 }));

  /* ── S4 代数法（四步流程图，无图页） ─────────────────────── */
  const s4 = [kick("判定 · 方法二"), title("代数法：联立消元，看判别式 Δ")];
  const flow = [
    { n: "①", t: "联立", d: "把直线方程与圆方程组成方程组：<br>Ax+By+C=0 与 (x−a)²+(y−b)²=r²。" },
    { n: "②", t: "消元", d: "消去 y（或 x），得到一个<b>一元二次方程</b>：$px^2+qx+s=0$。" },
    { n: "③", t: "算判别式", d: "$\\Delta=q^2-4ps$。它衡量这条直线「切进圆里多深」。" },
    { n: "④", t: "读结论", d: "$\\Delta&gt;0$ ⇒ 相交（2 个公共点）<br>$\\Delta=0$ ⇒ 相切（1 个）<br>$\\Delta&lt;0$ ⇒ 相离（0 个）" },
  ];
  flow.forEach((f, i) => {
    const x = 96 + i * 278;
    s4.push(R(`s4-c${i}`, x, 214, 254, 214, { radius: 20, fill: i === 3 ? "rgba(76,201,240,0.09)" : CARD, stroke: i === 3 ? "rgba(76,201,240,0.34)" : CARD_STROKE }));
    s4.push(T(`s4-n${i}`, x + 22, 232, 60, 40, f.n, { fontSize: 26, fontWeight: 900, color: ACCENT }));
    s4.push(T(`s4-t${i}`, x + 22, 282, 210, 34, f.t, { fontSize: 22, fontWeight: 800 }));
    s4.push(T(`s4-d${i}`, x + 22, 326, 210, 0, f.d, { autoH: true, fontSize: 13.5, lineHeight: 1.6, color: INK_SOFT }));
    if (i < 3) s4.push(T(`s4-a${i}`, x + 256, 300, 20, 34, "→", { fontSize: 22, fontWeight: 800, color: ACCENT, align: "center" }));
  });
  s4.push(R("s4-w1", 96, 452, 536, 150, { radius: 18, fill: "rgba(255,123,140,0.07)", stroke: "rgba(255,123,140,0.26)" }));
  s4.push(T("s4-w1t", 122, 472, 484, 30, "易错点：二次项系数可能为 0", { fontSize: 18, fontWeight: 800, color: ROSE }));
  s4.push(T("s4-w1d", 122, 508, 484, 0,
    "若直线垂直于 x 轴（如 $x=1$），联立消元后<b>得不到</b>一元二次方程 —— 方程退化为一次，只有 1 个公共点。凡是要「设斜率 k」或「消元」之前，都要先单独看一眼这类情形。",
    { autoH: true, fontSize: 14, lineHeight: 1.62, color: INK_SOFT }));
  s4.push(R("s4-w2", 648, 452, 536, 150, { radius: 18, fill: "rgba(124,223,176,0.07)", stroke: "rgba(124,223,176,0.26)" }));
  s4.push(T("s4-w2t", 674, 472, 484, 30, "几何法 vs 代数法：怎么选", { fontSize: 18, fontWeight: 800, color: GREEN }));
  s4.push(T("s4-w2d", 674, 508, 484, 0,
    "<b>几何法</b>只算一个距离，判断快、不易错，适合「只问位置关系」。<br><b>代数法</b>顺带给出交点坐标与 Δ，适合还要算弦长、求参数的题。两者结论一定一致。",
    { autoH: true, fontSize: 14, lineHeight: 1.62, color: INK_SOFT }));
  s4.push(...colBand("s4", 618, 72, "两种方法等价：Δ 的符号 ⇔ d 与 r 的大小关系", { fs: 16 }));
  slides.push(slide("s4", BG, "none",
    "代数法是「通法」：任何曲线与直线的关系都能这么判。但对圆来说，几何法往往更快。这里让学生对比两种写法的计算量，建立「先看几何、再动代数」的习惯。易错点务必强调：竖直直线没有斜率，设点斜式会漏解。",
    s4));

  /* ── S5 弦长公式 ─────────────────────────────────────────── */
  slides.push(figSlide("s5", "弦长 · 垂径定理", "弦长：|AB| = 2√(r² − d²)", chordFig(),
    [
      { t: "① 骨架：垂径定理 + 勾股", d: "圆心到弦的距离 $OM\\perp AB$ ⇒ $M$ 是 $AB$ 中点；$\\text{Rt}\\triangle OMA$ 中 $|AM|=\\sqrt{r^2-d^2}$。" },
      { t: "② 弦长公式", d: "$|AB|=2|AM|=2\\sqrt{r^2-d^2}$。<br>⇒ <b>d 越大，弦越短</b>；$d=0$（弦过圆心）时弦最长 $=2r$。" },
      { t: "③ 另一条路：代数法", d: "$|AB|=\\sqrt{1+k^2}\\,|x_1-x_2|=\\sqrt{1+k^2}\\cdot\\dfrac{\\sqrt{\\Delta}}{|p|}$（$p$ 为二次项系数）。" },
      { t: "例：x² + y² = 4 与 x − y + 1 = 0", d: "$d=\\dfrac{|1|}{\\sqrt2}=\\dfrac{\\sqrt2}{2}$ ⇒ $|AB|=2\\sqrt{4-\\dfrac12}=\\sqrt{14}$。", tc: GREEN, fill: "rgba(124,223,176,0.10)", stroke: "rgba(124,223,176,0.32)" },
    ],
    "弦长问题的骨架是那个直角三角形：斜边是半径 r，一条直角边是圆心到弦的距离 d，另一条是半弦。让学生记住三角形而不是公式——公式自己就能推出来。左图拖动可以看到 d 变大时弦明显变短。",
    { fs: 13, lh: 1.52 }));

  /* ── S6 最长弦与最短弦 ───────────────────────────────────── */
  slides.push(figSlide("s6", "弦长 · 最值", "过定点的弦：最长与最短", shortestChordFig(),
    [
      { t: "① 弦长由什么决定", d: "由 $|AB|=2\\sqrt{r^2-d^2}$，弦长只取决于圆心到弦的距离 $d$。谈弦的最大最小，就是谈 $d$ 的最小最大。" },
      { t: "② 最长：过 P 的直径", d: "弦过圆心时 $d=0$ 最小，弦最长：$|AB|_{\\max}=2r$。过圆内定点 $P$ 的直径就是那条最长的弦。" },
      { t: "③ 最短：与 CP 垂直的弦", d: "弦过 $P$ ⇒ $d\\le|CP|$；当弦 $\\perp CP$ 时 $d$ 取最大 ⇒ $|AB|_{\\min}=2\\sqrt{r^2-|CP|^2}$。" },
      { t: "例：圆 x² + y² = 25，P(3, 1)", d: "$|CP|=\\sqrt{10}$ ⇒ 最长 $=2r=10$，最短 $=2\\sqrt{25-10}=2\\sqrt{15}$。", tc: GREEN, fill: "rgba(124,223,176,0.10)", stroke: "rgba(124,223,176,0.32)" },
    ],
    "左图同时画出三条弦：转动的蓝色弦（可拖动）、绿色虚线的最长弦、红色虚线的最短弦。让学生观察蓝色弦转到与 CP 垂直时最短——这正是「点到直线的距离 ≤ 线段长」这条不等式的几何意义。",
    { fs: 13, lh: 1.52 }));

  /* ── S7 过圆上一点的切线 ─────────────────────────────────── */
  slides.push(figSlide("s7", "切线 · 情形一", "过圆上一点：唯一一条切线", tangentPointFig(),
    [
      { t: "① 切线的身份", d: "相切时 $d=r$，直线与圆恰有一个公共点；此时圆心到直线的距离就是半径，所以<b>切线 ⊥ 过切点的半径</b>。" },
      { t: "② 几何求法", d: "由 $k_{切线}=-\\dfrac{1}{k_{OP}}$ 得斜率，再用点斜式；$OP$ 竖直时切线水平，单独写。" },
      { t: "③ 公式求法（推荐）", d: "圆 $x^2+y^2=r^2$ 上点 $P(x_0,y_0)$ 处切线：$x_0x+y_0y=r^2$。<br>推广到 $(x-a)^2+(y-b)^2=r^2$：$(x_0-a)(x-a)+(y_0-b)(y-b)=r^2$。" },
      { t: "例：圆 x² + y² = 4 上点 P(1, √3)", d: "切线：$1\\cdot x+\\sqrt3\\,y=4$，即 $x+\\sqrt3y-4=0$。<br>验证：$d=\\dfrac{|-4|}{\\sqrt{1+3}}=2=r$ ✓", tc: GREEN, fill: "rgba(124,223,176,0.10)", stroke: "rgba(124,223,176,0.32)" },
    ],
    "公式的记忆法是「换一半」：x² 换成 x₀x，y² 换成 y₀y。它的道理是把「点在圆上」这个条件代进切线方程。左图让切点绕圆运动，可以看到切线与半径的直角标记跟着转——垂直关系始终成立。",
    { fs: 13, lh: 1.52 }));

  /* ── S8 过圆外一点的切线 ─────────────────────────────────── */
  slides.push(figSlide("s8", "切线 · 情形二", "过圆外一点：两条切线", twoTangentsFig(),
    [
      { t: "① 为什么是两条 · 切线长", d: "点 $P$ 在圆外 ⇒ $|PO|&gt;r$，到圆心距离等于 $r$ 的直线有两条 ⇒ 可作<b>两条</b>切线。<br>$\\text{Rt}\\triangle PTO$ 中 $|PT|=\\sqrt{|PO|^2-r^2}$：圆 $x^2+y^2=4$、$P(4,0)$ ⇒ $|PT|=\\sqrt{16-4}=2\\sqrt3$。" },
      { t: "② 求切线：设斜率，用 d = r", d: "设切线 $y=k(x-4)$ 即 $kx-y-4k=0$；由 $d=\\dfrac{|-4k|}{\\sqrt{k^2+1}}=2$ 得 $k=\\pm\\dfrac{\\sqrt3}{3}$。<br><b>别忘了</b> $x=4$ 这种斜率不存在的情形。" },
      { t: "③ 切点弦（两切点连线）", d: "切点 $T_1(1,\\sqrt3)$、$T_2(1,-\\sqrt3)$，连线 $x=1$；一般式 $x_0x+y_0y=r^2$ ⇒ $4x=4$ ⇒ $x=1$。<br>顺带：$\\angle APB=60^\\circ$，四边形 $PAOB$ 面积 $=4\\sqrt3$。" },
    ],
    "过圆外一点的两条切线，全部结论都长在同一个直角三角形 PTO 里：切线长、夹角、切点弦。提醒学生：设点斜式之前先检查斜率不存在的情况——这是本课最常丢分的一步。",
    { fs: 13, lh: 1.52, anim: false }));

  /* ── S9 距离最值 ─────────────────────────────────────────── */
  slides.push(figSlide("s9", "最值 · 距离", "圆上点到直线的距离最值", maxMinFig(),
    [
      { t: "① 把动点问题变成圆心问题", d: "圆心 $C$ 到直线 $l$ 的距离是定值 $d$。圆上点 $M$ 到 $l$ 的距离，等于 $d$ 再沿垂线方向「挪动」一个不超过 $r$ 的量。" },
      { t: "② 结论", d: "距离最大值 $=d+r$（取在离直线最远的那一点）；最小值 $=d-r$（$d\\ge r$ 时）。若直线与圆相交，最小值就是 $0$。" },
      { t: "③ 到定点的距离同理", d: "$|PQ|$ 的范围是 $\\big[\\,|PC|-r,\\ |PC|+r\\,\\big]$：最大、最小都在直线 $CP$ 与圆的交点处取得。" },
      { t: "例：圆 x² + y² = 4 上点到 l: 3x + 4y − 25 = 0", d: "$d=\\dfrac{|-25|}{5}=5$，$r=2$ ⇒ 距离范围 $[5-2,\\ 5+2]=[3,\\ 7]$。", tc: GREEN, fill: "rgba(124,223,176,0.10)", stroke: "rgba(124,223,176,0.32)" },
    ],
    "口诀：把圆上的点换成圆心，再加减半径。左图里蓝点绕圆一周，它与直线的距离在 d−r 与 d+r 之间来回摆动，两个极值点就是绿色和红色的固定点。",
    { fs: 13, lh: 1.52 }));

  /* ── S10 例题1：定点 ⇒ 恒相交 ────────────────────────────── */
  slides.push(figSlide("s10", "例题 1 · 定点与位置关系", "直线过圆内定点 ⇒ 必相交", fixedPointFig(),
    [
      { t: "题目", d: "已知直线 $l:(2m+1)x+(m+1)y=7m+4$（$m\\in\\mathbf{R}$），圆 $C:(x-1)^2+(y-2)^2=25$。<br>求证：$l$ 与圆 $C$ 总有两个公共点。", tc: AMBER, fill: "rgba(249,199,79,0.07)", stroke: "rgba(249,199,79,0.28)" },
      { t: "① 求出定点", d: "把 $l$ 整理成 $m(2x+y-7)+(x+y-4)=0$；令两个括号同时为 $0$ ⇒ $x=3,\\ y=1$，即 $l$ 恒过定点 $P(3,1)$。" },
      { t: "② 判断 P 与圆的位置", d: "$|PC|=\\sqrt{(3-1)^2+(1-2)^2}=\\sqrt5$，而 $r=5$。<br>$\\sqrt5&lt;5$ ⇒ $P$ 在<b>圆内</b>。" },
      { t: "③ 收口", d: "$l$ 过圆内一点 ⇒ 圆心到 $l$ 的距离 $d\\le|PC|=\\sqrt5&lt;5=r$ ⇒ $l$ 与圆恒相交于两点。<b>证毕。</b>", tc: GREEN, fill: "rgba(124,223,176,0.10)", stroke: "rgba(124,223,176,0.32)" },
    ],
    "「含参直线必过定点」是这类题的第一动作：把参数 m 提出来，令它的系数同时为零。判断完定点在圆内，用「过圆内一点的直线必与圆相交」收口——比联立算 Δ 快得多。左图可看到直线绕 P 转动时始终与圆交于两点。",
    { fs: 13, lh: 1.52 }));

  /* ── S11 例题2：弦长计算 ─────────────────────────────────── */
  slides.push(figSlide("s11", "例题 2 · 弦长计算", "求弦长：先算 d，再用勾股", chordCalcFig(),
    [
      { t: "题目", d: "直线 $l:x-y+1=0$ 与圆 $C:x^2+y^2=4$ 相交于 $A$、$B$ 两点，求 $|AB|$。", tc: AMBER, fill: "rgba(249,199,79,0.07)", stroke: "rgba(249,199,79,0.28)" },
      { t: "① 求圆心到直线的距离", d: "圆心 $O(0,0)$，$r=2$：$d=\\dfrac{1}{\\sqrt2}=\\dfrac{\\sqrt2}{2}$。" },
      { t: "② 勾股求半弦 ⇒ 弦长", d: "$|AM|=\\sqrt{r^2-d^2}=\\sqrt{4-\\dfrac12}=\\dfrac{\\sqrt{14}}{2}$ ⇒ $|AB|=2|AM|=\\sqrt{14}$（$\\approx3.74&lt;4$ ✓）。", tc: GREEN, fill: "rgba(124,223,176,0.10)", stroke: "rgba(124,223,176,0.32)" },
      { t: "③ 用代数法对答", d: "由 $y=x+1$ 代入得 $2x^2+2x-3=0$，$\\Delta=28$：<br>$|AB|=\\sqrt{1+1^2}\\cdot\\dfrac{\\sqrt{28}}{2}=\\sqrt2\\cdot\\sqrt7=\\sqrt{14}$ ✓ 两条路一致。", tc: ACCENT, fill: "rgba(76,201,240,0.07)", stroke: "rgba(76,201,240,0.30)" },
    ],
    "几何法三步：算 d、勾股求半弦、乘 2。学生在考场上最保险的写法就是这三行。最后一张卡用代数法复核同一个答案——同一个问题两条路都对，说明公式用对了。",
    { fs: 13, lh: 1.52, anim: false }));

  /* ── S12 真题精讲 ────────────────────────────────────────── */
  const s12 = [
    kick("真题精讲 · 2021 年全国新高考 II 卷"),
    title("点在圆上？距离决定一切"),
    R("s12-q", 96, 192, 1088, 112, { radius: 18, fill: "rgba(249,199,79,0.08)", stroke: "rgba(249,199,79,0.30)" }),
    T("s12-qt", 122, 208, 1036, 26, "题 · 多选", { fontSize: 14, fontWeight: 700, letterSpacing: 2, color: AMBER }),
    T("s12-qb", 122, 238, 1036, 0,
      "已知直线 $l:ax+by-r^2=0$ 与圆 $C:x^2+y^2=r^2$，点 $A(a,b)$，则下列说法正确的是（　　）<br>A. 若点 $A$ 在圆 $C$ 上，则直线 $l$ 与圆 $C$ 相切　　B. 若点 $A$ 在圆 $C$ 内，则直线 $l$ 与圆 $C$ 相离<br>C. 若点 $A$ 在圆 $C$ 外，则直线 $l$ 与圆 $C$ 相离　　D. 若点 $A$ 在直线 $l$ 上，则直线 $l$ 与圆 $C$ 相切",
      { autoH: true, fontSize: 14.5, lineHeight: 1.72 }),
    svgEl("s12-fig", 96, 320, M2W, 330, examFig()),
    T("s12-key", 96, 664, 560, 0, "核心：$d=\\dfrac{|a\\cdot0+b\\cdot0-r^2|}{\\sqrt{a^2+b^2}}=\\dfrac{r^2}{\\sqrt{a^2+b^2}}$", { autoH: true, fontSize: 14.5, fontWeight: 700, color: ACCENT }),
  ];
  const verdicts = [
    { k: "A", ok: true, d: "点在圆上 ⇒ $a^2+b^2=r^2$ ⇒ $\\sqrt{a^2+b^2}=r$ ⇒ $d=\\dfrac{r^2}{r}=r$ ⇒ <b>相切</b> ✓" },
    { k: "B", ok: true, d: "点在圆内 ⇒ $a^2+b^2&lt;r^2$ ⇒ $\\sqrt{a^2+b^2}&lt;r$ ⇒ $d=\\dfrac{r^2}{\\sqrt{a^2+b^2}}&gt;r$ ⇒ <b>相离</b> ✓" },
    { k: "C", ok: false, d: "点在圆外 ⇒ $a^2+b^2&gt;r^2$ ⇒ $d&lt;r$ ⇒ 应为<b>相交</b>，不是相离 ✗" },
    { k: "D", ok: true, d: "点 $A$ 在 $l$ 上 ⇒ $a^2+b^2=r^2$，与 A 同理 ⇒ <b>相切</b> ✓" },
  ];
  verdicts.forEach((v, i) => {
    const y = 320 + i * 76;
    s12.push(R(`s12-v${i}`, 696, y, 488, 68, { radius: 14, fill: v.ok ? "rgba(124,223,176,0.08)" : "rgba(255,123,140,0.08)", stroke: v.ok ? "rgba(124,223,176,0.30)" : "rgba(255,123,140,0.30)" }));
    s12.push(T(`s12-vk${i}`, 714, y + 18, 40, 34, v.k, { fontSize: 22, fontWeight: 900, color: v.ok ? GREEN : ROSE }));
    s12.push(T(`s12-vm${i}`, 746, y + 22, 40, 30, v.ok ? "✓" : "✗", { fontSize: 19, fontWeight: 900, color: v.ok ? GREEN : ROSE }));
    s12.push(T(`s12-vd${i}`, 784, y + 10, 382, 0, v.d, { autoH: true, fontSize: 12.5, lineHeight: 1.5, color: INK }));
  });
  s12.push(...colBand("s12", 632, 58, "答案：ABD —— 同一件事的三个身份", { fs: 15 }));
  slides.push(slide("s12", BG, "none",
    "这道题把「点与圆的位置关系」和「直线与圆的位置关系」缝在一起：A 的坐标直接决定了 l 到圆心的距离。让学生先写出 d = r²/√(a²+b²) 再逐项代入——不要凭感觉选。C 是经典陷阱：点在圆外，反而让直线穿进圆里。",
    s12));

  /* ── S13 方法总结 ────────────────────────────────────────── */
  const sums = [
    { n: "①", t: "判定", d: "算 $d=\\dfrac{|Aa+Bb+C|}{\\sqrt{A^2+B^2}}$ 与 $r$ 比：$d&gt;r$ 相离、$d=r$ 相切、$d&lt;r$ 相交。或联立看 $\\Delta$ 的符号。", c: ACCENT },
    { n: "②", t: "弦长", d: "垂径定理 + 勾股：$|AB|=2\\sqrt{r^2-d^2}$。<br>另一条路 $|AB|=\\sqrt{1+k^2}\\cdot\\dfrac{\\sqrt{\\Delta}}{|p|}$。", c: GREEN },
    { n: "③", t: "切线", d: "过圆上一点：$x_0x+y_0y=r^2$。<br>过圆外一点：设点斜式 + $d=r$，先查斜率不存在的情形；切线长 $\\sqrt{|PO|^2-r^2}$。", c: AMBER },
    { n: "④", t: "最值", d: "圆上点到直线 $\\in[d-r,\\,d+r]$；<br>到定点 $\\in[|PC|-r,\\,|PC|+r]$。<br>过圆内定点的弦：$2r$ 最长，$2\\sqrt{r^2-|CP|^2}$ 最短。", c: ROSE },
  ];
  const s13 = [kick("方法总结"), title("直线与圆的四个动作")];
  sums.forEach((s, i) => {
    const x = 96 + i * 278;
    s13.push(R(`s13-c${i}`, x, 226, 254, 336, { radius: 22 }));
    s13.push(T(`s13-n${i}`, x + 24, 246, 100, 60, s.n, { fontSize: 40, fontWeight: 900, color: s.c, lineHeight: 1.5 }));
    s13.push(T(`s13-t${i}`, x + 24, 312, 206, 40, s.t, { fontSize: 26, fontWeight: 800 }));
    s13.push(R(`s13-l${i}`, x + 24, 364, 52, 3, { fill: s.c, stroke: "none", strokeWidth: 0, radius: 2 }));
    s13.push(T(`s13-d${i}`, x + 24, 386, 206, 0, s.d, { autoH: true, fontSize: 13.5, color: INK_SOFT, lineHeight: 1.66 }));
  });
  s13.push(band("s13-sum", 96, 592, 1088, 84));
  s13.push(T("s13-sumt", 136, 612, 1008, 0,
    "一句话：直线与圆的一切问题，都归结为「圆心到直线的距离 $d$」与「半径 $r$」的比较 ——<br>判定是比较它，弦长是用它勾股，切线是让它等于 $r$，最值是在它身上加减 $r$。",
    { autoH: true, fontSize: 16, fontWeight: 600, color: ACCENT, align: "center", lineHeight: 1.6 }));
  slides.push(slide("s13", BG, "none",
    "收束：四种题型共用同一个量 d。让学生回去把错题按这四类归档，每道题旁边标出「d 是多少、r 是多少」。下一节课可以衔接「圆与圆的位置关系」——那是把 d 换成圆心距，结构完全一样。",
    s13));

  return resolveAutoHeights({
    format: "bento/slides",
    version: 1,
    title: "直线与圆的位置关系",
    meta: { subject: "高中数学 · 解析几何专题", keywords: "直线与圆,位置关系,弦长,切线,切点弦,距离最值,判别式" },
    size: { width: 1280, height: 720 },
    theme: { background: BG, color: INK, accent: ACCENT, fontFamily: FONT },
    slides,
  });
}

/* ─────────────────── 内容安全自检 ─────────────────── */
// 血泪教训：正文里裸露的 `<` 后紧跟字母/数字会被 HTML 解析器当成标签开头，
// 把后面的文字整段吞掉（如 $0<k<1$ 里的 `<k<1`）。生成前扫一遍，命中即抛错。
const SAFE_TAG = /^<\/?(?:b|i|br|em|strong|u|s|sub|sup|span|a)(?:\s[^>]*)?>$/;
export function assertContentSafe(doc) {
  const bad = [];
  for (const s of doc.slides) {
    for (const el of s.elements) {
      if (el.type !== "text" || typeof el.html !== "string") continue;
      const html = el.html;
      // 对齐 HTML5 词法：只有 `<` 后紧跟 字母 / `/` / `!` / `?` 才开启标签或注释，
      // `< BM`（后跟空格）与 `<1`（后跟数字）都是安全字面量，不该误报。
      const re = /<[A-Za-z/!?][^>]{0,80}/g;
      let m;
      while ((m = re.exec(html))) {
        const gt = html.indexOf(">", m.index);
        const tag = gt < 0 ? html.slice(m.index) : html.slice(m.index, gt + 1);
        if (!SAFE_TAG.test(tag)) bad.push({ slide: s.id, el: el.id, frag: tag.slice(0, 60) });
      }
    }
  }
  if (bad.length) {
    console.error("!! 文本内容含未转义的 `<`（会被 HTML 解析器吞掉），请写成 &lt; ：");
    for (const b of bad.slice(0, 20)) console.error(`   ${b.slide} / ${b.el}: ${b.frag}`);
    throw new Error("content safety check failed: " + bad.length + " 处");
  }
  return true;
}

/* ─────────────────── 布局自检（生成阶段先暴露明显溢出） ─────────────────── */
// validate 是最终把关（浏览器实测），这一层只在生成时预警，
// 让「文案顶出卡片 / 元素出画布」在生成阶段就暴露，而不是等拍屏后靠眼睛发现。
export function assertLayoutSane(doc) {
  const warn = [];
  for (const s of doc.slides) {
    // 步骤卡正文是否顶出卡片
    for (const c of s.elements.filter((e) => e.type === "shape" && /^s\d+-s\d+$/.test(e.id))) {
      const pre = c.id.split("-s")[0], i = c.id.split("-s")[1];
      const d = s.elements.find((e) => e.id === `${pre}-d${i}`);
      if (d && d.y + d.h > c.y + c.h + 2) {
        warn.push(`${s.id}/${c.id}: 正文底 ${Math.round(d.y + d.h)} 超出卡片底 ${Math.round(c.y + c.h)}`);
      }
    }
    // 元素是否出画布（1280×720，留 6px 余量）
    for (const el of s.elements) {
      if (el.type !== "text" && el.type !== "svg") continue;
      if (el.y < -6 || el.y + el.h > 726 || el.x < -6 || el.x + el.w > 1286) {
        warn.push(`${s.id}/${el.id}: 越出画布 (x ${Math.round(el.x)}..${Math.round(el.x + el.w)}, y ${Math.round(el.y)}..${Math.round(el.y + el.h)})`);
      }
    }
  }
  if (warn.length) {
    console.warn("!! 布局预警 " + warn.length + " 条：");
    for (const w of warn.slice(0, 24)) console.warn("   " + w);
  }
  return warn;
}

/* ─────────────────────────── 输出 ─────────────────────────── */
export function docJson() {
  return JSON.stringify(buildDoc()).replace(/</g, "\\u003c");
}

export function embed(htmlTarget) {
  const shell = readFileSync(htmlTarget, "utf8");
  const json = docJson();
  const open = '<script type="application/bento+json" id="bento-doc">';
  const close = "</" + "script>";
  const i = shell.indexOf(open);
  if (i < 0) throw new Error("bento-doc block not found in " + htmlTarget);
  const j = shell.indexOf(close, i);
  if (j < 0) throw new Error("bento-doc close tag not found");
  writeFileSync(htmlTarget, shell.slice(0, i + open.length) + "\n" + json + "\n" + shell.slice(j), "utf8");
  console.log("embedded doc (" + json.length + " bytes JSON) into " + htmlTarget);
}

if (process.argv[1]?.endsWith("build-circle.mjs")) {
  const doc = buildDoc();
  assertContentSafe(doc);
  assertLayoutSane(doc);
  if (process.argv.includes("--embed")) {
    embed(TARGET);
  } else {
    writeFileSync(join(ROOT, "tools", "circle.json"), docJson(), "utf8");
    console.log("slides:", doc.slides.length, "| elements:", doc.slides.reduce((a, s) => a + s.elements.length, 0));
    for (const s of doc.slides) {
      const ids = s.elements.map((e) => e.id);
      const dup = ids.filter((v, k) => ids.indexOf(v) !== k);
      if (dup.length) console.log("!! dup ids in", s.id, dup);
    }
    console.log("circle.json written");
  }
}
