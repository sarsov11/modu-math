/* 풀이 관찰 연결(2026-09-29) — 문항 화면의 풀이판(Ink)을 줄 인식(linerec.js) → 단계 추적(tracer.js) → 코칭(coach.js)에 잇는다.
   펜을 멈추고 1.2초 뒤에 읽는다(쓰는 중엔 끼어들지 않는다).
   줄마다 풀이판 오른쪽 끝에 "이렇게 읽었어요" 작은 표를 단다: 몇 단계 값인지 · 다시 볼 값인지. 누르면 그 줄은 판정에서 뺀다(잘못 읽은 줄).
   인식이 틀려서 학생을 틀렸다고 몰지 않는다 — 확신 낮은 줄은 표만 달고 판정하지 않는다(tracer.MINC).
   선택: 설정에 Mathpix 키가 있으면(mathink.js) 기기 안 인식이 확신하지 못한 줄(문자가 섞인 식 등)만 한 번씩 보내 LaTeX 로 받아 값을 읽는다.
   OBSERVE.attach({ q, ink, pad, host, act, onInk }) → { stop(), next(), reached, tracer } */
(function () {
  const LABEL = { alt: (i) => `다른 풀이 ${i.k + 1}`, reach: (i) => `${i.k + 1}단계`, final: () => "답", mis: () => "다시 보기", slip: () => "계산 확인", unknown: () => "", ignored: () => "뺌", none: () => "" };

  // Mathpix LaTeX 한 줄 → linerec 과 같은 꼴의 줄(값은 `=` 마디마다 TRACER.num)
  function fromLatex(tex, L) {
    const body = String(tex).replace(/\\\(|\\\)|\$/g, "").trim();
    const segs = body.split(/(?<![<>!\\])=/).map((s) => s.trim()).filter(Boolean).map((s) => ({ tex: s, v: TRACER.num(s), conf: 0.95, op: /[+\-*/^]|\\(frac|sqrt|times|div|cdot)/.test(s) }));
    let slip = null;
    for (let k = 0; k + 1 < segs.length; k++) {
      const a = segs[k], b = segs[k + 1];
      if (a.v != null && b.v != null && a.op && Math.abs(a.v - b.v) > 1e-6 * Math.max(1, Math.abs(a.v))) { slip = { at: k, lhs: a.tex, wrote: b.v, true: a.v, conf: 0.95 }; break; }
    }
    const last = [...segs].reverse().find((s) => s.v != null);
    const eq = segs.length > 1;
    return Object.assign({}, L, { tex: body, segs, vals: segs.filter((s) => s.v != null).map((s) => s.v), rhs: eq && last ? last.v : (segs.length === 1 ? segs[0].v : null), slip, conf: 0.95, eq, src: "mathpix" });
  }

  function attach(o) {
    const { q, ink, pad, host, act } = o;
    let T = null, timer = null, alive = true, lines = [], drew = false, noSteps = false;
    const mp = {};   // 줄 열쇠 → Mathpix 로 읽은 줄(또는 "wait"/"fail")
    if (COACH.reset) COACH.reset(q);
    const layer = document.createElement("div");
    layer.className = "obs-layer";
    pad.appendChild(layer);

    Promise.all([STEPUI.load(q), COACH.load(q), HWR.load()]).then(([S, C]) => {
      if (!alive) return;
      // 단계 풀이 자료가 없는 문항도 줄은 읽는다: 읽은 식 표시 + 한 줄 안 계산 실수 + 정답 도달만(단계 판정은 없음)
      noSteps = !S;
      T = TRACER.create(q, S || null, C);
      if (ink.strokes.length) run();
    });

    const prev = ink.opts.onChange;
    ink.opts.onChange = (k) => {
      if (prev) prev(k);
      if (o.onInk) o.onInk();
      clearTimeout(timer);
      timer = setTimeout(run, 1200);
    };

    const actX = Object.assign({}, act, { ignoreLine: (key) => { if (T) { T.ignore(key); run(); } } });
    const inBox = (s, b) => { let x = 0, y = 0; for (const p of s.pts) { x += p[0]; y += p[1]; } x /= s.pts.length; y /= s.pts.length; return x >= b.x0 - 1 && x <= b.x1 + 1 && y >= b.y0 - 1 && y <= b.y1 + 1; };

    function askMathpix(L) {
      if (!(window.MATHINK && MATHINK.enabled) || mp[L.key]) return;
      if (L.conf >= TRACER.MINC && !L.toks.some((t) => t.k === "var")) return;
      mp[L.key] = "wait";
      const strokes = ink.strokes.filter((s) => (!s.tool || s.tool === "pen") && inBox(s, L.box));
      MATHINK.recognize(strokes).then((tex) => { mp[L.key] = fromLatex(tex, L); COACH.log({ e: "식인식", q: q.id }); run(); })
        .catch(() => { mp[L.key] = "fail"; });
    }

    function run() {
      if (!alive || !T || !window.LINEREC) return;
      const got = LINEREC.analyze(ink.strokes);
      if (got.drawing && !drew) { drew = true; COACH.log({ e: "그림", q: q.id }); }   // 코치가 시킨 그리기를 했다
      lines = got.map((L) => (typeof mp[L.key] === "object" ? mp[L.key] : L));
      lines.forEach(askMathpix);
      let ev = T.update(lines);
      if (noSteps) ev = ev.filter((e) => e.t === "slip" || e.t === "final");
      paint();
      if (ev.length) COACH.observe(host, q, ev, actX);
    }

    function paint() {
      layer.innerHTML = lines.map((L) => {
        const inf = T.info(L.key) || { st: "none" };
        if (!L.tex || (inf.st === "none" && !L.eq)) return "";
        // 잘 못 읽은 줄(문자 섞인 식 등)을 「?」 섞인 표로 띄우면 인식이 엉망으로 보인다 → 판정이 붙은 줄만 확신 낮아도 띄운다
        if ((L.conf || 0) < TRACER.MINC && (inf.st === "none" || inf.st === "unknown")) return "";
        const lab = (LABEL[inf.st] || LABEL.none)(inf);
        // 줄이 오른쪽 끝까지 오면 표가 글씨를 가린다 → 줄 아래로
        const under = L.box.x1 > pad.clientWidth - 150;
        const top = Math.max(0, Math.round(under ? L.box.y1 + 4 : L.box.cy - 12));
        return `<button class="obs-chip st-${inf.st}" data-key="${QR.esc(L.key)}" style="top:${top}px" title="읽은 식 → 누르면 판정에서 뺌">
          <span class="obs-tex">${QR.tex(L.tex)}</span>${lab ? `<b>${lab}</b>` : ""}</button>`;
      }).join("");
      layer.querySelectorAll("[data-key]").forEach((b) => b.onclick = (e) => {
        e.stopPropagation();
        T.ignore(b.dataset.key);
        COACH.log({ e: "읽기틀림", q: q.id });
        run();
      });
    }

    return {
      stop() { alive = false; clearTimeout(timer); ink.opts.onChange = prev; layer.remove(); },
      next() { return T ? T.next : 0; },
      get reached() { return T ? T.reached : []; },
      get tracer() { return T; },
    };
  }

  window.OBSERVE = { attach, fromLatex };
})();
