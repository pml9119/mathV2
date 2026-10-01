// 3D 渲染：旋转 → 投影 → 背面剔除 → 深度排序（画家算法）→ SVG
import type { Geom3D, Vec3 } from './model.js';
import { rotY, rotX, projectIso } from './model.js';

export interface Geo3DView {
  theta: number;  // 绕 Y 轴（左右）
  phi: number;    // 绕 X 轴（上下）
  scale?: number;
}

export function renderGeom3DSVG(
  geom: Geom3D,
  view: Geo3DView,
  w: number,
  h: number,
  style: { faceColor?: string; edgeColor?: string; backFace?: boolean; vertexLabels?: boolean } = {}
): string {
  const faceColor = style.faceColor ?? '#3b6ef6';
  const edgeColor = style.edgeColor ?? '#3b6ef6';
  const backFace = style.backFace ?? false;

  const cx = w / 2, cy = h / 2;
  const scale = view.scale ?? Math.min(w, h) / 6;

  // 1. 旋转所有顶点
  const vp: Vec3[] = geom.verts.map((v) => rotX(rotY(v, view.theta), view.phi));
  // 2. 投影
  const sp = vp.map((v) => projectIso(v, cx, cy, scale));

  // 3. 每面：深度（顶点 z 均值）、法向量（背面剔除）
  const faces = geom.faces.map((face, fi) => {
    const verts = face.idx.map((i) => vp[i]);
    const depth = verts.reduce((s, v) => s + v[2], 0) / verts.length;
    // 法向量（前两边的叉积）
    const [a, b, c] = verts;
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    // 视线方向：约 viewer 在 z 负方向（正交），看向 +z
    const viewer = [0, 0, -1];
    const dot = n[0] * viewer[0] + n[1] * viewer[1] + n[2] * viewer[2];
    const facing = dot < 0;  // 法向量朝向观察者
    return { face, fi, depth, facing };
  });

  // 4. 排序：远（depth 大）→ 近
  faces.sort((a, b) => b.depth - a.depth);

  let g = '';
  // 5. 依序绘制
  for (const f of faces) {
    if (!backFace && f.facing === false) {
      // 背面剔除：V1 也画（线框+半透明）而不是完全去掉（因为多边形法向量方向可能因旋转而异）
      // 简化：V1 全部画，靠排序解决遮挡；半透明填充增加立体感
    }
    const pts = f.face.idx.map((i) => sp[i][0].toFixed(1) + ',' + sp[i][1].toFixed(1)).join(' ');
    const alpha = f.depth > 0 ? 0.12 : 0.25;  // 远面更淡（模拟光照）
    g += '<polygon points="' + pts + '" fill="' + faceColor + '" fill-opacity="' + alpha + '" stroke="' + edgeColor + '" stroke-width="1.4"/>';
  }

  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="100%">' + g + '</svg>';
}

/** 顶点标注（A/B/C/A'...跟随旋转）。 */
export function renderVertexLabels(geom: Geom3D, view: Geo3DView, w: number, h: number, labels: string[]): string {
  const cx = w / 2, cy = h / 2, scale = Math.min(w, h) / 6;
  const vp = geom.verts.map((v) => rotX(rotY(v, view.theta), view.phi));
  let g = '';
  for (let i = 0; i < Math.min(vp.length, labels.length); i++) {
    const [sx, sy] = projectIso(vp[i], cx, cy, scale);
    g += '<circle cx="' + sx + '" cy="' + sy + '" r="3.5" fill="#e0457b" stroke="#fff" stroke-width="1"/>';
    g += '<text x="' + (sx + 6) + '" y="' + (sy - 5) + '" font-size="12" fill="#0f4c81">' + labels[i] + '</text>';
  }
  return g;
}
