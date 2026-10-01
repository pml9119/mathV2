// 表达式引擎对外 API
export * from './ast.js';
export * from './lexer.js';
export * from './parser.js';

import type { CompiledFn, Env, Expr } from './ast.js';
import { compileExpr } from './ast.js';
import { tokenize } from './lexer.js';
import { parse } from './parser.js';

/**
 * 解析并编译一个数学表达式字符串。
 * 返回可复用的求值函数（编译一次，采样复用）。
 *
 * 示例：
 *   const f = createFunction('x^2 - 4x + 3');
 *   f({ x: 2.5 }) // → 0.5625
 */
export function createFunction(src: string): CompiledFn {
  const ast: Expr = parse(tokenize(src));
  return compileExpr(ast);
}

/**
 * 表达式求值（单次，方便测试/调试）。
 * 支持隐式乘法、函数、常量 pi/e。
 * 返回 NaN 表示错误/未定义（不抛异常）。
 */
export function evaluate(src: string, env: Env = {}): number {
  try {
    return createFunction(src)(env);
  } catch {
    return NaN;
  }
}

/** 校验表达式是否合法（可解析）。 */
export function isValidExpr(src: string): boolean {
  try {
    tokenize(src);
    parse(tokenize(src));
    return true;
  } catch {
    return false;
  }
}
