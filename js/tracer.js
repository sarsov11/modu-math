/* 단계 추적·진단(2026-09-29) — 풀이판 줄 값(linerec.js)을 문항의 단계 기대값·오답값과 대조한다(모델 트레이싱).
   칸미고는 학생 글을 LLM 이 몰래 풀어 보며 판정한다. 우리는 문항마다 미리 검산해 둔 값(coach_<회차>.js)과 맞춰 본다 → 즉시·결정론적.
   사건
     reach   k단계 기대값을 썼다(어디까지 왔나)
     mis     k단계의 알려진 오답값을 썼다 — 종류: 공식(공식·정의를 잘못 앎) 전략(엉뚱한 방법) 계산(산술) 조건(조건 오독)
     slip    한 줄 안에서 앞 마디와 뒤 마디 값이 다르다(9+7=15) — 문항 자료 없이도 잡는 계산 실수
     alt     다른 풀이(대안)의 k단계 값을 썼다 — 맞게 가는 중, 조용히 인정
     final   최종값을 썼다(ok = 정답인가)
     unknown 어느 단계 값과도 안 맞는 값
     offtrack 모르는 값이 이어진다 — 엉뚱한 전략일 수 있다
   원칙: 확신 낮은 줄(conf < MINC)은 판정에 쓰지 않는다. 기대값과 오답값이 같으면 기대값으로 본다(학생에게 유리하게).
   TRACER.create(q, S, C) → { update(lines) → 새 사건[], info(key) → 줄 표시, reached, ignore(key) }
     q: 문항(a·k·ch) · S: 단계 풀이(STEPS[id]) · C: 코칭 자료(COACH_DATA[id], 없으면 단계 확인값만으로 추적) */
(function () {
  const MINC = 0.72;
  const near = (a, b) => a != null && b != null && Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));

  // 자료 속 값 읽기: "13/18", "-3", "sqrt(7)/4", "2*sqrt(3)", "\frac{3}{4}", "$4\sqrt{2}$"
  function num(x) {
    if (x == null) return null;
    if (typeof x === "number") return isFinite(x) ? x : null;
    let s = String(x).replace(/\$/g, "").replace(/\\left|\\right|\\,|\s/g, "").replace(/−/g, "-");
    if (!s) return null;
    s = s.replace(/\\[dt]?frac\{([^{}]+)\}\{([^{}]+)\}/g, "(($1)/($2))")
      .replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)").replace(/\\sqrt(\d)/g, "sqrt($1)")
      .replace(/\\pi/g, "pi").replace(/\\times|\\cdot/g, "*").replace(/\^\{([^{}]+)\}/g, "^($1)").replace(/[{}]/g, "")
      .replace(/(\d|\))(?=sqrt|pi|\()/g, "$1*").replace(/\^/g, "**");
    if (/[^0-9+\-*/().]/.test(s.replace(/sqrt|pi/g, ""))) return null;   // 문자가 남으면 수가 아니다
    try {
      const v = Function("sqrt", "pi", `"use strict";return (${s});`)(Math.sqrt, Math.PI);
      return typeof v === "number" && isFinite(v) ? v : null;
    } catch (e) { return null; }
  }

  function create(q, S, C) {
    const steps = (S && S.단계) || [];
    const N = steps.length;
    // 단계 기대값: 코칭 자료의 기대(빌드가 단계 식에서 뽑은 값) + 단계 확인값
    const expect = steps.map((st, k) => {
      const set = [];
      const add = (v) => { const n = num(v); if (n != null && !set.some((x) => near(x, n))) set.push(n); };
      ((C && C.단계 && C.단계[k] && C.단계[k].기대) || []).forEach(add);
      add(st.확인);
      return set;
    });
    // 단계 오답값
    const wrong = steps.map((_, k) => ((C && C.단계 && C.단계[k] && C.단계[k].오답) || []).map((w) => ({ ...w, n: num(w.값), 단계: k + 1 })).filter((w) => w.n != null));
    // 최종 답과 최종 오답
    const ansV = q.k === "choice" ? num((q.ch || [])[+q.a - 1]) : num(q.a);
    const finalWrong = ((C && C.오답) || []).map((w) => ({ ...w, n: q.k === "choice" ? num((q.ch || [])[+w.선지 - 1]) ?? num(w.값) : num(w.값) }))
      .filter((w) => w.n != null && !near(w.n, ansV));

    // 다른 풀이(대안): 해설과 다른 방법으로 맞게 가는 학생을 길 잃음으로 오판하지 않게(코칭 자료 다른풀이, 09-29 다각도)
    const alts = ((C && C.다른풀이) || []).map((al) => ({ 이름: al.이름, 단계: (al.단계 || []).map((st) => (st.값 || []).map(num).filter((x) => x != null)) }));
    const reached = new Set(), seen = new Set(), ign = new Set(), infoMap = {};
    let unknownRun = 0, offtrackSaid = false;

    function judge(v) {
      // 정답(최종값)을 쓰면 끝. 마지막 단계 확인값이 곧 정답이라 기대값 검사가 먼저면 final 이 영영 안 나온다.
      // 그다음 기대값(유리하게), 단계 오답, 최종 오답
      if (near(v, ansV)) return { t: "final", ok: true };
      for (let k = 0; k < N; k++) if (expect[k].some((x) => near(x, v))) return { t: "reach", k };
      for (let a = 0; a < alts.length; a++) for (let k = 0; k < alts[a].단계.length; k++) if (alts[a].단계[k].some((x) => near(x, v))) return { t: "alt", a, k };
      for (let k = 0; k < N; k++) { const w = wrong[k].find((x) => near(x.n, v)); if (w) return { t: "mis", k, w, kind: w.종류 || "전략" }; }
      const fw = finalWrong.find((x) => near(x.n, v));
      if (fw) return { t: "mis", k: Math.max(0, (fw.단계 || N) - 1), w: fw, kind: fw.종류 || "전략", final: true };
      return null;
    }

    function update(lines) {
      const ev = [];
      const emit = (e, id) => { if (seen.has(id)) return; seen.add(id); ev.push(e); };
      for (const L of lines || []) {
        if (ign.has(L.key)) { infoMap[L.key] = { st: "ignored" }; continue; }
        // 판정에는 마디마다 그 마디 글자의 확신을 쓴다. 글자를 못 읽은 마디(AC² 같은 문자)가 있어도 확신 높은 결과 마디는 쓴다
        const sg = (L.segs || []).filter((s) => s.v != null && s.conf >= MINC);
        const slipOk = !!(L.slip && L.slip.conf >= 0.85);
        if (!sg.length && !slipOk) { infoMap[L.key] = { st: "none", tex: L.tex }; continue; }
        // 한 줄의 여러 마디 중 가장 뒤(결과) 값부터 본다
        const last = [...(L.segs || [])].reverse().find((s) => s.v != null);
        const rhsOk = !!(last && last.conf >= MINC);
        const vals = sg.map((s) => s.v).reverse();
        if (rhsOk) vals.unshift(last.v);
        let got = null, gv = null;
        for (const v of vals) { const j = judge(v); if (j) { got = j; gv = v; break; } }
        // 줄 안 계산 실수: 쓴 결과(맨 뒤 마디)가 기대값·정답이면 인식 쪽 문제일 수 있으니 넘어간다.
        // 앞 마디(9+7)가 기대값(16)이어도 결과(15)가 틀리면 그게 바로 계산 실수다.
        const rj = rhsOk ? judge(last.v) : null;
        if (slipOk && !(rj && (rj.t === "reach" || rj.t === "final"))) {
          infoMap[L.key] = { st: "slip", tex: L.tex };
          emit({ t: "slip", key: L.key, slip: L.slip, tex: L.tex }, `slip:${L.key}`);
          unknownRun = 0;
          continue;
        }
        if (!got) {
          infoMap[L.key] = { st: L.eq ? "unknown" : "none", tex: L.tex };
          if (L.eq && rhsOk) {
            if (!seen.has(`u:${L.key}`)) { unknownRun++; emit({ t: "unknown", key: L.key, v: last.v }, `u:${L.key}`); }
            if (unknownRun >= 2 && !offtrackSaid) { offtrackSaid = true; ev.push({ t: "offtrack", after: Math.max(-1, ...reached) }); }
          }
          continue;
        }
        unknownRun = 0;
        if (got.t === "reach") {
          infoMap[L.key] = { st: "reach", k: got.k, tex: L.tex };
          for (let i = 0; i <= got.k; i++) reached.add(i);   // k단계 값을 썼으면 앞 단계는 지나온 것
          emit({ t: "reach", k: got.k, v: gv, key: L.key }, `r:${got.k}`);
        } else if (got.t === "alt") {
          infoMap[L.key] = { st: "alt", k: got.k, a: got.a, tex: L.tex };
          emit({ t: "alt", a: got.a, k: got.k, 이름: alts[got.a].이름, v: gv, key: L.key }, `a:${got.a}:${got.k}`);
        } else if (got.t === "final") {
          infoMap[L.key] = { st: "final", tex: L.tex };
          for (let i = 0; i < N; i++) reached.add(i);
          emit({ t: "final", ok: true, v: gv, key: L.key }, "final");
        } else {
          infoMap[L.key] = { st: "mis", k: got.k, kind: got.kind, tex: L.tex };
          emit({ t: "mis", k: got.k, v: gv, w: got.w, kind: got.kind, final: !!got.final, key: L.key }, `m:${got.k}:${gv}`);
        }
      }
      return ev;
    }

    return {
      update, num,
      info: (key) => infoMap[key] || null,
      get reached() { return [...reached].sort((a, b) => a - b); },
      get next() { let k = 0; while (reached.has(k)) k++; return Math.min(k, N - 1); },
      ignore: (key) => { ign.add(key); },
      expect, wrong, ansV, N,
    };
  }

  window.TRACER = { create, num, MINC };
})();
