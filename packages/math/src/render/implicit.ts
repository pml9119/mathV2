// 隐式曲线 SVG 渲染
import type { Viewport } from '../coord/viewport.js';
import { worldToScreen, niceTicks } from '../coord/viewport.js';
import type { ImplicitSegments } from '../plot/implicit.js';

export function renderImplicitSVG(
  vp: Viewport,
  data: ImplicitSegments,
  w: number,
  h: number,
  style: { curveColor?: string; gridColor?: string; axisColor?: string; labelColor?: string; bg?: string } = {}
): string {
  const curveColor = style.curveColor ?? '#3b6ef6';
  const gridColor = style.gridColor ?? '#f0f2f8';
  const axisColor = style.axisColor ?? '#a8b0c0';
  const labelColor = style.labelColor ?? '#8a90a0';
  const bg = style.bg ?? 'transparent';

  let g = '<rect width="' + w + '" height="' + h + '" fill="' + bg + '"/>';

  const { major: xTicks } = niceTicks(vp.xMin, vp.xMax, 10);
  const { major: yTicks } = niceTicks(vp.yMin, vp.yMax, 8);
  for (const tk of xTicks) {
    const [sx] = worldToScreen(vp, w, h, tk.value, 0);
    g += '<line x1="' + sx + '" y1="0" x2="' + sx + '" y2="' + h + '" stroke="' + gridColor + '"/>';
  }
  for (const tk of yTicks) {
    const [, sy] = worldToScreen(vp, w, h, 0, tk.value);
    g += '<line x1="0" y1="' + sy + '" x2="' + w + '" y2="' + sy + '" stroke="' + gridColor + '"/>';
  }

  const [ox, oy] = worldToScreen(vp, w, h, 0, 0);
  if (oy >= 0 && oy <= h) g += '<line x1="0" y1="' + oy + '" x2="' + w + '" y2="' + oy + '" stroke="' + axisColor + '"/>';
  if (ox >= 0 && ox <= w) g += '<line x1="' + ox + '" y1="' + h + '" x2="' + ox + '" y2="0" stroke="' + axisColor + '"/>';

  // 曲线线段
  for (const [x0, y0, x1, y1] of data.segments) {
    g += '<line x1="' + x0.toFixed(1) + '" y1="' + y0.toFixed(1) + '" x2="' + x1.toFixed(1) + '" y2="' + y1.toFixed(1) + '" stroke="' + curveColor + '" stroke-width="2"/>';
  }

  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="100%">' + g + '</svg>';
}
