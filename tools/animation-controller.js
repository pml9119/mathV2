/* mathPPT 动图控制器 — 每幅动图右下角浮条：播放/暂停、速度 ×½/×1/×2、拖动定位动点。
   原理：SVGSVGElement.setCurrentTime / pauseAnimations 驱动 SMIL 时间轴。
   自愈：运行时克隆/重建 slide DOM 后，按 svg.dataset.mpc 标记重建浮条与监听。 */
(function () {
  "use strict";
  if (window.__mpcInstalled) return;
  window.__mpcInstalled = true;
  var STYLE =
    ".mpc-ctl{position:absolute;right:10px;bottom:10px;display:flex;align-items:center;gap:6px;padding:4px 9px;border-radius:12px;" +
    "background:rgba(11,16,32,0.84);border:1px solid rgba(76,201,240,0.42);backdrop-filter:blur(4px);z-index:40;user-select:none;box-shadow:0 2px 10px rgba(0,0,0,0.35);}" +
    ".mpc-ctl button{background:rgba(76,201,240,0.16);border:1px solid rgba(76,201,240,0.5);color:#9ADCFF;border-radius:7px;height:23px;min-width:27px;padding:0 6px;" +
    "font:600 12px 'Segoe UI',sans-serif;cursor:pointer;line-height:1;}" +
    ".mpc-ctl button:hover{background:rgba(76,201,240,0.32);color:#fff;}" +
    ".mpc-ctl input[type=range]{width:120px;height:14px;accent-color:#4CC9F0;cursor:pointer;margin:0;}" +
    ".mpc-ctl .mpc-t{color:rgba(233,238,248,0.62);font:600 10px 'Segoe UI',sans-serif;min-width:56px;text-align:right;white-space:nowrap;}";
  var style = document.createElement("style");
  style.textContent = STYLE;
  function addStyle() { (document.head || document.documentElement).appendChild(style); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addStyle);
  else addStyle();

  var states = new Map();
  var speeds = [1, 2, 0.5];
  function label(st) { return st.t.toFixed(1) + "s / " + st.maxT + "s"; }
  function makePill(svg) {
    var host = svg.parentElement;
    if (!host) return null;
    var stale = host.querySelector(".mpc-ctl");
    if (stale) stale.remove();
    var maxT = 10;
    svg.querySelectorAll("[dur]").forEach(function (a) {
      var d = parseFloat(a.getAttribute("dur"));
      if (d > maxT) maxT = d;
    });
    var pill = document.createElement("div");
    pill.className = "mpc-ctl";
    var btn = document.createElement("button");
    btn.textContent = "\u23F8"; btn.title = "播放 / 暂停";
    var spd = document.createElement("button");
    spd.textContent = "\u00D71"; spd.title = "速度 \u00D7\u00BD / \u00D71 / \u00D72";
    var tt = document.createElement("span");
    tt.className = "mpc-t";
    var range = document.createElement("input");
    range.type = "range"; range.min = "0"; range.max = "1000"; range.value = "0";
    range.title = "拖动定位动点";
    pill.appendChild(btn); pill.appendChild(range); pill.appendChild(spd); pill.appendChild(tt);
    host.appendChild(pill);
    // 编辑画布里：不要让控制条冒泡成“元素拖拽/选择/框选”的起点
    ["pointerdown", "mousedown", "touchstart", "click", "dblclick"].forEach(function (t) {
      pill.addEventListener(t, function (e) { e.stopPropagation(); });
    });
    var st = { svg: svg, btn: btn, spd: spd, range: range, tt: tt, maxT: maxT, t: 0, playing: true, speed: 1, seen: false };
    btn.addEventListener("click", function () {
      st.playing = !st.playing;
      btn.textContent = st.playing ? "\u23F8" : "\u25B6";
      if (st.playing) svg.unpauseAnimations(); else svg.pauseAnimations();
    });
    var si = 0;
    spd.addEventListener("click", function () {
      si = (si + 1) % speeds.length;
      st.speed = speeds[si];
      spd.textContent = st.speed === 0.5 ? "\u00D7\u00BD" : "\u00D7" + st.speed;
    });
    range.addEventListener("input", function () {
      st.t = (parseFloat(range.value) / 1000) * st.maxT;
      svg.setCurrentTime(st.t);
      tt.textContent = label(st);
    });
    svg.dataset.mpc = "1";
    states.set(svg, st);
    return st;
  }
  var lastNow = 0;
  function visibleSvg(svg) {
    if (!svg || !svg.isConnected) return false;
    var r = svg.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  }
  function tick(now) {
    var dt = Math.min(0.1, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;
    var alive = document.querySelectorAll(".reveal [data-anim], .bento-slide [data-anim]");
    for (var i = 0; i < alive.length; i++) {
      var s = alive[i];
      if (s.dataset.mpc !== "1" || !states.has(s)) makePill(s);
    }
    states.forEach(function (st, svg) {
      if (!svg.isConnected) { states.delete(svg); return; }
      var vis = visibleSvg(svg);
      if (vis && !st.seen) {
        st.seen = true; st.t = 0; st.playing = true;
        st.btn.textContent = "\u23F8";
        svg.unpauseAnimations();
        svg.setCurrentTime(0);
        st.range.value = "0";
        st.tt.textContent = label(st);
      } else if (!vis && st.seen) {
        st.seen = false;
        svg.pauseAnimations();
      }
      if (vis && st.seen && st.playing) {
        st.t = (st.t + dt * st.speed) % st.maxT;
        svg.setCurrentTime(st.t);
        st.range.value = Math.round((st.t / st.maxT) * 1000);
        st.tt.textContent = label(st);
      }
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();