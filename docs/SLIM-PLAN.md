# mathV2 精简方案（执行记录）

> 目标：保留《圆锥曲线的动点问题》实现文档所描述的**核心骨干**，其余全部删除。
> 基准：精简前 **839.6 MB / 27,888 文件**。

---

## 1. 核心骨干（保留判据）

文档 §1 的六层架构中，真正"不可再生"的源码只有下面这些。链路已逐文件核实：

```
tools/build-deck.mjs ──import──▶ packages/math/dist/index.js   ← 唯一外部依赖
                     ──write──▶ tools/deck.json
                     ──--embed─▶ conic-moving-point.bento.html  ← 只替换 bento-doc 块
tools/animation-controller.js ──▶ tools/inject-controller.mjs   ← 自包含，零依赖
```

`build-deck.mjs` 除 `packages/math/dist` 外只用 `node:fs` / `node:path`。
`inject-controller.mjs` 与 `animation-controller.js` 完全自包含。

## 2. 保留清单

| 路径 | 角色 | 大小 |
| --- | --- | --- |
| `tools/build-deck.mjs` | ★ 内容生成器（13 页 + 全部 SVG 图形） | 38.7 KB |
| `tools/animation-controller.js` | ★ 动图控制条源码 | 5.1 KB |
| `tools/inject-controller.mjs` | 控制条幂等注入器 | 1.3 KB |
| `tools/shoot-deck.mjs` | 演示模式逐页 a/b 双帧截图（CDP → `shots/svg`） | 4.1 KB |
| `tools/check-doc.mjs` | 成品文档完整性校验 | 0.8 KB |
| `tools/deck.json` | 生成的文档 JSON（核对用） | 392 KB |
| `packages/math/` | ★ 数学引擎（src + dist + tests，可 `npm run build` 重建） | 0.9 MB |
| `conic-moving-point.bento.html` | ★ 工作区成品 / 亦可作 `--embed` 的壳 | 1.09 MB |
| `conic-exams.bento.html` | 真题精讲成品（同引擎，第二条线） | 1.19 MB |
| `tools/build-exams.mjs` + `tools/exams.json` | 真题精讲生成器 + 文档 JSON | 530 KB |
| `tools/shoot-exams2.mjs` + `tools/check-overflow.mjs` | 真题精讲拍屏 / 溢出检查 | 4.9 KB |
| `shots/svg/slide-*.png` | ★ 13 页 a/b 双帧动效证据（文档 §7.1） | 2.1 MB |
| `shots/exams3/slide-*.png` | 17 页放映截图 | 1.6 MB |
| `docs/` | 设计文档 + 本方案 + 两份实现文档 | ~130 KB |
| `input/*.png` | 真题原始输入（6 张） | 0.2 MB |
| `README.md` `package.json` `package-lock.json` `tsconfig.base.json` `serve.mjs` `.gitignore` | 工程骨架 | 19 KB |
| `node_modules/`（根） | 含 `typescript` → 保证 `packages/math` 可重建 | 26.8 MB |

## 3. 删除清单

### 3.1 参考克隆 / 一次性原型（无源码价值）

| 路径 | 大小 | 理由 |
| --- | --- | --- |
| `_research/`（bento / courseforge / pptist） | 382.2 MB | 三家只读参考克隆，各自带 `.git` 与 node_modules |
| `prototype/` | 217.8 MB | throwaway 原型；其中 202.5 MB 是 16 个 `.edge_*` CDP 浏览器 profile 缓存 |
| `ab-pelican` `ab-pelican2` | 14.1 MB | 与本工程无关 |
| `bento-skills-repo/` | 0.1 MB | 无关克隆 |

### 3.2 其他应用与包

| 路径 | 大小 | 理由 |
| --- | --- | --- |
| `apps/bento-editor/` | 74.4 MB | 壳工厂已整体删除（决策：造新壳能力放弃） |
| `apps/web/` | 62.2 MB | 早期 Vue3 编辑器原型，已被 bento-editor 取代 |
| `apps/kernel/` `apps/player/` | 0.6 MB | 骨干未引用 |
| `packages/ai/` `packages/core/` `packages/interactions/` | ~0.5 MB | 生成器未引用 |
| `build/` | 39.1 MB | 旧构建实验（含自己的 node_modules） |

### 3.3 缓存 / 试验残留 / 冗余脚本

| 路径 | 大小 | 理由 |
| --- | --- | --- |
| `.npm-cache/` | 6.4 MB | 落在工程内的 npm 缓存 |
| `__pycache__/` `hello.py` | ~0 | 无关 Python 残留 |
| `_test_write_probe.md` | 67 B | 写入探针 |
| `effect-demo.html` | 3.1 KB | 独立效果演示 |
| `AI.bento.html` | 1.52 MB | 编辑器 AI 线产物，随壳工厂一并删除 |
| `bento-editor.html` | 1.52 MB | 预构建单文件壳（依赖 apps/bento-editor 才能重建） |
| `tools/bento-rt.dec.js` | 1.37 MB | 反压缩运行时，**零引用**（运行时已内嵌于 .bento.html） |
| `tools/probe.bento.html` | 745 KB | 仅 `svg-deck-probe.mjs` 使用 |
| `tools/svg-deck-probe.mjs` | 10.6 KB | 一次性实验；结论已固化进文档 §4.5 |
| `tools/inspect12.mjs` `tools/inspect12c.mjs` `tools/diag-tab.mjs` `tools/cleanup-tabs.mjs` | 5.2 KB | 一次性调试脚本 |
| `tools/debug-ctl.mjs` `tools/debug-ctl2.mjs` `tools/fresh-ctl-test.mjs` `tools/verify-controls.mjs` `tools/verify-ctl2.mjs` `tools/verify-canvas-ctl.mjs` `tools/verify-canvas-ctl2.mjs` `tools/check-doc-live.mjs` `tools/shoot.mjs` | 27 KB | 一次性控制条验证；结论已固化进文档 §7.2 |
| `shots/ctl/` `shots/ctl2/` `shots/ctl3/` `shots/probe/` `shots/exams/` `shots/exams2/` | ~4.3 MB | 对应上面被删脚本的旧截图 |
| `shots/slide-0*.png`（根级散图） | 0.5 MB | 早期散图，已被 `shots/svg/*-a/-b` 取代 |

### 3.4 文档取舍

| 路径 | 处置 | 理由 |
| --- | --- | --- |
| `docs/PPT-圆锥曲线的动点问题-实现文档.md` | 保留 | 骨干文档（自桌面复制入档） |
| `docs/PPT-期中真题精讲-教案版17页-实现文档.md` | 保留 | 第二条线文档 |
| `docs/教案-圆锥曲线与立体几何-期中真题精讲.md` | 保留 | 真题精讲教案源 |
| `docs/MATH_ENGINE_DESIGN.md` | 保留 | 数学引擎设计（骨干依赖） |
| `docs/MATH_GAP_IMPLEMENTATION.md` | 保留 | `plotImplicit` 等 GAP 实现（骨干依赖） |
| `docs/WEB_PPT_DESIGN.md` `docs/MATH_COVERAGE_MATRIX.md` `docs/PROBLEM_LECTURE_DESIGN.md` | 删除 | 对应已删的 apps/web、AI 管线、题目讲解系统 |

## 4. 精简后结构

```
mathV2/
├── docs/                        设计 + 实现文档（8 篇）
├── input/                       真题原始 PNG（6 张）
├── packages/math/               ★ 数学引擎（src/dist/tests，可重建）
├── shots/
│   ├── svg/                     ★ 动点课件 13 页 a/b 双帧
│   └── exams3/                  真题精讲 17 页
├── tools/                       ★ 骨干脚本 + deck.json + exams.json
├── conic-moving-point.bento.html  ★ 成品（动点）
├── conic-exams.bento.html         成品（真题精讲）
├── node_modules/                typescript（供 packages/math 重建）
└── README.md package.json package-lock.json tsconfig.base.json serve.mjs .gitignore
```

## 5. 验证

- `node tools/check-doc.mjs conic-moving-point.bento.html` — 成品完整性（JSON 可解析 / 13 页 / bento-rt 块 / 控制条标记 1 对）
- `node tools/build-deck.mjs` — 生成器仍可跑（重写 `tools/deck.json`，自检 13 页 / 132 元素 / 重复 ID）
- `node tools/build-deck.mjs --embed` — 幂等：对同一 deck 重复执行 SHA256 不变
- `npm run build -w @mathppt/math` — 数学引擎仍可从 src 重建

## 6. 顺带修复：`inject-controller.mjs` 的幂等性缺陷

**症状**：文档称该注入器"幂等"，实测**每执行一次文件增长 2 字节**，永不收敛。

**根因**：旧代码用 `html.slice(0, s1) + html.slice(e1 + END.length)` 删除旧块。
`"<!-- animctl:END -->"` 是 19 个字符（`String.length`），而 CRLF 文件中它实际占 21 字节。
于是删除从 `indexOf` 起点推进 19 个位置时，落在 END 标记的**最后一个 `\n` 与 `\r` 之间**，
每个 CRLF 残留一个 `0x0A`，再插入新块时又添一组换行 → 每轮净增 2 字节。

**修复**：改用一整条正则吞掉标记两侧的空白，并把块前的空行run 固定为 6 行：

```js
const BOTH = /[ \t]*(?:\r?\n[ \t]*)*<!-- animctl:START -->[\s\S]*?<!-- animctl:END -->[ \t]*(?:\r?\n)?/;
const head = out.slice(0, bodyEnd).replace(/[ \t]*(?:\r?\n[ \t]*)*$/, "");
const next = head + "\n\n\n\n\n\n" + block + out.slice(bodyEnd);
```

**修复后实测**（`conic-moving-point.bento.html`）：

| 检查 | 结果 |
| --- | --- |
| 连续执行两次 SHA256 | 完全一致 ✓ |
| 文件大小 | 1,086,830 字节 = 桌面成品大小 ✓ |
| 控制条标记 | START=1 / END=1 ✓ |
| 块前空行 | 6（与原文件一致） ✓ |
| 文档 JSON | 可解析，13 页 ✓ |

---

*本文件由精简执行过程生成。*
