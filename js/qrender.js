/* 문항 조판기 — 블록 → HTML. 문항은 크롭이 아니라 글로 싣는다([[question-text-over-crop]]).
   블록: ["p","글 $latex$"] | ["fig","파일"] | ["box",[블록]] | ["table",[[칸]]]
   화면마다 따로 조판하지 않는다 — 여기 한 곳. */
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // "$...$" 를 나눠 KaTeX 로. \$ 는 글자 달러.
  function inline(s) {
    if (s == null) return "";
    const out = [];
    let i = 0, buf = "";
    s = String(s);
    while (i < s.length) {
      const c = s[i];
      if (c === "\\" && s[i + 1] === "$") { buf += "$"; i += 2; continue; }
      if (c === "$") {
        const j = findClose(s, i + 1);
        if (j < 0) { buf += c; i++; continue; }
        if (buf) { out.push(esc(buf)); buf = ""; }
        out.push(tex(s.slice(i + 1, j)));
        i = j + 1; continue;
      }
      buf += c; i++;
    }
    if (buf) out.push(esc(buf));
    return out.join("");
  }
  function findClose(s, from) {
    for (let k = from; k < s.length; k++) {
      if (s[k] === "\\") { k++; continue; }
      if (s[k] === "$") return k;
    }
    return -1;
  }
  const cache = new Map();
  // 수식 안 한글('$1\sim9:\ 9개$')은 \text{} 로 감싸 글꼴·띄어쓰기를 살린다(이식 10-06 — 단계 풀이 식에 흔함). 이미 \text{…} 안이면 그대로.
  function hangulText(src) {
    if (!/[가-힣]/.test(src)) return src;
    const wrap = (s) => s.replace(/[가-힣]+(?:[ ~]+[가-힣]+)*/g, (t) => `\\text{${t}}`);
    const re = /\\(?:text|textrm|textbf|mathrm|mbox|operatorname)\{[^{}]*\}/g;
    let out = "", i = 0, m;
    while ((m = re.exec(src))) { out += wrap(src.slice(i, m.index)) + m[0]; i = re.lastIndex; }
    return out + wrap(src.slice(i));
  }
  function tex(src) {
    if (cache.has(src)) return cache.get(src);
    let html;
    try {
      html = window.katex.renderToString(hangulText(src), { throwOnError: true, strict: "ignore", output: "html" });
    } catch (e) {
      html = `<code class="tex-fail" title="${esc(e.message)}">${esc(src)}</code>`;
      (window.__texFails = window.__texFails || []).push(src);
    }
    if (cache.size > 4000) cache.clear();
    cache.set(src, html);
    return html;
  }

  function blocks(list, figBase) {
    if (!list) return "";
    return list.map((b) => block(b, figBase)).join("");
  }
  // 두 단으로 놓였던 <보기>가 한 줄로 붙어 온 것('$y=-5x+3$ㄴ. $y=…$')을 ㄱ·ㄴ·ㄷ 앞에서 끊는다(10-07, 은행 118문항). 수식 안은 건드리지 않는다
  function jamoSplit(s) {
    s = String(s);
    const out = [];
    let from = 0, math = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "\\") { i++; continue; }
      if (c === "$") { math = !math; continue; }
      if (math || i === 0 || !/[ㄱ-ㅎ]/.test(c) || s[i + 1] !== "." || !/[\s$]/.test(s[i + 2] || "")) continue;
      if (/[\s,(ㄱ-ㅎ]/.test(s[i - 1])) continue;
      out.push(s.slice(from, i));
      from = i;
    }
    out.push(s.slice(from));
    return out;
  }
  function block(b, figBase) {
    const [k, v] = b;
    if (k === "p") return jamoSplit(v).map((t) => `<p>${inline(t)}</p>`).join("");
    if (k === "fig") return `<div class="qfig"><img loading="lazy" alt="문항 그림" src="${esc((figBase || "") + v)}"></div>`;
    if (k === "box") return `<div class="qbox">${blocks(v, figBase)}</div>`;
    if (k === "table") return `<div class="qtable-wrap"><table class="qtable">${v.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</table></div>`;
    return "";
  }

  // 선지가 가리키는 ㄱ·ㄴ·ㄷ 이 지면에 실제로 있는가 — 없으면 못 푸는 문항이다
  function solvable(q) {
    const stem = q && (q.q || q.stem), ans = q && (q.a != null ? q.a : q.answer), kind = q && (q.k || q.answer_kind), ch = q && (q.ch || q.choices);
    if (!stem || !stem.length) return false;
    if (ans == null || ans === "") return false;
    if (kind === "choice" && !(ch && ch.length === 5)) return false;
    if (q.flag && q.flag.length) return false;
    const text = JSON.stringify(stem);
    const choiceText = (ch || []).join(" ");
    if (/[ㄱㄴㄷ](,|$|\s)/.test(choiceText) && !/ㄱ\s*[.．]/.test(text)) return false;
    if (/그림과 같이|그림은|다음 그림/.test(text) && !/"fig"/.test(text)) return false;
    return true;
  }

  window.QR = { inline, blocks, tex, solvable, esc };
})();
