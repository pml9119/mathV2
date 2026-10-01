// build-solid.mjs — 《立体几何专题 · 截面与空间角》教学课件生成器
//
// 两道真题精讲（内容取自原卷解析，全部推导已逐式复核）：
//   题1 正方体截面   : 平面 AMN 截正方体所得截面为四边形 → 求 BM 取值范围
//   题2 四棱锥空间角 : (1) 四点共面  (2) EF 与平面 PCD 所成角正弦值 √39/13
//
// 图形策略：立体几何不是圆锥曲线，无需 mathV2 的隐式曲线引擎；
//           3D → 2D 用线性投影手写，截面多边形由「平面 × 立方体棱」求交自动生成。
// 动画策略：与既有课件一致 —— 内联 SVG + SMIL（animate 驱动端点/圆心），
//           由 tools/animation-controller.js 在放映/编辑时统一驱动时间轴。
//
// 用法：node tools/build-solid.mjs [--embed]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const TARGET = join(ROOT, "solid-geometry.bento.html");

/* ─────────────────────────── 配色与字体 ─────────────────────────── */
const BG = "#0B1020", INK = "#E9EEF8";
const INK_SOFT = "rgba(233,238,248,0.62)", INK_DIM = "rgba(233,238,248,0.38)";
const ACCENT = "#4CC9F0", AMBER = "#F9C74F", GREEN = "#7CDFB0", ROSE = "#FF7B8C";
const CARD = "rgba(255,255,255,0.035)", CARD_STROKE = "rgba(255,255,255,0.11)";
const EDGE = "rgba(233,238,248,0.42)";       // 可见棱
const EDGE_HID = "rgba(233,238,248,0.20)";   // 被遮挡棱（虚线）
const FONT = "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif";
const M2W = 560, M2H = 430;

/* ─────────────────────────── 画板工厂 ─────────────────────────── */
function T(id, x, y, w, h, html, o = {}) {
  return {
    id, type: "text", x, y, w, h, rotation: 0, opacity: 1, html,
    fontSize: o.fontSize ?? 19, fontFamily: FONT, fontWeight: o.fontWeight ?? 500,
    color: o.color ?? INK, align: o.align ?? "left", valign: o.valign ?? "top",
    lineHeight: o.lineHeight ?? 1.5, ...(o.letterSpacing ? { letterSpacing: o.letterSpacing } : {}),
    ...(o.fx ? { fx: o.fx } : {}),
  };
}
function R(id, x, y, w, h, o = {}) {
  return {
    id, type: "shape", shape: "rect", x, y, w, h, rotation: 0, opacity: 1,
    fill: o.fill ?? CARD, stroke: o.stroke ?? CARD_STROKE, strokeWidth: o.strokeWidth ?? 1,
    radius: o.radius ?? 18, ...(o.fx ? { fx: o.fx } : {}),
  };
}
/** 答案高亮条（强调色底） */
function band(id, x, y, w, h, o = {}) {
  return R(id, x, y, w, h, { fill: o.fill ?? "rgba(76,201,240,0.12)", stroke: o.stroke ?? "rgba(76,201,240,0.38)", radius: o.radius ?? 14, fx: o.fx });
}
function slide(id, background, transition, notes, elements) {
  return { id, background, transition, notes, elements };
}
const svgEl = (id, x, y, w, h, markup) => ({ id, type: "svg", x, y, w, h, rotation: 0, opacity: 1, markup });
const kick = (t, o = {}) => T("k", 96, 62, 720, 30, t, { fontSize: 15, fontWeight: 700, letterSpacing: 3.5, color: ACCENT, ...o });
const title = (t, o = {}) => T("ttl", 96, 100, 1088, 96, t, { fontSize: 46, fontWeight: 800, color: INK, lineHeight: 1.12, ...o });

/* ───────────────────── 小型 3D 线性代数工具 ───────────────────── */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len3 = (a) => Math.sqrt(dot(a, a));
const norm = (a) => { const L = len3(a) || 1; return [a[0] / L, a[1] / L, a[2] / L]; };
const f1 = (v) => Number(v).toFixed(1);

/* ─────────────────── SVG 片段工厂（全部走白名单） ─────────────────── */
const Fd = (x, y, r, c, o = {}) =>
  `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${c}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw ?? 2}"` : ""}/>`;
const Tx = (x, y, t, o = {}) =>
  `<text x="${f1(x)}" y="${f1(y)}" fill="${o.color ?? INK_SOFT}" font-size="${o.size ?? 14}" font-weight="${o.weight ?? 600}" text-anchor="${o.anchor ?? "middle"}" font-family="${FONT}">${t}</text>`;
const Ln = (x1, y1, x2, y2, o = {}) =>
  `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${o.stroke ?? EDGE}" stroke-width="${o.w ?? 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>`;
/** 闭合多边形 → path（polygon 不在 sanitizer 白名单，统一用 path） */
const polyD = (pts) => pts.map((p, i) => `${i ? "L" : "M"} ${f1(p[0])} ${f1(p[1])}`).join(" ") + " Z";
const poly = (pts, o = {}) =>
  `<path d="${polyD(pts)}" fill="${o.fill ?? "none"}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.w ?? 1.6}"` : ""}${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>`;
/** SMIL：v 驱动端点/圆心（既有课件已验证的唯一可靠写法） */
const MOVE = (attr, vals, dur) => `<animate attributeName="${attr}" values="${vals}" dur="${dur}" repeatCount="indefinite" calcMode="linear"/>`;
const MOTION = (path, dur) => `<animateMotion dur="${dur}" repeatCount="indefinite" path="${path}"/>`;
const PULSE = (a = 6.5, b = 9) => `<animate attributeName="r" values="${a};${b};${a}" dur="1.6s" repeatCount="indefinite"/>`;

/* ══════════════════════ 题1 · 正方体截面 ══════════════════════ */
// 教材经典斜二测画法：前面 ABB₁A₁ 画成正方形，深度方向（y）向右上方偏移
//   screenX = ox + (x + 0.5·y)·s ,  screenY = oy − (z + 0.5·y)·s
// 这样上底面 A₁B₁C₁D₁ 才会「盖在」下底面之上，不会压扁成菱形。
const CU_S = 150, CU_OX = 180, CU_OY = 360;
const CU_KX = 0.5, CU_KY = 0.5;              // 深度方向的水平/竖直分量
function C3([x, y, z]) {
  return [CU_OX + (x + CU_KX * y) * CU_S, CU_OY - (z + CU_KY * y) * CU_S];
}
const CUBE_V = {
  A: [0, 0, 0], B: [1, 0, 0], C: [1, 1, 0], D: [0, 1, 0],
  A1: [0, 0, 1], B1: [1, 0, 1], C1: [1, 1, 1], D1: [0, 1, 1],
};
const CUBE_E = [
  ["A", "B"], ["B", "C"], ["C", "D"], ["D", "A"],
  ["A1", "B1"], ["B1", "C1"], ["C1", "D1"], ["D1", "A1"],
  ["A", "A1"], ["B", "B1"], ["C", "C1"], ["D", "D1"],
];
// C 是底面最远的顶点 → 交于 C 的三条棱为被遮挡棱（画虚线）
const HIDDEN = new Set(["B|C", "C|D", "C|C1"]);
const eKey = (a, b) => (a < b ? a + "|" + b : b + "|" + a);

/** 平面 AMN（过原点 A）的法向量；M=(1,t,0)、N=(1,1,1/3) */
function planeNorm(t) {
  return cross(sub([1, t, 0], CUBE_V.A), sub([1, 1, 1 / 3], CUBE_V.A));
}
/** 用「平面 × 立方体棱」求交 → 自动得到截面多边形（按绕质心极角排序） */
function sectionPoly(t) {
  const n = planeNorm(t);
  const f = (p) => dot(n, p);
  const pts = [];
  for (const [a, b] of CUBE_E) {
    const p = CUBE_V[a], q = CUBE_V[b];
    const fp = f(p), fq = f(q);
    if (Math.abs(fp) < 1e-9) { pts.push(p); continue; }
    if (Math.abs(fq) < 1e-9) { pts.push(q); continue; }
    if (fp * fq < 0) {
      const s = fp / (fp - fq);
      pts.push([p[0] + s * (q[0] - p[0]), p[1] + s * (q[1] - p[1]), p[2] + s * (q[2] - p[2])]);
    }
  }
  const uniq = [];
  for (const p of pts) if (!uniq.some((q) => len3(sub(p, q)) < 1e-6)) uniq.push(p);
  if (uniq.length < 3) return uniq.map((p) => C3(p));
  const c = uniq.reduce((s, p) => [s[0] + p[0] / uniq.length, s[1] + p[1] / uniq.length, s[2] + p[2] / uniq.length], [0, 0, 0]);
  const u = norm(sub(uniq[0], c));
  const w = cross(norm(n), u);
  return uniq
    .map((p) => { const d = sub(p, c); return { p, ang: Math.atan2(dot(d, w), dot(d, u)) }; })
    .sort((x, y) => x.ang - y.ang)
    .map((o) => C3(o.p));
}

/** 立方体骨架 + 顶点标注（题1 三页共用） */
function cubeSkeleton() {
  let g = "";
  for (const [a, b] of CUBE_E) {
    const hid = HIDDEN.has(eKey(a, b));
    g += Ln(...C3(CUBE_V[a]), ...C3(CUBE_V[b]), { stroke: hid ? EDGE_HID : EDGE, w: 1.5, dash: hid ? "5 4" : "" });
  }
  // 斜二测下：A/B 在左下/右下，C/D 在右上区，A₁/B₁ 在上方，C₁/D₁ 在右上角
  const OFF = { A: [-17, 20], B: [17, 20], C: [18, 4], D: [-6, -10], A1: [-19, 4], B1: [-16, -10], C1: [18, -6], D1: [-4, -10] };
  const NAME = { A: "A", B: "B", C: "C", D: "D", A1: "A₁", B1: "B₁", C1: "C₁", D1: "D₁" };
  for (const k of Object.keys(CUBE_V)) {
    const [sx, sy] = C3(CUBE_V[k]);
    g += Fd(sx, sy, 3.6, "rgba(233,238,248,0.8)");
    g += Tx(sx + OFF[k][0], sy + OFF[k][1], NAME[k], { color: INK_SOFT, size: 15, weight: 700 });
  }
  return g;
}
const N_PT = C3([1, 1, 1 / 3]);           // N 固定：CN = 1/3

/** 题1 图 A：M 沿 BC 扫动（四边形区间 0.12 → 2/3），截面四边形实时形变 */
function cubeAnimFig() {
  const n = 22, t0 = 0.12, t1 = 2 / 3;
  const mx = [], my = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + (t1 - t0) * (i / n);
    const [sx, sy] = C3([1, t, 0]);
    mx.push(f1(sx)); my.push(f1(sy));
  }
  const v = (a) => a.join(";");
  const A = C3(CUBE_V.A), D1 = C3(CUBE_V.D1);
  const DUR = "9s";
  let g = cubeSkeleton();
  // 截面四边形 A-M-N-D1：用四条线绘制，其中 AM、MN 随 M 形变
  g += `<line x1="${f1(A[0])}" y1="${f1(A[1])}" x2="${mx[0]}" y2="${my[0]}" stroke="${ACCENT}" stroke-width="2.6">${MOVE("x2", v(mx), DUR)}${MOVE("y2", v(my), DUR)}</line>`;
  g += `<line x1="${mx[0]}" y1="${my[0]}" x2="${f1(N_PT[0])}" y2="${f1(N_PT[1])}" stroke="${ACCENT}" stroke-width="2.6">${MOVE("x1", v(mx), DUR)}${MOVE("y1", v(my), DUR)}</line>`;
  g += Ln(...N_PT, ...D1, { stroke: ACCENT, w: 2.6 });
  g += Ln(...D1, ...A, { stroke: ACCENT, w: 2.6, dash: "6 4" });
  // 关键辅助线 AD1（平行面截线）与 BC1，虚线提示平行关系
  g += Ln(...A, ...D1, { stroke: AMBER, w: 1.8, dash: "7 5" });
  g += Ln(...C3(CUBE_V.B), ...C3(CUBE_V.C1), { stroke: AMBER, w: 1.8, dash: "7 5" });
  // 动点 M + 固定点 N
  g += `<circle r="8" fill="${ROSE}">${MOVE("cx", v(mx), DUR)}${MOVE("cy", v(my), DUR)}${PULSE()}</circle>`;
  g += Fd(...N_PT, 7, GREEN);
  g += Tx(Number(mx[0]) + 20, Number(my[0]) + 6, "M", { color: ROSE, size: 15, weight: 800, anchor: "start" });
  g += Tx(N_PT[0] + 18, N_PT[1] + 20, "N", { color: GREEN, size: 15, weight: 800, anchor: "start" });
  g += Tx(158, 402, "截面四边形 A–M–N–D₁", { color: ACCENT, size: 14.5, weight: 700 });
  g += Tx(158, 424, "M 在 BC 上滑动 · 关键：AD₁ ∥ MN ∥ BC₁", { color: INK_DIM, size: 13 });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${M2W} ${M2H}" width="100%" height="100%" data-anim="1">${g}</svg>`;
}

/** 题1 图 B：临界态（BM = 2/3，截面恰为四边形 A-M-N-D₁，填充高亮） */
function cubeCriticalFig() {
  const t = 2 / 3;
  const polyPts = sectionPoly(t);
  const M = C3([1, t, 0]), A = C3(CUBE_V.A), D1 = C3(CUBE_V.D1);
  let g = cubeSkeleton();
  g += poly(polyPts, { fill: "rgba(76,201,240,0.16)", stroke: ACCENT, w: 2.6 });
  g += Ln(...A, ...D1, { stroke: AMBER, w: 1.8, dash: "7 5" });
  g += Ln(...C3(CUBE_V.B), ...C3(CUBE_V.C1), { stroke: AMBER, w: 1.8, dash: "7 5" });
  g += Fd(...M, 7.5, ROSE); g += Fd(...N_PT, 7, GREEN);
  g += Tx(M[0] + 20, M[1] + 6, "M", { color: ROSE, size: 15, weight: 800, anchor: "start" });
  g += Tx(N_PT[0] + 18, N_PT[1] + 20, "N", { color: GREEN, size: 15, weight: 800, anchor: "start" });
  g += Tx(280, 396, "临界态 BM = 2/3：截面恰过 D₁", { color: AMBER, size: 15, weight: 700 });
  g += Tx(280, 420, "此时 MN ∥ BC₁ ⇒ CM = CN = 1/3", { color: INK_DIM, size: 13 });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${M2W} ${M2H}" width="100%" height="100%">${g}</svg>`;
}

/** 题1 图 C：越界态（BM = 0.85 > 2/3，截面变为五边形） */
function cubePentagonFig() {
  const t = 0.85;
  const polyPts = sectionPoly(t);
  const M = C3([1, t, 0]);
  let g = cubeSkeleton();
  g += poly(polyPts, { fill: "rgba(255,123,140,0.16)", stroke: ROSE, w: 2.6 });
  g += Fd(...M, 7.5, ROSE); g += Fd(...N_PT, 7, GREEN);
  g += Tx(M[0] + 20, M[1] + 6, "M", { color: ROSE, size: 15, weight: 800, anchor: "start" });
  g += Tx(N_PT[0] + 18, N_PT[1] + 20, "N", { color: GREEN, size: 15, weight: 800, anchor: "start" });
  g += Tx(280, 396, "越界态 BM > 2/3：截面变为五边形", { color: ROSE, size: 15, weight: 700 });
  g += Tx(280, 420, "平面 AMN 又与侧面 ABB₁A₁ 相交，多出一个顶点", { color: INK_DIM, size: 13 });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${M2W} ${M2H}" width="100%" height="100%">${g}</svg>`;
}

/* ══════════════════════ 题2 · 四棱锥 ══════════════════════ */
// 建系：O 为原点，OQ(→AD 中点) 为 x 轴、OC 为 y 轴、OP 为 z 轴（两两垂直）
// 屏幕映射：y 轴 → 水平向右；x 轴 → 左上（远的深度）；z 轴 → 正上
const PY_S = 108, PY_OX = 300, PY_OY = 350;
const AX_Y = [1, 0], AX_X = [-0.45, -0.89], AX_Z = [0, -1];
function P3([x, y, z]) {
  const hx = (x * AX_X[0] + y * AX_Y[0] + z * AX_Z[0]) * PY_S;
  const hy = (x * AX_X[1] + y * AX_Y[1] + z * AX_Z[1]) * PY_S;
  return [PY_OX + hx, PY_OY + hy];
}
const SQ3 = Math.sqrt(3);
const PY_V = {
  O: [0, 0, 0], A: [1, -1, 0], B: [0, -1, 0], C: [0, 1, 0], D: [1, 1, 0], P: [0, 0, SQ3],
};
const E_PT = [0.5, -0.5, SQ3 / 2];                    // E = PA 中点
const Fk = (k) => [0, -k, SQ3 * (1 - k)];             // F = P + k·(B−P)
const Q_PT = [1, 0, 0];                               // Q = AD 中点
const NORMAL = [0, SQ3, 1];                           // 平面 PCD 的法向量

/** 四棱锥骨架：底面 ABCD（AD 为被遮挡棱）+ 四条侧棱 + O 点 */
function pyrSkeleton(o = {}) {
  let g = "";
  // 底面：AB、BC、CD 可见，AD 被遮挡
  g += Ln(...P3(PY_V.A), ...P3(PY_V.B), { stroke: EDGE, w: 1.5 });
  g += Ln(...P3(PY_V.B), ...P3(PY_V.C), { stroke: EDGE, w: 1.6 });
  g += Ln(...P3(PY_V.C), ...P3(PY_V.D), { stroke: EDGE, w: 1.5 });
  g += Ln(...P3(PY_V.D), ...P3(PY_V.A), { stroke: EDGE_HID, w: 1.5, dash: "5 4" });
  // 侧棱：PA、PD 是轮廓棱（可见）；PB、PC 可见
  for (const k of ["A", "B", "C", "D"]) {
    g += Ln(...P3(PY_V.P), ...P3(PY_V[k]), { stroke: EDGE, w: 1.5 });
  }
  // 顶点
  const LBL = { A: [-16, 16], B: [-2, 20], C: [14, 20], D: [16, 16], P: [0, -14] };
  for (const k of ["A", "B", "C", "D", "P"]) {
    const [sx, sy] = P3(PY_V[k]);
    g += Fd(sx, sy, 3.4, "rgba(233,238,248,0.8)");
    g += Tx(sx + LBL[k][0], sy + LBL[k][1], k, { color: INK_SOFT, size: 14.5, weight: 700 });
  }
  if (o.axis) {
    // 三条坐标轴（建系页用）：OQ / OC / OP，标注向外偏移避免压到 Q 与 E
    const tipX = P3([1.55, 0, 0]), tipY = P3([0, 1.55, 0]), tipZ = P3([0, 0, SQ3 * 0.86]);
    g += Ln(...P3(PY_V.O), ...tipX, { stroke: AMBER, w: 1.8 });
    g += Ln(...P3(PY_V.O), ...tipY, { stroke: AMBER, w: 1.8 });
    g += Ln(...P3(PY_V.O), ...tipZ, { stroke: AMBER, w: 1.8 });
    g += Tx(tipX[0] - 16, tipX[1] + 16, "x", { color: AMBER, size: 15, weight: 800 });
    g += Tx(tipY[0] + 16, tipY[1] + 6, "y", { color: AMBER, size: 15, weight: 800 });
    g += Tx(tipZ[0] + 16, tipZ[1] + 4, "z", { color: AMBER, size: 15, weight: 800 });
  }
  if (o.showO !== false) {
    const [ox, oy] = P3(PY_V.O);
    g += Fd(ox, oy, 4, AMBER);
    g += Tx(ox - 4, oy + 20, "O", { color: AMBER, size: 14.5, weight: 800 });
  }
  return g;
}

/** 题2 图 A：建系 + 五点坐标（含 Q 与三轴） */
function pyrSetupFig() {
  let g = pyrSkeleton({ axis: true });
  const [qx, qy] = P3(Q_PT);
  g += Fd(qx, qy, 4.5, GREEN);
  g += Tx(qx, qy + 22, "Q", { color: GREEN, size: 15, weight: 800 });
  // 等边三角形高 PO
  g += Ln(...P3(PY_V.P), ...P3(PY_V.O), { stroke: GREEN, w: 1.8, dash: "6 4" });
  g += Tx(280, 396, "△PBC 等边（边 2）⇒ PO ⊥ BC，PO = √3", { color: GREEN, size: 14.5, weight: 700 });
  g += Tx(280, 420, "面 PBC ⊥ 面 ABCD ⇒ PO ⊥ 底面；取 AD 中点 Q ⇒ OQ ⊥ OC", { color: INK_DIM, size: 13 });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${M2W} ${M2H}" width="100%" height="100%">${g}</svg>`;
}

/** 题2 图 B：(1) 四点共面 —— F 固定在 PF=2/3·PB，画出平面四边形 ODEF */
function pyrCoplanarFig() {
  const k = 2 / 3;
  const O = P3(PY_V.O), D = P3(PY_V.D), E = P3(E_PT), F = P3(Fk(k));
  let g = pyrSkeleton();
  g += poly([O, D, E, F], { fill: "rgba(76,201,240,0.15)", stroke: ACCENT, w: 2.6 });
  g += Ln(...P3(PY_V.P), ...P3(PY_V.B), { stroke: ROSE, w: 2, dash: "6 4" });
  g += Fd(...E, 7, GREEN); g += Fd(...F, 7.5, ROSE);
  g += Tx(E[0] - 18, E[1] - 8, "E", { color: GREEN, size: 15, weight: 800 });
  g += Tx(F[0] - 20, F[1] + 6, "F", { color: ROSE, size: 15, weight: 800 });
  g += Tx(280, 396, "PF = ⅔·PB 时，O、D、E、F 四点共面", { color: ACCENT, size: 15, weight: 700 });
  g += Tx(280, 420, "OF = ⅔·OE − ⅓·OD ⇒ F 落在平面 ODE 内", { color: INK_DIM, size: 13 });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${M2W} ${M2H}" width="100%" height="100%">${g}</svg>`;
}

/** 题2 图 C：(2) 线面角 —— F 沿 PB 扫动，线段 EF 与平面 PCD 的法向量同时呈现 */
function pyrAngleFig() {
  const n = 24, k0 = 0.12, k1 = 0.9;
  const fx = [], fy = [];
  for (let i = 0; i <= n; i++) {
    const k = k0 + (k1 - k0) * (i / n);
    const [sx, sy] = P3(Fk(k));
    fx.push(f1(sx)); fy.push(f1(sy));
  }
  const v = (a) => a.join(";");
  const E = P3(E_PT), C = P3(PY_V.C), D = P3(PY_V.D), P = P3(PY_V.P);
  const DUR = "10s";
  let g = pyrSkeleton();
  // 平面 PCD：半透明三角形，突出「所成的面」
  g += poly([P, C, D], { fill: "rgba(249,199,79,0.13)", stroke: "rgba(249,199,79,0.55)", w: 1.6 });
  // 动线段 EF
  g += `<line x1="${f1(E[0])}" y1="${f1(E[1])}" x2="${fx[0]}" y2="${fy[0]}" stroke="${ACCENT}" stroke-width="2.6">${MOVE("x2", v(fx), DUR)}${MOVE("y2", v(fy), DUR)}</line>`;
  // 动点 F
  g += `<circle r="7.5" fill="${ROSE}">${MOVE("cx", v(fx), DUR)}${MOVE("cy", v(fy), DUR)}${PULSE()}</circle>`;
  // 法向量示意：n = (0,√3,1) 在该投影下的方向 ∝ (√3, −1)，自平面 PCD 质心画出
  const nScreen = norm([NORMAL[1] * AX_Y[0] + NORMAL[2] * AX_Z[0], NORMAL[1] * AX_Y[1] + NORMAL[2] * AX_Z[1], 0]);
  const cen = [(P[0] + C[0] + D[0]) / 3, (P[1] + C[1] + D[1]) / 3];
  g += Ln(cen[0], cen[1], cen[0] + nScreen[0] * 84, cen[1] + nScreen[1] * 84, { stroke: AMBER, w: 2.2 });
  g += Tx(cen[0] + nScreen[0] * 96 + 34, cen[1] + nScreen[1] * 96 - 6, "n = (0, √3, 1)", { color: AMBER, size: 13.5, weight: 700, anchor: "start" });
  g += Fd(...E, 7, GREEN);
  g += Tx(E[0] - 18, E[1] - 8, "E", { color: GREEN, size: 15, weight: 800 });
  g += Tx(280, 396, "F 在 PB 上滑动：sin θ = |EF·n| / (|EF|·|n|)", { color: ACCENT, size: 14.5, weight: 700 });
  g += Tx(280, 420, "θ 为 EF 与平面 PCD 所成角", { color: INK_DIM, size: 13 });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${M2W} ${M2H}" width="100%" height="100%" data-anim="1">${g}</svg>`;
}

/* ══════════════════════ 页面装配 ══════════════════════ */
/** 右侧步骤卡：按权重分配高度（内容多的卡给更多空间，避免文字溢出卡片）
 *  每条 step 可带 w（权重，默认 1）；高度 = 可用空间 × w / Σw */
function stepCards(id, steps, o = {}) {
  const n = steps.length;
  const top = o.top ?? 200, gap = o.gap ?? 12;
  const bottom = o.bottom ?? 690;
  const avail = bottom - top - gap * (n - 1);
  const totalW = steps.reduce((s, st) => s + (st.w ?? 1), 0);
  const els = [];
  let y = top;
  steps.forEach((st, i) => {
    const h = i === n - 1 ? bottom - y : Math.round((avail * (st.w ?? 1)) / totalW);
    els.push(R(`${id}-s${i}`, 696, y, 488, h, { radius: 14, fill: st.fill ?? CARD, stroke: st.stroke ?? CARD_STROKE }));
    els.push(T(`${id}-t${i}`, 718, y + 9, 444, 26, st.t, { fontSize: o.ts ?? 16.5, fontWeight: 800, color: st.tc ?? ACCENT }));
    els.push(T(`${id}-d${i}`, 718, y + 35, 444, h - 40, st.d, { fontSize: o.fs ?? 14.5, lineHeight: o.lh ?? 1.62, color: st.dc ?? INK }));
    y += h + gap;
  });
  return els;
}
/** 讲解页：左图 + 右侧 n 张步骤卡 */
function figSlide(id, kickT, titleT, fig, steps, notes, o = {}) {
  return slide(id, BG, o.transition ?? "morph", notes, [
    kick(kickT), title(titleT),
    svgEl(`${id}-fig`, 96, o.figY ?? 218, M2W, M2H, fig),
    ...stepCards(id, steps, o),
  ]);
}

export function buildDoc() {
  const slides = [];

  /* ── S1 封面 ─────────────────────────────────────────────── */
  slides.push(slide("s1", BG, "none",
    "开场：本课用两道真题把立体几何的两个高频考点讲透——截面形状的临界判断，以及空间角的坐标法求解。",
    [
      svgEl("cover-fig", 636, 76, 560, 430, cubeCriticalFig()),
      T("ct", 96, 128, 540, 200, "立体几何<br>截面与空间角", { fontSize: 72, fontWeight: 900, lineHeight: 1.1 }),
      T("cs", 96, 348, 540, 34, "两道真题 · 一题一屏 · 动图讲透", { fontSize: 21, fontWeight: 500, color: INK_SOFT }),
      R("cline", 96, 400, 92, 3, { fill: ACCENT, stroke: "none", strokeWidth: 0, radius: 2 }),
      T("c1", 96, 428, 520, 30, "题 1 · 正方体截面：何时为四边形 → 求 BM 范围", { fontSize: 17, color: ACCENT }),
      T("c2", 96, 464, 520, 30, "题 2 · 四棱锥：四点共面 + 线面角正弦值 √39/13", { fontSize: 17, color: GREEN }),
      T("ck", 96, 520, 520, 26, "高中数学 · 立体几何专题复习", { fontSize: 15, fontWeight: 700, letterSpacing: 2.5, color: INK_DIM }),
      T("cp", 96, 668, 300, 22, "{{page:2}}", { fontSize: 13, fontWeight: 700, letterSpacing: 2, color: INK_DIM }),
    ]));

  /* ── S2 题1 题干 ─────────────────────────────────────────── */
  const opts = [
    { k: "A", v: "[2/3, 1)" }, { k: "B", v: "[1/3, 2/3]" },
    { k: "C", v: "(0, 1/3]" }, { k: "D", v: "(0, 2/3]" },
  ];
  const s2 = [
    kick("真题 1 · 正方体截面"), title("截面何时为四边形？"),
    svgEl("s2-fig", 96, 218, M2W, M2H, cubeAnimFig()),
    R("s2-q", 696, 210, 488, 176, { fill: "rgba(249,199,79,0.08)", stroke: "rgba(249,199,79,0.30)", radius: 18 }),
    T("s2-qt", 720, 230, 440, 26, "题 1 · 选择", { fontSize: 14, fontWeight: 700, letterSpacing: 2, color: AMBER }),
    T("s2-qb", 720, 260, 440, 118,
      "已知正方体 $ABCD\\text{-}A_1B_1C_1D_1$ 的体积为 1，点 $M$ 在线段 $BC$ 上（$M$ 异于 $B,C$），点 $N$ 在线段 $CC_1$ 上，且 $CN=\\frac13$。若平面 $AMN$ 截正方体所得截面为四边形，则线段 $BM$ 长的取值范围为（　）",
      { fontSize: 14.5, lineHeight: 1.62 }),
    R("s2-o", 696, 400, 488, 120, { fill: CARD, stroke: CARD_STROKE, radius: 16 }),
  ];
  opts.forEach((op, i) => {
    const x = 720 + (i % 2) * 230;
    const y = 420 + Math.floor(i / 2) * 46;
    s2.push(T(`s2-o${i}`, x, y, 220, 34, `<b>${op.k}.</b>&nbsp; ${op.v}`, { fontSize: 17, color: INK }));
  });
  s2.push(R("s2-h", 696, 534, 488, 138, { fill: "rgba(76,201,240,0.10)", stroke: "rgba(76,201,240,0.34)", radius: 18 }));
  s2.push(T("s2-ht", 720, 552, 440, 28, "读题三件事", { fontSize: 18, fontWeight: 800, color: ACCENT }));
  s2.push(T("s2-hb", 720, 588, 440, 78,
    "① 体积为 1 ⇒ 棱长 $a=1$<br>② $N$ 是定点：$CN=\\frac13$，$M$ 是动点<br>③ 问的是「截面为四边形」的 $BM$ 范围 ⇒ 找临界",
    { fontSize: 14.5, lineHeight: 1.6, color: INK_SOFT }));
  slides.push(slide("s2", BG, "none",
    "读题：正方体棱长为 1 是隐含条件；N 固定、M 动，问题是截面形状随 BM 变化的临界点。让学生先猜：M 靠近 B 时截面是什么形状？",
    s2));

  /* ── S3 题1 破题：平行面截线平行 ─────────────────────────── */
  slides.push(figSlide("s3", "真题 1 · 破题", "关键一步：平行面 ⇒ 截线平行", cubeAnimFig(),
    [
      { t: "① 找平行面", d: "正方体中 平面 $ADD_1A_1$ ∥ 平面 $BCC_1B_1$。这两个面是相对的，永远平行。" },
      { t: "② 看截线", d: "平面 $AMN$ 与前者交于 $AD_1$，与后者交于 $MN$ ⇒ $AD_1$ ∥ $MN$（平行平面被同一平面所截，截线必平行）。" },
      { t: "③ 再转一次", d: "在侧面 $BCC_1B_1$ 内，$AD_1$ ∥ $BC_1$（都是面对角线）⇒ $MN$ ∥ $BC_1$。" },
      { t: "④ 得到比例", d: "在 $\\triangle BCC_1$ 中 $MN$ ∥ $BC_1$ ⇒ $\\dfrac{CM}{CB}=\\dfrac{CN}{CC_1}=\\dfrac13$ ⇒ $CM=\\dfrac13$。" },
    ],
    "破题点：正方体里没有「平行」，只有「平行面」。抓住 ADD₁A₁ ∥ BCC₁B₁ 这一对相对面，两次平行传递就把动点 M 锁死了。",
    { fs: 14.5, lh: 1.6 }));

  /* ── S4 题1 临界与分类 ───────────────────────────────────── */
  slides.push(figSlide("s4", "真题 1 · 临界与分类", "临界值 BM = 2/3 决定形状", cubePentagonFig(),
    [
      { t: "临界：BM = 2/3", d: "由 $CM=\\frac13$ 得 $BM=1-\\frac13=\\frac23$。此时截面恰好多出一个顶点 $D_1$，四边形 $AMND_1$ 达到极限。", tc: AMBER, fill: "rgba(249,199,79,0.07)", stroke: "rgba(249,199,79,0.30)" },
      { t: "0 < BM ≤ 2/3 → 四边形", d: "$M$ 靠近 $B$，平面 $AMN$ 只与 4 个面相交，截面为四边形 $A\\text{-}M\\text{-}N\\text{-}D_1$。", tc: ACCENT },
      { t: "BM > 2/3 → 五边形", d: "$M$ 靠近 $C$，平面又与侧面 $ABB_1A_1$ 相交，多出一个顶点，截面变为五边形（见左图）。", tc: ROSE, fill: "rgba(255,123,140,0.07)", stroke: "rgba(255,123,140,0.28)" },
      { t: "答案", d: "$BM\\in\\left(0,\\ \\dfrac23\\right]$<br><b>故选 D</b>", tc: GREEN, fill: "rgba(124,223,176,0.10)", stroke: "rgba(124,223,176,0.34)" },
    ],
    "收口：临界值 2/3 有两个身份——它是 MN∥BC₁ 的比例结果，也是截面多出顶点 D₁ 的时刻。理由与结论在这里合流。",
    { fs: 14.5, lh: 1.6 }));

  /* ── S5 题2 题干 ─────────────────────────────────────────── */
  slides.push(slide("s5", BG, "none",
    "读题：面面垂直 ⇒ 线面垂直，这是建系的许可证。O、E 都是中点，F 是动点。第(2)问是存在性问题，先设参数再解方程。",
    [
      kick("真题 2 · 四棱锥"), title("四点共面 + 线面角"),
      svgEl("s5-fig", 96, 218, M2W, M2H, pyrSkeleton()),
      R("s5-q", 696, 210, 488, 214, { fill: "rgba(249,199,79,0.08)", stroke: "rgba(249,199,79,0.30)", radius: 18 }),
      T("s5-qt", 720, 230, 440, 26, "题 2 · 解答", { fontSize: 14, fontWeight: 700, letterSpacing: 2, color: AMBER }),
      T("s5-qb", 720, 260, 440, 156,
        "如图，在四棱锥 $P\\text{-}ABCD$ 中，$\\triangle PBC$ 为等边三角形，底面 $ABCD$ 是矩形，平面 $PBC\\perp$ 平面 $ABCD$。$O$、$E$ 分别为线段 $BC$、$PA$ 的中点，点 $F$ 在线段 $PB$ 上（不包括端点）。<br>(1) 若 $PF=\\frac23 PB$，求证：点 $O,D,E,F$ 四点共面；<br>(2) 若 $BC=2AB=2$，是否存在点 $F$，使得 $EF$ 与平面 $PCD$ 所成角的正弦值为 $\\frac{\\sqrt{39}}{13}$？若存在，求出 $\\frac{PF}{BF}$；若不存在，说明理由。",
        { fontSize: 13.5, lineHeight: 1.6 }),
      R("s5-h", 696, 444, 488, 228, { fill: "rgba(76,201,240,0.10)", stroke: "rgba(76,201,240,0.34)", radius: 18 }),
      T("s5-ht", 720, 464, 440, 28, "读题三件事", { fontSize: 18, fontWeight: 800, color: ACCENT }),
      T("s5-hb", 720, 500, 440, 160,
        "① 面 $PBC\\perp$ 面 $ABCD$，交线 $BC$ ⇒ 在面 $PBC$ 内作 $BC$ 的垂线即垂直底面<br>② $\\triangle PBC$ 等边、$BC=2$ ⇒ 高 $PO=\\sqrt3$，$AB=1$<br>③ $O$ 是 $BC$ 中点 ⇒ $PO\\perp BC$ 天然成立，$PO\\perp$ 底面<br>④ 第(2)问是<b>存在性</b>问题 → 设 $\\dfrac{PF}{PB}=k$，解方程看 $k\\in(0,1)$ 是否有解",
        { fontSize: 14.5, lineHeight: 1.72, color: INK_SOFT }),
    ]));

  /* ── S6 题2 建系 ─────────────────────────────────────────── */
  slides.push(figSlide("s6", "真题 2 · 第(1)问 · 建系", "先证垂直，再建系", pyrSetupFig(),
    [
      { t: "① 证 PO ⊥ 底面", d: "$\\triangle PBC$ 等边，$O$ 为 $BC$ 中点 ⇒ $PO\\perp BC$。又面 $PBC\\perp$ 面 $ABCD$，交线为 $BC$ ⇒ $PO\\perp$ 平面 $ABCD$。" },
      { t: "② 找第三条垂直", d: "取 $AD$ 中点 $Q$。底面是矩形 ⇒ $OQ\\perp OC$；又 $PO\\perp$ 底面 ⇒ $PO\\perp OQ$、$PO\\perp OC$。三条轴两两垂直，可以建系。" },
      { t: "③ 写坐标", d: "$BC=2AB=2$ ⇒ $BC=2,AB=1,PO=\\sqrt3$。<br>$O(0,0,0)$、$B(0,-1,0)$、$C(0,1,0)$、$A(1,-1,0)$、$D(1,1,0)$、$P(0,0,\\sqrt3)$。" },
      { t: "④ 写出 E 与 F", d: "$E$ 为 $PA$ 中点 ⇒ $E\\left(\\frac12,-\\frac12,\\frac{\\sqrt3}{2}\\right)$；<br>设 $\\dfrac{PF}{PB}=k$ ⇒ $F(0,-k,\\sqrt3(1-k))$。" },
    ],
    "建系三步：先证线面垂直拿到 z 轴，再在底面找两条互相垂直的线作为 x、y 轴。这里 OQ⊥OC 是关键——没有它建不了系。",
    { fs: 14.5, lh: 1.6 }));

  /* ── S7 题2 (1) 四点共面 ─────────────────────────────────── */
  slides.push(figSlide("s7", "真题 2 · 第(1)问 · 证明", "两条路都能到：向量 或 几何", pyrCoplanarFig(),
    [
      { w: 1.45, t: "法一 · 向量系数和 = 1", d: "$\\overrightarrow{PF}=\\frac23\\overrightarrow{PB}=\\frac23(\\overrightarrow{PO}+\\overrightarrow{OB})=\\frac23\\overrightarrow{PO}+\\frac13\\overrightarrow{DA}=\\frac23\\overrightarrow{PO}+\\frac23\\overrightarrow{PE}-\\frac13\\overrightarrow{PD}$，系数和 $=\\frac23+\\frac23-\\frac13=1$，故 $O,D,E,F$ 四点共面。", fill: "rgba(76,201,240,0.07)", stroke: "rgba(76,201,240,0.30)" },
      { t: "等价写法（更短）", d: "$\\overrightarrow{OF}=\\frac23\\overrightarrow{OE}-\\frac13\\overrightarrow{OD}$。$\\overrightarrow{OE}$、$\\overrightarrow{OD}$ 张成平面 $ODE$，$\\overrightarrow{OF}$ 是其线性组合 ⇒ $F\\in$ 平面 $ODE$。" },
      { w: 1.5, t: "法二 · 几何构造", d: "过 $P$ 作 $l\\parallel AD$，延长 $DE$ 交 $l$ 于 $G$。$AD\\parallel BC$ 且 $AD=2OB$ ⇒ $PG=AD=2OB$。设 $OG$ 交 $PB$ 于 $F'$，由 $PG\\parallel OB$ 得 $\\triangle PF'G\\sim\\triangle BF'O$ ⇒ $\\frac{PF'}{BF'}=\\frac{PG}{OB}=2$ ⇒ $PF'=\\frac23 PB=PF$ ⇒ $F'$ 与 $F$ 重合。", fill: "rgba(124,223,176,0.07)", stroke: "rgba(124,223,176,0.28)" },
      { t: "结论", d: "$F$ 在直线 $OG$ 上，而 $O$、$G$ 都在平面 $ODE$ 内 ⇒ $O,D,E,F$ 四点共面。<b>证毕。</b>", tc: GREEN, fill: "rgba(124,223,176,0.10)", stroke: "rgba(124,223,176,0.34)" },
    ],
    "共面的两种武器：代数上写成 OE、OD 的线性组合；几何上构造一条过 F 的直线，两端都落在平面内。考试时向量法更快、更不容易卡。",
    { fs: 13.5, lh: 1.58 }));

  /* ── S8 题2 (2) 线面角 ───────────────────────────────────── */
  slides.push(figSlide("s8", "真题 2 · 第(2)问 · 存在性", "设参数 → 求法向量 → 解方程", pyrAngleFig(),
    [
      { w: 95, t: "① 求平面 PCD 的法向量", d: "$\\overrightarrow{CD}=(1,0,0)$，$\\overrightarrow{CP}=(0,-1,\\sqrt3)$。设 $n=(x,y,z)$，由 $n\\cdot\\overrightarrow{CD}=0$ 得 $x=0$；由 $n\\cdot\\overrightarrow{CP}=0$ 得 $y=\\sqrt3 z$。取 $z=1$ ⇒ $n=(0,\\sqrt3,1)$，$|n|=2$。" },
      { w: 101, t: "② 写出 EF", d: "$\\overrightarrow{EF}=k\\overrightarrow{PB}-\\frac12\\overrightarrow{PA}=\\left(-\\frac12,\\ \\frac12-k,\\ \\frac{\\sqrt3}{2}-\\sqrt3 k\\right)$<br>$|\\overrightarrow{EF}|=\\sqrt{4k^2-4k+\\frac54}$" },
      { w: 124, t: "③ 列线面角方程", d: "$\\sin\\theta=\\dfrac{|\\overrightarrow{EF}\\cdot n|}{|\\overrightarrow{EF}||n|}=\\dfrac{|\\sqrt3-2\\sqrt3 k|}{2\\sqrt{4k^2-4k+\\frac54}}=\\dfrac{\\sqrt{39}}{13}$<br>化简得 $9k^2-9k+2=0$ ⇒ $k=\\frac13$ 或 $k=\\frac23$。" },
      { w: 100, t: "④ 回到所求", d: "$\\dfrac{PF}{BF}=\\dfrac{k}{1-k}$ ⇒ $k=\\frac13$ 时得 $\\frac12$；$k=\\frac23$ 时得 $2$。<br>两者都满足 $0&lt;k&lt;1$ ⇒ <b>存在</b>，$\\dfrac{PF}{BF}$ 为 $\\frac12$ 或 $2$。", tc: GREEN, fill: "rgba(124,223,176,0.10)", stroke: "rgba(124,223,176,0.34)" },
    ],
    "存在性问题的标准套路：把动点用参数 k 表示，把条件翻译成关于 k 的方程，解完必须回到定义域 k∈(0,1) 检验——这一步是得分点。",
    { fs: 13.5, lh: 1.58 }));

  /* ── S9 方法总结 ─────────────────────────────────────────── */
  const sums = [
    { n: "①", t: "截面问题", d: "找平行面 → 截线平行 → 相似比定临界；临界值决定截面是四边形还是五边形。", c: ACCENT },
    { n: "②", t: "共面问题", d: "向量法：写成两个已知向量的线性组合（系数和 = 1）；几何法：构造过该点的直线，两端均在面内。", c: GREEN },
    { n: "③", t: "空间角", d: "面面垂直 ⇒ 线面垂直 ⇒ 拿到 z 轴；底面找两条互相垂直的线定 x、y 轴；法向量 + 参数方程。", c: AMBER },
  ];
  const s9 = [kick("方法总结"), title("立体几何的三把钥匙")];
  sums.forEach((s, i) => {
    const x = 96 + i * 374;
    s9.push(R(`s9-c${i}`, x, 246, 340, 320, { radius: 24 }));
    s9.push(T(`s9-n${i}`, x + 28, 268, 120, 76, s.n, { fontSize: 46, fontWeight: 900, color: s.c, lineHeight: 1.5 }));
    s9.push(T(`s9-t${i}`, x + 28, 348, 284, 42, s.t, { fontSize: 28, fontWeight: 800 }));
    s9.push(R(`s9-l${i}`, x + 28, 402, 56, 3, { fill: s.c, stroke: "none", strokeWidth: 0, radius: 2 }));
    s9.push(T(`s9-d${i}`, x + 28, 424, 284, 128, s.d, { fontSize: 16.5, color: INK_SOFT, lineHeight: 1.72 }));
  });
  s9.push(band("s9-sum", 96, 596, 1088, 76, {}));
  s9.push(T("s9-sumt", 136, 616, 1008, 40,
    "一句话：把「动」翻译成「垂直、平行、参数」——截面靠平行锁定，共面靠向量锁定，空间角靠垂直锁定。",
    { fontSize: 17.5, fontWeight: 600, color: ACCENT, align: "center", lineHeight: 1.5 }));
  slides.push(slide("s9", BG, "none",
    "收束：两道题其实共用同一套动作——先找垂直/平行关系（几何），再翻译成坐标或向量（代数）。提醒学生回做错题时标出「关键一步」。",
    s9));

  return {
    format: "bento/slides",
    version: 1,
    title: "立体几何专题 · 截面与空间角",
    meta: { subject: "高中数学 · 立体几何专题", keywords: "正方体,截面,四棱锥,四点共面,线面角,法向量" },
    size: { width: 1280, height: 720 },
    theme: { background: BG, color: INK, accent: ACCENT, fontFamily: FONT },
    slides,
  };
}

/* ─────────────────── 内容安全自检 ─────────────────── */
// 血泪教训（真题精讲文档 §4 已记录）：内容里裸露的 `<` 后紧跟字母/数字会被 HTML
// 解析器当成标签开头，把后面的文字整段吞掉（如 $0<k<1$ 里的 `<k<1`）。
// 这里在生成前扫描所有 text 元素的 html，命中即抛错，避免"渲染出来才发现"。
const SAFE_TAG = /^<\/?(?:b|i|br|em|strong|u|s|sub|sup|span|a)(?:\s[^>]*)?>$/;
export function assertContentSafe(doc) {
  const bad = [];
  for (const s of doc.slides) {
    for (const el of s.elements) {
      // 只检查 text 元素的 html：svg 元素的 markup 本来就是合法裸 SVG，无需转义
      if (el.type !== "text" || typeof el.html !== "string") continue;
      const html = el.html;
      // 对齐 HTML5 词法规则：只有 `<` 后紧跟 字母 / `/` / `!` / `?` 才会开启标签或注释，
      // 才可能吞掉后续文字；`< BM`（后跟空格）与 `<1`（后跟数字）都是安全的字面量。
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

if (process.argv[1]?.endsWith("build-solid.mjs")) {
  const doc = buildDoc();
  assertContentSafe(doc);
  if (process.argv.includes("--embed")) {
    embed(TARGET);
  } else {
    writeFileSync(join(ROOT, "tools", "solid.json"), docJson(), "utf8");
    console.log("slides:", doc.slides.length, "| elements:", doc.slides.reduce((a, s) => a + s.elements.length, 0));
    for (const s of doc.slides) {
      const ids = s.elements.map((e) => e.id);
      const dup = ids.filter((v, k) => ids.indexOf(v) !== k);
      if (dup.length) console.log("!! dup ids in", s.id, dup);
    }
    console.log("solid.json written");
  }
}
