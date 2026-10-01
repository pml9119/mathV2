// 约束求解：拖点时级联迭代投影
import type { GeoContext, Point, Constraint } from './model.js';
import { resolveRef } from './model.js';

/**
 * 拖动 point P 到目标位置 target，应用约束迭代投影。
 * 返回更新后的坐标（直接修改 P）。
 */
export function dragWithConstraints(ctx: GeoContext, p: Point, tx: number, ty: number, maxIter = 8): void {
  // 锁定点不可拖
  if (p.kind === 'locked') return;
  // 自由点：直接移动
  if (p.kind === 'free' || p.constraints.length === 0) {
    p.x = tx; p.y = ty;
    return;
  }
  // 约束点：迭代投影
  let cx = tx, cy = ty;
  for (let iter = 0; iter < maxIter; iter++) {
    let moved = false;
    for (const c of p.constraints) {
      const [nx, ny] = resolveRef(ctx, c, { x: cx, y: cy } as Point);
      if (Math.abs(nx - cx) > 1e-9 || Math.abs(ny - cy) > 1e-9) moved = true;
      cx = nx; cy = ny;
    }
    // 收敛判断
    if (!moved) break;
  }
  p.x = cx; p.y = cy;
}

/**
 * 级联传播：拖 P 后，所有依赖 P 的点（midpoint/约束引用）也要重算。
 * 简化：对有约束的点做一次全量收敛（dirty 集合，2 轮）。
 */
export function propagate(ctx: GeoContext, changedId: string): void {
  // 找所有约束组
  for (const pid of Object.keys(ctx.points)) {
    const p = ctx.points[pid];
    if (p.id === changedId) continue;
    if (p.constraints.length === 0) continue;
    // 若该点约束引用了 changedId（midpoint a/b 或 onLine 的 via 点等）
    const refsChanged = p.constraints.some((c) => {
      if (c.type === 'midpoint') return c.aId === changedId || c.bId === changedId;
      if (c.type === 'onLine') {
        const obj = ctx.objects.find((o) => o.id === c.lineId);
        if (obj && (obj.type === 'segment' || obj.type === 'line')) {
          const ids = obj.type === 'segment' ? [obj.from, obj.to] : obj.through;
          return ids.includes(changedId);
        }
      }
      if (c.type === 'onCircle') {
        const obj = ctx.objects.find((o) => o.id === c.circleId);
        return obj && obj.type === 'circle' && (obj.center === changedId || obj.radiusPoint === changedId);
      }
      return false;
    });
    if (refsChanged) {
      dragWithConstraints(ctx, p, p.x, p.y);
    }
  }
}
