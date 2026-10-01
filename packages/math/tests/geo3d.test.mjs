// geo3d 测试
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prism, pyramid, cylinder, cone, box, rotY, rotX, projectIso, projectOrtho } from '../dist/geo3d/index.js';
import { renderGeom3DSVG } from '../dist/geo3d/index.js';

test('旋转：绕 Y 轴 90° 正确', () => {
  const p = rotY([1, 0, 0], Math.PI / 2);
  assert.ok(Math.abs(p[0] - 0) < 1e-9, 'x→0');
  assert.ok(Math.abs(p[1]) < 1e-9);
  assert.ok(Math.abs(p[2] - 1) < 1e-9 || Math.abs(p[2] + 1) < 1e-9);
});

test('几何体：棱柱 V/F 正确', () => {
  const p = prism(4, 1, 2);  // 四棱柱
  assert.equal(p.verts.length, 8);  // 4 底 + 4 顶
  assert.equal(p.faces.length, 6);  // 底 + 顶 + 4 侧面
});

test('棱锥 V/F 正确', () => {
  const p = pyramid(4, 1, 2);
  assert.equal(p.verts.length, 5);  // 4 底 + 顶点
  assert.equal(p.faces.length, 5);  // 底 + 4 侧
});

test('圆柱/圆锥点数', () => {
  const c = cylinder(1, 2, 16);
  assert.equal(c.verts.length, 32);
  const cone1 = cone(1, 2, 16);
  assert.equal(cone1.verts.length, 17);
});

test('box 面数', () => {
  const b = box(2, 1, 3);
  assert.equal(b.verts.length, 8);
  assert.equal(b.faces.length, 6);
});

test('渲染：生成 SVG 含 polygon', () => {
  const svg = renderGeom3DSVG(prism(4, 1, 2), { theta: 0.5, phi: 0.3 }, 400, 300);
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('polygon'));
});

test('投影：正交 vs 等轴测', () => {
  const p = projectOrtho([1, 2, 3], 100, 100, 10);
  assert.equal(p[0], 110);
  assert.equal(p[1], 80);
  const q = projectIso([1, 2, 3], 100, 100, 10, 0.5);
  assert.notEqual(q[1], p[1]);  // iso y 被压缩/抬升
});
