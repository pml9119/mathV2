// stats 测试
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mean, median, variance, stdDev, mode, quantile } from '../dist/stats/index.js';
import { linearRegression } from '../dist/stats/index.js';
import { normalPdf, binomialPmf, combination, normalCdf } from '../dist/stats/index.js';

test('描述统计', () => {
  const data = [2, 4, 4, 4, 5, 5, 7, 9];
  assert.equal(mean(data), 5);
  assert.equal(median(data), 4.5);
  assert.equal(mode(data), 4);
});

test('方差/标准差', () => {
  const data = [1, 2, 3, 4, 5];
  assert.ok(Math.abs(variance(data) - 2) < 1e-9);
  assert.ok(Math.abs(stdDev(data) - Math.sqrt(2)) < 1e-9);
});

test('分位数', () => {
  const data = [1, 2, 3, 4, 5];
  assert.equal(quantile(data, 0), 1);
  assert.equal(quantile(data, 1), 5);
  assert.ok(Math.abs(quantile(data, 0.5) - 3) < 1e-9);
});

test('最小二乘回归：直线数据完美拟合', () => {
  const pairs = [[1, 2],[2, 4],[3, 6],[4, 8],[5, 10]];
  const reg = linearRegression(pairs);
  assert.ok(Math.abs(reg.slope - 2) < 1e-9);
  assert.ok(Math.abs(reg.intercept - 0) < 1e-9);
  assert.ok(Math.abs(reg.r - 1) < 1e-9);
});

test('相关系数：负相关', () => {
  const pairs = [[1, 10],[2, 8],[3, 6],[4, 4],[5, 2]];
  const reg = linearRegression(pairs);
  assert.ok(Math.abs(reg.r + 1) < 1e-9);
});

test('正态分布', () => {
  const mu = 0, sig = 1;
  const peak = normalPdf(mu, mu, sig);
  assert.ok(Math.abs(peak - 1/Math.sqrt(2*Math.PI)) < 1e-9);
  assert.ok(normalPdf(0, 0, 2) < peak, 'σ 大 → 峰值矮');
  // CDF: P(X<mu)=0.5
  assert.ok(Math.abs(normalCdf(mu, mu, sig) - 0.5) < 1e-6);
});

test('二项分布', () => {
  assert.equal(combination(5, 2), 10);
  assert.ok(Math.abs(binomialPmf(2, 5, 0.5) - 10/32) < 1e-9);
  assert.equal(binomialPmf(0, 5, 0.5), 1/32);
});
