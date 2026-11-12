/* 화면표준_1110 — 모두의 대입 · 수학: 머리띠(1절)·아래 탭(2절) 마크업을 표준 모양으로 맞춘다.
   index.html 의 정적 .topbar / .tabbar 를 한 번 고쳐 쓰는 작은 스크립트다. app.js 는 건드리지 않는다.
   route() 가 [data-nav] 에 aria-current 를 달기 때문에 새 링크도 data-nav 를 그대로 단다. 여러 번 불려도 한 번만 일한다. */
(function () {
  "use strict";
  var SVG = function (b) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' + b + "</svg>"; };
  var GRID = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>';
  /* 홈=집 · 스킬=가지 · 개념=책 · 기출=번개 · 기록=막대 · 설정=톱니 (화면표준 2절) */
  var TABS = [
    ["today", "오늘", "#/today", SVG('<path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>')],
    ["skills", "합격 지도", "#/skills", SVG('<circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="7" r="2.4"/><circle cx="8" cy="18" r="2.4"/><circle cx="18" cy="17" r="2.4"/><path d="M8.2 7 15.8 7M7 8.2 7.6 15.6M16.6 9.2 8.8 16.6M18 9.4v5.2"/>')],
    ["concepts", "개념", "#/concepts", SVG('<path d="M12 6.5C10.2 5 7.6 4.5 4.5 4.8v13c3.1-.3 5.7.2 7.5 1.7 1.8-1.5 4.4-2 7.5-1.7v-13c-3.1-.3-5.7.2-7.5 1.7zM12 6.5v13"/>')],
    ["exams", "기출", "#/exams", SVG('<path d="M13 3 5.5 13.5H11L10 21l7.5-10.5H12z"/>')],
    ["records", "기록", "#/records", SVG('<path d="M5 19.5V12M12 19.5V5M19 19.5V9"/>')],
    ["settings", "설정", "#/settings", SVG('<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/>')]
  ];
  function build() {
    var top = document.querySelector(".topbar"), tab = document.querySelector(".tabbar");
    if (top && !top.dataset.std) {
      top.dataset.std = "1";
      var brand = top.querySelector(".brand");
      if (brand) {
        brand.innerHTML = '<span class="brand-mark">대</span>';
        var bn = document.createElement("span"); bn.className = "bn"; bn.innerHTML = "모두의 <b>대입</b>";
        var bs = document.createElement("span"); bs.className = "bsub"; bs.textContent = "수학";
        brand.after(bn); bn.after(bs);
      }
      var nav = document.createElement("nav"); nav.className = "hnav"; nav.setAttribute("aria-label", "주 메뉴");
      nav.innerHTML = TABS.map(function (t) { return '<a data-nav="' + t[0] + '" href="' + t[2] + '">' + t[1] + "</a>"; }).join("");
      var g = document.createElement("a"); g.className = "gridb"; g.href = "https://teralearning.kr/"; g.setAttribute("aria-label", "테라러닝 전체 서비스"); g.innerHTML = GRID;
      top.appendChild(nav); top.appendChild(g);
    }
    if (tab && !tab.dataset.std) {
      tab.dataset.std = "1";
      tab.innerHTML = TABS.map(function (t) { return '<a class="tab" data-nav="' + t[0] + '" href="' + t[2] + '">' + t[3] + "<span>" + t[1] + "</span></a>"; }).join("");
    }
    /* 이미 그려진 화면이 있으면 현재 칸 표시를 다시 단다 */
    var cur = location.hash.split("/")[1] || "today";
    var map = { skill: "skills", units: "concepts", concept: "concepts" };
    cur = map[cur] || cur;
    document.querySelectorAll("[data-nav]").forEach(function (a) { a.setAttribute("aria-current", a.dataset.nav === cur ? "page" : "false"); });
  }
  /* 문제 화면 머리띠: 뒤로 단추 옆에 화면 이름(스킬·단원 이름)을 단다 — 화면표준 1절 안쪽 화면 */
  function title() {
    var st = document.querySelector(".solve-top");
    if (!st || st.querySelector(".ttl")) return;
    var pill = document.querySelector(".solve .qmeta .pill");
    var t = document.createElement("div"); t.className = "ttl"; t.textContent = pill ? pill.textContent : "문제 풀이";
    var back = st.querySelector(".iconbtn"); if (back) back.after(t);
  }
  function watch() {
    var v = document.getElementById("view"); if (!v) return;
    new MutationObserver(title).observe(v, { childList: true, subtree: false });
    title();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watch); else watch();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();

  /* 합격전략 알약: 머리띠 밖으로 꺼내 떠 있게 한다(backdrop-filter 가 fixed 기준을 바꾸므로 body 로) */
  function fab() {
    document.querySelectorAll(".topbar .zs-btn").forEach(function (b) { b.style.cssText = ""; document.body.appendChild(b); });
  }
  /* 홈: 오늘 카드를 「제목 + 요약 + 번호 동그라미 단계 줄 + 시작」 으로, 등급·연속 출석을 숫자 두 칸 + 출석 판으로 */
  function home() {
    var h = document.querySelector("#view .hero"); if (!h || h.dataset.std) return; h.dataset.std = "1";
    var t = h.querySelector(".title"), core = h.querySelector(".core"), meta = h.querySelector(".meta"), btn = h.querySelector("[data-drill]");
    if (!t || !btn) return;
    var mt = meta ? [].map.call(meta.children, function (x) { return x.textContent.trim(); }).join(" · ") : "";
    var min = (mt.match(/약\s*\d+분/) || [""])[0], cnt = (mt.match(/문항\s*(\d+)개/) || [0, ""])[1];
    var box = document.createElement("div"); box.className = "tstep";
    var pm = getPer(getSubj().length), nsk = Math.max(1, Math.round(pm / 16));
    box.innerHTML = '<h3>오늘 ' + fmt(pm) + '</h3><p class="tsum"></p><div class="stp now"><span class="n">1</span><span class="tx"><b></b><span></span></span><span class="m">' + (cnt ? cnt + "문항" : "") + "</span></div>";
    box.querySelector(".tsum").textContent = mt + " · 스킬 " + nsk + "개 분량";
    box.querySelector(".tx b").textContent = t.textContent;
    box.querySelector(".tx span").textContent = core ? core.textContent : "";
    h.insertBefore(box, h.firstChild); box.after(btn); btn.textContent = "시작";
    var tier = document.querySelector("#view .statrow .tier"), row = document.querySelector("#view .statrow"), st = row && row.querySelector(".streak");
    if (tier && st && !row.querySelector(".numcard")) {
      var n = (st.textContent.match(/(\d+)\s*일/) || [0, "0"])[1];
      var c = document.createElement("div"); c.className = "card numcard"; c.innerHTML = "<b>" + n + "일</b><span>연속 출석</span>";
      tier.after(c);
    }
  }
  function watchHome() {
    var v = document.getElementById("view"); if (!v) return;
    new MutationObserver(home).observe(v, { childList: true }); home();
    var tb = document.querySelector(".topbar"); if (tb) new MutationObserver(fab).observe(tb, { childList: true }); fab();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watchHome); else watchHome();

  /* ───── 7절 하루 공부 시간(대입 규칙) ───── */
  var SUBJ = [["tongsa", "통합사회"], ["hanguksa", "한국사"], ["tonggwa", "통합과학"], ["math", "수학"], ["gukeo", "국어"], ["english", "영어"]];
  var PERS = [[15, "15분"], [30, "30분"], [45, "45분"], [60, "1시간"], [90, "1시간 30분"], [120, "2시간"]];
  var MAXMIN = 480, ME = "math";
  function fmt(m) { var h = Math.floor(m / 60), r = m % 60; return h ? (r ? h + "시간 " + r + "분" : h + "시간") : r + "분"; }
  function getSubj() {
    var a = []; try { a = JSON.parse(localStorage.getItem("tera_daeip_subjects") || "[]"); } catch (e) { a = []; }
    if (!Array.isArray(a)) a = [];
    a = a.filter(function (x) { return SUBJ.some(function (s) { return s[0] === x; }); });
    if (a.indexOf(ME) < 0) a.push(ME);
    return a;
  }
  function getPer(n) {
    var v = 30; try { v = parseInt(localStorage.getItem("tera_daeip_per_min"), 10) || 30; } catch (e) { }
    var lim = Math.floor(MAXMIN / Math.max(1, n)); if (v > lim) v = lim;
    var ok = PERS.filter(function (p) { return p[0] <= lim; });
    if (!ok.some(function (p) { return p[0] === v; })) v = ok.length ? ok[ok.length - 1][0] : 15;
    return v;
  }
  function saveT(a, per) { try { localStorage.setItem("tera_daeip_subjects", JSON.stringify(a)); localStorage.setItem("tera_daeip_per_min", String(per)); } catch (e) { } }
  function settingsTime() {
    var v = document.getElementById("view"); if (!v) return;
    var head = v.querySelector(".today-head"); if (!head || v.querySelector("#tstime") || !v.querySelector(".skins")) return;
    var sec = document.createElement("div"); sec.id = "tstime";
    function draw() {
      var a = getSubj(), per = getPer(a.length); saveT(a, per);
      sec.innerHTML = '<h3 class="h2">공부할 과목 <small>하루 공부 시간</small></h3><section class="card pad16">' +
        '<div class="seg" data-k="subj">' + SUBJ.map(function (s) { var on = a.indexOf(s[0]) >= 0; return '<button data-s="' + s[0] + '" aria-pressed="' + on + '"' + (s[0] === ME ? ' aria-disabled="true"' : "") + ">" + s[1] + "</button>"; }).join("") + "</div>" +
        '<p class="muted" style="font:600 13px/1.4 var(--font-ui);margin:10px 0 6px">과목당 하루 시간</p>' +
        '<div class="seg" data-k="per">' + PERS.map(function (p) { var off = p[0] * a.length > MAXMIN; return '<button data-p="' + p[0] + '" aria-pressed="' + (p[0] === per) + '"' + (off ? ' disabled class="off"' : "") + ">" + p[1] + "</button>"; }).join("") + "</div>" +
        '<p class="tsum2">고른 과목 ' + a.length + "개 · 하루 합계 " + fmt(per * a.length) + "</p></section>";
      sec.querySelectorAll("[data-s]").forEach(function (b) { b.onclick = function () {
        var id = b.dataset.s; if (id === ME) return; var cur = getSubj(), i = cur.indexOf(id);
        if (i >= 0) cur.splice(i, 1); else cur.push(id);
        saveT(cur, getPer(cur.length)); draw(); }; });
      sec.querySelectorAll("[data-p]").forEach(function (b) { b.onclick = function () { saveT(getSubj(), parseInt(b.dataset.p, 10)); draw(); }; });
    }
    draw(); head.after(sec);
  }

  /* ───── 8절 풀이 창 ───── */
  var curQ = null;
  function tex(x) {
    var t = String(x == null ? "" : x).replace(/\$/g, "");
    for (var i = 0; i < 4; i++) t = t.replace(/\\(?:d|t)?frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)").replace(/\\sqrt\{([^{}]*)\}/g, "√($1)").replace(/\\(?:mathrm|text|overline|mathbf)\s*\{([^{}]*)\}/g, "$1");
    var M = { "\\times": "×", "\\cdot": "·", "\\div": "÷", "\\le": "≤", "\\leq": "≤", "\\ge": "≥", "\\geq": "≥", "\\ne": "≠", "\\neq": "≠", "\\pm": "±", "\\pi": "π", "\\theta": "θ", "\\alpha": "α", "\\beta": "β", "\\infty": "∞", "\\to": "→", "\\rightarrow": "→", "\\Rightarrow": "⇒", "\\therefore": "∴", "\\triangle": "△", "\\angle": "∠", "\\circ": "°", "\\sum": "Σ", "\\log": "log", "\\sin": "sin", "\\cos": "cos", "\\tan": "tan", "\\lim": "lim", "\\,": " ", "\\;": " ", "\\!": "", "\\ ": " ", "\\left": "", "\\right": "", "\\quad": "  ", "\\{": "{", "\\}": "}" };
    Object.keys(M).sort(function (a, b) { return b.length - a.length; }).forEach(function (k) { t = t.split(k).join(M[k]); });
    t = t.replace(/\^\{([^{}]*)\}/g, "^($1)").replace(/_\{([^{}]*)\}/g, "_($1)").replace(/\\[a-zA-Z]+/g, "").replace(/[{}]/g, "");
    return t.replace(/\s+/g, " ").trim();
  }
  var stepCache = {};
  function stepsFor(q) {
    var S = stepCache[q.id]; if (!S) return [];
    return (S["단계"] || []).map(function (st, i, all) {
      var why = [].concat(st["식"] || []).map(tex).join("\n"); if (st["설명"]) why += (why ? "\n" : "") + tex(st["설명"]);
      return { q: (i + 1) + "단계 · " + tex(st["제목"] || "") + (st["힌트"] ? "\n힌트: " + tex(st["힌트"]) : ""), options: [i + 1 < all.length ? "다음 단계 보기" : "풀이 끝 확인"], answer: 0, why: why };
    });
  }
  function padOpts() {
    var q = curQ; if (!q) return { key: "math", title: "풀이 창" };
    var st = stepsFor(q), S = stepCache[q.id];
    var sk = ((window.TAX && TAX["스킬"]) || []).filter(function (k) { return q.s && k.id === q.s[0]; })[0];
    var o = { key: q.id, title: sk ? sk["이름"] : "풀이 창" };
    if (st.length) { o.steps = st; o.prefer = "steps"; if (S && S["길"]) o.result = "풀이 길 · " + tex(S["길"]); }
    var qc = document.querySelector(".solve .qcard"); if (qc) setTimeout(function () { window.scrollTo(0, Math.max(0, qc.getBoundingClientRect().top + window.scrollY - 70)); }, 60);
    return o;
  }
  function padBtn() {
    var qc = document.querySelector(".solve .qcard"); if (!qc || document.querySelector(".solve .tpad-wrap") || !window.TERA_PAD) return;
    var host = document.createElement("div"); host.className = "tpad-wrap"; qc.after(host);
    window.TERA_PAD.button(host, padOpts);
    if (!curQ) { var qp = new URLSearchParams(location.search).get("q"); if (qp) curQ = (window.BANK || []).filter(function (x) { return x.id === qp.split(",")[0]; })[0] || null; }
    var q = curQ; if (q && window.STEPUI && STEPUI.has(q)) STEPUI.load(q).then(function (S) { if (S) stepCache[q.id] = S; });
  }
  function hookPad() {
    if (window.STEPUI && !STEPUI.__std) { STEPUI.__std = 1; var h = STEPUI.has; STEPUI.has = function (q) { if (q && q.id) curQ = q; return h.apply(this, arguments); }; }
    if (!window.TERA_PAD && !document.querySelector("script[data-tpad]")) { var sc = document.createElement("script"); sc.src = "js/tera-pad.js?v=1112b"; sc.dataset.tpad = "1"; sc.onload = padBtn; document.head.appendChild(sc); }
    var v = document.getElementById("view"); if (!v) return;
    new MutationObserver(function () { padBtn(); settingsTime(); }).observe(v, { childList: true });
    padBtn(); settingsTime();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hookPad); else hookPad();

  /* ───── 11절 합격 지도: 스킬 탭 화면을 공용 tera-map.js?v=1111g 로 ───── */
  function mapData() {
    var T = window.TAX, B = window.BANK || [], cnt = {}, yrs = {};
    B.forEach(function (q) {
      var y = (String(q.src || "").match(/(20\d\d)/) || [])[1]; if (!y) return;
      yrs[y] = 1; (q.s || []).forEach(function (s) { cnt[s] = (cnt[s] || 0) + 1; });
    });
    var ny = Object.keys(yrs).length;
    var UN = {}; (T["단원"] || []).forEach(function (u) { UN[u.id] = u["이름"]; });
    var uc = {}, ok = {}, ut = {};
    B.forEach(function (q) {
      var y = (String(q.src || "").match(/(20\d\d)/) || [])[1];
      (q.s || []).forEach(function (s) {
        var k = s + "|" + q.u; ut[k] = (ut[k] || 0) + 1;
        if (y) uc[k] = (uc[k] || 0) + 1;
        if (window.STORE && STORE.lastOk(q.id)) ok[k] = (ok[k] || 0) + 1;
      });
    });
    function leavesOf(s) {
      return (s["단원"] || []).filter(function (u) { return UN[u]; }).map(function (u) {
        var k = s.id + "|" + u, l = { name: UN[u].replace(/\s*[(（].*$/, "") || UN[u], pct: ut[k] ? Math.round((ok[k] || 0) / ut[k] * 100) : 0 };
        if (uc[k] && ny) l.avg = Math.round(uc[k] / ny * 10) / 10;
        return l;
      });
    }
    return (T["스킬갈래"] || []).map(function (b) {
      return { name: b["이름"], nodes: (T["스킬"] || []).filter(function (s) { return s["갈래"] === b.id; }).map(function (s) {
        var m = window.STORE && STORE.mastery ? STORE.mastery(s.id) : 0;
        var n = { id: s.id, name: s["이름"], pct: Math.round((m || 0) * 100), leaves: leavesOf(s) };
        if (cnt[s.id] && ny) n.avg = Math.round(cnt[s.id] / ny * 10) / 10;
        return n;
      }) };
    }).filter(function (g) { return g.nodes.length; });
  }
  function mountMap() {
    var v = document.getElementById("view");
    if (!v || location.hash.indexOf("#/skills") !== 0 || !window.TERA_MAP || !v.querySelector(".branch") || v.querySelector(".tm")) return;
    var gd = v.querySelector("#graphDrill");
    var host = document.createElement("div"); host.className = "tmhost";
    if (gd) gd.remove();
    v.innerHTML = ""; v.appendChild(host);
    document.body.classList.add("tmapping");
    window.TERA_MAP.mount(host, {
      title: "수학", sub: "합격 지도", unit: "문제", mark: "star", groups: mapData(),
      onLeaf: function (leaf, node) { location.hash = "#/skill/" + node.id; },
      onStart: function (node) { location.hash = "#/skill/" + node.id; }
    });
    if (gd) { var w = document.createElement("div"); w.style.cssText = "margin-top:14px"; w.appendChild(gd); v.appendChild(w); }
  }
  function mapClass() { if (location.hash.indexOf("#/skills") !== 0) document.body.classList.remove("tmapping"); }
  window.addEventListener("hashchange", mapClass);

  /* ───── 9절 용어: 화면에 보이는 낱말만 바꾼다(문항 본문은 건드리지 않음) ───── */
  var TERMS = [["합격전략", "합격 전략"], ["시작하기", "시작"], ["다음 문항", "다음"], ["다음 문제", "다음"], ["개념 지도", "개념"], ["스킬 지도", "합격 지도"], ["틀린 것 다시", "복습"], ["틀린 문항", "복습"], ["오답 다시", "복습"], ["오답 노트", "복습"], ["오답 모아풀기", "복습"], ["인식 연습", "인식 드릴"], ["킬러 훈련", "드릴"], ["훈련", "드릴"], ["도전하기", "시작"], ["이어서 풀기", "시작"], ["질문하기", "테라에이전트"], ["학습 비서", "테라에이전트"], ["비서", "테라에이전트"], ["코치", "테라에이전트"], ["내 기록", "기록"], ["먼저 읽기", "개념"], ["개념 읽기", "개념"], ["개념 보기", "개념"]];
  window.__TERM = window.__TERM || {};
  var SKIP = ".qcard,.qtext,.katex,.choices,.sketch,.tm,#tpad,.skinopt,script,style,textarea,input";
  function terms() {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n, list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(function (n) {
      var t = n.nodeValue; if (!t || t.length > 120 || !t.trim()) return;
      var p = n.parentElement; if (!p || p.closest(SKIP)) return;
      var o = t;
      TERMS.forEach(function (r) { if (o.indexOf(r[0]) >= 0) { window.__TERM[r[0] + "→" + r[1]] = (window.__TERM[r[0] + "→" + r[1]] || 0) + 1; o = o.split(r[0]).join(r[1]); } });
      if (o !== t) n.nodeValue = o;
    });
  }

  /* ───── 10절 지금 할 것: 「추천」 알약 하나 또는 주 단추 ───── */
  function pill() { var s = document.createElement("em"); s.className = "rec-pill"; s.textContent = "추천"; return s; }
  function recommend() {
    var v = document.getElementById("view"); if (!v) return;
    var h = location.hash.split("/")[1] || "today";
    if (v.querySelector(".rec-pill") && h !== "settings") return;
    var first;
    if (h === "today" || h === "") { first = v.querySelector(".tstep .tx b"); }
    else if (h === "concepts") { first = v.querySelector(".unit .nm, .unit-list .unit b, .skills .skill .sn"); }
    else if (h === "units") { first = v.querySelector(".unit .nm"); }
    else if (h === "exams") { first = v.querySelector(".card .t, .card b, .tier-card b"); }
    else if (h === "records") {
      first = v.querySelector(".mrow > div > div, [data-drill]");
      if (!first && !v.querySelector(".btn-primary") && !v.querySelector("#recgo")) {
        var b = document.createElement("a"); b.id = "recgo"; b.className = "btn btn-primary"; b.href = "#/today"; b.textContent = "시작"; b.style.cssText = "display:flex;margin-top:14px"; v.appendChild(b);
      }
    }
    else if (h === "settings") {
      if (!v.querySelector("#setok")) { var o = document.createElement("a"); o.id = "setok"; o.className = "btn btn-primary"; o.href = "#/today"; o.textContent = "확정"; o.style.cssText = "display:flex;margin:18px 0 0"; v.appendChild(o); }
      return;
    }
    if (first && !first.querySelector(".rec-pill")) first.appendChild(pill());
  }
  function loadMap() {
    if (!window.TERA_MAP && !document.querySelector("script[data-tmap]")) {
      var sc = document.createElement("script"); sc.src = "js/tera-map.js?v=1111g"; sc.dataset.tm = "1"; sc.onload = function () { mountMap(); }; document.head.appendChild(sc);
    }
    var v = document.getElementById("view"); if (!v) return;
    var busy = false;
    function run() { if (busy) return; busy = true; try { mountMap(); recommend(); terms(); } catch (e) { } busy = false; }
    new MutationObserver(function () { setTimeout(run, 0); }).observe(document.body, { childList: true, subtree: true });
    run();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadMap); else loadMap();

  /* ───── 12절 문제 화면: 공용 tera-q 부품 모양(아래 줄 · 별 · 남은 문제) ───── */
  var skillStars = null;
  function starsFor(q) {
    if (!skillStars) {
      var cnt = {}, yrs = {};
      (window.BANK || []).forEach(function (b) { var y = (String(b.src || "").match(/(20\d\d)/) || [])[1]; if (!y) return; yrs[y] = 1; (b.s || []).forEach(function (s) { cnt[s] = (cnt[s] || 0) + 1; }); });
      var ids = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }), n = ids.length; skillStars = {};
      ids.forEach(function (id, i) { skillStars[id] = i < n * 0.2 ? 3 : i < n * 0.5 ? 2 : 1; });
    }
    return q && q.s && skillStars[q.s[0]] || 0;
  }
  var TQ_ICON = {
    q: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.5a2.4 2.4 0 1 1 3.3 2.2c-.7.3-1 .8-1 1.6M12 16.5v.01"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 6.5C10.2 5 7.6 4.5 4.5 4.8v13c3.1-.3 5.7.2 7.5 1.7 1.8-1.5 4.4-2 7.5-1.7v-13c-3.1-.3-5.7.2-7.5 1.7zM12 6.5v13"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 19.5l1-4L16 5l3 3L8.5 18.5z"/></svg>'
  };
  var lastKey = "";
  function loadTq() {
    if (!document.querySelector("link[data-tq]")) { var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "css/tera-q.css?v=1112c"; l.dataset.tq = "1"; document.head.appendChild(l); }
    if (!document.querySelector("script[data-tqt]")) { window.TNQ = window.TNQ || []; (function (q) { var o = q.push; q.push = function (x) { (window.TNQ_KEEP = window.TNQ_KEEP || []).push(x); return o.apply(q, arguments); }; })(window.TNQ); var t = document.createElement("script"); t.src = "terms.js?v=1110t"; t.dataset.tqt = "1"; t.onerror = function () { }; t.onload = function () { try { if (window.DIAGRAM && DIAGRAM.tnFlush) DIAGRAM.tnFlush(); } catch (e) { } window.__tqt = 1; }; document.head.appendChild(t); }
    if (!window.TERA_Q && !document.querySelector("script[data-tq]")) { var s = document.createElement("script"); s.src = "js/tera-q.js?v=1112c"; s.dataset.tq = "1"; document.head.appendChild(s); }
  }
  function vis(e) { var w = e && e.closest("#confwrap"); return !!e && !(w && w.hidden); }
  function qbar() {
    var st = document.querySelector(".solve .solve-top"), bar = document.querySelector(".tq-bar");
    if (!st) { if (bar) { bar.remove(); if (window.TERA_PAD && TERA_PAD.penHide) try { TERA_PAD.penHide(); } catch (e) { } } return; }
    var cnt = st.querySelector(".muted"), m = cnt && cnt.textContent.match(/(\d+)\s*\/\s*(\d+)/), qid = curQ ? curQ.id : "";
    if (m) { cnt.dataset.raw = cnt.dataset.raw || m[0]; cnt.innerHTML = "<b>" + (+m[2] - +m[1] + 1) + "</b>문제 남았어요"; }
    var meta = document.querySelector(".solve .qmeta");
    if (meta && !meta.querySelector(".tq-badge-host") && window.TERA_Q) {
      var n = starsFor(curQ);
      if (n) { var h = document.createElement("span"); h.className = "tq-badge-host"; meta.insertBefore(h, meta.firstChild); TERA_Q.badge(h, { stars: n }); }
    }
    /* 개념어 띠(1110): terms.js 는 tera-q 보다 먼저 싣는다. 발문 · 선지 한 번만, 번호 줄에 켜기 · 끄기 단추 */
    if (window.TERA_Q && window.TNQ && window.__tqt) {
      if (!window.__tqt2) { window.__tqt2 = 1; if (TNQ.terms) TERA_Q.terms(TNQ.terms); (window.TNQ_KEEP || []).forEach(function (x) { if (x && x.terms) TERA_Q.terms(x.terms); }); }
      if (meta && !meta.querySelector(".tq-toggle")) { var tg = document.createElement("span"); tg.style.marginLeft = "auto"; meta.appendChild(tg); TERA_Q.toggle(tg); }
      Array.prototype.forEach.call(document.querySelectorAll(".solve .qcard .qtext:not(.sketch), .solve .qcard .choices"), function (h) { if (!h.dataset.tqa) { h.dataset.tqa = "1"; TERA_Q.annotate(h); } });
    }
    if (!bar) {
      bar = document.createElement("div"); bar.className = "tq-bar";
      bar.innerHTML = '<button class="tq-tool" data-k="unsure">' + TQ_ICON.q + '헷갈림</button><button class="tq-tool" data-k="exp">' + TQ_ICON.book + '해설</button><button class="tq-tool" data-k="pen">' + TQ_ICON.pen + '펜</button><span class="tq-sp"></span><button class="tq-nav" disabled aria-label="이전">‹</button><span class="tq-pos"></span><button class="tq-nav is-next" data-k="go">다음 ›</button>';
      document.body.appendChild(bar);
      bar.addEventListener("click", function (e) {
        var b = e.target.closest("[data-k]"); if (!b || b.disabled) return; var k = b.dataset.k;
        if (k === "unsure") { var u = document.querySelector("[data-conf=unsure]"); if (vis(u)) u.click(); }
        else if (k === "exp") { var r = document.querySelector("#readSteps") || document.querySelector(".verdict details summary"); if (r) { r.click(); r.scrollIntoView({ block: "center", behavior: "smooth" }); } }
        else if (k === "pen" && window.TERA_PAD && TERA_PAD.pen) { TERA_PAD.pen({ key: curQ ? curQ.id : "math", onChange: function (on) { b.classList.toggle("is-on", !!on); } }); }
        else if (k === "go") { var c = document.querySelector("[data-conf=sure]"), nx = document.querySelector("#next"); if (vis(c)) c.click(); else if (nx) nx.click(); }
      });
    }
    if (qid !== lastKey) { lastKey = qid; if (window.TERA_PAD && TERA_PAD.penHide) try { TERA_PAD.penHide(); } catch (e) { } var pb = bar.querySelector('[data-k=pen]'); if (pb) pb.classList.remove("is-on"); }
    var conf = vis(document.querySelector("[data-conf=sure]")), nx = document.querySelector("#next"), go = bar.querySelector('[data-k=go]');
    go.textContent = conf ? "확정" : "다음 ›"; go.disabled = !(conf || nx);
    bar.querySelector('[data-k=unsure]').disabled = !vis(document.querySelector("[data-conf=unsure]"));
    bar.querySelector('[data-k=exp]').disabled = !(document.querySelector("#readSteps") || document.querySelector(".verdict"));
    bar.querySelector(".tq-pos").innerHTML = m ? (+m[1]) + " <small>/ " + m[2] + "</small>" : "";
  }
  function startQ() { loadTq(); setInterval(function () { try { qbar(); } catch (e) { } }, 300); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startQ); else startQ();
})();

/* ───── 전 화면 정돈 (1110): 화면표준 14절 ─────
   떠 있는 합격 전략 알약 대신 오늘 · 설정의 줄, 화면을 설명하는 안내 문장 빼기(근거는 설정 「자료 출처」 접힌 칸),
   합격 전략 창(Shadow DOM)에 덮개 style. app.js · index.html 본문은 건드리지 않는다. */
(function () {
  "use strict";
  function view() { return document.getElementById("view"); }
  function zsRow() { var a = document.createElement("a"); a.className = "zsrow"; a.href = "javascript:void 0"; a.setAttribute("data-zs", "1"); a.textContent = "합격 전략"; return a; }
  function tidy() {
    var v = view(); if (!v) return;
    v.querySelectorAll(".qtext, .quote").forEach(function (e) { if (!/qstem/.test(e.className)) e.className += " qstem"; });
    v.querySelectorAll("p.muted").forEach(function (p) {
      var t = p.textContent;
      if (t.indexOf("막히면 단계 풀이로") === 0) { var i = t.indexOf(" · "); if (i > 0) p.textContent = t.slice(i + 3); }
    });
    /* 오늘: 목록 줄 하나 */
    var row = v.querySelector(".statrow");
    if (row && v.querySelector(".hero") && !v.querySelector(".zscard")) {
      var c = document.createElement("section"); c.className = "card zscard"; c.appendChild(zsRow()); row.after(c);
    }
    /* 설정: 「공부」 판의 줄 하나 + 풀이 인식 안내는 자료 출처 접힌 칸으로 */
    var ts = v.querySelector("#tstime .card");
    if (ts && !ts.querySelector(".zsrow")) { var r = zsRow(); r.style.borderTop = "1px solid var(--line)"; r.style.marginTop = "14px"; r.style.padding = "0"; ts.appendChild(r); }
    var sk = v.querySelector(".skins");
    if (sk) v.querySelectorAll("a.btn-primary, button.btn-primary").forEach(function (b) { if (!b.closest(".hero")) b.remove(); });
    if (sk && !v.querySelector("details.src")) {
      var ps = [].filter.call(v.querySelectorAll("p.muted"), function (p) { return p.textContent.indexOf("Mathpix") >= 0 && p.textContent.length > 40; });
      if (ps.length) {
        var box = document.createElement("div");
        box.innerHTML = '<h3 class="h2">자료 출처</h3><section class="card pad16"><details class="src"><summary>풀이 인식</summary></details></section>';
        var d = box.querySelector("details");
        ps.forEach(function (p) { var q = document.createElement("p"); q.textContent = p.textContent; p.remove(); d.appendChild(q); });
        v.appendChild(box);
      }
    }
  }
  function mo() { var v = view(); if (!v) return; new MutationObserver(function () { try { tidy(); } catch (e) { } }).observe(v, { childList: true, subtree: true }); tidy(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mo); else mo();
  document.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest("[data-zs]"); if (a) { e.preventDefault(); if (window.ZZSTRAT) window.ZZSTRAT.open("math"); } });
  var P = "#0F766E", PI = "#0B4F4A", PS = "rgba(15,118,110,.10)";
  var OV = [
    "#zs,#zst,#zsy{--zs-bg:#FFFFFF;--zs-card:#FFFFFF;--zs-line:#E6E8EC;--zs-red:" + P + ";--zs-blue:#7FB8B2;--zs-gold:#7C818C;--zs-soft:#F1F3F6;--zs-tx:#111419;--zs-sub:#5F6670}",
    "#zs .top .t{letter-spacing:0;font-size:13px}#zs .top button{border-radius:12px}",
    "#zs section{border-radius:18px;box-shadow:none}",
    "#zs .chip{border-radius:999px;background:#F1F3F6;color:#333941}#zs .chip.r{background:" + PS + ";color:" + PI + "}",
    "#zs .pk{border:1px solid #E6E8EC;border-radius:14px;background:#FFFFFF}#zs .pk.on{border-color:" + P + ";background:" + PS + ";box-shadow:none}",
    "#zs .tg{border-radius:999px;font-size:11.5px}#zs .tg.a{background:" + P + ";color:#fff}#zs .tg.l{background:rgba(15,118,110,.16);color:" + PI + ";border:0}#zs .tg.g{background:#F1F3F6;color:#5F6670;border:0}",
    "#zs .sc,#zs .sc.s,#zs .sc.d{border:1px solid #E6E8EC;border-radius:14px}#zs .sc.on{background:#FFFFFF}#zs .sc .rb{border-radius:999px}",
    "#zs .sc.s .rb,#zs .sc.s .bar b{background:" + P + "}#zs .sc.d .rb,#zs .sc.d .bar b{background:#7FB8B2}#zs .sc.b .bar b{background:#B4BAC3}",
    "#zs .det{border-radius:14px}#zs .vl i{background:" + P + ";border-radius:50%}",
    "#zs .gauge .fl{background:rgba(15,118,110,.14)}#zs .stack i.s{background:" + P + "}#zs .stack i.d{background:#7FB8B2}#zs .stack i.b{background:#B4BAC3}",
    "#zs .gp b{background:" + P + ";border-radius:12px}#zs .gp::after{background:" + P + "}#zs .gb .gline b{border-radius:12px}",
    "#zs .gc .cd{border:1px solid #E6E8EC;border-radius:14px}",
    "#zs .gc .cd:nth-child(1){--c:" + P + "!important}#zs .gc .cd:nth-child(2){--c:#7FB8B2!important}#zs .gc .cd:nth-child(3){--c:#A9D3CF!important}#zs .gc .cd:nth-child(n+4){--c:#9CA3AF!important}",
    "#zs .gc .cg{border-radius:999px}#zs .hit{border-radius:14px}",
    "#zs .q li.a::before{background:" + P + ";border-color:" + P + "}#zs .q .st.f{color:" + PI + ";border-color:" + PI + "}#zs .q{border-radius:14px}",
    "#zs .go{background:" + P + ";border-radius:12px}#zst .nx{background:" + P + ";border-radius:12px}#zst .hole{border-radius:14px}#zst .bub{border-radius:18px}",
    "#zsy .nx{background:" + P + "}#zsy .pg i{background:" + P + "}#zsy .pk{border:1px solid #E6E8EC}#zsy .pk.on{border-color:" + P + ";box-shadow:none}",
    "#zsy .end button{border:1px solid " + P + ";color:" + PI + "}#zsy .end .main{background:" + P + ";color:#fff}"
  ].join("\n");
  function gl(root) { var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false), n; while ((n = w.nextNode())) { if (n.nodeValue.indexOf("합격전략") >= 0) n.nodeValue = n.nodeValue.replace(/합격전략/g, "합격 전략"); } }
  function ov() {
    var h = document.getElementById("zs-host");
    if (h && h.shadowRoot) {
      if (!h.shadowRoot.getElementById("mj-ov")) { var st = document.createElement("style"); st.id = "mj-ov"; st.textContent = OV; h.shadowRoot.appendChild(st); }
      gl(h.shadowRoot);
    }
  }
  new MutationObserver(ov).observe(document.documentElement, { childList: true, subtree: true }); ov();
})();
