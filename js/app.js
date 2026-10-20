/* 모두의 수학 — 화면. 해시 주소 하나에 화면 하나.
   #/today  #/skills  #/skill/G2  #/units[/HA]  #/solve  #/records  #/settings
   원칙: 오늘 할 것은 하나만 권한다([[tonghap-no-choice-today-objective]]). 오답은 실패가 아니라 재도전. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const TAX = window.TAX, BANK = window.BANK || [];
  const esc = QR.esc;
  const view = () => $("#view");

  // ── 색인
  const BYID = new Map(BANK.map((q) => [q.id, q]));
  const SK = new Map(TAX.스킬.map((s) => [s.id, s]));
  const BR = new Map(TAX.스킬갈래.map((b) => [b.id, b]));
  const UN = new Map(TAX.단원.map((u) => [u.id, u]));
  const COURSE = new Map(TAX.과정.map((c) => [c.id, c]));
  const gc = (sid) => `var(--g-${(sid || "G")[0]})`;

  const GRADE_SCOPE = {
    "중2": ["M1", "M2"],
    "중3": ["M1", "M2", "M3"],
    "고1": ["M3", "HA", "HB"],
    "고2": ["HA", "HB", "HD", "HC", "HS"],
  };
  const scope = () => GRADE_SCOPE[STORE.s.grade] || ["M1", "M2", "M3"];
  const inScope = (q) => scope().includes(q.c);
  const usable = BANK.filter((q) => QR.solvable(q));
  const pool = () => usable.filter(inScope);

  function skillPool(sid) { return pool().filter((q) => (q.s || []).includes(sid)); }

  // ── 아이콘
  const I = {
    today: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/><circle cx="12" cy="12" r="4"/></svg>',
    skills: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="7" r="2.5"/><circle cx="8" cy="18" r="2.5"/><circle cx="18" cy="17" r="2.5"/><path d="M8.3 7.1l7.4-.1M7.2 8.3l.6 7.2M10.3 17.7l5.4-.5M18 9.5v5"/></svg>',
    units: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7M9 12h5"/></svg>',
    records: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    hl: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l-6 6v3h9l3-3"/><path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>',
    eraser: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H7L3 16a2 2 0 0 1 0-2.8L13.2 3a2 2 0 0 1 2.8 0L21 8a2 2 0 0 1 0 2.8L11 21"/><path d="M6 11l7 7"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>',
    redo: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
    flame: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="#FF7A1A" d="M12 2c1 3.5 5 5.5 5 11a5 5 0 0 1-10 0c0-2.2 1-3.7 2.2-4.8C9.6 10 10 12 11.5 12c-.8-3 0-6.5.5-10z"/><path fill="#FFC940" d="M12 13c.6 1.5 2.5 2.4 2.5 4.6a2.5 2.5 0 0 1-5 0c0-1.4.9-2.3 1.6-3 .1.9.5 1.4 1 1.4-.3-1 0-2 .0-3z"/></svg>',
  };

  // ── 공통 조각
  function tierBadge(t, size = 46) {
    const c = t.color;
    return `<svg class="tier-badge" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 3l17 7v13c0 11-7.4 19-17 22C14.4 42 7 34 7 23V10z" fill="${c}"/>
      <path d="M24 7l13 5.5v10.8c0 8.6-5.7 15-13 17.6-7.3-2.6-13-9-13-17.6V12.5z" fill="rgba(255,255,255,.22)"/>
      <text x="24" y="30" text-anchor="middle" font-size="14" font-weight="900" fill="#fff" font-family="Pretendard Variable, sans-serif">${t.div}</text></svg>`;
  }
  function ring(frac, size = 56, color = "var(--accent)") {
    const r = size / 2 - 5, C = 2 * Math.PI * r, off = C * (1 - Math.max(0, Math.min(1, frac)));
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="6"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${off}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-size="${size * 0.26}" font-weight="800" fill="var(--ink)" font-family="Pretendard Variable, sans-serif">${Math.round(frac * 100)}</text></svg>`;
  }
  function toast(msg) {
    const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 1800);
  }
  // ── 출처는 모의고사만(2026-10-07): 학평·모평·수능만 출처를 보인다. 교과서·학교 내신은 ?src=1 로 켠 기기에서만.
  const SRC_ALL = (() => { try { const v = new URLSearchParams(location.search).get("src"); if (v === "1") localStorage.setItem("modumath.src", "1"); if (v === "0") localStorage.removeItem("modumath.src"); return localStorage.getItem("modumath.src") === "1"; } catch (e) { return false; } })();
  function srcLabel(q) { return q.ex === "교육청" || q.ex === "평가원" || SRC_ALL ? q.src || "" : ""; }

  // ── 오늘의 스킬 고르기(학생에게 고르게 하지 않는다)
  function todaySkill() {
    const S = STORE.s;
    const cand = TAX.스킬.filter((s) => skillPool(s.id).length >= 4);
    if (!cand.length) return null;
    const day = STORE.today();
    if (S.todayPick && S.todayPick.day === day && SK.has(S.todayPick.sid) && cand.some((c) => c.id === S.todayPick.sid)) return SK.get(S.todayPick.sid);
    const score = (s) => {
      const k = S.skill[s.id];
      const m = k ? k.m : 0.35;
      const recentMiss = k && k.miss && Date.now() - k.miss < 3 * 864e5 ? -0.15 : 0;
      const doneToday = k && k.last && new Date(k.last).toDateString() === new Date().toDateString() ? 0.3 : 0;
      const seed = (hash(day + s.id) % 100) / 1000;
      return m + recentMiss + doneToday + seed;
    };
    const pick = cand.sort((a, b) => score(a) - score(b))[0];
    S.todayPick = { day, sid: pick.id }; STORE.save();
    return pick;
  }
  function hash(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; }

  // ── 세트 만들기: 쉬운 것 → 어려운 것, 안 푼 것 먼저, 틀렸던 것 다시
  function buildSet(qs, n = 8) {
    const unseen = qs.filter((q) => !STORE.seen(q.id));
    const wrong = qs.filter((q) => STORE.lastOk(q.id) === false);
    const byD = (arr) => arr.slice().sort((a, b) => (a.d || 3) - (b.d || 3) || hash(a.id) - hash(b.id));
    const pick = [];
    const take = (arr, k) => { for (const q of arr) { if (pick.length >= n || k <= 0) break; if (!pick.includes(q)) { pick.push(q); k--; } } };
    take(wrong, 2);
    const u = byD(unseen);
    const easy = u.filter((q) => (q.d || 3) <= 2), mid = u.filter((q) => (q.d || 3) === 3), hard = u.filter((q) => (q.d || 3) >= 4);
    take(easy, 2); take(mid, 4); take(hard, 2);
    take(u, n); take(byD(qs), n);
    return byD(pick).map((q) => q.id);
  }

  // ═════════ 화면: 첫 실행 ═════════
  function onboard() {
    document.body.classList.add("no-shell");
    const grades = [["중2", "일차함수·닮음·확률"], ["중3", "이차함수·삼각비·원"], ["고1", "공통수학1·2"], ["고2", "대수·미적분Ⅰ·확통"]];
    view().innerHTML = `<div class="onboard"><div class="box">
      <div class="brand" style="margin-bottom:26px"><span class="brand-mark">∑</span> 모두의 수학</div>
      <div class="h-eyebrow">시작하기</div>
      <h1 class="h1">지금 몇 학년이에요?</h1>
      <p class="muted" style="margin:6px 0 0">학년에 맞는 스킬부터 권해 드려요. 설정에서 언제든 바꿀 수 있어요.</p>
      <div class="grade-grid">${grades.map(([g, s]) => `<button data-g="${g}" aria-pressed="false"><b>${g}</b><span>${s}</span></button>`).join("")}</div>
      <button class="btn btn-primary btn-block" id="go" disabled>시작하기</button></div></div>`;
    let chosen = null;
    view().querySelectorAll("[data-g]").forEach((b) => b.onclick = () => {
      chosen = b.dataset.g;
      view().querySelectorAll("[data-g]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      $("#go").disabled = false;
    });
    $("#go").onclick = () => { STORE.set("grade", chosen); location.hash = "#/today"; location.reload(); };
  }

  // ═════════ 화면: 오늘 ═════════
  function screenToday() {
    const S = STORE.s, t = STORE.tier(), sk = todaySkill();
    const d = new Date();
    const dateStr = `${d.getMonth() + 1}월 ${d.getDate()}일 ${"일월화수목금토"[d.getDay()]}요일`;
    let hero = `<div class="card empty-note">이 학년에 맞는 문항을 준비하고 있어요.</div>`;
    if (sk) {
      const qs = skillPool(sk.id), m = STORE.mastery(sk.id);
      const br = BR.get(sk.갈래);
      hero = `<section class="hero" style="--gc:${gc(sk.id)}">
        <div class="kicker"><span class="pill pill-g" style="--gc:${gc(sk.id)}">${esc(br.이름)}</span> 오늘의 스킬</div>
        <div class="ring">${ring(m == null ? 0 : m, 58, gc(sk.id))}</div>
        <h2 class="title">${esc(sk.이름)}</h2>
        <!-- 스킬 그림 우선(2026-10-07) -->
        ${window.SKILLFIG && SKILLFIG.has(sk.id) ? `<div data-skfig="${sk.id}" data-max="2"></div>` : `<p class="core">${QR.inline(sk.핵심)}</p>`}
        <div class="meta"><span>문항 ${Math.min(8, qs.length)}개</span><span>약 ${Math.max(6, Math.min(8, qs.length) * 2)}분</span><span>모은 문항 ${qs.length}</span></div>
        <button class="btn btn-primary" data-drill="${sk.id}">시작하기</button>
      </section>`;
    }
    const wk = STORE.week();
    const stuck = Object.entries(S.skill).filter(([sid, k]) => SK.has(sid) && k.miss).sort((a, b) => b[1].miss - a[1].miss).slice(0, 3);
    view().innerHTML = `
      <div class="today-head"><div class="h-eyebrow">${dateStr} · ${esc(S.grade || "")}</div><h1 class="h1">오늘은 이것 하나만 해요</h1></div>
      ${hero}
      <div class="statrow">
        <div class="card tier">${tierBadge(t)}<div style="flex:1;min-width:0"><div class="name num">${t.name} ${t.div}</div>
          <div class="xpbar"><i style="width:${Math.round(t.frac * 100)}%"></i></div>
          <div class="muted tnum" style="font-size:12px;margin-top:4px">다음 단계까지 ${t.next} XP</div></div></div>
        <div class="card streak"><div class="row" style="gap:6px;font-weight:800">${I.flame}<span class="num tnum">${STORE.streak()}일 연속</span></div>
          <div class="week">${wk.map((w) => `<i class="${w.on ? "on" : ""}" ${w.today ? 'style="outline:2px solid var(--accent);outline-offset:1px"' : ""}>${w.label}</i>`).join("")}</div></div>
      </div>
      <h3 class="h2">다시 해 볼 스킬 <small>최근에 막혔던 곳</small></h3>
      <div class="stuck-list">${stuck.length ? stuck.map(([sid, k]) => { const s = SK.get(sid); return `<button class="card stuck-card" data-skill="${sid}" style="--gc:${gc(sid)}"><span class="ico num">${sid}</span><span><div class="t">${esc(s.이름)}</div><div class="s">숙련도 ${Math.round(k.m * 100)} · ${k.ok}/${k.n} 맞힘</div></span><span class="chev">›</span></button>`; }).join("")
        : `<div class="card pad16 muted" style="font-size:14px">아직 막힌 곳이 없어요. 풀다가 막히면 여기에 모아 둘게요.</div>`}</div>
      <h3 class="h2">스킬 둘러보기</h3>
      <div class="grid2">${TAX.스킬갈래.slice(0, 4).map((b) => branchMini(b)).join("")}</div>`;
    bindCommon();
  }
  function branchMini(b) {
    const ss = TAX.스킬.filter((s) => s.갈래 === b.id);
    const ms = ss.map((s) => STORE.mastery(s.id)).filter((x) => x != null);
    const avg = ms.length ? ms.reduce((a, c) => a + c, 0) / ms.length : 0;
    return `<a class="card pad16" href="#/skills" style="--gc:var(--g-${b.id});color:inherit;display:block">
      <div class="row" style="gap:8px"><span class="dot"></span><b style="font-size:14px">${esc(b.이름)}</b></div>
      <div class="muted" style="font-size:12.5px;margin:4px 0 8px;line-height:1.45">${esc(b.한줄)}</div>
      <div class="xpbar" style="height:6px"><i style="width:${Math.round(avg * 100)}%;background:var(--gc)"></i></div></a>`;
  }

  // ═════════ 화면: 스킬 지도 ═════════
  let showAll = false;
  function screenSkills() {
    const P = pool();
    const gq = P.filter((q) => q.g);
    view().innerHTML = `<div class="today-head"><div class="h-eyebrow">단원이 달라도 막히는 곳은 같아요</div><h1 class="h1">스킬 지도</h1></div>
      <button class="card stuck-card" id="graphDrill" style="--gc:var(--g-G)" ${gq.length ? "" : "disabled"}><span class="ico">∿</span><span><div class="t">그래프 해석만 모아 풀기</div><div class="s">단원 상관없이 그래프를 그리거나 읽어야 풀리는 문항 ${gq.length}개</div></span><span class="chev">›</span></button>
      ${TAX.스킬갈래.map((b) => {
        const cntOf = (sid) => P.filter((q) => (q.s || []).includes(sid)).length;
        const ss = TAX.스킬.filter((s) => s.갈래 === b.id && (showAll || cntOf(s.id) > 0));
        if (!ss.length) return "";
        return `<section class="branch" style="--gc:var(--g-${b.id})"><div class="branch-head"><span class="sw"></span><div><b>${esc(b.이름)}</b><br><span>${esc(b.한줄)}</span></div></div>
          <div class="skills">${ss.map((s) => {
            const n = P.filter((q) => (q.s || []).includes(s.id)).length, m = STORE.mastery(s.id);
            return `<button class="skill ${n ? "" : "empty"} ${m != null && m > 0.8 ? "mastered" : ""}" data-skill="${s.id}" style="--gc:var(--g-${b.id})">
              <span class="sid">${s.id}</span><span class="sn">${esc(s.이름)}</span>
              <span class="foot"><span class="bar"><i style="width:${Math.round((m || 0) * 100)}%"></i></span><span class="tnum">${n}문항</span></span></button>`;
          }).join("")}</div></section>`;
      }).join("")}
      <p style="text-align:center;margin:22px 0 0"><button class="btn btn-ghost" id="toggleAll" style="min-height:38px;font-size:13.5px">${showAll ? "내 학년 스킬만 보기" : "다른 학년 스킬도 보기"}</button></p>`;
    bindCommon();
    $("#toggleAll").onclick = () => { showAll = !showAll; screenSkills(); };
    const gd = $("#graphDrill");
    if (gd) gd.onclick = () => startSession(buildSet(gq, 8), { kind: "unit", id: "graph", title: "그래프 해석" });
  }

  // ═════════ 화면: 스킬 카드 ═════════
  function screenSkill(sid) {
    const s = SK.get(sid); if (!s) return screenSkills();
    const qs = skillPool(sid), b = BR.get(s.갈래);
    const ex = qs.filter((q) => (q.d || 3) <= 3 && q.sk && q.sk.length).sort((a, c) => (a.d || 3) - (c.d || 3))[0];
    const units = [...new Set(qs.map((q) => q.u))].filter((u) => UN.has(u)).slice(0, 6);
    view().innerHTML = `<div class="skillpage">
      <div class="solve-top"><a class="iconbtn" href="#/skills" aria-label="뒤로">${I.back}</a><span class="pill pill-g" style="--gc:${gc(sid)}">${esc(b.이름)} · ${sid}</span></div>
      <section class="card top" style="--gc:${gc(sid)}">
        <h1 class="h1">${esc(s.이름)}</h1>
        ${window.SKILLFIG && SKILLFIG.has(sid) ? `<div data-skfig="${sid}"></div>` : `<p class="quote">${QR.inline(s.핵심)}</p>`}
        <div class="h-eyebrow" style="margin-top:16px">이런 말이 보이면 떠올리기</div>
        <div class="signals">${s.신호.map((x) => `<span>${QR.inline(x)}</span>`).join("")}</div>
        ${units.length ? `<div class="h-eyebrow" style="margin-top:14px">이 스킬이 나오는 단원</div><div class="signals" style="--gc:var(--ink-3)">${units.map((u) => `<span style="background:var(--surface-2)">${esc(UN.get(u).이름)}</span>`).join("")}</div>` : ""}
        <div style="margin-top:18px" class="row"><button class="btn btn-primary" data-drill="${sid}" ${qs.length ? "" : "disabled"}>드릴 시작 · ${Math.min(8, qs.length)}문항</button><span class="muted" style="font-size:13px">모은 문항 ${qs.length}개</span></div>
      </section>
      ${ex ? `<h3 class="h2">예시로 감 잡기 <small>${esc(srcLabel(ex))}</small></h3>
      <section class="card qcard"><div class="qtext">${QR.blocks(ex.q, ex.fb)}</div>
        ${ex.ch ? `<div class="choices ${ex.ch.every((c) => typeof c === "string" && c.length < 18) ? "short5" : ""}">${ex.ch.map((c, i) => `<div class="choice"><span class="cn">${i + 1}</span><span>${Array.isArray(c) ? `<img class="choice-fig" alt="선지 그림" src="${esc((ex.fb || "") + c[1])}">` : QR.inline(c)}</span></div>`).join("")}</div>` : ""}
        <details style="margin-top:12px"><summary style="cursor:pointer;font-weight:700;color:var(--accent)">이 스킬로 푸는 흐름 보기</summary>
        <ol class="sketch qtext">${ex.sk.map((l) => `<li>${QR.inline(l)}</li>`).join("")}</ol><div class="muted" style="font-size:13px">정답 ${esc(ansLabel(ex))}</div></details></section>` : ""}
    </div>`;
    bindCommon();
  }
  function ansLabel(q) { return q.k === "choice" ? "①②③④⑤"[+q.a - 1] || q.a : q.a; }

  // ═════════ 화면: 단원 ═════════
  function screenUnits(cid) {
    const sc = scope();
    cid = cid && COURSE.has(cid) ? cid : sc[sc.length - 1];
    if (!ensureCourse(cid, () => { if (location.hash === `#/units/${cid}`) screenUnits(cid); })) return loadingView();
    const P = usable.filter((q) => q.c === cid);
    const units = TAX.단원.filter((u) => u.과정 === cid);
    view().innerHTML = `<div class="today-head"><div class="h-eyebrow">교과서 순서로 풀기</div><h1 class="h1">단원별</h1></div>
      <div class="course-tabs">${TAX.과정.map((c) => `<button aria-pressed="${c.id === cid}" data-course="${c.id}">${esc(c.이름)}</button>`).join("")}</div>
      <div class="unit-list">${units.map((u, i) => {
        const n = P.filter((q) => q.u === u.id).length, rec = STORE.s.unit[u.id];
        return `<button class="card unit" data-unit="${u.id}" ${n ? "" : 'disabled style="opacity:.5"'}><span class="no">${String(i + 1).padStart(2, "0")}</span><span><div class="nm">${esc(u.이름)}</div>${rec ? `<div class="muted" style="font-size:12px">${rec.ok}/${rec.n} 맞힘</div>` : ""}</span><span class="cnt tnum">${n}문항</span><span class="chev">›</span></button>`;
      }).join("")}</div>`;
    view().querySelectorAll("[data-course]").forEach((b) => b.onclick = () => { location.hash = `#/units/${b.dataset.course}`; });
    view().querySelectorAll("[data-unit]").forEach((b) => b.onclick = () => {
      const u = b.dataset.unit;
      startSession(buildSet(usable.filter((q) => q.u === u), 10), { kind: "unit", id: u, title: UN.get(u).이름 });
    });
  }

  // ═════════ 화면: 개념 지도 ═════════
  // 단원 → 개념(정의·성질·공식). 스킬지도가 "어디서 막히나"라면 개념지도는 "무엇을 알아야 하나".
  const CONCEPTS = (TAX.개념 || []);
  const CN = new Map(CONCEPTS.map((c) => [c.id, c]));
  const conceptPool = (cid) => usable.filter((q) => (q.cn || []).includes(cid));
  // ── 학년 밖 과정 늦게 불러오기(2026-10-07): 학년 과정 밖 탭을 고르면 그 과정 문항을 그때 싣는다. 실으면 true, 싣는 중이면 false(끝나면 redraw)
  const bankState = {};
  function ensureCourse(cid, redraw) {
    if (!(window.BANK_COURSES || {})[cid] || bankState[cid] === "done" || BANK.some((q) => q.c === cid)) return true;
    if (!bankState[cid]) {
      bankState[cid] = "loading";
      const n0 = (window.BANK || []).length;
      const add = (src, then) => { const s = document.createElement("script"); s.src = src; s.onload = then; s.onerror = then; document.head.appendChild(s); };
      add(`js/data/bank_${cid}.js`, () => add(`js/data/hs_index.js?late=${cid}`, () => {
        const fresh = (window.BANK || []).slice(n0);
        if (BANK !== window.BANK) BANK.push(...fresh);
        fresh.forEach((q) => BYID.set(q.id, q));
        usable.push(...fresh.filter((q) => QR.solvable(q)));
        bankState[cid] = "done"; redraw();
      }));
    }
    return false;
  }
  const loadingView = () => { view().innerHTML = `<p class="muted" style="padding:32px 0;font-size:15px">문항 불러오는 중</p>`; };
  function conceptMastery(cid) {
    const k = STORE.s.concept && STORE.s.concept[cid];
    return k ? k.m : null;
  }
  function screenConcepts(cid) {
    const sc = scope();
    cid = cid && COURSE.has(cid) ? cid : sc[sc.length - 1];
    if (!ensureCourse(cid, () => { if (location.hash === `#/concepts/${cid}`) screenConcepts(cid); })) return loadingView();
    const units = TAX.단원.filter((u) => u.과정 === cid);
    const P = usable.filter((q) => q.c === cid);
    view().innerHTML = `<div class="today-head"><div class="h-eyebrow">무엇을 알아야 하나 — 교과서 순서</div><h1 class="h1">개념 지도</h1></div>
      <div class="course-tabs">${TAX.과정.map((c) => `<button aria-pressed="${c.id === cid}" data-course="${c.id}">${esc(c.이름)}</button>`).join("")}</div>
      ${units.map((u, i) => {
        const cs = CONCEPTS.filter((c) => c.단원 === u.id);
        const n = P.filter((q) => q.u === u.id).length;
        return `<section class="branch concept-unit" style="--gc:var(--accent)">
          <div class="branch-head"><span class="sw"></span><div style="flex:1"><b>${String(i + 1).padStart(2, "0")} ${esc(u.이름)}</b><br><span>개념 ${cs.length}개 · 문항 ${n}개</span></div>
            ${n ? `<button class="btn btn-ghost" data-unit="${u.id}" style="min-height:36px;padding:0 12px;font-size:13px">단원 풀기</button>` : ""}</div>
          ${cs.length ? `<div class="skills">${cs.map((c) => {
            const cnt = conceptPool(c.id).length, m = conceptMastery(c.id);
            return `<button class="skill concept ${cnt ? "" : "empty"}" data-concept="${c.id}" style="--gc:var(--accent)">
              <span class="sid">${esc(c.id.split("-").pop())}</span><span class="sn">${QR.inline(c.이름)}</span>
              <span class="foot"><span class="bar"><i style="width:${Math.round((m || 0) * 100)}%"></i></span><span class="tnum">${cnt}문항</span></span></button>`;
          }).join("")}</div>` : `<p class="muted" style="font-size:13px;margin:0">개념 정리를 준비하고 있어요.</p>`}
        </section>`;
      }).join("")}`;
    view().querySelectorAll("[data-course]").forEach((b) => b.onclick = () => { location.hash = `#/concepts/${b.dataset.course}`; });
    view().querySelectorAll("[data-concept]").forEach((b) => b.onclick = () => { location.hash = `#/concept/${b.dataset.concept}`; });
    view().querySelectorAll("[data-unit]").forEach((b) => b.onclick = () => {
      const u = b.dataset.unit;
      startSession(buildSet(usable.filter((q) => q.u === u), 10), { kind: "unit", id: u, title: UN.get(u).이름 });
    });
  }
  function screenConcept(id) {
    const c = CN.get(id); if (!c) return screenConcepts();
    if (!ensureCourse(UN.get(c.단원).과정, () => { if (location.hash === `#/concept/${id}`) screenConcept(id); })) return loadingView();
    const u = UN.get(c.단원), qs = conceptPool(id);
    const pre = (c.먼저 || []).map((p) => CN.get(p)).filter(Boolean);
    const next = CONCEPTS.filter((x) => (x.먼저 || []).includes(id));
    const ex = qs.filter((q) => (q.d || 3) <= 2).sort((a, b) => (a.d || 3) - (b.d || 3))[0];
    view().innerHTML = `<div class="skillpage">
      <div class="solve-top"><a class="iconbtn" href="#/concepts/${u.과정}" aria-label="뒤로">${I.back}</a><span class="pill">${esc(COURSE.get(u.과정).이름)} · ${esc(u.이름)}</span></div>
      <section class="card top" style="--gc:var(--accent)">
        <h1 class="h1">${QR.inline(c.이름)}</h1>
        <p class="quote qtext">${QR.inline(c.핵심)}</p>
        ${(c.공식 || []).length ? `<div class="formula-list">${c.공식.map((f) => `<div class="formula qtext">${QR.inline(f)}</div>`).join("")}</div>` : ""}
        ${c.자주틀림 ? `<div class="oops"><b>자주 헷갈리는 곳</b> ${QR.inline(c.자주틀림)}</div>` : ""}
        ${(c.스킬 || []).length ? `<div class="h-eyebrow" style="margin-top:14px">이 개념을 쓸 때 필요한 스킬</div><div class="signals chips-link">${c.스킬.filter((s) => SK.has(s)).map((s) => `<a href="#/skill/${s}" style="--gc:${gc(s)}"><b>${s}</b> ${esc(SK.get(s).이름)}</a>`).join("")}</div>` : ""}
        ${pre.length ? `<div class="h-eyebrow" style="margin-top:14px">먼저 알아야 할 개념</div><div class="signals chips-link">${pre.map((p) => `<a href="#/concept/${p.id}">${QR.inline(p.이름)}</a>`).join("")}</div>` : ""}
        ${next.length ? `<div class="h-eyebrow" style="margin-top:14px">이어지는 개념</div><div class="signals chips-link">${next.slice(0, 6).map((p) => `<a href="#/concept/${p.id}">${QR.inline(p.이름)}</a>`).join("")}</div>` : ""}
        <div style="margin-top:18px" class="row"><button class="btn btn-primary" id="cdrill" ${qs.length ? "" : "disabled"}>개념 확인 · ${Math.min(8, qs.length)}문항</button><span class="muted" style="font-size:13px">모은 문항 ${qs.length}개</span></div>
      </section>
      ${ex ? `<h3 class="h2">가볍게 확인 <small>${esc(srcLabel(ex))}</small></h3><section class="card qcard"><div class="qtext">${QR.blocks(ex.q, ex.fb)}</div></section>` : ""}
    </div>`;
    const b = $("#cdrill");
    if (b) b.onclick = () => startSession(buildSet(qs, 8), { kind: "concept", id, title: c.이름.replace(/\$/g, "") });
  }

  // ═════════ 화면: 기출(교육청·평가원) ═════════
  function screenExams(arg) {
    const all = pool().filter((q) => q.lv);
    const src = ["교육청", "평가원", "내신"].includes(decodeURIComponent(arg || "")) ? decodeURIComponent(arg) : "전체";
    const qs = all.filter((q) => src === "전체" || q.ex === src);
    const byLv = [1, 2, 3, 4].map((lv) => qs.filter((q) => q.lv === lv));
    const rate = (arr) => { const t = arr.filter((q) => STORE.seen(q.id)); return t.length ? Math.round(100 * t.filter((q) => STORE.lastOk(q.id)).length / t.length) : null; };
    const exams = new Map();
    qs.forEach((q) => { if (!exams.has(q.xm)) exams.set(q.xm, []); exams.get(q.xm).push(q); });
    const examTitle = (arr) => arr[0].ex === "내신" ? `${arr[0].c === "M2" ? "중2" : "중3"} 학교 내신 · ${(UN.get(arr[0].u) || {}).이름 || arr[0].u}` : arr[0].src.replace(/\s*\d+번$/, "");
    const rows = [...exams.entries()].filter(([, arr]) => arr.length >= 5).sort((a, b) => (a[1][0].ex === "내신") - (b[1][0].ex === "내신") || (a[1][0].ex === "내신" ? a[0].localeCompare(b[0]) : b[0].slice(3).localeCompare(a[0].slice(3)) || b[0].localeCompare(a[0])));
    const nSteps = qs.filter((q) => q.hs).length;
    view().innerHTML = `<div class="today-head"><div class="h-eyebrow">교육청 · 평가원 · 학교 내신</div><h1 class="h1">기출</h1>
        <p class="muted" style="margin:6px 0 0">막히면 단계 풀이로 어디까지 왔는지 맞춰 봐요 · 단계 풀이 ${nSteps.toLocaleString()}문항</p></div>
      <div class="seg exam-src">${["전체", "교육청", "평가원", "내신"].filter((s) => s === "전체" || all.some((q) => q.ex === s)).map((s) => `<a href="#/exams/${s === "전체" ? "" : encodeURIComponent(s)}" aria-pressed="${src === s}">${s}</a>`).join("")}</div>
      <div class="lv-grid">${[1, 2, 3, 4].map((lv, i) => { const arr = byLv[i], r = rate(arr); return `<button class="card lv-card lv${lv}" data-lv="${lv}" ${arr.length ? "" : "disabled"}>
          <div class="lv-top">${lvPill(lv, true)}<span class="tnum muted">${arr.length}문항</span></div>
          <b class="lv-name">${LV[lv][1]}</b>
          <span class="lv-sub">${r == null ? "아직 안 풀었어요" : `맞힌 비율 <b class="tnum">${r}%</b>`}</span>
          <span class="lv-go">8문항 풀기 →</span></button>`; }).join("")}</div>
      <h3 class="h2">회차별 <small>${rows.length}회차</small></h3>
      <section class="card exam-list">${rows.length ? rows.map(([xm, arr]) => { const st = arr.filter((q) => q.hs).length; return `<button class="exam-row" data-xm="${esc(xm)}">
          <span class="exam-t"><b>${esc(examTitle(arr))}</b><span class="lvdots">${[1, 2, 3, 4].map((lv) => `<i class="lv${lv}" style="flex:${arr.filter((q) => q.lv === lv).length}"></i>`).join("")}</span></span>
          <span class="exam-n tnum muted">${arr.length}문항${st ? ` · 단계 풀이 ${st}` : ""}</span></button>`; }).join("") : `<div class="muted" style="padding:14px">이 학년 범위의 기출이 아직 없어요.</div>`}</section>`;
    view().querySelectorAll("[data-lv]").forEach((b) => b.onclick = () => {
      const lv = +b.dataset.lv, arr = byLv[lv - 1];
      const withSteps = arr.filter((q) => q.hs);
      const ids = buildSet(withSteps.length >= 8 ? withSteps : arr, 8);
      startSession(ids, { kind: "exam", title: `기출 ${LV[lv][1]}` });
    });
    view().querySelectorAll("[data-xm]").forEach((b) => b.onclick = () => {
      const arr = exams.get(b.dataset.xm).slice().sort((a, b2) => a.id.localeCompare(b2.id));
      startSession(arr.map((q) => q.id), { kind: "exam", title: examTitle(arr) });
    });
  }

  // ═════════ 풀이 세션 ═════════
  let SESSION = null;
  function startSession(ids, meta) {
    if (!ids.length) { toast("아직 문항이 없어요"); return; }
    SESSION = { ids, i: 0, res: ids.map(() => null), meta, t0: Date.now() };
    location.hash = "#/solve";
  }
  function screenSolve() {
    if (!SESSION) { location.hash = "#/today"; return; }
    const q = BYID.get(SESSION.ids[SESSION.i]);
    const wide = window.innerWidth >= 1000;
    const st = { choice: null, conf: null, tries: 0, t0: Date.now(), mode: "hand", keyed: "" };
    const title = SESSION.meta.kind === "skill" ? `${SESSION.meta.id} ${SK.get(SESSION.meta.id).이름}` : SESSION.meta.title;
    view().innerHTML = `<div class="solve">
      <div class="solve-top"><a class="iconbtn" href="#/today" aria-label="나가기">${I.back}</a>
        <div class="progress-dots">${SESSION.ids.map((_, k) => `<i class="${k === SESSION.i ? "cur" : SESSION.res[k] === true ? "done" : SESSION.res[k] === false ? "miss" : ""}"></i>`).join("")}</div>
        <span class="muted tnum" style="font-size:13px;font-weight:700">${SESSION.i + 1}/${SESSION.ids.length}</span></div>
      <div class="solve-body ${wide ? "wide" : ""}">
        <div style="display:grid;gap:14px;align-content:start">
          <section class="card qcard" style="--gc:${gc(q.s && q.s[0])}">
            <div class="qmeta"><span class="pill">${esc(title)}</span>${q.lv ? lvPill(q.lv) : "★".repeat(Math.max(1, Math.min(5, q.d || 3))).replace(/★/g, '<span style="color:var(--gold)">★</span>')}<span class="qsrc">${esc(srcLabel(q))}</span></div>
            <div class="qtext">${QR.blocks(q.q, q.fb)}</div>
            ${q.k === "choice" ? `<div class="choices ${q.ch.every((c) => typeof c === "string" && c.replace(/\$[^$]*\$/g, "xx").length < 14) ? "short5" : ""}">${q.ch.map((c, k) => `<button class="choice" data-c="${k + 1}" aria-pressed="false"><span class="cn">${k + 1}</span><span>${Array.isArray(c) ? `<img class="choice-fig" alt="선지 그림" src="${esc((q.fb || "") + c[1])}">` : QR.inline(c)}</span></button>`).join("")}</div>` : ""}
          </section>
          <div id="coach"></div>
          ${STEPUI.has(q) ? `<div class="helprow"><button class="btn btn-ghost stuck-btn" id="stuckBtn"><span class="st-q">?</span> 막혔어요 · 어디까지 왔는지 보기</button><button class="btn btn-ghost dk-btn" id="dkBtn">시작 힌트</button></div><div id="stepsHost"></div>` : ""}
          ${q.k === "short" ? (HWR.gradable(q.a) ? answerBox() : selfBox()) : ""}
          <div id="confwrap" hidden><div class="confidence"><button class="btn btn-primary" data-conf="sure">확실해요<small>이렇게 풀면 맞아요</small></button><button class="btn btn-ghost" data-conf="unsure">긴가민가<small>찍은 것 포함</small></button></div></div>
          <div id="verdict"></div>
        </div>
        <div class="card padwrap">
          <div class="padbar">
            <button class="tool" data-tool="pen" aria-pressed="true" aria-label="펜">${I.pen}</button>
            <button class="tool" data-tool="hl" aria-pressed="false" aria-label="형광펜">${I.hl}</button>
            <button class="tool" data-tool="eraser" aria-pressed="false" aria-label="지우개">${I.eraser}</button>
            <span class="sep"></span>
            <button class="tool" data-act="undo" aria-label="되돌리기">${I.undo}</button>
            <button class="tool" data-act="redo" aria-label="다시">${I.redo}</button>
            <button class="tool" data-act="clear" aria-label="모두 지우기">${I.trash}</button>
            <button class="tool" data-act="axes" aria-pressed="${q.g ? "true" : "false"}" aria-label="좌표축 깔기" title="좌표축 깔기 — 그래프를 그려 보며 풀기"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M4 20h17M4 20V3M4 20l14-14"/></svg></button>
            <span class="lbl">풀이 공간 · 휘갈기면 지워져요${STEPUI.has(q) ? "" : " · 이 문항은 아직 풀이를 읽지 않아요"}</span>
            <button class="tool" data-act="read" aria-label="풀이 글자로 옮기기" title="풀이를 활자로 옮기기(설정에서 인식 키 필요)" style="width:auto;padding:0 10px;font-size:12.5px;font-weight:800">식 읽기</button>
          </div>
          <div class="pad ${q.g ? "axes" : ""}" id="pad"><svg class="axes-layer" aria-hidden="true"><line x1="0" y1="50%" x2="100%" y2="50%"/><line x1="50%" y1="0" x2="50%" y2="100%"/><text x="100%" dx="-14" y="50%" dy="-6">x</text><text x="50%" dx="6" y="16">y</text><text x="50%" dx="-13" y="50%" dy="15">O</text></svg></div>
          <div id="padread" class="qtext" style="padding:0 14px"></div>
        </div>
      </div></div>`;

    const ink = new Ink($("#pad"), { penOnly: STORE.s.penOnly ? "auto" : false });
    window.__ink = ink;
    // ── 코칭(2026-09-29, coach.js·observe.js): 풀이판 관찰 → 먼저 말 걸기 · 오답 진단 · 사다리 · 왜?
    if (window.__obs) { window.__obs.stop(); window.__obs = null; }
    if (window.__coachStop) window.__coachStop();
    const coachHost = $("#coach");
    let stopIdle = () => {}, obs = null;
    const openSteps = (start) => {
      stopIdle();
      st.opened = true;
      ["#stuckBtn", "#dkBtn"].forEach((s) => { const b = $(s); if (b) b.hidden = true; });
      if (!STEPUI.has(q)) return;
      if (st.stepSess) { $("#stepsHost").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      const s0 = start < 0 ? (obs ? obs.next() : 0) : start;
      STEPUI.open($("#stepsHost"), q, "check", {
        start: s0, reached: obs ? obs.reached : [], ladder: COACH.ladder(q),
        insight: (i) => COACH.stepCards(q, i), onInsight: (i) => COACH.log({ e: "그림열기", q: q.id, 단계: i + 1 }),
        onStuck: (i, stp) => { st.stuck = { i, sid: stp.스킬 }; STORE.stuck(q, i, stp.스킬); },
        onRung: (i, n) => { st.rungs = (st.rungs || 0) + 1; COACH.log({ e: "사다리", q: q.id, 단계: i + 1, n }); },
      }).then((s) => { st.stepSess = s; $("#stepsHost").scrollIntoView({ behavior: "smooth", block: "start" }); });
    };
    const act = {
      pool: () => pool(),
      next: (qid, meta) => { startSession([qid], { kind: "coach", title: "같은 고비 문항", from: meta && meta.from }); route(); window.scrollTo(0, 0); },
      openSteps,
      reach: (k) => { if (st.stepSess && st.stepSess.reach) st.stepSess.reach(k); },
    };
    if (STEPUI.has(q) && window.OBSERVE) obs = window.__obs = OBSERVE.attach({ q, ink, pad: $("#pad"), host: coachHost, act, onInk: () => stopIdle.poke && stopIdle.poke() });
    COACH.load(q).then(() => { if (!st.done && coachHost.isConnected) { stopIdle = COACH.watchIdle(coachHost, q, act); window.__coachStop = () => stopIdle(); } });
    st.coach = { host: coachHost, act, stopIdle: () => stopIdle() };
    view().querySelectorAll("[data-tool]").forEach((b) => b.onclick = () => { ink.setTool(b.dataset.tool); view().querySelectorAll("[data-tool]").forEach((x) => x.setAttribute("aria-pressed", x === b)); });
    view().querySelectorAll("[data-act]").forEach((b) => b.onclick = () => ({ undo: () => ink.undo(), redo: () => ink.redoOne(), clear: () => ink.clear(), read: () => readPad(ink), axes: () => { const on = $("#pad").classList.toggle("axes"); view().querySelector('[data-act="axes"]').setAttribute("aria-pressed", on); } })[b.dataset.act]());

    const showConf = (on) => { $("#confwrap").hidden = !on; };
    if (q.k === "choice") {
      const multi = String(q.a).includes(",");
      if (multi) $(".qmeta").insertAdjacentHTML("beforeend", `<span class="pill" style="background:var(--accent-soft);color:var(--accent)">정답 ${String(q.a).split(",").length}개 고르기</span>`);
      view().querySelectorAll("[data-c]").forEach((b) => b.onclick = () => {
        if (st.done) return;
        if (multi) {
          b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true");
          const on = [...view().querySelectorAll('[data-c][aria-pressed="true"]')].map((x) => x.dataset.c);
          st.choice = on.length ? on.sort().join(",") : null;
          showConf(on.length === String(q.a).split(",").length);
          return;
        }
        st.choice = b.dataset.c;
        view().querySelectorAll("[data-c]").forEach((x) => x.setAttribute("aria-pressed", x === b));
        showConf(true);
      });
    } else if (HWR.gradable(q.a)) {
      setupAnswer(st, showConf);
    } else {
      setupSelf(q, st);
    }
    view().querySelectorAll("[data-conf]").forEach((b) => b.onclick = () => submit(q, st, b.dataset.conf, ink));
    const sb = $("#stuckBtn");
    if (sb) sb.onclick = () => openSteps(-1);
    const dkb = $("#dkBtn");
    if (dkb) dkb.onclick = () => { stopIdle(); COACH.dontKnow(coachHost, q, act); };
    // 시연·스크린샷용: ?st=check(막혔어요 패널) · ?st=read(단계 풀이 전체)
    const stq = new URLSearchParams(location.search).get("st");
    if (sb && stq === "check") sb.click();
    if (sb && stq === "read") { sb.hidden = true; STEPUI.open($("#stepsHost"), q, "read"); }
  }

  // 교육청·평가원 기출 4단계(대표님 지시 2026-09-23) — 2점은 싣지 않는다
  const LV = { 1: ["기본 3점", "기본 3점"], 2: ["3점+ · 쉬운 4점", "어려운 3점 · 쉬운 4점"], 3: ["4점", "4점 · 준킬러"], 4: ["킬러", "킬러 문항"] };
  function lvPill(lv, short) { return `<span class="pill lvpill lv${lv}" title="${LV[lv][1]}"><i></i><i></i><i></i><i></i>${short ? lv + "단계" : LV[lv][0]}</span>`; }

  // 식·부등식처럼 수 하나로 채점이 안 되는 답 — 풀이를 쓰고 정답과 비교해 스스로 표시
  function selfBox() {
    return `<section class="card answer" id="selfbox"><div class="answer-head">풀이판에 풀고 정답과 맞춰 봐요</div>
      <button class="btn btn-ghost btn-block" id="reveal">정답 확인하기</button><div id="selfres"></div></section>`;
  }
  function setupSelf(q, st) {
    $("#reveal").onclick = () => {
      $("#reveal").hidden = true;
      $("#selfres").innerHTML = `<div class="qtext" style="font-size:18px;margin:6px 0 10px">정답 ${QR.inline(/\$/.test(q.a) ? q.a : "$" + q.a + "$")}</div>
        <div class="confidence"><button class="btn btn-primary" data-self="1">맞혔어요</button><button class="btn btn-ghost" data-self="0">달랐어요</button></div>`;
      view().querySelectorAll("[data-self]").forEach((b) => b.onclick = () => {
        st.tries = 1; st.selfOk = b.dataset.self === "1";
        $("#selfbox").hidden = true;
        submit(q, st, st.selfOk ? "sure" : "unsure", null, true);
      });
    };
  }

  function readPad(ink) {
    const out = $("#padread");
    if (!MATHINK.enabled) { out.innerHTML = `<p class="muted" style="font-size:13px;padding:10px 0">풀이 전체를 활자로 옮기려면 설정 › 풀이 인식에서 Mathpix 키를 넣어 주세요. 답 채점은 키 없이도 돼요.</p>`; return; }
    out.innerHTML = `<p class="muted" style="font-size:13px;padding:10px 0">읽는 중…</p>`;
    MATHINK.recognize(ink.strokes).then((tex) => { out.innerHTML = `<div style="padding:10px 0;overflow-x:auto">${QR.tex(tex)}</div>`; })
      .catch((e) => { out.innerHTML = `<p class="muted" style="font-size:13px;padding:10px 0">${e.message === "EMPTY" ? "펜으로 쓴 풀이가 없어요" : "읽지 못했어요 (" + esc(e.message) + ")"}</p>`; });
  }

  function answerBox() {
    return `<section class="card answer">
      <div class="answer-head">답 쓰기 <span class="mode"><button data-mode="hand" aria-pressed="true">손글씨</button><button data-mode="key" aria-pressed="false">키패드</button></span></div>
      <div id="handArea"><div class="hwr-strip" id="strip"><div class="ph">여기에 답을 손으로 써요 · 분수는 가로선 위아래로</div></div>
        <div class="hwr-read" id="read"><span class="lab">아직 안 읽었어요</span></div>
        <div class="row" style="margin-top:6px"><button class="btn btn-ghost" id="stripClear" style="min-height:36px;padding:0 12px;font-size:13px">지우기</button><span class="muted" style="font-size:12px">점선 글자를 누르면 다른 글자로 고칠 수 있어요</span></div></div>
      <div id="keyArea" hidden><div class="keyshow tnum" id="keyshow">&nbsp;</div>
        <div class="keypad">${["7", "8", "9", "-", "/", "⌫", "4", "5", "6", ".", "√", "C", "1", "2", "3", "0"].map((k) => `<button data-k="${k}">${k}</button>`).join("")}</div></div>
    </section>`;
  }
  function setupAnswer(st, showConf) {
    const strip = $("#strip"), read = $("#read");
    let timer = null;
    const ink = new Ink(strip, { width: 3.2, penOnly: false, onChange: (k) => {
      strip.querySelector(".ph").hidden = k.strokes.length > 0;
      clearTimeout(timer);
      timer = setTimeout(() => doRead(k), 450);
    } });
    const doRead = (k) => {
      if (!k.strokes.length) { read.innerHTML = `<span class="lab">아직 안 읽었어요</span>`; st.hand = ""; showConf(false); return; }
      HWR.load().then(() => {
        const r = HWR.recognize(k.strokes, k.h);
        st.hand = r.text; st.glyphs = r.glyphs;
        paintRead(r);
        showConf(!!r.text);
      });
    };
    const paintRead = (r) => {
      const shown = r.frac ? `${r.frac.sign || ""}\frac{${r.frac.num.map((g) => g.ch).join("")}}{${r.frac.den.map((g) => g.ch).join("")}}` : r.text;
      read.innerHTML = `<span class="lab">이렇게 읽었어요</span><span class="glyphs">${r.glyphs.map((g, i) => `<button class="glyph ${g.p < 0.8 ? "low" : ""}" data-gi="${i}">${esc(g.ch)}</button>`).join("")}</span><span class="read-tex">= ${QR.tex(shown)}</span>`;
      read.querySelectorAll("[data-gi]").forEach((b) => b.onclick = (e) => {
        const g = r.glyphs[+b.dataset.gi];
        if (b.querySelector(".alts")) { b.querySelector(".alts").remove(); return; }
        const alts = [...new Set([...(g.alts || []), "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "-"])].slice(0, 6);
        b.insertAdjacentHTML("beforeend", `<span class="alts">${alts.map((a) => `<button data-alt="${a}">${a}</button>`).join("")}</span>`);
        b.querySelectorAll("[data-alt]").forEach((x) => x.onclick = (ev) => { ev.stopPropagation(); g.ch = x.dataset.alt; g.p = 1; r.text = r.frac ? r.text : r.glyphs.map((y) => y.ch).join(""); if (r.frac) r.text = r.glyphs.map((y) => y.ch).join(""); st.hand = r.text; paintRead(r); });
      });
    };
    $("#stripClear").onclick = () => ink.clear();
    view().querySelectorAll("[data-mode]").forEach((b) => b.onclick = () => {
      st.mode = b.dataset.mode;
      view().querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      $("#handArea").hidden = st.mode !== "hand"; $("#keyArea").hidden = st.mode !== "key";
      showConf(st.mode === "hand" ? !!st.hand : !!st.keyed);
    });
    view().querySelectorAll("[data-k]").forEach((b) => b.onclick = () => {
      const k = b.dataset.k;
      if (k === "⌫") st.keyed = st.keyed.slice(0, -1); else if (k === "C") st.keyed = ""; else st.keyed += k;
      $("#keyshow").textContent = st.keyed || " ";
      showConf(!!st.keyed);
    });
    HWR.load();
  }

  function submit(q, st, conf, ink, self) {
    if (st.done) return;
    const user = self ? (st.selfOk ? q.a : "") : q.k === "choice" ? st.choice : (st.mode === "hand" ? st.hand : st.keyed);
    if (!user && !self) return;
    const normC = (x) => String(x).split(",").map((t) => t.trim()).sort().join(",");
    const ok = self ? st.selfOk : q.k === "choice" ? normC(user) === normC(q.a) : HWR.sameAnswer(user, q.a);
    if (self) st.tries = ok ? 1 : 2; else st.tries++;
    const V = $("#verdict");
    const sk = q.s && q.s[0] ? SK.get(q.s[0]) : null;
    if (ok || st.tries >= 2) {
      st.done = true;
      let gain = STORE.record(q, ok && st.tries === 1, conf, Date.now() - st.t0);
      if (ok && st.tries > 1) { gain = 5; STORE.s.xp += 5; STORE.save(); }
      SESSION.res[SESSION.i] = ok && st.tries === 1;
      if (q.k === "choice") {
        const keys = normC(q.a).split(","), picks = String(user || "").split(",");
        view().querySelectorAll("[data-c]").forEach((b) => { if (keys.includes(b.dataset.c)) b.classList.add("is-correct"); else if (picks.includes(b.dataset.c)) b.classList.add("is-wrong"); });
      }
      $("#confwrap").hidden = true;
      V.innerHTML = `<section class="verdict ${ok ? "ok" : "no"}" style="--gc:${gc(q.s && q.s[0])}">
        <div class="row"><span class="big">${ok ? (st.tries === 1 ? "정답!" : "두 번째에 해냈어요") : "풀이를 보고 다음에 다시 만나요"}</span>${gain ? `<span class="xp-float" style="margin-left:auto">+${gain} XP</span>` : ""}</div>
        ${!ok ? `<div class="hint">정답은 <b>${q.k === "choice" ? String(q.a).split(",").map((k) => "①②③④⑤"[+k - 1] + " " + (typeof q.ch[+k - 1] === "string" ? QR.inline(q.ch[+k - 1]) : "")).join(" · ") : QR.inline(/\$/.test(q.a) ? q.a : "$" + q.a + "$")}</b></div>` : ""}
        ${sk ? `<div class="hint"><b>${sk.id} ${esc(sk.이름)}</b> — ${QR.inline(q.st || sk.핵심)}</div>` : ""}
        ${st.stuck && st.stuck.sid && SK.has(st.stuck.sid) ? `<div class="hint stuck-note">${st.stuck.i + 1}단계에서 막혔어요 — <b>${st.stuck.sid} ${esc(SK.get(st.stuck.sid).이름)}</b> <button class="btn btn-ghost st-mini" data-drill="${st.stuck.sid}">이 스킬 드릴</button></div>` : ""}
        ${STEPUI.has(q) ? `<button class="btn btn-ghost btn-block" id="readSteps">단계 풀이 보기</button>` : q.sk && q.sk.length ? `<ol class="sketch qtext">${q.sk.map((l) => `<li>${QR.inline(l)}</li>`).join("")}</ol>` : ""}
        ${q.sol && q.sol.length ? `<details><summary style="cursor:pointer;font-weight:700;color:var(--accent)">해설 전체 보기</summary><div class="qtext" style="margin-top:6px">${QR.blocks(q.sol, q.fb)}</div></details>` : ""}
        <button class="btn btn-primary btn-block" id="next">${SESSION.i + 1 < SESSION.ids.length ? "다음 문항" : "결과 보기"}</button>
      </section>`;
      $("#next").onclick = () => { if (SESSION.i + 1 < SESSION.ids.length) { SESSION.i++; screenSolve(); window.scrollTo(0, 0); } else screenResult(); };
      const rs = $("#readSteps");
      if (rs) rs.onclick = () => { rs.hidden = true; const sb = $("#stuckBtn"); if (sb) sb.hidden = true; STEPUI.open($("#stepsHost"), q, "read").then(() => $("#stepsHost").scrollIntoView({ behavior: "smooth", block: "start" })); };
      V.querySelectorAll("[data-drill]").forEach((b) => b.onclick = () => { const sid = b.dataset.drill; startSession(buildSet(skillPool(sid), 8), { kind: "skill", id: sid, title: SK.get(sid).이름 }); route(); });
      if (st.coach) {
        st.coach.stopIdle();
        if (SESSION.meta.from) COACH.log({ e: "다음문항", q: q.id, from: SESSION.meta.from, ok: ok && st.tries === 1 && !st.opened && !st.rungs });
        if (ok) COACH.onCorrect(st.coach.host, q, st.coach.act, st.tries === 1); else st.coach.host.innerHTML = "";
      }
      V.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      // 첫 오답: 답은 안 보여 주고 막힘 포인트만 — 재도전
      if (q.k === "choice") view().querySelectorAll("[data-c]").forEach((b) => { if (String(user).split(",").includes(b.dataset.c)) { b.classList.add("is-wrong"); setTimeout(() => b.classList.remove("is-wrong"), 500); } });
      $("#confwrap").hidden = true;
      V.innerHTML = `<section class="verdict no" style="--gc:${gc(q.s && q.s[0])}">
        <span class="big">한 번 더 가 봐요</span>
        ${sk ? `<div class="hint">힌트 · <b>${esc(sk.이름)}</b><br>${QR.inline(q.st || sk.핵심)}</div>` : `<div class="hint">조건을 하나씩 다시 읽어 봐요.</div>`}
        <div class="muted" style="font-size:13px">다시 고르고 제출하면 돼요. 두 번째에는 풀이를 보여 드려요.</div></section>`;
      if (q.k === "choice") { st.choice = null; view().querySelectorAll("[data-c]").forEach((x) => x.setAttribute("aria-pressed", "false")); }
      if (st.coach) { st.coach.stopIdle(); if (COACH.onWrong(st.coach.host, q, user, st.coach.act)) st.coach.host.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    }
  }

  function screenResult() {
    const n = SESSION.res.filter((x) => x === true).length, N = SESSION.ids.length;
    const skills = [...new Set(SESSION.ids.flatMap((id) => (BYID.get(id).s || []).slice(0, 1)))];
    view().innerHTML = `<div class="solve"><div class="today-head" style="margin-top:20px"><div class="h-eyebrow">${esc(SESSION.meta.title || "")}</div>
      <h1 class="h1">${N}문항 중 ${n}문항 한 번에 맞혔어요</h1></div>
      <section class="card pad16"><div class="mastery">${skills.map((sid) => { const m = STORE.mastery(sid) || 0; return `<div class="mrow" style="--gc:${gc(sid)}"><b class="num">${sid}</b><div><div style="font-size:13px;margin-bottom:4px">${esc(SK.get(sid).이름)}</div><div class="bar"><i style="width:${Math.round(m * 100)}%"></i></div></div><span class="tnum muted">숙련 ${Math.round(m * 100)}</span></div>`; }).join("")}</div></section>
      <div class="grid2" style="margin-top:14px"><a class="btn btn-ghost" href="#/today">오늘로</a><button class="btn btn-primary" id="again">틀린 것 다시</button></div></div>`;
    $("#again").onclick = () => {
      const wrong = SESSION.ids.filter((id, k) => SESSION.res[k] !== true);
      if (!wrong.length) { toast("다 맞혔어요!"); return; }
      startSession(wrong, SESSION.meta); route();
    };
  }

  // ═════════ 화면: 기록 ═════════
  function screenRecords() {
    const S = STORE.s;
    const tried = Object.entries(S.skill).filter(([sid]) => SK.has(sid));
    const total = Object.values(S.att).reduce((a, x) => a + x.length, 0);
    const okc = Object.values(S.att).reduce((a, x) => a + x.filter((y) => y[1]).length, 0);
    const weak = tried.slice().sort((a, b) => a[1].m - b[1].m).slice(0, 5);
    view().innerHTML = `<div class="today-head"><div class="h-eyebrow">이 기기에 저장돼요</div><h1 class="h1">기록</h1></div>
      <div class="grid2"><div class="card pad16"><div class="muted" style="font-size:12.5px">푼 문항</div><div class="h1 tnum num">${total}</div></div>
      <div class="card pad16"><div class="muted" style="font-size:12.5px">맞힌 비율</div><div class="h1 tnum num">${total ? Math.round((okc / total) * 100) : 0}%</div></div></div>
      <h3 class="h2">먼저 채울 스킬</h3>
      <section class="card pad16">${weak.length ? `<div class="mastery">${weak.map(([sid, k]) => `<div class="mrow" style="--gc:${gc(sid)}"><b class="num">${sid}</b><div><div style="font-size:13px;margin-bottom:4px">${esc(SK.get(sid).이름)}</div><div class="bar"><i style="width:${Math.round(k.m * 100)}%"></i></div></div><button class="btn btn-ghost" style="min-height:34px;padding:0 10px;font-size:12.5px" data-drill="${sid}">드릴</button></div>`).join("")}</div>` : `<div class="muted">문항을 풀면 스킬별 숙련도가 쌓여요.</div>`}</section>
      ${(() => { const c = {}; (S.stuck || []).forEach(([, , , sid]) => { if (sid && SK.has(sid)) c[sid] = (c[sid] || 0) + 1; }); const top = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5);
        return top.length ? `<h3 class="h2">단계 풀이에서 막힌 곳 <small>처음 열어 본 단계의 스킬</small></h3><section class="card pad16"><div class="mastery">${top.map(([sid, n]) => `<div class="mrow m4" style="--gc:${gc(sid)}"><b class="num">${sid}</b><div style="font-size:13px">${esc(SK.get(sid).이름)}</div><span class="tnum muted">${n}번</span><button class="btn btn-ghost" style="min-height:34px;padding:0 10px;font-size:12.5px" data-drill="${sid}">드릴</button></div>`).join("")}</div></section>` : ""; })()}
      <h3 class="h2">갈래별</h3>
      <section class="card pad16"><div class="mastery">${TAX.스킬갈래.map((b) => { const ms = TAX.스킬.filter((s) => s.갈래 === b.id).map((s) => STORE.mastery(s.id)).filter((x) => x != null); const avg = ms.length ? ms.reduce((a, c) => a + c, 0) / ms.length : 0; return `<div class="mrow" style="--gc:var(--g-${b.id})"><b class="num">${b.id}</b><div><div style="font-size:13px;margin-bottom:4px">${esc(b.이름)}</div><div class="bar"><i style="width:${Math.round(avg * 100)}%"></i></div></div><span class="tnum muted">${ms.length}/${TAX.스킬.filter((s) => s.갈래 === b.id).length}</span></div>`; }).join("")}</div></section>`;
    bindCommon();
  }

  // ═════════ 화면: 설정 ═════════
  function screenSettings() {
    const S = STORE.s;
    view().innerHTML = `<div class="today-head"><div class="h-eyebrow">내게 맞게</div><h1 class="h1">설정</h1></div>
      <h3 class="h2">디자인 <small>세 가지 중 골라 보세요</small></h3>
      <div class="skins">${[["note", "모눈 노트", "차분한 종이"], ["arcade", "나이트 아케이드", "밤 11시 게임"], ["pop", "스티커 팝", "밝고 통통"]].map(([k, n, d]) => `<button class="skinopt" data-skinopt="${k}" aria-pressed="${S.skin === k}"><div class="sv sv-${k}"></div><b>${n}</b><span>${d}</span></button>`).join("")}</div>
      <section class="card" style="margin-top:14px">
        <div class="setting"><div class="l"><b>학년</b><span>권하는 스킬과 문항 범위가 바뀌어요</span></div><div class="seg">${["중2", "중3", "고1", "고2"].map((g) => `<button data-grade="${g}" aria-pressed="${S.grade === g}">${g}</button>`).join("")}</div></div>
        <div class="setting"><div class="l"><b>화면 밝기</b><span>나이트 아케이드는 늘 어두워요</span></div><div class="seg">${[["system", "자동"], ["light", "밝게"], ["dark", "어둡게"]].map(([k, n]) => `<button data-theme="${k}" aria-pressed="${S.theme === k}">${n}</button>`).join("")}</div></div>
        <div class="setting"><div class="l"><b>펜으로만 그리기</b><span>펜이 닿으면 손바닥 터치는 무시해요</span></div><div class="seg"><button data-pen="1" aria-pressed="${!!S.penOnly}">켜기</button><button data-pen="0" aria-pressed="${!S.penOnly}">끄기</button></div></div>
      </section>
      <h3 class="h2">손글씨 인식 연습 <small>숫자를 써 보세요</small></h3>
      <section class="card answer"><div class="hwr-strip" id="strip"><div class="ph">여기에 숫자·분수를 써 보세요</div></div><div class="hwr-read" id="read"><span class="lab">아직 안 읽었어요</span></div>
        <div class="row" style="margin-top:6px"><button class="btn btn-ghost" id="stripClear" style="min-height:36px;padding:0 12px;font-size:13px">지우기</button><span class="muted" id="modelInfo" style="font-size:12px"></span></div></section>
      <h3 class="h2">풀이 인식 <small>선택 · 풀이판 글씨를 활자로</small></h3>
      <section class="card pad16"><p class="muted" style="font-size:13px;margin:0 0 10px">답 채점은 이 기기 안에서 바로 돼요. 풀이 전체를 수식으로 옮기려면 Mathpix 키를 넣어요(키는 이 기기에만 저장).</p>
        <div class="grid2"><input id="mpid" placeholder="app_id" style="min-height:42px;border-radius:10px;border:1.5px solid var(--line);padding:0 10px;background:var(--surface);color:var(--ink)" value="${esc((MATHINK.get() || {}).app_id || "")}">
        <input id="mpkey" placeholder="app_key" type="password" style="min-height:42px;border-radius:10px;border:1.5px solid var(--line);padding:0 10px;background:var(--surface);color:var(--ink)" value="${esc((MATHINK.get() || {}).app_key || "")}"></div>
        <div class="row" style="margin-top:10px"><button class="btn btn-ghost" id="mpsave" style="min-height:38px">저장</button><span class="muted" style="font-size:12px">${MATHINK.enabled ? "켜져 있어요" : "꺼져 있어요"}</span></div></section>
      <section class="card" style="margin-top:14px"><div class="setting"><div class="l"><b>기록 지우기</b><span>이 기기에 저장된 풀이 기록을 모두 지워요</span></div><button class="btn btn-ghost" id="reset" style="min-height:38px">지우기</button></div></section>
      <p class="muted" style="font-size:12px;margin-top:18px">문항 ${BANK.length.toLocaleString()}개 · 풀 수 있는 문항 ${usable.length.toLocaleString()}개 · 스킬 ${TAX.스킬.length}개</p>`;
    view().querySelectorAll("[data-skinopt]").forEach((b) => b.onclick = () => { STORE.set("skin", b.dataset.skinopt); applySkin(); screenSettings(); });
    view().querySelectorAll("[data-grade]").forEach((b) => b.onclick = () => { STORE.set("grade", b.dataset.grade); STORE.s.todayPick = null; STORE.save(); location.reload(); });
    view().querySelectorAll("[data-theme]").forEach((b) => b.onclick = () => { STORE.set("theme", b.dataset.theme); applySkin(); screenSettings(); });
    view().querySelectorAll("[data-pen]").forEach((b) => b.onclick = () => { STORE.set("penOnly", b.dataset.pen === "1"); screenSettings(); });
    $("#mpsave").onclick = () => { const id = $("#mpid").value.trim(), key = $("#mpkey").value.trim(); MATHINK.set(id && key ? { app_id: id, app_key: key } : null); toast(id && key ? "저장했어요" : "지웠어요"); screenSettings(); };
    $("#reset").onclick = () => { if (confirm("풀이 기록을 모두 지울까요?")) { STORE.reset(); toast("지웠어요"); screenSettings(); } };
    // 인식 연습
    const st = {}; const read = $("#read"), strip = $("#strip");
    let timer;
    const ink = new Ink(strip, { width: 3.2, penOnly: false, onChange: (k) => { strip.querySelector(".ph").hidden = k.strokes.length > 0; clearTimeout(timer); timer = setTimeout(() => {
      if (!k.strokes.length) { read.innerHTML = `<span class="lab">아직 안 읽었어요</span>`; return; }
      HWR.load().then(() => { const r = HWR.recognize(k.strokes, k.h); window.__lastRead = r; read.innerHTML = `<span class="lab">이렇게 읽었어요</span><span class="glyphs">${r.glyphs.map((g) => `<span class="glyph ${g.p < 0.8 ? "low" : ""}" title="${Math.round(g.p * 100)}%">${esc(g.ch)}</span>`).join("")}</span>`; });
    }, 400); } });
    window.__testInk = ink;
    $("#stripClear").onclick = () => ink.clear();
    HWR.load().then((n) => { const el = $("#modelInfo"); if (el) el.textContent = `오프라인 인식 모델 · 시험 정확도 ${(n.acc * 100).toFixed(1)}%`; }).catch(() => { const el = $("#modelInfo"); if (el) el.textContent = "인식 모델을 불러오지 못했어요"; });
  }

  // ── 공통 연결
  function bindCommon() {
    view().querySelectorAll("[data-drill]").forEach((b) => b.onclick = () => {
      const sid = b.dataset.drill;
      startSession(buildSet(skillPool(sid), 8), { kind: "skill", id: sid, title: SK.get(sid).이름 });
    });
    view().querySelectorAll("[data-skill]").forEach((b) => { if (!b.dataset.drill) b.onclick = () => { location.hash = `#/skill/${b.dataset.skill}`; }; });
  }

  function applySkin() {
    const S = STORE.s, html = document.documentElement;
    html.dataset.skin = S.skin || "note";
    if (S.theme === "system") delete html.dataset.theme; else html.dataset.theme = S.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(document.body).getPropertyValue("--bg").trim();
  }

  function route() {
    applySkin();
    if (!STORE.s.grade) return onboard();
    const h = location.hash || "#/today";
    const [, name, arg] = h.split("/");
    const tabs = { today: "today", skills: "skills", skill: "skills", concepts: "concepts", concept: "concepts", units: "concepts", exams: "exams", records: "records", settings: "settings", solve: "" };
    document.querySelectorAll("[data-nav]").forEach((a) => a.setAttribute("aria-current", a.dataset.nav === tabs[name] ? "page" : "false"));
    document.body.classList.toggle("solving", name === "solve");
    $("#xpchip").textContent = `${STORE.s.xp.toLocaleString()} XP`;
    $("#streakchip").textContent = `${STORE.streak()}`;
    ({ today: screenToday, skills: screenSkills, skill: () => screenSkill(arg), units: () => screenUnits(arg), concepts: () => screenConcepts(arg), concept: () => screenConcept(arg), exams: () => screenExams(arg), records: screenRecords, settings: screenSettings, solve: screenSolve }[name] || screenToday)();
    if (window.SKILLFIG) SKILLFIG.mount(view());
    if (name !== "solve") window.scrollTo(0, 0);
  }
  // 시연·스크린샷용: ?skin=arcade&grade=중3&demo=1 (demo 는 기록을 조금 채워 화면이 비지 않게)
  (function applyQuery() {
    const u = new URLSearchParams(location.search);
    if (u.get("skin")) STORE.s.skin = u.get("skin");
    if (u.get("theme")) STORE.s.theme = u.get("theme");
    if (u.get("grade")) STORE.s.grade = u.get("grade");
    if (u.get("demo") && !STORE.s.xp) {
      STORE.s.xp = 1240; const d = new Date();
      for (let i = 0; i < 4; i++) { const x = new Date(d - i * 864e5); STORE.s.days.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`); }
      ["G2", "A2", "S7", "N1", "G9", "C7"].forEach((sid, i) => { STORE.s.skill[sid] = { n: 6 + i, ok: 3 + (i % 3), m: [0.42, 0.66, 0.31, 0.78, 0.55, 0.24][i], last: Date.now() - i * 36e5, miss: i % 2 ? Date.now() - i * 36e5 : 0 }; });
    }
    STORE.save();
  })();
  window.addEventListener("hashchange", route);
  window.APP = { route, pool, usable, todaySkill, buildSet, startSession };
  const qParam = new URLSearchParams(location.search).get("q");
  if (qParam && BYID.has(qParam)) { SESSION = { ids: qParam.split(","), i: 0, res: [null], meta: { kind: "unit", title: "미리 보기" }, t0: Date.now() }; location.hash = "#/solve"; }
  route();
})();
