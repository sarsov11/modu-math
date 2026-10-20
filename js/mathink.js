/* 풀이 전체 인식(선택) — 벤치마킹 2안. 필기판의 획을 수식 인식 API 로 보내 LaTeX 로 받는다.
   ⚠ 채점에는 쓰지 않는다(식 단위 정확도가 채점에 못 미친다). 풀이를 활자로 옮겨 보여 주는 용도.
   키는 이 기기 브라우저에만 저장한다. 정식 서비스에서는 토큰만 내주는 서버리스 함수를 앞에 둔다.
   지원: Mathpix v3/strokes (app_id / app_key) */
(function () {
  const KEY = "modumath.mathpix";
  const get = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } };
  const set = (v) => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch (e) {} };

  async function recognize(strokes) {
    const k = get();
    if (!k || !k.app_id || !k.app_key) throw new Error("NO_KEY");
    const pen = strokes.filter((s) => s.tool === "pen");
    if (!pen.length) throw new Error("EMPTY");
    const body = { strokes: { strokes: { x: pen.map((s) => s.pts.map((p) => Math.round(p[0]))), y: pen.map((s) => s.pts.map((p) => Math.round(p[1]))) } } };
    const r = await fetch("https://api.mathpix.com/v3/strokes", {
      method: "POST", headers: { "Content-Type": "application/json", app_id: k.app_id, app_key: k.app_key }, body: JSON.stringify(body),
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j.latex_styled || (j.text || "").replace(/^\\\(|\\\)$/g, "");
  }
  window.MATHINK = { get, set, recognize, get enabled() { const k = get(); return !!(k && k.app_id && k.app_key); } };
})();
