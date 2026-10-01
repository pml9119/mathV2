// 冒烟演示：表达式引擎求值（对齐原型验证）
import { evaluate, createFunction } from '../expr/index.js';

console.log('=== 表达式引擎 冒烟测试 ===');
console.log('x^2 - 4x + 3 在 x=2.5 →', evaluate('x^2 - 4x + 3', { x: 2.5 }));   // 期待 0.5625
console.log('2(x+1)^2 在 x=2 →', evaluate('2(x+1)^2', { x: 2 }));                // 18
console.log('sin(pi/2) →', evaluate('sin(pi/2)'));                                // 1
console.log('a(x-h)^2+k 在 a=1,h=2,k=-1,x=4 →', evaluate('a(x-h)^2+k', { a: 1, h: 2, k: -1, x: 4 })); // 3

// 二次函数采样验证（自适应采样路线的前置）
const f = createFunction('x^2 - 4x + 3');
console.log('\n=== 采样 10 点 ===');
for (let x = -1; x <= 5; x += 0.5) {
  console.log('x=' + x.toFixed(1).padStart(4) + '  y=' + f({ x }).toFixed(3).padStart(8));
}
console.log('\n顶点 (2,-1): f(2) =', f({ x: 2 }), '✓');
