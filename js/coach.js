/* 코칭(2026-09-29) — 칸미고(Khan Academy) 공개자료를 역설계해 모두의 수학에 맞춘 것(작업 문서: 2컴 칸미고코칭/01~04).
   칸미고는 LLM 이 매번 몰래 풀고(숨은 추론) 코드로 검산한다. 우리 문항 은행은 닫혀 있으니 그 결과를 문항마다 미리 만들어
   검산해 둔다(데이터/코칭 → 25_코칭데이터.py → js/data/coach_<회차>.js, window.COACH_DATA[id]).
   튜터는 답을 말하지 않는다. 먼저 말을 건다(칸미고 2026 재설계: 학생은 도움을 청하지 않는다).
     COACH.load(q)                        coach_<회차>.js 를 필요할 때 불러온다 → Promise
     COACH.observe(host, q, events, act)  풀이판 관찰(tracer.js 사건) → 공식 오해·엉뚱한 전략·계산 실수를 틀리기 전에 되묻는다
     COACH.onWrong(host, q, user, act)    첫 오답 제출 뒤 — 고른 답의 착각을 짚는 되묻기 → 그 단계부터 단계 풀이
     COACH.dontKnow(host, q, act)         "모르겠어요" — 두 번 연속이면 어디서 막혔는지 고르기
     COACH.watchIdle(host, q, act)        제출 전 오래 멈춤 → 한 줄. 반환 stop()
     COACH.onCorrect(host, q, act, first) 맞힌 뒤 — 왜? 한 번 → 같은 고비 스킬 문항을 단계 풀이 없이
     COACH.ladder(q)                      단계별 힌트 사다리(STEPUI.open opts.ladder)
     COACH.log(ev) · COACH.summary()      STORE.s.coach 에 사건만(지표: 오답 진단 적중·사다리 칸·오류 종류·다음 문항 독립 정답)
   act = { openSteps(start), next(qid, meta), pool(), reach(k), ignoreLine(key) } — 문항 화면이 넘겨준다. */
(function () {
  const esc = (s) => QR.esc(String(s == null ? "" : s));
  const D = () => window.COACH_DATA || {};
  const get = (q) => (q && D()[q.id]) || null;
  const rich = (q) => { const C = get(q); return C && C.먼저말 ? C : null; };   // 코칭 문장까지 있는 문항
  // 오래 멈춤 기준(초) — 조정값. 칸미고는 공개 수치가 없다. ?fast=1 이면 시연용 8초.
  const IDLE = { 2: 60, 3: 90, 4: 180 };
  const fast = /[?&]fast=1/.test(location.search);
  // 오류 종류는 문장이 아니라 배지(대표님 취향 규칙: 권유 꼬리 금지, 추천은 배지)
  const KIND = { 공식: "공식 오해", 전략: "다른 길", 계산: "계산 실수", 조건: "조건 오독" };
  const badge = (k) => (KIND[k] ? `<span class="coach-kind k-${k}">${KIND[k]}</span>` : "");

  const loaded = {};
  function load(q) {
    if (!q || !q.hs) return Promise.resolve(null);
    if (get(q)) return Promise.resolve(get(q));
    if (!loaded[q.hs]) loaded[q.hs] = new Promise((res) => {
      const s = document.createElement("script");
      s.src = `js/data/coach_${q.hs}.js`; s.onload = res; s.onerror = res;
      document.head.appendChild(s);
    });
    return loaded[q.hs].then(() => get(q));
  }

  function log(ev) {
    if (!window.STORE) return;
    const S = STORE.s;
    S.coach = S.coach || [];
    S.coach.push(Object.assign({ ts: Date.now() }, ev));   // ts = 시각, t = 관찰 사건 종류
    if (S.coach.length > 600) S.coach = S.coach.slice(-600);
    STORE.save();
  }

  function card(host, inner, cls = "") {
    host.innerHTML = `<section class="coach card ${cls}" role="status" aria-live="polite">
      <div class="coach-h"><span class="coach-mark" aria-hidden="true">코치</span></div>${inner}</section>`;
    return host.firstElementChild;
  }
  const say = (t, sub, kind) => `<p class="coach-say">${badge(kind)}${QR.inline(t)}</p>${sub ? `<p class="coach-sub">${QR.inline(sub)}</p>` : ""}`;

  // 선수 개념 — 이 문항 고비 스킬 숙련도가 낮거나(force) 공식 오해일 때 한 줄
  function preLine(q, C, force) {
    const names = window.CONCEPT_NAMES || Object.fromEntries(((window.TAX && TAX.개념) || []).map((c) => [c.id, c.이름]));
    const pre = (C.선수 || []).filter((c) => names[c]);
    if (!pre.length) return "";
    if (!force) {
      const S = window.STEPS && STEPS[q.id];
      const crux = S && (S.단계 || []).find((s) => s.고비);
      const m = crux && window.STORE ? STORE.mastery(crux.스킬) : null;
      if (m != null && m >= 0.5) return "";
    }
    return `<div class="coach-pre"><span class="muted">선수 개념</span>${pre.map((c) => `<a class="pill" href="#/concept/${esc(c)}">${esc(names[c])}</a>`).join("")}</div>`;
  }

  function matchWrong(q, C, user) {
    const W = C.오답 || [];
    if (q.k === "choice") {
      // 정답이 여럿인 문항('1,3')은 학생이 고른 것 중 정답이 아닌 선지로 오답 경로를 찾는다(10-06)
      const keys = String(q.a).split(",").map((s) => s.trim()), picks = String(user).split(",").map((s) => s.trim());
      const wrongPicks = keys.length > 1 ? picks.filter((p) => !keys.includes(p)) : picks;
      return W.find((w) => String(w.선지) === String(user)) || W.find((w) => wrongPicks.includes(String(w.선지))) || null;
    }
    return W.find((w) => window.HWR && HWR.sameAnswer(user, w.값)) || null;
  }

  function stuckPick(host, q, act, why) {
    const C = rich(q);
    if (!C || !C.막힘) { act.openSteps(0); return; }
    const el = card(host, `${say(C.막힘.질문)}
      <div class="coach-opts">${C.막힘.고르기.map((o, k) => `<button class="coach-opt" data-k="${k}">${QR.inline(o.글)}</button>`).join("")}</div>
      ${preLine(q, C)}`);
    el.querySelectorAll("[data-k]").forEach((b) => b.onclick = () => {
      const o = C.막힘.고르기[+b.dataset.k];
      log({ e: "막힘고르기", q: q.id, 단계: o.단계, why });
      host.innerHTML = "";
      act.openSteps(o.단계 - 1);
    });
  }

  function strategyPick(host, q, act) {
    const C = rich(q);
    if (!C || !(C.전략 || []).length) { stuckPick(host, q, act, "모르는값"); return; }
    const el = card(host, `${say("지금 쓰는 방법")}
      <div class="coach-opts">${C.전략.map((o, k) => `<button class="coach-opt" data-k="${k}">${QR.inline(o.글)}</button>`).join("")}
        <button class="coach-opt" data-k="-1">모름</button></div>`, "is-quiet");
    el.querySelectorAll("[data-k]").forEach((b) => b.onclick = () => {
      const k = +b.dataset.k, o = C.전략[k];
      log({ e: "전략고르기", q: q.id, k, ok: o ? o.맞음 : null });
      if (k < 0) { stuckPick(host, q, act, "전략모름"); return; }
      if (o.맞음) {
        const e2 = card(host, say("맞는 방법 → 한 줄에 한 계산씩 다시 적기") +
          `<div class="coach-acts"><button class="btn btn-ghost st-mini" data-go>단계 힌트</button><button class="btn btn-ghost st-mini" data-x>계속</button></div>`, "is-quiet");
        e2.querySelector("[data-go]").onclick = () => { host.innerHTML = ""; act.openSteps(-1); };
        e2.querySelector("[data-x]").onclick = () => { host.innerHTML = ""; };
      } else {
        STORE.mis && STORE.mis(q, null, "전략", null);
        const e2 = card(host, say(o.되묻기, null, "전략") +
          `<div class="coach-acts"><button class="btn btn-primary st-mini" data-go>1단계 힌트</button><button class="btn btn-ghost st-mini" data-x>다시 풀기</button></div>`, "is-wrong");
        e2.querySelector("[data-go]").onclick = () => { host.innerHTML = ""; act.openSteps(0); };
        e2.querySelector("[data-x]").onclick = () => { host.innerHTML = ""; };
      }
    });
  }

  // ── 풀이판 관찰: tracer 사건 → 먼저 말 걸기. 한 번에 한 장, 같은 일은 한 번만.
  const said = new Map();   // qid → Set(사건 열쇠)
  function observe(host, q, events, act) {
    if (!events || !events.length) return;
    const C = get(q) || {};
    const S = said.get(q.id) || new Set(); said.set(q.id, S);
    for (const e of events) {
      if (e.t === "reach" || e.t === "alt" || e.t === "final" || e.t === "mis" || e.t === "slip") {
        const th = thinking.get(q.id); if (th && th.progress) th.progress();   // 진전 → 오래 고민 계단 처음부터
      }
      if (e.t === "alt") { log({ e: "관찰", t: "alt", q: q.id, 단계: e.k + 1, 이름: e.이름 }); continue; }   // 다른 풀이 — 조용히 인정
      if (e.t === "reach") {
        cur.set(q.id, Math.max(cur.get(q.id) || 0, e.k + 1));
        act.reach && act.reach(e.k);
        log({ e: "관찰", t: "reach", q: q.id, 단계: e.k + 1 });
        // 짚어 준 단계를 스스로 고쳐 넘었으면 그 카드는 조용히 닫는다
        const open = host.firstElementChild;
        if (open && open.dataset.misK != null && e.k >= +open.dataset.misK) { host.innerHTML = ""; log({ e: "관찰고침", q: q.id, 단계: e.k + 1 }); }
      }
      if (e.t === "final") { act.reach && act.reach(99); log({ e: "관찰", t: "final", q: q.id }); }   // 최종값 = 모든 단계 도달
    }
    // 가장 중요한 것 하나: 알려진 오답 > 계산 실수 > 길 잃음
    const pick = events.find((e) => e.t === "mis") || events.find((e) => e.t === "slip") || events.find((e) => e.t === "offtrack");
    if (!pick) return;
    const key = pick.t === "mis" ? `mis:${pick.k}:${pick.v}` : pick.t === "slip" ? `slip:${pick.key}` : "offtrack";
    if (S.has(key)) return;
    S.add(key);
    if (pick.t === "mis") {
      const w = pick.w || {};
      log({ e: "관찰", t: "mis", q: q.id, 단계: pick.k + 1, 종류: pick.kind, v: pick.v, 최종: !!pick.final });
      STORE.mis && STORE.mis(q, pick.k, pick.kind, w.스킬 || null);
      const el = card(host, `${say(w.되묻기 || "방금 쓴 값 → 앞 줄부터 다시 적기", null, pick.kind || "전략")}
        <div class="coach-acts"><button class="btn btn-primary st-mini" data-go>${pick.k + 1}단계 힌트</button>
          <button class="btn btn-ghost st-mini" data-x>계속</button></div>${pick.kind === "공식" && C.선수 ? preLine(q, C, true) : ""}`, "is-wrong");
      el.dataset.misK = pick.k;
      if (pick.kind !== "계산") showCards(el, stepCards(q, pick.k).slice(0, 1));   // 말보다 그림: 그 단계 그림 카드 한 장(계산 실수에는 그림을 붙이지 않는다 — 05 조사)
      el.querySelector("[data-go]").onclick = () => { log({ e: "관찰힌트", q: q.id, 단계: pick.k + 1 }); host.innerHTML = ""; act.openSteps(pick.k); };
      el.querySelector("[data-x]").onclick = () => { host.innerHTML = ""; };
    } else if (pick.t === "slip") {
      log({ e: "관찰", t: "slip", q: q.id });
      STORE.mis && STORE.mis(q, null, "계산", null);
      const s = pick.slip;
      // 틀린 표현만 취소선 → 바른 값은 빈칸(대표님 취향: diff 방식, 답은 학생이)
      const wrote = Number.isInteger(s.wrote) ? s.wrote : +(+s.wrote).toFixed(4);
      const el = card(host, `<p class="coach-say">${badge("계산")}${QR.inline("$" + s.lhs + "=$")} <s class="coach-strike">${esc(wrote)}</s> → ${QR.tex("\\square")}</p><p class="coach-sub">이 줄 다시 계산</p>
        <div class="coach-acts"><button class="btn btn-ghost st-mini" data-x>확인</button>
          <button class="btn btn-ghost st-mini" data-bad>잘못 읽음</button></div>`, "is-quiet");
      el.querySelector("[data-x]").onclick = () => { host.innerHTML = ""; };
      el.querySelector("[data-bad]").onclick = () => { log({ e: "읽기틀림", q: q.id }); act.ignoreLine && act.ignoreLine(pick.key); host.innerHTML = ""; };
    } else {
      log({ e: "관찰", t: "offtrack", q: q.id });
      strategyPick(host, q, act);
    }
  }

  function onWrong(host, q, user, act) {
    const C = rich(q);
    if (!C) return false;
    const w = matchWrong(q, C, user);
    log({ e: "오답", q: q.id, v: String(user), hit: !!w, 단계: w ? w.단계 : null, 종류: w ? w.종류 || null : null });
    if (w) {
      STORE.mis && STORE.mis(q, w.단계 - 1, w.종류 || "전략", w.스킬 || null);
      const el = card(host, `${say(w.되묻기, `${w.단계}단계에서 갈림`, w.종류)}
        <div class="coach-acts"><button class="btn btn-primary st-mini" data-go>${w.단계}단계부터</button>
          <button class="btn btn-ghost st-mini" data-self>다시 풀기</button></div>${preLine(q, C, w.종류 === "공식")}`, "is-wrong");
      el.querySelector("[data-go]").onclick = () => { log({ e: "오답따라가기", q: q.id, 단계: w.단계 }); host.innerHTML = ""; act.openSteps(w.단계 - 1); };
      el.querySelector("[data-self]").onclick = () => { host.innerHTML = ""; };
    } else {
      const el = card(host, `${say(C.먼저말.틀림)}
        <div class="coach-acts"><button class="btn btn-primary st-mini" data-pick>막힌 곳 고르기</button>
          <button class="btn btn-ghost st-mini" data-self>다시 풀기</button></div>${preLine(q, C)}`, "is-wrong");
      el.querySelector("[data-pick]").onclick = () => stuckPick(host, q, act, "오답");
      el.querySelector("[data-self]").onclick = () => { host.innerHTML = ""; };
    }
    return true;
  }

  const dk = new Map();   // 문항별 "모르겠어요" 연속 횟수
  function dontKnow(host, q, act) {
    const C = rich(q);
    if (!C) { act.openSteps(0); return; }
    const n = (dk.get(q.id) || 0) + 1;
    dk.set(q.id, n);
    log({ e: "모르겠어요", q: q.id, n });
    if (n >= 2) { stuckPick(host, q, act, "모르겠어요"); return; }
    const el = card(host, `${say(C.먼저말.오래)}
      <div class="coach-acts"><button class="btn btn-primary st-mini" data-go>1단계 힌트</button>
        <button class="btn btn-ghost st-mini" data-dk>막힌 곳 고르기</button></div>`);
    el.querySelector("[data-go]").onclick = () => { host.innerHTML = ""; act.openSteps(0); };
    el.querySelector("[data-dk]").onclick = () => dontKnow(host, q, act);
  }

  // ── 오래 고민(선제, 09-29 대표님 "고민을 오래 하고 있는 것 같으면 선제적 피드백 · 말보다 그래프·공식")
  // 펜이 멈추고 진전(단계 도달)이 없으면 한 계단씩: ① 첫 행동 한 줄 ② 그 단계 그림·그래프·공식 카드 ③ 그 단계 강의 장면 + 단계 힌트.
  // 단계에 도달하면 처음부터 다시 잰다. 쓰는 중(펜 움직임)에는 끼어들지 않는다. 기준 초는 조정값(05_경쟁서비스_조사 참고).
  const THINK = { open: { 2: 40, 3: 45, 4: 75 }, penIdle: 25, gap2: 40, gap3: 55 };
  const cur = new Map();   // 문항 → 지금 단계(도달한 단계 + 1)
  function conceptCard(q, k) {
    const C = window.TAX && TAX.개념, cn = (q.cn || []).map((id) => C && C.find((c) => c.id === id)).filter((c) => c && (c.공식 || []).length);
    if (!cn.length) return null;
    // 그 단계 스킬을 가진 개념 먼저(단계와 안 맞는 공식을 띄우지 않게)
    const S = window.STEPS && STEPS[q.id], sid = S && S.단계 && S.단계[k] && S.단계[k].스킬;
    const c = cn.find((x) => sid && (x.스킬 || []).includes(sid)) || cn[0];
    return { 종류: "공식", 제목: c.이름, tex: c.공식.slice(0, 2).map((t) => t.replace(/^\$|\$$/g, "")), 글: "" };
  }
  function stepCards(q, k) {
    const cards = window.INSIGHT ? INSIGHT.forStep(q, k) : [];
    if (cards.length) return cards;
    const cc = conceptCard(q, k);
    return cc ? [cc] : [];
  }
  async function showCards(el, cards) {
    if (!window.INSIGHT || !cards.length) return;
    const box = document.createElement("div"); box.className = "coach-ins";
    el.appendChild(box);
    for (const c of cards) await INSIGHT.render(box, c);
  }
  function watchIdle(host, q, act) {
    const C = rich(q);
    if (!C && !(window.INSIGHT && INSIGHT.forStep(q, 0).length)) { const s = () => {}; s.poke = () => {}; return s; }
    // 숙달한 스킬이면 덜 끼어든다(05 조사: 초보에겐 풍부하게, 숙달자에겐 걷어냄)
    const S0 = window.STEPS && STEPS[q.id], sid0 = S0 && S0.단계 && S0.단계[0] && S0.단계[0].스킬;
    const m0 = sid0 && window.STORE ? STORE.mastery(sid0) : null, fade = m0 != null && m0 >= 0.7 ? 1.6 : 1;
    const open = (fast ? 8 : THINK.open[q.p || (q.d >= 4 ? 4 : 3)] || 60) * fade;
    const t0 = Date.now();
    let lastInk = 0, lastProg = t0, stage = 0, stageAt = t0, busy = false;
    const k = () => Math.min(cur.get(q.id) || 0, ((window.STEPS && STEPS[q.id] && STEPS[q.id].단계) || [0]).length - 1);
    const tick = async () => {
      if (busy || !host.isConnected) return;
      const now = Date.now(), s = (x) => (fast ? x / 5 : x) * 1000;
      if (lastInk && now - lastInk < s(THINK.penIdle)) return;          // 쓰는 중
      if (host.firstElementChild && !host.firstElementChild.dataset.think) return;   // 다른 코치 카드(오답 짚기 등)는 덮지 않는다
      // 카드 전에 은은한 신호: 「시작 힌트」에 점(Mathspace 식 — 끼어들기 전에 알림만)
      if (stage === 0 && now - Math.max(lastProg, t0) > s(open) * 0.6) { const b = document.getElementById("dkBtn"); if (b) b.classList.add("has-hint"); }
      const since = now - Math.max(lastProg, stageAt);
      busy = true;
      try {
        if (stage === 0 && now - Math.max(lastProg, t0) > s(open)) {
          stage = 1; stageAt = now;
          log({ e: "오래멈춤", q: q.id, 단계: k() + 1, 계단: 1 });
          const first = k() === 0 && C ? C.먼저말.오래 : (C && C.사다리 && C.사다리[k()] ? C.사다리[k()][0] : null);
          if (!first) { stage = 2; return; }
          const el = card(host, `${say(first)}
            <div class="coach-acts"><button class="btn btn-ghost st-mini" data-pic>그림으로 보기</button>
              <button class="btn btn-ghost st-mini" data-no>닫기</button></div>`, "is-quiet");
          el.dataset.think = "1";
          el.querySelector("[data-pic]").onclick = () => { stage = 2; stageAt = Date.now(); log({ e: "그림열기", q: q.id, 단계: k() + 1 }); el.querySelector("[data-pic]").remove(); showCards(el, stepCards(q, k())); };
          el.querySelector("[data-no]").onclick = () => { host.innerHTML = ""; };
        } else if (stage === 1 && since > s(THINK.gap2 * fade)) {
          stage = 2; stageAt = now;
          const cards = stepCards(q, k());
          log({ e: "오래멈춤", q: q.id, 단계: k() + 1, 계단: 2, 카드: cards.length });
          if (!cards.length) return;
          const el = card(host, `${say(`${k() + 1}단계 그림`)}
            <div class="coach-acts"><button class="btn btn-ghost st-mini" data-no>닫기</button></div>`, "is-quiet");
          el.dataset.think = "1";
          el.querySelector("[data-no]").onclick = () => { host.innerHTML = ""; };
          await showCards(el, cards);
        } else if (stage === 2 && since > s(THINK.gap3 * fade)) {
          stage = 3; stageAt = now;
          const lec = window.INSIGHT && INSIGHT.lecture(q, k());
          log({ e: "오래멈춤", q: q.id, 단계: k() + 1, 계단: 3, 강의: !!lec });
          const el = card(host, `${say(`${k() + 1}단계 힌트 + 강의 장면`)}
            <div class="coach-acts"><button class="btn btn-primary st-mini" data-go>${k() + 1}단계 힌트</button>
              <button class="btn btn-ghost st-mini" data-no>닫기</button></div>`, "is-quiet");
          el.dataset.think = "1";
          el.querySelector("[data-go]").onclick = () => { host.innerHTML = ""; act.openSteps(-1); };
          el.querySelector("[data-no]").onclick = () => { host.innerHTML = ""; };
          if (lec) await showCards(el, [lec]);
        }
      } finally { busy = false; }
    };
    const iv = setInterval(tick, fast ? 1000 : 3000);
    const stop = () => clearInterval(iv);
    stop.poke = () => { lastInk = Date.now(); };                                  // 필기 중
    stop.progress = () => { lastProg = Date.now(); stage = 0; stageAt = lastProg; const b = document.getElementById("dkBtn"); if (b) b.classList.remove("has-hint"); };  // 단계 도달 → 처음부터
    thinking.set(q.id, stop);
    return stop;
  }
  const thinking = new Map();

  function nextPick(q, act) {
    const S = window.STEPS && STEPS[q.id];
    const crux = S && ((S.단계 || []).find((s) => s.고비) || S.단계[0]);
    const sid = crux && crux.스킬;
    if (!sid) return null;
    const cand = act.pool().filter((x) => x.id !== q.id && !(window.STORE && STORE.seen(x.id)) && (x.s || []).includes(sid));
    return cand.length ? { q: cand[Math.floor(Math.random() * Math.min(cand.length, 6))], sid } : null;
  }

  function onCorrect(host, q, act, firstTry) {
    const C = rich(q);
    if (!C || !C.왜) return false;
    const Y = C.왜;
    const nx = nextPick(q, act);
    const el = card(host, `${say(Y.질문)}
      <div class="coach-opts">${Y.고르기.map((o, k) => `<button class="coach-opt" data-y="${k + 1}">${QR.inline(o)}</button>`).join("")}</div>
      <div class="coach-after" hidden></div>`, "is-ok");
    el.querySelectorAll("[data-y]").forEach((b) => b.onclick = () => {
      const pick = +b.dataset.y, ok = pick === Y.정답;
      log({ e: "왜", q: q.id, ok, firstTry: !!firstTry });
      el.querySelectorAll("[data-y]").forEach((x) => { x.disabled = true; if (+x.dataset.y === Y.정답) x.classList.add("is-correct"); else if (x === b) x.classList.add("is-wrong"); });
      const after = el.querySelector(".coach-after");
      after.hidden = false;
      after.innerHTML = `<p class="coach-sub">${QR.inline(Y.풀이)}</p><div class="coach-acts">${nx ? `<button class="btn btn-ghost st-mini" data-next>같은 고비 문항 ↻ 단계 풀이 없이</button>` : ""}</div>`;
      const nb = after.querySelector("[data-next]");
      if (nb) nb.onclick = () => { log({ e: "다음문항권함", q: q.id, to: nx.q.id, sid: nx.sid }); act.next(nx.q.id, { from: q.id, noSteps: true }); };
    });
    return true;
  }

  const ladder = (q) => { const C = rich(q); return C && C.사다리 ? C.사다리 : null; };
  const has = (q) => !!rich(q);

  function summary() {
    const L = (window.STORE && STORE.s.coach) || [];
    const c = (f) => L.filter(f).length;
    return {
      오답: c((x) => x.e === "오답"), 오답진단적중: c((x) => x.e === "오답" && x.hit),
      관찰_단계도달: c((x) => x.e === "관찰" && x.t === "reach"), 관찰_오류: c((x) => x.e === "관찰" && x.t === "mis"),
      관찰_계산실수: c((x) => x.e === "관찰" && x.t === "slip"), 관찰_길잃음: c((x) => x.e === "관찰" && x.t === "offtrack"),
      관찰_스스로고침: c((x) => x.e === "관찰고침"), 그림: c((x) => x.e === "그림"), 관찰_다른풀이: c((x) => x.e === "관찰" && x.t === "alt"),
      오래고민: c((x) => x.e === "오래멈춤"), 그림열기: c((x) => x.e === "그림열기"),
      공식: c((x) => x.종류 === "공식"), 전략: c((x) => x.종류 === "전략"), 계산: c((x) => x.종류 === "계산"), 조건: c((x) => x.종류 === "조건"),
      사다리칸: c((x) => x.e === "사다리"), 막힘고르기: c((x) => x.e === "막힘고르기"),
      왜: c((x) => x.e === "왜"), 왜정답: c((x) => x.e === "왜" && x.ok),
      다음문항: c((x) => x.e === "다음문항"), 다음문항독립정답: c((x) => x.e === "다음문항" && x.ok),
    };
  }

  // 문항 화면을 새로 열 때(observe.attach) — 같은 일은 한 번만 말한다는 기록·"모르겠어요" 횟수를 비운다
  const reset = (q) => { said.delete(q.id); dk.delete(q.id); cur.delete(q.id); };

  window.COACH = { load, has, reset, observe, stepCards, showCards, onWrong, dontKnow, watchIdle, onCorrect, ladder, log, summary, KIND };
})();
