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

  function blocks(list, figBase, inBox) {
    if (!list) return "";
    return list.map((b) => block(b, figBase, inBox)).join("");
  }
  // 한 문단으로 붙어 온 <보기>·조건·사건 정의를 줄로 끊는다(10-07 ㄱㄴㄷ 118문항 → 10-25 보기검수 공통 규칙). 수식 안은 건드리지 않는다.
  //  ㄱ. ㄴ. 앞 — 어디서나. 「<보기>」 이름표 — 어디서나 제 줄로.
  //  (가)(나)…·㉠㉡…·「$A$ :」 — 상자 안 문단이 그 표지로 시작할 때만, 다음 차례 표지 앞에서(빈칸 채우기 (가)는 안 끊긴다)
  const GA = "가나다라마바사아자차", CIR = "㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩㉪㉫㉬㉭";
  function lineSplit(s, inBox) {
    s = String(s).replace(/\$\\text\{([ㄱ-ㅎ])\}\$/g, "$1")   // 「$\text{ㄱ}$. …」 꼴 보기 머리
      .replace(/(^|\s)[〈<＜\[]\s*보\s*기\s*[〉>＞\]](?=\s*(ㄱ\s*[.．]|㉠|\(가\)|$))/g, "$1<보기>");   // 〈보기〉·[보 기] 이름표를 한 꼴로

    const cuts = [];
    const head = s.replace(/^\s*<보기>\s*/, "");
    let gaNext = inBox && /^\(가\)/.test(head) ? 1 : -1;
    let cirNext = inBox && /^㉠\s+[^,，\s]/.test(head) ? 1 : -1;   // 「㉠, ㉡, ㉢에서」 같은 증명 글은 끊지 않는다
    const defMode = inBox && /^\$[A-Z]\$\s*[:：]/.test(head);
    let math = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "\\") { i++; continue; }
      if (c === "$") {
        if (!math && defMode && i > 0 && /^\$[A-Z]\$\s*[:：]/.test(s.slice(i)) && /\s/.test(s[i - 1])) cuts.push(i);
        math = !math; continue;
      }
      if (math) continue;
      const prev = s[i - 1] || "";
      if (s.startsWith("<보기>", i) && /^\s*(ㄱ\s*[.．]|㉠|\(가\)|$)/.test(s.slice(i + 4))) { if (i > 0) cuts.push(i); cuts.push(i + 4); continue; }   // 발문 속 「<보기>에서」는 그대로
      if (i > 0 && /[ㄱ-ㅎ]/.test(c) && s[i + 1] === "." && /[\s$]/.test(s[i + 2] || "") && !/[(\[A-Za-zㄱ-ㅎ,]/.test(prev)) { cuts.push(i); continue; }
      if (gaNext > 0 && gaNext < GA.length && s.startsWith("(" + GA[gaNext] + ")", i) && /[\s.$]/.test(prev)) { cuts.push(i); gaNext++; continue; }
      if (cirNext > 0 && cirNext < CIR.length && c === CIR[cirNext] && /\s/.test(s[i + 1] || "")) { cuts.push(i); cirNext++; continue; }
    }
    const out = [];
    let from = 0;
    for (const k of [...new Set(cuts)].sort((x, y) => x - y)) { if (k > from) out.push(s.slice(from, k)); from = Math.max(from, k); }
    out.push(s.slice(from));
    return out.map((t) => t.trim()).filter(Boolean);
  }
  // HWP 보기 상자가 표로 들어온 것(머리 칸 「〈 보 기 〉」 + 긴 글 칸) — 표로 그리면 ㄱ·ㄴ·ㄷ 이 한 칸에 뭉친다
  const BOGI_HEAD = /^\s*[〈<＜\[|(]?\s*(보\s*기|조\s*건)\s*[〉>＞\]|)]?\s*$/;
  const BOX_START = /^\s*(ㄱ\s*[.．]|\(가\)|㉠)/;
  function isBogiTable(v) {
    if (!Array.isArray(v)) return false;
    const cells = v.flat().map((c) => String(c || "").trim()).filter(Boolean);
    if (cells.some((c) => BOGI_HEAD.test(c)) && cells.some((c) => BOX_START.test(c))) return true;
    return cells.length <= 2 && cells.some((c) => BOX_START.test(c) && c.length > 30);   // 머리 없이 긴 글 한 칸뿐인 틀 표
  }
  function bogiTable(v, figBase) {
    const cells = v.flat().map((c) => String(c || "").trim()).filter(Boolean);
    const body = cells.filter((c) => !BOGI_HEAD.test(c));
    const head = cells.find((c) => BOGI_HEAD.test(c));
    const name = /^\s*ㄱ\s*[.．]/.test(body[0] || "") ? "보기" : head ? head.replace(/[^가-힣]/g, "") : "";
    return `<div class="qbox">${name ? `<p class="bogi-h">&lt;${name}&gt;</p>` : ""}${body.map((c) => block(["p", c], figBase, true)).join("")}</div>`;
  }
  function block(b, figBase, inBox) {
    const [k, v] = b;
    if (k === "p") return lineSplit(v, inBox).map((t) => t === "<보기>" ? `<p class="bogi-h">&lt;보기&gt;</p>` : `<p>${inline(t)}</p>`).join("");
    if (k === "fig") return `<div class="qfig"><img loading="lazy" alt="문항 그림" src="${esc((figBase || "") + v)}"></div>`;
    if (k === "box") return `<div class="qbox">${blocks(v, figBase, true)}</div>`;
    if (k === "table" && isBogiTable(v)) return bogiTable(v, figBase);
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
    if (/그림과 같|그림은|그림에서|다음 그림|아래 그림/.test(text) && !/"fig"/.test(text)) return false;   // 10-25 보기검수: 「그림에서」「그림과 같은」도 그림이 없으면 못 푼다
    return true;
  }

  window.QR = { inline, blocks, tex, solvable, esc };
})();
