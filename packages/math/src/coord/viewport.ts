// 坐标系视图：world ↔ screen 映射、缩放/平移、nice-ticks
export interface Viewport {
  xMin: number; xMax: number; yMin: number; yMax: number;
}

/** 世界坐标 → 屏幕坐标（SVG, y 向下）。 */
export function worldToScreen(vp: Viewport, w: number, h: number, x: number, y: number): [number, number] {
  const sx = ((x - vp.xMin) / (vp.xMax - vp.xMin)) * w;
  const sy = h - ((y - vp.yMin) / (vp.yMax - vp.yMin)) * h;
  return [sx, sy];
}

/** 屏幕坐标 → 世界坐标（鼠标命中/拖拽）。 */
export function screenToWorld(vp: Viewport, w: number, h: number, sx: number, sy: number): [number, number] {
  const x = vp.xMin + (sx / w) * (vp.xMax - vp.xMin);
  const y = vp.yMin + (1 - sy / h) * (vp.yMax - vp.yMin);
  return [x, y];
}

/** 以光标为锚缩放（滚轮）。factor>1 放大。 */
export function zoomAt(vp: Viewport, w: number, h: number, sx: number, sy: number, factor: number): Viewport {
  const [wx, wy] = screenToWorld(vp, w, h, sx, sy);
  const xMin = wx - (wx - vp.xMin) * factor;
  const xMax = wx + (vp.xMax - wx) * factor;
  const yMin = wy - (wy - vp.yMin) * factor;
  const yMax = wy + (vp.yMax - wy) * factor;
  return { xMin, xMax, yMin, yMax };
}

/** 平移。 */
export function pan(vp: Viewport, dxWorld: number, dyWorld: number): Viewport {
  return { xMin: vp.xMin - dxWorld, xMax: vp.xMax - dxWorld, yMin: vp.yMin - dyWorld, yMax: vp.yMax - dyWorld };
}

export interface Tick {
  value: number;
  label: string;
  major: boolean;
}

/**
 * nice-ticks：生成刻度（1/2/5 × 10^k 步长）。
 */
export function niceTicks(min: number, max: number, targetCount = 8): { major: Tick[]; minor: number[] } {
  const range = max - min;
  if (!(range > 0)) return { major: [], minor: [] };

  const rawStep = range / targetCount;
  const pow = Math.floor(Math.log10(rawStep));
  const base = rawStep / Math.pow(10, pow);
  let step: number;
  if (base <= 1) step = 1;
  else if (base <= 2) step = 2;
  else if (base <= 5) step = 5;
  else step = 10;
  step *= Math.pow(10, pow);

  const major: Tick[] = [];
  const minor: number[] = [];

  const start = Math.ceil(min / step) * step;
  for (let v = start; v <= max + 1e-9; v += step) {
    major.push({ value: v, label: formatTick(v, step), major: true });
  }
  const minorStep = step / 5;
  const minorStart = Math.ceil(min / minorStep) * minorStep;
  for (let v = minorStart; v <= max + 1e-9; v += minorStep) {
    const nearMajor = major.some((m) => Math.abs(m.value - v) < step * 1e-6);
    if (!nearMajor) minor.push(v);
  }
  return { major, minor };
}

function formatTick(v: number, step: number): string {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  if (Math.abs(v) >= 10000 || Math.abs(v) < 0.001) return v.toExponential(1);
  return v.toFixed(Math.min(decimals, 6));
}
