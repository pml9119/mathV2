// geoBoard 渲染：几何对象 → SVG（点/线段/圆/多边形 + 测量文字）
import type { GeoContext, Point } from '../geo/model.js';
import { worldToScreen } from '../coord/viewport.js';
import type { Viewport } from '../coord/viewport.js';
import { measure, formatMeasure, type MeasureSpec } from '../geo/measure.js';

export interface GeoBoardStyle {
  pointColor?: string;
  objColor?: string;
  measureColor?: string;
  bg?: string;
}

export function renderGeoBoardSVG(
  ctx: GeoContext,
  vp: Viewport,
  measures: MeasureSpec[],
  w: number,
  h: number,
  style: GeoBoardStyle = {}
): string {
  const pointColor = style.pointColor ?? '#e0457b';
  const objColor = style.objColor ?? '#3b6ef6';
  const measureColor = style.measureColor ?? '#0f4c81';
  const bg = style.bg ?? 'transparent';

  const toS = (p: Point): [number, number] => worldToScreen(vp, w, h, p.x, p.y);

  let g = '<rect width="' + w + '" height="' + h + '" fill="' + bg + '"/>';

  // 网格（轻量）
  const gridColor = '#f0f2f8';
  // (简化用坐标轴主要刻度线，与函数图一致可复用 niceTicks —— 这里轻量画几条)

  // 对象（线段/线/圆/多边形），面在前线后，点多线段
  for (const obj of ctx.objects) {
    switch (obj.type) {
      case 'segment': {
        const a = ctx.points[obj.from], b = ctx.points[obj.to];
        if (!a || !b) break;
        const [ax, ay] = toS(a), [bx, by] = toS(b);
        g += '<line x1="' + ax + '" y1="' + ay + '" x2="' + bx + '" y2="' + by + '" stroke="' + objColor + '" stroke-width="2"/>';
        break;
      }
      case 'line': {
        const a = ctx.points[obj.through[0]], b = ctx.points[obj.through[1]];
        if (!a || !b) break;
        // 延伸到视口边界
        const v1 = toS(a)[0], v2 = toS(b)[0];
        // 屏幕空间算斜率
        const [ax, ay] = toS(a), [bx, by] = toS(b);
        const dx = bx - ax, dy = by - ay;
        if (Math.abs(dx) < 1e-9) {
          g += '<line x1="' + ax + '" y1="0" x2="' + ax + '" y2="' + h + '" stroke="' + objColor + '" stroke-width="1.5"/>';
        } else {
          const slope = dy / dx;
          const x0 = 0, x1 = w;
          const y0 = ay - ax * slope, y1 = ay + (x1 - ax) * slope;
          g += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y1 + '" stroke="' + objColor + '" stroke-width="1.5"/>';
        }
        break;
      }
      case 'circle': {
        const c = ctx.points[obj.center];
        if (!c) break;
        const r = obj.radiusPoint ? dist2(ctx.points[obj.radiusPoint], c) : (obj.radius ?? 1);
        const [cx, cy] = toS(c);
        const [rx, ry] = toS({ x: c.x + r, y: c.y } as Point);
        const rpx = Math.abs(rx - cx);
        g += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rpx + '" fill="none" stroke="' + objColor + '" stroke-width="1.5" stroke-dasharray="4 3"/>';
        break;
      }
      case 'polygon': {
        const pts = obj.verts.map((id) => ctx.points[id]).filter(Boolean);
        if (pts.length < 3) break;
        const spts = pts.map((p) => toS(p));
        const pointsAttr = spts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
        g += '<polygon points="' + pointsAttr + '" fill="rgba(59,110,246,.1)" stroke="' + objColor + '" stroke-width="1.8"/>';
        break;
      }
    }
  }

  // 点（最后画，在最上层）
  for (const pid of Object.keys(ctx.points)) {
    const p = ctx.points[pid];
    const [px, py] = toS(p);
    const fill = p.kind === 'locked' ? '#8a90a0' : (p.constraints.length ? '#38c98a' : pointColor);
    g += '<circle cx="' + px + '" cy="' + py + '" r="4.5" fill="' + fill + '" stroke="#fff" stroke-width="1.4"/>';
    g += '<text x="' + (px + 7) + '" y="' + (py - 7) + '" font-size="12" fill="' + measureColor + '">' + p.id + '</text>';
  }

  // 测量文字（放置在视口顶部）
  let measureRow = '';
  for (const m of measures) {
    const v = measure(ctx, m);
    measureRow += m.label + ': ' + formatMeasure(v, m) + '　';
  }
  if (measureRow) {
    g += '<text x="10" y="18" font-size="13" font-family="monospace" fill="' + measureColor + '">' + measureRow.trim() + '</text>';
  }

  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="100%">' + g + '</svg>';
}

function dist2(a: Point | undefined, b: Point): number {
  if (!a) return 1;
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
