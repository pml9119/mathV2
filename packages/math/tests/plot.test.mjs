// 采样器测试
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFunction } from '../dist/expr/index.js';
import { sampleAdaptive, countPoints } from '../dist/plot/index.js';

test('二次函数采样连续无断点', () => {
  const f = createFunction('x^2 - 4x + 3');
  const segs = sampleAdaptive(f, -2, 6, -2, 8);
  assert.equal(segs.length, 1, '应是一段连续');
  assert.ok(countPoints(segs) >= 50);
  // 顶点 x=2 处 y=-1
  const minY = Math.min(...segs[0].points.map(p => p[1]));
  assert.ok(Math.abs(minY - (-1)) < 0.01, '顶点应接近 -1，实际 ' + minY);
});

test('tan 渐近线分段', () => {
  const f = createFunction('tan(x)');
  const segs = sampleAdaptive(f, -3, 3, -10, 10);
  assert.ok(segs.length >= 2, 'tan 应有多个分段');
  // 每段点数有限
  segs.forEach(s => assert.ok(s.points.length >= 2));
});

test('1/x 渐近线断开', () => {
  const f = createFunction('1/x');
  const segs = sampleAdaptive(f, -3, 3, -10, 10);
  assert.ok(segs.length >= 2, '1/x 应在 x=0 断开');
});

test('sqrt 定义域保护', () => {
  const f = createFunction('sqrt(x)');
  const segs = sampleAdaptive(f, -3, 4, -1, 4);
  // x<0 时 NaN → 只应有 x>=0 的段
  segs.forEach(s => s.points.forEach(p => assert.ok(p[0] >= -0.001)));
});
