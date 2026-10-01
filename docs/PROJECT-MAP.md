# mathV2 项目梳理 · 流程图 · 使用说明

> 逐文件通读后的完整梳理。基准：精简后工作区（676 文件 / 34.17 MB，其中 `node_modules` 26.78 MB，
> 工程本体约 **7.4 MB**）。所有结论均来自实读源码，非推测。

---

## 0. 一句话概括

**这是一个"数学课件编译器"**：把数学内容写成 JS/TS 生成器脚本，脚本调用自研数学引擎把曲线算成
SVG 片段，再把这些片段塞进一个自带编辑器+放映器的 Bento 单文件壳里，最后注入一段控制条脚本，
产出一个**双击即用、零依赖、可播放/暂停/拖动的动图课件**。

---

## 1. 现状快照

| 指标 | 值 |
| --- | --- |
| 总大小 / 文件数 | 34.17 MB / 676 |
| 工程本体（除 node_modules） | ~7.4 MB |
| 成品课件 | 2 份（动点 13 页 1.04 MB、真题精讲 17 页 1.13 MB） |
| 骨干脚本 | 6 个（2 生成器 + 1 控制器 + 1 注入器 + 2 拍屏 + 2 校验） |
| 数学引擎 | 34 个 TS 源文件 / 8 个模块 |
| 测试 | 7 个文件 / 39 个用例（全通过） |
| 文档 | 6 篇 |

### 1.1 成品用到了引擎的多少？

| 生成器 | 实际 import |
| --- | --- |
| `build-deck.mjs` | `plotImplicit, ellipseF, circleF, parabolaF, renderImplicitSVG` |
| `build-exams.mjs` | `plotImplicit, ellipseF, circleF, renderImplicitSVG` |

**即：两份成品只用到 `plot/implicit` + `render/implicit` + `coord/viewport` 三个模块。**
其余 5 个模块（`expr`/`plot/sampler`/`geo`/`geo3d`/`stats`/`lecture`/`render/functionGraph`/`render/geoBoard`）
是**已实现、已测试、但两份课件未使用**的库能力——它们是给"下一门课"准备的，不是死代码。

---

## 2. 文件全清单与角色

### 2.1 根目录

| 文件 | 角色 |
| --- | --- |
| `conic-moving-point.bento.html` | ★ 成品一：圆锥曲线的动点问题（13 页） |
| `conic-exams.bento.html` | ★ 成品二：期中真题精讲（17 页） |
| `README.md` | 工程说明（精简后已重写） |
| `package.json` | npm workspace 根（`packages/*`）+ 4 个脚本 |
| `package-lock.json` | 依赖锁 |
| `tsconfig.base.json` | TS 基础配置（ES2022 / strict / DOM） |
| `serve.mjs` | 16 行静态服务器（给编辑器调试用） |
| `.gitignore` | 忽略 `node_modules/`、`dist/`、`*.tsbuildinfo` |

### 2.2 `tools/` — 骨干

| 文件 | 角色 | 关键点 |
| --- | --- | --- |
| `build-deck.mjs` | ★ 动点课件生成器（532 行） | 内容 + 全部图形；`--embed` 写回壳 |
| `build-exams.mjs` | ★ 真题精讲生成器（442 行） | 5 道真题 × (题干+2 讲解) + 封面 + 小结 |
| `animation-controller.js` | ★ 动图控制条（111 行） | IIFE + rAF 主循环，驱动 SMIL 时间轴 |
| `inject-controller.mjs` | 控制条幂等注入器（32 行） | 已修幂等缺陷（见 §5.4） |
| `check-doc.mjs` | 成品完整性校验（21 行） | `node tools/check-doc.mjs <file>` |
| `check-overflow.mjs` | CDP 排版溢出检查（17 行） | 调 `window.bento.validate()` |
| `shoot-deck.mjs` | 动点逐页 a/b 双帧截图（82 行） | 参数化：`<file> <outdir> [--first N] [--last N]` |
| `shoot-exams2.mjs` | 真题精讲逐页截图（58 行） | 目标路径**硬编码** |
| `deck.json` | 生成的文档 JSON（392 KB） | 核对用 |
| `exams.json` | 生成的文档 JSON（493 KB） | 核对用 |

### 2.3 `packages/math/` — 数学引擎（纯 TS 零依赖）

| 模块 | 文件 | 导出 |
| --- | --- | --- |
| `expr/` | `lexer.ts` `parser.ts` `ast.ts` `index.ts` | `tokenize` `parse` `compileExpr` `createFunction` `evaluate` `isValidExpr` |
| `coord/` | `viewport.ts` `index.ts` | `worldToScreen` `screenToWorld` `zoomAt` `pan` `niceTicks` |
| `plot/` | `sampler.ts` `implicit.ts` `index.ts` | `sampleAdaptive` `countPoints` `plotImplicit` `ellipseF` `hyperbolaF` `parabolaF` `circleF` |
| `render/` | `functionGraph.ts` `geoBoard.ts` `implicit.ts` `index.ts` | `renderFunctionGraphSVG` `renderGeoBoardSVG` `renderImplicitSVG` |
| `geo/` | `model.ts` `solver.ts` `measure.ts` `index.ts` | `createPoint` `projectOntoLine/Circle` `dragWithConstraints` `propagate` `measure` `formatMeasure` |
| `geo3d/` | `model.ts` `render.ts` `index.ts` | `rotX/Y` `projectOrtho/Iso/Persp` `prism/pyramid/cylinder/cone/box` `renderGeom3DSVG` `renderVertexLabels` |
| `stats/` | `summary.ts` `regress.ts` `dist.ts` `index.ts` | `mean/median/mode/variance/stdDev/range/quantile` `linearRegression` `normalPdf/Cdf` `binomialPmf` `combination` |
| `lecture/` | `model.ts` `engine.ts` `index.ts` | `Problem`/`LectureStep`/`VizConfig` 类型 `validateProblem` `renderProblemViz` `applyStepViz` |
| `demo/` | `smoke.ts` `graph.ts` `implicit.ts` `geoBoard.ts` `geo3d.ts` `lecture.ts` | 冒烟演示，运行后把 HTML 写到 `dist/demo/` |

`tests/` 7 个文件 → 39 用例：expr 9 / plot 4 / implicit 4 / geo 4 / geo3d 7 / stats 7 / lecture 4。

### 2.4 其他

| 路径 | 角色 |
| --- | --- |
| `docs/` | 6 篇：2 篇实现文档 + 1 篇教案 + 2 篇引擎设计 + 本梳理 |
| `input/*.png` | 6 张真题原始截图（真题精讲线的输入） |
| `shots/svg/` | 动点 13 页 × a/b 双帧 = 26 张（动效证据） |
| `shots/exams3/` | 真题精讲 17 页截图 |

---

## 3. 流程图

### 3.1 总数据流（源码 → 可放映成品）

```
┌──────────────────────┐
│ 人工输入             │
│  · docs/教案-*.md    │  ← 真题精讲的内容源头
│  · input/*.png       │  ← 6 道真题截图
│  · 直接写在生成器里  │  ← 动点课件的内容直接内联在 build-deck.mjs
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│ ① 生成器  tools/build-deck.mjs │ tools/build-exams.mjs    │
│    · 画板工厂 T/R/E/LN/PA/svgEl/dot（text/shape/path…）   │
│    · 图形工厂 ellipseFig/relFig/chordFig/probNFg          │
│    · 调引擎：plotImplicit → renderImplicitSVG → 拼 frags  │
│    · docJson()：JSON.stringify 后把 < 转义为 \u003c        │
└──────────┬───────────────────────────────┬───────────────┘
           │ 无参数                        │ --embed
           ▼                               ▼
   ┌───────────────┐         ┌────────────────────────────────┐
   │ tools/deck.json│         │ 单文件壳 .bento.html            │
   │ tools/exams.json│        │ 只替换 <script id="bento-doc"> │
   │ （调试/核对）  │         │ 壳内其余部分（bento-rt 运行时）│
   └───────────────┘         │ 原样保留                       │
                             └───────────┬────────────────────┘
                                         │ node tools/inject-controller.mjs
                                         ▼
                          ┌──────────────────────────────────┐
                          │ 注入 <!-- animctl:START/END -->  │
                          │ 包住 animation-controller.js     │
                          │ 幂等：重复执行字节不变            │
                          └───────────┬──────────────────────┘
                                      ▼
                          ┌──────────────────────────────────┐
                          │ ★ conic-*.bento.html（1.0~1.1 MB）│
                          │ 双击 → 浏览器 → 编辑器+放映器合一 │
                          └──────────────────────────────────┘
```

### 3.2 运行时：单文件壳里有什么

```
conic-moving-point.bento.html
├── <script id="bento-rt" type="bento/deflate-b64">
│      ~650 KB base64 压缩运行时（编辑器+放映器+渲染器）
│      → DecompressionStream('deflate-raw') 解压 → Blob URL → import()
├── <script id="bento-rt-css" type="bento/deflate-b64">   压缩 CSS
├── <script type="application/bento+json" id="bento-doc">
│      388 KB 文档 JSON（13 页 / 132 元素）
└── <!-- animctl:START --> … <!-- animctl:END -->
        └── <script> animation-controller.js 的内容 </script>
```

**渲染链条**：`bento-doc` JSON → `render.ts` 建幻灯片 DOM → 元素按 `type` 分派
（`text`/`shape`/`table`/`chart`/`svg`）→ `svg` 类型走 `sanitizeSvg` 白名单 → 内联进真实 DOM。

**关键约束**（文档 §4.4 实测）：sanitizer 显式放行 SMIL（`animate`/`animatemotion`/`mpath`
与 `dur`/`values`/`path` 等 timing 属性），但**禁止任何 `on*` 事件属性与外部 URL**。

### 3.3 引擎模块依赖图

```
                       ┌─────────┐
                       │  expr/  │  表达式：lexer → Pratt parser → AST → 编译闭包
                       │ (4 文件)│  白名单函数，无 eval/Function 构造
                       └────┬────┘
                            │ CompiledFn
              ┌─────────────┴──────────────┐
              ▼                            ▼
      ┌───────────────┐            ┌──────────────┐
      │  plot/        │            │  stats/      │
      │  sampler.ts   │ 自适应采样  │  summary     │
      │  implicit.ts  │ marching    │  regress     │
      │               │ squares     │  dist        │
      └───────┬───────┘            └──────────────┘
              │ Segment[] / ImplicitSegments
              ▼
      ┌───────────────────────────────────────────┐
      │  render/                                  │
      │   functionGraph.ts  ← Segment[]           │
      │   implicit.ts       ← ImplicitSegments    │
      │   geoBoard.ts       ← GeoContext          │
      └───────┬───────────────────────────────────┘
              │ SVG 字符串
              ▼
      ┌───────────────┐
      │  成品课件     │
      └───────────────┘

  横切模块：
   coord/viewport.ts ── worldToScreen / niceTicks ──→ plot 与 render 全都依赖
   geo/  model+solver+measure ──→ render/geoBoard
   geo3d/ model+render         ──→ (独立：旋转→投影→深度排序→SVG)
   lecture/ engine             ──→ 组合上面全部（Problem+VizConfig → SVG）
```

### 3.4 动图控制条（交互层）运行时循环

```
inject-controller.mjs 把 animation-controller.js 塞进 </body> 前
                       │
                       ▼  浏览器加载
        ┌──────────────────────────────────────────────┐
        │ IIFE 守卫：if (window.__mpcInstalled) return  │
        │ 注入 .mpc-ctl 样式（绝对定位浮条）            │
        │ states = Map<svg, {t,maxT,playing,speed,…}>   │
        └───────────────────┬──────────────────────────┘
                            ▼  requestAnimationFrame(tick)
        ┌───────────────────────────────────────────────────────┐
        │ 每帧：                                                 │
        │  1) 扫描  document.querySelectorAll(                   │
        │            ".reveal [data-anim], .bento-slide [data-anim]")
        │     未标记 svg.dataset.mpc → makePill(svg)             │
        │       makePill: 读所有 [dur] 取 maxT                   │
        │                 建 [⏸][range 0..1000][×1][7.3s/14s]    │
        │                 5 种事件全部 stopPropagation（防误触画布）│
        │  2) 可见性跃迁（getBoundingClientRect > 2px）           │
        │     false→true：t=0, playing=true, unpause, setCurrentTime(0)
        │     true→false：pauseAnimations()（换页即冻结）         │
        │  3) playing 且可见：                                    │
        │     t = (t + dt×speed) % maxT                          │
        │     svg.setCurrentTime(t)   ← 每帧强写，覆盖 SMIL 自然钟 │
        │     回写 range.value 与时间标签                         │
        └───────────────────────────────────────────────────────┘

   自愈：运行时若克隆/重建 slide DOM，svg.dataset.mpc 标记随元素走，
        下一帧检测到 states 里没有 → 重建浮条（旧浮条先删）
```

### 3.5 验证闭环

```
     ┌────────────────────┐
     │ node tools/        │
     │   build-*.mjs      │  自检：页数 / 元素数 / 每页重复 ID
     └─────────┬──────────┘
               ▼
     ┌────────────────────┐
     │ check-doc.mjs      │  JSON 可解析 / 页数 / bento-rt 块 / 控制条标记
     └─────────┬──────────┘
               ▼
     ┌──────────────────────────────┐
     │ Chrome/Edge --remote-         │
     │   debugging-port=9222         │
     └─────────┬────────────────────┘
               ▼
     ┌──────────────────────────────┐        ┌─────────────────────┐
     │ shoot-deck.mjs               │        │ check-overflow.mjs  │
     │  Target.createTarget          │        │  window.bento       │
     │  Target.activateTarget（防节流）│       │    .validate()      │
     │  等 11s 启动                   │        │  → 溢出/错误清单    │
     │  点「幻灯片放映」→ 每页两帧     │        └─────────────────────┘
     │  (t, t+3.5s) → ArrowRight      │
     └─────────┬────────────────────┘
               ▼
     shots/svg/slide-NN-{a,b}.png
               │
               ▼  System.Drawing 逐像素差分（阈值 RGB±14，隔 2px 采样）
     差分 > 0  ⇒ 该页动图确实在动 ✓
     差分 = 0  ⇒ 静态页（按设计）或动画失效 ✗
```

实测差分（文档 §7.1）：S1=176、S4/5=210、S6/7=848、S8/9=206、S10=683、
S11=0（按设计静止）、S12=0（无图形）、S13=211。

---

## 4. 使用说明

### 4.1 看课件（零门槛）

双击 `conic-moving-point.bento.html` 或 `conic-exams.bento.html` → 浏览器打开。

- **放映**：点顶栏「幻灯片放映」，`←/→` 翻页
- **动图控制条**（每幅动图右下角）：`⏸/▶` 播放暂停 · 拖动滑块定位 · `×1` 循环切 ×½/×1/×2 · 右侧显示 `已播/总时长`
- **编辑**：不点放映时就是画布，可拖动/改文字/改属性，保存导出

### 4.2 环境准备（改代码前）

```powershell
cd D:\Users\pml\Desktop\mathV2

# 依赖（根 node_modules 已含 typescript，全新环境才需要）
npm install

# ★ 关键前置：生成器 import 的是 packages/math/dist/，而 dist/ 在 .gitignore 里
#    全新克隆后必须先构建，否则 build-deck.mjs 直接报模块找不到
npm run build -w @mathppt/math
```

### 4.3 改动点课件（13 页）

```powershell
# 1) 改内容/图形 → 编辑 tools/build-deck.mjs
#    配色常量在文件顶部：BG / INK / ACCENT / AMBER / CARD
#    图形工厂：ellipseFig() / relFig() / chordFig()
#    页面：slides.push(slide(id, bg, transition, notes, elements))

# 2) 生成 JSON 并自检（应输出 slides: 13 | elements: 132）
node tools/build-deck.mjs

# 3) 写回成品壳（只替换 bento-doc 块，壳与控制条不受影响；幂等）
node tools/build-deck.mjs --embed

# 4) 校验
node tools/check-doc.mjs conic-moving-point.bento.html
```

### 4.4 改真题精讲（17 页）

```powershell
# 注意：build-exams.mjs 一条命令同时生成 JSON 与嵌入（--embed 是它的开关）
node tools/build-exams.mjs            # 只生成 exams.json（自检 slides: 17 | elements: 231）
node tools/build-exams.mjs --embed    # 生成 + 写回 conic-exams.bento.html

node tools/check-doc.mjs conic-exams.bento.html
```

### 4.5 改控制条

```powershell
# 编辑 tools/animation-controller.js 后重注入（幂等，可反复执行）
node tools/inject-controller.mjs                                   # 默认动点课件
node tools/inject-controller.mjs conic-exams.bento.html            # 指定目标

# 加按钮：在 makePill() 里建元素与事件，状态挂在 st 上即可
# （st = {svg, btn, spd, range, tt, maxT, t, playing, speed, seen}）
```

### 4.6 拍屏验证

```powershell
# 前置：起一个带调试端口的浏览器
#   chrome.exe --remote-debugging-port=9222 --user-data-dir=<临时目录>
#   （★ 必须用临时 --user-data-dir，否则会在工程目录里堆出 .edge_* profile 缓存）

node tools/shoot-deck.mjs                                    # 默认 → shots/svg/
node tools/shoot-deck.mjs conic-moving-point.bento.html shots\svg --first 0 --last 13
node tools/shoot-exams2.mjs                                  # → shots/exams3/（目标路径硬编码）
node tools/check-overflow.mjs                                # 打印 validate() 的 error/warning
```

### 4.7 数学引擎

```powershell
npm run build -w @mathppt/math    # tsc: src/*.ts → dist/
npm run test  -w @mathppt/math    # 39 用例
npm run demo  -w @mathppt/math    # 表达式冒烟演示
```

### 4.8 常见故障

| 现象 | 原因 / 处置 |
| --- | --- |
| `Cannot find module '../packages/math/dist/index.js'` | 未构建 → `npm run build -w @mathppt/math` |
| 拍屏脚本 `timeout` | 9222 未开，或页面级 WS 超时；脚本已用**浏览器级** WS + `Target.attachToTarget{flatten:true}`，需确认调试端口真的在监听 |
| 动图不动，差分 = 0 | 见 §5.3 两条硬教训：SMIL 不能塞进 `<img>`；`animateMotion` 的 `path` **必须绝对坐标** |
| 浏览器一开就在工程里多出 `.edge_*` 目录 | 启动时没给临时 `--user-data-dir` |
| 控制条挡住了图 | 浮条固定 `right:10px; bottom:10px`；把该页底部元素上移（真题精讲 S5 曾把标签移到 y=374） |

---

## 5. 梳理发现

### 5.1 文档与实现漂移（`MATH_ENGINE_DESIGN.md`）

该文档是**设计稿**，其 §1 的模块树列了 13 个不存在的路径：

```
expr/compile.ts  expr/eval.ts  expr/builtins.ts   → 实际合并进 expr/ast.ts（compileExpr + FUNCS 白名单）
coord/grid.ts    coord/axes.ts                    → 实际只在 coord/viewport.ts（niceTicks）
plot/pathgen.ts  plot/styles.ts                   → 未实现（渲染器直接拼 SVG 字符串）
geo/constraints.ts  geo/trace.ts                  → 约束类型并入 geo/model.ts；trace 未实现
render/numberLine.ts  render/formula.ts           → 未实现
interact/（drag/hit/slider）                      → 未实现（拖动由外壳 Moveable 承担）
engine.ts（统一入口）                             → 未实现，入口是 index.ts 的 barrel 导出
```

同样地，`MATH_GAP_IMPLEMENTATION.md` 提到的验证原型 `prototype/math-gap-demo.html` 已在精简中删除。

**结论**：这两篇是"当初打算怎么做"的记录，读的时候要区分**设计意图**与**已落地代码**。
已在两篇文档头部加注说明。

### 5.2 死代码（本轮已清理）

| 位置 | 内容 | 处置 |
| --- | --- | --- |
| `build-exams.mjs` | `prob4Fig_OLD()` / `prob5Fig_OLD()` 定义后**从未调用** | ✅ 已删除（−3,387 字节，442 行）；`exams.json` SHA256 不变 |
| `geo3d/model.ts` | `projectPersp()` 导出但**全工程无调用**（V2 预留） | 保留（有意预留），但其内部 bug 已修（§5.3） |
| `geo3d/render.ts` | `if (!backFace && …) { }` 空分支 | 保留：注释已说明"V1 全部画，靠排序解决遮挡" |
| `demo/lecture.ts` | `updateReadoutP()` 引用未初始化的 `M00/N00`，结果丢弃 | 保留：仅演示脚本的死分支，不影响产物 |

### 5.3 一个真 bug（本轮已修）

`packages/math/src/geo3d/model.ts` · `projectPersp()`：

```ts
// 修复前：比较，不是赋值 —— 空语句，守卫完全失效
const d = dist - p[2];
if (d <= 0) d === 0.001;

// 修复后
const d = dist - p[2] <= 0 ? 0.001 : dist - p[2];
```

`dist <= p[2]` 时（点位于或越过视点）原代码会让 `d` 保持 ≤ 0，`scale * (dist / d)` 得到
`Infinity`/`NaN` 坐标。因该函数目前无调用方，未影响成品；一旦启用透视投影即会炸。
修后 39 个测试仍全通过。

### 5.4 已修的幂等缺陷（上一轮精简时发现）

`inject-controller.mjs` 原本**每执行一次文件增长 2 字节**：旧代码按 `String.length` 切片删除旧块，
而 `"<!-- animctl:END -->"` 是 19 字符、在 CRLF 文件里占 21 字节，切片恰好落在末尾 `\n` 与 `\r`
之间，每轮残留一个 `0x0A`。改为整条正则吞掉标记两侧空白 + 固定块前空行数后，
连续执行 SHA256 完全一致，文件大小回到成品原始的 1,086,830 字节。

### 5.5 引导陷阱

`.gitignore` 忽略 `dist/`，但两个生成器 import 的正是 `packages/math/dist/index.js`。
**全新克隆 → 直接跑生成器必然失败**，必须先 `npm run build -w @mathppt/math`。已写进 §4.2 与 README。

### 5.6 可移植性（本轮已修）

- ~~`shoot-exams2.mjs` 与 `check-overflow.mjs` **硬编码** `D:/Users/pml/Desktop/mathV2/...`~~
  → 两者改为从 `import.meta.url` 推 `ROOT`，并支持 `argv` 覆盖目标文件与输出目录，
  与本就参数化的 `shoot-deck.mjs` 对齐。
- `package.json` 的 `dependencies.undici-types` 与 `devDependencies.jszip` 随 `packages/ai`
  删除后已成**残留** → 已移除（全工程零引用，已核实）；`dependencies` 现已为空。

---

## 5.7 本轮梳理的改动汇总

| 文件 | 改动 | 验证 |
| --- | --- | --- |
| `tools/build-exams.mjs` | 删除 2 个未调用的 `*_OLD` 图形函数（−3,387 字节） | `exams.json` SHA256 不变；17 页/231 元素 |
| `packages/math/src/geo3d/model.ts` | 修 `projectPersp` 的 `d === 0.001` 空语句 | `npm run build` + 39 测试全通过 |
| `package.json` | 移除 `jszip` / `undici-types` 残留依赖 | JSON 有效，`dependencies` 为空 |
| `tools/shoot-exams2.mjs` | 硬编码路径 → `ROOT` 推导 + argv 可覆盖 | `node --check` 通过 |
| `tools/check-overflow.mjs` | 同上；补回缺失的 path/url 导入 | `node --check` 通过 |
| `docs/MATH_GAP_IMPLEMENTATION.md` | 移除指向已删原型的悬空引用，补状态说明 | — |
| `docs/MATH_ENGINE_DESIGN.md` | 加"设计稿 ≠ 实现"须知表（13 处路径差异） | — |
| `docs/PROJECT-MAP.md` | 新增：本梳理文档 | — |

改动后复验：引擎构建 ✓ · 39 测试全通过 ✓ · 两生成器输出页数与元素数一致 ✓ ·
两份成品 JSON 可解析且 `bento-rt` 块完好 ✓ · 4 个脚本语法检查 ✓。

---

## 6. 一页速查

```
想做什么                     敲什么
────────────────────────────────────────────────────────────────
看课件                       双击 conic-*.bento.html
改动点课件内容               node tools/build-deck.mjs --embed
改真题精讲内容               node tools/build-exams.mjs --embed
改控制条                     node tools/inject-controller.mjs
校验成品                     node tools/check-doc.mjs <file>
拍屏验证                     node tools/shoot-deck.mjs（需 9222）
查排版溢出                   node tools/check-overflow.mjs
重建数学引擎                 npm run build -w @mathppt/math
跑测试                       npm run test  -w @mathppt/math
```

---

*本文件由逐文件通读生成；所有模块清单、行数、依赖关系与调用关系均经源码核实。*
