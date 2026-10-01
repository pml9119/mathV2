// build-deck.mjs — generate the bento/slides document for
// "圆锥曲线的动点问题" and write it into the shell file.
// Usage: node tools/build-deck.mjs [--embed]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
// ★ mathV2 数学引擎（plotImplicit/renderImplicitSVG → 网格+轴+曲线的 SVG 渲染）
import { plotImplicit, ellipseF, circleF, parabolaF, renderImplicitSVG } from '../packages/math/dist/index.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

// ── palette / type ────────────────────────────────────────────────────────
const BG = '#0B1020'
const INK = '#E9EEF8'
const INK_SOFT = 'rgba(233,238,248,0.62)'
const INK_DIM = 'rgba(233,238,248,0.38)'
const ACCENT = '#4CC9F0'
const ACCENT_SOFT = 'rgba(76,201,240,0.14)'
const AMBER = '#F9C74F'
const CARD = 'rgba(255,255,255,0.035)'
const CARD_STROKE = 'rgba(255,255,255,0.11)'
const GRID = 'rgba(233,238,248,0.14)'
const FONT = "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"

// ── geometry helpers ──────────────────────────────────────────────────────
const K = 0.5522847498

export function ellipseD(cx, cy, a, b) {
  const k = K
  return (
    `M ${cx + a} ${cy}` +
    ` C ${cx + a} ${cy - k * b} ${cx + k * a} ${cy - b} ${cx} ${cy - b}` +
    ` C ${cx - k * a} ${cy - b} ${cx - a} ${cy - k * b} ${cx - a} ${cy}` +
    ` C ${cx - a} ${cy + k * b} ${cx - k * a} ${cy + b} ${cx} ${cy + b}` +
    ` C ${cx + k * a} ${cy + b} ${cx + a} ${cy + k * b} ${cx + a} ${cy} Z`
  )
}

export function ellipseRel(a, b) {
  const k = K
  return (
    `M 0 0` +
    ` c 0 ${-k * b} ${k * a - a} ${-b} ${-a} ${-b}` +
    ` c ${-k * a} 0 ${-a + k * a} ${b} ${-a} ${b}` +
    ` c 0 ${k * b} ${a - k * a} ${b} ${a} ${b}` +
    ` c ${k * a} 0 ${a - k * a} ${-b} ${a} ${-b}`
  )
}

export function circleD(cx, cy, r) { return ellipseD(cx, cy, r, r) }
export function circleRel(r) { return ellipseRel(r, r) }

export function parabolaD(px0, pyc, sx, sy, p, ylo, yhi, n = 48) {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const y = ylo + ((yhi - ylo) * i) / n
    const x = (y * y) / (4 * p)
    const px = px0 + x * sx
    const py = pyc - y * sy
    d += (i === 0 ? 'M ' : ' L ') + px.toFixed(1) + ' ' + py.toFixed(1)
  }
  return d
}

// ── element factories ─────────────────────────────────────────────────────
function T(id, x, y, w, h, html, o = {}) {
  return {
    id, type: 'text', x, y, w, h: o.autoH ? 0 : h, rotation: 0, opacity: 1,
    html, fontSize: o.fontSize ?? 19, fontFamily: FONT,
    fontWeight: o.fontWeight ?? 500, color: o.color ?? INK,
    align: o.align ?? 'left', valign: o.valign ?? 'top',
    lineHeight: o.lineHeight ?? 1.5, ...(o.letterSpacing ? { letterSpacing: o.letterSpacing } : {}),
    ...(o.fx ? { fx: o.fx } : {}), ...(o.role ? { role: o.role } : {}),
  }
}
// 估算文字所需高度（行数 × 行高 + 余量），用于 o.autoH：让盒高跟着内容走，
// 而不是手填一个"大概够"的数字。手填正是 21 处 text-overflow 的成因。
// 说明：这是估算，不是浏览器实测；它的价值在于"随内容同步变化"——
// 改字号/改文案时盒高自动跟上，不会像手填值那样悄悄失配。
export function estimateTextH(el) {
  const fs = el.fontSize ?? 19;
  const lh = el.lineHeight ?? 1.5;
  const boxW = el.w ?? 400;
  // 逐 <br> 分段，再按"每行可容纳字符数"折行；CJK 按 1 字宽、ASCII 按 0.55 字宽粗估
  const widthOf = (s) => [...s].reduce((a, ch) => a + (ch.charCodeAt(0) > 0x2e80 ? 1 : 0.55), 0);
  const perLine = Math.max(1, Math.floor(boxW / fs));
  let lines = 0;
  for (const seg of String(el.html).split(/<br\s*\/?>/i)) {
    const plain = seg.replace(/<[^>]+>/g, '');
    lines += Math.max(1, Math.ceil(widthOf(plain) / perLine));
  }
  // 行高 + 上下各 4px 余量，再向上取整到整数
  return Math.ceil(lines * fs * lh + 8);
}
/** 把所有 autoH 文本的盒高按内容回填（在返回文档前统一调用）。 */
function resolveAutoHeights(doc) {
  for (const s of doc.slides) {
    for (const el of s.elements) {
      if (el.type === 'text' && el.h === 0) el.h = estimateTextH(el);
    }
  }
  return doc;
}
function R(id, x, y, w, h, o = {}) {
  return {
    id, type: 'shape', shape: 'rect', x, y, w, h, rotation: 0, opacity: 1,
    fill: o.fill ?? CARD, stroke: o.stroke ?? CARD_STROKE, strokeWidth: o.strokeWidth ?? 1,
    radius: o.radius ?? 18, ...(o.fillGradient ? { fillGradient: o.fillGradient } : {}),
    ...(o.strokeStyle ? { strokeStyle: o.strokeStyle } : {}),
    ...(o.fx ? { fx: o.fx } : {}), ...(o.link ? { link: o.link } : {}),
  }
}
function E(id, x, y, w, h, o = {}) {
  return {
    id, type: 'shape', shape: 'ellipse', x, y, w, h, rotation: 0, opacity: 1,
    fill: o.fill ?? ACCENT, stroke: o.stroke ?? 'none', strokeWidth: o.strokeWidth ?? 0,
    radius: 0, ...(o.fx ? { fx: o.fx } : {}),
  }
}
function LN(id, x, y, w, h, o = {}) {
  return {
    id, type: 'shape', shape: 'line', x, y, w, h, rotation: 0, opacity: 1,
    fill: o.fill ?? GRID, stroke: 'none', strokeWidth: o.strokeWidth ?? 2,
    radius: 0, ...(o.strokeStyle ? { strokeStyle: o.strokeStyle } : {}),
    ...(o.lineStart ? { lineStart: o.lineStart } : {}), ...(o.lineEnd ? { lineEnd: o.lineEnd } : {}),
    ...(o.fx ? { fx: o.fx } : {}),
  }
}
function PA(id, x, y, w, h, d, o = {}) {
  return {
    id, type: 'shape', shape: 'path', x, y, w, h, rotation: 0, opacity: 1,
    d, pathBox: o.pathBox ?? [0, 0, 560, 430],
    fill: o.fill ?? 'transparent', stroke: o.stroke ?? 'none', strokeWidth: o.strokeWidth ?? 2,
    radius: 0, ...(o.strokeStyle ? { strokeStyle: o.strokeStyle } : {}),
    ...(o.fx ? { fx: o.fx } : {}),
  }
}
function slide(id, background, transition, notes, elements) {
  return { id, background, transition, notes, elements }
}
const dot = (plotX, plotY, size, color, id, fx) => E(id, 96 + plotX - size / 2, 210 + plotY - size / 2, size, size, { fill: color, fx })

// ── shared plots ──────────────────────────────────────────────────────────
const PX0 = 96, PY0 = 210, PCX = 280, PCY = 215
const EA = 250, EB = 150, EC = 200
const ORBIT_D = ellipseD(PCX, PCY, EA, EB)
const ORBIT_REL = ellipseRel(EA, EB)
const F1 = { x: PCX - EC, y: PCY }, F2 = { x: PCX + EC, y: PCY }

const CR = 200, AX = 240
const CIRCLE_D = circleD(PCX, PCY, CR)
const CIRCLE_REL = circleRel(CR)
const MID_REL = circleRel(CR / 2)

const PBX = 200, PBC = 215, PSX = 100, PSY = 66
const PARABOLA_D = parabolaD(PBX, PBC, PSX, PSY, 1, -2.6, 2.6)

const ORB = 'orbit', MOVER = 'mover', F1D = 'f1', F2D = 'f2'
const CIRC = 'circ', PMOV = 'pmov', MMOV = 'mmov'
const PARR = 'parr', FOC = 'foc'

const kick = (t, o = {}) => T('k', 96, 64, 700, 30, t, { fontSize: 15, fontWeight: 700, letterSpacing: 3.5, color: ACCENT, fx: o.fx })
const title = (t, o = {}) => T('ttl', 96, 104, 900, 96, t, { fontSize: 50, fontWeight: 800, color: INK, lineHeight: 1.12, fx: o.fx })

// ── SVG 图形（mathV2 引擎渲染 + SMIL 动画）──────────────────────────────
const M2W = 560, M2H = 430
/** mathV2 renderImplicitSVG（网格/轴/曲线）+ 自定义片段 → 完整 SVG markup */
function m2svg(vp, ff, frags = "", anim = true) {
  const segs = plotImplicit(ff, vp, M2W, M2H, 4)
  let svg = renderImplicitSVG(vp, segs, M2W, M2H, {
    curveColor: "rgba(76,201,240,0.72)",
    gridColor: "rgba(233,238,248,0.06)",
    axisColor: "rgba(233,238,248,0.20)",
    labelColor: "rgba(233,238,248,0.34)",
  })
  svg = svg.replace("</svg>", frags + "</svg>")
  if (anim) svg = svg.replace("<svg ", '<svg data-anim="1" ')
  return svg
}
const Fd = (x, y, r, c, o = {}) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + c + '"' + (o.stroke ? ' stroke="' + o.stroke + '" stroke-width="' + (o.strokeW ?? 2) + '"' : '') + '/>'
const Tx = (x, y, t, o = {}) => '<text x="' + x + '" y="' + y + '" fill="' + (o.color ?? INK_SOFT) + '" font-size="' + (o.size ?? 15) + '" font-weight="' + (o.weight ?? 600) + '" text-anchor="' + (o.anchor ?? "middle") + '" font-family="' + FONT + '">' + t + '</text>'
const MOTION = (path, dur) => '<animateMotion dur="' + dur + '" repeatCount="indefinite" path="' + path + '"/>'
const PULSE = (a = 7, b = 10) => '<animate attributeName="r" values="' + a + ';' + b + ';' + a + '" dur="1.6s" repeatCount="indefinite"/>'
const MOVE = (attr, vals, dur) => '<animate attributeName="' + attr + '" values="' + vals + '" dur="' + dur + '" repeatCount="indefinite"/>'
const svgEl = (id, x, y, w, h, markup) => ({ id, type: 'svg', x, y, w, h, rotation: 0, opacity: 1, markup })

// —— 椭圆图元（a=5, b=3, c=4；视图 x∈[-5.6,5.6] y∈[-4.3,4.3]，比例 50px/单位）——
const E_VP = { xMin: -5.6, xMax: 5.6, yMin: -4.3, yMax: 4.3 }
const EA2 = 250, EB2 = 150, EC2 = 200
const E_ORBIT = ellipseD(280, 215, EA2, EB2)
const EFX1 = 280 - EC2, EFX2 = 280 + EC2
function ellipseFig(o) {
  let f = ""
  f += Fd(EFX1, 215, 6, AMBER) + Tx(EFX1 - 30, 239, o.f1, { color: AMBER, size: 14 })
  f += Fd(EFX2, 215, 6, AMBER) + Tx(EFX2 + 26, 239, o.f2, { color: AMBER, size: 14 })
  if (o.top) f += '<line x1="44" y1="51" x2="516" y2="51" stroke="rgba(249,199,79,0.40)" stroke-width="1.4" stroke-dasharray="5 5"/>'
  if (o.h) f += '<line x1="280" y1="65" x2="280" y2="215" stroke="rgba(249,199,79,0.55)" stroke-width="2"/>' + Tx(290, 100, "h = b", { color: AMBER, size: 13, anchor: "start" })
  if (o.plabel) f += Tx(296, 48, o.plabel, { color: ACCENT, size: 13, anchor: "start" })
  if (o.bottom) f += Tx(280, 387, o.bottom, { color: INK_DIM, size: 14 })
  f += '<circle r="9" fill="' + ACCENT + '">' + MOTION(E_ORBIT, "9s") + PULSE() + "</circle>"
  return m2svg(E_VP, ellipseF(5, 3), f)
}

// —— 圆 + 相关点（A(6,0)，P 在 x²+y²=16 上，M 为 AP 中点）——
const C_VP = { xMin: -5.3333333, xMax: 6.6666667, yMin: -4.5833333, yMax: 4.5833333 }
const C_CR = 187.5, C_CX = 250, C_CY = 215, C_AX = 531.25
const C_P = circleD(C_CX, C_CY, C_CR)
const C_M = circleD((C_AX + C_CX) / 2, C_CY, C_CR / 2)
function relFig() {
  const n = 24, xs = [], ys = []
  for (let k = 0; k <= n; k++) {
    const t = (k / n) * 2 * Math.PI
    xs.push((C_CX + C_CR * Math.cos(t)).toFixed(1))
    ys.push((C_CY - C_CR * Math.sin(t)).toFixed(1))
  }
  let f = ""
  f += '<line x1="' + C_AX + '" y1="' + C_CY + '" x2="' + xs[0] + '" y2="' + ys[0] + '" stroke="rgba(233,238,248,0.30)" stroke-width="1.6">' + MOVE("x2", xs.join(";"), "8s") + MOVE("y2", ys.join(";"), "8s") + "</line>"
  f += Fd(C_AX, C_CY, 6, AMBER) + Tx(C_AX, C_CY - 16, "A(6,0)", { color: AMBER, size: 13 })
  f += '<circle r="8" fill="' + ACCENT + '">' + MOTION(C_P, "8s") + "</circle>"
  f += '<circle r="7" fill="#E9EEF8" stroke="' + ACCENT + '" stroke-width="2">' + MOTION(C_M, "8s") + "</circle>"
  f += Tx(C_CX + C_CR + 13, C_CY - 14, "P", { color: ACCENT, size: 14, anchor: "start" })
  f += Tx((C_AX + C_CX) / 2 + C_CR / 2 + 13, C_CY - 46, "M", { color: INK, size: 14, anchor: "start" })
  return m2svg(C_VP, circleF(4), f)
}

// —— 抛物线 y²=4x（F(1,0)，准线 x=−1；比例 50px/单位）——
const P_VP = { xMin: -4, xMax: 7.2, yMin: -4.3, yMax: 4.3 }
const P_VX = 200, P_VY = 215, P_SC = 50
const P_FX = P_VX + P_SC, P_FY = P_VY
function paraBase(f, anim = true) {
  return m2svg(P_VP, parabolaF(2),
    '<line x1="' + (P_VX - P_SC) + '" y1="70" x2="' + (P_VX - P_SC) + '" y2="360" stroke="rgba(249,199,79,0.45)" stroke-width="1.4" stroke-dasharray="5 5"/>' +
    Tx(P_VX - P_SC - 10, 372, "准线 x=−1", { color: AMBER, size: 12.5, anchor: "end" }) +
    Fd(P_FX, P_FY, 6, AMBER) + Tx(P_FX + 12, P_FY - 12, "F(1,0)", { color: AMBER, size: 13, anchor: "start" }) + f, anim)
}
function chordFig(staticM) {
  if (staticM != null) {
    const d = Math.sqrt(staticM * staticM + 1)
    const xAw = (staticM * staticM + 2 + 2 * d) / (staticM * staticM)
    const xBw = (staticM * staticM + 2 - 2 * d) / (staticM * staticM)
    const Ax = P_VX + P_SC * xAw, Ay = P_VY - P_SC * staticM * (xAw - 1)
    const Bx = P_VX + P_SC * xBw, By = P_VY - P_SC * staticM * (xBw - 1)
    return paraBase('<line x1="' + Ax.toFixed(1) + '" y1="' + Ay.toFixed(1) + '" x2="' + Bx.toFixed(1) + '" y2="' + By.toFixed(1) + '" stroke="rgba(233,238,248,0.75)" stroke-width="2.4"/>' +
      Fd(Ax, Ay, 6.5, INK) + Fd(Bx, By, 6.5, INK) +
      '<text x="' + (Ax + 12).toFixed(1) + '" y="' + (Ay - 8).toFixed(1) + '" fill="' + INK + '" font-size="15" font-weight="700">A</text>' +
      '<text x="' + (Bx - 12).toFixed(1) + '" y="' + (By + 22).toFixed(1) + '" fill="' + INK + '" font-size="15" font-weight="700">B</text>' +
      '<text x="' + ((Ax + P_FX) / 2).toFixed(1) + '" y="' + ((Ay + P_FY) / 2 - 10).toFixed(1) + '" fill="rgba(233,238,248,0.6)" font-size="13" font-weight="600">|AF| = 3</text>', false)
  }
  const n = 36, ax = [], ay = [], bx = [], by = []
  for (let k = 0; k <= n; k++) {
    const t = (k / n) * 2 * Math.PI
    const m2 = 1.725 - 0.475 * Math.cos(t)
    const d = Math.sqrt(m2 * m2 + 1)
    const xAw = (m2 * m2 + 2 + 2 * d) / (m2 * m2), xBw = (m2 * m2 + 2 - 2 * d) / (m2 * m2)
    ax.push((P_VX + P_SC * xAw).toFixed(1)); ay.push((P_VY - P_SC * m2 * (xAw - 1)).toFixed(1))
    bx.push((P_VX + P_SC * xBw).toFixed(1)); by.push((P_VY - P_SC * m2 * (xBw - 1)).toFixed(1))
  }
  const v = (arr) => arr.join(";")
  return paraBase('<line x1="' + bx[0] + '" y1="' + by[0] + '" x2="' + ax[0] + '" y2="' + ay[0] + '" stroke="rgba(233,238,248,0.75)" stroke-width="2.4">' +
    MOVE("x1", v(bx), "10s") + MOVE("y1", v(by), "10s") + MOVE("x2", v(ax), "10s") + MOVE("y2", v(ay), "10s") + "</line>" +
    '<circle r="6.5" fill="' + INK + '">' + MOVE("cx", v(bx), "10s") + MOVE("cy", v(by), "10s") + "</circle>" +
    '<circle r="6.5" fill="' + INK + '">' + MOVE("cx", v(ax), "10s") + MOVE("cy", v(ay), "10s") + "</circle>")
}

// —— 各页图元 ——
const FIG_COVER = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 568 424" width="100%" height="100%" data-anim="1">' +
  '<circle cx="284" cy="212" r="284" fill="none" stroke="rgba(76,201,240,0.30)" stroke-width="1.5"/>' +
  Fd(284, 212, 7, "rgba(76,201,240,0.5)") +
  '<circle r="9" fill="' + ACCENT + '">' + MOTION(circleD(284, 212, 170), "14s") + PULSE() + "</circle></svg>"
const FIG_DEF = ellipseFig({ f1: "F₁", f2: "F₂", bottom: "2a" })
const FIG_EX1 = ellipseFig({ f1: "F₁(−4,0)", f2: "F₂(4,0)", bottom: "2a = 10" })
const FIG_TRI = ellipseFig({ f1: "F₁", f2: "F₂", top: 1, h: 1 })
const FIG_TRI2 = ellipseFig({ f1: "F₁", f2: "F₂", top: 1, h: 1, plabel: "P(0, 3)" })
const FIG_REL = relFig()
const FIG_CHORD1 = chordFig(null)
const FIG_CHORD2 = chordFig(2.83)
export function buildDoc() {
  const slides = []

  // ── S1 · cover ───────────────────────────────────────────────────────────
  slides.push(slide('s1', BG, 'none',
    '开场:点动成线。封面让一个动点沿椭圆轨道匀速绕行,底下是标题与副题。讲的时候先问学生:这个点运动的轨迹是什么曲线?——这正是本课的主题。',
    [
      svgEl('ring', 616, 84, 568, 424, FIG_COVER),
      T('ct', 96, 118, 480, 220, '圆锥曲线的<br>动点问题', { fontSize: 78, fontWeight: 900, color: INK, lineHeight: 1.1 }),
      T('cs', 96, 356, 480, 50, '轨迹 · 最值 · 定值 —— 三类经典问题的统一解法', { fontSize: 21, fontWeight: 500, color: INK_SOFT }),
      R('cline', 96, 470, 92, 3, { fill: ACCENT, stroke: 'none', strokeWidth: 0, radius: 2 }),
      T('ck', 96, 492, 480, 26, '高中数学 · 解析几何专题复习', { fontSize: 15, fontWeight: 700, letterSpacing: 2.5, color: INK_DIM }),
      T('cp', 96, 668, 300, 22, '{{page:2}}', { fontSize: 13, fontWeight: 700, letterSpacing: 2, color: INK_DIM }),
    ]))

  // ── S2 · three problem types ─────────────────────────────────────────────
  const cards = [
    { n: '01', t: '轨迹问题', d: '求动点满足某种几何条件时的运动轨迹', f: '$$|PF_1|+|PF_2|=2a$$' },
    { n: '02', t: '最值与范围', d: '距离、面积、斜率在运动中何时最大、最小', f: '$$S_{\\max}=bc$$' },
    { n: '03', t: '定值与定点', d: '运动之中不变的量: 和为定值、过定点', f: '$$\\frac{1}{|AF|}+\\frac{1}{|BF|}=\\frac{2}{p}$$' },
  ]
  const el = [kick('三类经典问题'), title('动点问题,其实只有三类')]
  cards.forEach((c, i) => {
    const x = 96 + i * 374
    el.push(R('card' + i, x, 246, 340, 330, { fill: CARD, stroke: CARD_STROKE, strokeWidth: 1, radius: 24, fx: { enter: 'fade-up', order: 2 + i } }))
    el.push(T('cn' + i, x + 28, 276, 120, 62, c.n, { autoH: true, fontSize: 56, fontWeight: 900, color: ACCENT, fx: { enter: 'fade-up', order: 3 + i } }))
    el.push(T('ct' + i, x + 28, 348, 284, 44, c.t, { fontSize: 30, fontWeight: 800, fx: { enter: 'fade-up', order: 3 + i } }))
    el.push(R('csep' + i, x + 28, 404, 56, 3, { fill: 'rgba(76,201,240,0.7)', stroke: 'none', strokeWidth: 0, radius: 2, fx: { enter: 'fade', order: 4 + i } }))
    el.push(T('cd' + i, x + 28, 430, 284, 84, c.d, { fontSize: 17, color: INK_SOFT, lineHeight: 1.7, fx: { enter: 'fade-up', order: 4 + i } }))
    el.push(T('cf' + i, x + 28, 512, 284, 52, c.f, { fontSize: 19, color: AMBER, align: 'left', valign: 'top', fx: { enter: 'fade-up', order: 5 + i } }))
  })
  el.push(R('core', 96, 606, 1088, 62, { fill: ACCENT_SOFT, stroke: 'rgba(76,201,240,0.35)', strokeWidth: 1, radius: 16, fx: { enter: 'fade', order: 8 } }))
  el.push(T('coret', 136, 624, 1008, 30, '核心思想: 把 “动” 变成 “不变” —— 用定义、几何关系与代数等式锁住运动', { fontSize: 17, fontWeight: 600, color: ACCENT, align: 'center', fx: { enter: 'fade', order: 8 } }))
  slides.push(slide('s2', BG, 'none', '分类贯穿全课:轨迹是“找出路”,最值与范围是“看边界”,定值定点是“找不变量”。请学生先给三句话各配一个印象中的例子。', el))

  // ── S3 · knowledge table ─────────────────────────────────────────────────
  slides.push(slide('s3', BG, 'none',
    '知识铺垫:三种曲线的定义、标准方程与离心率。提醒:定义里的两个定点就是焦点;2a 与 |F₁F₂| 的大小关系决定曲线形状。', [
      kick('预备知识'), title('三种曲线的定义与方程'),
      {
        id: 'tbl', type: 'table', x: 96, y: 244, w: 1088, h: 380, rotation: 0, opacity: 1,
        header: true,
        columns: [{ w: 1 }, { w: 1.5 }, { w: 1.6 }, { w: 1.1 }],
        rows: [
          { cells: [{ html: '曲线' }, { html: '定义(几何特征)' }, { html: '标准方程' }, { html: '离心率' }] },
          { cells: [{ html: '<b>椭圆</b>' }, { html: '|PF₁| + |PF₂| = 2a, 2a > |F₁F₂|' }, { html: 'x²/a² + y²/b² = 1 (a>b>0)' }, { html: 'e = c/a < 1' }] },
          { cells: [{ html: '<b>双曲线</b>' }, { html: '| |PF₁| − |PF₂| | = 2a, 2a < |F₁F₂|' }, { html: 'x²/a² − y²/b² = 1 (a>0, b>0)' }, { html: 'e = c/a > 1' }] },
          { cells: [{ html: '<b>抛物线</b>' }, { html: '到定点与定直线距离相等' }, { html: 'y² = 2px (p>0)' }, { html: 'e = 1' }] },
        ],
        style: {
          headerBg: 'rgba(76,201,240,0.16)', headerColor: INK, zebra: 'rgba(255,255,255,0.03)',
          borderColor: 'rgba(233,238,248,0.14)', borderWidth: 1, cellPadX: 18, cellPadY: 15,
          fontSize: 17, color: INK, radius: 14,
        },
      },
      T('tnote', 96, 648, 1088, 30, '记忆锚点: 椭圆与双曲线是有心曲线(对称中心即原点); 抛物线的“心”在无穷远, 是一条无界开口', { fontSize: 15, color: INK_DIM, align: 'center' }),
    ]))

  // ── S4 · 定义法概念 ──────────────────────────────────────────────────────
  const orbitEls = [
    svgEl('fig4', 96, 210, 560, 430, FIG_DEF),
  ]
  slides.push(slide('s4', BG, 'none',
    '方法一·定义法:椭圆是“两段距离之和为常数”的点的全体。动点 P 在椭圆上, |PF₁|+|PF₂| 始终等于 2a —— 运动中被锁死的是和,不是位置。', [
      kick('01 轨迹问题 · 方法一'), title('定义是绳,动点是珠'),
      ...orbitEls,
      R('c1', 696, 210, 488, 196, { fill: CARD, stroke: CARD_STROKE, radius: 20, fx: { enter: 'fade-up', order: 2 } }),
      T('c1t', 724, 234, 432, 34, '椭圆的定义', { autoH: true, fontSize: 24, fontWeight: 800, fx: { enter: 'fade-up', order: 3 } }),
      T('c1f', 724, 282, 432, 84, '$$|PF_1|+|PF_2|=2a\\quad (2a>|F_1F_2|)$$', { fontSize: 24, color: ACCENT, valign: 'top', fx: { enter: 'fade-up', order: 4 } }),
      T('c1m', 724, 366, 432, 28, '两段距离之和恒定 —— 曲线由这个“和”唯一确定', { fontSize: 15, color: INK_SOFT, fx: { enter: 'fade', order: 5 } }),
      R('c2', 696, 426, 488, 214, { fill: CARD, stroke: CARD_STROKE, radius: 20, fx: { enter: 'fade-up', order: 6 } }),
      T('c2t', 724, 450, 432, 34, '为什么动点问题首选定义', { autoH: true, fontSize: 24, fontWeight: 800, fx: { enter: 'fade-up', order: 6 } }),
      T('c2b', 724, 498, 432, 130, '① 定义给出定量的几何关系, 直接写成方程<br>② 省去联立计算, 轨迹方程一步到位<br>③ 双曲线、抛物线同样适用(和→差、等距)', { fontSize: 17, color: INK_SOFT, lineHeight: 1.85, fx: { enter: 'fade-up', order: 7 } }),
    ]))

  // ── S5 · 例1 定义法求轨迹 ───────────────────────────────────────────────
  const ex1 = [
    svgEl('fig5', 96, 210, 560, 430, FIG_EX1),
  ]
  slides.push(slide('s5', BG, 'morph',
    '例1:把题目翻译成定义——动点到两定点距离之和为 10,大于焦点距离 8,所以轨迹是椭圆。a=5, c=4, b=3,方程立即写出。强调“先判断曲线类型再代数”。', [
      kick('01 轨迹问题 · 例题'), title('例 1 · 用定义直接翻译', { color: INK }),
      ...ex1,
      R('q1', 696, 210, 488, 132, { fill: 'rgba(249,199,79,0.08)', stroke: 'rgba(249,199,79,0.30)', radius: 18, fx: { enter: 'fade-up', order: 2 } }),
      T('q1t', 724, 232, 432, 30, '例题', { fontSize: 15, fontWeight: 700, letterSpacing: 2, color: AMBER, fx: { enter: 'fade-up', order: 3 } }),
      T('q1b', 724, 264, 432, 64, '已知 $F_1(-4,0)$、$F_2(4,0)$, 动点 $P$ 满足 $|PF_1|+|PF_2|=10$, 求 $P$ 的轨迹方程。', { fontSize: 17, color: INK, lineHeight: 1.6, fx: { enter: 'fade-up', order: 3 } }),
      R('a1', 696, 362, 488, 278, { fill: CARD, stroke: CARD_STROKE, radius: 20, fx: { enter: 'fade-up', order: 4 } }),
      T('a1t', 724, 386, 432, 34, '三步解题', { autoH: true, fontSize: 24, fontWeight: 800, fx: { enter: 'fade-up', order: 4 } }),
      T('a1b', 724, 434, 432, 140, '① $2a=10$ 且 $2a>|F_1F_2|=8$ → 轨迹为<b>椭圆</b><br>② $a=5$, $c=4$ → $b=\\sqrt{a^2-c^2}=3$<br>③ 焦点在 $x$ 轴, 椭圆方程为', { fontSize: 17, lineHeight: 1.9, fx: { enter: 'fade-up', order: 5 } }),
      T('a1f', 724, 566, 432, 62, '$$\\frac{x^2}{25}+\\frac{y^2}{9}=1$$', { fontSize: 24, color: ACCENT, align: 'center', fx: { enter: 'fade-up', order: 6 } }),
    ]))

  // ── S6 · 相关点法概念(圆) ───────────────────────────────────────────────
  const circEls = [
    svgEl('fig6', 96, 210, 560, 430, FIG_REL),
  ]
  slides.push(slide('s6', BG, 'morph',
    '方法二·相关点法:主动点 P 在已知曲线上运动,被动点 M 与 P 有确定的几何关系。P 是“傀儡”,M 是“木偶”——把 M 的坐标解出来代入 P 的方程即可。', [
      kick('01 轨迹问题 · 方法二'), title('相关点法:点在动,型不变'),
      ...circEls,
      R('c6', 696, 210, 488, 216, { fill: CARD, stroke: CARD_STROKE, radius: 20, fx: { enter: 'fade-up', order: 2 } }),
      T('c6t', 724, 234, 432, 34, '代入求解,三步走', { autoH: true, fontSize: 24, fontWeight: 800, fx: { enter: 'fade-up', order: 3 } }),
      T('c6b', 724, 282, 432, 130, '① 设被动点 $M(x,y)$, 主动点 $P(x_0,y_0)$<br>② 由几何关系解出 $x_0=f(x,y)$, $y_0=g(x,y)$<br>③ 代入 $P$ 所在的已知曲线方程', { fontSize: 17, color: INK_SOFT, lineHeight: 1.85, fx: { enter: 'fade-up', order: 4 } }),
      R('c6b2', 696, 446, 488, 194, { fill: 'rgba(76,201,240,0.10)', stroke: 'rgba(76,201,240,0.30)', radius: 20, fx: { enter: 'fade-up', order: 5 } }),
      T('c6bt', 724, 470, 432, 34, '标志: 求“中点、定比分点、对称点”的轨迹', { fontSize: 18, fontWeight: 700, color: ACCENT, fx: { enter: 'fade-up', order: 6 } }),
      T('c6bb', 724, 514, 432, 110, '图中: $P$ 沿 $x^2+y^2=16$ 运动, $M$ 是 $AP$ 中点。$M$ 的轨迹会是: <br><b>以 $O$、$A$ 中点 $(3,0)$ 为圆心、半径为 $2$ 的圆</b>', { fontSize: 17, color: INK, lineHeight: 1.85, fx: { enter: 'fade-up', order: 6 } }),
    ]))

  // ── S7 · 例2 相关点法 ───────────────────────────────────────────────────
  const ex2 = [
    svgEl('fig7', 96, 210, 560, 430, FIG_REL),
  ]
  slides.push(slide('s7', BG, 'morph',
    '例2:把上页的图译成题。设 M(x,y),则 P(2x−6, 2y);P 在圆上,代入即得 M 的轨迹圆。注意最后要说清圆心与半径,并检查定义域。', [
      kick('01 轨迹问题 · 例题'), title('例 2 · 中点轨迹:代入即得'),
      ...ex2,
      R('q2', 696, 210, 488, 132, { fill: 'rgba(249,199,79,0.08)', stroke: 'rgba(249,199,79,0.30)', radius: 18, fx: { enter: 'fade-up', order: 2 } }),
      T('q2t', 724, 232, 432, 30, '例题', { fontSize: 15, fontWeight: 700, letterSpacing: 2, color: AMBER, fx: { enter: 'fade-up', order: 3 } }),
      T('q2b', 724, 264, 432, 64, '已知圆 $C: x^2+y^2=16$, $A(6,0)$, $P$ 在圆上运动, $M$ 为 $AP$ 中点, 求 $M$ 轨迹。', { fontSize: 17, color: INK, lineHeight: 1.6, fx: { enter: 'fade-up', order: 3 } }),
      R('a2', 696, 362, 488, 278, { fill: CARD, stroke: CARD_STROKE, radius: 20, fx: { enter: 'fade-up', order: 4 } }),
      T('a2t', 724, 386, 432, 34, '解答', { autoH: true, fontSize: 24, fontWeight: 800, fx: { enter: 'fade-up', order: 4 } }),
      T('a2b', 724, 434, 432, 130, '① 设 $M(x,y)$, 则 $P(2x-6,\\ 2y)$<br>② $P$ 在圆上: $(2x-6)^2+(2y)^2=16$<br>③ 化简: $(x-3)^2+y^2=4$', { fontSize: 17, lineHeight: 1.9, fx: { enter: 'fade-up', order: 5 } }),
      T('a2f', 724, 566, 432, 62, '$$(x-3)^2+y^2=4$$', { fontSize: 24, color: ACCENT, align: 'center', fx: { enter: 'fade-up', order: 6 } }),
    ]))

  // ── S8 · 焦点三角形最值 ─────────────────────────────────────────────────
  const focEls = [
    svgEl('fig8', 96, 210, 560, 430, FIG_TRI),
  ]
  slides.push(slide('s8', BG, 'morph',
    '最值问题·焦点三角形:底边 |F₁F₂|=2c 固定,高 h=|y_P|≤b,所以面积 S=ch≤bc,当 P 在短轴端点时取等。这个结论在小题里秒杀。', [
      kick('02 最值与范围'), title('焦点三角形:面积何时最大'),
      ...focEls,
      R('c8', 696, 210, 488, 196, { fill: CARD, stroke: CARD_STROKE, radius: 20, fx: { enter: 'fade-up', order: 2 } }),
      T('c8t', 724, 234, 432, 34, '面积公式的两种写法', { autoH: true, fontSize: 24, fontWeight: 800, fx: { enter: 'fade-up', order: 3 } }),
      T('c8f', 724, 284, 432, 84, '$$S=\\frac12|F_1F_2|\\cdot h = c\\cdot|y_P|$$', { fontSize: 23, color: ACCENT, valign: 'top', fx: { enter: 'fade-up', order: 4 } }),
      T('c8f2', 724, 352, 432, 44, '或 $S=b^2\\tan\\frac{\\theta}{2}$, $\\theta=\\angle F_1PF_2$', { fontSize: 17, color: INK_SOFT, fx: { enter: 'fade', order: 5 } }),
      R('c8b', 696, 426, 488, 214, { fill: ACCENT_SOFT, stroke: 'rgba(76,201,240,0.35)', radius: 20, fx: { enter: 'fade-up', order: 6 } }),
      T('c8bt', 724, 452, 432, 40, '结论 · 椭圆焦点三角形', { fontSize: 24, fontWeight: 800, color: ACCENT, fx: { enter: 'fade-up', order: 6 } }),
      T('c8bb', 724, 498, 432, 128, '$S=c\\,|y_P|\\le bc$, 当且仅当 $P$ 位于<b>短轴端点</b>时取等<br>$|PF_1|\\cdot|PF_2|$ 最大值为 $a^2$ (同样在短轴端点)<br>双曲线对偶: $S=b^2\\cot\\frac{\\theta}{2}$', { fontSize: 17, color: INK, lineHeight: 1.95, fx: { enter: 'fade-up', order: 7 } }),
    ]))

  // ── S9 · 例3 焦点三角形面积最大值 ───────────────────────────────────────
  const ex3 = [
    svgEl('fig9', 96, 210, 560, 430, FIG_TRI2),
  ]
  slides.push(slide('s9', BG, 'morph',
    '例3:把结论用起来。椭圆 x²/25+y²/9=1 中 a=5,b=3,c=4。焦点三角形面积 S=c·|y_P| ≤ bc = 12,短轴端点取等。', [
      kick('02 最值与范围 · 例题'), title('例 3 · 焦点三角形面积最大值'),
      ...ex3,
      R('q3', 696, 210, 488, 132, { fill: 'rgba(249,199,79,0.08)', stroke: 'rgba(249,199,79,0.30)', radius: 18, fx: { enter: 'fade-up', order: 2 } }),
      T('q3t', 724, 232, 432, 30, '例题', { fontSize: 15, fontWeight: 700, letterSpacing: 2, color: AMBER, fx: { enter: 'fade-up', order: 3 } }),
      T('q3b', 724, 264, 432, 64, '椭圆 $\\frac{x^2}{25}+\\frac{y^2}{9}=1$ 上动点 $P$, 求 $\\triangle PF_1F_2$ 面积 $S$ 的最大值。', { fontSize: 17, color: INK, lineHeight: 1.6, fx: { enter: 'fade-up', order: 3 } }),
      R('a3', 696, 362, 488, 210, { fill: CARD, stroke: CARD_STROKE, radius: 20, fx: { enter: 'fade-up', order: 4 } }),
      T('a3t', 724, 386, 432, 34, '解答', { autoH: true, fontSize: 24, fontWeight: 800, fx: { enter: 'fade-up', order: 4 } }),
      T('a3b', 724, 434, 432, 96, '① $a=5$, $b=3$, $c=\\sqrt{25-9}=4$, $|F_1F_2|=8$<br>② $S=\\frac12\\cdot 8\\cdot |y_P|\\le 4\\cdot 3=12$<br>③ $P(0,\\pm 3)$ 时取等, $S_{\\max}=12$', { fontSize: 17, lineHeight: 1.9, fx: { enter: 'fade-up', order: 5 } }),
      T('a3f', 724, 530, 432, 40, '$S_{\\max}=12$', { autoH: true, fontSize: 30, fontWeight: 900, color: ACCENT, align: 'center', fx: { enter: 'fade-up', order: 6, countUp: true } }),
    ]))

  // ── S10 · 抛物线焦点弦定值 ───────────────────────────────────────────────
  const parEls = [
    svgEl('fig10', 96, 210, 560, 430, FIG_CHORD1),
  ]
  slides.push(slide('s10', BG, 'morph',
    '定值问题·抛物线焦点弦:设弦的倾斜角,或用 x=my+1 联立,总能得到 1/|AF|+1/|BF|=2/p=1——两段距离各自在变,和是常数。图表的水平线就是这个定值。', [
      kick('03 定值与定点'), title('焦点弦:两段距离,和是定值'),
      ...parEls,
      R('c10', 696, 210, 488, 148, { fill: CARD, stroke: CARD_STROKE, radius: 20, fx: { enter: 'fade-up', order: 2 } }),
      T('c10t', 724, 234, 432, 34, '抛物线 $y^2=4x$, $p=2$', { fontSize: 22, fontWeight: 800, fx: { enter: 'fade-up', order: 3 } }),
      T('c10f', 724, 282, 432, 64, '$$\\frac{1}{|AF|}+\\frac{1}{|BF|}=\\frac{2}{p}=1$$', { fontSize: 23, color: ACCENT, valign: 'top', fx: { enter: 'fade-up', order: 4 } }),
      {
        id: 'c10ch', type: 'chart', x: 696, y: 380, w: 488, h: 236, rotation: 0, opacity: 1,
        preset: 'line', option: {
          xAxis: { type: 'category', data: ['m=0', 'm=1', 'm=2', 'm=3'] },
          yAxis: { type: 'value', max: 1.2, axisLabel: { fontSize: 11, color: INK_SOFT } },
          legend: { show: true, top: 2, textStyle: { fontSize: 11, color: INK_SOFT } },
          grid: { left: 40, right: 14, top: 34, bottom: 22 },
          tooltip: { trigger: 'item' },
          series: [
            { name: '1/|AF|', type: 'line', smooth: true, data: [0.5, 0.146, 0.053, 0.026], lineStyle: { color: ACCENT, width: 2.5 }, itemStyle: { color: ACCENT } },
            { name: '1/|BF|', type: 'line', smooth: true, data: [0.5, 0.854, 0.947, 0.974], lineStyle: { color: AMBER, width: 2.5 }, itemStyle: { color: AMBER } },
            { name: '和', type: 'line', data: [1, 1, 1, 1], lineStyle: { color: '#fff', width: 2.5, type: 'dashed' }, itemStyle: { color: '#fff' } },
          ],
        },
        fx: { enter: 'fade-up', order: 5 },
      },
      T('c10m', 724, 622, 432, 26, '无论弦怎么转, 两段倒数之和恒等于 $\\frac{2}{p}$', { fontSize: 14.5, color: INK_SOFT, align: 'center', fx: { enter: 'fade', order: 6 } }),
    ]))

  // ── S11 · 例4 抛物线焦点弦 ───────────────────────────────────────────────
  const ex4 = [
    svgEl('fig11', 96, 210, 560, 430, FIG_CHORD2),
  ]
  slides.push(slide('s11', BG, 'morph',
    '例4:定值结论的逆用。1/|AF|+1/|BF|=1,给出 |AF|=3 立即解出 |BF|=3/2。这就是“记住结论,小题秒杀”的示范。', [
      kick('03 定值与定点 · 例题'), title('例 4 · 和是定值,求一段'),
      ...ex4,
      R('q4', 696, 210, 488, 132, { fill: 'rgba(249,199,79,0.08)', stroke: 'rgba(249,199,79,0.30)', radius: 18, fx: { enter: 'fade-up', order: 2 } }),
      T('q4t', 724, 232, 432, 30, '例题', { fontSize: 15, fontWeight: 700, letterSpacing: 2, color: AMBER, fx: { enter: 'fade-up', order: 3 } }),
      T('q4b', 724, 264, 432, 64, '过抛物线 $y^2=4x$ 焦点 $F$ 的直线交抛物线于 $A$、$B$ 两点, 若 $|AF|=3$, 求 $|BF|$。', { fontSize: 17, color: INK, lineHeight: 1.6, fx: { enter: 'fade-up', order: 3 } }),
      R('a4', 696, 362, 488, 210, { fill: CARD, stroke: CARD_STROKE, radius: 20, fx: { enter: 'fade-up', order: 4 } }),
      T('a4t', 724, 386, 432, 34, '解答', { autoH: true, fontSize: 24, fontWeight: 800, fx: { enter: 'fade-up', order: 4 } }),
      T('a4b', 724, 434, 432, 96, '① 由 $\\frac{1}{|AF|}+\\frac{1}{|BF|}=\\frac{2}{p}=1$<br>② $\\frac{1}{3}+\\frac{1}{|BF|}=1$ 解得 $|BF|=\\frac{3}{2}$<br>③ 验证: $|AF|=3$, $|BF|=1.5$ 均过焦点 $F$', { autoH: true, fontSize: 17, lineHeight: 1.9, fx: { enter: 'fade-up', order: 5 } }),
      T('a4f', 724, 530, 432, 40, '$|BF|=\\frac{3}{2}$', { autoH: true, fontSize: 28, fontWeight: 900, color: ACCENT, align: 'center', fx: { enter: 'fade-up', order: 6 } }),
    ]))

  // ── S12 · 总结 ───────────────────────────────────────────────────────────
  const steps = [
    { n: '①', t: '选代表元', d: '设动点 $P(x,y)$, 或引入参数 $\\theta$、斜率 $k$ 表示位置' },
    { n: '②', t: '翻译条件', d: '定义 / 距离 / 斜率 / 中点 → 化为方程或函数关系' },
    { n: '③', t: '收官定型', d: '化简求解, 讨论范围、最值、定值, 别忘了检验完备性' },
  ]
  const el12 = [kick('方法总结'), title('动点的三张处方')]
  steps.forEach((st, i) => {
    const x = 96 + i * 374
    el12.push(R('s' + i, x, 250, 340, 300, { fill: CARD, stroke: CARD_STROKE, radius: 24, fx: { enter: 'fade-up', order: 2 + i } }))
    el12.push(T('sn' + i, x + 28, 282, 120, 54, st.n, { autoH: true, fontSize: 44, fontWeight: 900, color: ACCENT, fx: { enter: 'fade-up', order: 3 + i } }))
    el12.push(T('st' + i, x + 28, 346, 284, 40, st.t, { autoH: true, fontSize: 28, fontWeight: 800, fx: { enter: 'fade-up', order: 3 + i } }))
    el12.push(T('sd' + i, x + 28, 402, 284, 108, st.d, { fontSize: 16.5, color: INK_SOFT, lineHeight: 1.75, fx: { enter: 'fade-up', order: 4 + i } }))
  })
  el12.push(R('sum', 96, 580, 1088, 66, { fill: ACCENT_SOFT, stroke: 'rgba(76,201,240,0.35)', radius: 16, fx: { enter: 'fade', order: 8 } }))
  el12.push(T('sumt', 136, 598, 1008, 32, '一句话: 动点问题的本质, 是在约束之中看清那些“不变”的东西', { fontSize: 18, fontWeight: 600, color: ACCENT, align: 'center', fx: { enter: 'fade', order: 8 } }))
  slides.push(slide('s12', BG, 'none', '收束全课:三张处方对应三大题型。讲完可以让学生把今天的三道例题“对号入座”,检验是否掌握了分类。', el12))

  // ── S13 · 结尾 ───────────────────────────────────────────────────────────
  slides.push(slide('s13', BG, 'none',
    '结束页:一句结语 + 课后思考题。|PF₁|·|PF₂| 在 P 位于短轴端点时取最大值 a²(用均值不等式 + 前面结论即可推出)。', [
      svgEl('ring13', 616, 84, 568, 424, FIG_COVER),
      T('e1', 96, 150, 620, 180, '让运动停下来,<br>让轨迹显出来', { fontSize: 64, fontWeight: 900, color: INK, lineHeight: 1.14 }),
      T('e2', 96, 344, 620, 60, '谢谢观看 · 课后思考', { fontSize: 17, fontWeight: 700, letterSpacing: 3, color: ACCENT }),
      R('hw', 96, 400, 620, 170, { fill: CARD, stroke: CARD_STROKE, radius: 20 }),
      T('hwt', 124, 428, 564, 40, '思考题', { fontSize: 21, fontWeight: 800, color: AMBER }),
      T('hwb', 124, 472, 564, 84, '椭圆 $\\frac{x^2}{25}+\\frac{y^2}{9}=1$ 上动点 $P$, 求 $|PF_1|\\cdot|PF_2|$ 的最大值。<br><i>提示: 与焦点三角形面积结论联动, 或令 $m=|PF_1|+|PF_2|=10$ 后用均值不等式。</i>', { autoH: true, fontSize: 16.5, color: INK, lineHeight: 1.8 }),
      T('e3', 96, 600, 620, 30, '高中数学 · 解析几何  |  动点 · 轨迹 · 最值 · 定值', { fontSize: 14, color: INK_DIM }),
    ]))

  return resolveAutoHeights({
    format: 'bento/slides',
    version: 1,
    title: '圆锥曲线的动点问题',
    meta: { subject: '高中数学 · 解析几何专题', keywords: '椭圆,双曲线,抛物线,动点,轨迹,定值,最值' },
    size: { width: 1280, height: 720 },
    theme: { background: BG, color: INK, accent: ACCENT, fontFamily: FONT },
    slides,
  })
}

export function docJson() {
  const j = JSON.stringify(buildDoc())
  return j.replace(/</g, '\\u003c')
}

export function embed(htmlTarget) {
  const shell = readFileSync(htmlTarget, 'utf8')
  const json = docJson()
  const open = '<script type="application/bento+json" id="bento-doc">'
  const close = '</script>'
  const i = shell.indexOf(open)
  if (i < 0) throw new Error('bento-doc block not found in ' + htmlTarget)
  const j = shell.indexOf(close, i)
  if (j < 0) throw new Error('bento-doc close tag not found')
  const next = shell.slice(0, i + open.length) + '\n' + json + '\n' + shell.slice(j)
  writeFileSync(htmlTarget, next, 'utf8')
  console.log('embedded doc (' + json.length + ' bytes JSON) into ' + htmlTarget)
}

if (process.argv[1]?.endsWith('build-deck.mjs')) {
  const embedFlag = process.argv.includes('--embed')
  if (embedFlag) {
    embed(join(ROOT, 'conic-moving-point.bento.html'))
  } else {
    mkdirSync(join(ROOT, 'tools'), { recursive: true })
    writeFileSync(join(ROOT, 'tools', 'deck.json'), docJson(), 'utf8')
    const doc = JSON.parse(docJson().replace(/\\u003c/g, '<'))
    console.log('slides:', doc.slides.length, '| elements:', doc.slides.reduce((a, s) => a + s.elements.length, 0))
    for (const s of doc.slides) {
      const ids = s.elements.map((e) => e.id)
      const dup = ids.filter((v, k) => ids.indexOf(v) !== k)
      if (dup.length) console.log('!! dup ids in', s.id, dup)
    }
    console.log('deck.json written')
  }
}
