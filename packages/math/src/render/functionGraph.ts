// functionGraph 渲染：坐标系 + 网格 + 轴 + 曲线（SVG）
import type { Viewport } from '../coord/viewport.js';
import { worldToScreen, niceTicks } from '../coord/viewport.js';
import type { Segment } from '../plot/sampler.js';

export interface FunctionGraphStyle {
  curveColor?: string;
  curveWidth?: number;
  gridColor?: string;
  axisColor?: string;
  labelColor?: string;
  bg?: string;
}

export function renderFunctionGraphSVG(
  vp: Viewport,
  segments: Segment[],
  w: number,
  h: number,
  style: FunctionGraphStyle = {}
): string {
  const curveColor = style.curveColor ?? '#3b6ef6';
  const curveWidth = style.curveWidth ?? 2.2;
  const gridColor = style.gridColor ?? '#f0f2f8';
  const axisColor = style.axisColor ?? '#a8b0c0';
  const labelColor = style.labelColor ?? '#8a90a0';
  const bg = style.bg ?? 'transparent';

  let g = '<rect width="' + w + '" height="' + h + '" fill="' + bg + '"/>';

  // 网格
  const { major: xTicks } = niceTicks(vp.xMin, vp.xMax, 10);
  const { major: yTicks } = niceTicks(vp.yMin, vp.yMax, 8);
  for (const t of xTicks) {
    const [sx] = worldToScreen(vp, w, h, t.value, 0);
    g += '<line x1="' + sx + '" y1="0" x2="' + sx + '" y2="' + h + '" stroke="' + gridColor + '"/>';
  }
  for (const t of yTicks) {
    const [, sy] = worldToScreen(vp, w, h, 0, t.value);
    g += '<line x1="0" y1="' + sy + '" x2="' + w + '" y2="' + sy + '" stroke="' + gridColor + '"/>';
  }

  // 坐标轴
  const [ox, oy] = worldToScreen(vp, w, h, 0, 0);
  const oyIn = oy >= 0 && oy <= h;
  const oxIn = ox >= 0 && ox <= w;
  if (oyIn) g += '<line x1="0" y1="' + oy + '" x2="' + w + '" y2="' + oy + '" stroke="' + axisColor + '" stroke-width="1.2"/>';
  if (oxIn) g += '<line x1="' + ox + '" y1="' + h + '" x2="' + ox + '" y2="0" stroke="' + axisColor + '" stroke-width="1.2"/>';

  // 刻度标签
  for (const t of xTicks) {
    if (t.value === 0) continue;
    const [sx] = worldToScreen(vp, w, h, t.value, 0);
    if (sx < 0 || sx > w) continue;
    g += '<text x="' + sx + '" y="' + Math.min(oy + 14, h - 6) + '" font-size="8" fill="' + labelColor + '" text-anchor="middle">' + t.label + '</text>';
  }
  for (const t of yTicks) {
    if (t.value === 0) continue;
    const [, sy] = worldToScreen(vp, w, h, 0, t.value);
    if (sy < 0 || sy > h) continue;
    g += '<text x="' + Math.min(Math.max(ox - 4, 4), w - 12) + '" y="' + (sy + 3) + '" font-size="8" fill="' + labelColor + '" text-anchor="end">' + t.label + '</text>';
  }

  // 曲线（分段 polyline）
  for (const seg of segments) {
    const pts = seg.points.map(([wx, wy]) => {
      const [sx, sy] = worldToScreen(vp, w, h, wx, wy);
      return sx.toFixed(1) + ',' + sy.toFixed(1);
    }).join(' ');
    g += '<polyline points="' + pts + '" fill="none" stroke="' + curveColor + '" stroke-width="' + curveWidth + '" stroke-linejoin="round"/>';
  }

  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="100%">' + g + '</svg>';
}
