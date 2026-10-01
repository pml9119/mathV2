// 讲解渲染引擎：按当前步骤渲染可视化（show/hide/highlight/params 联动）
import type { Problem, VizConfig, LectureStep } from './model.js';
import { createFunction } from '../expr/index.js';
import { sampleAdaptive } from '../plot/index.js';
import { renderFunctionGraphSVG } from '../render/index.js';
import { plotImplicit, ellipseF, hyperbolaF, parabolaF, circleF } from '../plot/index.js';
import { renderImplicitSVG } from '../render/index.js';
import { renderGeom3DSVG, prism, pyramid, cylinder, cone, box } from '../geo3d/index.js';
import { createPoint, type GeoContext, type Point } from '../geo/index.js';
import { dragWithConstraints } from '../geo/index.js';
import { renderGeoBoardSVG } from '../render/index.js';

/**
 * 渲染 Problem 当前步骤的可视化 → SVG 字符串。
 * stepIndex: 当前讲解步骤（-1 表示仅题目卡 / 0..n-1 是步骤）。
 */
export function renderProblemViz(p: Problem, stepIndex: number, w: number, h: number): string {
  const viz = p.viz;
  if (!viz) return '';
  const step = stepIndex >= 0 && stepIndex < p.steps.length ? p.steps[stepIndex] : null;
  // === 步骤 viz 状态（T3 联动）：show/hide/highlight/params ===
  const sv = step?.viz;
  const shown = (id: string) => {
    if (!sv) return true
    if (sv.hide?.includes(id)) return false
    if (sv.show?.length) return sv.show.includes(id)
    return true
  };
  const params = sv?.params ?? {};

  switch (viz.kind) {
    case 'functionGraph': {
      const vp = { xMin: viz.xMin, xMax: viz.xMax, yMin: viz.yMin, yMax: viz.yMax };
      // T3：params 覆盖表达式变量（如 a/h/k → 固定值，曲线随之变化）
      const base = (() => { try { return createFunction(viz.expr) } catch { return null } })();
      const f = (env: Record<string, number>) => {
        if (!base) return NaN;
        try { return base({ ...env, ...params }) } catch { return NaN }
      };
      const segs = sampleAdaptive(f as any, vp.xMin, vp.xMax, vp.yMin, vp.yMax);
      return renderFunctionGraphSVG(vp, segs, w, h, { curveColor: viz.color ?? '#3b6ef6' });
    }
    case 'implicit': {
      const vp = { xMin: -6, xMax: 6, yMin: -4, yMax: 4 };
      let F: (x: number, y: number) => number;
      const [a, b] = viz.params;
      switch (viz.type) {
        case 'ellipse': F = ellipseF(a, b); break;
        case 'hyperbola': F = hyperbolaF(a, b); break;
        case 'parabola': F = parabolaF(a); break;
        case 'circle': F = circleF(a); break;
        default: F = ellipseF(a, b);
      }
      const data = plotImplicit(F, vp, w, h);
      return renderImplicitSVG(vp, data, w, h, { curveColor: viz.params[2] ? '#e0457b' : '#3b6ef6' });
    }
    case 'geo3d': {
      const s = viz.shape;
      let geom;
      switch (s.kind) {
        case 'prism': geom = prism(s.n, s.r, s.h); break;
        case 'pyramid': geom = pyramid(s.n, s.r, s.h); break;
        case 'cylinder': geom = cylinder(s.r, s.h); break;
        case 'cone': geom = cone(s.r, s.h); break;
        case 'box': geom = box(s.r * 2, s.h, s.h * 0.6); break;
        default: geom = prism(s.n, s.r, s.h);
      }
      return renderGeom3DSVG(geom, { theta: viz.view?.theta ?? 0.6, phi: viz.view?.phi ?? 0.3 }, w, h);
    }
    case 'geoBoard': {
      // 构建 GeoContext
      const ctx: GeoContext = { points: {}, objects: [] };
      const cfg = viz.context;
      for (const [id, pt] of Object.entries(cfg.points)) {
        if (!shown(id)) continue;
        const constraints = (pt.constraints ?? []).map((c) => {
          switch (c.type) {
            case 'onLine': return { type: 'onLine' as const, lineId: c.lineId! };
            case 'onCircle': return { type: 'onCircle' as const, circleId: c.circleId! };
            case 'midpoint': return { type: 'midpoint' as const, aId: c.aId!, bId: c.bId! };
            case 'fixedX': return { type: 'fixedX' as const, x: c.x ?? 0 };
            case 'fixedY': return { type: 'fixedY' as const, x: c.x ?? 0 };
          }
        });
        ctx.points[id] = createPoint(id, pt.x, pt.y, constraints as never[]);
        if (pt.kind === 'locked') ctx.points[id].kind = 'locked';
      }
      for (const o of cfg.objects) {
        if (!shown(o.id)) continue;
        if (o.type === 'segment') ctx.objects.push({ id: o.id, type: 'segment', from: o.from!, to: o.to! });
        else if (o.type === 'line') ctx.objects.push({ id: o.id, type: 'line', through: o.through as [string, string] });
        else if (o.type === 'circle') ctx.objects.push({ id: o.id, type: 'circle', center: o.center!, radiusPoint: o.radiusPoint, radius: o.radius });
        else if (o.type === 'polygon') ctx.objects.push({ id: o.id, type: 'polygon', verts: o.verts! });
      }
      const measures = (viz.measures ?? []).map((m) => ({
        id: m.id, type: m.type, refs: m.refs, label: m.label
      }));
      // T3：高亮对象 → 加粗/变色（style 传 highlight 色）
      const hi = sv?.highlight ?? [];
      return renderGeoBoardSVG(ctx, { xMin: -5, xMax: 5, yMin: -3, yMax: 5 }, measures, w, h, {
        objColor: hi.length ? '#f59e0b' : '#3b6ef6',
        pointColor: hi.length ? '#f59e0b' : '#e0457b'
      });
    }
    default:
      return '';
  }
}

/** 应用步骤的 viz 状态（show/hide/highlight/params）——提供外部调用。 */
export function applyStepViz(p: Problem, stepIndex: number): LectureStep['viz'] {
  if (stepIndex < 0 || stepIndex >= p.steps.length) return undefined;
  return p.steps[stepIndex].viz;
}
