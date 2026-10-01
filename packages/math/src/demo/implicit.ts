// 隐式曲线演示：椭圆/双曲线/圆/抛物线
import { plotImplicit, ellipseF, hyperbolaF, circleF, parabolaF } from '../plot/index.js';
import { renderImplicitSVG } from '../render/index.js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const vp = { xMin: -6, xMax: 6, yMin: -4, yMax: 4 };

function save(name: string, color: string, F: (x: number, y: number) => number) {
  const data = plotImplicit(F, vp, 800, 500, 4);
  const svg = renderImplicitSVG(vp, data, 800, 500, { curveColor: color });
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;background:#fafbfe}</style></head><body>' + svg + '</body></html>';
  writeFileSync(join(here, name), html);
  console.log('✓ ' + name + '（' + data.segments.length + ' 段）');
}
save('implicit-ellipse.html', '#3b6ef6', ellipseF(4, 3));
save('implicit-hyperbola.html', '#e0457b', hyperbolaF(4, 3));
save('implicit-circle.html', '#0aa', circleF(3));
save('implicit-parabola.html', '#7c4ef6', parabolaF(1));
