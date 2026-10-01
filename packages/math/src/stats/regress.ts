// 最小二乘回归 + 相关系数
export interface Regression {
  slope: number;
  intercept: number;
  r: number;          // 相关系数
  meanX: number;
  meanY: number;
}

export function linearRegression(pairs: [number, number][]): Regression {
  if (pairs.length < 2) return { slope: NaN, intercept: NaN, r: NaN, meanX: NaN, meanY: NaN };
  const n = pairs.length;
  const sx = pairs.reduce((s, p) => s + p[0], 0);
  const sy = pairs.reduce((s, p) => s + p[1], 0);
  const mx = sx / n, my = sy / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) * (x - mx);
    syy += (y - my) * (y - my);
  }
  if (sxx === 0) return { slope: NaN, intercept: NaN, r: NaN, meanX: mx, meanY: my };
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const r = sxx * syy === 0 ? NaN : sxy / Math.sqrt(sxx * syy);
  return { slope, intercept, r, meanX: mx, meanY: my };
}

/** 回归线两点（用于画线）。 */
export function regressionLinePoints(reg: Regression, xMin: number, xMax: number): [[number, number], [number, number]] {
  return [[xMin, reg.intercept + reg.slope * xMin], [xMax, reg.intercept + reg.slope * xMax]];
}
