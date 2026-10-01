// 演示：用数学引擎生成函数图 SVG
import { createFunction } from '../expr/index.js';
import { sampleAdaptive } from '../plot/index.js';
import { renderFunctionGraphSVG } from '../render/index.js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

function graphDemo(expr: string, xMin: number, xMax: number, yMin: number, yMax: number, color = '#3b6ef6', file = 'graph.html') {
  const f = createFunction(expr);
  const segs = sampleAdaptive(f, xMin, xMax, yMin, yMax);
  const svg = renderFunctionGraphSVG({ xMin, xMax, yMin, yMax }, segs, 800, 450, { curveColor: color });
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;background:#fafbfe}</style></head><body>' + svg + '</body></html>';
  writeFileSync(join(here, file), html);
  console.log('✓ ' + expr + ' → ' + file + '（' + segs.reduce((s, x) => s + x.points.length, 0) + ' 点, ' + segs.length + ' 段）');
}

// 二次函数（原型验证对齐）
graphDemo('x^2 - 4x + 3', -2, 6, -2, 7, '#3b6ef6', 'graph-quadratic.html');
// tan（渐近线分段验证）
graphDemo('tan(x)', -4, 4, -8, 8, '#e0457b', 'graph-tan.html');
// 1/x（断开验证）
graphDemo('1/x', -4, 4, -6, 6, '#7c4ef6', 'graph-recip.html');
// 指数（定义域/增长验证）
graphDemo('e^x', -3, 3, -1, 20, '#0aa', 'graph-exp.html');
// sin
graphDemo('sin(x)', -6.3, 6.3, -1.5, 1.5, '#38c98a', 'graph-sin.html');
console.log('done');
