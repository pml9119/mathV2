// 几何模型/约束/测量测试
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPoint, projectOntoLine, projectOntoCircle } from '../dist/geo/index.js';
import { dragWithConstraints } from '../dist/geo/index.js';
import { measure } from '../dist/geo/index.js';

function mkCtx() {
  const ctx = { points: {}, objects: [] };
  return ctx;
}

test('投影：点到直线垂足', () => {
  const a = { id: 'A', kind: 'free', x: 0, y: 0, constraints: [] };
  const b = { id: 'B', kind: 'free', x: 2, y: 1, constraints: [] };
  const p = { id: 'P', kind: 'free', x: 1, y: 2, constraints: [] };
  // 直线 y=0.5x，点 (1,2) 投影
  const [px, py] = projectOntoLine(p, a, b);
  // 垂足应满足在线上: y = 0.5x 且 (P-proj)⊥line
  assert.ok(Math.abs(py - 0.5 * px) < 1e-9, '投影点在线 L 上');
  const dx = px - 0, dy = py - 0; // proj - a
  const ndx = p.x - px, ndy = p.y - py; // p - proj
  const dot = dx * ndx + dy * ndy;
  assert.ok(Math.abs(dot) < 1e-9, '垂线垂直');
});

test('投影：点到圆', () => {
  const center = { id: 'O', kind: 'free', x: 0, y: 0, constraints: [] };
  const p = { id: 'P', kind: 'free', x: 3, y: 4, constraints: [] };
  const r = 2;
  const [px, py] = projectOntoCircle(p, center, r);
  const d = Math.sqrt(px * px + py * py);
  assert.ok(Math.abs(d - r) < 1e-9, '投影点在圆上');
});

test('拖拽约束中点', () => {
  const ctx = mkCtx();
  const A = createPoint('A', 0, 0);
  const B = createPoint('B', 4, 0);
  const M = createPoint('M', 2, 0, [{ type: 'midpoint', aId: 'A', bId: 'B' }]);
  ctx.points.A = A; ctx.points.B = B; ctx.points.M = M;
  // 拖 M 到别处 → 自动回中点
  dragWithConstraints(ctx, M, 5, 5);
  assert.ok(Math.abs(M.x - 2) < 1e-9 && Math.abs(M.y - 0) < 1e-9, 'M 始终是 AB 中点');
  // 移 A → M 更新（级联）
  A.x = 10; A.y = 0;
  dragWithConstraints(ctx, M, M.x, M.y); // 若 M 约束引用 A 会重算，但这里需重调 —— 简化验证直接调 project
});

test('测量：长度/角度/面积', () => {
  const A = { id: 'A', kind: 'free', x: 0, y: 0, constraints: [] };
  const B = { id: 'B', kind: 'free', x: 3, y: 0, constraints: [] };
  const C = { id: 'C', kind: 'free', x: 0, y: 4, constraints: [] };
  const ctx = { points: { A, B, C }, objects: [] };
  assert.equal(measure(ctx, { id: 'm1', type: 'length', refs: ['A', 'B'] }), 3);
  assert.ok(Math.abs(measure(ctx, { id: 'm2', type: 'length', refs: ['A', 'C'] }) - 4) < 1e-9);
  assert.ok(Math.abs(measure(ctx, { id: 'm3', type: 'angle', refs: ['B', 'A', 'C'] }) - 90) < 1e-6);
  assert.ok(Math.abs(measure(ctx, { id: 'm4', type: 'area', refs: ['A', 'B', 'C'] }) - 6) < 1e-9);
});
