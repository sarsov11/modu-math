/* 기록 저장소 — 이 기기 브라우저(localStorage). 서버 없음.
   숙련도는 "확신도 × 정오답"으로 움직인다([[judge-engine-confidence-axis]]):
     맞음·확실 → 1.0 / 맞음·긴가민가 → 0.7 / 틀림·긴가민가 → 0.25 / 틀림·확실 → 0 (잘못 알고 있음 — 가장 급함) */
(function () {
  const KEY = "modumath.v1";
  const blank = () => ({ grade: null, skin: "note", theme: "system", penOnly: true, xp: 0, days: [], att: {}, skill: {}, unit: {}, concept: {}, created: Date.now() });
  let S;
  try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { S = blank(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

  const TIERS = [
    { name: "브론즈", color: "#B87333", at: 0 },
    { name: "실버", color: "#9CA3AF", at: 300 },
    { name: "골드", color: "#E0A526", at: 900 },
    { name: "플래티넘", color: "#2BB6A6", at: 2000 },
    { name: "다이아", color: "#5B8CFF", at: 4000 },
  ];
  function tier(xp = S.xp) {
    let i = 0;
    while (i + 1 < TIERS.length && xp >= TIERS[i + 1].at) i++;
    const lo = TIERS[i].at, hi = TIERS[i + 1] ? TIERS[i + 1].at : lo + 3000;
    const span = (hi - lo) / 3, div = Math.min(2, Math.floor((xp - lo) / span));
    const dLo = lo + div * span, dHi = lo + (div + 1) * span;
    return { ...TIERS[i], idx: i, div: ["Ⅲ", "Ⅱ", "Ⅰ"][div], frac: (xp - dLo) / (dHi - dLo), next: Math.ceil(dHi - xp) };
  }

  function record(q, ok, conf, ms) {
    const t = Date.now();
    (S.att[q.id] = S.att[q.id] || []).push([t, ok ? 1 : 0, conf === "sure" ? 1 : 0, Math.round(ms / 1000)]);
    const target = ok ? (conf === "sure" ? 1 : 0.7) : (conf === "sure" ? 0 : 0.25);
    const w = 0.18 + 0.05 * (q.d || 3);
    (q.s || []).forEach((sid, i) => {
      const k = S.skill[sid] || (S.skill[sid] = { n: 0, ok: 0, m: 0.35, last: 0, miss: 0 });
      const wi = i === 0 ? w : w * 0.5;
      k.m = +(k.m + wi * (target - k.m)).toFixed(4);
      k.n++; k.ok += ok ? 1 : 0; k.last = t;
      if (!ok) k.miss = t;
    });
    if (q.u) { const u = S.unit[q.u] || (S.unit[q.u] = { n: 0, ok: 0 }); u.n++; u.ok += ok ? 1 : 0; }
    S.concept = S.concept || {};
    (q.cn || []).forEach((cid) => {
      const k = S.concept[cid] || (S.concept[cid] = { n: 0, ok: 0, m: 0.35 });
      k.m = +(k.m + w * (target - k.m)).toFixed(4); k.n++; k.ok += ok ? 1 : 0;
    });
    const d = today();
    if (!S.days.includes(d)) S.days.push(d);
    let gain = 0;
    if (ok) gain = 10 + 6 * (q.d || 3) + (conf === "sure" ? 4 : 0);
    S.xp += gain;
    save();
    return gain;
  }

  function streak() {
    const set = new Set(S.days);
    let n = 0; const d = new Date();
    if (!set.has(today())) d.setDate(d.getDate() - 1);
    for (;;) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!set.has(k)) break;
      n++; d.setDate(d.getDate() - 1);
    }
    return n;
  }
  function week() {
    const out = [], d = new Date(), set = new Set(S.days);
    const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow);
    for (let i = 0; i < 7; i++) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      out.push({ label: "월화수목금토일"[i], on: set.has(k), today: k === today() });
      d.setDate(d.getDate() + 1);
    }
    return out;
  }
  // 단계 풀이에서 처음 열어 본 단계 = 막힌 곳. 그 단계 스킬을 센다(숙련도도 조금 내린다 — 막혔으니)
  function stuck(q, idx, sid) {
    S.stuck = S.stuck || [];
    S.stuck.push([Date.now(), q.id, idx, sid || null]);
    if (S.stuck.length > 400) S.stuck = S.stuck.slice(-400);
    if (sid) {
      const k = S.skill[sid] || (S.skill[sid] = { n: 0, ok: 0, m: 0.35, last: 0, miss: 0 });
      k.stk = (k.stk || 0) + 1; k.m = +(k.m + 0.12 * (0.25 - k.m)).toFixed(4); k.miss = Date.now();
    }
    save();
  }
  // 풀이 관찰·오답 진단(coach.js)이 찾은 오류 — 종류: 공식(공식·정의 오해) 전략(엉뚱한 방법) 계산(산술) 조건(조건 오독).
  // 공식 오해는 '잘못 알고 있음'이라 숙련도를 더 내린다(확신×오답과 같은 이치). 부모 리포트·스킬 드릴이 읽는다.
  function mis(q, idx, kind, sid) {
    S.mis = S.mis || [];
    S.mis.push([Date.now(), q.id, idx == null ? null : idx, kind || null, sid || null]);
    if (S.mis.length > 400) S.mis = S.mis.slice(-400);
    if (sid) {
      const k = S.skill[sid] || (S.skill[sid] = { n: 0, ok: 0, m: 0.35, last: 0, miss: 0 });
      const drop = kind === "공식" ? 0.2 : kind === "계산" ? 0.05 : 0.12;
      k.mis = (k.mis || 0) + 1; k.m = +(k.m + drop * (0.2 - k.m)).toFixed(4); k.miss = Date.now();
    }
    save();
  }
  function seen(qid) { return (S.att[qid] || []).length; }
  function lastOk(qid) { const a = S.att[qid]; return a && a.length ? !!a[a.length - 1][1] : null; }

  window.STORE = {
    get s() { return S; }, save, record, stuck, mis, tier, streak, week, seen, lastOk, today, TIERS,
    set(k, v) { S[k] = v; save(); },
    reset() { const keep = { skin: S.skin, theme: S.theme }; S = Object.assign(blank(), keep); save(); },
    mastery(sid) { return S.skill[sid] ? S.skill[sid].m : null; },
  };
})();
