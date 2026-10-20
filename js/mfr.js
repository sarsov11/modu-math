/* 손글씨 수식 인식(2026-10-21) — 공개 모델 Pix2Text-MFR 1.5(MIT, TrOCR 구조)를 기기 안에서 돌린다. 서버·키 없음.
   linerec.js 는 획 모양 규칙 + 숫자 CNN 이라 글씨가 흘리면 못 읽고 문자(x)가 섞인 식은 아예 못 읽었다.
   이 모델은 사진으로 읽는다: 줄의 획을 흰 바탕 검은 글씨로 그려 384×384 로 넣으면 LaTeX 가 나온다.
   장준원 아이패드 영상 손글씨 5줄: -2(x-1)+3=-2x+5 를 4줄 정확, 1줄은 흘린 5 를 z 로 읽음(양자화본 31MB, PC 0.4초).
   모델은 처음 필요할 때 한 번 받는다(브라우저 캐시). 실패하면 조용히 빠지고 기존 linerec 결과를 쓴다.
   문항에 안 나오는 로마 글자(z 등)는 고르지 않는다 — 흘린 5 를 z 로 읽던 버릇(opts.letters = 허용 글자 문자열).
   MFR.recognize(strokes, { letters }) → Promise<string LaTeX> */
(function () {
  const ORT = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/";
  const DIR = "models/mfr/";
  const SIZE = 384, START = 1, EOS = 2, MAXLEN = 120;
  let loading = null, failed = false;

  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  function load() {
    if (loading) return loading;
    loading = (async () => {
      if (!window.ort) await loadScript(ORT + "ort.wasm.min.js");
      ort.env.wasm.wasmPaths = ORT;
      ort.env.wasm.numThreads = 1;   // GitHub Pages 는 교차 출처 격리가 없어 다중 스레드를 못 쓴다
      const opt = { executionProviders: ["wasm"], graphOptimizationLevel: "all" };
      const [enc, dec, vocab] = await Promise.all([
        ort.InferenceSession.create(DIR + "encoder_model.onnx", opt),
        ort.InferenceSession.create(DIR + "decoder_model.onnx", opt),
        fetch(DIR + "vocab.json").then((r) => r.json()),
      ]);
      const letterIds = {};   // 한 글자 로마자 토큰 id → 글자
      vocab.forEach((t, i) => { const m = t && /^Ġ?([A-Za-z])$/.exec(t); if (m) (letterIds[m[1]] = letterIds[m[1]] || []).push(i); });
      return { enc, dec, vocab, letterIds, byteDec: byteDecoder() };
    })().catch((e) => { failed = true; loading = null; throw e; });
    return loading;
  }

  // GPT-2 바이트 단위 BPE 토큰 → 글자
  function byteDecoder() {
    const bs = [];
    for (let i = 33; i <= 126; i++) bs.push(i);
    for (let i = 161; i <= 172; i++) bs.push(i);
    for (let i = 174; i <= 255; i++) bs.push(i);
    const cs = bs.slice();
    let n = 0;
    for (let b = 0; b < 256; b++) if (!bs.includes(b)) { bs.push(b); cs.push(256 + n++); }
    const m = {};
    bs.forEach((b, i) => { m[String.fromCharCode(cs[i])] = b; });
    return m;
  }
  function detok(ids, M) {
    const bytes = [];
    for (const id of ids) { const t = M.vocab[id]; if (t == null || /^<.*>$/.test(t)) continue; for (const ch of t) { const b = M.byteDec[ch]; if (b != null) bytes.push(b); } }
    return new TextDecoder().decode(new Uint8Array(bytes)).replace(/\s+/g, " ").trim();
  }

  // 획 → 흰 바탕 검은 글씨 384×384 (모델 전처리와 같이 비율 무시하고 늘림), 정규화 [-1, 1]
  function render(strokes) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const s of strokes) for (const p of s.pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    const h = Math.max(20, y1 - y0), w = Math.max(20, x1 - x0);
    const pad = h * 0.18, lw = Math.max(1.5, h * 0.06);
    // 짧은 답(숫자 한두 개)은 384×384 로 늘리면 옆으로 퍼져 못 읽는다 → 가로를 세로의 3.5배 이상으로 여백을 준다
    const c = document.createElement("canvas");
    c.height = Math.ceil(h + pad * 2); c.width = Math.ceil(Math.max(w + pad * 2, c.height * 3.5));
    const sx = (c.width - (w + pad * 2)) / 2;
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = "#000"; g.lineWidth = lw; g.lineCap = "round"; g.lineJoin = "round";
    for (const s of strokes) {
      g.beginPath();
      s.pts.forEach((p, i) => { const X = p[0] - x0 + pad + sx, Y = p[1] - y0 + pad; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
      if (s.pts.length === 1) g.lineTo(s.pts[0][0] - x0 + pad + sx + 0.1, s.pts[0][1] - y0 + pad);
      g.stroke();
    }
    const d = document.createElement("canvas");
    d.width = d.height = SIZE;
    const dg = d.getContext("2d");
    dg.imageSmoothingQuality = "high";
    dg.drawImage(c, 0, 0, SIZE, SIZE);
    const px = dg.getImageData(0, 0, SIZE, SIZE).data, N = SIZE * SIZE;
    const f = new Float32Array(3 * N);
    for (let i = 0; i < N; i++) for (let k = 0; k < 3; k++) f[k * N + i] = px[i * 4 + k] / 127.5 - 1;
    return f;
  }

  let queue = Promise.resolve();
  function recognize(strokes, opts) {
    const pen = (strokes || []).filter((s) => !s.tool || s.tool === "pen");
    if (!pen.length) return Promise.reject(new Error("EMPTY"));
    // 한 번에 하나씩(아이패드 메모리·발열)
    const job = queue.then(() => load()).then(async (M) => {
      const x = new ort.Tensor("float32", render(pen), [1, 3, SIZE, SIZE]);
      const eo = await M.enc.run({ [M.enc.inputNames[0]]: x });
      const hs = eo[M.enc.outputNames[0]];
      const ban = [];
      if (opts && opts.letters != null) for (const L in M.letterIds) if (!opts.letters.includes(L)) ban.push(...M.letterIds[L]);
      const ids = [START];
      for (let t = 0; t < MAXLEN; t++) {
        const inp = new ort.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]);
        const o = await M.dec.run({ input_ids: inp, encoder_hidden_states: hs });
        const lg = o[M.dec.outputNames[0]], V = lg.dims[2], off = (ids.length - 1) * V, a = lg.data;
        for (const b of ban) a[off + b] = -1e9;
        let best = 0, bv = -Infinity;
        for (let v = 0; v < V; v++) if (a[off + v] > bv) { bv = a[off + v]; best = v; }
        if (best === EOS) break;
        ids.push(best);
      }
      return detok(ids.slice(1), M);
    });
    queue = job.catch(() => {});
    return job;
  }

  window.MFR = { recognize, load, get failed() { return failed; } };
})();
