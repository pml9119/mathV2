// 勾股定理演示：C 约束在圆上（Thales 定理），测量 a²+b² vs c²
import { createPoint, type GeoContext, type Point, type MeasureSpec } from '../geo/index.js';
import { dragWithConstraints } from '../geo/index.js';
import { renderGeoBoardSVG } from '../render/index.js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

// 构建几何：A(-4,0) B(4,0) O(0,0) 圆O半径4；C 在圆上（onCircle 约束）
const ctx: GeoContext = { points: {}, objects: [] };
const A = createPoint('A', -4, 0);
const B = createPoint('B', 4, 0);
const O = createPoint('O', 0, 0, [{ type: 'fixedX', x: 0 }, { type: 'fixedY', y: 0 }]);
O.kind = 'locked';
// C 约束在圆心 O 半径 4 的圆上（用线段 AB 中点？直接 onCircle 引用圆对象）
ctx.points.A = A; ctx.points.B = B; ctx.points.O = O;
// 圆对象
ctx.objects.push({ id: 'c1', type: 'circle', center: 'O', radius: 4 });
// C 点约束 onCircle c1
const C = createPoint('C', 0, 4, [{ type: 'onCircle', circleId: 'c1' }]);
ctx.points.C = C;
// 三角形
ctx.objects.push({ id: 'segAC', type: 'segment', from: 'A', to: 'C' });
ctx.objects.push({ id: 'segBC', type: 'segment', from: 'B', to: 'C' });
ctx.objects.push({ id: 'segAB', type: 'segment', from: 'A', to: 'B' });

// 测量
const measures: MeasureSpec[] = [
  { id: 'mAC', type: 'length', refs: ['A', 'C'], label: 'a=|AC|' },
  { id: 'mBC', type: 'length', refs: ['B', 'C'], label: 'b=|BC|' },
  { id: 'mAB', type: 'length', refs: ['A', 'B'], label: 'c=|AB|' },
];

function actualC() {
  const a = dist(A, C), b = dist(B, C), c = dist(A, B);
  return 'a=' + a.toFixed(2) + ' b=' + b.toFixed(2) + ' c=' + c.toFixed(2) + '  ⇒  a²+b²=' + (a*a+b*b).toFixed(2) + ' , c²=' + (c*c).toFixed(2);
}
function dist(a: Point, b: Point) { return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2); }

// 渲染初始
const svg = renderGeoBoardSVG(ctx, { xMin: -5, xMax: 5, yMin: -3, yMax: 5 }, measures, 700, 400);
console.log('初始 C=(0,4) →', actualC());
// 拖 C 到 (3,2) 附近（约束投影回圆）
dragWithConstraints(ctx, C, 3, 2, 10);
console.log('拖 C 到 (3,2) →', actualC());
// 再拖
dragWithConstraints(ctx, C, -2.8, 2.8, 10);
console.log('拖 C 到 (-2.8,2.8) →', actualC());

// 生成最终 SVG（把测量文字也带上视觉版）
const measures2: MeasureSpec[] = [
  { id: 'mAC', type: 'length', refs: ['A', 'C'], label: 'a' },
  { id: 'mBC', type: 'length', refs: ['B', 'C'], label: 'b' },
  { id: 'mAB', type: 'length', refs: ['A', 'B'], label: 'c' },
];
const svg2 = renderGeoBoardSVG(ctx, { xMin: -5, xMax: 5, yMin: -3, yMax: 5 }, measures2, 700, 400);
const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;background:#fafbfe}</style></head><body>' + svg2 + '<div style="font-family:monospace;font-size:13px;padding:8px;color:#0f4c81">' + actualC() + '</div></body></html>';
writeFileSync(join(here, 'geo-pythagoras.html'), html);
console.log('✓ geo-pythagoras.html 已生成');
