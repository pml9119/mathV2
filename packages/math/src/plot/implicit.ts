// 隐式曲线 F(x,y)=0：Marching Squares（简化 marching lines）
import type { Viewport } from '../coord/viewport.js';
import { worldToScreen } from '../coord/viewport.js';

export interface ImplicitSegments {
  /** 屏幕坐标的线段集合（每段两个端点 [x0,y0,x1,y1]） */
  segments: [number, number, number, number][];
}

/**
 * 在视口上采样网格，对每个网格单元检查 F 符号变化，
 * 跨零的边线性插值求交点，单元内恰好 2 个交点连成一条线段。
 * 
 * 双曲线两支之间是"负"区域（无跨零边）→ 自动分离。
 */
export function plotImplicit(
  F: (x: number, y: number) => number,
  vp: Viewport,
  w: number,
  h: number,
  stepPx = 4
): ImplicitSegments {
  const nx = Math.max(8, Math.floor(w / stepPx));
  const ny = Math.max(8, Math.floor(h / stepPx));

  // 1. 网格采样 F(i,j)（一次采样）
  const f: number[][] = [];
  for (let i = 0; i <= nx; i++) {
    f[i] = [];
    for (let j = 0; j <= ny; j++) {
      const x = vp.xMin + (i / nx) * (vp.xMax - vp.xMin);
      const y = vp.yMin + (j / ny) * (vp.yMax - vp.yMin);
      const v = F(x, y);
      f[i][j] = Number.isNaN(v) ? 1e9 : v;
    }
  }

  const segments: [number, number, number, number][] = [];

  // 2. 每个单元：检查 4 条边跨零
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const v00 = f[i][j], v10 = f[i + 1][j], v01 = f[i][j + 1], v11 = f[i + 1][j + 1];
      const s00 = Math.sign(v00), s10 = Math.sign(v10), s01 = Math.sign(v01), s11 = Math.sign(v11);

      const pts: [number, number][] = [];

      const interp = (v1: number, v2: number): number => {
        if (Math.abs(v1 - v2) < 1e-12) return 0.5;
        return v1 / (v1 - v2);
      };

      // 底边 (i,j)-(i+1,j)：若符号不同 → 插值零点
      if (s00 !== s10) {
        const t = interp(v00, v10);
        pts.push([i + t, j]);
      }
      // 左边 (i,j)-(i,j+1)
      if (s00 !== s01) {
        const t = interp(v00, v01);
        pts.push([i, j + t]);
      }
      // 右边 (i+1,j)-(i+1,j+1)
      if (s10 !== s11) {
        const t = interp(v10, v11);
        pts.push([i + 1, j + t]);
      }
      // 顶边 (i,j+1)-(i+1,j+1)
      if (s01 !== s11) {
        const t = interp(v01, v11);
        pts.push([i + t, j + 1]);
      }

      if (pts.length === 2) {
        // 网格坐标 → 世界 → 屏幕
        const [ax, ay] = gridToScreen(pts[0], vp, nx, ny, w, h);
        const [bx, by] = gridToScreen(pts[1], vp, nx, ny, w, h);
        segments.push([ax, ay, bx, by]);
      }
    }
  }

  return { segments };
}

function gridToScreen(
  g: [number, number],
  vp: Viewport,
  nx: number,
  ny: number,
  w: number,
  h: number
): [number, number] {
  const x = vp.xMin + (g[0] / nx) * (vp.xMax - vp.xMin);
  const y = vp.yMin + (g[1] / ny) * (vp.yMax - vp.yMin);
  return worldToScreen(vp, w, h, x, y);
}

/** 常见圆锥曲线 F 函数（世界坐标）。 */
export function ellipseF(a: number, b: number): (x: number, y: number) => number {
  return (x, y) => (x * x) / (a * a) + (y * y) / (b * b) - 1;
}
export function hyperbolaF(a: number, b: number): (x: number, y: number) => number {
  return (x, y) => (x * x) / (a * a) - (y * y) / (b * b) - 1;
}
export function parabolaF(p: number): (x: number, y: number) => number {
  return (x, y) => y * y - 2 * p * x;
}
export function circleF(r: number): (x: number, y: number) => number {
  return (x, y) => x * x + y * y - r * r;
}
