/* 단계 풀이 — EBSi 공식 해설을 포토매스식 단계로 쪼갠 것(데이터/단계풀이 → js/data/steps_<회차>.js).
   벤치마킹: 포토매스(단계 = 결과 식 + 짧은 제목 + 왜 + 세부 "어떻게?"), 콴다(전략 → Step → 정답, 검수된 풀이만).
   우리 것: 풀다 막히면 "어디까지 왔나" — 단계마다 확인값을 손글씨로 맞춰 보고, 처음 열어 본 단계의 스킬을 막힘으로 기록.
   두 쓰임
     STEPUI.open(host, q, "check")  풀이 중: 힌트 → 값 맞춰 보기 → (못 넘으면) 단계 보기. 단계를 하나씩 연다.
     STEPUI.open(host, q, "read")   채점 뒤: 전 단계 펼침(해설 이해용).
   코칭(2026-09-29, coach.js): opts.ladder = [[1칸,2칸,3칸], …] 단계별 힌트 사다리 — 힌트 뒤 "힌트 한 칸 더"로 한 칸씩.
     opts.start = k  k단계부터(앞 단계는 학생이 됐다고 고른 것 — 스스로 도달로 표시). opts.onRung(i, n) 사다리 칸 수 기록.
     opts.reached = [i…] 풀이판 필기로 이미 도달한 단계(tracer.js). 열린 뒤에는 sess.reach(k) 로 k단계까지 도달 표시.
     opts.insight(i) → 그 단계 인사이트 카드(insight.js), opts.onInsight(i) 기록. */
// 전 문항 확장(10-06): 단계 풀이를 새로 붙인 문항(내신·ns·tb)은 문항 자료에 hs 가 없다 → hs_index.js 가 BANK 문항에 hs 를 채운다(app.js 보다 먼저 돈다)
if (!window.__hsIndex) { window.__hsIndex = 1; document.write('<script src="js/data/hs_index.js"><\/script>'); }
(function () {
  const esc = (s) => QR.esc(String(s == null ? "" : s));
  const loaded = {};
  function load(q) {
    if (!q || !q.hs) return Promise.resolve(null);
    if (window.STEPS && window.STEPS[q.id]) return Promise.resolve(window.STEPS[q.id]);
    if (!loaded[q.hs]) loaded[q.hs] = new Promise((res) => {
      const s = document.createElement("script");
      s.src = `js/data/steps_${q.hs}.js`; s.onload = res; s.onerror = res;
      document.head.appendChild(s);
    });
    return loaded[q.hs].then(() => (window.STEPS || {})[q.id] || null);
  }
  const has = (q) => !!(q && q.hs);

  // 식 한 줄 — 이미 $…$ 이면 그대로, 아니면 수식으로
  const texLine = (x) => QR.inline(/\$/.test(x) ? x : "$" + x + "$");

  function skillChip(sid) {
    const s = sid && window.TAX && TAX.스킬.find((k) => k.id === sid);
    return s ? `<a class="pill pill-g st-skill" style="--gc:var(--g-${sid[0]})" href="#/skill/${sid}"><b>${sid}</b> ${esc(s.이름)}</a>` : "";
  }

  // 강의 해설(2026-09-24): EBSi 해설강의 자막 → 문항 구간·강사 요점·단계별 시각, 어피셜 유튜브 → 문항 챕터 구간
  const mmss = (ms) => { const s = Math.max(0, Math.round((ms || 0) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  function lectureCard(S) {
    const L = S.강의 || [];
    if (!L.length) return "";
    const e = L.find((x) => x.src === "EBSi"), y = L.find((x) => x.src === "어피셜");
    const ebsUrl = e && e.course ? `https://www.ebsi.co.kr/ebs/lms/lmsx/retrieveSbjtDtl.ebs?courseId=${encodeURIComponent(e.course)}&defaultTabCd=tb_tab12` : "";
    return `<div class="st-lec">
      <div class="st-lec-h"><b>강의에서</b>${e ? `<span class="muted">EBSi · ${esc(e.title || "")} ${mmss(e.t[0])}~${mmss(e.t[1])}</span>` : `<span class="muted">어피셜 해설</span>`}</div>
      ${e && e.pt ? `<div class="st-lec-pt">${QR.inline(e.pt)}</div>` : ""}
      ${e && e.tip ? `<div class="st-lec-tip">${QR.inline(e.tip)}</div>` : ""}
      ${e && e.alt ? `<details class="st-lec-alt"><summary>강의에서는 이렇게도 풀어요</summary><div>${QR.inline(e.alt)}</div></details>` : ""}
      <div class="st-lec-acts">
        ${y ? `<button class="btn btn-primary st-mini" data-yt="${esc(y.yt)}" data-s="${Math.floor(y.t[0] / 1000)}" data-e="${Math.ceil(y.t[1] / 1000)}">영상으로 보기 · ${mmss(y.t[0])}</button>` : ""}
        ${ebsUrl ? `<a class="btn btn-ghost st-mini" href="${ebsUrl}" target="_blank" rel="noopener">EBSi 강의 열기</a>` : ""}
      </div>
      <div class="st-yt" hidden></div>
    </div>`;
  }

  function stepBody(st, fb, k) {
    const sub = st.세부 && st.세부.length ? `<button class="st-how" data-how="${k}">어떻게? <span class="muted">세부 ${st.세부.length}줄</span></button>
      <ol class="st-sub" id="sub${k}" hidden>${st.세부.map((d) => `<li><div class="st-tex">${texLine(d.식 || "")}</div>${d.설명 ? `<div class="st-why">${QR.inline(d.설명)}</div>` : ""}</li>`).join("")}</ol>` : "";
    return `<div class="st-title">${QR.inline(st.제목 || "")}</div>
      ${st.그림 ? `<img class="st-fig" alt="해설 그림" src="${esc(fb + st.그림)}">` : ""}
      ${(st.식 || []).length ? `<div class="st-eqs">${st.식.map((x) => `<div class="st-tex">${texLine(x)}</div>`).join("")}</div>` : ""}
      ${st.설명 ? `<div class="st-why">${QR.inline(st.설명)}</div>` : ""}
      ${sub}
      ${st.lt != null ? `<div class="st-lw"><span class="st-lt tnum">강의 ${mmss(st.lt)}</span>${st.lw ? esc(st.lw) : ""}</div>` : ""}
      <div class="st-foot">${skillChip(st.스킬)}${st.고비 ? `<span class="pill st-crux">고비</span>` : ""}</div>`;
  }

  /* 상태: 0 아직 · 1 지금(힌트) · 2 스스로 도달(확인값 맞음/했어요) · 3 열어 봄 */
  function open(host, q, mode, opts = {}) {
    host.innerHTML = `<div class="st-wrap"><div class="st-loading muted">단계 풀이를 불러오는 중…</div></div>`;
    return load(q).then((S) => {
      if (!S) { host.innerHTML = ""; return null; }
      const steps = S.단계, N = steps.length;
      const start = Math.max(0, Math.min(N - 1, opts.start | 0)), lad = opts.ladder || null, rung = steps.map(() => 0);
      const insOpen = new Set();   // opts.insight(i) → 그 단계 인사이트 카드(그림·그래프·공식), 「그림으로 보기」로 펼침
      const pre = new Set(opts.reached || []);
      const state = steps.map((_, i) => (mode === "read" ? 3 : i < start || pre.has(i) ? 2 : i === start ? 1 : 0));
      if (mode !== "read" && state[start] === 2) { const nx = state.indexOf(0); if (nx >= 0) state[nx] = 1; }
      let showPlan = mode === "read", peek = mode === "read", stuckAt = null;
      const sess = { steps, state, rung, get stuckAt() { return stuckAt; } };

      const paint = () => {
        const done = state.filter((s) => s >= 2).length;
        const self = state.filter((s) => s === 2).length;
        host.innerHTML = `<section class="st-wrap card" data-mode="${mode}">
          <header class="st-head">
            <div><div class="st-eyebrow">단계 풀이 <span class="muted">· EBSi 해설 기반</span></div>
              <div class="st-count tnum">${mode === "read" ? `${N}단계` : `${done} / ${N}단계${self ? ` · 스스로 ${self}` : ""}`}</div></div>
            ${mode === "check" ? `<button class="btn btn-ghost st-mini" data-peek>${peek ? "제목 가리기" : "단계 제목 미리 보기"}</button>` : ""}
          </header>
          <div class="st-meter" aria-hidden="true">${steps.map((st, i) => `<i class="s${state[i]}${st.고비 ? " crux" : ""}"></i>`).join("")}</div>
          ${S.길 ? (showPlan ? `<div class="st-plan"><b>전략</b> ${QR.inline(S.길)}</div>` : `<button class="st-planbtn" data-plan>전략 한 줄 보기</button>`) : ""}
          ${(S.강의 || []).length && (mode === "read" || state.some((x) => x === 3)) ? lectureCard(S) : ""}
          <ol class="st-list">${steps.map((st, i) => {
            const s = state[i];
            const caseTag = st.경우 && (s >= 1 || peek) ? `<div class="st-case">${QR.inline(st.경우)}</div>` : "";
            let inner;
            if (s >= 2) inner = stepBody(st, S.fb, i) + (s === 2 ? `<div class="st-self">✓ 스스로 왔어요</div>` : "");
            else if (s === 1) inner = `${peek ? `<div class="st-title">${QR.inline(st.제목 || "")}</div>` : ""}
                <div class="st-hint"><span class="st-q">?</span><span class="st-htxt">${QR.inline(st.힌트 || "이 단계에서 무엇을 구할까?")}</span></div>
                ${lad && lad[i] ? lad[i].slice(0, rung[i]).map((r, k) => `<div class="st-hint st-rung"><span class="st-q tnum">${k + 1}</span><span class="st-htxt">${QR.inline(r)}</span></div>`).join("") : ""}
                ${st.확인 ? `<div class="st-check" id="chk${i}"></div>` : ""}
                <div class="st-acts">
                  ${st.확인 ? "" : `<button class="btn btn-ghost st-mini" data-self="${i}">여기까진 했어요</button>`}
                  ${lad && lad[i] && rung[i] < lad[i].length ? `<button class="btn btn-ghost st-mini" data-rung="${i}">힌트 한 칸 더 <span class="muted tnum">${rung[i]}/${lad[i].length}</span></button>` : ""}
                  ${opts.insight && opts.insight(i).length && !insOpen.has(i) ? `<button class="btn btn-ghost st-mini" data-ins="${i}">그림으로 보기</button>` : ""}
                  <button class="btn btn-primary st-mini" data-open="${i}">이 단계 보기</button></div>
                ${insOpen.has(i) ? `<div class="st-ins" data-slot="${i}"></div>` : ""}`;
            else inner = peek ? `<div class="st-title dim">${QR.inline(st.제목 || "")}</div>` : `<div class="st-title dim">단계 ${i + 1}</div>`;
            return `<li class="st s${s}${st.고비 ? " crux" : ""}">${caseTag}<span class="st-no tnum">${s >= 2 ? (s === 2 ? "✓" : i + 1) : i + 1}</span><div class="st-card">${inner}</div></li>`;
          }).join("")}</ol>
          ${mode === "check" && state.every((s) => s >= 2) ? `<div class="st-end">마지막 단계까지 왔어요. 답을 내 봐요.</div>` : ""}
        </section>`;
        bind();
      };

      const advance = (i, how) => {
        state[i] = how;
        if (how === 3 && stuckAt === null) { stuckAt = i; opts.onStuck && opts.onStuck(i, steps[i]); }
        if (i + 1 < N && state[i + 1] === 0) state[i + 1] = 1;
        opts.onChange && opts.onChange(sess);
        paint();
        const nx = host.querySelector(".st.s1");
        if (nx) nx.scrollIntoView({ behavior: "smooth", block: "nearest" });
      };

      const mountCheck = (i) => {
        const box = host.querySelector(`#chk${i}`);
        if (!box) return;
        box.innerHTML = `<div class="st-checklab">여기까지 왔다면 나오는 값을 써 봐요</div>
          <div class="hwr-strip st-strip"><div class="ph">손글씨로 · 분수는 가로선 위아래로</div></div>
          <div class="st-checkrow"><span class="st-read muted">아직 안 읽었어요</span><button class="btn btn-ghost st-mini" data-clr>지우기</button></div>`;
        const strip = box.querySelector(".st-strip"), read = box.querySelector(".st-read");
        let timer = null, fails = 0;
        const ink = window.__stepInk = new Ink(strip, { width: 3.2, penOnly: false, onChange: (k) => {
          strip.querySelector(".ph").hidden = k.strokes.length > 0;
          clearTimeout(timer);
          timer = setTimeout(() => {
            if (!k.strokes.length) { read.textContent = "아직 안 읽었어요"; read.className = "st-read muted"; return; }
            HWR.load().then(() => {
              const r = HWR.recognize(k.strokes, k.h);
              if (!r.text) return;
              if (HWR.sameAnswer(r.text, steps[i].확인)) { read.innerHTML = `${esc(r.text)} — 맞아요`; read.className = "st-read ok"; setTimeout(() => advance(i, 2), 500); }
              else { fails++; read.innerHTML = `${esc(r.text)} 로 읽었어요 — 아직 달라요${fails >= 2 ? ". 힌트를 다시 읽거나 단계를 열어 봐요" : ""}`; read.className = "st-read no"; }
            });
          }, 600);
        } });
        box.querySelector("[data-clr]").onclick = () => ink.clear();
        HWR.load();
      };

      function bind() {
        host.querySelectorAll("[data-open]").forEach((b) => b.onclick = () => advance(+b.dataset.open, 3));
        host.querySelectorAll("[data-self]").forEach((b) => b.onclick = () => advance(+b.dataset.self, 2));
        host.querySelectorAll("[data-rung]").forEach((b) => b.onclick = () => { const i = +b.dataset.rung; rung[i]++; opts.onRung && opts.onRung(i, rung[i]); paint(); });
        host.querySelectorAll("[data-ins]").forEach((b) => b.onclick = () => { const i = +b.dataset.ins; insOpen.add(i); opts.onInsight && opts.onInsight(i); paint(); });
        host.querySelectorAll("[data-slot]").forEach((el) => { if (window.INSIGHT) opts.insight(+el.dataset.slot).forEach((c) => INSIGHT.render(el, c)); });
        host.querySelectorAll("[data-how]").forEach((b) => b.onclick = () => { const el = host.querySelector("#sub" + b.dataset.how); el.hidden = !el.hidden; });
        const pl = host.querySelector("[data-plan]"); if (pl) pl.onclick = () => { showPlan = true; paint(); };
        const pk = host.querySelector("[data-peek]"); if (pk) pk.onclick = () => { peek = !peek; paint(); };
        const yb = host.querySelector("[data-yt]");
        if (yb) yb.onclick = () => {
          const box = host.querySelector(".st-yt");
          if (!box.hidden) { box.hidden = true; box.innerHTML = ""; return; }
          box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(yb.dataset.yt)}?start=${yb.dataset.s}&end=${yb.dataset.e}&rel=0&autoplay=1" title="해설 영상" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
          box.hidden = false;
        };
        const cur = state.indexOf(1); if (cur >= 0) mountCheck(cur);
      }
      // 풀이판에서 k단계 값을 썼다 → k단계까지 스스로 도달(열어 본 단계는 그대로)
      sess.reach = (k) => {
        if (mode === "read") return;
        let ch = false;
        for (let i = 0; i <= Math.min(k, N - 1); i++) if (state[i] < 2) { state[i] = 2; ch = true; }
        if (!ch) return;
        if (!state.includes(1)) { const nx = state.indexOf(0); if (nx >= 0) state[nx] = 1; }
        opts.onChange && opts.onChange(sess);
        paint();
      };
      paint();
      return sess;
    });
  }

  window.STEPUI = { load, has, open };
})();
