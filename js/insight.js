/* 인사이트 카드(2026-09-29) — 말 대신 그림으로. 코치가 필요한 순간(오래 고민·오답값·사다리)에 그 단계의 도형·그래프·수직선·표·공식을 띄운다.
   대표님 지시: "단순히 말로 설명보단 적극적으로 그래프나 공식 가져와서 인사이트를 적재적소에" · "모든 걸 스스로 빌드하기보단 다른 서비스 참고".
   → 도형·그래프는 오픈소스 JSXGraph(LGPL/MIT, 수학 교육용 동적 기하·그래프)를 처음 필요할 때 불러 쓴다. 못 불러오면(오프라인) 간단한 SVG 로 대신 그린다.
   → 표·공식은 앱의 KaTeX. 강의 장면은 단계 풀이의 EBSi·어피셜 시각을 그대로 쓴다(새로 만들지 않는다).
   카드 자료는 코칭 자료 `인사이트[단계][i]` (형식: 칸미고코칭/엔진/코칭생성_지침.md 9번).
     INSIGHT.render(host, card) → Promise   카드 하나를 host 에 그린다
     INSIGHT.lecture(q, k) → 카드|null      k단계 강의 장면 카드(단계 풀이 자료에서)
     INSIGHT.forStep(q, k) → [카드]         코칭 자료의 k단계 카드 + 강의 장면 */
(function () {
  const JXG_JS = "https://cdn.jsdelivr.net/npm/jsxgraph@1.9.2/distrib/jsxgraphcore.js";
  const JXG_CSS = "https://cdn.jsdelivr.net/npm/jsxgraph@1.9.2/distrib/jsxgraph.css";
  let jxg = null;
  function loadJXG() {
    if (window.JXG) return Promise.resolve(true);
    if (jxg) return jxg;
    jxg = new Promise((res) => {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = JXG_CSS; document.head.appendChild(l);
      const s = document.createElement("script"); s.src = JXG_JS;
      const t = setTimeout(() => res(false), 6000);
      s.onload = () => { clearTimeout(t); res(!!window.JXG); };
      s.onerror = () => { clearTimeout(t); res(false); };
      document.head.appendChild(s);
    });
    return jxg;
  }
  const css = (v, d) => (getComputedStyle(document.documentElement).getPropertyValue(v) || "").trim() || d;
  const esc = (s) => QR.esc(String(s == null ? "" : s));
  const tex = (t) => QR.tex(String(t));
  let uid = 0;

  // 평문 식 → JS 함수 (x, 슬라이더 값). 자료는 우리가 검산한 것이라 new Function 을 쓴다.
  function fn(expr, par) {
    let s = String(expr).replace(/\s/g, "").replace(/\^/g, "**")
      .replace(/\b(sqrt|abs|sin|cos|tan|log|exp)\(/g, "Math.$1(").replace(/\bpi\b/g, "Math.PI");
    s = s.replace(/(\d|\))(?=[a-zA-Z(])/g, "$1*").replace(/\)(?=\d)/g, ")*");
    // JS 는 -x**2 를 문법 오류로 본다 → 단항 음수는 0- 로(수학 뜻 그대로: -(x^2))
    s = s.replace(/^-/, "0-").replace(/([(,*/+])-/g, "$1(0-1)*");
    s = s.replace(/\bfloor\(/g, "Math.floor(").replace(/\bceil\(/g, "Math.ceil(").replace(/\bmod\(/g, "__mod(");   // 주기함수(09-29)
    try { return new Function("x", par || "_", `"use strict";const __mod=(a,b)=>((a%b)+b)%b;return (${s});`); } catch (e) { return () => NaN; }
  }

  function frame(host, card, inner) {
    host.insertAdjacentHTML("beforeend", `<figure class="ins card-ins"><figcaption class="ins-h"><span class="ins-kind">${esc(card.종류)}</span>${card.제목 ? `<b>${QR.inline(card.제목)}</b>` : ""}</figcaption>${inner}${card.글 ? `<p class="ins-note">${QR.inline(card.글)}</p>` : ""}</figure>`);
    return host.lastElementChild;
  }

  // ── 도형
  function bboxOf(P, pad) {
    const xs = Object.values(P).map((p) => p[0]), ys = Object.values(P).map((p) => p[1]);
    let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const w = Math.max(x1 - x0, 1), h = Math.max(y1 - y0, 1), m = Math.max(w, h) * (pad || 0.22);
    return [x0 - m, y1 + m, x1 + m, y0 - m];
  }
  function segKey(k, P) { const names = Object.keys(P).sort((a, b) => b.length - a.length); for (const a of names) if (k.startsWith(a) && P[k.slice(a.length)]) return [a, k.slice(a.length)]; return null; }

  function drawShapeJXG(el, c) {
    const P = c.점 || {};
    const ink = css("--ink", "#1F2430"), hi = css("--retry", "#E5322D"), soft = css("--accent", "#2F5BEA");
    // 원이 있으면 원 전체가 들어가게 범위를 넓힌다(점만으로 잡으면 원이 잘린다)
    const ext = Object.assign({}, P);
    (c.원 || []).forEach((cc, i) => {
      const o = P[cc.중심]; if (!o) return;
      const r = cc.지나는점 && P[cc.지나는점] ? Math.hypot(P[cc.지나는점][0] - o[0], P[cc.지나는점][1] - o[1]) : +cc.반지름 || 0;
      ext[`__c${i}a`] = [o[0] - r, o[1] - r]; ext[`__c${i}b`] = [o[0] + r, o[1] + r];
    });
    (c.호 || []).forEach((h, i) => {   // 호도 판 안에 들게(시작 → 끝 반시계로 16 점)
      const o = P[h.중심], s = P[h.시작], e = P[h.끝]; if (!o || !s || !e) return;
      const r = Math.hypot(s[0] - o[0], s[1] - o[1]), t0 = Math.atan2(s[1] - o[1], s[0] - o[0]);
      let t1 = Math.atan2(e[1] - o[1], e[0] - o[0]); if (t1 <= t0) t1 += 2 * Math.PI;
      for (let k = 0; k <= 16; k++) { const t = t0 + (t1 - t0) * k / 16; ext[`__h${i}_${k}`] = [o[0] + r * Math.cos(t), o[1] + r * Math.sin(t)]; }
    });
    const bb = bboxOf(ext, 0.12);
    const b = JXG.JSXGraph.initBoard(el.id, { boundingbox: bb, keepaspectratio: true, axis: false, showCopyright: false, showNavigation: false, pan: { enabled: false }, zoom: { enabled: false }, text: { useKatex: !!window.katex } });
    const pt = {};
    // 꼭짓점 이름·길이 자리는 선·원·다른 글과 가장 덜 닿는 곳으로 고른다(10-06 — 이름이 선 위에 얹히던 것)
    const spot = spots(c, P, b.unitX || 40, bb);
    // '_' 점: 어디에도 안 쓰이면(판 넓히기용 보조점) 안 보이게, 바로 옆에 짧은 `글자` 이름이 있으면 보통 꼭짓점 크기로(10-06 — 이름을 글자로 뺀 꼭짓점만 점이 작아 앞뒤 단계와 달라 보이던 것)
    const used = new Set();
    for (const f of ["선", "보조선", "강조", "화살표"]) for (const s of c[f] || []) s.forEach((n) => used.add(n));
    for (const poly of c.다각형 || []) poly.forEach((n) => used.add(n));
    for (const t of [...(c.직각 || []), ...(c.각 || []).map((a) => a.세점 || [])]) t.forEach((n) => used.add(n));
    // 원 중심·지나는점으로만 쓰인 '_' 점은 안 보이게(벤 그림 원 중심 점이 숫자 사이에 찍히던 것, 10-06)
    for (const h of c.호 || []) { used.add(h.시작); used.add(h.끝); }
    for (const k of Object.keys(c.길이 || {})) (segKey(k, P) || []).forEach((n) => used.add(n));
    // 이름을 `글자`로 뺀 꼭짓점: `_A` 옆 'A' 글자, 또는 `_1` 바로 곁(판 폭 6% 안)의 짧은 이름 글자
    const near = 0.06 * (bb[2] - bb[0]);
    const named = (n, x, y) => (c.글자 || []).some((t) => {
      const g = String(t.글).trim().replace(/^\$|\$$/g, ""), d = Math.hypot(t.x - x, t.y - y);
      // 좌표 이름표('(1, -2)', 'P(1,-2)')도 이름이다 — 글이 넓어 점에서 조금 더 떨어져 놓인다(10-07 내신_M2_057)
      if (/^[A-Za-z]?['′]?\s*\(\s*-?[\d.]+\s*,\s*-?[\d.]+\s*\)$/.test(g.replace(/\\[ ,;!]|~/g, " "))) return d < 3 * near;
      return /^[A-Za-z][A-Za-z0-9'′_{}]{0,4}$/.test(g) && (d < near || (n.slice(1) === g && d < 2.5 * near));
    });
    for (const [n, [x, y]] of Object.entries(P)) {
      // '_' 로 시작하는 점은 이름 없는 꼭짓점 — 점도 찍지 않는다(교과서 그림처럼, 10-06). 이름을 글자로 뺀 꼭짓점만 보통 점
      const hid = n.startsWith("_"), nm = hid && used.has(n) && named(n, x, y);
      pt[n] = b.create("point", [x, y], { name: hid ? "" : trimSp(n), withLabel: !hid, visible: !hid || nm, fixed: true, size: 2, color: ink, label: { fontSize: 15, anchorX: "middle", anchorY: "middle", offset: spot.name[n] || [8, 8] } });
    }
    // 글자: 점 없이 글만(칸 이름·영역 이름) [{x, y, 글}]
    // 글자는 일반 글('a', '고객용')도 수식('$x$', '\text{고객용}')도 온다 — 수식일 때만 KaTeX 로(10-06)
    // 'A'·'x'·'y=mx' 같은 짧은 이름은 수식체로, 섞인 글은 글 부분 띄어쓰기를 살려서(lab, 10-06)
    for (const t of c.글자 || []) { const L = lab(t.글); b.create("text", [t.x, t.y, L.t], { anchorX: "middle", anchorY: "middle", fontSize: 15, useKatex: L.k, strokeColor: ink, fixed: true }); }
    const isHi = (a, z) => (c.강조 || []).some(([p, q]) => (p === a && q === z) || (p === z && q === a));
    for (const poly of c.다각형 || []) b.create("polygon", poly.map((n) => pt[n]), { fillColor: soft, fillOpacity: 0.07, borders: { visible: false }, vertices: { visible: false } });
    for (const [p, q] of c.선 || []) b.create("segment", [pt[p], pt[q]], { strokeColor: isHi(p, q) ? hi : ink, strokeWidth: isHi(p, q) ? 4 : 2, fixed: true });
    for (const [p, q] of c.보조선 || []) b.create("segment", [pt[p], pt[q]], { strokeColor: soft, strokeWidth: 1.5, dash: 2, fixed: true });
    // 화살표(10-07, 순서도·흐름): "화살표":[["A","B"]] → A 에서 B 로. 양 끝을 18% 줄여 점 이름과 겹치지 않게
    for (const [p, q] of c.화살표 || []) { if (!P[p] || !P[q]) continue; const [ax, ay] = P[p], [bx, by] = P[q], t = 0.18;
      b.create("arrow", [[ax + (bx - ax) * t, ay + (by - ay) * t], [bx - (bx - ax) * t, by - (by - ay) * t]], { strokeColor: ink, strokeWidth: 2, fixed: true, lastArrow: { type: 2, size: 6 } }); }
    for (const [p, q] of c.강조 || []) if (!(c.선 || []).some(([a, z]) => (a === p && z === q) || (a === q && z === p))) b.create("segment", [pt[p], pt[q]], { strokeColor: hi, strokeWidth: 4, fixed: true });
    for (const cc of c.원 || []) b.create("circle", cc.지나는점 ? [pt[cc.중심], pt[cc.지나는점]] : [pt[cc.중심], cc.반지름], { strokeColor: ink, strokeWidth: 1.5, fixed: true });
    // 호: 중심에서 시작 → 끝 반시계(10-06 — 점을 줄지어 이어 각져 보이던 것). 강조: true 면 붉은 굵은 호
    for (const h of c.호 || []) if (pt[h.중심] && pt[h.시작] && pt[h.끝]) b.create("arc", [pt[h.중심], pt[h.시작], pt[h.끝]], { strokeColor: h.강조 ? hi : ink, strokeWidth: h.강조 ? 4 : 1.5, fillOpacity: 0, fixed: true, withLabel: false });
    // JSXGraph 는 각을 첫 점 → 셋째 점 반시계로 그린다. 자료의 점 순서가 시계 방향이면 180° 넘는 바깥 각이 되므로 늘 안쪽 각으로 돌려 놓는다(09-30)
    const inner = (p, q, r) => { const [ax, ay] = P[p], [bx, by] = P[q], [cx, cy] = P[r]; return (ax - bx) * (cy - by) - (ay - by) * (cx - bx) >= 0 ? [p, q, r] : [r, q, p]; };
    for (const [p0, q, r0] of c.직각 || []) { const [p, , r] = inner(p0, q, r0); b.create("angle", [pt[p], pt[q], pt[r]], { type: "square", radius: 0.06 * (bb[2] - bb[0]), orthoType: "square", fillOpacity: 0, strokeColor: ink, name: "", withLabel: false }); }
    // 각 이름은 앱이 고른 자리(이등분선 위, 호 바깥 또는 안 — 10-06)에 따로 쓴다
    (c.각 || []).forEach((a, i) => {
      const [p, q, r] = inner(...a.세점);
      b.create("angle", [pt[p], pt[q], pt[r]], { radius: 0.09 * (bb[2] - bb[0]), fillColor: soft, fillOpacity: 0.15, strokeColor: soft, name: "", withLabel: false });
      const at = spot.ang[i];
      if (a.글 && at) { const L = lab(a.글); b.create("text", [at[0], at[1], L.t], { anchorX: "middle", anchorY: "middle", fontSize: 14, useKatex: L.k || (!!window.katex && /^[a-zA-Z]$|°/.test(L.t)), strokeColor: soft, fixed: true }); }
    });
    for (const [k, v] of Object.entries(c.길이 || {})) {
      const s = segKey(k, P), at = spot.len[k]; if (!s || !at) continue;
      const L = lab(v);   // 길이는 한글만 든 글이 아니면 늘 수식체
      b.create("text", [at[0], at[1], L.t], { anchorX: "middle", anchorY: "middle", fontSize: 15, useKatex: !!window.katex && (L.k || !/[가-힣]/.test(L.t)), strokeColor: isHi(s[0], s[1]) ? hi : ink, fixed: true });
    }
    return b;
  }

  // 글 자리 고르기(10-06). 화면 px 로 계산: 선분·원·점·이미 놓은 글 상자와 닿으면 벌점, 바깥쪽(무게중심 반대)이면 가산점.
  // 반환 { name: {점: [dx, dy] px 오프셋}, len: {길이키: [x, y] 좌표} }
  function spots(c, P, u, bb) {
    const S = (n) => [P[n][0] * u, P[n][1] * u];
    const tw = textW;
    const segs = [];
    for (const [p, q] of [...(c.선 || []), ...(c.보조선 || []), ...(c.강조 || []), ...(c.화살표 || [])]) if (P[p] && P[q]) segs.push([S(p), S(q)]);
    for (const poly of c.다각형 || []) poly.forEach((n, i) => { const m = poly[(i + 1) % poly.length]; if (P[n] && P[m]) segs.push([S(n), S(m)]); });
    const circ = [];
    for (const cc of c.원 || []) {
      if (!P[cc.중심]) continue;
      const o = S(cc.중심), r = cc.지나는점 && P[cc.지나는점] ? Math.hypot(S(cc.지나는점)[0] - o[0], S(cc.지나는점)[1] - o[1]) : (+cc.반지름 || 0) * u;
      circ.push([o, r]);
    }
    const dots = Object.keys(P).map(S);
    const boxes = (c.글자 || []).map((t) => [t.x * u, t.y * u, tw(t.글) / 2, 9]);
    const names = Object.keys(P), gx = dots.reduce((t, p) => t + p[0], 0) / (dots.length || 1), gy = dots.reduce((t, p) => t + p[1], 0) / (dots.length || 1);
    const ptBox = (p, B) => Math.hypot(Math.max(Math.abs(p[0] - B[0]) - B[2], 0), Math.max(Math.abs(p[1] - B[1]) - B[3], 0));
    const ptSeg = (p, a, z) => { const dx = z[0] - a[0], dy = z[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
    const cross = (a, z, p) => (z[0] - a[0]) * (p[1] - a[1]) - (z[1] - a[1]) * (p[0] - a[0]);
    const hits = (a, z, p, q) => cross(a, z, p) * cross(a, z, q) < 0 && cross(p, q, a) * cross(p, q, z) < 0;
    const segBox = (a, z, B) => {
      const k = [[B[0] - B[2], B[1] - B[3]], [B[0] + B[2], B[1] - B[3]], [B[0] + B[2], B[1] + B[3]], [B[0] - B[2], B[1] + B[3]]];
      if (ptBox(a, B) === 0 || ptBox(z, B) === 0) return 0;
      for (let i = 0; i < 4; i++) if (hits(a, z, k[i], k[(i + 1) % 4])) return 0;
      return Math.min(ptBox(a, B), ptBox(z, B), ...k.map((p) => ptSeg(p, a, z)));
    };
    const circBox = (o, r, B) => {
      const dmin = ptBox(o, B), dmax = Math.max(...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => Math.hypot(B[0] + sx * B[2] - o[0], B[1] + sy * B[3] - o[1])));
      return dmin <= r && r <= dmax ? 0 : dmin > r ? dmin - r : r - dmax;
    };
    const near = (d, clear, hit) => (d <= 0 ? hit : Math.max(0, clear - d) * 2);
    const cost = (B, self) => {
      let pen = 0;
      for (const [a, z] of segs) pen += near(segBox(a, z, B), 5, 20);
      for (const [o, r] of circ) pen += near(circBox(o, r, B), 5, 16);
      dots.forEach((p, i) => { if (i !== self) pen += near(ptBox(p, B), 5, 14); });
      for (const X of boxes) { const ox = Math.abs(X[0] - B[0]) - X[2] - B[2], oy = Math.abs(X[1] - B[1]) - X[3] - B[3]; pen += ox < 0 && oy < 0 ? 30 : Math.max(ox, oy) < 3 ? 5 : 0; }
      return pen;
    };
    // 길이: 변 가운데에서 양쪽 수직 방향 두 자리 중 덜 닿는 쪽(같으면 도형 바깥쪽)
    const len = {}, off = 0.07 * (bb[2] - bb[0]) * u;
    for (const [k, v] of Object.entries(c.길이 || {})) {
      const s = segKey(k, P); if (!s) continue;
      const A = S(s[0]), Z = S(s[1]), mx = (A[0] + Z[0]) / 2, my = (A[1] + Z[1]) / 2, L = Math.hypot(Z[0] - A[0], Z[1] - A[1]) || 1;
      const nx = -(Z[1] - A[1]) / L, ny = (Z[0] - A[0]) / L, hw = tw(v) / 2, hh = 10;
      let best = null;
      for (const sg of [1, -1]) for (const f of [1, 1.6]) {
        const B = [mx + sg * nx * off * f, my + sg * ny * off * f, hw, hh];
        const outward = ((B[0] - mx) * (mx - gx) + (B[1] - my) * (my - gy)) > 0 ? -1.5 : 0;
        const sc = cost(B, -1) + outward + (f > 1 ? 2 : 0);
        if (!best || sc < best[0]) best = [sc, B];
      }
      boxes.push(best[1]);
      len[k] = [best[1][0] / u, best[1][1] / u];
    }
    // 각 이름: 안쪽 각의 이등분선 위, 호 바로 바깥 · 더 바깥 · 호 안쪽 중 덜 닿는 곳
    const ang = {}, arc = 0.09 * (bb[2] - bb[0]) * u;
    (c.각 || []).forEach((a, i) => {
      if (!a.글 || !a.세점 || !a.세점.every((n) => P[n])) return;
      let [p, q, r] = a.세점;
      const A0 = S(p), Q = S(q), C0 = S(r);
      if (!((A0[0] - Q[0]) * (C0[1] - Q[1]) - (A0[1] - Q[1]) * (C0[0] - Q[0]) >= 0)) [p, r] = [r, p];
      const A = S(p), C = S(r), la = Math.hypot(A[0] - Q[0], A[1] - Q[1]) || 1, lc = Math.hypot(C[0] - Q[0], C[1] - Q[1]) || 1;
      let bx = (A[0] - Q[0]) / la + (C[0] - Q[0]) / lc, by = (A[1] - Q[1]) / la + (C[1] - Q[1]) / lc;
      const bl = Math.hypot(bx, by);
      if (bl < 1e-6) { bx = -(A[1] - Q[1]) / la; by = (A[0] - Q[0]) / la; } else { bx /= bl; by /= bl; }   // 180° 각은 A 쪽에서 반시계 90°
      const hw = tw(a.글) / 2, hh = 9;
      let best = null;
      // 이등분선 위에 보조선이 겹쳐 지나가는 경우가 있어 옆으로 비킨 자리도 본다
      const m = Math.max(hw, hh);
      for (const [d, extra] of [[arc + 4 + m, 0], [arc + 14 + m, 1], [arc + 28 + m, 2], [arc * 0.55, 3]]) for (const s of [0, hw + 3, -(hw + 3), hw + 9, -(hw + 9)]) {
        const B = [Q[0] + bx * d - by * s, Q[1] + by * d + bx * s, hw, hh], sc = cost(B, -1) + extra + (s ? 0.5 : 0);
        if (!best || sc < best[0]) best = [sc, B];
      }
      boxes.push(best[1]);
      ang[i] = [best[1][0] / u, best[1][1] / u];
    });
    // 꼭짓점 이름: 점 둘레 16 방향. 표시된 각(각·직각) 안쪽은 피한다
    const marks = [...(c.각 || []).map((a) => a.세점), ...(c.직각 || [])].filter((t) => t && t.every((n) => P[n]));
    const name = {};
    names.forEach((n, i) => {
      if (n.startsWith("_")) return;
      const [x, y] = dots[i], hw = tw(n) / 2 + 1, hh = 9, og = Math.atan2(y - gy, x - gx);
      let best = null;
      for (let k = 0; k < 16; k++) {
        const a = (k * Math.PI) / 8, ca = Math.cos(a), sa = Math.sin(a);
        const R = 6 + Math.min(Math.abs(ca) > 1e-6 ? hw / Math.abs(ca) : 1e9, Math.abs(sa) > 1e-6 ? hh / Math.abs(sa) : 1e9);
        const B = [x + R * ca, y + R * sa, hw, hh];
        let sc = cost(B, i) - 1.5 * Math.cos(a - og);
        for (const [p, q, r] of marks) {
          if (q !== n) continue;
          const d = [x + ca, y + sa], A = S(p), C = S(r), s1 = cross([x, y], A, d), s2 = cross([x, y], d, C), s0 = cross([x, y], A, C);
          if (s0 >= 0 ? s1 >= 0 && s2 >= 0 : s1 <= 0 && s2 <= 0) sc += 8;
        }
        if (!best || sc < best[0]) best = [sc, B, R * ca, R * sa];
      }
      boxes.push(best[1]);
      name[n] = [best[2], best[3]];
    });
    return { name, len, ang };
  }

  // 이름표 글: '$x$'·'\frac..' 은 수식(KaTeX), '2학년'·'근' 같은 보통 글은 그대로(10-06 — '$20$' 이 기호째 보이던 것)
  // 글 폭 어림(px, 14~15px 글꼴): \frac 은 위아래 중 긴 쪽, \sqrt 는 √ 한 자, 다른 명령은 한 자, 한글은 넓게(10-06)
  function textW(s) {
    const t = String(s).replace(/\\text\{([^{}]*)\}/g, "$1").replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, (m, x, y) => (x.length > y.length ? x : y)).replace(/\\sqrt/g, "√").replace(/\\(quad|qquad|[;,: !])/g, "").replace(/\\[a-zA-Z]+/g, "x").replace(/[{}$^_\s ]/g, "");
    let w = 6;
    for (const ch of t) w += /[가-힣]/.test(ch) ? 14 : /[=<>+\-−≤≥]/.test(ch) ? 18 : /[mwMW]/.test(ch) ? 13 : 8.5;   // 수식의 = · + 는 양옆 띄움까지
    return w;
  }
  // 앞뒤 공백 명령(\quad·\;·nbsp)은 지운다 — 이름표를 밀려고 넣었던 것, 이제 앱이 자리를 고른다(10-06)
  function trimSp(s) { return String(s == null ? "" : s).replace(/^(\$?)((?:\\quad|\\qquad|\\[;,: ]| |\s)+)/, "$1").replace(/((?:\\quad|\\qquad|\\[;,: ]| |\s)+)(\$?)$/, "$2"); }
  function lab(s) {
    s = trimSp(s).replace(/\\dfrac/g, "\\frac");   // \dfrac 는 판 글 상자 위가 잘린다(10-06)
    const m = s.match(/^\$([^$]*)\$$/);   // 통째 수식은 안에 $ 가 없을 때만('$A$: $24n$' 을 한 수식으로 읽어 $ 가 보이던 것, 10-06)
    if (m) return { t: m[1], k: !!window.katex };
    // '$A^C$ 의 끝' 처럼 글과 수식이 섞이면 글 부분을 \text{} 로(띄어쓰기가 사라지던 것, 10-06)
    if (window.katex && /\$[^$]+\$/.test(s)) return { t: s.split(/\$([^$]*)\$/).map((p, i) => (i % 2 ? p : p ? `\\text{${p}}` : "")).join(""), k: true };
    // 'A'·'P1'·"P'" 같은 짧은 점 이름도 수식체로(도형 카드 꼭짓점 이름과 같은 글꼴, 10-06)
    if (window.katex && /^[A-Za-z][A-Za-z0-9'′]{0,2}$/.test(s)) return { t: s.replace(/′/g, "'").replace(/^([A-Za-z])(\d+)$/, "$1_{$2}"), k: true };
    // '-25/3' 같은 분수 이름표는 분수꼴 수식으로(10-06)
    const fr = s.match(/^(-?)(\d+(?:\.\d+)?)\/(\d+)$/);
    if (window.katex && fr) return { t: `${fr[1]}\\frac{${fr[2]}}{${fr[3]}}`, k: true };
    // 'y=mx'·'f(-1)' 같은 짧은 식도 수식체로
    if (window.katex && /^[A-Za-z0-9=+\-*/().,' ]{2,16}$/.test(s) && /[A-Za-z]/.test(s) && /[=()+\-]/.test(s)) return { t: s, k: true };   // 'A-B'·'x+1' 도
    return { t: s.replace(/\$/g, ""), k: /\\|[\^_]/.test(s) && !!window.katex };
  }
  // 수직선·그래프의 점 이름표가 옆 이름표와 부딪히면 한 층씩 위로 올린다(글 폭은 글자 수로 어림)
  function stagger(pts, pxPerUnit) {
    const rows = [];
    return pts.map((p) => {
      const w = Math.max(18, textW(p.t) + 2), x = p.x * pxPerUnit;
      let r = 0;
      while (rows[r] !== undefined && rows[r] > x - w / 2) r++;
      rows[r] = x + w / 2;
      return r;
    });
  }

  // 눈금 간격: 숫자 하나에 ~48px 이 돌아가게 1·2·5×10^k 에서 고른다(0~180 수직선이 1 간격 180 개로 뭉개지던 것, 10-06)
  function niceStep(span, px) {
    const raw = Math.abs(span) * 48 / Math.max(px || 300, 120);
    if (raw <= 1) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  }

  // 글(꼭짓점 이름·길이·글자·눈금 이름표)이 판 밖으로 나가면 그만큼 판을 넓힌다(10-06 점검 154건)
  function fitText(b, el) {
    for (let it = 0; it < 3; it++) {
      const B = el.getBoundingClientRect();
      if (!B.width || !B.height) return;
      // 넘친 쪽만 넓힌다(네 방향을 다 넓히면 위로 넘친 이름표 하나에 그림 전체가 쪼그라든다 — 10-06)
      let L = 0, R = 0, T = 0, D = 0;
      for (const o of b.objectsList) {
        if (o === b.infobox) continue;   // JSXGraph 좌표 안내 글("0,0", 원점에 숨어 있음)은 빼고 — 원점에서 먼 그림이 쪼그라들던 원인(10-06, D 에이전트)
        const n = o.elType === "text" ? o.rendNode : (o.label && o.label.visProp && o.label.visProp.visible !== false ? o.label.rendNode : null);
        if (!n || !n.getBoundingClientRect || !(n.textContent || "").trim()) continue;
        if (o.visPropCalc && o.visPropCalc.visible === false) continue;   // 화면 밖 눈금 숫자 등 숨은 글은 빼고(이걸 세면 판이 끝없이 늘어난다)
        const cs = getComputedStyle(n);
        if (cs.visibility === "hidden" || cs.display === "none") continue;
        const r = n.getBoundingClientRect();
        if (!r.width) continue;
        L = Math.max(L, B.left - r.left); R = Math.max(R, r.right - B.right); T = Math.max(T, B.top - r.top); D = Math.max(D, r.bottom - B.bottom);
      }
      if (Math.max(L, R, T, D) <= 2) return;
      const pad = (v) => (v > 2 ? v + 10 : 0);
      const [x0, y1, x1, y0] = b.getBoundingBox(), sx = (x1 - x0) / B.width, sy = (y1 - y0) / B.height;
      b.setBoundingBox([x0 - pad(L) * sx, y1 + pad(T) * sy, x1 + pad(R) * sx, y0 - pad(D) * sy], b.keepaspectratio);
      b.fullUpdate();
    }
  }

  // ── 그래프
  // 원(반원 두 식 sqrt(r²-(x-a)²))이 든 그래프이거나 같은비율: true 인 카드
  function roundish(c) { return c.같은비율 === true || (c.식 || []).some((e) => /sqrt\(\s*[\d.]+\s*-\s*\(?\s*x/.test(String(e)) && !/0\s*\*\s*sqrt/.test(String(e))); }   // '0*sqrt(..)' 는 정의역만 자르는 막대 식

  function drawGraphJXG(el, c, sv) {
    const [x0, x1, y0, y1] = c.범위;
    const ink = css("--ink", "#1F2430"), hi = css("--retry", "#E5322D"), soft = css("--accent", "#2F5BEA");
    // 눈금숨김: 점·곡선의 높이(또는 위치)로 이 단계 답이 읽히는 카드 — "y"·"x"·true(둘 다) 축의 숫자만 숨긴다(09-30)
    const hx = c.눈금숨김 === true || c.눈금숨김 === "x", hy = c.눈금숨김 === true || c.눈금숨김 === "y";
    const tx = niceStep(x1 - x0, el.clientWidth), ty = niceStep(y1 - y0, el.clientHeight);
    // 범위에 0 이 없으면 축이 판 밖이라 눈금 숫자가 안 보였다 → 그때는 축을 판 가장자리 가까이에 긋는다(10-06)
    const AXY = y0 <= 0 && y1 >= 0 ? 0 : y0 + (y1 - y0) * 0.06, AXX = x0 <= 0 && x1 >= 0 ? 0 : x0 + (x1 - x0) * 0.04;
    const inside = AXY === 0 && AXX === 0;
    const tk = (d, lab) => ({ majorHeight: 6, minorTicks: 0, insertTicks: false, ticksDistance: d, drawLabels: lab });
    const b = JXG.JSXGraph.initBoard(el.id, { boundingbox: [x0, y1, x1, y0], keepaspectratio: roundish(c), axis: inside, showCopyright: false, showNavigation: false, pan: { enabled: false }, zoom: { enabled: false }, defaultAxes: { x: { ticks: tk(tx, !hx) }, y: { ticks: tk(ty, !hy) } } });
    if (!inside) {
      b.create("axis", [[0, AXY], [1, AXY]], { ticks: tk(tx, !hx), strokeColor: "#666" });
      b.create("axis", [[AXX, 0], [AXX, 1]], { ticks: tk(ty, !hy), strokeColor: "#666" });
    }
    const sl = c.슬라이더;
    let S = null;
    if (sl && !sv) {   // 판 밖 밀대(sv)가 없을 때만 판 안 슬라이더
      const w = x1 - x0, h = y1 - y0;
      S = b.create("slider", [[x0 + w * 0.08, y1 - h * 0.08], [x0 + w * 0.5, y1 - h * 0.08], [sl.범위[0], sl.값, sl.범위[1]]], { name: sl.이름, snapWidth: +sl.단위 > 0 ? +sl.단위 : 0.5, withLabel: !sl.값숨김, label: { fontSize: 14 } });   // 단위: 기본 0.5, 세밀하게 움직일 카드는 0.1·0.05 등(09-30)
      // 값숨김: 슬라이더를 맞추면 답·확인값이 그대로 읽히는 카드 — 이름만 보이고 수는 숨긴다(09-30)
      if (sl.값숨김) b.create("text", [x0 + w * 0.53, y1 - h * 0.08, sl.이름], { fontSize: 14, fixed: true, anchorY: "middle" });
    }
    const val = () => (sv ? sv() : S ? S.Value() : 0);
    // 색은 식 순서가 아니라 '같은 곡선' 단위로: ±sqrt 로 나눠 쓴 원의 위·아래 반은 한 색(위 검정·아래 초록으로 갈라지던 것, 10-06)
    const ckey = (e) => String(e).replace(/\s/g, "").replace(/^(?=sqrt)/, "±").replace(/[+-](?=sqrt)/g, "±");
    const keys = [], pal = [ink, soft, "#B86E00", "#6F4BB2"];
    (c.식 || []).forEach((e) => { if (!keys.includes(ckey(e))) keys.push(ckey(e)); });
    (c.식 || []).forEach((e, j) => { const i = keys.indexOf(ckey(e)), f = fn(e, sl && sl.이름); b.create("functiongraph", roundish(c) ? [(x) => f(x, val())] : [(x) => f(x, val()), x0, x1], { strokeColor: pal[i % pal.length], strokeWidth: 2.5 }); });   // 곡선이 셋 이상이면 셋째부터 다른 색(cos·−cos 가 같은 색이던 것)
    // 넓이(10-07): 곡선과 x축(또는 아래 식) 사이를 옅게 칠한다 — "넓이":[{"식":"x^2","부터":0,"까지":2,"아래":"0","색":"주황"}] (아래 생략 = x축, 색 생략 = 파랑)
    for (const a of c.넓이 || []) {
      const f = fn(a.식, sl && sl.이름), g = fn(a.아래 == null ? "0" : a.아래, sl && sl.이름), N = 80, xs = [], ys = [];
      for (let k = 0; k <= N; k++) { const x = a.부터 + ((a.까지 - a.부터) * k) / N; xs.push(x); ys.push(f(x, val())); }
      for (let k = N; k >= 0; k--) { const x = a.부터 + ((a.까지 - a.부터) * k) / N; xs.push(x); ys.push(g(x, val())); }
      b.create("curve", [xs, ys], { strokeWidth: 0, fillColor: a.색 === "주황" ? "#B86E00" : soft, fillOpacity: 0.2, fixed: true, highlight: false });
    }
    for (const l of c.가로선 || []) { const y = () => (typeof l.y === "string" ? val() : l.y); b.create("line", [() => [0, y()], () => [1, y()]], { strokeColor: hi, strokeWidth: 2, dash: 2, fixed: true, name: l.글 || "", withLabel: !!l.글 }); }
    for (const l of c.세로선 || []) { const x = () => (typeof l.x === "string" ? val() : l.x); b.create("line", [() => [x(), 0], () => [x(), 1]], { strokeColor: hi, strokeWidth: 2, dash: 2, fixed: true }); }
    const gp = (c.점 || []).map((p) => ({ ...p, ...lab(p.글) }));
    // 점 이름 자리: 둘레 8 방향 중 곡선·축·눈금 숫자·다른 이름과 덜 닿는 곳(곡선에 걸리던 것, 10-06)
    const u = b.unitX || 40, v = b.unitY || 40, crv = [];
    (c.식 || []).forEach((e) => { const f = fn(e, sl && sl.이름); for (let k = 0; k <= 240; k++) { const x = x0 + ((x1 - x0) * k) / 240, y = f(x, val()); if (isFinite(y)) crv.push([x * u, y * v]); } });
    // 눈금 숫자 자리(x 축 아래·y 축 왼쪽)를 미리 상자로 — 점 이름이 눈금 숫자와 겹치던 것(10-06 점검 20건)
    const placed = [];
    if (!hx) for (let k = Math.ceil(x0 / tx); k <= Math.floor(x1 / tx); k++) if (k) { const s = String(+(k * tx).toFixed(6)); placed.push([k * tx * u, AXY * v - 14, textW(s) / 2, 9]); }
    if (!hy) for (let k = Math.ceil(y0 / ty); k <= Math.floor(y1 / ty); k++) if (k) { const s = String(+(k * ty).toFixed(6)), w = textW(s); placed.push([AXX * u - 8 - w / 2, k * ty * v, w / 2, 9]); }
    gp.forEach((p) => {
      const px = p.x * u, py = p.y * v, hw = textW(p.t) / 2, hh = /\\[dt]?frac/.test(p.t) ? 16 : 9;
      let best = null;
      for (let k = 0; k < 16; k++) {   // 8 방향 × 두 거리(가까운 자리가 다 막히면 한 칸 더 멀리)
        const a = Math.PI / 4 + ((k % 8) * Math.PI) / 4, ca = Math.cos(a), sa = Math.sin(a), R = (k < 8 ? 6 : 18) + Math.min(Math.abs(ca) > 1e-6 ? hw / Math.abs(ca) : 1e9, Math.abs(sa) > 1e-6 ? hh / Math.abs(sa) : 1e9);
        const cx = px + R * ca, cy = py + R * sa, inBox = (x, y, m) => Math.abs(x - cx) < hw + m && Math.abs(y - cy) < hh + m;
        let sc = (k % 8 === 0 ? 0 : 0.5) + (k < 8 ? 0 : 2);
        for (const [x, y] of crv) if (inBox(x, y, 3)) sc += 3;
        if (Math.abs(cy - AXY * v) < hh + 2) sc += 6;             // x 축
        if (Math.abs(cx - AXX * u) < hw + 2) sc += 6;             // y 축
        for (const l of c.세로선 || []) { const lx = (typeof l.x === "string" ? val() : +l.x) * u; if (Math.abs(cx - lx) < hw + 2) sc += 6; }   // 점선(10-06)
        for (const l of c.가로선 || []) { const ly = (typeof l.y === "string" ? val() : +l.y) * v; if (Math.abs(cy - ly) < hh + 2) sc += 6; }
        for (const [qx, qy, qw, qh] of placed) if (Math.abs(qx - cx) < qw + hw && Math.abs(qy - cy) < qh + hh) sc += 20;
        if (!best || sc < best[0]) best = [sc, cx, cy, R * ca, R * sa];
      }
      placed.push([best[1], best[2], hw, hh]);
      b.create("point", [p.x, p.y], { name: p.t, fixed: true, size: 3, ...(p.빈 ? { strokeColor: hi, highlightStrokeColor: hi, fillColor: "#fff", highlightFillColor: "#fff", fillOpacity: 1, strokeWidth: 2 } : { color: hi }), label: { fontSize: 14, useKatex: p.k, anchorX: "middle", anchorY: "middle", offset: [best[3], best[4]] } });
    });
    return b;
  }

  // ── 수직선
  function drawLineJXG(el, c) {
    const [a, z] = c.범위, ink = css("--ink", "#1F2430"), hi = css("--retry", "#E5322D");
    // 위 칸은 구간 줄 수만큼만(빈 판이 위아래로 크게 남던 것, 10-06)
    const top = 0.75 + 0.3 * Math.max(0, (c.구간 || []).length - 1);
    const b = JXG.JSXGraph.initBoard(el.id, { boundingbox: [a - 0.5, top, z + 0.5, -0.7], axis: false, showCopyright: false, showNavigation: false, pan: { enabled: false }, zoom: { enabled: false } });
    b.create("axis", [[0, 0], [1, 0]], { ticks: { majorHeight: 8, minorTicks: 0, insertTicks: false, drawZero: true, ticksDistance: niceStep(z - a, el.clientWidth), label: { fontSize: 14, anchorX: "middle", anchorY: "top", offset: [0, -8] } }, strokeColor: ink });   // 0 눈금도(수직선에서 0 이 빠지던 것, 10-06)
    (c.구간 || []).forEach((iv, i) => {
      const y = 0.35 + i * 0.3;
      // 끝없음: 그 쪽으로 판 끝까지 화살표(끝점 없음) — x>3 처럼 한쪽이 열린 범위(10-06, 범위 끝에 닫힌 점이 찍혀 오해되던 것)
      const L = iv.왼쪽 === "끝없음", R = iv.오른쪽 === "끝없음";
      b.create("segment", [[L ? a - 0.45 : iv.부터, y], [R ? z + 0.45 : iv.까지, y]], { strokeColor: hi, strokeWidth: 4, fixed: true, firstArrow: L, lastArrow: R });
      if (!L) b.create("point", [iv.부터, y], { name: "", fixed: true, size: 4, strokeColor: hi, fillColor: iv.왼쪽 === "닫힘" ? hi : "#fff", fillOpacity: 1 });
      if (!R) b.create("point", [iv.까지, y], { name: "", fixed: true, size: 4, strokeColor: hi, fillColor: iv.오른쪽 === "닫힘" ? hi : "#fff", fillOpacity: 1 });
    });
    const ps = (c.점 || []).map((p) => ({ ...p, ...lab(p.글) })).sort((u, v) => u.x - v.x);
    const row = stagger(ps, (el.clientWidth || 600) / (z - a + 1));
    // 채움 false = 속 빈 점(color 를 주면 채움색까지 덮여 속이 차 보였다 — 10-06)
    ps.forEach((p, i) => b.create("point", [p.x, 0], { name: p.t, fixed: true, size: 3, strokeColor: ink, fillColor: p.채움 === false ? "#fff" : ink, fillOpacity: 1, highlightFillColor: p.채움 === false ? "#fff" : ink, label: { fontSize: 14, useKatex: p.k, anchorX: "middle", offset: [0, 16 + row[i] * 18] } }));
    return b;
  }

  // ── 라이브러리를 못 불러올 때: 간단한 SVG
  function svgFallback(c) {
    const W = 320, H = 200;
    if (c.종류 === "도형") {
      const P = c.점 || {}, [x0, y1, x1, y0] = bboxOf(P, 0.18);
      const sx = (x) => ((x - x0) / (x1 - x0)) * W, sy = (y) => H - ((y - y0) / (y1 - y0)) * H;
      const isHi = (a, z) => (c.강조 || []).some(([p, q]) => (p === a && q === z) || (p === z && q === a));
      const lines = (c.선 || []).map(([p, q]) => `<line x1="${sx(P[p][0])}" y1="${sy(P[p][1])}" x2="${sx(P[q][0])}" y2="${sy(P[q][1])}" class="${isHi(p, q) ? "hi" : ""}"/>`).join("");
      const dots = Object.entries(P).map(([n, [x, y]]) => n.startsWith("_") ? `<circle cx="${sx(x)}" cy="${sy(y)}" r="1.5"/>` : `<circle cx="${sx(x)}" cy="${sy(y)}" r="3"/><text x="${sx(x) + 6}" y="${sy(y) - 6}">${esc(n)}</text>`).join("");
      const plain = (s) => String(s).replace(/^\$(.*)\$$/, "$1").replace(/\\text\{([^}]*)\}/g, "$1").replace(/\\[a-zA-Z]+/g, "");
      const words = (c.글자 || []).map((t) => `<text x="${sx(t.x)}" y="${sy(t.y)}" text-anchor="middle" dominant-baseline="middle">${esc(plain(t.글))}</text>`).join("");
      return `<svg class="ins-svg" viewBox="0 0 ${W} ${H}">${lines}${dots}${words}</svg>`;
    }
    if (c.종류 === "그래프") {
      const [x0, x1, y0, y1] = c.범위, sx = (x) => ((x - x0) / (x1 - x0)) * W, sy = (y) => H - ((y - y0) / (y1 - y0)) * H;
      const sl = c.슬라이더, curves = (c.식 || []).map((e) => { const f = fn(e, sl && sl.이름); const pts = []; for (let i = 0; i <= 120; i++) { const x = x0 + (x1 - x0) * i / 120, y = f(x, sl ? sl.값 : 0); if (isFinite(y)) pts.push(`${sx(x).toFixed(1)},${sy(y).toFixed(1)}`); } return `<polyline points="${pts.join(" ")}"/>`; }).join("");
      return `<svg class="ins-svg" viewBox="0 0 ${W} ${H}"><line class="ax" x1="0" y1="${sy(0)}" x2="${W}" y2="${sy(0)}"/><line class="ax" x1="${sx(0)}" y1="0" x2="${sx(0)}" y2="${H}"/>${curves}</svg>`;
    }
    return "";
  }

  async function render(host, card) {
    if (!card) return null;
    if (card.종류 === "공식") return frame(host, card, `<div class="ins-tex">${(card.tex || []).map((t) => `<div>${tex(t)}</div>`).join("")}</div>`);
    // 표 칸에 $ 없이 '2^3'·'a_1'·'\frac' 이 오면 수식으로(^ 가 글자째 보이던 것, 10-06)
    const cell = (x) => { const s = String(x == null ? "" : x); return QR.inline(!/\$/.test(s) && /\^|_\{?\w|\\[a-zA-Z]/.test(s) && !/[가-힣]/.test(s) ? `$${s}$` : s); };
    if (card.종류 === "표") return frame(host, card, `<div class="ins-tbl"><table><tr>${(card.머리 || []).map((h) => `<th>${cell(h)}</th>`).join("")}</tr>${(card.행 || []).map((r) => `<tr>${r.map((x) => `<td>${cell(x)}</td>`).join("")}</tr>`).join("")}</table></div>`);
    if (card.종류 === "강의") return frame(host, card, card.yt
      ? `<div class="ins-vid"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(card.yt)}?start=${card.s}&end=${card.e}&rel=0" title="해설 영상" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`
      : `<a class="btn btn-ghost st-mini" href="${esc(card.url)}" target="_blank" rel="noopener">EBSi 강의 ${esc(card.at || "")}</a>`);
    const id = `ins${++uid}`;
    const el = frame(host, card, `<div class="ins-board jxgbox" id="${id}"></div>`);
    const ok = await loadJXG();
    const box = el.querySelector(".ins-board");
    if (!ok) { box.outerHTML = svgFallback(card); return el; }
    // 판은 '보이는 폭'으로 그린다. 숨은 칸·좁은 창에서 먼저 그려지면 그 크기로 굳어 찌그러지므로(10-06 대표님 지적),
    // 폭이 0 이면 보일 때까지 기다리고, 폭이 바뀌면 판을 새로 그린다.
    let board = null, lastW = 0, sv = null;
    // 슬라이더는 판 위 밀대 줄로(판 안에 두면 곡선·눈금과 겹쳤다 — 10-06 전수 점검). 판을 다시 그려도 밀대 값은 그대로.
    if (card.종류 === "그래프" && card.슬라이더) {
      const sl = card.슬라이더, step = +sl.단위 > 0 ? +sl.단위 : 0.5, v0 = +sl.값;
      // 밀대 눈은 처음 값에서 step 씩(범위 끝이 step 에 안 맞으면 처음 값이 다른 값으로 붙어 버리므로)
      const lo = v0 - Math.floor((v0 - +sl.범위[0]) / step + 1e-9) * step, up = v0 + Math.floor((+sl.범위[1] - v0) / step + 1e-9) * step;
      const nm = window.katex ? katex.renderToString(String(sl.이름), { throwOnError: false }) : esc(sl.이름);
      box.insertAdjacentHTML("beforebegin", `<div class="ins-slider"><span class="ins-sl-name">${nm}</span><input type="range" min="${lo}" max="${up}" step="${step}" value="${v0}" aria-label="${esc(sl.이름)} 움직이기"><span class="ins-sl-val"></span></div>`);
      const row = box.previousElementSibling, inp = row.querySelector("input"), out = row.querySelector(".ins-sl-val");
      const show = () => { if (!sl.값숨김) out.textContent = "= " + Math.round(+inp.value * 1000) / 1000; };
      sv = () => +inp.value;
      show();
      inp.addEventListener("input", () => { show(); if (board) board.update(); });
    }
    const draw = () => {
      const w = box.clientWidth;
      if (!w || Math.abs(w - lastW) < 2) return;
      lastW = w;
      // 도형은 비례대로 높이를 잡는다(세로로 긴 그림이 작아지지 않게), 180~380px
      if (card.종류 === "도형" && card.점) {
        const xs = Object.values(card.점).map((p) => p[0]), ys = Object.values(card.점).map((p) => p[1]);
        const gw = Math.max(...xs) - Math.min(...xs) || 1, gh = Math.max(...ys) - Math.min(...ys) || 1;
        box.style.height = Math.round(Math.max(180, Math.min(380, w * (gh / gw) * 0.9 + 40))) + "px";
      }
      if (card.종류 === "수직선") box.style.height = 150 + 30 * Math.max(0, (card.구간 || []).length - 1) + "px";
      // 원이 든 그래프는 가로세로 같은 비율로(원이 타원으로 찌그러지던 것, 10-06)
      if (card.종류 === "그래프" && card.범위 && roundish(card)) {
        const [x0, x1, y0, y1] = card.범위;
        box.style.height = Math.round(Math.max(180, Math.min(420, w * (y1 - y0) / ((x1 - x0) || 1)))) + "px";
      }
      try {
        if (board) { JXG.JSXGraph.freeBoard(board); board = null; box.innerHTML = ""; }
        if (window.katex && JXG.Options && JXG.Options.text) JXG.Options.text.useKatex = true;
        if (card.종류 === "도형") board = drawShapeJXG(box, card);
        else if (card.종류 === "그래프") board = drawGraphJXG(box, card, sv);
        else if (card.종류 === "수직선") board = drawLineJXG(box, card);
        if (board) fitText(board, box);
      } catch (e) { if (ro) ro.disconnect(); box.outerHTML = svgFallback(card); }
    };
    let timer = 0;
    const later = () => {
      if (!box.isConnected) {   // 카드가 화면에서 빠졌으면 듣기를 거두고 판을 풀어 준다(새는 것 막기)
        window.removeEventListener("resize", later); document.removeEventListener("visibilitychange", later);
        if (ro) ro.disconnect();
        if (board) { try { JXG.JSXGraph.freeBoard(board); } catch (e) {} board = null; }
        return;
      }
      clearTimeout(timer); timer = setTimeout(draw, 120);
    };
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(later) : null;
    if (ro) ro.observe(box);
    // ResizeObserver 는 화면이 가려져 있으면(탭·창이 숨음) 알리지 않는다 → 창 크기·다시 보임에도 맞추고,
    // 처음에 폭이 0 이면 잠시 동안 폭을 다시 재 본다(숨은 칸이 곧 펼쳐지는 경우)
    window.addEventListener("resize", later);
    document.addEventListener("visibilitychange", later);
    draw();
    // 수식 글꼴(KaTeX)이 아직 안 받아졌으면 글 크기를 잘못 재 판을 넓혀 그림이 작게 굳는다 → 글꼴이 다 오면 한 번 더(10-06)
    if (document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(() => { if (box.isConnected) { lastW = 0; draw(); } });
    let tries = 0;
    const poll = () => { if (lastW || !box.isConnected) return; draw(); if (!lastW && tries++ < 40) setTimeout(poll, 500); };
    if (!lastW) setTimeout(poll, 300);
    return el;
  }

  // 강의 장면: 단계 풀이 자료의 EBSi 단계 시각(lt) · 어피셜 문항 구간
  const mmss = (ms) => { const s = Math.max(0, Math.round((ms || 0) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  function lecture(q, k) {
    const S = window.STEPS && STEPS[q.id];
    if (!S) return null;
    const L = S.강의 || [], y = L.find((x) => x.src === "어피셜" && x.yt), e = L.find((x) => x.src === "EBSi");
    const st = (S.단계 || [])[k] || {};
    if (y) return { 종류: "강의", 제목: "해설 영상 · 이 문항 구간", yt: y.yt, s: Math.floor(y.t[0] / 1000), e: Math.ceil(y.t[1] / 1000), 글: st.lw || "" };
    if (e && e.course) return { 종류: "강의", 제목: `EBSi 강의 · ${k + 1}단계`, url: `https://www.ebsi.co.kr/ebs/lms/lmsx/retrieveSbjtDtl.ebs?courseId=${encodeURIComponent(e.course)}&defaultTabCd=tb_tab12`, at: mmss(st.lt != null ? st.lt : e.t[0]), 글: st.lw || e.pt || "" };
    return null;
  }
  function forStep(q, k) {
    const C = window.COACH_DATA && COACH_DATA[q.id];
    const cards = ((C && C.인사이트 && C.인사이트[k]) || []).slice();
    return cards;
  }

  window.INSIGHT = { render, lecture, forStep, loadJXG, fn };
})();
