// 概率分布：正态/二项
/** 正态密度 N(mu, sigma^2)。 */
export function normalPdf(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return NaN;
  return Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
}

/** 正态累积分布（误差函数近似）。 */
export function normalCdf(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return NaN;
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2)));
}

function erf(x: number): number {
  // Abramowitz & Stegun 近似
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
}

/** 二项分布 B(n,p)：P(k)。 */
export function binomialPmf(k: number, n: number, p: number): number {
  if (k < 0 || k > n) return 0;
  const c = combination(n, k);
  return c * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

/** 组合数 C(n,k)（迭代乘防溢出）。 */
export function combination(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let c = 1;
  for (let i = 0; i < k; i++) {
    c = c * (n - i) / (i + 1);
  }
  return c;
}

/** 正态近似：二项 → N(np, np(1-p))（n≥20 演示用）。 */
export function binomialNormalApprox(n: number, p: number): { mu: number; sigma: number } {
  return { mu: n * p, sigma: Math.sqrt(n * p * (1 - p)) };
}
