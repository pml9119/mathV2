# packages/math 可视化引擎 · 技术设计

> 版本 v0.1（**设计稿**）· 纯 TS + SVG · 零运行时依赖 · 播放包可用
>
> ⚠️ **阅读须知：本文是"当初打算怎么做"的设计记录，不是已落地代码的清单。**
> 实际实现与本文的差异（详见 `docs/PROJECT-MAP.md` §5.1）：
>
> | 本文 §1 列出的路径 | 实际 |
> | --- | --- |
> | `expr/compile.ts` `expr/eval.ts` `expr/builtins.ts` | 合并进 `expr/ast.ts`（`compileExpr` + 函数白名单） |
> | `coord/grid.ts` `coord/axes.ts` | 合并进 `coord/viewport.ts`（`niceTicks`） |
> | `plot/pathgen.ts` `plot/styles.ts` | 未实现；渲染器直接拼 SVG 字符串 |
> | `geo/constraints.ts` `geo/trace.ts` | 约束类型并入 `geo/model.ts`；trace 未实现 |
> | `render/numberLine.ts` `render/formula.ts` | 未实现 |
> | `interact/`（drag/hit/slider） | 未实现；拖动由 Bento 外壳的 Moveable 承担 |
> | `engine.ts`（统一入口） | 未实现；入口是 `src/index.ts` 的 barrel 导出 |
>
> 已实现且有测试的模块：`expr`(4) / `coord` / `plot`(sampler+implicit) / `render`(functionGraph+geoBoard+implicit)
> / `geo`(model+solver+measure) / `geo3d`(model+render) / `stats`(summary+regress+dist) / `lecture`(model+engine)。

## 0. 定位与硬约束

- **零依赖**：不引 mathjs / Desmos / GeoGebra 等重型库（播放包体积红线 ≤60KB，表达式引擎 ≤15KB）；
- **纯 TS + SVG**：渲染结果是普通 SVG 元素，可被编辑器选中、可 morph、可打印、可静态化；
- **一份代码双壳**：编辑器（可交互、可选中）与播放器（只读放映、拖参数探索）共用同一引擎；
- **数据即配置**：函数图/几何板都以 JSON 配置存进 Deck（FunctionGraphConfig / GeoBoardConfig），AI 可直接生成，不是图片。

---

## 1. 模块结构

```
packages/math/
├── expr/                  # 表达式引擎（核心子模块）
│   ├── lexer.ts           #   分词（数字/标识符/运算符/函数）
│   ├── parser.ts          #   Pratt 解析 → AST（优先级爬升）
│   ├── ast.ts             #   AST 节点类型
│   ├── compile.ts         #   AST → 闭包数组（编译求值，比解释快 10x）
│   ├── eval.ts            #   闭包求值（环境 env: {x, a, b, c, t…}）
│   └── builtins.ts        #   数学函数白名单子集
├── coord/                 # 坐标系
│   ├── viewport.ts        #   world↔screen 映射、缩放/平移（以光标为锚）
│   ├── grid.ts            #   nice-ticks 刻度生成、网格线
│   └── axes.ts            #   坐标轴/箭头/刻度标签
├── plot/                  # 函数绘图
│   ├── sampler.ts         #   自适应采样（细分 + 断点检测）
│   ├── pathgen.ts         #   采样点 → SVG path（polyline）
│   └── styles.ts          #   曲线样式（颜色/虚线/粗细，对接 themeRefs）
├── geo/                   # 几何画板
│   ├── model.ts           #   几何对象模型（Point/Line/Segment/Circle/Polygon）
│   ├── constraints.ts     #   约束类型（onLine/onCircle/perpendicular/…）
│   ├── solver.ts          #   拖拽约束求解（迭代投影）
│   ├── measure.ts         #   测量（长度/角度/面积/斜率）
│   └── trace.ts           #   动点轨迹（记录/回放/参数化采样）
├── interact/              # 交互层
│   ├── drag.ts            #   Pointer 拖拽（pointer capture + 世界坐标换算）
│   ├── hit.ts             #   命中测试（点/形状，可选中）
│   └── slider.ts          #   参数滑块（math-viz 用）
├── render/                # 元素渲染器
│   ├── functionGraph.ts   #   FunctionGraph 元素 → SVG
│   ├── geoBoard.ts        #   GeoBoard 元素 → SVG
│   ├── numberLine.ts      #   NumberLine 元素 → SVG
│   └── formula.ts         #   Formula 元素（LaTeX），play 时静态化
└── engine.ts              # 统一入口 MathEngine(element, container, opts)
```

---

## 2. 表达式引擎（expr/）

### 2.1 语法子集（支持）

```
数字、标识符、+ - * / ^、括号、隐式乘法(2x, x(x+1), 3sin(x))
函数：sin cos tan asin acos atan sqrt abs ln log exp pow floor ceil round sign min max mod
常量：pi e
（明确不做：矩阵/复数/代数方程求解/多变量求值域）
```

### 2.2 管线

```
输入字符串 'x^2 - 4x + 3'
  → lexer 分词（含隐式乘法插入：数字后跟标识符/左括号 → 插入 *）
  → Pratt parser 解析（^ 右结合、优先级正确）→ AST
  → compile.ts 编译为闭包数组：每个节点返回 (env: Env) => number
  → eval.ts 调用 compiledFn({x: 2.5})  → 0.5625
```

### 2.3 性能与安全

- 编译一次，采样复用（500~2000 点 < 1ms）；
- 表达式只来自 Deck JSON（用户/AI 生成），**无 eval/Function 构造**，白名单函数防注入；
- 求值错误（NaN/Infinity/除零）不抛异常，返回 NaN 供采样器断开处理。

---

## 3. 坐标系（coord/）

### 3.1 world ↔ screen 映射

```
// viewport = { xMin, xMax, yMin, yMax }（世界坐标，y 向上）
xScreen = (xWorld - xMin) / (xMax - xMin) * width
yScreen = height - (yWorld - yMin) / (yMax - yMin) * height   // SVG y 向下翻转

// 反向（鼠标 → 世界）
xWorld = xMin + (xScreen / width)  * (xMax - xMin)
yWorld = yMin + (1 - yScreen / height) * (yMax - yMin)
```

### 3.2 缩放/平移（以光标为锚）

```
// 缩放：滚轮/双指。保持光标下的世界点不动（无缝缩放）
//   wx = worldAt(cursor)（缩放前）
//   xMin' = wx - (xMin - wx) * factor   （factor = 1/1.12 或 1.12）
//   xMax' = wx + (xMax - wx) * factor
//   y 同理（factor 取倒数保持比例）

// 平移：空格/中键拖拽/双指滑动 —— 直接移动 4 条边界
```

### 3.3 nice-ticks（网格刻度）

```
// 目标刻度间距 step ≈ visible-range / targetCount（取 1/2/5 × 10^k）
// k = floor(log10(step)); base = step / 10^k;
// base = 1 if base<1.5, 2 if base<3.5, 5 if base<7.5, else 10
// 主轴取 step 的整数倍；次网格 = step/5 或 step/2
// 标签格式：整数直接显示，小数保留 k 位（1.2、0.5），大数用 ×10^n
```

---

## 4. 函数绘图（plot/）

### 4.1 自适应采样（核心算法）

```
sample(f, viewport):
  // 1. 粗采样：N0 = 100 个等距 x
  // 2. 递归细分：对每个相邻段 (x1,f1)-(x2,f2)
  //    计算中点真实值 fM = f((x1+x2)/2)
  //    线性插值预测 fL = (f1+f2)/2
  //    若 |fM - fL| > max(eps_abs, eps_rel * span) 且深度 < MAX_DEPTH → 细分（栈式）
  //    eps_abs ≈ 0.5px 对应的世界值，eps_rel ≈ 1e-3
  // 3. 断点检测：
  //    a) |f(x)| > 1e7 → 视为渐近线，断开
  //    b) 相邻值 |f1-f2| > 大阈值 且 符号相反（跳变）→ 断开
  //    c) NaN / Inf → 断开
  // 4. 输出 segments: number[][]（每段 = 连续点列）

// 复杂度：平滑函数 ~150 点；tan 等震荡函数 ~2000 点，单帧 < 2ms
```

### 4.2 渲染

```
// 每段 → polyline（points 属性），可加平滑（3 次 Catmull-Rom 转贝塞尔，默认关闭：
//   数学显示要忠实，polyline 已足够，且 morph 需要控制点对位）
// 描点/零点/顶点：由配置 {markers:[{type:'zero'|'vertex'|'intersect'|'point', x?, expr?}]}
//   zero → 二分/牛顿求根；vertex → 求导置零（数值微分 + 二分）
```

### 4.3 样式与主题

```
// 曲线颜色默认取主题 accent；可逐条配置 {color, dash, width, label}
// 记录 themeRefs（Bento 模式）：改主题色自动重写曲线颜色
```

---

## 5. 几何画板（geo/）【核心差异化】

### 5.1 对象模型

```
type GeoObject =
  | Point    { id, x, y, kind: 'free'|'locked'|'constraint', on: Constraint[] }
  | Line     { id, through: [pointId, pointId] }         // 无限直线
  | Segment  { id, from: pointId, to: pointId }          // 线段（能量）
  | Circle   { id, center: pointId, radiusPoint?: pointId, radius?: number }
  | Polygon  { id, verts: pointId[] }
  | Measure  { id, type: 'length'|'angle'|'area'|'slope'|'ratio', refs, label }
  | Text     { id, at: pointId|'free', content }

// 约束（附着在 Point 上，决定拖拽行为）
type Constraint =
  | { type:'onLine', lineId }
  | { type:'onSegment', segmentId }
  | { type:'onCircle', circleId }
  | { type:'perpendicular', basePointId, toPointId }   // 垂直
  | { type:'parallel', toLineId }
  | { type:'fixedX' } | { type:'fixedY' } | { type:'fixedPoint' }
  | { type:'equalLength', otherSegmentId }
  | { type:'midpoint', aId, bId }     // 中点约束

// 依赖图（拖拽 P → 级联重算）
// 每个对象的父依赖：Point 依赖它 on[] 的对象；Segment/Circle 依赖端点；Measure 依赖测量对象
// 传播：自 P 向下做拓扑更新（dirty 集合 + 每帧最多 2 遍收敛，防无限环）
```

### 5.2 拖拽约束求解（solver.ts）

```
// 鼠标拖动 point P 到世界位置 W
// 1. 若 P 是自由点：P = W（直接移动）
// 2. 若 P 是约束点：迭代投影（Gauss-Seidel 风格）
//    P' = W
//    for iter in 1..MAX_ITER(8):
//      for c in P.on:
//        P' = project(P', c)
//        若 P' 已收敛（|P' - 上一轮| < 1e-6）→ break
//    P = clamp_to_bounds(P')

// project(P, c)（解析投影，非数值优化）:
//   onLine(P)      → 垂足：P_proj = A + dot(P-A, dir)/dot(dir,dir) * dir
//   onSegment      → 垂足 + 钳制到端点 [0,1]
//   onCircle(O,r)  → O + (P-O)*r/|P-O|（缩放到半径）
//   perpendicular  → 在过 base 且 ⊥ 目标方向的直线上投影
//   midpoint(a,b)  → 直接设为 (a+b)/2
//   equalLength    → 平移另一端使长度相等（V1 简化：该点视为 free，V2 再实现）

// 相交点（line×line / line×circle 交点）不是可拖点：拖其父对象，交点自动重算
```

### 5.3 测量（measure.ts）

```
// length: 两点欧氏距离 |AB|
// angle: 三点夹角（atan2 差），显示 °
// area: 多边形鞋带公式（shoelace），可绝对值 + 单位
// slope: (y2-y1)/(x2-x1)
// ratio: 两段长度比（可用于黄金分割教学）
// 每次级联重算后同步更新 Measure 文字（SVG <text>，非 HTML overlay，便于静态化）
```

### 5.4 动点轨迹（trace.ts）

```
// 两种模式：
// 1) 拖拽记录：P 被拖时把世界坐标 append 进轨迹数组（限长 ~2000 点），
//    渲染为 polyline；可选「擦除轨迹」。
// 2) 参数化（V1 不做，V2 再考虑）：点由 (f(t), g(t)) 定义，t∈[0,2π] 自动采样整条轨迹
//    —— 用于「圆的参数方程」「摆线」等经典演示
```

---

## 6. 交互层（interact/）

### 6.1 拖拽（drag.ts）

```
// Pointer Events 统一鼠标/触摸/笔：
//   pointerdown on 点/形状 → setPointerCapture → 进入拖拽态
//   pointermove → screenToWorld → 调用 solver.drag(point, world)
//   pointerup → 提交一笔（编辑器内记一次 undo 历史）
// 缩放/平移：滚轮（ctrl/meta 放大）、双指 pinch、空格/中键拖拽
//   （与编辑器画布手势一致，Bento canvas 已验证此交互模型）
```

### 6.2 命中测试（hit.ts）

```
// 点：世界半径 rpx = 6px / scale（屏幕像素恒定，缩放不变）→ 距离 < rpx 即命中
// 线段/圆/多边形：到几何的距离 < 4px/scale
// 编辑器模式：命中后显示选择框（复用通用元素的 select 逻辑）；播放器模式：仅可拖
```

### 6.3 参数滑块（slider.ts，math-viz）

```
// 元素内内嵌一组 <input type=range>（或自绘 SVG 滑块）
// 拖动 → 更新 env {a,h,k…} → 重采样 → 重绘曲线（60fps，只重绘 path 的 d 属性）
// 支持动画：t 从 0→1 播放参数流（滑杆 + 曲线画面同步，Bento anim.ts 可驱动）
```

---

## 7. 元素渲染（render/）

| 元素 | SVG 结构 | 交互（编辑 | 播放） |
|---|---|---|
| functionGraph | viewport 层（grid + axes + path + markers） | 编辑：缩放平移/选中；播放：拖参数滑块 |
| geoBoard | viewport 层（objects + measures + trace） | 编辑/播放：都可拖点（教学互动） |
| numberLine | 一维轴 + 开闭括号 + 区间填充 | 点击切换开闭（编辑）；播放只读 |
| formula | LaTeX → 静态 SVG（temml，Bento 同款） | 编辑：选中 + 文本编辑；播放：静态 |

```
// 渲染模式（与通用渲染器共享 opts）：
//   editor  ：完整交互 + 占位符 + 可选中
//   present ：可拖点/拖滑块（教学探索），隐藏编辑手柄
//   print   ：静态化（所有交互元素渲染为最终帧）
// 所有 SVG 内部 CSS 必须 scope（Bento 血泪教训：svg <style> 会全局泄漏）
```

---

## 8. 题型组件（基于 WIDGET_SPEC）

| 组件 | 核心交互 | packages/math 复用 | cf:event 回传 |
|---|---|---|---|
| math-select | 选项点选 | — | {event:'complete', score} |
| math-fill | 答案输入 + 容差比较 | 表达式求值（算式答案可评） | {event:'score'} |
| math-graph **画图题** | 在坐标系**手绘曲线/点** → 提交比对 | render/grid + drag + hit | {event:'complete', score, similarity} |
| math-geo **几何探索** | 拖拽动点 + 实时测量 + 吸附直角 | geo/(model+solver+measure) | {event:'interact', measures} |
| math-step **分步解题** | 步骤逐条点开 | — | {event:'progress', step} |
| math-viz **参数探索** | 拖滑块看曲线变化 | plot/ + slider | {event:'interact'} |

### 8.1 画图题比对算法（math-graph 评分）

```
// 学生画的 polyline 与目标曲线相似度：
// 1. 对目标曲线采样 M=80 个基准点；
// 2. 学生 polyline 等弧长重采样 M 个点（linear interpolate）；
// 3. 计算平均欧氏距离 avgDist（世界单位）；
// 4. tolerance = max(0.06 * 可视范围, 0.25)，score = clamp(1 - avgDist/tolerance)
// 5. score >= 0.7（容差 2 倍内）→ 「正确」
// 改进（V2）：方向性匹配（上升/下降段）、关键点（零点/顶点）加权
```

### 8.2 几何探索教学场景（V1 内置模板）

| 模板 | 演示内容 | 约束 |
|---|---|---|
| 勾股定理 | 拖 C 看 a²+b² vs c²；「吸附为直角」按钮 | C onCircle(AB 直径圆) |
| 内角和 | 拖三角形顶点看三内角和恒 180° | free + measure |
| 圆切线 | 拖 P 看切线 ⊥ 半径 | P onCircle + perpendicular |
| 动点轨迹 | 拖 P 记录轨迹（圆/摆线） | free + trace |

---

## 9. 播放包集成

```
// 编辑器侧：packages/math 纯 TS，由编辑器壳 import
// 播放器侧：tree-shake 后只打包 math 引擎（<=60KB）
// 导出单文件：与通用渲染器一同内联，零外部依赖
// formula 元素在导出时静态化为 SVG（temml 渲染），播放包不含 KaTeX 运行时
```

---

## 10. 性能与体积预算

| 项 | 预算 |
|---|---|
| 表达式引擎 | <= 15KB (map) |
| math 引擎合计 | <= 60KB (map) |
| 函数图单帧采样 | < 2ms（2000 点） |
| 几何板拖拽重绘 | 60fps（只重绘 dirty 对象） |
| 播放包整体增量 | <= 80KB |

---

## 11. 实现里程碑（math 专项）

| M | 内容 | 验收 |
|---|---|---|
| M1 | expr/ + coord/ + 函数图静态渲染 | 输入表达式显示曲线，可缩放平移 |
| M2 | plot/ 自适应采样 + markers | tan/对数/渐近线正确分段 |
| M3 | geo/ model + constraints + solver + measure | 拖点正确投影，测量实时更新 |
| M4 | trace/ 动点轨迹 + slider/ | 拖 P 出轨迹；拖 a/h/k 看抛物线 |
| M5 | 题型组件 math-graph/geo/viz/step 接入 WIDGET_SPEC | 组件离线可用、cf:event 回传 |
| M6 | formula 静态化 + 播放包集成 + 性能收敛 | 单文件包含数学引擎，离线可播 |

---

## 12. 风险与决策点

| # | 风险/决策 | 说明 | 建议 |
|---|---|---|---|
| 1 | **表达式语法范围** | 支持到什么程度（隐式乘法/自定义函数） | V1 子集（见 2.1），V2 再加 |
| 2 | **几何约束求解稳定性** | 多约束组合可能不收敛/抖动 | 解析投影 + 迭代上限 + 收敛阈值；文档记录已知退化 |
| 3 | **画图题评分公平性** | 手绘 vs 精确曲线的容差 | 见 8.1；关键字「关键点」加权可选 |
| 4 | **KaTeX vs temml** | PPTist 用 hfmath，Bento 用 temml | temml（MIT、小、静态化友好） |
| 5 | **与通用元素的关系** | 函数图是否作为独立元素 | 独立元素（functionGraph/geoBoard），不塞进通用 shape |
