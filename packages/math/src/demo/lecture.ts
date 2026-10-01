// 题目讲解系统演示：第15题（椭圆）→ 生成完整交互讲解页
import { validateProblem } from '../lecture/index.js';
import { renderProblemViz } from '../lecture/index.js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));

// ===== 第 15 题 Problem 数据 =====
const problem15: import('../lecture/index.js').Problem = {
  id: 'p15',
  source: '高考真题',
  stem: '已知动圆P与圆M:(x+3)²+y²=1外切，与圆N:(x−3)²+y²=81内切。<br>(1)求动圆圆心P的轨迹方程；<br>(2)求 1/|PM| + 1/|PN| 的取值范围。',
  answer: '(1) x²/25 + y²/16 = 1　(2) [2/5, 5/8]',
  tags: { knowledge: '椭圆', difficulty: 3 as const, exam: true },
  steps: [
    { id: 's1', title: '① 审题转化', text: '圆M:(x+3)²+y²=1 圆心 M(−3,0), r=1；圆N:(x−3)²+y²=81 圆心 N(3,0), r=9。外切 ⇒ |PM|=r+1，内切 ⇒ |PN|=9−r。' },
    { id: 's2', title: '② 数形结合', text: '|PM|=r+1, |PN|=9−r ⇒ |PM|+|PN| = (r+1)+(9−r) = <b>10</b>（恒等！）。P 到两定点距离和为定值 10 ⇒ 椭圆定义。' },
    { id: 's3', title: '③ 定轨迹', text: '2a=10 ⇒ a=5；焦点 M(−3,0), N(3,0) ⇒ c=3；b²=a²−c²=16 ⇒ b=4。轨迹：<b>x²/25 + y²/16 = 1</b>。' },
    { id: 's4', title: '④ 互动探索', text: '拖 P 点（绿色）沿椭圆运动：|PM|+|PN| 恒为 10（椭圆定义验证），1/|PM|+1/|PN| ∈ [2/5, 5/8] 范围探索。' }
  ],
  viz: { kind: 'implicit', type: 'ellipse', params: [5, 4] }
};

const errs = validateProblem(problem15);
if (errs.length) { console.error('题目数据校验失败:', errs); process.exit(1); }

// 各步骤的 SVG（用引擎渲染）
const svgStep0 = renderProblemViz(problem15, 0, 700, 400);
const svgStep1 = renderProblemViz(problem15, 1, 700, 400);
const svgStep2 = renderProblemViz(problem15, 2, 700, 400);
const svgStep3 = renderProblemViz(problem15, 3, 700, 400);

// 内嵌交互 JS：拖 P 点（参数化椭圆）+ 实时读数
const interactJs = `
// 椭圆参数化拖动 + 读数
var W=700,H=400, xMin=-6,xMax=6,yMin=-4,yMax=4;
var a=5,b=4,c=3,M=[-3,0],N=[3,0];
var pX=5*Math.cos(0.6), pY=4*Math.sin(0.6);
var svgEl=null;
function el(x,y){ return [(x-xMin)/(xMax-xMin)*W, H-(y-yMin)/(yMax-yMin)*H]; }
function elInv(sx,sy){ return [xMin+sx/W*(xMax-xMin), yMin+(1-sy/H)*(yMax-yMin)]; }
function drawP(){
  var pt=el(pX,pY), m=el(M[0],M[1]), n=el(N[0],N[1]);
  var pm=Math.sqrt((pX-M[0])*(pX-M[0])+(pY-M[1])*(pY-M[1]));
  var pn=Math.sqrt((pX-N[0])*(pX-N[0])+(pY-N[1])*(pY-N[1]));
  var st='';
  st+='<line x1="'+pt[0]+'" y1="'+pt[1]+'" x2="'+m[0]+'" y2="'+m[1]+'" stroke="#e0457b" stroke-width="1.6"/>';
  st+='<line x1="'+pt[0]+'" y1="'+pt[1]+'" x2="'+n[0]+'" y2="'+n[1]+'" stroke="#e0457b" stroke-width="1.6" stroke-dasharray="5 3"/>';
  st+='<circle cx="'+pt[0]+'" cy="'+pt[1]+'" r="5.5" fill="#38c98a" stroke="#1e2330" stroke-width="1.6"/>';
  st+='<text x="'+(pt[0]+8)+'" y="'+(pt[1]-8)+'" font-size="13" fill="#0f4c81">P</text>';
  st+='<text x="'+(m[0]-14)+'" y="'+(m[1]+16)+'" font-size="11" fill="#e0457b">M(−3,0)</text>';
  st+='<text x="'+(n[0]+4)+'" y="'+(n[1]+16)+'" font-size="11" fill="#e0457b">N(3,0)</text>';
  return st;
}
function updateReadout(){
  var pm=Math.sqrt((pX-M[0])*(pX-M[0])+(pY-M[1])*(pY-M[1]));
  var pn=Math.sqrt((pX-N[0])*(pX-N[0])+(pY-N[1])*(pY-N[1]));
  document.getElementById('readout').textContent='|PM|='+pm.toFixed(3)+'  |PN|='+pn.toFixed(3)+'  |PM|+|PN|='+(pm+pn).toFixed(3)+' (恒=10)  1/|PM|+1/|PN|='+(1/pm+1/pn).toFixed(4);
}
// 初始化：注入 P 点+读数到第一个图
window.addEventListener('load', function(){
  var host=document.getElementById('viz-host');
  if(!host) return;
  // 克隆第0步图 + 加 P
  host.innerHTML=host.innerHTML.replace('<svg', '<svg id="viz-svg"');
  drawP();
});
`;

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>题目讲解系统 · 第15题 (PROTOTYPE)</title>
<style>
:root{--brand:#3b6ef6;--ink:#1e2330;--muted:#8a90a0;--line:#e6e8ee;--bg:#f4f5f8}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",Arial,sans-serif;background:var(--bg);color:var(--ink);padding:20px;font-size:14px}
.wrap{max-width:1280px;margin:0 auto}
h1{font-size:20px;margin-bottom:4px}
.sub{color:var(--muted);font-size:13px;margin-bottom:16px}
.grid{display:grid;grid-template-columns:1fr 1.1fr;gap:16px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px;box-shadow:0 4px 16px rgba(20,30,60,.05)}
.stem{font-family:Georgia,serif;font-size:15px;line-height:1.8;color:#0f4c81;background:#fafbfe;border:1px solid #e2e6f0;border-radius:8px;padding:14px;margin-bottom:12px}
.tagrow{display:flex;gap:6px;margin-bottom:12px}
.tag{font-size:11px;background:#eef2ff;color:var(--brand);padding:3px 10px;border-radius:999px}
.step-list{display:flex;flex-direction:column;gap:8px}
.step-item{background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px;cursor:pointer}
.step-item.active{border-color:var(--brand);box-shadow:0 0 0 2px rgba(59,110,246,.15)}
.step-item .s-t{font-weight:700;font-size:14px;display:flex;align-items:center;gap:8px}
.step-item .s-n{width:22px;height:22px;background:var(--brand);color:#fff;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:700;flex-shrink:0}
.step-item.finished .s-n{background:#38c98a}
.step-item .s-txt{font-size:13px;color:#5b6478;margin-top:6px;line-height:1.6;display:none}
.step-item.active .s-txt{display:block}
.viz-elm{position:relative;background:#fff;border:1px solid #e2e6f0;border-radius:10px;padding:8px}
.readout{position:absolute;top:8px;left:10px;font-size:12px;font-family:monospace;color:#0f4c81;background:rgba(255,255,255,.97);border:1px solid #cfe0f5;border-radius:6px;padding:4px 8px;z-index:2;white-space:pre}
.prompt{position:absolute;bottom:8px;left:10px;font-size:12px;color:#0aa;background:rgba(240,255,255,.97);border:1px solid rgba(0,170,170,.4);border-radius:6px;padding:4px 8px;z-index:2}
.nav{display:flex;gap:8px;margin-top:12px}
.btn{padding:8px 16px;border-radius:8px;border:none;background:var(--brand);color:#fff;font-size:13px;font-weight:600;cursor:pointer}
.btn.ghost{background:#fff;border:1px solid var(--line);color:var(--ink)}
.hint{font-size:12px;color:var(--muted);margin-top:8px;line-height:1.5}
svg{display:block;width:100%;height:auto}
</style>
</head>
<body>
<div class="wrap">
<h1>题目讲解系统 · 原型（正式引擎）</h1>
<div class="sub">第 15 题 · 椭圆 · Problem 数据模型 + 讲解引擎生成 · 步骤切换图联动 · 拖 P 探索</div>
<div class="grid">
<div class="card">
  <div class="stem">${problem15.stem}</div>
  <div class="tagrow"><span class="tag">${problem15.tags?.knowledge}</span><span class="tag">难度 ●●●</span><span class="tag">${problem15.source}</span></div>
  <div class="step-list" id="steps"></div>
  <div class="nav"><button class="btn ghost" id="prev">← 上一步</button><button class="btn" id="next">下一步 →</button><button class="btn ghost" id="answer">答案</button></div>
  <div id="answer-box" style="display:none;margin-top:10px;background:linear-gradient(135deg,#f0f7ff,#fff);border:1px solid #cfe0f5;border-radius:8px;padding:10px;font-size:13px;color:#0f4c81"><b>答案</b>：${problem15.answer}</div>
</div>
<div class="card">
  <div class="viz-elm">
    <div class="readout" id="readout">—</div>
    <div class="prompt" id="prompt">💡 点击步骤看图联动</div>
    <div id="viz-host"></div>
  </div>
  <div class="hint">🔍 拖 P 点（绿色）沿椭圆运动，观察 |PM|+|PN| 恒为 10</div>
</div>
</div>
</div>
<script>
// 各步骤 SVG（引擎预渲染）
var svgs = [
  ${JSON.stringify(svgStep0)},
  ${JSON.stringify(svgStep1)},
  ${JSON.stringify(svgStep2)},
  ${JSON.stringify(svgStep3)}
];
var texts = ${JSON.stringify(problem15.steps.map(s => s.text))};
var titles = ${JSON.stringify(problem15.steps.map(s => s.title))};
var cur = 0, curText = '';
function renderSteps(){
  var box = document.getElementById('steps'); box.innerHTML = '';
  titles.forEach(function(t, i){
    var d = document.createElement('div');
    d.className = 'step-item' + (i===cur?' active':'') + (i<cur?' finished':'');
    d.innerHTML = '<div class="s-t"><span class="s-n">'+(i+1)+'</span>'+t+'</div><div class="s-txt">'+texts[i]+'</div>';
    d.onclick = function(){ cur=i; renderSteps(); renderViz(); };
    box.appendChild(d);
  });
}
function renderViz(){
  var host = document.getElementById('viz-host');
  host.innerHTML = svgs[cur];
  var prompt = document.getElementById('prompt');
  prompt.textContent = cur===3 ? '💡 拖 P 点观察 |PM|+|PN| 恒为 10' : '💡 点击步骤 '+(cur+1)+' 看图联动';
  if(cur===3) injectP();
}
function injectP(){
  // 拖 P 点
  var host = document.getElementById('viz-host');
  var svg = host.querySelector('svg');
  if(!svg) return;
  svg.style.pointerEvents = 'none';
  // 画 P + 线
  var m=[-3,0],n=[3,0],a=5,b=4;
  var W=700,H=400;
  function el(x,y){ return [(x+6)/12*W, H-(y+4)/8*H]; }
  var pt=el(pX,pY);
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;inset:0;pointer-events:all;cursor:grab';
  overlay.addEventListener('pointerdown', function(ev){ dragging = true; ev.preventDefault(); });
  overlay.addEventListener('pointermove', function(ev){
    if(!dragging) return;
    var r = svg.getBoundingClientRect();
    var sx = (ev.clientX - r.left)/r.width*W, sy=(ev.clientY-r.top)/r.height*H;
    var wx = sx/W*12-6, wy = 4 - sy/H*8;
    var theta = Math.atan2(wy/b, wx/a);
    pX = a*Math.cos(theta); pY = b*Math.sin(theta);
    drawP();
  });
  document.addEventListener('pointerup', function(){ dragging = false; });
  drawP();
}
function drawP(){
  var host = document.getElementById('viz-host');
  var svg = host.querySelector('svg');
  if(!svg) return;
  var W=700,H=400;
  function el(x,y){ return [(x+6)/12*W, H-(y+4)/8*H]; }
  var m=[-3,0],n=[3,0];
  var pt=el(pX,pY), mm=el(m[0],m[1]), nn=el(n[0],n[1]);
  var st='';
  st+='<line x1="'+pt[0]+'" y1="'+pt[1]+'" x2="'+mm[0]+'" y2="'+mm[1]+'" stroke="#e0457b" stroke-width="1.6"/>';
  st+='<line x1="'+pt[0]+'" y1="'+pt[1]+'" x2="'+nn[0]+'" y2="'+nn[1]+'" stroke="#e0457b" stroke-width="1.6" stroke-dasharray="5 3"/>';
  st+='<circle cx="'+pt[0]+'" cy="'+pt[1]+'" r="5.5" fill="#38c98a" stroke="#1e2330" stroke-width="1.6"/>';
  st+='<text x="'+(pt[0]+8)+'" y="'+(pt[1]-8)+'" font-size="13" fill="#0f4c81">P</text>';
  st+='<text x="'+(mm[0]-14)+'" y="'+(mm[1]+16)+'" font-size="11" fill="#e0457b">M(−3,0)</text>';
  st+='<text x="'+(nn[0]+4)+'" y="'+(nn[1]+16)+'" font-size="11" fill="#e0457b">N(3,0)</text>';
  var svgHTML = svg.outerHTML;
  // 插入到 svg 里（在</svg>前）：svg.outerHTML 已含，改为直接重建
  host.innerHTML = host.innerHTML.replace('</svg>', st + '</svg>');
  updateReadoutP();
}
function updateReadoutP(){
  var pm=Math.sqrt((pX-M00[0])*(pX-M00[0])+(pY-M00[1])*(pY-M00[1]));
  var pn=Math.sqrt((pX-M00[1])*(pX-M00[1])+(pY-N00[1])*(pY-N00[1]));
}
var dragging=false, pX=5*Math.cos(0.6), pY=4*Math.sin(0.6);
var M00=[-3,0], N00=[3,0];
document.getElementById('prev').onclick=function(){ if(cur>0){cur--;renderSteps();renderViz();} };
document.getElementById('next').onclick=function(){ if(cur<3){cur++;renderSteps();renderViz();} };
document.getElementById('answer').onclick=function(){ var ab=document.getElementById('answer-box'); ab.style.display = ab.style.display==='none'?'block':'none'; };
renderSteps(); renderViz();
</script>
</body>
</html>`;

writeFileSync(join(here, 'lecture-p15.html'), html);
console.log('✓ lecture-p15.html 已生成（' + html.length + ' chars）');
