# AGENTS.md — mathV2 工作区契约

> 给新会话的 agent（也给人）读的操作契约。目标：**产出稳定**。
> 详细的工程梳理见 `docs/PROJECT-MAP.md`；本文件只管「必须怎么做」。

---

## 0. 这个工作区在做什么

把数学内容 → **单文件零依赖的 Bento 课件**（双击即用，自带编辑器+放映器+动图控制条）。

四份在册成品：

| 课件 | 生成器 | 页数 |
| --- | --- | --- |
| 圆锥曲线的动点问题 | `tools/build-deck.mjs` | 13 |
| 圆锥曲线与立体几何 · 期中真题精讲 | `tools/build-exams.mjs` | 17 |
| 立体几何专题 · 截面与空间角 | `tools/build-solid.mjs` | 9 |
| 直线与圆的位置关系 | `tools/build-circle.mjs` | 13 |

**在册清单的单一事实来源是 `tools/lib/decks.mjs`**，不是本文、不是文档、更不是记忆。

---

## 1. 唯一入口：`node tools/verify.mjs`

**改完任何课件内容/图形/控制条，收工前跑这一条。**

```powershell
node tools/verify.mjs --fast          # 快档 ~1s：语法/生成/内容安全/嵌入/幂等/结构/规模对表
node tools/verify.mjs                 # 全量档 ~5min：快档 + validate + 逐页拍屏 + 像素差分
node tools/verify.mjs solid-geometry  # 只查一份课件
node tools/verify.mjs --no-build      # 只检查磁盘现状，不重新生成
```

- **退出码 0 = 全绿；1 = 有失败。** CI/脚本里直接看退出码。
- `SKIP` **不等于通过**。会有显式清单列出来，请自行判断是否可接受。
- 快档适合改一步跑一次；全量档适合收工/发布前。

### 1.1 为什么是「一条闸门」而不是「一堆脚本」

本工作区出过的 6 个缺陷里 **5 个本可机械拦截**，但它们分别由 5 个不同工具、
在 5 个不同时刻被发现——有 2 个是事后才补的检查。

最刺眼的一条证据：

```
build-deck.mjs   内容安全自检 = 无   ← 「裸 < 吞文字」这个坑
build-exams.mjs  内容安全自检 = 无      文档里记录过一次
build-solid.mjs  内容安全自检 = 有      代码里强制过一次
```

**同一个教训被记录了两次，只被强制了一次。**
所以检查不能长在某个生成器里（只保护它自己），要长在「事后检查产物」这个位置，
并且有一条命令把它们串起来，让人不需要"想起来"。

---

## 2. 红线（违反必炸，已各踩过至少一次）

| # | 红线 | 后果 | 拦截者 |
| --- | --- | --- | --- |
| 1 | **正文里的 `<` 必须写成 `&lt;`** | 裸露的 `<` 后跟字母会被 HTML 解析器当成标签开头，**吞掉后面整段文字** | `content-safety` |
| 2 | **`--embed` 之后必须确认成品真的换了** | 生成器报语法错时 `--embed` 不执行，成品留着**上一份课件的文档**，从文件名和体积看毫无异常 | `embed-freshness` |
| 3 | **拍屏脚本必须传绝对路径** | 相对路径被拼成 `file:///xxx` → `ERR_FILE_NOT_FOUND` | 脚本会报错，但信息不直观 |
| 4 | **动图必须是 SVG/SMIL，不能是 `<img>` 里的 SVG** | SMIL 在 `<img>` 里不播放，差分 = 0 | `pixdiff` |
| 5 | **`animateMotion` 的 `path` 必须绝对坐标** | 相对路径会跑到视口外，差分 = 0 | `pixdiff` |
| 6 | **盒高不要手填** | 手填必然与内容失配（实测积累出 21 处 overflow）。用 `autoH: true` 让盒高跟着内容算 | `validate` |
| 7 | **改文件时替换串要用函数形式** | JS 的 `String.replace` 会把 `$&` `$'` `` $` `` `$1` 当特殊模式——`$'` 意为"匹配点之后的全部内容"，会把文件尾部**原地注入**一份 | 无（见 §5） |

> 第 6、7 条是本次会话新踩的，已写进代码与本文。

---

## 3. 标准流程

### 3.1 改现有课件

```powershell
# 1) 改生成器（内容/图形在 build-*.mjs 里）
# 2) 一条命令跑完全部关卡（含重新生成、嵌入、注入、校验、拍屏、差分）
node tools/verify.mjs --fast solid-geometry     # 快速迭代
node tools/verify.mjs solid-geometry            # 收工前全量
# 3) 全绿后发布到桌面
Copy-Item solid-geometry.bento.html "D:\Users\pml\Desktop\立体几何专题-截面与空间角.bento.html"
```

### 3.2 新增一门课件

1. 在 `tools/lib/decks.mjs` 的 `DECKS` 里加一项（**先登记，再实现**）：
   生成器路径、JSON 路径、成品 html、截图目录、期望页数与元素数、**期望哪几页在动**。
2. 以 `tools/build-solid.mjs` 为模板写生成器（它自带内容安全自检，且不依赖引擎，最好抄）。
3. 壳需要一个新的 `*.bento.html` 作为载体 —— 见 §4 壳的约束。
4. `node tools/verify.mjs <新课件>` 跑到全绿。

> `size-vs-registry` 会拿实测页数/元素数与注册表比对。内容改了而注册表没同步 → 判红，
> 这正是提醒你「去更新 `decks.mjs`」。

### 3.3 只改控制条

```powershell
# 编辑 tools/animation-controller.js
node tools/inject-controller.mjs <deck>.bento.html   # 幂等：重复执行字节不变
node tools/verify.mjs --fast                         # inject-idempotent 会验证幂等
```

---

## 4. 关键约束与依赖

### 4.1 必须先构建引擎（否则生成器直接失败）

```powershell
npm run build -w @mathppt/math
```

`.gitignore` 忽略 `dist/`，但 `build-deck.mjs` / `build-exams.mjs` **import 的正是
`packages/math/dist/index.js`**。全新克隆后不构建就必然 `Cannot find module`。
（`build-solid.mjs` 不依赖引擎，所以不受影响。）

### 4.2 壳是稀缺资源

`*.bento.html` 里的 `<script id="bento-rt">` 是 **base64 压缩运行时（二进制），无法重新生成**。
所以：

- **不要删除现有的 `conic-*.bento.html`** —— 它们是新课件唯一的壳来源；
- `--embed` 只替换 `<script id="bento-doc">` 块，壳与控制条不受影响；
- 新课件做法：`Copy-Item <现有壳> <新课件的壳>` → 改标题/内容 → `--embed`。

### 4.3 浏览器关（validate / 拍屏 / 差分）需要 CDP

```powershell
# 必须用【临时 user-data-dir】，否则会在工程目录里堆出 .edge_* / profile 缓存（曾堆出 200MB+）
& "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="$env:TEMP\cdp-$(Get-Random)" `
  --no-first-run --no-default-browser-check --headless=new --window-size=1400,900 about:blank
```

CDP 不可用时，全量档的浏览器关会全部 `SKIP` 并显式列出（**不是静默放过**）。

### 4.4 布局：盒高跟内容走

```js
T('id', x, y, w, h, '内容', { autoH: true, fontSize: 24 })   // h 被忽略，按内容算
```

`autoH` 由 `estimateTextH()` 估算行数×行高+余量。它是估算不是实测，
价值在于**随内容同步变化**——改字号/改文案时盒高自动跟上，不会像手填值那样悄悄失配。
最终把关靠 `validate`（浏览器实测）。

---

## 5. 给 agent 的硬规则

1. **改文件用 edit/write 工具**，不要用自写的 Node 脚本 + `String.replace`。
   若确需脚本，替换串一律写成函数：`s.replace(re, () => fixed)`——
   字符串形式的 `$&` `$'` `` $` `` `$1` 会被当特殊模式解释，**能静默毁掉整个文件**。
   （本次真实事故：`$'` 把 build-deck.mjs 从 560 行炸成 895 行。）
2. **破坏性操作前先备份基准产物**：`Copy-Item tools/deck.json $env:TEMP\deck.orig.json`。
   修复后逐元素比对，确认「除有意改动外内容完全一致」。
3. **判断"图形对不对"必须看图**，不能只看差分非零。
   差分只证明"在动"，不证明"动得对"——正方体被压成菱形那次，差分是正常的。
4. **不要凭直觉调布局数字**，先跑 `validate` 拿实测需求值。
   （真实弯路：凭感觉给 S8 第②张最大权重，真正超高的是第③张。）
5. **不要手工改生成的产物**（`tools/*.json`、`conic-*.bento.html`）——它们是产物，
   下次 verify 会重新生成并覆盖。要改就改生成器。

---

## 6. 文件地图（速查）

```
tools/
  verify.mjs              ★ 唯一闸门（快档/全量档）
  verify-negtest.mjs        闸门的反向测试（确认它会红、且红在该红的地方）
  lib/decks.mjs           ★ 课件注册表（在册清单的唯一事实来源）
  lib/deckcheck.mjs         共享内容检查器（裸 <、重复 id、嵌入新鲜度…）
  build-deck.mjs            生成器：动点（13 页，依赖 math 引擎）
  build-exams.mjs           生成器：真题精讲（17 页，依赖 math 引擎）
  build-solid.mjs           生成器：立体几何（9 页，自带 3D 投影，不依赖引擎）
  build-circle.mjs          生成器：直线与圆（13 页，自带图注防遮挡，不依赖引擎）
  animation-controller.js   动图控制条源码（驱动 SMIL 时间轴）
  inject-controller.mjs     控制条幂等注入器
  validate-deck.mjs         CDP 调 window.bento.validate()（通用）
  shoot-deck.mjs            逐页 a/b 双帧截图（通用）
  pixdiff.mjs               纯 Node PNG 像素差分（支持 --json）
  check-doc.mjs             成品结构校验
docs/                       设计/实现文档 + PROJECT-MAP.md
shots/                      截图证据（svg/ exams3/ solid/ circle/）
packages/math/              数学引擎（src/dist/tests，可重建）
```

---

## 7. 当前状态

- 闸门：**60 通过 / 0 失败 / 0 跳过**（全量档，四份课件）
- 反向测试：**4/4 正确判红且命中预期关卡**
- 引擎测试：39/39
- 四份课件 validate 均 `error=0 warning=0`

*最近更新：新增第 4 份课件《直线与圆的位置关系》（`tools/build-circle.mjs`，13 页 / 219 元素），
并把两条经验固化进生成器——图注按宽度自动缩字号躲开右下角控制条；
`estimateTextH` 对**含行内公式**的段落按渲染宽度放量（此前按源码字符估宽会系统性少算一行，
首轮 validate 因此报出 7 处溢出）。*
