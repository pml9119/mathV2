// 描述统计：均值/中位数/众数/方差/标准差/极差
export function mean(data: number[]): number {
  if (!data.length) return NaN;
  return data.reduce((s, v) => s + v, 0) / data.length;
}

export function median(data: number[]): number {
  if (!data.length) return NaN;
  const sorted = [...data].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function mode(data: number[]): number | null {
  if (!data.length) return null;
  const freq = new Map<number, number>();
  let best = Infinity, bestCount = 0;
  for (const v of data) {
    const c = (freq.get(v) || 0) + 1;
    freq.set(v, c);
    if (c > bestCount) { bestCount = c; best = v; }
  }
  return bestCount > 1 ? best : null;
}

export function variance(data: number[]): number {
  if (data.length < 2) return 0;
  const m = mean(data);
  return data.reduce((s, v) => s + (v - m) ** 2, 0) / data.length;  // 总体方差
}

export function stdDev(data: number[]): number {
  return Math.sqrt(variance(data));
}

export function range(data: number[]): number {
  if (!data.length) return NaN;
  return Math.max(...data) - Math.min(...data);
}

/** 分位数（线性插值，p in [0,1]）。 */
export function quantile(data: number[], p: number): number {
  if (!data.length) return NaN;
  const sorted = [...data].sort((a, b) => a - b);
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const f = idx - lo;
  return sorted[lo] * (1 - f) + sorted[hi] * f;
}
