// 测量：长度/角度/面积/斜率
import type { GeoContext } from './model.js';
import { dist } from './model.js';

export interface MeasureSpec {
  id: string;
  type: 'length' | 'angle' | 'area' | 'slope';
  // length/slope: [aId, bId]; angle: [aId, vertexId, bId]; area: polygon
  refs: string[];
  label?: string;
}

export function measure(ctx: GeoContext, spec: MeasureSpec): number {
  const pts = spec.refs.map((id) => ctx.points[id]);
  if (pts.some((p) => !p)) return NaN;

  switch (spec.type) {
    case 'length':
      return dist(pts[0], pts[1]);
    case 'angle': {
      // 角度 at pts[1]（顶点），边 pts[0]→pts[1], pts[1]→pts[2]
      const [a, v, b] = pts;
      const v1 = [a.x - v.x, a.y - v.y];
      const v2 = [b.x - v.x, b.y - v.y];
      const dot = v1[0] * v2[0] + v1[1] * v2[1];
      const m1 = Math.hypot(v1[0], v1[1]);
      const m2 = Math.hypot(v2[0], v2[1]);
      if (m1 === 0 || m2 === 0) return NaN;
      return Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * 180 / Math.PI;
    }
    case 'area': {
      // 鞋带公式（polygon refs 是顶点 id 列表）
      let area = 0;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
      }
      return Math.abs(area) / 2;
    }
    case 'slope': {
      const [a, b] = pts;
      if (a.x === b.x) return NaN; // 垂直
      return (b.y - a.y) / (b.x - a.x);
    }
    default:
      return NaN;
  }
}

/** 格式化测量值（带单位/符号）。 */
export function formatMeasure(v: number, spec: MeasureSpec): string {
  if (Number.isNaN(v)) return '—';
  const decimals = spec.type === 'angle' ? 1 : 2;
  const unit = spec.type === 'angle' ? '°' : '';
  return v.toFixed(decimals) + unit;
}
