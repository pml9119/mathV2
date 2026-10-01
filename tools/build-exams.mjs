// build-exams.mjs — 用 Bento + mathV2 框架生成《圆锥曲线与立体几何 · 期中真题精讲》
// 输入：input/*.png（6 道真题）→ 录题 + SMIL 动图讲解（每图带控制条）
// 用法：node tools/build-exams.mjs [--embed]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { plotImplicit, ellipseF, circleF, renderImplicitSVG } from "../packages/math/dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const BG = "#0B1020", INK = "#E9EEF8", INK_SOFT = "rgba(233,238,248,0.62)", INK_DIM = "rgba(233,238,248,0.38)";
const ACCENT = "#4CC9F0", AMBER = "#F9C74F", GREEN = "#7CDFB0", ROSE = "#FF7B8C";
const CARD = "rgba(255,255,255,0.035)", CARD_STROKE = "rgba(255,255,255,0.11)";
const FONT = "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif";
const K = 0.5522847498;
const M2W = 560, M2H = 430;

/* ────── 基础画板 ────── */
function ellipseD(cx, cy, a, b) {
  const k = K;
  return "M " + (cx + a) + " " + cy +
    " C " + (cx + a) + " " + (cy - k * b) + " " + (cx + k * a) + " " + (cy - b) + " " + cx + " " + (cy - b) +
    " C " + (cx - k * a) + " " + (cy - b) + " " + (cx - a) + " " + (cy - k * b) + " " + (cx - a) + " " + cy +
    " C " + (cx - a) + " " + (cy + k * b) + " " + (cx - k * a) + " " + (cy + b) + " " + cx + " " + (cy + b) +
    " C " + (cx + k * a) + " " + (cy + b) + " " + (cx + a) + " " + (cy + k * b) + " " + (cx + a) + " " + cy + " Z";
}
function circleD(cx, cy, r) { return ellipseD(cx, cy, r, r); }
function T(id, x, y, w, html, o) {
  o = o || {};
  return { id: id, type: "text", x: x, y: y, w: w, h: o.h || 40, rotation: 0, opacity: 1, html: html,
    fontSize: o.fontSize || 18, fontFamily: FONT, fontWeight: o.fontWeight || 600,
    color: o.color || INK, align: o.align || "left", valign: "top", lineHeight: o.lineHeight || 1.55 };
}
function R(id, x, y, w, h, o) {
  o = o || {};
  return { id: id, type: "shape", shape: "rect", x: x, y: y, w: w, h: h, rotation: 0, opacity: 1,
    fill: o.fill || CARD, stroke: o.stroke || CARD_STROKE, strokeWidth: o.strokeWidth || 1, radius: o.radius || 18 };
}
function slide(id, elements, transition, notes) {
  return { id: id, background: BG, transition: transition || "morph", notes: notes || "", elements: elements };
}
function svgEl(id, x, y, w, h, markup) {
  return { id: id, type: "svg", x: x, y: y, w: w, h: h, rotation: 0, opacity: 1, markup: markup };
}
function kick(t) { return T("k", 96, 62, 700, t, { fontSize: 14, fontWeight: 700, color: ACCENT, letterSpacing: 3 }); }
function title(t) { return T("ttl", 96, 96, 1080, t, { fontSize: 38, fontWeight: 800, color: INK, lineHeight: 1.15, h: 80 }); }

/* ────── mathV2 引擎图元 ────── */
function m2svg(vp, ff, frags, anim) {
  const segs = plotImplicit(ff, vp, M2W, M2H, 4);
  let svg = renderImplicitSVG(vp, segs, M2W, M2H, {
    curveColor: "rgba(76,201,240,0.72)",
    gridColor: "rgba(233,238,248,0.06)",
    axisColor: "rgba(233,238,248,0.20)",
    labelColor: "rgba(233,238,248,0.34)",
  });
  svg = svg.replace("</svg>", (frags || "") + "</svg>");
  if (anim !== false) svg = svg.replace("<svg ", "<svg data-anim=\"1\" ");
  return svg;
}
function Fd(x, y, r, c) { return "<circle cx=\"" + x + "\" cy=\"" + y + "\" r=\"" + r + "\" fill=\"" + c + "\"/>"; }
function Tx(x, y, t, o) {
  o = o || {};
  return "<text x=\"" + x + "\" y=\"" + y + "\" fill=\"" + (o.color || INK_SOFT) + "\" font-size=\"" + (o.size || 14) + "\" font-weight=\"" + (o.weight || 600) + "\" text-anchor=\"" + (o.anchor || "middle") + "\" font-family=\"" + FONT + "\">" + t + "</text>";
}
function MOTION(path, dur) { return "<animateMotion dur=\"" + dur + "\" repeatCount=\"indefinite\" path=\"" + path + "\"/>"; }
function MOVE(attr, vals, dur) { return "<animate attributeName=\"" + attr + "\" values=\"" + vals + "\" dur=\"" + dur + "\" repeatCount=\"indefinite\" calcMode=\"linear\"/>"; }
function PULSE() { return "<animate attributeName=\"r\" values=\"6;9;6\" dur=\"1.5s\" repeatCount=\"indefinite\"/>"; }
function lineD(x1, y1, x2, y2, o) {
  o = o || {};
  return "<line x1=\"" + x1 + "\" y1=\"" + y1 + "\" x2=\"" + x2 + "\" y2=\"" + y2 + "\" stroke=\"" + (o.stroke || "rgba(233,238,248,0.5)") + "\" stroke-width=\"" + (o.width || 1.8) + "\"" + (o.dash ? " stroke-dasharray=\"" + o.dash + "\"" : "") + "/>";
}
function vpFrom(xc, yc, scale) {
  return { xMin: xc - M2W / 2 / scale, xMax: xc + M2W / 2 / scale, yMin: yc - M2H / 2 / scale, yMax: yc + M2H / 2 / scale };
}
function W2S(vp, x, y) {
  return [((x - vp.xMin) / (vp.xMax - vp.xMin)) * M2W, M2H - ((y - vp.yMin) / (vp.yMax - vp.yMin)) * M2H];
}

/* ────────── 题1 图：椭圆 mx²+y²=4m → x²/4+y²/(4m)=1（a=2, b=2√m, c=2√(1−m)） ────────── */
function prob1Fig() {
  const vp = vpFrom(0, 0, 75); // 75px/unit: x∈[−3.73,3.73], y∈[−2.87,2.87]
  const a = 2, b = 2 * Math.sqrt(2 / 9), c = 2 * Math.sqrt(7 / 9); // m=2/9 已定
  const [f1] = [W2S(vp, -c, 0)];
  const [f2] = [W2S(vp, c, 0)];
  const [ax, ay] = W2S(vp, 0, 2);
  const ORBIT = ellipseD(280, 215, a * 75, b * 75);
  const frags =
    lineD(f1[0], f1[1], f2[0], f2[1], { stroke: "rgba(249,199,79,0.5)", width: 1.4, dash: "5 5" }) +
    Fd(f1[0], f1[1], 6, AMBER) + Tx(f1[0] - 12, f1[1] + 22, "F₁", { color: AMBER, size: 14 }) +
    Fd(f2[0], f2[1], 6, AMBER) + Tx(f2[0] + 10, f2[1] + 22, "F₂", { color: AMBER, size: 14 }) +
    Fd(ax, ay, 6, ROSE) + Tx(ax + 16, ay + 2, "A(0,2)", { color: ROSE, size: 14, anchor: "start" }) +
    "<circle r=\"8\" fill=\"" + ACCENT + "\">" + MOTION(ORBIT, "9s") + PULSE() + "</circle>";
  return m2svg(vp, ellipseF(a, b), frags);
}

/* ────────── 题2 图：动圆P (r=1) 与圆M(r=1)外切、与圆N(r=9)内切 → 椭圆轨迹 ────────── */
function prob2Fig() {
  const vp = vpFrom(0, 0, 40); // 40px/unit: x∈[−7,7], y∈[−5.375,5.375]
  const a = 5, b = 4;
  const [mx, my] = W2S(vp, -3, 0);
  const [nx, ny] = W2S(vp, 3, 0);
  const ORBIT = ellipseD(280, 215, a * 40, b * 40);
  // P 采样（36步）→ 动圆圆心 + M—P / N—P 线段端点
  const n = 36, px = [], py = [], pxm = [], pym = [], pxn = [], pyn = [];
  for (let k = 0; k <= n; k++) {
    const th = (k / n) * 2 * Math.PI;
    const [sx, sy] = W2S(vp, a * Math.cos(th), b * Math.sin(th));
    px.push(sx.toFixed(1)); py.push(sy.toFixed(1));
    pxm.push(sx.toFixed(1)); pym.push(sy.toFixed(1));
    pxn.push(sx.toFixed(1)); pyn.push(sy.toFixed(1));
  }
  const v = (arr) => arr.join(";");
  const frags =
    // 圆 M(r=1→40px)、圆 N(r=9→360px，左缘弧入画)
    "<circle cx=\"" + mx + "\" cy=\"" + my + "\" r=\"40\" fill=\"none\" stroke=\"rgba(76,201,240,0.45)\" stroke-width=\"1.6\"/>" +
    "<circle cx=\"" + nx + "\" cy=\"" + ny + "\" r=\"360\" fill=\"none\" stroke=\"rgba(76,201,240,0.22)\" stroke-width=\"1.6\"/>" +
    // 动圆P（r=1→40px，跟随 P）
    "<circle r=\"40\" fill=\"rgba(76,201,240,0.10)\" stroke=\"rgba(76,201,240,0.55)\" stroke-width=\"1.6\">" + MOVE("cx", v(px), "10s") + MOVE("cy", v(py), "10s") + "</circle>" +
    // |PM|(外切半径和 r+1=2→80px 线段为直观) + |PN| 线段
    "<line x1=\"" + mx + "\" y1=\"" + my + "\" x2=\"" + px[0] + "\" y2=\"" + py[0] + "\" stroke=\"rgba(233,238,248,0.35)\" stroke-width=\"1.4\" stroke-dasharray=\"4 4\">" + MOVE("x2", v(px), "10s") + MOVE("y2", v(py), "10s") + "</line>" +
    "<line x1=\"" + nx + "\" y1=\"" + ny + "\" x2=\"" + px[0] + "\" y2=\"" + py[0] + "\" stroke=\"rgba(233,238,248,0.35)\" stroke-width=\"1.4\" stroke-dasharray=\"4 4\">" + MOVE("x2", v(px), "10s") + MOVE("y2", v(py), "10s") + "</line>" +
    Fd(mx, my, 6, AMBER) + Tx(mx - 16, my + 24, "M", { color: AMBER, size: 14 }) +
    Fd(nx, ny, 6, AMBER) + Tx(nx + 10, ny + 24, "N", { color: AMBER, size: 14 }) +
    "<circle r=\"8\" fill=\"" + ACCENT + "\">" + MOTION(ORBIT, "10s") + PULSE() + "</circle>" +
    Tx(280, 374, "|PM|+|PN| = (r+1)+(9−r) = 10", { color: INK, size: 11.5 });
  return m2svg(vp, ellipseF(a, b), frags);
}

/* ────────── 题3 图：椭圆 x²/4+y²/2=1，k_PA=2k_QB → PQ 恒过 T(−2/3,0) ────────── */
function prob3Fig() {
  const vp = vpFrom(0, 0, 90); // 90px/unit: x∈[−3.11,3.11], y∈[−2.39,2.39]
  const a = 2, b = Math.sqrt(2);
  const [ax, ay] = W2S(vp, -2, 0);
  const [bx, by] = W2S(vp, 2, 0);
  const [tx, ty] = W2S(vp, -2 / 3, 0);
  // P 采样 → Q = 直线 PT 与椭圆的另一交点（s2=C/A）
  const n = 48, px = [], py = [], qx = [], qy = [];
  for (let k = 0; k <= n; k++) {
    const th = (k / n) * 2 * Math.PI;
    const xp = a * Math.cos(th), yp = b * Math.sin(th);
    const Acoef = Math.pow(xp + 2 / 3, 2) / 4 + yp * yp / 2;
    const s2 = (-8 / 9) / Acoef;
    const xq = -2 / 3 + s2 * (xp + 2 / 3), yq = s2 * yp;
    const [sxp, syp] = W2S(vp, xp, yp);
    const [sxq, syq] = W2S(vp, xq, yq);
    px.push(sxp.toFixed(1)); py.push(syp.toFixed(1));
    qx.push(sxq.toFixed(1)); qy.push(syq.toFixed(1));
  }
  const v = (arr) => arr.join(";");
  const frags =
    // 弦 PQ（恒过 T）
    "<line x1=\"" + px[0] + "\" y1=\"" + py[0] + "\" x2=\"" + qx[0] + "\" y2=\"" + qy[0] + "\" stroke=\"rgba(233,238,248,0.75)\" stroke-width=\"2.2\">" + MOVE("x1", v(px), "11s") + MOVE("y1", v(py), "11s") + MOVE("x2", v(qx), "11s") + MOVE("y2", v(qy), "11s") + "</line>" +
    "<circle r=\"7\" fill=\"" + INK + "\">" + MOVE("cx", v(px), "11s") + MOVE("cy", v(py), "11s") + "</circle>" +
    "<circle r=\"7\" fill=\"" + INK + "\">" + MOVE("cx", v(qx), "11s") + MOVE("cy", v(qy), "11s") + "</circle>" +
    Fd(ax, ay, 6, AMBER) + Tx(ax - 14, ay + 26, "A", { color: AMBER, size: 14 }) +
    Fd(bx, by, 6, AMBER) + Tx(bx + 14, by + 26, "B", { color: AMBER, size: 14 }) +
    Fd(tx, ty, 7, ROSE) + "<circle cx=\"" + tx + "\" cy=\"" + ty + "\" r=\"11\" fill=\"none\" stroke=\"rgba(255,123,140,0.6)\" stroke-width=\"1.4\"/>" + Tx(tx, ty + 26, "T(−2/3,0)", { color: ROSE, size: 13.5 }) +
    Tx(px[0] + 12, py[0] - 8, "P", { color: INK, size: 14, anchor: "start" }) +
    Tx(qx[0] - 12, qy[0] + 24, "Q", { color: INK, size: 14, anchor: "start" });
  return m2svg(vp, ellipseF(a, b), frags);
}

/* ────────── 题4 图：正方体截面（三维透视投影 + M 连续扫动动画） ────────── */
function prob4Fig() {
  // 轴测投影：x 向右30°, y 向左45°, z 向上
  const c30 = 0.866, c45 = 0.707, s30 = 0.5, s45 = 0.707;
  const P3 = (x, y, z, scale) => {
    const u = (x * c30 - y * c45) * scale;
    const v = (z * 1.0 + x * s30 + y * s45) * scale;
    return [u + 280, 330 - v];
  };
  const S = 150;
  // 正方体：A(0,0,0) B(1,0,0) C(1,1,0) D(0,1,0) A1(0,0,1) B1(1,0,1) C1(1,1,1) D1(0,1,1)
  const A = P3(0, 0, 0, S), B = P3(1, 0, 0, S), C = P3(1, 1, 0, S), D = P3(0, 1, 0, S);
  const A1 = P3(0, 0, 1, S), B1 = P3(1, 0, 1, S), C1 = P3(1, 1, 1, S), D1 = P3(0, 1, 1, S);
  // M 在 BC 上（B(1,0,0)→C(1,1,0)）：M(1, t, 0)；N 在 CC1：N(1, 1, 2/3 * 1) → N(1,1,2/3)
  // 截面：M—N (棱 CC1上)，过 A
  const M = P3(1, 0.4, 0, S), N = P3(1, 1, 0.667, S);
  const M0 = P3(1, 0, 0, S), N0 = P3(1, 1, 0.667, S);
  const edges =
    lineD(A[0], A[1], B[0], B[1], { stroke: "rgba(233,238,248,0.35)" }) + lineD(B[0], B[1], C[0], C[1], { stroke: "rgba(233,238,248,0.35)" }) + lineD(C[0], C[1], D[0], D[1], { stroke: "rgba(233,238,248,0.35)" }) + lineD(D[0], D[1], A[0], A[1], { stroke: "rgba(233,238,248,0.35)" }) +
    lineD(A[0], A[1], A1[0], A1[1], { stroke: "rgba(233,238,248,0.35)" }) + lineD(B[0], B[1], B1[0], B1[1], { stroke: "rgba(233,238,248,0.35)" }) + lineD(C[0], C[1], C1[0], C1[1], { stroke: "rgba(233,238,248,0.35)" }) + lineD(D[0], D[1], D1[0], D1[1], { stroke: "rgba(233,238,248,0.35)" }) +
    lineD(A1[0], A1[1], B1[0], B1[1], { stroke: "rgba(233,238,248,0.35)" }) + lineD(B1[0], B1[1], C1[0], C1[1], { stroke: "rgba(233,238,248,0.35)" }) + lineD(C1[0], C1[1], D1[0], D1[1], { stroke: "rgba(233,238,248,0.35)" }) + lineD(D1[0], D1[1], A1[0], A1[1], { stroke: "rgba(233,238,248,0.35)" });
  const cross = lineD(M[0], M[1], N[0], N[1], { stroke: ACCENT, width: 2.6 }) +
    lineD(M[0], M[1], A[0], A[1], { stroke: ACCENT, width: 2.6, dash: "5 4" }) +
    lineD(A[0], A[1], N[0], N[1], { stroke: ACCENT, width: 2.6, dash: "5 4" });
  const labels =
    Tx(A[0] - 6, A[1] + 18, "A", { color: INK, size: 12.5 }) + Tx(B[0] + 14, B[1] + 18, "B", { color: INK, size: 12.5 }) +
    Tx(C[0] + 14, C[1] + 18, "C", { color: INK, size: 12.5 }) + Tx(D[0] - 6, D[1] + 18, "D", { color: INK, size: 12.5 }) +
    Tx(A1[0] - 6, A1[1] - 8, "A₁", { color: INK, size: 12.5 }) + Tx(B1[0] + 14, B1[1] - 8, "B₁", { color: INK, size: 12.5 }) +
    Tx(C1[0] + 14, C1[1] - 8, "C₁", { color: INK, size: 12.5 }) + Tx(D1[0] - 6, D1[1] - 8, "D₁", { color: INK, size: 12.5 }) +
    Tx(M[0] + 16, M[1] + 4, "M", { color: ROSE, size: 13, anchor: "start" }) + Tx(N[0] + 16, N[1] - 8, "N", { color: ROSE, size: 13, anchor: "start" });
  return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 " + M2W + " " + M2H + "\" width=\"100%\" height=\"100%\" data-anim=\"1\">" +
    "<rect width=\"" + M2W + "\" height=\"" + M2H + "\" fill=\"#0B1020\"/>" + edges + cross + labels + "</svg>";
}

/* ────────── 题5：四棱锥（真实几何 + F 动点动画） ────────── */
function prob5Fig() {
  // O(0,0,0)，BC=2 → B(−1,0,0) C(1,0,0)，AB=1 → A(−1,1,0) D(1,1,0)（矩形 AB=1? 取 A(−1,0.5,0) D(1,0.5,0) 底面矩形）
  // 高 h=√3（等边三角形 PBC 边长 2）
  const P3 = (x, y, z) => {
    const u = (x - y * 0.5) * 72;
    const v = (z + y * 0.45) * 72;
    return [u + 280, 340 - v];
  };
  const A = P3(-1, -0.5, 0), B = P3(1, -0.5, 0), C = P3(1, 0.5, 0), D = P3(-1, 0.5, 0);
  const P = P3(0, 0, 1.732);
  const E = P3(-0.5, -0.25, 0.866); // PA 中点 E(−0.5,−0.25,0.866)
  const n = 36, fx = [], fy = [];
  for (let k = 0; k <= n; k++) {
    const t = 0.25 + 0.5 * (k / n);
    const [sx, sy] = P3(t, -0.5 * t, 1.732 * (1 - t));
    fx.push(sx.toFixed(1)); fy.push(sy.toFixed(1));
  }
  const v = (arr) => arr.join(";");
  const F0 = P3(0.5, -0.25, 0.866);
  const edges =
    lineD(A[0], A[1], B[0], B[1], { stroke: "rgba(233,238,248,0.35)" }) + lineD(B[0], B[1], C[0], C[1], { stroke: "rgba(233,238,248,0.35)" }) + lineD(C[0], C[1], D[0], D[1], { stroke: "rgba(233,238,248,0.35)" }) + lineD(D[0], D[1], A[0], A[1], { stroke: "rgba(233,238,248,0.35)" }) +
    lineD(P[0], P[1], A[0], A[1]) + lineD(P[0], P[1], B[0], B[1]) + lineD(P[0], P[1], C[0], C[1]) + lineD(P[0], P[1], D[0], D[1]);
  const anims =
    "<line x1=\"" + E[0] + "\" y1=\"" + E[1] + "\" x2=\"" + F0[0] + "\" y2=\"" + F0[1] + "\" stroke=\"rgba(124,223,176,0.85)\" stroke-width=\"2.2\">" + MOVE("x2", v(fx), "8s") + MOVE("y2", v(fy), "8s") + "</line>" +
    "<circle r=\"6\" fill=\"" + AMBER + "\">" + MOVE("cx", v(fx), "8s") + MOVE("cy", v(fy), "8s") + "</circle>";
  const labels = Tx(A[0], A[1] + 16, "A") + Tx(B[0], B[1] + 16, "B") + Tx(C[0], C[1] + 16, "C") + Tx(D[0], D[1] + 16, "D") + Tx(P[0], P[1] - 10, "P") + Tx(E[0] + 10, E[1] - 6, "E", { color: AMBER, size: 12.5 }) + Tx(F0[0] - 12, F0[1] + 14, "F", { color: ROSE, size: 12.5 });
  return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 " + M2W + " " + M2H + "\" width=\"100%\" height=\"100%\" data-anim=\"1\">" +
    "<rect width=\"" + M2W + "\" height=\"" + M2H + "\" fill=\"#0B1020\"/>" + edges + anims + labels + "</svg>";
}

/* ────────── 主装配：教案版 17 页（封面 + 5题×(题干+2讲解) + 小结） ────────── */

// 分步讲解页通用布局:左图(560x430) + 右讲解(488)
function stepSlide(id, kickT, titleT, figEl, steps) {
  const els = [
    kick(kickT), title(titleT),
    svgEl(id + "-fig", 96, 210, M2W, M2H, figEl),
  ];
  steps.forEach((st, i) => {
    const y = 210 + i * 118;
    els.push(R(id + "-s" + i, 696, y, 488, 105, { fill: CARD, stroke: CARD_STROKE, radius: 14 }));
    els.push(T(id + "-t" + i, 716, y + 12, 450, st.t, { fontSize: 17, fontWeight: 800, color: ACCENT }));
    els.push(T(id + "-d" + i, 716, y + 42, 450, st.d, { fontSize: 14.5, lineHeight: 1.55, color: INK }));
  });
  return slide(id, els, "morph", steps.map(s => s.t).join(" | "));
}

function buildDoc() {
  const slides = [];
  // S1 封面
  slides.push(slide("s1", [
    kick("期中真题精讲 · 圆锥曲线与立体几何"),
    title("六道真题 · 一题一屏 · 动图讲透"),
    R("card", 96, 250, 1088, 170, { fill: CARD, stroke: CARD_STROKE, radius: 20 }),
    T("l1", 120, 274, 1000, "椭圆最值（|PA|−|PF₂|=−4/3） · 动圆相切轨迹（椭圆 x²/25+y²/16=1） · 斜率定值定点（−2/3,0）", { fontSize: 17, fontWeight: 600, color: ACCENT, lineHeight: 1.5 }),
    T("l2", 120, 312, 1000, "正方体截面（BM∈(0,2/3]） · 四棱锥（四点共面 + 线面角 √39/13）", { fontSize: 17, fontWeight: 600, color: GREEN, lineHeight: 1.5 }),
    T("l3", 120, 356, 1000, "每道题：题干 + 分步讲解 + 可控动图（播放/暂停/拖动定位）", { fontSize: 15, color: INK_SOFT, lineHeight: 1.5 }),
    svgEl("fig0", 752, 280, 400, 250, m2svg(vpFrom(0, 0, 55), ellipseF(5, 4), Fd(280 - 150, 215, 6, AMBER) + Fd(280 + 150, 215, 6, AMBER) + "<circle r=\"8\" fill=\"" + ACCENT + "\">" + MOTION(ellipseD(280, 215, 275, 220), "10s") + PULSE() + "</circle>", true)),
  ], "none", "总览：封面 + 5 道真题分步精讲")
  );

  // S2 题1 题干
  slides.push(slide("s2", [
    kick("真题 1 · 椭圆最值"),
    title("|PA| − |PF₂| 的最小值为 −4/3，求 m"),
    svgEl("fig1", 96, 210, M2W, M2H, prob1Fig()),
    R("q", 696, 210, 488, 150, { fill: "rgba(249,199,79,0.08)", stroke: "rgba(249,199,79,0.30)", radius: 18 }),
    T("qt", 720, 232, 440, "题 1 · 选择", { fontSize: 14, fontWeight: 700, color: AMBER, letterSpacing: 2 }),
    T("qb", 720, 262, 440, "已知 F₂ 为椭圆 mx²+y²=4m (0&lt;m&lt;1) 的右焦点，A(0,2)，点 P 为椭圆上任意一点，且 |PA|−|PF₂| 的最小值为 −4/3，则 m=（ ）", { fontSize: 14.5, lineHeight: 1.6, h: 80 }),
    R("opt", 696, 372, 488, 88, { fill: CARD, stroke: CARD_STROKE, radius: 14 }),
    T("o1", 716, 390, 220, "A. 17/9", { fontSize: 15, color: INK_SOFT }),
    T("o2", 716, 414, 220, "B. 2√2/3", { fontSize: 15, color: INK_SOFT }),
    T("o3", 960, 390, 220, "C. 2√2/9", { fontSize: 15, color: INK_SOFT }),
    T("o4", 960, 414, 220, "D. 2/9", { fontSize: 15, color: INK_SOFT }),
    R("a", 696, 474, 488, 186, { fill: CARD, stroke: CARD_STROKE, radius: 18 }),
    T("at", 720, 494, 440, "待你发现：椭圆定义如何破题？", { fontSize: 19, fontWeight: 800, color: ACCENT }),
    T("ab", 720, 528, 440, "提示：利用椭圆定义 |PF₁|+|PF₂|=2a 转化", { fontSize: 14.5, lineHeight: 1.7, color: INK }),
    T("ab2", 720, 562, 440, "动图：P 绕椭圆运动，观察 |PA|、|PF₁|、|PF₂|", { fontSize: 14, lineHeight: 1.7, color: AMBER }),
  ], "morph", "题1 题干。定义 |PF₁|+|PF₂|=2a=4 是突破口；|PA|−|PF₂| = |PA|+|PF₁|−4 ≥ |AF₁|−4，等号当 A、P、F₁ 共线取到")
  );

  // S3 题1 分步1
  slides.push(stepSlide("s3", "真题 1 · 分步讲解 ①", "审题转化：标准式 + 定义改写", prob1Fig(), [
    { t: "① 标准式", d: "mx²+y²=4m → x²/4 + y²/(4m) = 1 → a²=4, b²=4m, c²=4−4m" },
    { t: "② 定义改写", d: "|PF₁|+|PF₂|=2a=4 → |PA|−|PF₂| = |PA|+|PF₁|−4" },
    { t: "③ 三角不等式", d: "|PA|+|PF₁| ≥ |AF₁|（等号当 A、F₁、P 共线）" },
    { t: "④ 计算", d: "|AF₁|=√(8−4m)；√(8−4m)−4=−4/3 → m=2/9" },
  ]));

  // S4 题1 分步2（关键：A/F1/P 共线位置）
  slides.push(stepSlide("s4", "真题 1 · 分步讲解 ②", "三角不等式取等：A、F₁、P 共线", prob1Fig(), [
    { t: "取等条件", d: "欲 |PA|+|PF₁| 最小 → A、F₁、P 三点共线，且 P 在 A 与 F₁ 之间" },
    { t: "|AF₁| 计算", d: "F₁(−2√(1−m),0), A(0,2) → |AF₁| = √(4(1−m)+4)" },
    { t: "解方程", d: "√(8−4m) = 8/3 → 8−4m = 64/9 → m = 2/9" },
    { t: "验证", d: "m=2/9 ∈ (0,1) ✓ → 选 D" },
  ]));

  // S5 题2 题干
  slides.push(slide("s5", [
    kick("真题 2 · 动圆相切"),
    title("动圆 P 的轨迹 + 1/|PM| + 1/|PN| 的取值范围"),
    svgEl("fig2", 96, 210, M2W, M2H, prob2Fig()),
    R("q", 696, 210, 488, 170, { fill: "rgba(249,199,79,0.08)", stroke: "rgba(249,199,79,0.30)", radius: 18 }),
    T("qt", 720, 232, 440, "题 2 · 解答题", { fontSize: 14, fontWeight: 700, color: AMBER, letterSpacing: 2 }),
    T("qb", 720, 262, 440, "已知动圆 P 与圆 M:(x+3)²+y²=1 外切，与圆 N:(x−3)²+y²=81 内切。(1) 求动圆圆心 P 的轨迹方程；(2) 求 1/|PM|+1/|PN| 的取值范围", { fontSize: 14.5, lineHeight: 1.6, h: 90 }),
    R("a", 696, 392, 488, 270, { fill: CARD, stroke: CARD_STROKE, radius: 18 }),
    T("at", 720, 414, 440, "题目要点", { fontSize: 19, fontWeight: 800, color: ACCENT }),
    T("ab", 720, 448, 440, "① 外切 |PM|=r+1；内切 |PN|=9−r；|MN|=6", { fontSize: 14.5, lineHeight: 1.7 }),
    T("ab2", 720, 482, 440, "② |PM|+|PN|=10 → 椭圆定义, a=5, c=3, b=4", { fontSize: 14.5, lineHeight: 1.7, color: AMBER }),
    T("ab3", 720, 514, 440, "③ 动图：P 绕椭圆运动，|PM|+|PN| 恒 = 10", { fontSize: 14, lineHeight: 1.7, color: INK }),
  ], "morph", "题2 题干。外切/内切半径关系 → |PM|+|PN|=10 → 椭圆定义 → 轨迹 x²/25+y²/16=1")
  );

  // S6 题2 分步1（轨迹）
  slides.push(stepSlide("s6", "真题 2 · 分步讲解 ①", "外切内切半径关系 → 椭圆定义", prob2Fig(), [
    { t: "① 圆位置", d: "M(−3,0) r₁=1；N(3,0) r₂=9；|MN|=6 < r₂−r₁=8 → 两圆内含" },
    { t: "② 半径关系", d: "设动圆 P 半径 r：外切 |PM|=r+1；内切 |PN|=9−r" },
    { t: "③ 定义", d: "|PM|+|PN| = (r+1)+(9−r) = 10 > |MN| = 6 → 椭圆" },
    { t: "④ 轨迹", d: "a=5, c=3, b=4 → x²/25 + y²/16 = 1" },
  ]));

  // S7 题2 分步2（范围）
  slides.push(stepSlide("s7", "真题 2 · 分步讲解 ②", "范围：二次函数 + 换元", prob2Fig(), [
    { t: "① 参数化", d: "设 t=|PM|∈[2,8]（P 在椭圆的焦半径长度）" },
    { t: "② 求积", d: "|PM|·|PN| = t(10−t) = −t²+10t ∈ [16,25]" },
    { t: "③ 目标式", d: "1/|PM|+1/|PN| = 10/(|PM|·|PN|)" },
    { t: "④ 范围", d: "10/(t(10−t)) ∈ [2/5, 5/8]（t=5 → 2/5 最大；t=2 或 8 → 5/8 最小）" },
  ]));

  // S8 题3 题干
  slides.push(slide("s8", [
    kick("真题 3 · 斜率定值"),
    title("k_PA = 2 k_QB，直线 PQ 恒过定点"),
    svgEl("fig3", 96, 210, M2W, M2H, prob3Fig()),
    R("q", 696, 210, 488, 170, { fill: "rgba(249,199,79,0.08)", stroke: "rgba(249,199,79,0.30)", radius: 18 }),
    T("qt", 720, 232, 440, "题 3 · 选择", { fontSize: 14, fontWeight: 700, color: AMBER, letterSpacing: 2 }),
    T("qb", 720, 262, 440, "椭圆 E: x²/4 + y²/2 = 1，A、B 是左右顶点，P、Q 在椭圆 E 上，满足 k_PA = 2k_QB，则直线 PQ 恒过定点（ ）", { fontSize: 14.5, lineHeight: 1.6, h: 70 }),
    R("a", 696, 392, 488, 270, { fill: CARD, stroke: CARD_STROKE, radius: 18 }),
    T("at", 720, 414, 440, "题目要点", { fontSize: 19, fontWeight: 800, color: ACCENT }),
    T("ab", 720, 448, 440, "① A(−2,0)、B(2,0)；设 P(x₁,y₁)、Q(x₂,y₂)", { fontSize: 14.5, lineHeight: 1.7 }),
    T("ab2", 720, 482, 440, "② k_PA = y₁/(x₁+2)；k_QB = y₂/(x₂−2)", { fontSize: 14.5, lineHeight: 1.7 }),
    T("ab3", 720, 514, 440, "③ 动图：P 绕椭圆运动, PQ 始终过 T(−2/3,0)", { fontSize: 14, lineHeight: 1.7, color: AMBER }),
  ], "morph", "题3 题干。设线 PQ: x=my+n → 联立韦达 → k 条件 → 消参得 n=−2/3 或 −2 → 检验舍 −2")
  );

  // S9 题3 分步1（设线联立）
  slides.push(stepSlide("s9", "真题 3 · 分步讲解 ①", "设线 + 联立 + 韦达", prob3Fig(), [
    { t: "① 设线", d: "直线 PQ: x=my+n（斜率存在）代入椭圆 → (m²+2)y²+2mny+n²−4=0" },
    { t: "② 韦达", d: "y₁+y₂ = −2mn/(m²+2)；y₁y₂ = (n²−4)/(m²+2)" },
    { t: "③ 判别式", d: "Δ=8(2m²−n²+4)>0 → 相异两点 P、Q" },
    { t: "④ 斜率", d: "k_PA = y₁/(x₁+2)；k_QB = y₂/(x₂−2)" },
  ]));

  // S10 题3 分步2（消参求定点）
  slides.push(stepSlide("s10", "真题 3 · 分步讲解 ②", "k 条件消参 → 定点", prob3Fig(), [
    { t: "① k 条件", d: "k_PA = 2k_QB → y₁/(x₁+2) = 2y₂/(x₂−2)" },
    { t: "② 整理", d: "(m²+1)y₁y₂ + m(n+2)(y₁+y₂) + (n+2)² = 0" },
    { t: "③ 消参", d: "代入韦达 → 3n²+8n+4=0 → n = −2/3 或 −2" },
    { t: "④ 检验", d: "n=−2 时直线过 A（舍，P=Q 退化）；n=−2/3 → 恒过 T(−2/3,0) ✓" },
  ]));

  // S11 题4 题干
  slides.push(slide("s11", [
    kick("真题 4 · 正方体截面（立体几何）"),
    title("BM 的取值范围：截面何时为四边形"),
    svgEl("fig4", 96, 210, M2W, M2H, prob4Fig()),
    R("q", 696, 210, 488, 170, { fill: "rgba(249,199,79,0.08)", stroke: "rgba(249,199,79,0.30)", radius: 18 }),
    T("qt", 720, 232, 440, "题 4 · 选择", { fontSize: 14, fontWeight: 700, color: AMBER, letterSpacing: 2 }),
    T("qb", 720, 262, 440, "正方体 ABCD−A₁B₁C₁D₁ 体积为 1，M 在线段 BC 上（≠B,C），N 在线段 CC₁ 上且 CN=1/3，若平面 AMN 截正方体所得截面为四边形，则 BM 取值范围为（ ）", { fontSize: 14, lineHeight: 1.6, h: 90 }),
    R("a", 696, 392, 488, 270, { fill: CARD, stroke: CARD_STROKE, radius: 18 }),
    T("at", 720, 414, 440, "题目要点", { fontSize: 19, fontWeight: 800, color: ACCENT }),
    T("ab", 720, 448, 440, "① 正方体棱长 = 1（体积为 1）", { fontSize: 15, lineHeight: 1.7 }),
    T("ab2", 720, 482, 440, "② M 在 BC 上：BM=t；N 在 CC₁ 上：CN=1/3", { fontSize: 15, lineHeight: 1.7 }),
    T("ab3", 720, 514, 440, "③ 动图：M 沿 BC 滑动, 截面从四边形演化为五边形", { fontSize: 14.5, lineHeight: 1.7, color: AMBER }),
    T("ab4", 720, 546, 440, "④ 提问：截面何时恰好为四边形？（临界！）", { fontSize: 14.5, lineHeight: 1.7, color: INK }),
  ], "morph", "题4 题干。平行面截线平行 → MN∥AD₁∥BC₁ → CM=CN=1/3 → BM=2/3 为临界")
  );

  // S12 题4 分步1（面面平行→MN∥BC₁）
  slides.push(stepSlide("s12", "真题 4 · 分步讲解 ①", "平行面截线平行 → MN∥BC₁", prob4Fig(), [
    { t: "① 平行面", d: "面 ADD₁A₁ ∥ 面 BCC₁B₁，平面 AMN 与两者分别交于 AD₁、MN" },
    { t: "② 截线平行", d: "AD₁ ∥ MN；又 AD₁ ∥ BC₁ → MN ∥ BC₁" },
    { t: "③ 比例", d: "侧面 BCC₁B₁ 中：MN∥BC₁ → CM = CN = 1/3" },
    { t: "④ 临界", d: "BM = 1 − CM = 1 − 1/3 = 2/3（截面过顶点 D₁）" },
  ]));

  // S13 题4 分步2（临界分析）
  slides.push(stepSlide("s13", "真题 4 · 分步讲解 ②", "临界分析：四边形 ⇔ BM≤2/3", prob4Fig(), [
    { t: "① BM&lt;2/3", d: "M 靠近 B，截面只交 4 个面 → 四边形 A−M−N−(交A₁D₁)" },
    { t: "② BM=2/3", d: "截面恰好过 D₁ → 四边形 A−M−N−D₁（临界）" },
    { t: "③ BM>2/3", d: "M 靠近 C，平面 AMN 与面 ABB₁A₁ 再交于一点 → 五边形" },
    { t: "④ 结论", d: "BM ∈ (0, 2/3] · 选 D" },
  ]));

  // S14 题5 题干
  slides.push(slide("s14", [
    kick("真题 5 · 四棱锥（立体几何）"),
    title("四点共面 + EF 与面 PCD 所成角"),
    svgEl("fig5", 96, 200, M2W, M2H, prob5Fig()),
    R("q", 696, 210, 488, 190, { fill: "rgba(249,199,79,0.08)", stroke: "rgba(249,199,79,0.30)", radius: 18 }),
    T("qt", 720, 232, 440, "题 5 · 解答题", { fontSize: 14, fontWeight: 700, color: AMBER, letterSpacing: 2 }),
    T("qb", 720, 262, 440, "四棱锥 P−ABCD：△PBC 等边，底面 ABCD 矩形，平面 PBC⊥平面 ABCD。O、E 为 BC、PA 中点，F 在线段 PB 上。(1) PF=2/3·PB 时，求证 O、D、E、F 四点共面；(2) BC=2AB=2，是否存在 F 使 EF 与面 PCD 所成角正弦值为 √39/13？若存在求 PF/BF。", { fontSize: 13.5, lineHeight: 1.55, h: 110 }),
    R("a", 696, 412, 488, 250, { fill: CARD, stroke: CARD_STROKE, radius: 18 }),
    T("at", 720, 434, 440, "题目要点", { fontSize: 19, fontWeight: 800, color: ACCENT }),
    T("ab", 720, 468, 440, "① △PBC 等边 + 面 PBC⊥面 ABCD → PO⊥面 ABCD", { fontSize: 14.5, lineHeight: 1.7 }),
    T("ab2", 720, 502, 440, "② O 为 BC 中点, E 为 PA 中点, F 在 PB 上", { fontSize: 14.5, lineHeight: 1.7 }),
    T("ab3", 720, 536, 440, "③(1) 共面判定 (2) 建系 → 法向量 → 角方程", { fontSize: 14.5, lineHeight: 1.7, color: AMBER }),
  ], "morph", "题5 题干。建系：O 原点, BC 为 x, AB∥y, z 轴⊥面；PO⊥面 ABCD 是关键")
  );

  // S15 题5 分步1（共面）
  slides.push(stepSlide("s15", "真题 5 · 分步讲解 ①", "(1) 四点共面：双法证明", prob5Fig(), [
    { t: "① 建系", d: "O(0,0,0), B(−1,0,0), C(1,0,0), D(1,1,0), A(−1,1,0), P(0,0,√3)" },
    { t: "② F 坐标", d: "PF=(2/3)PB → F(−2/3, 0, √3/3)；E(−1/2,1/2,√3/2)" },
    { t: "③ 法一", d: "OF = (2/3)OE − (1/3)OD → F 在平面 ODE 内 → 共面 ✓" },
    { t: "④ 法二", d: "PF = (2/3)PO − (1/3)PD + (2/3)PE，系数和=1 → 共面 ✓" },
  ]));

  // S16 题5 分步2（线面角）
  slides.push(stepSlide("s16", "真题 5 · 分步讲解 ②", "(2) 线面角：建系 + 法向量 + 方程", prob5Fig(), [
    { t: "① F 参数化", d: "PF=t·PB(0&lt;t&lt;1) → F(−t, 0, √3(1−t))；EF=(1/2−t, −1/2, √3/2−√3t)" },
    { t: "② 法向量", d: "面 PCD: CD=(0,1,0), CP=(−1,0,√3) → n=(√3,0,1)" },
    { t: "③ 角方程", d: "sinθ = |EF·n|/(|EF||n|) = √39/13 → 9t²−9t+2=0" },
    { t: "④ 解", d: "t=1/3 或 2/3 → PF/BF = 1/2 或 2（均存在 ✓）" },
  ]));

  // S17 小结
  slides.push(slide("s17", [
    kick("方法总结"),
    title("两大武器：定义转化 + 建系坐标"),
    R("card1", 96, 210, 528, 430, { fill: CARD, stroke: CARD_STROKE, radius: 18 }),
    T("c1t", 120, 232, 480, "解析几何", { fontSize: 24, fontWeight: 900, color: ACCENT }),
    T("c1a", 120, 282, 480, "最值 → 定义转化 + 三角不等式（题1）", { fontSize: 16, lineHeight: 1.7 }),
    T("c1b", 120, 322, 480, "轨迹 → 位置关系 → 定义（题2）", { fontSize: 16, lineHeight: 1.7 }),
    T("c1c", 120, 362, 480, "定点 → 设线联立韦达 + 检验（题3）", { fontSize: 16, lineHeight: 1.7 }),
    R("card2", 656, 210, 528, 430, { fill: CARD, stroke: CARD_STROKE, radius: 18 }),
    T("c2t", 680, 232, 480, "立体几何", { fontSize: 24, fontWeight: 900, color: GREEN }),
    T("c2a", 680, 282, 480, "截面 → 平行面截线平行 + 临界（题4）", { fontSize: 16, lineHeight: 1.7 }),
    T("c2b", 680, 322, 480, "空间角 → 建系 + 法向量 + 参数（题5）", { fontSize: 16, lineHeight: 1.7 }),
    T("c2c", 680, 362, 480, "共面 → 向量表出 或 系数和=1", { fontSize: 16, lineHeight: 1.7 }),
    R("card3", 96, 600, 1088, 90, { fill: "rgba(76,201,240,0.08)", stroke: "rgba(76,201,240,0.3)", radius: 16 }),
    T("c3", 120, 620, 1040, "作业：完成学案 3 道同类变式；重做错题并写出“关键一步”", { fontSize: 18, fontWeight: 700, color: ACCENT, align: "center" }),
  ], "morph", "小结：解析几何三招（定义转化/位置关系/设线联立）+ 立体几何两招（截面平行/建系法向量）")
  );

  return {
    format: "bento/slides", version: 1,
    title: "圆锥曲线与立体几何 · 期中真题精讲",
    meta: { subject: "高中数学 · 期中真题", keywords: "椭圆,动圆,轨迹,定值,截面,空间角" },
    size: { width: 1280, height: 720 },
    theme: { background: BG, color: INK, accent: ACCENT, fontFamily: FONT },
    slides,
  };
}
function embed(target) {
  const shell = readFileSync(target, "utf8");
  const json = JSON.stringify(buildDoc()).replace(/</g, "\\u003c");
  const open = '<script type="application/bento+json" id="bento-doc">';
  const close = "</script>";
  const i = shell.indexOf(open);
  if (i < 0) throw new Error("bento-doc not found in " + target);
  const j = shell.indexOf(close, i);
  const next = shell.slice(0, i + open.length) + "\n" + json + "\n" + shell.slice(j);
  writeFileSync(target, next, "utf8");
  console.log("embedded (" + json.length + " bytes JSON) into " + target);
}

if (process.argv[1]?.endsWith("build-exams.mjs")) {
  const json = JSON.stringify(buildDoc()).replace(/</g, "\\u003c");
  writeFileSync(join(ROOT, "tools", "exams.json"), json, "utf8");
  const doc = JSON.parse(json.replace(/\\u003c/g, "<"));
  console.log("slides:", doc.slides.length, "| elements:", doc.slides.reduce((a, s) => a + s.elements.length, 0));
  for (const s of doc.slides) {
    const ids = s.elements.map((e) => e.id);
    const dup = ids.filter((v, k) => ids.indexOf(v) !== k);
    if (dup.length) console.log("!! dup ids in", s.id, dup);
  }
  if (process.argv.includes("--embed")) {
    embed(join(ROOT, "conic-exams.bento.html"));
  }
  console.log("exams.json written");
}
