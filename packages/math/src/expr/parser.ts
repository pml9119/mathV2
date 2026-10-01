import type { Expr } from './ast.js';
import { isFunctionName, functionArity } from './ast.js';
import type { Token } from './lexer.js';

// Pratt parser：绑定力（binding power）决定优先级
//   ^   : 21 (右结合)
//   * / : 20
//   + - : 10
//   一元负 : 15 (低于 ^，所以 -2^2 = -(2^2)；高于 * / ，-2x = (-2)x)
export function parse(tokens: Token[]): Expr {
  let pos = 0;

  const peek = (): Token => tokens[pos];
  const next = (): Token => tokens[pos++];

  const BIND: Record<string, number> = { '+': 10, '-': 10, '*': 20, '/': 20, '^': 30 };

  const parseExpr = (minBp: number): Expr => {
    let left = parseUnary();

    while (true) {
      const t = peek();
      if (t.type === 'eof' || t.type === 'rparen' || t.type === 'comma') break;

      // 隐式乘法：a(b) 或 (a)(b) 或 2a 或 2(a)
      const implicitMul = (t.type === 'lparen' && left.kind !== 'num' && left.kind !== 'call')
        || (t.type === 'ident' && left.kind === 'num')
        || (t.type === 'num' && (left.kind === 'var' || left.kind === 'call'));
      if (implicitMul) {
        // 左是变量（如 x）后跟 ident（如 x y？ 少见，跳过）或 左是变量/数 后跟 (
        if (t.type === 'lparen') {
          // 变量 × 括号：x(x+1) —— 但注意函数调用已经在 parsePrimary 处理（ident 后跟 lparen 且是函数名）
          // 这里 left 是 var/num/call，后跟 ( → 隐式乘
          next();
          const right = parseExpr(0);
          expectRparen();
          left = { kind: 'bin', op: '*', left, right };
          continue;
        }
        if (t.type === 'ident') {
          // 2x / 2pi 等（lexer 可能已插 *，这里兜底）
          next();
          // 常量 pi/e 在 lexer 已转 num；这里 ident 是变量
          left = { kind: 'bin', op: '*', left, right: { kind: 'var', name: t.name } };
          continue;
        }
      }

      if (t.type !== 'op') break;
      const op = t.op;
      const bp = BIND[op];
      if (bp <= minBp) break;
      next();

      // 右结合（^）用 bp-1，左结合用 bp
      const right = parseExpr(op === '^' ? bp - 1 : bp);
      left = { kind: 'bin', op, left, right };
    }
    return left;
  };

  const parseUnary = (): Expr => {
    const t = peek();
    if (t.type === 'op' && t.op === '-') {
      next();
      const operand = parseExpr(15); // 一元负绑定力 15（低于 ^30、高于 *20）
      return { kind: 'neg', operand };
    }
    if (t.type === 'op' && t.op === '+') {
      next();
      return parseExpr(15);
    }
    return parsePrimary();
  };

  const parsePrimary = (): Expr => {
    const t = next();
    if (t.type === 'num') return { kind: 'num', value: t.value };
    if (t.type === 'ident') {
      // 函数调用？ident 后跟 ( 且是函数名
      if (peek().type === 'lparen' && isFunctionName(t.name)) {
        next();
        const args: Expr[] = [];
        if (peek().type !== 'rparen') {
          args.push(parseExpr(0));
          while (peek().type === 'comma') {
            next();
            args.push(parseExpr(0));
          }
        }
        expectRparen();
        const arity = functionArity(t.name);
        if (arity && (args.length < arity[0] || args.length > arity[1])) {
          throw new Error(t.name + ' expects ' + arity[0] + (arity[1] === Infinity ? '+' : '-' + arity[1]) + ' args');
        }
        return { kind: 'call', name: t.name, args };
      }
      return { kind: 'var', name: t.name };
    }
    if (t.type === 'lparen') {
      const e = parseExpr(0);
      expectRparen();
      return e;
    }
    throw new Error('Unexpected token: ' + JSON.stringify(t));
  };

  const expectRparen = () => {
    const t = next();
    if (t.type !== 'rparen') throw new Error('Expected ) got ' + JSON.stringify(t));
  };

  const expr = parseExpr(0);
  if (peek().type !== 'eof') throw new Error('Trailing tokens: ' + JSON.stringify(peek()));
  return expr;
}
