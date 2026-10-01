// 题目讲解系统数据模型（Problem + LectureStep + VizConfig）

/**
 * 可视化配置：指定引擎 + 参数（函数图/几何/3D/隐式曲线）。
 * 复用 packages/math 各模块。
 */
export type VizConfig =
  | { kind: 'functionGraph'; expr: string; xMin: number; xMax: number; yMin: number; yMax: number; color?: string; markers?: MarkerSpec[] }
  | { kind: 'geoBoard'; context: GeoBoardConfig; measures?: MeasureConfig[] }
  | { kind: 'geo3d'; shape: Geo3DShape; view?: { theta: number; phi: number }; labels?: string[] }
  | { kind: 'implicit'; type: 'ellipse' | 'hyperbola' | 'parabola' | 'circle'; params: number[] };

export interface MarkerSpec {
  type: 'point' | 'zero' | 'vertex';
  x?: number;
  color?: string;
  label?: string;
}

export interface Geo3DShape {
  kind: 'prism' | 'pyramid' | 'cylinder' | 'cone' | 'box';
  n: number;
  r: number;
  h: number;
}

export interface GeoBoardConfig {
  points: Record<string, { x: number; y: number; kind?: 'free' | 'locked' | 'constraint'; constraints?: ConstraintSpec[] }>;
  objects: GeoObjectSpec[];
}

export interface ConstraintSpec {
  type: 'onLine' | 'onCircle' | 'midpoint' | 'fixedX' | 'fixedY';
  lineId?: string;
  circleId?: string;
  aId?: string;
  bId?: string;
  x?: number;
}

export interface GeoObjectSpec {
  id: string;
  type: 'segment' | 'line' | 'circle' | 'polygon';
  from?: string;
  to?: string;
  through?: [string, string];
  center?: string;
  radiusPoint?: string;
  radius?: number;
  verts?: string[];
}

export interface MeasureConfig {
  id: string;
  type: 'length' | 'angle' | 'area' | 'slope';
  refs: string[];
  label?: string;
  show?: boolean;
}

/**
 * 讲解步骤：每步有文字 + 可视化联动状态（这一步图要显示什么/高亮/参数/探索提示）。
 */
export interface LectureStep {
  id: string;
  title: string;                          // 步骤标题
  text: string;                           // 讲解文字
  formula?: string;                       // 该步关键公式（LaTeX 标记）
  viz?: {
    show?: string[];                      // 此步显示的对象 id
    hide?: string[];                      // 隐藏
    highlight?: string[];                 // 高亮
    params?: Record<string, number>;      // 参数（如 BM 长度、动点参数 t）
    draggable?: string[];                 // 此步解锁可拖动对象
  };
  interact?: {
    prompt: string;                       // 引导语（拖 P 观察…）
    check?: string;                       // 期望结论
  };
}

/**
 * 题目（题卡 + 讲解 + 可视化）。
 */
export interface Problem {
  id: string;
  source?: string;
  stem: string;
  answer?: string;
  tags?: { knowledge?: string; difficulty?: 1 | 2 | 3; exam?: boolean };
  steps: LectureStep[];
  viz?: VizConfig;
  widget?: WidgetRef;                     // 可选互动层
}

export interface WidgetRef {
  id: string;
  type: string;                            // math-select / math-graph / math-viz ...
  config?: Record<string, unknown>;
}

/** 校验题目结构完整性。 */
export function validateProblem(p: Problem): string[] {
  const errors: string[] = [];
  if (!p.stem) errors.push('题干缺失');
  if (!p.steps.length) errors.push('讲解步骤缺失');
  if (!p.answer && !p.steps.length) errors.push('答案缺失');
  p.steps.forEach((s, i) => {
    if (!s.title) errors.push('步骤' + (i + 1) + '缺少标题');
    if (!s.text) errors.push('步骤' + (i + 1) + '缺少讲解');
  });
  return errors;
}
