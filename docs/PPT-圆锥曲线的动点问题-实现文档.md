# 《圆锥曲线的动点问题》实现流程与框架详解

> 项目：MathPPT（数学课件生成器，工作区 mathV2）  ·  成品：`圆锥曲线的动点问题.bento.html`（13 页 · 1280×720 · 单文件零依赖）
> 本文档说明：这套 PPT 是怎么做出来的（实现流程），以及它的技术骨架（实现框架），面向"能看懂、能复现、能改"的目标。

---

## 0. 一句话概括

**内容用 TS 生成器（`tools/build-deck.mjs`）写成一个 `bento/slides` 文档（JSON）；曲线图形用 mathV2 数学引擎（`plotImplicit`/`renderImplicitSVG`）渲染成内联 SVG；动点是 SVG 里的 SMIL 动画（`<animateMotion>`/`<animate>`）；全套外壳是 Bento 单文件播放壳（编辑器+放映器二合一）；最后注入一个"动图控制条"脚本，让每幅动图在编辑画布和放映模式里都可播放/暂停/调速/拖动定位。**

---

## 1. 实现框架（分层架构）

```
┌─────────────────────────────────────────────────────────────────────┐
│ ① 内容层    bento/slides 文档模型（13 页 / 132 元素 / 388KB JSON）      │
│             text · shape · table · chart · svg(Diagram) · 数学元素    │
├─────────────────────────────────────────────────────────────────────┤
│ ② 渲染层    Bento 单文件壳（bento-rt 压缩运行时 + reveal.js +          │
│             Moveable/Selecto + Temml + ECharts）                     │
│             render.ts：<script id="bento-doc"> JSON → 幻灯片 DOM；    │
│             sanitizeSvg：SVG 白名单（SMIL 明确允许）                  │
├─────────────────────────────────────────────────────────────────────┤
│ ③ 数学层    @mathppt/math 引擎（纯 TS 零依赖）                        │
│             expr(表达式) · coord(worldToScreen/刻度) · plot(采样/       │
│             marching squares) · render(functionGraph/implicit/board) │
│             geo · geo3d · stats · lecture                           │
├─────────────────────────────────────────────────────────────────────┤
│ ④ 动效层    SVG/SMIL（动点 animateMotion、端点/线段 animate values、    │
│             脉冲 r）；Bento fx（enter 淡入、countUp）；morph 转场        │
├─────────────────────────────────────────────────────────────────────┤
│ ⑤ 交互层    动图控制条（setCurrentTime/pauseAnimations 驱动 SMIL 时间轴）│
│             ▶/⏸ · 速度 ×½/×1/×2 · 拖动滑块定位 · 时间显示              │
├─────────────────────────────────────────────────────────────────────┤
│ ⑥ 验证层    Chrome CDP(127.0.0.1:9222) + 演示模式截图 + 像素差分       │
│             （每页 a/b 两帧对比，用 System.Drawing 统计差异像素）        │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.1 为什么是这个框架（关键设计决策）

| 决策 | 原因/依据 |
| --- | --- |
| 单文件 .bento.html | 双击即放、零依赖、可离线发给人（README 定位） |
| 曲线用 mathV2 引擎渲染 | "参考 mathV2"：网格/轴/曲线与数学元素风格统一；`renderImplicitSVG` 直接产出 SVG 字符串 |
| 动图用内联 SVG + SMIL 而非 JS motion-path | 真 SVG 动画：可在任意 SVG 上下文运行；Bento 原生 `svg`(Diagram) 元素 + sanitizer 明确放行 SMIL（`animatemotion`/`animate`/`mpath` 与 timing 属性都在白名单） |
| 控制条用注入脚本 | 不侵入文档模型；`--embed` 只替换 doc 块，控制条随壳保留，可幂等重注入 |
| 验证用 CDP + 像素差分 | 动图是否真的在动只能"看"：同一页两帧截图，差分像素 > 0 即动；SMIL 是否播放、pause 是否冻结都能量化 |

---

## 2. 文档模型与数据流

### 2.1 单文件壳的结构（成品 .bento.html 内部）

```html
<!DOCTYPE html>
<html>
  <head>…<title>bento/slides</title>…</head>
  <body>
    <script id="bento-rt" type="bento/deflate-b64">★~650KB base64 压缩运行时（编辑器+放映器+渲染器）</script>
    <script type="application/bento+json" id="bento-doc">★文档 JSON（本课 388KB）</script>
    …壳的应用脚本…
    <!-- animctl:START -->
    <script>★动图控制条（tools/animation-controller.js 注入）</script>
    <!-- animctl:END -->
  </body>
</html>
```

### 2.2 文档 JSON 关键字段（bento/slides v1）

```jsonc
{
  "format": "bento/slides", "version": 1,
  "title": "圆锥曲线的动点问题",
  "meta": { "subject": "高中数学 · 解析几何专题", "keywords": "椭圆,双曲线,抛物线,动点,轨迹,定值,最值" },
  "size": { "width": 1280, "height": 720 },
  "theme": { "background": "#0B1020", "color": "#E9EEF8", "accent": "#4CC9F0" },
  "slides": [
    { "id": "s4", "background": "#0B1020", "transition": "morph", "notes": "讲师备注…",
      "elements": [
        { "id": "fig4", "type": "svg", "x": 96, "y": 210, "w": 560, "h": 430, "markup": "<svg …>" },
        { "id": "k", "type": "text", "x": 96, "y": 64, "html": "01 轨迹问题 · 方法一" },
        …
      ] },
    … 13 页共 132 个元素
  ]
}
```

### 2.3 数据流（从源码到可放映成品）

```
content + figure params            doc JSON            single file         present/editor
────────────────────────────────────────────────────────────────────────────────────
tools/build-deck.mjs  ──(node tools/build-deck.mjs)──▶ tools/deck.json        (核对：13 页/元素数/重复 ID)
          │
          └──(node tools/build-deck.mjs --embed)──▶ conic-moving-point.bento.html
                                                      │ 只替换 bento-doc 块（壳/控制条保留）
                                                      ▼
                              node tools/inject-controller.mjs  ─▶ 注入控制条（幂等）
                                                      ▼
                                    Copy-Item ─▶ 桌面圆锥曲线的动点问题.bento.html
```

---

## 3. 课件内容设计（13 页）

| 页 | 标题 | 内容 | 图形/动画 | data-anim |
| --- | --- | --- | --- | --- |
| S1 | 封面 | 点动成线：动点沿轨道绕行 | 圆环装饰 + 动点 14s 绕行 | ✓ |
| S2 | 三类经典问题 | 轨迹 / 最值范围 / 定值定点 | 无 | – |
| S3 | 预备知识 | 三种曲线定义·方程·离心率（表格） | 无 | – |
| S4 | 定义法概念 | 椭圆定义 |PF1|+|PF2|=2a | 椭圆动点 9s | ✓ |
| S5 | 例1 | F1(−4,0) F2(4,0)，2a=10 → 轨迹方程 | 椭圆动点 | ✓ |
| S6 | 相关点法 | A(6,0)、P 在 x²+y²=16 上、M 为 AP 中点 | 圆 + P/M/线段 8s 联动 | ✓ |
| S7 | 例2 | 中点轨迹代入即得 | 同 S6 | ✓ |
| S8 | 焦点三角形最值 | S=c·|yP|≤bc，短轴端点取等 | 椭圆动点 + h=b 高线 | ✓ |
| S9 | 例3 | x²/25+y²/9=1，Smax=12 | 椭圆动点 + P(0,3) 标注 | ✓ |
| S10 | 焦点弦定值 | 1/|AF|+1/|BF|=2/p=1（+折线图） | 抛物线 + 绕 F 扫动的焦点弦（m 1.25→2.2） | ✓ |
| S11 | 例4 | |AF|=3 → |BF|=3/2 | 抛物线 + 静态弦（|AF|=3 精确） | –（无动画） |
| S12 | 方法总结 | 三张处方 | 无 | – |
| S13 | 结尾 | 让运动停下来 · 思考题 | 圆环动点（同封面） | ✓ |

---

## 4. 数学图形实现（mathV2 引擎 + SVG + SMIL）

### 4.1 接入方式

`tools/build-deck.mjs` 顶部：

```js
import { plotImplicit, ellipseF, circleF, parabolaF, renderImplicitSVG } from "../packages/math/dist/index.js"
```

核心封装（生成器内）：

```js
function m2svg(vp, ff, frags = "", anim = true) {
  const segs = plotImplicit(ff, vp, 560, 430, 4)     // marching squares（4px 网格）→ 屏幕坐标线段
  let svg = renderImplicitSVG(vp, segs, 560, 430, {  // mathV2 渲染器：网格线 + 坐标轴 + 曲线
    curveColor: "rgba(76,201,240,0.72)",            // 深色主题样式
    gridColor:  "rgba(233,238,248,0.06)",
    axisColor:  "rgba(233,238,248,0.20)",
    labelColor: "rgba(233,238,248,0.34)",
  })
  svg = svg.replace("</svg>", frags + "</svg>")      // 追加焦点/标注/动点等片段
  if (anim) svg = svg.replace("<svg ", "<svg data-anim=\"1\" ")   // 供控制条识别
  return svg
}
```

### 4.2 三种图元的视口参数（坐标全校准，保证动点与曲线完全重合）

世界坐标→屏幕：sx=(x−xMin)/(xMax−xMin)·560；sy=430−(y−yMin)/(yMax−yMin)·430（y 向下）。

| 图元 | 视口（世界） | 比例 | 曲线 | 关键点（屏幕 px） |
| --- | --- | --- | --- | --- |
| 椭圆（S4/5/8/9） | x∈[−5.6,5.6], y∈[−4.3,4.3] | 50 px/单位（均匀） | ellipseF(5,3)：a=250, b=150, c=200 | 焦点 F1(80,215) F2(480,215)，顶点(280,65) |
| 圆+相关点（S6/7） | x∈[−5.333,6.667], y∈[−4.583,4.583] | 46.875 px/单位（均匀） | circleF(4)：r=187.5，圆心(250,215) | A(6,0)→(531.25,215)；M 圆心(390.6,215) r=93.75 |
| 抛物线（S10/11） | x∈[−4,7.2], y∈[−4.3,4.3] | 50 px/单位（均匀） | parabolaF(2)：y²=4x | 顶点(200,215)，F(1,0)→(250,215)，准线 x=−1→x=150 |

> 关键点：三张视口都取**均匀比例**——否则 `circleF` 会被画成椭圆（非均匀缩放会破坏圆的定义）。

### 4.3 动图原语的几种写法（全部为 SMIL，白名单已验证）

```js
// ① 绕椭圆匀速动点（绝对路径！SMIL 不处理"相对元素框"的偏移）
<circle r="9" fill="#4CC9F0">
  <animateMotion dur="9s" repeatCount="indefinite" path="M 530 215 C …ellipseD(280,215,250,150)…"/>
  <animate attributeName="r" values="7;10;7" dur="1.6s" repeatCount="indefinite"/>   // 脉搏
</circle>

// ② 端点/线段动画（相关点法：A—P 线段 + 双点联动；values 采样，24 步线性插值）
<line x1="531.25" y1="215" x2="437.5" y2="215" …>
  <animate attributeName="x2" values="437.5;369.8;…" dur="8s" repeatCount="indefinite" calcMode="linear"/>
  <animate attributeName="y2" …/>
</line>
<circle r="8" fill="#4CC9F0"><animateMotion dur="8s" path="…circleD(250,215,187.5)…"/></circle>  // P
<circle r="7" fill="#E9EEF8"><animateMotion dur="8s" path="…circleD(390.6,215,93.75)…"/></circle>   // M

// ③ 焦点弦扫动（S10：m(t)=1.725−0.475·cos(2πt)，m∈[1.25,2.2]，36 步采样）
//    由 m 解析出弦两端点 x=(m²+2±2√(m²+1))/m²，y=m(x−1) → 屏幕坐标 → values 驱动 x1/y1/x2/y2 与两端圆点 cx/cy
<line …><animate attributeName="x1" values="…" dur="10s" …/>…</line>

// ④ 静态弦（S11）：m=2.83 → A 世界(2, 2.83) 屏幕(300,73.5)，|AF|=3；B 世界(0.5,−1.415)，|BF|=1.5 —— 与答案 3/2 精确一致

// ⑤ 封面圆环：circleD(284,212,170) 绝对路径 14s 绕行
```

### 4.4 Bento SVG 白名单约束（sanitizeSvg / svgAttrAllowed）

| 允许（本课件用到的） | 禁止（被整块移除/拒绝） |
| --- | --- |
| svg/g/path/rect/circle/ellipse/line/text/tspan | script/foreignObject/form/meta/base/link 等 |
| `animate` `animatemotion` `animatetransform` `set` `mpath`（SMIL 显式放行） | 任何 on* 事件属性 |
| 属性：x,y,cx,cy,r,d,points,transform,fill,stroke,font-*,text-anchor,opacity… | javascript:/外部 URL（href 仅 # 与 data:image/） |
| SMIL timing：dur,begin,end,repeatcount,calcmode,values,keytimes,keysplines,path,additive,accumulate | @import（CSS 有 @keyframes 白名单，其余 at-rule 重命名拒绝） |
| `data-*`（保留前缀除外：data-bento*/data-el-id 等）——`data-anim` 可行 | 任意 data-bento 前缀 |

### 4.5 实测得出（两条硬教训）

1. **SMIL 在 `<img>` 里不播放**：`data:image/svg+xml` 塞进 `image` 元素 → 两帧截图分毫未动（中心点 (695.2,504) 完全一致）；同一份 SVG 用原生 `svg` 元素进入真实 DOM → 差分 285~483px 明显在动。→ 所以用 `type:"svg"`（Diagram）而不是 `image`。
2. **animateMotion 路径必须用绝对坐标**：早期封面用 `circleRel(170)`（相对路径 M 0 0 c…），运行时不等于"元素框坐标"，动点轨道跑到了视口左上角外 → 差分 0。改成 `circleD(284,212,170)`（绝对）后差分 176px。

---

## 5. 动图控制条（交互框架）

### 5.1 注入链路

```
tools/animation-controller.js   (源码，本框架的"动效运维层")
        │  node tools/inject-controller.mjs（幂等：先删旧 <!-- animctl:START..END --> 块再插）
        ▼
</body> 前：<script>/* 控制条 */</script>
        │  与 --embed 的关系：embed 只替换 <script id="bento-doc">…</script> 块，控制条永不受影响
```

### 5.2 控制器结构（单 IIFE + rAF 主循环）

```
┌ states(Map: svg节点 → state)  state = {t, maxT, playing, speed, seen, btn, spd, range, tt} ┐
│ 每帧 tick(now)：                                                                          │
│  1) 扫描作用域：document.querySelectorAll(".reveal [data-anim], .bento-slide [data-anim]") │
│     缺失/换壳 → makePill() 重建（自愈：svg.dataset.mpc="1" 标记；先删宿主内旧 .mpc-ctl）    │
│  2) 可见性（getBoundingClientRect>2px，兼容 reveal 的 transform 布局）                     │
│     false→true 首次可见：复位 t=0、playing=true、unpauseAnimations、setCurrentTime(0)      │
│     true→false：pauseAnimations（换页即冻结）                                              │
│  3) playing 且可见：t=(t+dt×speed)%maxT → svg.setCurrentTime(t)（每帧强写，覆盖 SMIL 自然钟）│
└────────────────────────────────────────────────────────────────────────────────────────┘
主体：host.appendChild(pill) { [⏸/▶][range 0..1000][×½/×1/×2][7.3s / 14s] }
防御：pill 内 pointerdown/mousedown/touchstart/click/dblclick 全部 stopPropagation（防被画布当成"选中/拖动元素"）；
     缩放画布下随 slide 1:1 缩放；缩略图（img）与静态页（无 data-anim）自然无控制条。
```

| 控件 | 实现 | 实测 |
| --- | --- | --- |
| ▶/⏸ | pauseAnimations / unpauseAnimations + playing 标志 | 暂停后 getCurrentTime 2.5s 分毫不变（12.7328…==12.7328…） |
| 滑块定位 | input→t=u×maxT→setCurrentTime(t) | 拖到 80% 显示 11.8s/14s，动点到位 |
| ×½/×1/×2 | speeds=[1,2,0.5] 循环 | 点击 ×1→×2 生效 |
| 进页复位 | 可见性跃迁时 t=0 | 进页后读数从 0 起播 |
| 静态页无条 | 无 data-anim | S11 实测 0 个控制条 |
| 画布误触 | stopPropagation | 点/拖控制条前后选中框数量恒为 1 |

---

## 6. 实现流程（本次实际操作步骤）

1. **环境确认**：工作区 `D:\\Users\\pml\\Desktop\\mathV2`；`packages/math` 已构建（dist 可直接 import）；Chrome 带 `--remote-debugging-port=9222`（页面级 WS 实测超时，必须用**浏览器级** `ws://127.0.0.1:9222/devtools/browser/…` + `Target.attachToTarget{flatten:true}` + 每条命令带 `sessionId`）；`serve.mjs` 提供 4180 静态服务。
2. **内容与生成器**：`tools/build-deck.mjs`——画板工厂 `T/R/E/LN/PA/dot`（text/shape/table/chart）+ `slide()`，逐页拼 13 页元素；`docJson()` 把 `<` 转义为 `\u003c`（防止 JSON 里的 `</svg>` 提前闭合 script 块）。
3. **生成文档**：`node tools/build-deck.mjs` → `tools/deck.json`，自检：13 页 / 元素数 / 每页重复 ID。
4. **嵌入**：`--embed` 找到壳内 `bento-doc` 开闭标签，只替换其中的 JSON。
5. **机器验证（拍屏）**：`shoot-deck.mjs`：`Target.createTarget` 新建页 → `activateTarget` 防后台节流 → 等 11s 启动 → 点击"幻灯片放映" → 每页两张 a/b 截图（间隔 3.5s）→ `ArrowRight` 翻页。
6. **量化判读**：PowerShell + System.Drawing 逐图逐对统计差异像素（阈值 RGB±14、隔 2px 采样）。
7. **迭代修复（本次）**：SMIL 在 img 不播 → 改原生 svg 元素；封面相对路径 → 绝对路径；例4 答案 countUp 破坏 `\frac{3}{2}` 显示为"32" → 去掉 countUp；M/A 标签重叠 → 上移；`plotImplicit` 步长 3→4 瘦身（文档 497KB→388KB）。
8. **控制条**：写 `animation-controller.js` → `inject-controller.mjs` 注入（幂等）→ 实测（暂停冻结/恢复/调速/定位/画布不误触/静态页无条）。
9. **发布**：`Copy-Item conic-moving-point.bento.html → 桌面\圆锥曲线的动点问题.bento.html`；`check-doc.mjs` 校验（JSON 可解析、13 页、bento-rt 块存在、控制条标记 1 处）。

---

## 7. 验证矩阵（最终版）

### 7.1 动效（a/b 两帧差分像素）

| 页 | 内容 | 差分 px | 结论 |
| --- | --- | --- | --- |
| S1 | 封面圆环动点 | 176 | 动 ✓ |
| S4/S5 | 椭圆定义/例1 | 210 | 动 ✓ |
| S6/S7 | 相关点法（P+线段+M） | 848/847 | 动 ✓（联动最丰富） |
| S8/S9 | 焦点三角形 | 206 | 动 ✓ |
| S10 | 焦点弦扫动 | 683 | 动 ✓ |
| S11 | 例4 静态弦 | 0 | 按设计静止 ✓ |
| S12 | 总结 | 0 | 无图形 ✓ |
| S13 | 结尾动点 | 211 | 动 ✓ |

### 7.2 控制条功能用例（CDP 自动化）

| 用例 | 输入 | 期望 | 实测 |
| --- | --- | --- | --- |
| 进页复位 | 进入 S1 | getCurrentTime 从 0 起播 | ✓（3.08s 时读数为播了 3.08s） |
| 暂停冻结 | 点 ⏸ | t 不变 | ✓（2.5s 内 3.0832…==3.0832…） |
| 恢复 | 点 ▶ | t 继续 | ✓ |
| 调速 | 点 ×1 | ×2 | ✓ |
| 定位 | 滑块 80% | t≈11.2s、标签 11.8s/14s | ✓ |
| 画布模式 | 未放映时 | 有控制条且不误触 | ✓（选中数不变） |
| 静态页 | S11 | 0 控制条 | ✓ |

---

## 8. 文件清单

| 路径 | 角色 |
| --- | --- |
| `桌面\圆锥曲线的动点问题.bento.html` | ★成品（1.09MB，双击即用） |
| `mathV2\conic-moving-point.bento.html` | 工作区成品（生成/注入的落盘对象） |
| `mathV2\tools\build-deck.mjs` | ★内容生成器（13 页 + 全部 SVG 图形） |
| `mathV2\tools\deck.json` | 生成的文档 JSON（调试/核对用） |
| `mathV2\tools\animation-controller.js` | ★动图控制条源码 |
| `mathV2\tools\inject-controller.mjs` | 控制条幂等注入器 |
| `mathV2\tools\shoot-deck.mjs` | 演示模式逐页双帧截图器（CDP） |
| `mathV2\tools\check-doc.mjs` | 成品文档完整性校验 |
| `mathV2\tools\svg-deck-probe.mjs` | SVG 方案探针（img vs 原生 svg 对照实验） |
| `mathV2\shots\svg\slide-*.png` | 13 页放映截图（a/b 双帧） |
| `mathV2\shots\ctl3\*.png` | 控制条实测截图 |
| `mathV2\packages\math\dist\` | mathV2 数学引擎（plot/render/coord…） |
| `mathV2\apps\bento-editor\src\render.ts` | Bento 渲染/白名单源码（了解约束用） |

---

## 9. 维护与扩展（怎么改）

```bash
# 改内容/图形后重新生成：
cd D:\\Users\\pml\\Desktop\\mathV2
node tools/build-deck.mjs            # 生成 deck.json + 自检
node tools/build-deck.mjs --embed    # 写回 conic-moving-point.bento.html（控制条保留）
node tools/shoot-deck.mjs            # 重新拍屏验证（需 9222 Chrome）
Copy-Item conic-moving-point.bento.html "$env:USERPROFILE\\Desktop\\圆锥曲线的动点问题.bento.html"

# 想改控制条：
编辑 tools/animation-controller.js → node tools/inject-controller.mjs
```

**扩展点**：
- 换配色：改 `build-deck.mjs` 顶部 `BG/ACCENT/AMBER` 常量 + `m2svg` 样式；
- 加例题：仿照 S5/S7 的 `slides.push(slide(…))` 模式（图形复用 `ellipseFig`/`relFig`/`chordFig`）；
- 控制条加按钮（⏮ 回起点、全局播放/暂停）：在 `makePill` 里加元素与事件，状态写在 `st` 上即可；
- 其他知识点课件：同一壳 + 新 doc JSON（或走 `apps/bento-editor` 顶部 🤖 AI 生成管线，两阶段：知识点→教案→PPT）。

---

*文档生成：2026-09-04 · 数据均来自本机实测（Chrome CDP 9222、System.Drawing 像素差分）。*