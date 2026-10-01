# 三个 GAP 的实现指南（GAP-1 geo3d / GAP-2 stats / GAP-3 plotImplicit）

> 配套 MATH_ENGINE_DESIGN.md（架构）与 `packages/math/src/` 实际代码。
> 每个 GAP 给出：核心算法 + 伪代码 + 命中陷阱。
>
> **状态说明**：GAP-1/2/3 **均已落地**于 `packages/math/src/geo3d`、`stats`、`plot/implicit.ts`，
> 共 18 个测试用例覆盖（`npm run test -w @mathppt/math`）。
> 文中提到的验证原型 `prototype/math-gap-demo.html` 属于**已删除的一次性原型**，其结论已固化进本文件。

---

## GAP-3 · plotImplicit 隐式曲线（解析几何压轴）

**问题**：画 F(x,y)=0 的曲线（椭圆 / 双曲线 / 抛物线）。函数图 plot/ 只能画显式 y=f(x)，而双曲线、圆等**一个 x 对应多个 y**，必须走隐式。

### 算法：Marching Squares 简化版（marching lines）

```
// 思路：把屏幕划分为网格，对每个网格单元检查 F 的符号变化，
//       跨零的边用线性插值求交点，单元内 2 个交点连成 1 条线段。

function plotImplicit(F, xMin, xMax, yMin, yMax, stepPx=3):
  nx = W/stepPx, ny = H/stepPx
  // 1. 网格采样 F(i,j)（一次采样，复用）
  for i in 0..nx, j in 0..ny:
    x = xMin + (i/nx)*(xMax-xMin)
    y = yMin + (j/ny)*(yMax-yMin)
    f[i][j] = F(x,y)

  // 2. 每个单元格：检查 4 条边是否跨零
  for i in 0..nx-1, j in 0..ny-1:
    v00=f[i][j], v10=f[i+1][j], v01=f[i][j+1], v11=f[i+1][j+1]
    pts = []
    // 边 (i,j)-(i+1,j)（底）：符号不同 → 插值零点
    if sign(v00) != sign(v10):
        t = v00/(v00-v10)
        pts.push( (i+t, j) in world coords )
    if sign(v00) != sign(v01):   // 左边
    if sign(v10) != sign(v11):   // 右边
    if sign(v01) != sign(v11):   // 顶边
    if len(pts)==2:  // 恰好 2 个零点 → 画线段（3/4 个零点的歧义单元跳过，V1 简化）
        drawLine(pts[0], pts[1])

  // 3. 局部放大时自动重采样（视口 change → 重新采样，上采样即可，无需全局重算）
```

### 为什么双曲线"两支自动分离"

双曲线 F(x,y)=x2/a2−y2/b2−1：在左支和右支区域 F 符号相反，两支之间是"负"区域。
Marching 只在**符号变化的边界**画线 → 两支之间的负区域没有跨零边 → 自然分离，**无需手动分两支**。

### 遍历所有圆锥曲线的 F

| 曲线 | F(x,y) | 备注 |
|---|---|---|
| 椭圆 | x2/a2 + y2/b2 − 1 | 标准隐式 |
| 双曲线 | x2/a2 − y2/b2 − 1 | 两支自动分离 |
| 抛物线 | y2 − 2px | 或 x2=2py |
| 圆 | x2 + y2 − r2 | 椭圆特例 |
| 一般二次 | Ax2+Bxy+Cy2+Dx+Ey+F | 判别式 B2−4AC 定类型（V2 支持旋转轴） |

### 性能与陷阱

- 200×140 网格一次采样 ≈ 28k 次 F 求值，< 3ms（普通表达式）；只有**视口缩放平移时**重采样，拖动画点不触发；
- **不结的点**（F 恒 0 的退化区域，如原点附近 x2+y2=0）跳过——采样全 0 的单元不画；
- 与根号函数 sqrt 的 NaN 保护一致：采样时 NaN → 视作异号处理并丢弃该单元，避免画出鬼影线段。

---

## GAP-1 · geo3d 立体几何（新课标高分量）

**不做 WebGL/three.js**（体积红线 ≤60KB）。用 SVG + 旋转矩阵 + 画家算法（深度排序）。

### 1. 投影模型

```
// 3D 点 (x,y,z) → 屏幕 (X,Y) + 深度 depth
// 步骤：绕 Y 轴旋转 θ（左右看）→ 绕 X 轴旋转 φ（上下看）→ 投影

rotY(p, θ):
  x' =  x*cosθ + z*sinθ
  z' = -x*sinθ + z*cosθ
  y' = y

rotX(p, φ):
  y'' = y*cosφ − z'*sinφ
  z'' = y*sinφ + z'*cosφ
  x'' = x'

// 等轴测/正交投影（V1）：直接取 (x'', y'')，无近大远小（几何教科书风格）
screenX = cx + x'' * scale
screenY = cy − y'' * scale        // SVG y 向下
depth   = z''                      // 越大越远
```

V1 用**等轴测/正交投影**（无透视畸变，几何题默认）；V2 可选透视（真实感）。

### 2. 几何体 = 顶点 + 面（V/F 表示）

```
type Geo3D = {
  verts: [x,y,z][],          // 顶点
  faces: { idx: number[],    // 顶点索引（面 = 多边形）
           fill: string,     // 颜色（可带透明度区分面）
           hidden?: boolean  // 背面剔除
  }[]
}

// 预设模板：
//   棱柱：上下两底（n 边形）+ n 个侧面四边形
//   棱锥：底面 n 边形 + n 个侧面三角形
//   圆柱：n=32 棱柱近似（上下圆 + 侧面）
//   圆锥：n=32 棱锥近似
//   球：经度×纬度网格（V2）
```

### 3. 深度排序（画家算法——关键，解决遮挡）

```
function draw(geo3d, θ, φ):
  for face in geo3d.faces:
    // 背面剔除：面法向量 n = (v2−v1)×(v3−v1)，视线 v = viewerPos−faceCenter
    //   dot(n, v) > 0 → 背向，跳过（省一半绘制 + 不画"反面"）
    // depth = avg(顶点 z 投影值)
    face.depth = avg(depth(vert) for vert in face)
  // 按 depth 从大到小排序（远→近）
  sort(faces, by: depth desc)
  // 依序画：远处先画 → 近处后画 → 遮挡正确
  for face in sorted:
    polygon(project(face.verts))
```

### 4. 隐藏面优化

- **背面剔除**（必做）：法向量 n=(v2−v1)×(v3−v1)，dot(n,v)>0 跳过；
- **线框 vs 实体**：实体填充 + 描边；顶面/侧面/底面不同透明度（立体感）；
- **顶点/棱标注**：投影后放 SVG circle/line/text（A、B、C、A'…自动跟随旋转）。

### 5. 空间向量（线面角 / 二面角）

```
向量 v = B−A；法向量 n = cross(v1, v2)
线面角 sinφ = |dot(dir, n)| / (|dir| |n|)
二面角 cosθ = dot(n1, n2) / (|n1| |n2|)
点到平面 d = |dot(P−A, n)|/|n|
```

### 6. 交互模型

- **拖旋转**：拖画布 = 左右改 θ、上下改 φ（360°/-90°）；重绘只更新各 face 的 points（60fps）；
- 编辑/播放共用；播放器学生可旋转观察（静态图看不清三视图，转动即懂）；
- **剖切/辅助线**（V2）：半透明截面 + 辅助虚线。

### 关键陷阱

- **SVG 深度排序必须做**：不排序 = 面乱盖（斜看时侧面盖底面）；
- 填充色带透明度时排序更敏感——V1 用不透明面+边线，V2 再半透明；
- 别用纯线框（背面剔除线框会露"后侧线"）——实体填充才是正解。

---

## GAP-2 · stats 统计（统计全章 + 概率分布）

### 1. 直方图（histogram）

```
// 输入：data, bins（组数，默认 ceil(sqrt(n))）
// 1. min/max，组距 w = (max−min)/bins
// 2. 分桶统计频数 count[k]
// 3. 频率 = count[k]/n；高度 = 频率/组距（面积 = 频率，严格）
// 4. x 轴标组界，y 轴标频率/组距
// 5. 可叠加正态密度曲线（stats/dist 复用）
// 陷阱：必须以组距为底宽画矩形，不是竖线（面积法则）
```

### 2. 茎叶图（stemleaf）

```
// 两位数据 34,36,41：茎=十位，叶=个位；按茎排序；背靠背布局（两组对比）
// 纯 DOM/SVG 排版；注意茎叶图保留原始数据（与直方图信息差异）
```

### 3. 散点图 + 回归线（最小二乘）——重点

```
// 输入：pairs: [x,y][]
meanX = Σx/n;  meanY = Σy/n
Sxy = Σ(x−meanX)(y−meanY);  Sxx = Σ(x−meanX)²
slope b = Sxy / Sxx                // 回归线斜率
intercept a = meanY − b*meanX
// 画线：过 (xMin, a+b*xMin) 与 (xMax, a+b*xMax)
// r = Sxy / sqrt(Sxx*Syy)  相关系数
// 陷阱：Sxx=0（所有 x 相同）→ 无回归线 + 提示
```

### 4. 分布曲线（dist）

```
// 正态 N(μ,σ²)：f(x) = exp(−(x−μ)²/(2σ²)) / (σ√(2π))
// 二项 B(n,p)：P(k) = C(n,k) p^k (1−p)^(n−k)
//   C(n,k) 迭代乘防溢出：C = C * (n−k+1)/k
// 3σ 区间：μ±2.58σ(95%)、μ±3σ(99.7%)
```

---

## 实现顺序建议（依赖关系）

```
plotImplicit（GAP-3） ← 独立，最快见效（一个函数 + 复用 expr 的 F）
      ↓
geo3d（GAP-1）      ← 依赖 coord（投影复用 world↔screen）+ V/F + 排序
      ↓
stats（GAP-2）      ← 依赖 expr（回归/分布求值）+ plot 采样
```

**每个 GAP 的验证口号**：
- GAP-3：双曲线**两支自动分离**；
- GAP-1：棱柱**斜看时遮挡正确**（排序后近面盖远面）；
- GAP-2：直方图**面积 = 频率**；散点**回归线过质心**。
