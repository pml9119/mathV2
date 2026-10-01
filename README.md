# AI 数学教学课件（work 名：MathPPT）

> **数学可视化引擎 → 单文件零依赖 Bento 课件**
> 三份成品课件（13 / 17 / 9 页）；产出稳定性由一道闸门保证。

## ⚡ 快速开始

```bash
npm run build -w @mathppt/math    # 必须先构建引擎（生成器 import 的是 dist/）
npm run verify:fast               # 一条命令检查全部课件（~1s）
npm run verify                    # 全量档：加 validate + 拍屏 + 动效差分（~5min）
```

**改完任何课件，收工前跑 `npm run verify`。** 退出码 0 = 全绿，1 = 有失败。
操作契约见 `AGENTS.md`，工程梳理见 `docs/PROJECT-MAP.md`。

---

## 一、这个工程现在是什么

本工作区保留的是**核心骨干**：数学引擎 + 内容生成器 + 动图控制条 + 三份成品与验证证据。

| 交付物 | 文件 |
| --- | --- |
| 圆锥曲线的动点问题（13 页） | `conic-moving-point.bento.html` |
| 圆锥曲线与立体几何 · 期中真题精讲（17 页） | `conic-exams.bento.html` |
| 立体几何专题 · 截面与空间角（9 页） | `solid-geometry.bento.html` |

三份都是**单文件、零依赖、双击即用**：双击浏览器打开即可放映，含编辑画布、动图控制条（▶/⏸/调速/拖动定位）。

---

## 二、目录结构

```
mathV2/
├── packages/math/                ★ 数学可视化引擎（纯 TS 零依赖，可重建）
│   ├── src/                        expr / coord / plot / render / geo / geo3d / stats / lecture
│   ├── dist/                       构建产物（生成器直接 import）
│   └── tests/                      7 个测试文件
├── tools/                        ★ 骨干脚本
│   ├── build-deck.mjs              动点课件生成器（13 页 + 全部 SVG 图形）
│   ├── build-exams.mjs             真题精讲生成器（17 页）
│   ├── build-solid.mjs             立体几何课件生成器（9 页 + 3D 投影/截面求交 + 内容自检）
│   ├── animation-controller.js     动图控制条源码
│   ├── inject-controller.mjs       控制条幂等注入器
│   ├── shoot-deck.mjs              逐页 a/b 双帧截图（CDP，通用）
│   ├── shoot-exams2.mjs            真题精讲逐页截图（CDP）
│   ├── check-doc.mjs               成品完整性校验
│   ├── check-overflow.mjs          排版溢出检查（bento.validate）
│   ├── validate-solid.mjs          立体几何课件 validate 报告
│   ├── pixdiff.mjs                 纯 Node PNG 像素差分器（动效验证）
│   ├── deck.json / exams.json / solid.json   生成的文档 JSON（核对用）
├── docs/                        设计 + 实现文档（8 篇）
├── input/                       真题原始 PNG（6 张）
├── shots/
│   ├── svg/                     动点课件 13 页 a/b 双帧（动效证据）
│   ├── exams3/                  真题精讲 17 页放映截图
│   └── solid/                   立体几何 9 页 a/b 双帧
├── conic-moving-point.bento.html  ★ 成品（动点）
├── conic-exams.bento.html         ★ 成品（真题精讲）
├── solid-geometry.bento.html      ★ 成品（立体几何）
└── node_modules/                typescript（供 packages/math 重建）
```

## 三、文档（docs/）

| 文档 | 内容 |
| --- | --- |
| `PROJECT-MAP.md` | ★ **项目梳理 · 流程图 · 使用说明**（逐文件通读，先看这篇） |
| `PPT-圆锥曲线的动点问题-实现文档.md` | ★ 动点课件的实现流程与技术骨架（分层架构 / 文档模型 / SVG+SMIL / 控制条 / 验证矩阵） |
| `PPT-期中真题精讲-教案版17页-实现文档.md` | 真题精讲课件的实现记录 |
| `PPT-立体几何专题-截面与空间角-实现文档.md` | ★ 立体几何课件的实现记录（含 3D 投影/截面求交/内容安全自检） |
| `教案-圆锥曲线与立体几何-期中真题精讲.md` | 真题精讲教案源（题目 + 分步讲解） |
| `MATH_ENGINE_DESIGN.md` | 数学引擎技术设计 ⚠️ **设计稿，非实现清单**（差异见 PROJECT-MAP §5.1） |
| `MATH_GAP_IMPLEMENTATION.md` | GAP-1/2/3 实现指南（geo3d / stats / plotImplicit） |
| `SLIM-PLAN.md` | 工作区精简方案与执行记录 |

## 四、技术骨架（六层）

```
① 内容层   tools/build-deck.mjs 以 TS/JS 生成 bento/slides 文档 JSON
② 渲染层   Bento 单文件壳（bento-rt 运行时 + reveal.js + Moveable/Selecto + Temml + ECharts）
③ 数学层   @mathppt/math：plotImplicit（marching squares）→ renderImplicitSVG
④ 动效层   SVG/SMIL：animateMotion 动点 · animate 端点/线段 · 脉冲 r
⑤ 交互层   animation-controller.js：setCurrentTime / pauseAnimations 驱动 SMIL 时间轴
⑥ 验证层   Chrome CDP 拍屏 + 像素差分（每页 a/b 两帧对比）
```

## 五、日常操作

```powershell
cd D:\Users\pml\Desktop\mathV2

# 动点课件：改内容/图形后重新生成
node tools/build-deck.mjs            # 生成 tools/deck.json（自检：13 页 / 132 元素 / 重复 ID）
node tools/build-deck.mjs --embed    # 写回 conic-moving-point.bento.html（只替换 bento-doc 块）
node tools/inject-controller.mjs     # 重注入控制条（幂等：重复执行字节不变）
node tools/check-doc.mjs conic-moving-point.bento.html   # 完整性校验

# 真题精讲：同理
node tools/build-exams.mjs
node tools/check-doc.mjs conic-exams.bento.html

# 立体几何专题：同理（生成前会跑内容安全自检，裸露的 < 会被拦下）
node tools/build-solid.mjs            # 生成 tools/solid.json（9 页 / 125 元素）
node tools/build-solid.mjs --embed    # 写回 solid-geometry.bento.html
node tools/check-doc.mjs solid-geometry.bento.html

# 拍屏验证（需先启动带调试端口的浏览器：--remote-debugging-port=9222）
#   ★ 目标文件请传【绝对路径】，相对路径会解析成 file:///xxx 而 404
node tools/shoot-deck.mjs            # 输出 shots/svg/slide-*.png（每页 a/b 两帧）
node tools/shoot-exams2.mjs          # 输出 shots/exams3/slide-*.png
node tools/shoot-deck.mjs "$PWD\solid-geometry.bento.html" shots\solid
node tools/pixdiff.mjs shots\solid   # 纯 Node 像素差分，判定每页是否真的在动
node tools/validate-solid.mjs "$PWD\solid-geometry.bento.html"   # 溢出/错误报告

# 数学引擎重建与测试
npm run build -w @mathppt/math       # tsc 编译 src → dist
npm run test  -w @mathppt/math       # 7 个测试文件 / 39 用例
```

## 六、扩展点

- **换配色**：改 `tools/build-deck.mjs` 顶部 `BG / ACCENT / AMBER` 常量与 `m2svg` 样式；
- **加例题**：仿照 S5/S7 的 `slides.push(slide(…))` 模式，图形复用 `ellipseFig` / `relFig` / `chordFig`；
- **控制条加按钮**（⏮ 回起点、全局播放/暂停）：在 `animation-controller.js` 的 `makePill` 里加元素与事件，状态写在 `st` 上即可；
- **新知识点课件**：需要一个新的 Bento 单文件壳作为载体（本工作区已不含壳工厂源码），再套用同一 `--embed` + `inject-controller` 流程。
  现成模板见 `tools/build-solid.mjs`——它不依赖 mathV2 引擎（立体几何不是隐式曲线），自带 3D 投影与截面求交，适合做纯几何课件。

---

*工作区精简记录见 `docs/SLIM-PLAN.md`。*
