// 3D 几何：投影/旋转/几何体表示（V/F）
export type Vec3 = [number, number, number];

export interface Geom3D {
  verts: Vec3[];                       // 顶点
  faces: { idx: number[]; fill?: string }[];  // 面（顶点索引）
}

/** 绕 Y 轴旋转（左右看）。 */
export function rotY(p: Vec3, theta: number): Vec3 {
  const ct = Math.cos(theta), st = Math.sin(theta);
  return [p[0] * ct + p[2] * st, p[1], -p[0] * st + p[2] * ct];
}

/** 绕 X 轴旋转（上下看）。 */
export function rotX(p: Vec3, phi: number): Vec3 {
  const cp = Math.cos(phi), sp = Math.sin(phi);
  return [p[0], p[1] * cp - p[2] * sp, p[1] * sp + p[2] * cp];
}

/** 正交投影：3D → 2D 屏幕（+ 深度）。 */
export function projectOrtho(p: Vec3, cx: number, cy: number, scale: number): [number, number, number] {
  return [cx + p[0] * scale, cy - p[1] * scale, p[2]];  // z 为深度（越大越远则排序时用）
}

/** 等轴测风格投影（y 压扁 + z 抬升），立体感更强。 */
export function projectIso(p: Vec3, cx: number, cy: number, scale: number, depthScale = 0.5): [number, number, number] {
  return [cx + p[0] * scale, cy - p[1] * scale * 0.8 - p[2] * scale * depthScale, p[2]];
}

/** 透视投影（V2 用，V1 用正交/等轴测）。 */
export function projectPersp(p: Vec3, cx: number, cy: number, scale: number, dist = 10): [number, number, number] {
  const d = dist - p[2] <= 0 ? 0.001 : dist - p[2];
  const f = scale * (dist / d);
  return [cx + p[0] * f, cy - p[1] * f, p[2]];
}

// ===== 几何体生成（V/F 表示） =====

/** 棱柱：底 n 边形（高度 h）。 */
export function prism(n: number, r: number, h: number): Geom3D {
  const verts: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI;
    verts.push([r * Math.cos(a), r * Math.sin(a), 0]);
  }
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI;
    verts.push([r * Math.cos(a), r * Math.sin(a), h]);
  }
  const faces: { idx: number[] }[] = [];
  // 底面（0..n-1）
  faces.push({ idx: [...Array(n).keys()].reverse() });  // 法向量朝下
  // 顶面（n..2n-1）
  faces.push({ idx: [...Array(n).keys()].map((i) => i + n) });
  // 侧面
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push({ idx: [i, j, n + j, n + i] });
  }
  return { verts, faces };
}

/** 棱锥：底 n 边形 + 顶点（高度 h）。 */
export function pyramid(n: number, r: number, h: number): Geom3D {
  const verts: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI;
    verts.push([r * Math.cos(a), r * Math.sin(a), 0]);
  }
  verts.push([0, 0, h]);  // 顶部顶点
  const faces: { idx: number[] }[] = [];
  faces.push({ idx: [...Array(n).keys()].reverse() });  // 底面
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push({ idx: [i, j, n] });
  }
  return { verts, faces };
}

/** 圆柱：n 面棱柱近似。 */
export function cylinder(r: number, h: number, n = 32): Geom3D {
  return prism(n, r, h);
}

/** 圆锥：n 面棱锥近似。 */
export function cone(r: number, h: number, n = 32): Geom3D {
  return pyramid(n, r, h);
}

/** 长方体（三棱柱特例）。 */
export function box(wx: number, wy: number, wz: number): Geom3D {
  const w = wx / 2, d = wy / 2, h = wz / 2;
  const verts: Vec3[] = [
    [-w, -d, -h], [w, -d, -h], [w, d, -h], [-w, d, -h],
    [-w, -d, h], [w, -d, h], [w, d, h], [-w, d, h]
  ];
  const faces = [
    { idx: [0, 1, 2, 3] },   // 底
    { idx: [4, 5, 6, 7] },   // 顶
    { idx: [0, 1, 5, 4] },   // 前
    { idx: [1, 2, 6, 5] },   // 右
    { idx: [2, 3, 7, 6] },   // 后
    { idx: [3, 0, 4, 7] }    // 左
  ];
  return { verts, faces };
}
