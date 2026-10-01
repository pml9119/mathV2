// 隐式曲线测试
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plotImplicit, ellipseF, hyperbolaF, circleF, parabolaF } from '../dist/plot/index.js';

const vp = { xMin: -6, xMax: 6, yMin: -4, yMax: 4 };

test('椭圆：封闭曲线，分段很多（连续环）', () => {
  const data = plotImplicit(ellipseF(4, 3), vp, 600, 400, 4);
  assert.ok(data.segments.length > 100, '椭圆应产生大量线段（一整条环）');
});

test('双曲线：两支自动分离（两支间无跨零）', () => {
  const data = plotImplicit(hyperbolaF(4, 3), vp, 600, 400, 4);
  assert.ok(data.segments.length > 100);
  // 检查线段都在左支或右支（|x|>a 区域）：不穿过中间"负"区
  // 简单验证：所有线段端点 x 都远离原点（|x|>=3 或 |x|>=a*0.8）
  const W = 600;
  for (const seg of data.segments) {
    // 屏幕 → world x
    const wx0 = vp.xMin + (seg[0] / W) * (vp.xMax - vp.xMin);
    const wx1 = vp.xMin + (seg[2] / W) * (vp.xMax - vp.xMin);
    // 两支：x>4 或 x<-4（a=4）
    assert.ok(Math.abs(wx0) >= 3.5 && Math.abs(wx1) >= 3.5, '双曲线线段应在 |x|>=3.5 区域（两支分离）: wx0=' + wx0.toFixed(2));
  }
});

test('圆：封闭曲线', () => {
  const data = plotImplicit(circleF(3), vp, 600, 400, 4);
  assert.ok(data.segments.length > 100);
});

test('抛物线：开口向右', () => {
  const data = plotImplicit(parabolaF(1), vp, 600, 400, 4);
  assert.ok(data.segments.length > 50);
});
