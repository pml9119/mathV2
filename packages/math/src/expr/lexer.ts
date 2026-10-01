// 词法分析：把数学字符串切成 token 流
// 支持：数字、标识符（变量/函数）、+ - * / ^、括号、逗号、常量 pi/e
// 隐式乘法：2x, x(x+1), 3sin(x), 2(x+3) 等自动插入 *

export type Token =
  | { type: 'num'; value: number }
  | { type: 'ident'; name: string }
  | { type: 'op'; op: '+' | '-' | '*' | '/' | '^' }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'comma' }
  | { type: 'eof' };

const isDigit = (c: string) => c >= '0' && c <= '9';
const isAlpha = (c: string) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
const isAlnum = (c: string) => isAlpha(c) || isDigit(c);

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = input.trim();

  while (i < s.length) {
    const c = s[i];

    // 空白
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }

    // 数字（支持小数、科学计数）
    if (isDigit(c) || (c === '.' && isDigit(s[i + 1]))) {
      let j = i;
      while (j < s.length && (isDigit(s[j]) || s[j] === '.')) j++;
      // 科学计数法 1e5 / 1.5e-3
      if (j < s.length && (s[j] === 'e' || s[j] === 'E')) {
        let k = j + 1;
        if (k < s.length && (s[k] === '+' || s[k] === '-')) k++;
        if (k < s.length && isDigit(s[k])) {
          while (k < s.length && isDigit(s[k])) k++;
          j = k;
        }
      }
      const value = parseFloat(s.slice(i, j));
      tokens.push({ type: 'num', value });
      i = j;
      continue;
    }

    // 标识符（变量/函数）
    if (isAlpha(c)) {
      let j = i;
      while (j < s.length && isAlnum(s[j])) j++;
      const name = s.slice(i, j);
      // 常量替换（pi → 3.14159..., e → 2.71828...）
      if (name === 'pi') { tokens.push({ type: 'num', value: Math.PI }); i = j; continue; }
      if (name === 'e') { tokens.push({ type: 'num', value: Math.E }); i = j; continue; }
      tokens.push({ type: 'ident', name });
      i = j;
      continue;
    }

    // 运算符
    if (c === '+' || c === '-' || c === '*' || c === '/' || c === '^') {
      tokens.push({ type: 'op', op: c });
      i++;
      continue;
    }
    if (c === '(') { tokens.push({ type: 'lparen' }); i++; continue; }
    if (c === ')') { tokens.push({ type: 'rparen' }); i++; continue; }
    if (c === ',') { tokens.push({ type: 'comma' }); i++; continue; }

    throw new Error('Unexpected character: ' + c + ' (at position ' + i + ')');
  }

  tokens.push({ type: 'eof' });

  // 隐式乘法插入（在相邻 token 间插 *）
  const result: Token[] = [];
  for (let k = 0; k < tokens.length; k++) {
    const cur = tokens[k];
    result.push(cur);
    const next = tokens[k + 1];
    if (!next || next.type === 'eof') continue;

    // 数字后跟标识符 / ( ：2x, 2(x+3), 2sin(x)；2pi 中 pi 已转 num → num-num 也是隐式乘
    if (cur.type === 'num' && (next.type === 'ident' || next.type === 'lparen' || next.type === 'num')) {
      result.push({ type: 'op', op: '*' });
    }
    // ) 后跟 ( 或数字或标识符：)(x+1), )2x, )x
    else if (cur.type === 'rparen' && (next.type === 'lparen' || next.type === 'num' || next.type === 'ident')) {
      result.push({ type: 'op', op: '*' });
    }
    // ident 后跟 (：函数调用（但如果 ident 是变量后跟 ( 也是隐式乘，如 x(x+1)）→ 只对"非函数名"的 ident 插入
    // 注意：x(x+1) 中 x 是变量，应插 *；sin(x) 中 sin 是函数名，不插。
    else if (cur.type === 'ident' && next.type === 'lparen') {
      // 暂不处理，解析器会区分函数 vs 隐式乘
    }
  }
  return result;
}
