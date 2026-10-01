// 题目讲解系统测试
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProblem } from '../dist/lecture/index.js';
import { renderProblemViz, applyStepViz } from '../dist/lecture/index.js';

// 模仿第15题定义 Problem
const problem15 = {
  id: 'p15',
  source: '高考真题',
  stem: '已知动圆P与圆M:(x+3)²+y²=1外切，与圆N:(x−3)²+y²=81内切。(1)求动圆圆心P的轨迹方程；(2)求1/|PM|+1/|PN|的取值范围。',
  answer: '(1) x²/25+y²/16=1, (2) [2/5, 5/8]',
  tags: { knowledge: '椭圆', difficulty: 3, exam: true },
  steps: [
    { id: 's1', title: '① 审题转化', text: '圆M:(x+3)²+y²=1 圆心 M(−3,0), r=1；圆N:(x−3)²+y²=81 圆心 N(3,0), r=9。外切 ⇒ |PM|=r+1，内切 ⇒ |PN|=9−r。' },
    { id: 's2', title: '② 数形结合', text: '|PM|+|PN|=(r+1)+(9−r)=10（恒等）。P到两定点距离和为定值10 ⇒ 椭圆定义。', viz: { show: ['ellipse'], draggable: ['P'] } },
    { id: 's3', title: '③ 定轨迹', text: '2a=10⇒a=5; c=3; b²=a²−c²=16 ⇒ 轨迹 x²/25+y²/16=1。', viz: { params: { a: 5, c: 3, b: 4 } } },
    { id: 's4', title: '④ 互动探索', text: '拖P验证 |PM|+|PN| 恒为10，1/|PM|+1/|PN|∈[2/5,5/8]。', viz: { draggable: ['P'] }, interact: { prompt: '拖动 P 点观察', check: '|PM|+|PN|=10' } }
  ],
  viz: { kind: 'implicit', type: 'ellipse', params: [5, 4] }
};

test('题目数据校验', () => {
  const errors = validateProblem(problem15);
  assert.equal(errors.length, 0);
  // 缺 steps
  const bad = validateProblem({ id: 'x', stem: '题干', steps: [] });
  assert.ok(bad.length > 0, '缺步骤应报错');
});

test('渲染：implicit 椭圆可视化', () => {
  const svg = renderProblemViz(problem15, 2, 700, 400);
  assert.ok(svg.includes('<svg'), '应生成 SVG');
  assert.ok(svg.includes('polyline') || svg.includes('line'), '应有线段');
});

test('步骤 viz 状态应用', () => {
  const v = applyStepViz(problem15, 1);
  assert.equal(v.draggable[0], 'P');
  const v3 = applyStepViz(problem15, 2);
  assert.deepEqual(v3.params, { a: 5, c: 3, b: 4 });
});

test('函数图讲解（导数/二次函数场景）', () => {
  const p = {
    id: 'p-demo', stem: '测试', steps: [{ id: 's', title: '步骤', text: '文' }],
    viz: { kind: 'functionGraph', expr: 'x^2-4x+3', xMin: -2, xMax: 6, yMin: -2, yMax: 7 }
  };
  const svg = renderProblemViz(p, 0, 700, 400);
  assert.ok(svg.includes('<svg'));
});
