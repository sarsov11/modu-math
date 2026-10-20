/* 스킬 그림 설명(2026-10-07) — 대표님: "글 말고 그림을 우선으로 설명. 할선처럼 모를 수 있는 말은 그림 옆에 간단히 정의. AI 말투 금지."
   자료: js/data/skill_fig.js → window.SKILL_FIG[스킬id] = { 그림: [인사이트 카드(insight.js 형식) + 카드마다 낱말: [[말, 뜻]]] }
   낱말은 그 말이 나오는 그림 바로 아래에 붙인다("그림 옆에 간단히 정의").
   (원본 칸미고코칭/데이터/스킬그림/<id>.json → 모두의수학_이식/엔진/27_스킬그림.py)
     SKILLFIG.has(sid)              그림 자료가 있으면 true(없으면 앱은 예전 핵심 글을 그대로 보인다)
     SKILLFIG.render(host, sid, n)  그림 n장까지 + 낱말 → Promise
     SKILLFIG.mount(root)           root 안의 [data-skfig] 자리를 모두 그린다(화면을 그린 뒤 한 번) */
(function () {
  const D = () => window.SKILL_FIG || {};
  function has(sid) { const d = D()[sid]; return !!(d && (d.그림 || []).length); }
  async function render(host, sid, n) {
    const d = D()[sid]; if (!d) return;
    const all = d.그림 || [], cards = all.slice(0, n || 99);
    host.innerHTML = `<div class="skfig"><div class="skfig-figs"></div></div>${cards.length < all.length ? `<a class="skfig-more" href="#/skill/${sid}">그림 ${all.length}장 전체 보기</a>` : ""}`;
    const figs = host.querySelector(".skfig-figs");
    for (const c of cards) {
      try { await INSIGHT.render(figs, c); } catch (e) { continue; }   // 한 장이 실패해도 나머지는 그린다
      const w = c.낱말 || [];
      if (w.length) figs.lastElementChild.insertAdjacentHTML("beforeend", `<dl class="skfig-w">${w.map(([a, b]) => `<div><dt>${QR.inline(a)}</dt><dd>${QR.inline(b)}</dd></div>`).join("")}</dl>`);
    }
    // 첫 화면에서 JSXGraph 가 6초 안에 안 오면 insight.js 가 원·각 없는 SVG 로 대신 그린다 → 늦게라도 오면 한 번 다시 그린다
    if (!window.JXG && !host.dataset.retried && host.isConnected && cards.some((c) => c.종류 === "도형" || c.종류 === "그래프" || c.종류 === "수직선")) {
      host.dataset.retried = "1";
      for (let t = 0; t < 100 && !window.JXG; t++) await new Promise((r) => setTimeout(r, 200));
      if (window.JXG && host.isConnected) render(host, sid, n);
    }
  }
  function mount(root) {
    (root || document).querySelectorAll("[data-skfig]").forEach((el) => {
      if (el.dataset.done) return;
      el.dataset.done = "1";
      render(el, el.dataset.skfig, +el.dataset.max || 0);
    });
  }
  window.SKILLFIG = { has, render, mount };
})();
