// geo3d 演示：四棱柱旋转（θ/φ）
import { prism, box, pyramid, cylinder, cone } from '../geo3d/index.js';
import { renderGeom3DSVG, renderVertexLabels } from '../geo3d/index.js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));

function save(name: string, geom: ReturnType<typeof prism>, theta: number, phi: number, labels: string[] = []) {
  const svg = renderGeom3DSVG(geom, { theta, phi }, 500, 380) + renderVertexLabels(geom, { theta, phi }, 500, 380, labels);
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;background:#fafbfe}</style></head><body>' + svg + '</body></html>';
  writeFileSync(join(here, name), html);
  console.log('✓ ' + name);
}

// 四棱柱（棱 θ=0.6 φ=0.3）
save('geo3d-prism.html', prism(4, 1.5, 2), 0.6, 0.3);
// 三棱柱
save('geo3d-triprism.html', prism(3, 1.5, 2), 0.6, 0.3, ['A','B','C','A\'','B\'','C\'']);
// 四棱锥
save('geo3d-pyramid.html', pyramid(4, 1.8, 2.4), 0.7, 0.4);
// 圆柱
save('geo3d-cylinder.html', cylinder(1.2, 2.4, 24), 0.5, 0.3);
// 圆锥
save('geo3d-cone.html', cone(1.2, 2.6, 24), 0.5, 0.3);
