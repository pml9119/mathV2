# 圆锥曲线与立体几何 · 期中真题精讲 — 教案版 17 页课件实现文档

> 生成时间：2026 · 输入：input/ 六道真题 PNG → 教案(docs/教案-...md) → Bento PPT(17页)

## 1. 交付物

| 路径 | 角色 |
| --- | --- |
| `D:\Users\pml\Desktop\圆锥曲线与立体几何-期中真题精讲.bento.html` | ★成品(1.16MB,双击即用,自包含+控制条) |
| `mathV2\conic-exams.bento.html` | 工作区成品(生成/嵌入落盘对象) |
| `mathV2\tools\build-exams.mjs` | 生成器(17页+全图形函数+分步内容) |
| `mathV2\tools\exams.json` | 生成的文档 JSON(调试/核对) |
| `mathV2\shots\exams3\slide-01.png~17.png` | 放映逐页截图(验证) |
| `mathV2\tools\shoot-exams2.mjs` | 拍屏+验证脚本(CDP, reload绕缓存) |
| `mathV2\tools\check-overflow.mjs` | 溢出检查脚本 |

## 2. 课件结构(17 页)

| 页 | 内容 | 图形/动画 |
| --- | --- | --- |
| S1 | 封面 | 椭圆动点(缓和) |
| S2 | 题1 题干 | 椭圆+定义动图 |
| S3 | 题1 讲解① 标准式/定义改写 | 同S2图 |
| S4 | 题1 讲解② 三角不等式取等 | 同S2图 |
| S5 | 题2 题干 | 动圆相切轨迹 |
| S6 | 题2 讲解① 半径关系→定义 | 同S5图 |
| S7 | 题2 讲解② 二次函数换元 | 同S5图 |
| S8 | 题3 题干 | 椭圆+PQ弦过T |
| S9 | 题3 讲解① 设线联立韦达 | 同S8图 |
| S10 | 题3 讲解② k条件消参 | 同S8图 |
| S11 | 题4 题干 | 正方体截面 |
| S12 | 题4 讲解① 平行面截线平行 | 同S11图 |
| S13 | 题4 讲解② 临界分析 | 同S11图 |
| S14 | 题5 题干 | 四棱锥+EF动点 |
| S15 | 题5 讲解① 四点共面 | 同S14图 |
| S16 | 题5 讲解② 线面角 | 同S14图 |
| S17 | 方法总结 | 静态 |

## 3. 关键实现

1. **教案→PPT管线**：教案(10节) → 每题=题干页+2步讲解页 → `stepSlide()` 通用布局(左图+右4步卡) → 17页。
2. **动图**：mathV2 引擎 `plotImplicit`/`ellipseF` → SVG + SMIL(`animateMotion`绕椭圆、`animate`驱动动点/弦/线段)→ `svg`原生元素(非image,SMIL才播)。
3. **控制条**：`tools/animation-controller.js` 注入壳(animctl:START/END幂等) → 播放/暂停/调速/拖动定位。
4. **验证**：`shoot-exams2.mjs` 用 CDP 打开→`reload(ignoreCache)`→进入放映→逐页截图;`window.bento.validate()` 报告溢出。

## 4. 本次修复的问题(全被 validate/拍屏捕获)

| 问题 | 修复 |
| --- | --- |
| 封面动图与文字卡重叠 | 动图移右侧缩小 |
| 题干 `0<m<1`/`BM<2/3`/`0<t<1` 未转义→文字被吞 | `&lt;` 转义 |
| 题干 h:40 溢出(75px/84px) | 题干 h:70~110 |
| 题2 底部标签被控制条遮挡 | 标签上移 y 374 |
| 题5 题干过长 | 精简字号13.5 |

**最终 `window.bento.validate()`：error:0, warning:0 ✓**

## 5. 维护

改内容/图形：`node tools/build-exams.mjs --embed`(自动重生成+嵌入)→ `node tools/shoot-exams2.mjs`(重拍验证)。
