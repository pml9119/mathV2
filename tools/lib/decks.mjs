// tools/lib/decks.mjs — 课件注册表（单一事实来源）
//
// 为什么需要它：在此之前，"哪份课件由哪个生成器产出、落到哪个文件、
// 截图在哪个目录、应该有几页"这套映射只存在于操作者脑子里和 8 篇文档里。
// 闸门（tools/verify.mjs）要能自动判绿判红，就必须先把这套映射写下来。
//
// 新增课件时：在 DECKS 里加一项即可，闸门自动覆盖。

export const DECKS = {
  "conic-moving-point": {
    title: "圆锥曲线的动点问题",
    generator: "tools/build-deck.mjs",
    json: "tools/deck.json",
    html: "conic-moving-point.bento.html",
    shots: "shots/svg",
    slides: 13,
    elements: 132,
    // 期望「在动」的页（1-based）。来自《实现文档》§7.1 实测：
    // S11/S12 按设计静止（静态弦 / 无图形），其余 9 页应有差分。
    animated: [1, 4, 5, 6, 7, 8, 9, 10, 13],
  },

  "conic-exams": {
    title: "圆锥曲线与立体几何 · 期中真题精讲",
    generator: "tools/build-exams.mjs",
    json: "tools/exams.json",
    html: "conic-exams.bento.html",
    shots: "shots/exams3",
    slides: 17,
    elements: 231,
    // 2026 补测：此前 shots/exams3 只有单帧，这份课件的动效从未被验证过。
    // 用 shoot-deck 重拍 a/b 双帧后实测：S1~S16 均动，仅 S17（方法总结，无图形）静止。
    animated: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  },

  "solid-geometry": {
    title: "立体几何专题 · 截面与空间角",
    generator: "tools/build-solid.mjs",
    json: "tools/solid.json",
    html: "solid-geometry.bento.html",
    shots: "shots/solid",
    slides: 9,
    elements: 125,
    // S2/S3 M 沿 BC 扫动、S8 F 沿 PB 扫动；其余静态。
    animated: [2, 3, 8],
  },

  "line-circle": {
    title: "直线与圆的位置关系",
    generator: "tools/build-circle.mjs",
    json: "tools/circle.json",
    html: "line-circle.bento.html",
    shots: "shots/circle",
    slides: 13,
    // 219 = 生成器逐页实际产出（S1..S13：10+14+15+29+15+15+15+12+15+15+15+25+24）。
    // 旧值 222 是早期草稿的估计值，最后一次精简文案后未同步 —— verify 的
    // size-vs-registry 正是为这种「内容变了而注册表没跟」而设的。
    elements: 219,
    // 设计意图：S1 切点绕圆转、S3 直线平移、S5 弦上下平移、S6 弦过定点旋转、
    // S7 切点绕圆转、S9 圆上点绕行、S10 直线绕圆内定点转 —— 这 7 页应当有差分。
    // S2（三行静图）、S4（流程图）、S8（两切线）、S11（弦长计算图）、
    // S12（真题三联图）、S13（方法总结）按设计静止，图上不含任何 SMIL。
    animated: [1, 3, 5, 6, 7, 9, 10],
  },
};

/** 按 key 或产物路径解析课件条目。 */
export function resolveDeck(arg) {
  if (DECKS[arg]) return { key: arg, ...DECKS[arg] };
  for (const [key, d] of Object.entries(DECKS)) {
    if (d.html === arg || d.generator === arg || key === arg) return { key, ...d };
  }
  return null;
}

export const deckKeys = () => Object.keys(DECKS);
