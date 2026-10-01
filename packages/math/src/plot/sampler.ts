// 自适应采样：细分 + 断点检测（tan/对数/渐近线正确分段）
import type { CompiledFn } from '../expr/index.js';

export interface Segment {
  points: [number, number][];  // 世界坐标连续点列
}

/**
 * 自适应采样 f 在 [xMin, xMax] 上。
 * 步骤：
 *  1. 粗采样 N0 点（值域 yMin..yMax 裁剪 + NaN 标记）
 *  2. 对每对相邻点：若两端都有效且符合"跳变检测"→ 细分（中点插值误差大则二分）
 *  3. 断开：NaN/Inf、|f|>clip、相邻值跨 yMin...yMax 大跳变（渐近线）
 */
export function sampleAdaptive(
  f: CompiledFn,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  opts: { epsAbs?: number; maxDepth?: number; maxPoints?: number } = {}
): Segment[] {
  const epsAbs = opts.epsAbs ?? ((xMax - xMin) * 1e-4);
  const maxDepth = opts.maxDepth ?? 14;
  const maxPoints = opts.maxPoints ?? 6000;

  const N0 = 120;
  const range = xMax - xMin;

  const raw: [number, number][] = [];  // [x, y]（y 可能 NaN/Inf）
  const clippedUp = yMax + Math.abs(yMax - yMin) * 4;   // 视口上方 clip
  const clippedDown = yMin - Math.abs(yMax - yMin) * 4;

  for (let i = 0; i <= N0; i++) {
    const x = xMin + (i / N0) * range;
    let y = f({ x });
    if (Number.isNaN(y)) y = Number.NaN;
    if (!Number.isFinite(y)) y = Math.sign(y) * Infinity; // 保留符号
    raw.push([x, y]);
  }

  const segments: Segment[] = [];
  let buf: [number, number][] = [];

  // 判定"渐近线断开"：相邻两点 y 符号相反 且 至少一端 |y| > (yMax-yMin)*20
  const isAsymptote = (a: number, b: number): boolean => {
    if (Number.isNaN(a) || Number.isNaN(b)) return true;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return true;
    const rangeY = Math.abs(yMax - yMin);
    const signOpp = (a > 0 && b < 0) || (a < 0 && b > 0);
    // 异号且至少一端超出视口（渐近线特征：tan 从 +∞ 变 -∞）
    const aOut = a > yMax + rangeY || a < yMin - rangeY;
    const bOut = b > yMax + rangeY || b < yMin - rangeY;
    return signOpp && (aOut || bOut);
  };

  const flush = () => { if (buf.length >= 2) segments.push({ points: buf }); buf = []; };

  const push = (x: number, y: number) => {
    if (Number.isNaN(y) || !Number.isFinite(y)) { flush(); return; }
    if (y > clippedUp) y = clippedUp;  // clip 到视口附近（画线用）
    if (y < clippedDown) y = clippedDown;
    buf.push([x, y]);
  };

  // 细分：对线段 (x1,y1)-(x2,y2)，若中点误差大则递归
  const refine = (x1: number, y1: number, x2: number, y2: number, depth: number) => {
    if (depth > maxDepth) { push(x1, y1); return; }
    const yl = (y1 + y2) / 2;
    const xm = (x1 + x2) / 2;
    const ym = f({ x: xm });
    if (Number.isNaN(ym)) { flush(); return; }
    if (!Number.isFinite(ym)) { flush(); return; }
    const span = Math.max(1, Math.abs(y1), Math.abs(y2));
    const err = Math.abs(ym - yl);
    const needRefine = err > Math.max(epsAbs * 100, epsAbs * span) && depth < maxDepth;
    if (needRefine) {
      refine(x1, y1, xm, ym, depth + 1);
      refine(xm, ym, x2, y2, depth + 1);
    } else {
      push(x1, y1);
    }
  };

  for (let i = 0; i < raw.length - 1; i++) {
    const [x1, y1] = raw[i];
    const [x2, y2] = raw[i + 1];
    // 断开判定
    if (isAsymptote(y1, y2)) {
      flush();
      continue;
    }
    if (Number.isNaN(y1) || Number.isNaN(y2)) { flush(); continue; }
    if (!Number.isFinite(y1) || !Number.isFinite(y2)) { flush(); continue; }
    refine(x1, y1, x2, y2, 0);
  }
  // 最后一个点
  const last = raw[raw.length - 1];
  if (Number.isFinite(last[1])) push(last[0], last[1]);
  flush();

  return segments.filter((s) => s.points.length >= 2);
}

export function countPoints(segments: Segment[]): number {
  return segments.reduce((s, seg) => s + seg.points.length, 0);
}
