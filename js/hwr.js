/* 손글씨 답 인식 — 서버 없음, 오프라인.
   벤치마킹 결론: 식 전체 인식은 채점에 못 쓴다(식 단위 ~60%). 그래서
   ① 획을 글자 덩어리로 묶고(가로 겹침) ② 숫자는 작은 CNN, '-' '.' 는 모양으로 ③ 분수선 위아래는 분자·분모.
   애매한 글자는 점선으로 표시하고, 누르면 후보(2~3순위)로 고친다(Apple 수학 메모 방식).
   채점 전에 "이렇게 읽었어요"를 반드시 보여 준다 — 인식 틀림이 오답으로 둔갑되지 않게. */
(function () {
  let NET = null, loading = null;

  function b64f32(b64) {
    const bin = atob(b64), n = bin.length, buf = new ArrayBuffer(n), u8 = new Uint8Array(buf);
    for (let i = 0; i < n; i++) u8[i] = bin.charCodeAt(i);
    return new Float32Array(buf);
  }
  function load() {
    if (NET) return Promise.resolve(NET);
    if (loading) return loading;
    loading = fetch("js/hwr_weights.json").then((r) => r.json()).then((j) => {
      const W = {};
      for (const k in j.W) W[k] = { shape: j.W[k].shape, d: b64f32(j.W[k].b64) };
      NET = { W, acc: j.test_acc };
      return NET;
    });
    return loading;
  }

  // ── CNN 추론 (conv3x3 pad1 → relu → maxpool2) ×3 → fc → relu → fc
  function conv(x, C, H, Wd, w, b) {
    const O = w.shape[0], out = new Float32Array(O * H * Wd), K = w.d, B = b.d;
    for (let o = 0; o < O; o++) {
      for (let y = 0; y < H; y++) for (let xx = 0; xx < Wd; xx++) {
        let s = B[o];
        for (let c = 0; c < C; c++) {
          const base = (o * C + c) * 9, xc = c * H * Wd;
          for (let ky = -1; ky <= 1; ky++) {
            const yy = y + ky; if (yy < 0 || yy >= H) continue;
            for (let kx = -1; kx <= 1; kx++) {
              const x2 = xx + kx; if (x2 < 0 || x2 >= Wd) continue;
              s += K[base + (ky + 1) * 3 + (kx + 1)] * x[xc + yy * Wd + x2];
            }
          }
        }
        out[o * H * Wd + y * Wd + xx] = s > 0 ? s : 0;
      }
    }
    return out;
  }
  function pool(x, C, H, Wd) {
    const h = H >> 1, w = Wd >> 1, out = new Float32Array(C * h * w);
    for (let c = 0; c < C; c++) for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
      let m = -1e9;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) m = Math.max(m, x[c * H * Wd + (y * 2 + dy) * Wd + xx * 2 + dx]);
      out[c * h * w + y * w + xx] = m;
    }
    return out;
  }
  function fc(x, w, b, relu) {
    const [O, I] = w.shape, out = new Float32Array(O);
    for (let o = 0; o < O; o++) { let s = b.d[o]; for (let i = 0; i < I; i++) s += w.d[o * I + i] * x[i]; out[o] = relu && s < 0 ? 0 : s; }
    return out;
  }
  function classify(img28) {
    const W = NET.W;
    let x = conv(img28, 1, 28, 28, W["c1.weight"], W["c1.bias"]); x = pool(x, 16, 28, 28);
    x = conv(x, 16, 14, 14, W["c2.weight"], W["c2.bias"]); x = pool(x, 32, 14, 14);
    x = conv(x, 32, 7, 7, W["c3.weight"], W["c3.bias"]); x = pool(x, 48, 7, 7);
    x = fc(x, W["f1.weight"], W["f1.bias"], true);
    const z = fc(x, W["f2.weight"], W["f2.bias"], false);
    const m = Math.max(...z), e = Array.from(z, (v) => Math.exp(v - m)), S = e.reduce((a, b) => a + b, 0);
    return e.map((v, i) => [String(i), v / S]).sort((a, b) => b[1] - a[1]);
  }

  // ── 획 묶기
  function bbox(strokes) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const s of strokes) for (const p of s.pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }
  function groupStrokes(strokes, lineH) {
    const items = strokes.map((s) => ({ strokes: [s], b: bbox([s]) })).sort((a, b) => a.b.x0 - b.b.x0);
    const groups = [];
    for (const it of items) {
      const g = groups.find((g) => {
        const ov = Math.min(g.b.x1, it.b.x1) - Math.max(g.b.x0, it.b.x0);
        const minw = Math.max(4, Math.min(g.b.w, it.b.w));
        return ov > minw * 0.45 || (ov > -lineH * 0.06 && (it.b.w < lineH * 0.12 || g.b.w < lineH * 0.12) && Math.abs(it.b.cy - g.b.cy) < lineH * 0.6);
      });
      if (g) { g.strokes.push(...it.strokes); g.b = bbox(g.strokes); } else groups.push(it);
    }
    return groups.sort((a, b) => a.b.x0 - b.b.x0);
  }

  // MNIST 식 전처리: bbox → 긴 변 20 → 무게중심을 28×28 가운데
  function raster(strokes, b) {
    const S = 112, cv = document.createElement("canvas"); cv.width = cv.height = S;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, S, S);
    const scale = (S * 0.72) / Math.max(b.w, b.h, 1);
    const ox = (S - b.w * scale) / 2 - b.x0 * scale, oy = (S - b.h * scale) / 2 - b.y0 * scale;
    ctx.strokeStyle = "#fff"; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(7, S * 0.085);
    for (const s of strokes) {
      ctx.beginPath();
      s.pts.forEach((p, i) => (i ? ctx.lineTo(p[0] * scale + ox, p[1] * scale + oy) : ctx.moveTo(p[0] * scale + ox, p[1] * scale + oy)));
      if (s.pts.length === 1) ctx.lineTo(s.pts[0][0] * scale + ox + 0.1, s.pts[0][1] * scale + oy);
      ctx.stroke();
    }
    // 112 → 20 영역으로 줄여 28 캔버스에 무게중심 정렬
    const small = document.createElement("canvas"); small.width = small.height = 28;
    const sc = small.getContext("2d");
    sc.fillStyle = "#000"; sc.fillRect(0, 0, 28, 28);
    sc.imageSmoothingEnabled = true; sc.imageSmoothingQuality = "high";
    const box = S * 0.72, off = (S - box) / 2, lw = ctx.lineWidth;
    sc.drawImage(cv, off - lw / 2, off - lw / 2, box + lw, box + lw, 4, 4, 20, 20);
    const d = sc.getImageData(0, 0, 28, 28).data;
    let m = 0, mx = 0, my = 0;
    const g = new Float32Array(784);
    for (let i = 0; i < 784; i++) { const v = d[i * 4] / 255; g[i] = v; m += v; mx += v * (i % 28); my += v * Math.floor(i / 28); }
    if (m < 1e-3) return g;
    const sx = Math.round(14 - mx / m), sy = Math.round(14 - my / m);
    const out = new Float32Array(784);
    for (let y = 0; y < 28; y++) for (let x = 0; x < 28; x++) {
      const yy = y - sy, xx = x - sx;
      if (yy >= 0 && yy < 28 && xx >= 0 && xx < 28) out[y * 28 + x] = g[yy * 28 + xx];
    }
    return out;
  }

  // 한 줄(분수 아닌) 읽기
  function readLine(strokes, lineH) {
    const groups = groupStrokes(strokes, lineH);
    const glyphs = [];
    for (const g of groups) {
      const b = g.b;
      if (b.w < lineH * 0.09 && b.h < lineH * 0.09) { glyphs.push({ ch: ".", p: 0.9, alts: [".", ","], b }); continue; }
      if (b.w > b.h * 2.4 && g.strokes.length === 1) { glyphs.push({ ch: "-", p: 0.92, alts: ["-", "1"], b }); continue; }
      const r = classify(raster(g.strokes, b));
      // 세로로 가는 한 획은 1 (MNIST 는 1 을 기울여 쓴 경우가 많아 보정)
      let top = r;
      if (g.strokes.length === 1 && b.h > b.w * 3.2) top = [["1", Math.max(r[0][0] === "1" ? r[0][1] : 0.85, 0.85)], ...r.filter((x) => x[0] !== "1")];
      glyphs.push({ ch: top[0][0], p: top[0][1], alts: top.slice(0, 3).map((x) => x[0]), b });
    }
    return glyphs;
  }

  // 분수 판정: 가로로 긴 한 획 위·아래에 글자가 있으면 분자/분모
  function recognize(strokes, H) {
    if (!NET || !strokes.length) return { text: "", glyphs: [], frac: null };
    const lineH = H * 0.6;
    const bars = strokes.filter((s) => { const b = bbox([s]); return b.w > b.h * 5 && b.w > H * 0.25; });
    for (const bar of bars) {
      const bb = bbox([bar]);
      const others = strokes.filter((s) => s !== bar);
      const above = others.filter((s) => { const b = bbox([s]); return b.cy < bb.cy - 4 && b.cx > bb.x0 - 10 && b.cx < bb.x1 + 10; });
      const below = others.filter((s) => { const b = bbox([s]); return b.cy > bb.cy + 4 && b.cx > bb.x0 - 10 && b.cx < bb.x1 + 10; });
      const lead = others.filter((s) => !above.includes(s) && !below.includes(s) && bbox([s]).x1 < bb.x0);
      if (above.length && below.length) {
        const n = readLine(above, lineH / 1.6), d = readLine(below, lineH / 1.6), l = readLine(lead, lineH);
        const sign = l.map((g) => g.ch).join("");
        const text = `${sign}${n.map((g) => g.ch).join("")}/${d.map((g) => g.ch).join("")}`;
        return { text, glyphs: [...l, ...n, { ch: "/", p: 1, alts: ["/"] }, ...d], frac: { num: n, den: d, sign } };
      }
    }
    const glyphs = readLine(strokes, lineH);
    return { text: glyphs.map((g) => g.ch).join(""), glyphs, frac: null };
  }

  // 답 비교: "12" == "12", "-3/4" == "-\frac{3}{4}", "0.5" == "1/2"
  function normAnswer(s) {
    if (s == null) return "";
    let t = String(s).replace(/\$/g, "").replace(/\\left|\\right|\s|\\,|\\ /g, "");
    t = t.replace(/\\[dt]?frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2");
    // 단위·꾸밈 떼기: 49 cm², 68°, 52개, x=3
    t = t.replace(/\\mathrm\{[^{}]*\}(\^\{?\d\}?)?/g, "").replace(/\^\{?\\circ\}?|°/g, "");
    t = t.replace(/(cm|mm|km|m|kg|g|L|mL|개|가지|명|번|원|초|분|시간|일|배|점|권|자루|장|대|쌍|%)(\^\{?\d\}?|²|³)?$/g, "");
    t = t.replace(/^[a-zA-Z]=/, "").replace(/[{}]/g, "").replace(/−/g, "-");
    return t;
  }
  // 손글씨·키패드로 채점할 수 있는 답인가(수 하나: 정수·소수·분수·음수)
  function gradable(key) {
    return /^-?\d+(?:\.\d+)?(?:\/-?\d+(?:\.\d+)?)?$/.test(normAnswer(key));
  }
  function sameAnswer(user, key) {
    const a = normAnswer(user), b = normAnswer(key);
    if (a === b) return true;
    const val = (x) => { const m = x.match(/^(-?\d+(?:\.\d+)?)(?:\/(-?\d+(?:\.\d+)?))?$/); return m ? (m[2] ? +m[1] / +m[2] : +m[1]) : NaN; };
    const va = val(a), vb = val(b);
    return !isNaN(va) && !isNaN(vb) && Math.abs(va - vb) < 1e-9;
  }

  window.HWR = { load, recognize, sameAnswer, normAnswer, gradable, classify, raster, get ready() { return !!NET; } };
})();
