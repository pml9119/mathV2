// 几何画板对象模型 + 约束
export interface Point {
  id: string;
  kind: 'free' | 'locked' | 'constraint';
  x: number;
  y: number;
  constraints: Constraint[];
}

export type GeoObject =
  | { id: string; type: 'segment'; from: string; to: string }
  | { id: string; type: 'line'; through: [string, string] }
  | { id: string; type: 'circle'; center: string; radiusPoint?: string; radius?: number }
  | { id: string; type: 'polygon'; verts: string[] };

export type Constraint =
  | { type: 'onLine'; lineId: string }
  | { type: 'onCircle'; circleId: string }
  | { type: 'midpoint'; aId: string; bId: string }
  | { type: 'fixedX'; x: number }
  | { type: 'fixedY'; y: number };

export interface GeoContext {
  points: Record<string, Point>;
  objects: GeoObject[];
}

export function createPoint(id: string, x: number, y: number, constraints: Constraint[] = []): Point {
  return { id, kind: constraints.length ? 'constraint' : 'free', x, y, constraints };
}

export function addPoint(ctx: GeoContext, p: Point) {
  ctx.points[p.id] = p;
}

/** 解析对象依赖：给定约束引用，求目标坐标（直线/圆/中点）。 */
export function resolveRef(ctx: GeoContext, c: Constraint, p: Point): [number, number] {
  switch (c.type) {
    case 'onLine': {
      const obj = ctx.objects.find((o) => o.id === c.lineId);
      if (obj && (obj.type === 'segment' || obj.type === 'line')) {
        const aId = obj.type === 'segment' ? obj.from : obj.through[0];
        const bId = obj.type === 'segment' ? obj.to : obj.through[1];
        const a = ctx.points[aId];
        const b = ctx.points[bId];
        if (!a || !b) return [p.x, p.y];
        return projectOntoLine(p, a, b);
      }
      return [p.x, p.y];
    }
    case 'onCircle': {
      const obj = ctx.objects.find((o) => o.id === c.circleId);
      if (obj && obj.type === 'circle') {
        const center = ctx.points[obj.center];
        if (!center) return [p.x, p.y];
        const r = obj.radiusPoint ? dist(center, ctx.points[obj.radiusPoint]) : (obj.radius ?? 1);
        return projectOntoCircle(p, center, r);
      }
      return [p.x, p.y];
    }
    case 'midpoint': {
      const a = ctx.points[c.aId];
      const b = ctx.points[c.bId];
      if (!a || !b) return [p.x, p.y];
      return [(a.x + b.x) / 2, (a.y + b.y) / 2];
    }
    case 'fixedX': return [c.x, p.y];
    case 'fixedY': return [p.x, c.y];
    default: return [p.x, p.y];
  }
}

// ===== 解析投影 =====
export function projectOntoLine(p: Point, a: Point, b: Point): [number, number] {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return [a.x, a.y];
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  return [a.x + t * dx, a.y + t * dy];
}

export function projectOntoCircle(p: Point, center: Point, r: number): [number, number] {
  const dx = p.x - center.x, dy = p.y - center.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d === 0) return [center.x + r, center.y];
  return [center.x + (dx / d) * r, center.y + (dy / d) * r];
}

export function dist(a: Point | { x: number; y: number } | undefined, b: Point | { x: number; y: number } | undefined): number {
  if (!a || !b) return NaN;
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
