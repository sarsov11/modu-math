/* 풀이판 줄 인식(2026-09-29) — 학생이 풀이판에 쓴 획을 줄로 나누고, 줄마다 글자·식·값을 읽는다. 서버 없음.
   칸미고는 학생이 친 글을 LLM+SymPy 로 본다. 우리는 손으로 쓴 풀이를 기기 안에서 읽어 단계 추적(tracer.js)에 넘긴다.
   ① 줄 나누기: 획 세로 위치로 묶는다. 분수(가로선 위·아래 글자)는 한 덩이로 먼저 묶는다.
   ② 글자 묶기: 가로로 겹치는 획 = 한 글자(hwr.js 와 같은 방식). √ 는 윗줄이 뒤 글자를 덮으므로 따로 뺀다.
   ③ 글자 읽기: 기호는 획 모양 규칙(= + × ÷ / ( ) √ · . −), 숫자는 hwr.js CNN, 확신 낮으면 "?"(문자·모르는 글자).
      작고 위로 뜬 글자는 지수(제곱). 두 대각선이 엇갈리면 수 사이에선 ×, 아니면 문자 x.
   ④ 식 만들기 → `=` 로 마디를 나눠 마디마다 값(문자가 섞이면 값 없음) → 마디 값이 서로 다르면 계산 실수 후보.
   인식은 판정 재료일 뿐이다. conf(글자 확신 최솟값)가 낮은 줄은 tracer 가 판정에 쓰지 않는다.
   LINEREC.analyze(strokes) → [{box, toks, tex, segs:[{tex, v}], rhs, slip, conf}]   (위 → 아래)
   LINEREC.evalTokens(toks) · LINEREC.parse("9+7=16") (시험용: 글 → 토큰) */
(function () {
  const bb = (pts) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  };
  const bbS = (ss) => bb(ss.flatMap((s) => s.pts));
  const med = (a) => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };

  // 획 하나의 모양 값: 곧음(현/길이), 기울기(도), 가장 불룩한 쪽
  function shape(s) {
    const P = s.pts, a = P[0], z = P[P.length - 1];
    let len = 0;
    for (let i = 1; i < P.length; i++) len += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    const chord = Math.hypot(z[0] - a[0], z[1] - a[1]);
    const b = bb(P);
    // 현에서 가장 먼 점의 부호(현 기준 왼쪽/오른쪽)
    let far = 0, side = 0;
    for (const p of P) {
      const d = ((z[0] - a[0]) * (p[1] - a[1]) - (z[1] - a[1]) * (p[0] - a[0])) / (chord || 1);
      if (Math.abs(d) > Math.abs(far)) far = d;
    }
    side = far;
    // 가장 낮은 점(화면 y 최대)의 가로 위치 비율 — √ 판정
    let low = P[0];
    for (const p of P) if (p[1] > low[1]) low = p;
    return { b, len, chord, straight: len ? chord / len : 1, ang: Math.atan2(-(z[1] - a[1]), z[0] - a[0]) * 180 / Math.PI, side, low, a, z };
  }
  const isHoriz = (sh, H) => sh.straight > 0.85 && sh.b.w > sh.b.h * 3 && sh.b.w > H * 0.25;

  // √: 왼쪽 가운데에서 내려갔다가 오른쪽 위로 올라가고, 대개 윗줄이 오른쪽으로 길게 이어진다
  function isSqrt(sh, H) {
    const { b, low } = sh;
    if (b.w < H * 0.6 || b.h < H * 0.5) return false;
    const lowRel = (low[0] - b.x0) / (b.w || 1);
    if (lowRel > 0.45 || low[1] < b.y1 - b.h * 0.15) return false;     // 가장 낮은 점이 왼쪽·바닥
    const endRight = Math.max(sh.a[0], sh.z[0]) > b.x0 + b.w * 0.7;     // 끝이 오른쪽
    // 끝(오른쪽 위로 올라간 끝·윗줄 끝)이 위에 있고, 시작은 왼쪽. 4 의 첫 획(위에서 시작→왼쪽 아래→오른쪽 끝)이 √ 로 읽히던 것을 막는다
    const topRight = sh.z[1] < b.y0 + b.h * 0.3 && sh.a[0] < b.x0 + b.w * 0.4;
    return endRight && topRight && sh.straight < 0.8;
  }

  // ── ① 단위(분수·√·획) 만들기, 줄 나누기
  function units(strokes) {
    const S = strokes.map((s) => ({ s, sh: shape(s) }));
    const hs = S.filter((x) => !(x.sh.b.w > x.sh.b.h * 3) && x.sh.b.h > 2).map((x) => x.sh.b.h);
    const H = Math.max(14, med(hs) || 24);
    const used = new Set(), U = [];
    // 분수: 가로선 + 바로 위·아래에 가로로 겹치는 획
    const horiz = S.filter((x) => isHoriz(x.sh, H) && x.sh.b.w > H * 0.7).sort((a, b) => b.sh.b.w - a.sh.b.w);
    for (const bar of horiz) {
      if (used.has(bar)) continue;
      const B = bar.sh.b;
      const inX = (x) => x.sh.b.cx > B.x0 - H * 0.15 && x.sh.b.cx < B.x1 + H * 0.15;
      const above = S.filter((x) => x !== bar && !used.has(x) && inX(x) && x.sh.b.y1 <= B.cy + 2 && x.sh.b.y1 > B.cy - H * 1.6);
      const below = S.filter((x) => x !== bar && !used.has(x) && inX(x) && x.sh.b.y0 >= B.cy - 2 && x.sh.b.y0 < B.cy + H * 1.6);
      // = 의 윗줄/아랫줄 과 헷갈리지 않게: 위·아래 모두 가로선 아닌 획이 있어야
      if (above.some((x) => !isHoriz(x.sh, H)) && below.some((x) => !isHoriz(x.sh, H))) {
        [bar, ...above, ...below].forEach((x) => used.add(x));
        const all = [bar, ...above, ...below].map((x) => x.s);
        U.push({ kind: "frac", bar: bar.s, num: above.map((x) => x.s), den: below.map((x) => x.s), b: bbS(all), cy: B.cy });
      }
    }
    for (const x of S) {
      if (used.has(x)) continue;
      if (isSqrt(x.sh, H)) { used.add(x); U.push({ kind: "sqrt", s: x.s, sh: x.sh, b: x.sh.b, cy: x.sh.b.cy }); }
    }
    for (const x of S) if (!used.has(x)) U.push({ kind: "stroke", s: x.s, sh: x.sh, b: x.sh.b, cy: x.sh.b.cy });
    return { U, H };
  }

  function splitLines(U, H) {
    const L = [];
    // 큰 단위부터(분수·√·긴 획) 줄의 뼈대를 세운다
    const order = [...U].sort((a, b) => b.b.h - a.b.h);
    for (const u of order) {
      const small = u.kind === "stroke" && u.b.h < H * 0.35 && u.b.w < H * 0.6;   // 점·짧은 가로선은 가까운 줄에
      // 납작한 획(5·7 의 윗줄, − =)은 자기 키가 작아 "자기 키의 35% 겹침"이 줄 위·아래로 2~3px 삐져나오면 깨진다 → 줄 범위에서 H 의 25% 안이면 같은 줄
      const flat = u.kind === "stroke" && u.b.h < H * 0.35;
      let best = null, bd = 1e9;
      for (const l of L) {
        const ov = Math.min(l.y1, u.b.y1) - Math.max(l.y0, u.b.y0);
        const d = Math.abs(l.cy - u.cy);
        const ok = small ? d < H * 0.9 : ov > Math.min(u.b.h, l.y1 - l.y0) * 0.35 || d < H * 0.45 || (flat && ov > -H * 0.25);
        if (ok && d < bd) { best = l; bd = d; }
      }
      if (best) { best.u.push(u); best.y0 = Math.min(best.y0, u.b.y0); best.y1 = Math.max(best.y1, u.b.y1); }
      else L.push({ u: [u], y0: u.b.y0, y1: u.b.y1, cy: u.cy });
    }
    for (const l of L) {
      // 줄 가운데 = 보통 크기 글자들의 세로 가운데 중앙값
      const mids = l.u.filter((u) => u.kind !== "stroke" || u.b.h > H * 0.5).map((u) => u.cy);
      l.cy = med(mids.length ? mids : l.u.map((u) => u.cy));
    }
    return L.sort((a, b) => a.cy - b.cy);
  }

  // ── ② 글자 묶기(한 줄 안)
  function glyphs(u, H) {
    const items = u.filter((x) => x.kind === "stroke").map((x) => ({ ss: [x.s], shs: [x.sh], b: x.b }))
      .sort((a, b) => a.b.x0 - b.b.x0);
    const G = [];
    for (const it of items) {
      const g = G.find((g) => {
        const ov = Math.min(g.b.x1, it.b.x1) - Math.max(g.b.x0, it.b.x0);
        const minw = Math.max(3, Math.min(g.b.w, it.b.w));
        if (ov > minw * 0.45) return true;
        // 가는 획(+ 의 세로 획, 4 의 세로 획)이 다른 획의 가로 범위 안에서 만나면 한 글자. 폭이 거의 0 이라 위 겹침 조건이 놓친다
        const [t, o] = g.b.w < it.b.w ? [g.b, it.b] : [it.b, g.b];
        return t.w < H * 0.15 && t.cx > o.x0 && t.cx < o.x1 && Math.min(t.y1, o.y1) - Math.max(t.y0, o.y0) > -H * 0.2;
      });
      if (g) { g.ss.push(...it.ss); g.shs.push(...it.shs); g.b = bbS(g.ss); } else G.push(it);
    }
    // ÷: 가로선 + 위아래 점 두 개가 따로 묶였으면 합친다(점이 선과 가로로 겹치므로 대개 이미 한 덩이)
    return G.sort((a, b) => a.b.x0 - b.b.x0);
  }

  // ── ③ 글자 읽기
  function readGlyph(g, H, yc) {
    const { b, shs } = g, n = shs.length;
    const tiny = b.w < H * 0.22 && b.h < H * 0.22;
    if (tiny) return b.cy > yc + H * 0.12 ? { k: "dot", ch: ".", p: 0.9 } : { k: "op", ch: "×", p: 0.75, why: "가운뎃점" };
    const hz = shs.map((s) => isHoriz(s, H * 0.6));
    if (n === 1 && hz[0]) return { k: "op", ch: "-", p: 0.92 };
    if (n === 2 && hz[0] && hz[1]) {
      const [a, c] = shs.map((s) => s.b);
      const gap = Math.abs(a.cy - c.cy), ov = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0);
      if (gap < H * 0.8 && ov > Math.min(a.w, c.w) * 0.4) return { k: "eq", ch: "=", p: 0.95 };
    }
    if (n === 3) {
      const bars = shs.filter((s) => isHoriz(s, H * 0.6)), dots = shs.filter((s) => s.b.w < H * 0.25 && s.b.h < H * 0.25);
      if (bars.length === 1 && dots.length === 2) return { k: "op", ch: "÷", p: 0.9 };
    }
    if (n === 2) {
      const [s1, s2] = shs;
      const vert = (s) => s.straight > 0.85 && Math.abs(Math.abs(s.ang) - 90) < 25;
      const flat = (s) => s.straight > 0.85 && (Math.abs(s.ang) < 25 || Math.abs(Math.abs(s.ang) - 180) < 25);
      const diag = (s) => s.straight > 0.8 && ((Math.abs(s.ang) > 25 && Math.abs(s.ang) < 65) || (Math.abs(s.ang) > 115 && Math.abs(s.ang) < 155));
      const cross = (s, t) => Math.min(s.b.x1, t.b.x1) > Math.max(s.b.x0, t.b.x0) && Math.min(s.b.y1, t.b.y1) > Math.max(s.b.y0, t.b.y0);
      if (cross(s1, s2) && ((vert(s1) && flat(s2)) || (vert(s2) && flat(s1)))) return { k: "op", ch: "+", p: 0.9 };
      if (cross(s1, s2) && diag(s1) && diag(s2)) {
        const up = (s) => (s.ang > 0 && s.ang < 90) || s.ang < -90;   // 오른쪽 위로 가는 선
        if (up(s1) !== up(s2)) return { k: "cross", ch: "×", p: 0.85 };
      }
    }
    if (n === 1) {
      const s = shs[0];
      const a = Math.abs(s.ang), slant = a > 90 ? 180 - a : a;   // 가로에서 잰 각
      if (s.straight > 0.9 && slant > 30 && slant < 72 && b.h > H * 0.55) {
        const up = (s.ang > 0 && s.ang < 90) || s.ang < -90;
        if (up) return { k: "op", ch: "/", p: 0.8 };
      }
      if (s.straight < 0.93 && b.h > b.w * 1.9 && b.h > H * 0.75) {
        // 위→아래로 그린 괄호: 가운데가 왼쪽으로 불룩 = "(" . 획 방향과 무관하게 불룩한 점의 x 로 본다
        const mid = s.b.cx, far = farthestX(g.ss[0]);
        if (s.straight < 0.9 && Math.abs(far - (s.a[0] + s.z[0]) / 2) > b.w * 0.25) return far < mid ? { k: "lp", ch: "(", p: 0.85 } : { k: "rp", ch: ")", p: 0.85 };
      }
    }
    if (!window.HWR || !HWR.ready) return { k: "var", ch: "?", p: 0 };
    const r = HWR.classify(HWR.raster(g.ss, b));
    let top = r[0];
    if (n === 1 && b.h > b.w * 3.2) top = ["1", Math.max(top[0] === "1" ? top[1] : 0.85, 0.85)];
    if (top[1] < 0.6) return { k: "var", ch: "?", p: 1 - top[1], alts: r.slice(0, 3).map((x) => x[0]) };
    return { k: "num", ch: top[0], p: top[1], alts: r.slice(0, 3).map((x) => x[0]) };
  }
  function farthestX(s) {
    const P = s.pts, a = P[0], z = P[P.length - 1];
    let best = P[0], bd = -1;
    for (const p of P) {
      const d = Math.abs((z[0] - a[0]) * (p[1] - a[1]) - (z[1] - a[1]) * (p[0] - a[0]));
      if (d > bd) { bd = d; best = p; }
    }
    return best[0];
  }

  // 줄(또는 분자·분모·근호 안) 읽기 → 토큰
  function readUnits(u, H) {
    const yc = med(u.filter((x) => x.kind !== "stroke" || x.b.h > H * 0.5).map((x) => x.cy)) || med(u.map((x) => x.cy));
    const out = [];
    // √ 는 덮는 범위 안의 단위를 근호 안으로
    const sq = u.filter((x) => x.kind === "sqrt").sort((a, b) => a.b.x0 - b.b.x0);
    const inside = new Set();
    const roots = sq.map((r) => {
      const x0 = r.sh.low[0], x1 = r.b.x1;
      const inn = u.filter((x) => x !== r && x.kind !== "sqrt" && !inside.has(x) && x.b.cx > x0 && x.b.cx < x1 + H * 0.1 && x.b.cy > r.b.y0);
      inn.forEach((x) => inside.add(x));
      return { x: r.b.x0, tok: { k: "sqrt", inner: inn.length ? readUnits(inn, H) : [], p: 0.85 } };
    });
    const fr = u.filter((x) => x.kind === "frac" && !inside.has(x)).map((f) => ({
      x: f.b.x0, tok: { k: "frac", num: readUnits(f.num.map((s) => ({ kind: "stroke", s, sh: shape(s), b: bb(s.pts), cy: bb(s.pts).cy })), H),
        den: readUnits(f.den.map((s) => ({ kind: "stroke", s, sh: shape(s), b: bb(s.pts), cy: bb(s.pts).cy })), H), p: 0.9 } }));
    const rest = u.filter((x) => x.kind === "stroke" && !inside.has(x));
    const gl = glyphs(rest, H).map((g) => {
      const t = readGlyph(g, H, yc);
      t.b = g.b;
      // 지수: 앞 글자보다 작고 위로 뜬 수·문자
      if ((t.k === "num" || t.k === "var") && g.b.h < H * 0.72 && g.b.y1 < yc - H * 0.05) t.sup = true;
      return { x: g.b.x0, tok: t };
    });
    return [...roots, ...fr, ...gl].sort((a, b) => a.x - b.x).map((x) => x.tok);
  }

  // ── ④ 토큰 → 식(TeX) · 값
  // 토큰 흐름을 수·연산으로 정리: 이어진 숫자와 점은 한 수로, 지수 글자는 앞 항의 지수로
  function normalize(toks) {
    const T = [];
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (t.sup && T.length) { const prev = T[T.length - 1]; (prev.pow = prev.pow || []).push(t); continue; }
      if ((t.k === "num" || t.k === "dot") && T.length && T[T.length - 1].k === "n" && !T[T.length - 1].pow) {
        const prev = T[T.length - 1]; prev.s += t.ch; prev.p = Math.min(prev.p, t.p); continue;
      }
      if (t.k === "num") { T.push({ k: "n", s: t.ch, p: t.p }); continue; }
      if (t.k === "dot") { T.push({ k: "n", s: "0.", p: t.p }); continue; }
      if (t.k === "cross") {
        const prev = T[T.length - 1], nx = toks[i + 1];
        const numL = prev && (prev.k === "n" || prev.k === "rp" || prev.k === "frac" || prev.k === "sqrt");
        const numR = nx && (nx.k === "num" || nx.k === "lp" || nx.k === "frac" || nx.k === "sqrt");
        T.push(numL && numR ? { k: "op", s: "×", p: t.p } : { k: "var", s: "x", p: t.p });
        continue;
      }
      if (t.k === "sqrt") { T.push({ k: "sqrt", inner: normalize(t.inner), p: t.p }); continue; }
      if (t.k === "frac") { T.push({ k: "frac", num: normalize(t.num), den: normalize(t.den), p: t.p }); continue; }
      T.push({ k: t.k, s: t.ch, p: t.p });
    }
    return T;
  }
  const powTex = (pw) => pw ? `^{${pw.map((t) => t.k === "num" ? t.ch : "?").join("")}}` : "";
  function tex(T) {
    return T.map((t) => {
      let s;
      if (t.k === "n") s = t.s;
      else if (t.k === "op") s = { "×": "\\times ", "÷": "\\div ", "-": "-", "+": "+", "/": "/" }[t.s] || t.s;
      else if (t.k === "eq") s = "=";
      else if (t.k === "lp") s = "(";
      else if (t.k === "rp") s = ")";
      else if (t.k === "sqrt") s = `\\sqrt{${tex(t.inner)}}`;
      else if (t.k === "frac") s = `\\frac{${tex(t.num)}}{${tex(t.den)}}`;
      else s = t.s === "x" ? "x" : "\\square ";
      return s + powTex(t.pow);
    }).join("");
  }
  // 값: 재귀 하강(+ − × ÷ / 거듭제곱 √ 분수 괄호 음수 곱셈 생략). 문자가 있으면 null.
  function value(T) {
    let i = 0, bad = false;
    const peek = () => T[i];
    const powOf = (t, v) => {
      if (!t.pow) return v;
      const e = t.pow.map((x) => x.ch).join("");
      if (!/^\d+$/.test(e)) { bad = true; return NaN; }
      return Math.pow(v, +e);
    };
    function atom() {
      const t = peek();
      if (!t) { bad = true; return NaN; }
      if (t.k === "n") { i++; return powOf(t, parseFloat(t.s)); }
      if (t.k === "op" && t.s === "-") { i++; return -atom(); }
      if (t.k === "lp") {
        i++; const v = expr();
        const r = peek();
        if (r && r.k === "rp") { i++; return powOf(r, v); }
        return v;   // 닫는 괄호를 안 쓴 경우도 읽는다
      }
      if (t.k === "sqrt") { i++; const v = value(t.inner); if (v == null) { bad = true; return NaN; } return powOf(t, Math.sqrt(v)); }
      if (t.k === "frac") { i++; const a = value(t.num), b = value(t.den); if (a == null || b == null || b === 0) { bad = true; return NaN; } return powOf(t, a / b); }
      bad = true; i++; return NaN;
    }
    function term() {
      let v = atom();
      for (;;) {
        const t = peek();
        if (!t) break;
        if (t.k === "op" && (t.s === "×" || t.s === "÷" || t.s === "/")) { i++; const w = atom(); v = t.s === "×" ? v * w : v / w; continue; }
        if (t.k === "n" || t.k === "lp" || t.k === "sqrt" || t.k === "frac") { v *= atom(); continue; }   // 곱셈 생략 2(3), 2√3
        break;
      }
      return v;
    }
    function expr() {
      let v = term();
      for (;;) {
        const t = peek();
        if (t && t.k === "op" && (t.s === "+" || t.s === "-")) { i++; const w = term(); v = t.s === "+" ? v + w : v - w; continue; }
        break;
      }
      return v;
    }
    if (!T.length || T.some((t) => t.k === "var")) return null;
    const v = expr();
    if (bad || i < T.length || !isFinite(v)) return null;
    return v;
  }
  const minP = (T) => T.reduce((m, t) => Math.min(m, t.p == null ? 1 : t.p, t.inner ? minP(t.inner) : 1, t.num ? minP(t.num) : 1, t.den ? minP(t.den) : 1), 1);
  const hasOp = (T) => T.some((t) => t.k === "op" || t.k === "sqrt" || t.k === "frac" || t.pow);
  const near = (a, b) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));

  function lineOf(toks) {
    const T = normalize(toks);
    const segs = [];
    let cur = [];
    for (const t of T) { if (t.k === "eq") { segs.push(cur); cur = []; } else cur.push(t); }
    segs.push(cur);
    const S = segs.filter((s) => s.length).map((s) => ({ tex: tex(s), v: value(s), conf: minP(s), op: hasOp(s) }));
    // 계산 실수 후보: 이웃한 두 마디가 모두 수이고 값이 다를 때(왼쪽에 연산이 있어야 — "3=3" 같은 줄은 제외)
    let slip = null;
    for (let k = 0; k + 1 < S.length; k++) {
      const a = S[k], b = S[k + 1];
      if (a.v != null && b.v != null && a.op && !near(a.v, b.v)) { slip = { at: k, lhs: a.tex, wrote: b.v, true: a.v, conf: Math.min(a.conf, b.conf) }; break; }
    }
    const last = [...S].reverse().find((s) => s.v != null);
    return { toks: T, tex: S.map((s) => s.tex).join("="), segs: S, rhs: T.some((t) => t.k === "eq") && last ? last.v : (S.length === 1 ? S[0].v : null),
      vals: S.filter((s) => s.v != null).map((s) => s.v), slip, conf: minP(T), eq: T.some((t) => t.k === "eq") };
  }

  // 그림 가르기(2026-09-29, 대표님 "삼각형을 그리게끔 유도") — 코치가 "그리기"를 시키므로 풀이판에 도형·그래프가 생긴다.
  // 그림 획을 글자로 읽으면 엉뚱한 값이 판정에 들어가므로 먼저 뺀다.
  //   큰 획: 높이 > 글자 2.6배 · 길게 비스듬한 선(> 글자 3배) · 위아래 글자 없는 긴 가로선(> 글자 3배) · 닫힌 큰 곡선
  //   딸린 획: 그림 범위(글자 1.6칸 여유) 안의 작은 획 — 직각 표시·꼭짓점 이름·변에 적은 길이(주어진 값이라 판정에 안 쓴다)
  function splitDrawing(pen) {
    const S = pen.map((s) => ({ s, sh: shape(s) }));
    const hs = S.map((x) => x.sh.b.h).filter((h) => h > 2);
    const m0 = med(hs) || 24;
    const H = Math.max(14, med(hs.filter((h) => h < m0 * 3)) || m0);
    const big = new Set();
    for (const x of S) {
      const { b, straight, chord, a, z } = x.sh;
      const slant = Math.abs(Math.atan2(z[1] - a[1], z[0] - a[0]) * 180 / Math.PI) % 180;
      const flat = slant < 12 || slant > 168;
      const closed = x.s.pts.length > 8 && Math.hypot(z[0] - a[0], z[1] - a[1]) < Math.max(b.w, b.h) * 0.25;
      if (b.h > H * 2.6) big.add(x);
      else if (straight > 0.9 && chord > H * 3 && !flat) big.add(x);
      else if (closed && Math.max(b.w, b.h) > H * 2.2) big.add(x);
      else if (flat && straight > 0.9 && b.w > H * 3) {
        // 분수선이면 바로 위·아래에 글자가 있다 — 둘 다 없으면 도형의 밑변·축
        const up = S.some((y) => y !== x && y.sh.b.cx > b.x0 && y.sh.b.cx < b.x1 && y.sh.b.y1 <= b.cy + 2 && y.sh.b.y1 > b.cy - H * 1.6);
        const dn = S.some((y) => y !== x && y.sh.b.cx > b.x0 && y.sh.b.cx < b.x1 && y.sh.b.y0 >= b.cy - 2 && y.sh.b.y0 < b.cy + H * 1.6);
        if (!(up && dn)) big.add(x);
      }
    }
    if (!big.size) return { text: pen, fig: null };
    const fb = bbS([...big].map((x) => x.s));
    const pad = H * 1.6;   // 변 바깥에 적는 길이·꼭짓점 이름까지(0.5 칸이면 새어 나옴 — 09-29 실측)
    const inFig = (b) => b.cx > fb.x0 - pad && b.cx < fb.x1 + pad && b.cy > fb.y0 - pad && b.cy < fb.y1 + pad;
    const fig = S.filter((x) => big.has(x) || inFig(x.sh.b));
    const figSet = new Set(fig);
    return { text: S.filter((x) => !figSet.has(x)).map((x) => x.s), fig: { n: fig.length, box: bbS(fig.map((x) => x.s)) } };
  }

  function analyze(strokes) {
    const all = (strokes || []).filter((s) => (!s.tool || s.tool === "pen") && s.pts && s.pts.length);
    if (!all.length) return [];
    const { text: pen, fig } = splitDrawing(all);
    if (!pen.length) { const r = []; r.drawing = fig; return r; }
    const { U, H } = units(pen);
    const res = splitLines(U, H).map((l) => {
      const r = lineOf(readUnits(l.u, H));
      const all = l.u.flatMap((u) => u.kind === "frac" ? [u.bar, ...u.num, ...u.den] : [u.s]);
      r.box = bbS(all); r.n = all.length;
      r.key = `${Math.round(r.box.y0 / 8)}:${Math.round(r.box.x0 / 8)}:${r.n}`;
      return r;
    });
    res.drawing = fig;   // {n, box} 또는 null — 그림으로 뺀 획
    return res;
  }

  // 시험용: "9+7=16" 같은 글을 토큰으로(합성 필기 없이 value/slip 논리만 시험)
  function parse(str) {
    const toks = [];
    for (const c of str.replace(/\s/g, "")) {
      if (/\d/.test(c)) toks.push({ k: "num", ch: c, p: 1 });
      else if (c === ".") toks.push({ k: "dot", ch: ".", p: 1 });
      else if (c === "=") toks.push({ k: "eq", ch: "=", p: 1 });
      else if (c === "(") toks.push({ k: "lp", ch: "(", p: 1 });
      else if (c === ")") toks.push({ k: "rp", ch: ")", p: 1 });
      else if ("+-×÷/".includes(c)) toks.push({ k: "op", ch: c, p: 1 });
      else if (c === "*") toks.push({ k: "op", ch: "×", p: 1 });
      else if (c === "²") toks.push({ k: "num", ch: "2", p: 1, sup: true });
      else toks.push({ k: "var", ch: "?", p: 1 });
    }
    return lineOf(toks);
  }

  window.LINEREC = { analyze, parse, value, tex };
})();
