// 表达式引擎测试（针对编译产物 dist/expr）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFunction, evaluate, isValidExpr } from '../dist/expr/index.js';

test('数值与四则运算', () => {
  assert.equal(evaluate('1+2'), 3);
  assert.equal(evaluate('2*3+4'), 10);
  assert.equal(evaluate('10-2*3'), 4);
  assert.equal(evaluate('8/4/2'), 1); // 左结合
});

test('幂运算右结合', () => {
  assert.equal(evaluate('2^3^2'), 512); // 2^(3^2) = 2^9
  assert.equal(evaluate('2^3'), 8);
  assert.equal(evaluate('-2^2'), -4); // -(2^2)
});

test('隐式乘法', () => {
  assert.equal(evaluate('2x', { x: 3 }), 6);
  assert.equal(evaluate('2(x+1)', { x: 2 }), 6);
  assert.equal(evaluate('x(x+1)', { x: 2 }), 6);
  assert.equal(evaluate('3sin(x)', { x: Math.PI / 2 }), 3); // 数值精度
  assert.ok(Math.abs(evaluate('3sin(x)', { x: Math.PI/2 }) - 3) < 1e-10);
});

test('函数调用', () => {
  assert.ok(Math.abs(evaluate('sin(x)', { x: 0 }) - 0) < 1e-12);
  assert.ok(Math.abs(evaluate('cos(x)', { x: 0 }) - 1) < 1e-12);
  assert.ok(Math.abs(evaluate('sqrt(x)', { x: 16 }) - 4) < 1e-12);
  assert.equal(evaluate('abs(-5)'), 5);
  assert.ok(Math.abs(evaluate('ln(e)', {}) - 1) < 1e-10);
});

test('常量', () => {
  assert.ok(Math.abs(evaluate('pi') - Math.PI) < 1e-12);
  assert.ok(Math.abs(evaluate('2pi') - 2*Math.PI) < 1e-12);
  assert.ok(Math.abs(evaluate('e^2') - Math.E*Math.E) < 1e-10);
});

test('多变量', () => {
  // 二次函数 y = a(x-h)^2 + k
  const f = createFunction('a(x-h)^2+k');
  assert.ok(Math.abs(f({ a: 1, h: 2, k: -1, x: 2 }) - (-1)) < 1e-12);
  assert.ok(Math.abs(f({ a: 1, h: 2, k: -1, x: 4 }) - 3) < 1e-12);
});

test('NaN 保护（不抛异常）', () => {
  assert.ok(Number.isNaN(evaluate('1/0')));
  assert.ok(Number.isNaN(evaluate('sqrt(-1)')));
  assert.ok(Number.isNaN(evaluate('undefined_var', {})));
});

test('非法表达式', () => {
  assert.equal(isValidExpr('2x+'), false);
  assert.equal(isValidExpr('sin('), false);
  assert.equal(isValidExpr('x +) '), false);
  assert.equal(isValidExpr('2x+3'), true);
});

test('隐式乘法的歧义：函数 vs 变量乘括号', () => {
  // sin(x) 是函数
  assert.ok(Math.abs(evaluate('sin(x)', { x: 0 }) - 0) < 1e-12);
  // x(x+1) 是变量乘括号
  assert.equal(evaluate('x(x+1)', { x: 2 }), 6);
});
