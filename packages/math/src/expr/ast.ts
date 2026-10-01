// 表达式 AST 节点定义
export type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'var'; name: string }
  | { kind: 'bin'; op: '+' | '-' | '*' | '/' | '^'; left: Expr; right: Expr }
  | { kind: 'neg'; operand: Expr }
  | { kind: 'call'; name: string; args: Expr[] };

// 编译后的求值函数：env 提供变量值（x, a, t 等）
export type Env = Record<string, number>;
export type CompiledFn = (env: Env) => number;

// 数学函数白名单（安全：不支持任意代码执行）
const FUNCS: Record<string, (args: number[]) => number> = {
  sin: (a) => Math.sin(a[0]),
  cos: (a) => Math.cos(a[0]),
  tan: (a) => Math.tan(a[0]),
  asin: (a) => Math.asin(a[0]),
  acos: (a) => Math.acos(a[0]),
  atan: (a) => Math.atan(a[0]),
  sqrt: (a) => Math.sqrt(a[0]),
  abs: (a) => Math.abs(a[0]),
  ln: (a) => Math.log(a[0]),
  log: (a) => Math.log10(a[0]),
  log2: (a) => Math.log2(a[0]),
  exp: (a) => Math.exp(a[0]),
  pow: (a) => Math.pow(a[0], a[1]),
  floor: (a) => Math.floor(a[0]),
  ceil: (a) => Math.ceil(a[0]),
  round: (a) => Math.round(a[0]),
  sign: (a) => Math.sign(a[0]),
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  mod: (a) => a[0] % a[1],
  atan2: (a) => Math.atan2(a[0], a[1]),
};

export const isFunctionName = (name: string): boolean => name in FUNCS;
export const functionArity = (name: string): [number, number] | null => {
  switch (name) {
    case 'sin': case 'cos': case 'tan': case 'asin': case 'acos': case 'atan':
    case 'sqrt': case 'abs': case 'ln': case 'log': case 'log2': case 'exp':
    case 'floor': case 'ceil': case 'round': case 'sign': return [1, 1];
    case 'pow': case 'mod': case 'atan2': return [2, 2];
    case 'min': case 'max': return [1, Infinity];
    default: return null;
  }
};

// 编译：AST → 闭包（预解析，求值快 10x）
export function compileExpr(expr: Expr): CompiledFn {
  switch (expr.kind) {
    case 'num': {
      const v = expr.value;
      return () => v;
    }
    case 'var': {
      const n = expr.name;
      return (env) => {
        const v = env[n];
        return v === undefined ? NaN : v;
      };
    }
    case 'neg': {
      const f = compileExpr(expr.operand);
      return (env) => -f(env);
    }
    case 'bin': {
      const l = compileExpr(expr.left);
      const r = compileExpr(expr.right);
      switch (expr.op) {
        case '+': return (env) => l(env) + r(env);
        case '-': return (env) => l(env) - r(env);
        case '*': return (env) => l(env) * r(env);
        case '/': return (env) => { const d = r(env); return d === 0 ? NaN : l(env) / d; };
        case '^': return (env) => Math.pow(l(env), r(env));
      }
      break;
    }
    case 'call': {
      const fn = FUNCS[expr.name];
      const args = expr.args.map(compileExpr);
      return (env) => fn(args.map((a) => a(env)));
    }
  }
  throw new Error('unknown expr kind');
}
