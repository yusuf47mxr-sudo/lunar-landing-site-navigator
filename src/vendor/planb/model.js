// Hesap motoru: Python pipeline ile ayni geometri (geometry.py, horizon.py, 06_grid_check.py).
// Tanimlar (ORTAK BAGLAM): f = gorunen Gunes diski orani; aydinlik f > 0.5; Dunya gorunur: merkez > ufuk + eps.
(function (g) {
  // Sabitler ve tanimlar pipeline/physics.py ile AYNI
  const R_MOON_KM = 1737.4, R_M = 1737400, SUN_R_DEG = 0.2666, D2R = Math.PI / 180, P0 = 1361;
  const R_SUN_KM = 695700, AU_KM = 149597870.7;
  // Ufkun ustunde kalan disk orani (daire dilimi). d = (el - H)/rho
  function diskFraction(el, hor, rho) {
    const d = Math.max(-1, Math.min(1, (el - hor) / rho));
    return 1 - (Math.acos(d) - d * Math.sqrt(1 - d * d)) / Math.PI;
  }
  function sunRadiusDeg(eph, i) { return eph.au ? Math.asin(R_SUN_KM / (eph.au[i] * AU_KM)) / D2R : SUN_R_DEG; }

  function loadEphem(j) {
    return { n: j.n, t0: Date.parse(j.start_utc + "Z"), stepMs: j.step_s * 1000,
      sun: Float64Array.from(j.sun_dir), earth: Float64Array.from(j.earth_km),
      au: j.sun_au ? Float32Array.from(j.sun_au) : null };
  }
  function basis(lat, lon) {
    const p = lat * D2R, l = lon * D2R;
    return { e: [-Math.sin(l), Math.cos(l), 0],
      n: [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)],
      u: [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)] };
  }
  function siteVec(s) {
    const r = R_MOON_KM + (s.ground_m + s.mast_m) / 1000, b = basis(s.lat, s.lon);
    return [r * b.u[0], r * b.u[1], r * b.u[2]];
  }
  function azel(x, y, z, b) {
    const ex = x * b.e[0] + y * b.e[1] + z * b.e[2];
    const ny = x * b.n[0] + y * b.n[1] + z * b.n[2];
    const uz = x * b.u[0] + y * b.u[1] + z * b.u[2];
    let az = Math.atan2(ex, ny) / D2R; if (az < 0) az += 360;
    return [az, Math.atan2(uz, Math.hypot(ex, ny)) / D2R];
  }
  function horizonAt(h, az) {
    const n = h.length, x = (az / 360) * n, i = Math.floor(x) % n, f = x - Math.floor(x);
    return h[i] * (1 - f) + h[(i + 1) % n] * f;
  }
  function indexOf(eph, ms) { return Math.max(0, Math.min(eph.n - 1, Math.round((ms - eph.t0) / eph.stepMs))); }

  // Tek saat: {sa, se, sh, f, ea, ee, eh, up}
  function at(eph, s, i, b, sv, margin) {
    const h = s.horizon_deg;
    const [sa, se] = azel(eph.sun[3 * i], eph.sun[3 * i + 1], eph.sun[3 * i + 2], b);
    const sh = horizonAt(h, sa);
    const [ea, ee] = azel(eph.earth[3 * i] - sv[0], eph.earth[3 * i + 1] - sv[1], eph.earth[3 * i + 2] - sv[2], b);
    const eh = horizonAt(h, ea);
    return { sa, se, sh, f: diskFraction(se, sh, sunRadiusDeg(eph, i)), ea, ee, eh, up: ee - eh > margin ? 1 : 0 };
  }

  // i0..i1 saat araliginda site analizi (opt.earthMarginDeg varsayilan 2 derece)
  function analyze(eph, s, i0, i1, opt) {
    opt = opt || {}; const margin = opt.earthMarginDeg == null ? 2 : opt.earthMarginDeg;
    const b = basis(s.lat, s.lon), sv = siteVec(s), N = i1 - i0;
    const r = { sunAz: new Float32Array(N), sunEl: new Float32Array(N), sunFrac: new Float32Array(N),
      sunHor: new Float32Array(N), earthAz: new Float32Array(N), earthEl: new Float32Array(N),
      earthUp: new Uint8Array(N), earthHor: new Float32Array(N) };
    for (let k = 0; k < N; k++) {
      const q = at(eph, s, i0 + k, b, sv, margin);
      r.sunAz[k] = q.sa; r.sunEl[k] = q.se; r.sunHor[k] = q.sh; r.sunFrac[k] = q.f;
      r.earthAz[k] = q.ea; r.earthEl[k] = q.ee; r.earthHor[k] = q.eh; r.earthUp[k] = q.up;
    }
    let sun = 0, earth = 0, both = 0;
    for (let k = 0; k < N; k++) { const lit = r.sunFrac[k] > 0.5; sun += r.sunFrac[k]; earth += r.earthUp[k]; both += (lit && r.earthUp[k]) ? 1 : 0; }
    r.sunPct = 100 * sun / N; r.earthPct = 100 * earth / N; r.bothPct = 100 * both / N;
    r.dark = longest(k => r.sunFrac[k] <= 0.5, N);
    r.noEarth = longest(k => !r.earthUp[k], N);
    r.i0 = i0; r.N = N; r.margin = margin;
    return r;
  }
  function longest(pred, N) {
    let best = { len: 0, start: -1 }, cur = 0, st = 0;
    for (let k = 0; k < N; k++) {
      if (pred(k)) { if (!cur) st = k; cur++; if (cur > best.len) best = { len: cur, start: st }; } else cur = 0;
    }
    return best;
  }
  function compass(az) {
    return ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"][Math.round(az / 45) % 8];
  }
  function why(r, run, kind) {
    if (run.len === 0) return null;
    let below = 0, blocked = 0, azs = 0, azc = 0;
    for (let k = run.start; k < run.start + run.len; k++) {
      const el = kind === "sun" ? r.sunEl[k] : r.earthEl[k], hz = kind === "sun" ? r.sunHor[k] : r.earthHor[k];
      const az = kind === "sun" ? r.sunAz[k] : r.earthAz[k];
      if (el < 0) below++; else if (el < hz + (kind === "sun" ? SUN_R_DEG : 0)) { blocked++; azs += Math.sin(az * D2R); azc += Math.cos(az * D2R); }
    }
    const dir = blocked ? compass(((Math.atan2(azs, azc) / D2R) + 360) % 360) : null;
    return { belowPct: 100 * below / run.len, terrainPct: 100 * blocked / run.len, dir };
  }

  // Pencereler (physics.py windows ile ayni): g > 0 olan araliklar, kenarlar dogrusal enterpolasyonla (kesirli saat)
  // Gunes: g = el - H(az)  (f > 0.5 ile ayni);  Dunya: g = el - H(az) - eps
  function windows(g) {
    const out = []; let start = g[0] > 0 ? 0 : null;
    for (let k = 0; k + 1 < g.length; k++) {
      if ((g[k] > 0) !== (g[k + 1] > 0)) {
        const t = k + g[k] / (g[k] - g[k + 1]);
        if (g[k + 1] > 0) start = t; else if (start !== null) { out.push([start, t]); start = null; }
      }
    }
    if (start !== null) out.push([start, g.length - 1]);
    return out;
  }
  function sunG(r) { const g = new Float64Array(r.N); for (let k = 0; k < r.N; k++) g[k] = r.sunEl[k] - r.sunHor[k]; return g; }
  function earthG(r) { const g = new Float64Array(r.N); for (let k = 0; k < r.N; k++) g[k] = r.earthEl[k] - r.earthHor[k] - r.margin; return g; }

  // Saat ici hassaslastirma: k ile k+1 arasinda Gunes yonu / Dunya vektoru dogrusal ara degerlenir (hareket puruzsuz),
  // ufuk H(az) her alt adimda gercek profilden okunur; 1 dk adimla isaret degisimi + dogrusal enterpolasyon.
  function refine(eph, s, k, body, margin, b, sv) {
    let prev = null;
    for (let m = 0; m <= 60; m++) {
      const w = m / 60, i0 = 3 * k, i1 = 3 * (k + 1);
      let x, y, z;
      if (body === "sun") { x = eph.sun[i0] * (1 - w) + eph.sun[i1] * w; y = eph.sun[i0 + 1] * (1 - w) + eph.sun[i1 + 1] * w; z = eph.sun[i0 + 2] * (1 - w) + eph.sun[i1 + 2] * w; }
      else { x = eph.earth[i0] * (1 - w) + eph.earth[i1] * w - sv[0]; y = eph.earth[i0 + 1] * (1 - w) + eph.earth[i1 + 1] * w - sv[1]; z = eph.earth[i0 + 2] * (1 - w) + eph.earth[i1 + 2] * w - sv[2]; }
      const [az, el] = azel(x, y, z, b), g = el - horizonAt(s.horizon_deg, az) - (body === "earth" ? margin : 0);
      if (prev !== null && (g > 0) !== (prev > 0)) return k + (m - 1 + prev / (prev - g)) / 60;
      prev = g;
    }
    return null;
  }

  // Secilen saatten sonra ilk degisim (kesirli saat, dakika hassasiyeti): gun batimi/dogumu, Dunya batimi/dogumu.
  function nextEvents(eph, s, i, opt) {
    opt = opt || {}; const margin = opt.earthMarginDeg == null ? 2 : opt.earthMarginDeg, maxH = opt.maxH || 24 * 60;
    const b = basis(s.lat, s.lon), sv = siteVec(s), q0 = at(eph, s, i, b, sv, margin);
    let gs0 = q0.se - q0.sh, ge0 = q0.ee - q0.eh - margin;
    const sunUp = gs0 > 0, earthUp = ge0 > 0; let sunH = null, earthH = null;
    for (let k = 1; k <= maxH && i + k < eph.n && (sunH === null || earthH === null); k++) {
      const q = at(eph, s, i + k, b, sv, margin), gs = q.se - q.sh, ge = q.ee - q.eh - margin;
      if (sunH === null && (gs > 0) !== sunUp) { const t = refine(eph, s, i + k - 1, "sun", margin, b, sv); sunH = (t === null ? i + k - 1 + gs0 / (gs0 - gs) : t) - i; }
      if (earthH === null && (ge > 0) !== earthUp) { const t = refine(eph, s, i + k - 1, "earth", margin, b, sv); earthH = (t === null ? i + k - 1 + ge0 / (ge0 - ge) : t) - i; }
      gs0 = gs; ge0 = ge;
    }
    return { sunUp, earthUp, sunH, earthH, sunEl: q0.se, sunAz: q0.sa, sunHor: q0.sh, sunFrac: q0.f,
      earthEl: q0.ee, earthAz: q0.ea, earthHor: q0.eh, maxH };
  }

  // Guc (W): P0*(1/au)^2*eta*S*f*yon. mode: "track" (Gunesi izleyen), "vertical" (yuzu azPanel), "flat" (yatay)
  function power(eph, r, opt) {
    opt = opt || {}; const eta = opt.eta == null ? 0.30 : opt.eta, S = opt.area == null ? 1 : opt.area, mode = opt.mode || "track";
    const azp = (opt.azPanel || 0) * D2R, out = new Float32Array(r.N); let E = 0;
    for (let k = 0; k < r.N; k++) {
      const au = eph.au ? eph.au[r.i0 + k] : 1, el = r.sunEl[k] * D2R;
      let c = 1;
      if (mode === "vertical") c = Math.max(0, Math.cos(el) * Math.cos(r.sunAz[k] * D2R - azp));
      else if (mode === "flat") c = Math.max(0, Math.sin(el));
      out[k] = P0 / (au * au) * eta * S * r.sunFrac[k] * c; E += out[k];
    }
    return { watts: out, kWh: E / 1000, meanW: E / r.N };
  }

  // Site x baslangic gunu matrisi (tarih isi haritasi). Bir kez tum saatler hesaplanir, sonra pencereler.
  function hourly(eph, s, margin) {
    const b = basis(s.lat, s.lon), sv = siteVec(s), f = new Float32Array(eph.n), up = new Uint8Array(eph.n);
    for (let i = 0; i < eph.n; i++) { const q = at(eph, s, i, b, sv, margin); f[i] = q.f; up[i] = q.up; }
    return { f, up };
  }
  function windowStats(H, i0, N) {
    let sun = 0, earth = 0, both = 0, d = 0, dm = 0, e = 0, em = 0;
    for (let k = i0; k < i0 + N; k++) {
      sun += H.f[k]; earth += H.up[k]; if (H.f[k] > 0.5 && H.up[k]) both++;
      d = H.f[k] <= 0.5 ? d + 1 : 0; if (d > dm) dm = d;
      e = H.up[k] ? 0 : e + 1; if (e > em) em = e;
    }
    const sunPct = 100 * sun / N, earthPct = 100 * earth / N;
    return { sunPct, earthPct, bothPct: 100 * both / N, darkH: dm, noEarthH: em, score: sunPct + earthPct - 100 * (dm + em) / N };
  }

  // Alternatif tarih bulucu: [from, to) araliginda her stepH saatte bir baslangic dener; kisitlari saglayanlari dondurur.
  // opt: {days, from, to (saat indeksi), stepH=24, minSunPct, maxDarkH, minEarthPct, maxNoEarthH, minBothPct, earthMarginDeg=2, count=5}
  // Hicbiri saglamazsa 'closest': puana gore en iyi count tarih (kullaniciya "kosul saglanamadi, en yakinlar bunlar" denir).
  function findDates(eph, s, opt) {
    const m = opt.earthMarginDeg == null ? 2 : opt.earthMarginDeg, N = opt.days * 24, step = opt.stepH || 24, count = opt.count || 5;
    const H = opt.hourly || hourly(eph, s, m), from = Math.max(0, opt.from || 0), to = Math.min(eph.n - N, opt.to == null ? eph.n - N : opt.to);
    const ok = (w) => (opt.minSunPct == null || w.sunPct >= opt.minSunPct) && (opt.maxDarkH == null || w.darkH <= opt.maxDarkH) &&
      (opt.minEarthPct == null || w.earthPct >= opt.minEarthPct) && (opt.maxNoEarthH == null || w.noEarthH <= opt.maxNoEarthH) &&
      (opt.minBothPct == null || w.bothPct >= opt.minBothPct);
    const hits = [], all = [];
    for (let i = from; i <= to; i += step) {
      const w = windowStats(H, i, N); w.i = i; w.startMs = eph.t0 + i * eph.stepMs;
      if (ok(w)) { hits.push(w); if (hits.length >= count) break; } else all.push(w);
    }
    if (hits.length) return { found: true, dates: hits };
    all.sort((a, b) => b.score - a.score);
    return { found: false, dates: all.slice(0, count) };
  }

  // Bolgede alternatif site: region_points_<Bolge>.json noktalarini [i0, i1) icin analiz eder.
  // opt: {slopeMax=10, earthMarginDeg=2, count=5}. Donus: puana gore siralanmis en iyi noktalar (egim sarti saglayanlar).
  // puan = Gunes% + Dunya% - 100*(en uzun karanlik + en uzun Dunya'siz)/N  (09_region_scan ile ayni)
  function bestInRegion(eph, RP, i0, i1, opt) {
    opt = opt || {}; const m = opt.earthMarginDeg == null ? 2 : opt.earthMarginDeg, smax = opt.slopeMax == null ? 10 : opt.slopeMax;
    const nA = RP.n_az, N = i1 - i0, res = [], hor = new Float32Array(nA);
    for (let k = 0; k < RP.n; k++) {
      if (!(RP.slope_deg[k] < smax)) continue;
      for (let a = 0; a < nA; a++) hor[a] = RP.horizon_cdeg[k * nA + a] / 100;
      const p = { lat: RP.lat[k], lon: RP.lon[k], ground_m: RP.ground_m[k], mast_m: 2, horizon_deg: hor };
      const b = basis(p.lat, p.lon), sv = siteVec(p), H = { f: new Float32Array(N), up: new Uint8Array(N) };
      for (let q = 0; q < N; q++) { const z = at(eph, p, i0 + q, b, sv, m); H.f[q] = z.f; H.up[q] = z.up; }
      const w = windowStats(H, 0, N); w.k = k; w.lat = p.lat; w.lon = p.lon; w.slope = RP.slope_deg[k]; res.push(w);
    }
    res.sort((a, b) => b.score - a.score);
    return res.slice(0, opt.count || 5);
  }

  // Belirsizlik araligi: ufuk +sigma (kotu durum) ve -sigma (iyi durum) ile ayni analiz. horizon_err_deg yoksa null.
  function analyzeRange(eph, s, i0, i1, opt) {
    if (!s.horizon_err_deg) return null;
    const h = s.horizon_deg, e = s.horizon_err_deg, hiH = new Float32Array(h.length), loH = new Float32Array(h.length);
    for (let k = 0; k < h.length; k++) { hiH[k] = h[k] + e[k]; loH[k] = h[k] - e[k]; }
    const sum = (r) => ({ sunPct: r.sunPct, earthPct: r.earthPct, bothPct: r.bothPct, darkH: r.dark.len, noEarthH: r.noEarth.len });
    return { worse: sum(analyze(eph, Object.assign({}, s, { horizon_deg: hiH }), i0, i1, opt)),
             better: sum(analyze(eph, Object.assign({}, s, { horizon_deg: loH }), i0, i1, opt)) };
  }

  // Tarayicida ufuk: kaba kutup DEM'i (11_coarse_dem.py) ile, horizon.py ile ayni isin yontemi.
  function demSample(D, lat, lon) {
    const rho = 2 * R_M * Math.tan(Math.PI / 4 + lat * D2R / 2), x = rho * Math.sin(lon * D2R), y = rho * Math.cos(lon * D2R);
    const c = (x - D.x0) / D.pixel_m - 0.5, r = (D.y0 - y) / D.pixel_m - 0.5;
    const c0 = Math.floor(c), r0 = Math.floor(r);
    if (c0 < 0 || r0 < 0 || c0 + 1 >= D.width || r0 + 1 >= D.height) return NaN;
    const fx = c - c0, fy = r - r0, z = D.z, w = D.width;
    return (z[r0 * w + c0] * (1 - fx) + z[r0 * w + c0 + 1] * fx) * (1 - fy) + (z[(r0 + 1) * w + c0] * (1 - fx) + z[(r0 + 1) * w + c0 + 1] * fx) * fy;
  }
  function horizonFromDem(D, lat, lon, opt) {
    opt = opt || {}; const nAz = opt.nAz || 720, mast = opt.mast == null ? 2 : opt.mast, maxKm = opt.maxKm || 250;
    const ds = []; for (let d = 800; d < 2000; d += 400) ds.push(d);
    for (let k = 0; k < 300; k++) ds.push(2000 * Math.pow(maxKm * 1000 / 2000, k / 299));
    const z0 = demSample(D, lat, lon); if (!isFinite(z0)) return null;
    const h0 = z0 + mast, p1 = lat * D2R, l1 = lon * D2R, hor = new Float32Array(nAz), blk = new Float32Array(nAz);
    for (let a = 0; a < nAz; a++) {
      const th = a * 2 * Math.PI / nAz; let best = -90, bd = 0;
      for (const d of ds) {
        const dd = d / R_M, p2 = Math.asin(Math.sin(p1) * Math.cos(dd) + Math.cos(p1) * Math.sin(dd) * Math.cos(th));
        const l2 = l1 + Math.atan2(Math.sin(th) * Math.sin(dd) * Math.cos(p1), Math.cos(dd) - Math.sin(p1) * Math.sin(p2));
        const z = demSample(D, p2 / D2R, l2 / D2R); if (!isFinite(z)) continue;
        const rt = R_M + z, r0 = R_M + h0, ang = Math.atan2(rt * Math.cos(dd) - r0, rt * Math.sin(dd)) / D2R;
        if (ang > best) { best = ang; bd = d; }
      }
      hor[a] = best; blk[a] = bd / 1000;
    }
    return { lat, lon, ground_m: z0, mast_m: mast, horizon_deg: hor, blocker_km: blk, horizon: "coarse" };
  }


  // ---- Inis basari olasiligi (docs/FIZIK_VE_DENKLEMLER.md bolum 16; Python: pipeline/23_landing_odds.py) ----
  // Normal dagilim CDF'i: erf, Abramowitz-Stegun 7.1.26 (|hata| < 1.5e-7)
  function erf(x) {
    const s = x < 0 ? -1 : 1; x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
  // Izgaranin her dugumu icin [i0,i1) araliginda en uzun karanlik / Dunyasiz (saat) ve Gunes %
  function landingNodes(eph, G, i0, i1, opt) {
    opt = opt || {}; const m = opt.earthMarginDeg == null ? 2 : opt.earthMarginDeg;
    const K = G.n * G.n, nA = G.n_az, N = i1 - i0, hor = new Float32Array(nA);
    const dark = new Int32Array(K), noEarth = new Int32Array(K), sunPct = new Float64Array(K);
    const f = new Float32Array(N), up = new Uint8Array(N);
    const keep = !!opt.keepHourly, litH = keep ? new Uint8Array(K * N) : null, upH = keep ? new Uint8Array(K * N) : null;
    for (let k = 0; k < K; k++) {
      for (let a = 0; a < nA; a++) hor[a] = G.horizon_cdeg[k * nA + a] / 100;
      const p = { lat: G.lat[k], lon: G.lon[k], ground_m: G.ground_m[k], mast_m: 2, horizon_deg: hor };
      const b = basis(p.lat, p.lon), sv = siteVec(p); let sum = 0;
      for (let q = 0; q < N; q++) { const z = at(eph, p, i0 + q, b, sv, m); f[q] = z.f; up[q] = z.up; sum += z.f; }
      dark[k] = longest(q => f[q] <= 0.5, N).len; noEarth[k] = longest(q => !up[q], N).len; sunPct[k] = 100 * sum / N;
      if (keep) for (let q = 0; q < N; q++) { litH[k * N + q] = f[q] > 0.5 ? 1 : 0; upH[k * N + q] = up[q]; }
    }
    return { dark, noEarth, sunPct, i0, i1, margin: m, N, litH, upH };
  }
  function cellMasses(G, ti, tj, sigma) {
    const n = G.n, sp = G.spacing_m, h = Math.floor(n / 2), mx = new Float64Array(n), my = new Float64Array(n);
    for (let q = 0; q < n; q++) {
      const c = (q - h) * sp;
      mx[q] = Phi((c + sp / 2 - (ti - h) * sp) / sigma) - Phi((c - sp / 2 - (ti - h) * sp) / sigma);
      my[q] = Phi((c + sp / 2 - (tj - h) * sp) / sigma) - Phi((c - sp / 2 - (tj - h) * sp) / sigma);
    }
    return { mx, my };
  }
  // opt: {sigmaM, slopeMax, batteryH, bufferH, target:{i,j} (varsayilan merkez), best (5), mcN (0 = yok), seed}
  // Donus: {pLow, pHigh, outside, reasons:{slope,dark,noEarth}, ok:Uint8Array, nOk, best:[{i,j,k,lat,lon,pLow,distM}], mc}
  function landingOdds(G, nodes, opt) {
    opt = opt || {}; const n = G.n, K = n * n, h = Math.floor(n / 2), sp = G.spacing_m;
    const sigma = opt.sigmaM || 100, smax = opt.slopeMax == null ? 10 : opt.slopeMax;
    const batt = opt.batteryH == null ? 50 : opt.batteryH, buf = opt.bufferH == null ? 24 : opt.bufferH;
    const ti = opt.target ? opt.target.i : h, tj = opt.target ? opt.target.j : h;
    const fS = new Uint8Array(K), fD = new Uint8Array(K), fE = new Uint8Array(K), ok = new Uint8Array(K); let nOk = 0;
    for (let k = 0; k < K; k++) {
      fS[k] = G.slope_deg[k] <= smax ? 0 : 1; fD[k] = nodes.dark[k] > batt ? 1 : 0; fE[k] = nodes.noEarth[k] > buf ? 1 : 0;
      ok[k] = (fS[k] | fD[k] | fE[k]) ? 0 : 1; nOk += ok[k];
    }
    const sumOver = (ti, tj, arr) => { const { mx, my } = cellMasses(G, ti, tj, sigma); let s = 0, tot = 0;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const w = my[j] * mx[i]; tot += w; s += w * arr[j * n + i]; } return [s, tot]; };
    // istege bagli zemin riski (ML kucuk krater, deneysel): opt.ground[k] = dugum hucresinin tehlikeli alan kesri (0-1),
    // null/NaN = bilinmiyor (goruntu cok karanlik) -> 0 sayilir ama payi ayrica raporlanir. Verilmezse sonuc Python ile ayni.
    const gr = opt.ground || null, gv = new Float64Array(K), unk = new Uint8Array(K);
    if (gr) for (let k = 0; k < K; k++) { const v = gr[k]; if (v == null || !isFinite(v)) unk[k] = 1; else gv[k] = Math.min(1, Math.max(0, v)); }
    const w = gr ? Float64Array.from(ok, (o, k) => o * (1 - gv[k])) : ok;
    const [pLow, inside] = sumOver(ti, tj, w);
    const outside = Math.max(0, 1 - inside), out = { pLow, pHigh: Math.min(1, pLow + outside), outside, ok, nOk, sigmaM: sigma, target: { i: ti, j: tj },
      reasons: { slope: sumOver(ti, tj, fS)[0], dark: sumOver(ti, tj, fD)[0], noEarth: sumOver(ti, tj, fE)[0] } };
    if (gr) { out.reasons.ground = sumOver(ti, tj, Float64Array.from(ok, (o, k) => o * gv[k]))[0];
      out.groundUnknown = sumOver(ti, tj, Float64Array.from(ok, (o, k) => o * unk[k]))[0]; }
    if (opt.best !== 0 || opt.map) {   // tum dugumler hedef alininca P (harita) ve en iyi hedefler; opt.best:0 ve map yoksa atlanir (hizli)
      const rows = [], pMap = new Float64Array(K);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const p = sumOver(i, j, w)[0]; pMap[j * n + i] = p; rows.push({ i, j, k: j * n + i, pLow: p, distM: Math.hypot(i - ti, j - tj) * sp }); }
      rows.sort((a, b) => (Math.round(b.pLow * 1e6) - Math.round(a.pLow * 1e6)) || (a.distM - b.distM));
      out.best = rows.slice(0, opt.best || 5).map(r => Object.assign(r, { lat: G.lat[r.k], lon: G.lon[r.k] }));
      if (opt.map) out.pMap = pMap;
    }
    out.fail = { slope: fS, dark: fD, noEarth: fE };
    if (opt.mcN) {   // gercek Monte Carlo (dogrulama/gosterim): mulberry32 + Box-Muller
      let a = (opt.seed || 12345) >>> 0;
      const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      let hit = 0, outN = 0; const pts = [];
      for (let q = 0; q < opt.mcN; q++) {
        const u = 1 - rnd(), v = rnd(), r = Math.sqrt(-2 * Math.log(u));
        const x = (ti - h) * sp + sigma * r * Math.cos(2 * Math.PI * v), y = (tj - h) * sp + sigma * r * Math.sin(2 * Math.PI * v);
        const i = Math.round(x / sp) + h, j = Math.round(y / sp) + h, inn = i >= 0 && i < n && j >= 0 && j < n;
        const s = inn ? (gr ? (ok[j * n + i] && rnd() >= gv[j * n + i] ? 1 : 0) : ok[j * n + i]) : 0; hit += s; outN += inn ? 0 : 1;
        if (q < (opt.mcKeep || 0)) pts.push([x, y, s]);
      }
      const p = hit / opt.mcN; out.mc = { n: opt.mcN, p, se: Math.sqrt(Math.max(p * (1 - p), 1e-12) / opt.mcN), outside: outN / opt.mcN, points: pts };
    }
    return out;
  }


  // ---------- Gezgin rotasi (A*/Dijkstra, zamana bagli) ----------
  // Izgara: G (100 m dugumler), nodes = landingNodes(..., {keepHourly:true}). Dugum k = j*n+i.
  // Kenar: 8 komsu, yatay uzunluk L (100 veya 141 m), egim = atan(|dz|/L); egim > slopeMax ise yasak (ayrica dugum egimi).
  // Varis zamani t (saat, pencere basindan): t += L3/(v*3600), L3 = sqrt(L^2+dz^2).
  // Maliyet (saat cinsinden "esdeger surus"): dt * (1 + wDark*karanlik(t) + wComm*baglantisiz(t)) + wHaz*haz*L/100 + wUnk*bilinmeyen*L/100
  //   karanlik(t): dugum o saatte gunes diskinin yarisindan azini goruyor; baglanti: Dunya dogrudan gorunuyor VEYA
  //   iniş aracinin direginden goruş hattı var ve inis araci o saatte Dunya'yi goruyor (role).
  // Agirliklar tasarim tercihidir (arayuzde yazar); fizik sinirlari (egim, batarya) kesin kontroldur.
  function losFrom(G, from, hFrom, hTo) {   // inis aracindan (direk hFrom m) her dugume (anten hTo m) goruş hattı; 1 = var
    const n = G.n, sp = G.spacing_m, K = n * n, vis = new Uint8Array(K), R = R_MOON_KM * 1000;
    const z = (x, y) => { const c = Math.max(0, Math.min(n - 1.001, x)), r = Math.max(0, Math.min(n - 1.001, y)), c0 = Math.floor(c), r0 = Math.floor(r), tx = c - c0, ty = r - r0;
      const g = (a, b) => G.ground_m[b * n + a]; return (g(c0, r0) * (1 - tx) + g(c0 + 1, r0) * tx) * (1 - ty) + (g(c0, r0 + 1) * (1 - tx) + g(c0 + 1, r0 + 1) * tx) * ty; };
    const a0 = G.ground_m[from.j * n + from.i] + hFrom;
    for (let k = 0; k < K; k++) {
      const i = k % n, j = (k - i) / n, d = Math.hypot(i - from.i, j - from.j) * sp, b0 = G.ground_m[k] + hTo;
      if (d < 1) { vis[k] = 1; continue; }
      const steps = Math.ceil(d / (sp / 4)); let ok = 1;
      for (let q = 1; q < steps; q++) { const t = q / steps, s = t * d;
        const line = a0 + (b0 - a0) * t + s * (d - s) / (2 * R);    // egrilik: duz cizgi kureye gore s(d-s)/2R yukarida
        if (z(from.i + (i - from.i) * t, from.j + (j - from.j) * t) > line) { ok = 0; break; } }
      vis[k] = ok;
    }
    return vis;
  }
  function roverRoute(G, nodes, opt) {
    const n = G.n, K = n * n, sp = G.spacing_m, N = nodes.N, L = nodes.litH, U = nodes.upH;
    if (!L) throw new Error("landingNodes keepHourly:true gerekli");
    const v = opt.speedMs || 0.1, smax = opt.slopeMax == null ? 15 : opt.slopeMax, wD = opt.wDark == null ? 2 : opt.wDark,
      wC = opt.wComm == null ? 0.5 : opt.wComm, wH = opt.wHaz == null ? 20 : opt.wHaz, wU = opt.wUnknown == null ? 0.3 : opt.wUnknown;
    const ground = opt.ground || null, relay = opt.lander ? losFrom(G, opt.lander, opt.landerMastM || 2, opt.antennaM || 1.5) : null;
    const lk = opt.lander ? opt.lander.j * n + opt.lander.i : -1;
    const hr = t => Math.max(0, Math.min(N - 1, Math.floor(t)));
    const lit = (k, t) => L[k * N + hr(t)] === 1;
    const comm = (k, t) => U[k * N + hr(t)] === 1 || (relay && relay[k] === 1 && U[lk * N + hr(t)] === 1);
    function leg(a, b, t0) {
      const cost = new Float64Array(K).fill(Infinity), tim = new Float64Array(K), prev = new Int32Array(K).fill(-1), done = new Uint8Array(K);
      cost[a] = 0; tim[a] = t0;
      const heap = [[0, a]], push = (c, k) => { heap.push([c, k]); let x = heap.length - 1; while (x > 0) { const p = (x - 1) >> 1; if (heap[p][0] <= heap[x][0]) break; [heap[p], heap[x]] = [heap[x], heap[p]]; x = p; } },
        pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let x = 0; for (;;) { const l = 2 * x + 1, r = l + 1; let m = x; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === x) break; [heap[m], heap[x]] = [heap[x], heap[m]]; x = m; } } return top; };
      const bi = b % n, bj = (b - bi) / n, hcost = k => { const i = k % n, j = (k - i) / n; return Math.hypot(i - bi, j - bj) * sp / (v * 3600); };
      while (heap.length) {
        const [, k] = pop(); if (done[k]) continue; done[k] = 1; if (k === b) break;
        const i = k % n, j = (k - i) / n;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue; const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
          const q = jj * n + ii; if (done[q]) continue;
          const Lh = Math.hypot(di, dj) * sp, dz = G.ground_m[q] - G.ground_m[k], sl = Math.atan(Math.abs(dz) / Lh) * 180 / Math.PI;
          if (sl > smax || G.slope_deg[q] > smax) continue;
          const dt = Math.hypot(Lh, dz) / (v * 3600), t = tim[k] + dt;
          let c = dt * (1 + (lit(q, t) ? 0 : wD) + (comm(q, t) ? 0 : wC));
          if (ground) { const g = ground[q]; if (g == null || !isFinite(g)) c += wU * Lh / 100; else c += wH * g * Lh / 100; }
          if (opt.penalty) c *= 1 + opt.penalty[q];
          const nc = cost[k] + c;
          if (nc < cost[q]) { cost[q] = nc; tim[q] = t; prev[q] = k; push(nc + hcost(q), q); }
        }
      }
      if (!isFinite(cost[b])) return null;
      const path = []; for (let k = b; k !== -1; k = prev[k]) path.push(k); path.reverse();
      return { path, tEnd: tim[b], times: path.map(k => tim[k]) };
    }
    const a = opt.start.j * n + opt.start.i, b = opt.goal.j * n + opt.goal.i, t0 = opt.startHour || 0, work = opt.workH || 0;
    const go = leg(a, b, t0); if (!go) return { ok: false, reason: "no route: every way is steeper than " + smax + "°" };
    const back = leg(b, a, go.tEnd + work); if (!back) return { ok: false, reason: "no way back within the slope limit" };
    // zaman cizelgesi: suruş + hedefte calisma + donus; karanlik ve baglantisiz saatleri biriktir
    const steps = [];
    const addLeg = (lg, phase) => lg.path.forEach((k, q) => { if (q === 0 && steps.length) return; steps.push({ k, t: lg.times[q], phase }); });
    addLeg(go, "go"); steps.push({ k: b, t: go.tEnd + work, phase: "work" }); addLeg(back, "back");
    let dist = 0, darkH = 0, noCommH = 0, maxSl = 0, hazMax = 0, unkM = 0, battEmpty = null, beyond = false, cost = 0, hazSum = 0;
    for (let q = 1; q < steps.length; q++) {
      const A = steps[q - 1], B = steps[q], dt = B.t - A.t;
      if (A.k !== B.k) { const ai = A.k % n, aj = (A.k - ai) / n, bi = B.k % n, bj = (B.k - bi) / n, Lh = Math.hypot(ai - bi, aj - bj) * sp, dz = G.ground_m[B.k] - G.ground_m[A.k];
        dist += Math.hypot(Lh, dz); maxSl = Math.max(maxSl, Math.atan(Math.abs(dz) / Lh) * 180 / Math.PI);
        if (ground) { const g = ground[B.k]; if (g == null || !isFinite(g)) { unkM += Lh; cost += wU * Lh / 100; } else { hazMax = Math.max(hazMax, g); hazSum += g * Lh; cost += wH * g * Lh / 100; } }
        cost += dt * (1 + (lit(B.k, B.t) ? 0 : wD) + (comm(B.k, B.t) ? 0 : wC)); }
      else cost += dt * (1 + (lit(B.k, B.t) ? 0 : wD) + (comm(B.k, B.t) ? 0 : wC));   // hedefte calisma
      if (B.t >= N) beyond = true;
      const sub = Math.max(1, Math.ceil(dt * 4));                 // 15 dk adimlarla isik/baglanti
      for (let s = 0; s < sub; s++) { const tm = A.t + (s + 0.5) * dt / sub, kk = s < sub / 2 ? A.k : B.k;
        if (!lit(kk, tm)) { darkH += dt / sub; if (battEmpty == null && darkH > opt.batteryH) battEmpty = { k: kk, t: tm }; }
        if (!comm(kk, tm)) noCommH += dt / sub; }
      B.lit = lit(B.k, B.t); B.comm = comm(B.k, B.t);
    }
    steps[0].lit = lit(a, t0); steps[0].comm = comm(a, t0);
    return { ok: true, steps, distM: dist, totalH: steps[steps.length - 1].t - t0, driveH: go.tEnd - t0 + (back.tEnd - go.tEnd - work), darkH, noCommH,
      maxSlopeDeg: maxSl, hazMax, hazMeanPath: dist > 0 ? hazSum / Math.max(dist - unkM, 1) : 0, unknownM: unkM, cost, battEmpty, feasible: battEmpty == null, beyondWindow: beyond, relay,
      battMarginH: opt.batteryH - darkH,
      weights: { wDark: wD, wComm: wC, wHaz: wH, wUnknown: wU } };
  }

  // ---------- Tehlike algilama ve kacinma (HDA) ----------
  // Arac target + sigma*N(0,1) noktasina dogru iner (landingOdds ile ayni dagilim). Tarama irtifasinda, ongorulen inis
  // noktasinin divertM yaricapi icindeki dugumlerden en iyisini secer ve oraya kayar.
  // Kacinma yoksa dugum puani = ok * (1 - g)  (landingOdds ile ayni; arac hicbir kraterden kacamaz).
  // Kacinma varsa (divertM > 0) erisilebilen dugumlerin puani = ok * (1 - g * (1 - recall)): ML'in gordugu kraterlerden
  //   kacilir, gormedigi (1 - recall) payi kalir. g bilinmiyorsa (karanlik) 0 sayilir, payi ayrica raporlanir.
  // divertM = 0 iken pHda = pNoHda (kontrol).
  function hdaOdds(G, nodes, opt) {
    const lo = landingOdds(G, nodes, Object.assign({}, opt, { best: 0, map: false, mcN: 0, ground: null }));
    const ok = lo.ok, n = G.n, K = n * n, h = Math.floor(n / 2), sp = G.spacing_m, sigma = opt.sigmaM || 100;
    const R = opt.divertM || 0, rec = opt.recall == null ? 0 : opt.recall, gr = opt.ground || null;
    const score = new Float64Array(K), raw = new Float64Array(K), unk = new Uint8Array(K);
    for (let k = 0; k < K; k++) { const g = gr ? gr[k] : 0; if (g == null || !isFinite(g)) unk[k] = 1; const gg = unk[k] ? 0 : g;
      raw[k] = ok[k] * (1 - gg); score[k] = R > 0 ? ok[k] * (1 - gg * (1 - rec)) : raw[k]; }
    const ti = opt.target ? opt.target.i : h, tj = opt.target ? opt.target.j : h, N = opt.mcN || 2000;
    let a = (opt.seed || 12345) >>> 0;
    const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    let sNo = 0, sH = 0, dSum = 0, nDiv = 0, unkLand = 0; const samples = [];
    for (let q = 0; q < N; q++) {
      const u = 1 - rnd(), v = rnd(), r = Math.sqrt(-2 * Math.log(u));
      const x = (ti - h) * sp + sigma * r * Math.cos(2 * Math.PI * v), y = (tj - h) * sp + sigma * r * Math.sin(2 * Math.PI * v);
      const i0 = Math.round(x / sp) + h, j0 = Math.round(y / sp) + h, inn = i0 >= 0 && i0 < n && j0 >= 0 && j0 < n;
      const own = inn ? raw[j0 * n + i0] : 0; sNo += own;
      let best = inn ? score[j0 * n + i0] : 0, bk = inn ? j0 * n + i0 : -1, bd = 0;
      const rr = Math.ceil(R / sp) + 1;
      for (let j = Math.max(0, j0 - rr); j <= Math.min(n - 1, j0 + rr); j++) for (let i = Math.max(0, i0 - rr); i <= Math.min(n - 1, i0 + rr); i++) {
        const d = Math.hypot((i - h) * sp - x, (j - h) * sp - y); if (d > R) continue;
        const sc = score[j * n + i]; if (sc > best + 1e-12 || (Math.abs(sc - best) <= 1e-12 && bk >= 0 && d < bd && sc > 0 && bk !== j0 * n + i0)) { best = sc; bk = j * n + i; bd = d; }
      }
      sH += best; if (bk >= 0 && bk !== j0 * n + i0 && best > own) { nDiv++; dSum += bd; } if (bk >= 0 && unk[bk]) unkLand++;
      if (q < (opt.keep || 0)) samples.push({ x, y, ownScore: own, to: bk, toScore: best, divertM: bk >= 0 && best > own ? bd : 0 });
    }
    return { pNoHda: sNo / N, pHda: sH / N, divertShare: nDiv / N, meanDivertM: nDiv ? dSum / nDiv : 0, unknownShare: unkLand / N, n: N, samples, recall: rec, divertM: R };
  }

  // ---------- Alternatif gezgin yollari (aday uret -> hepsini ayni olcutle test et -> en guvenlisini sec) ----------
  // Aday uretimi: "ceza yontemi". Bulunan her yolun gectigi noktalarin arama maliyeti (1 + penalty) ile carpilir
  // (yol uzerindeki nokta +penStep, komsulari +penStep/2); boylece sonraki arama baska bir koridor dener.
  // Ceza SADECE yol aramasini etkiler; her adayin olcutleri (cost, darkH, noCommH, egim, krater) cezasiz hesaplanir, yani adil karsilastirilir.
  // Siralama: once batarya yetenler (feasible), sonra gercek risk-maliyeti (cost) kucukten buyuge. Ayni yol tekrar cikarsa elenir.
  function roverAlternatives(G, nodes, opt, k) {
    k = k || 10; const n = G.n, K = n * n, pen = new Float64Array(K), step = opt.penStep == null ? 1.5 : opt.penStep;
    const seen = new Set(), out = []; let tries = 0;
    while (out.length < k && tries < 3 * k) {
      tries++;
      const r = roverRoute(G, nodes, Object.assign({}, opt, { penalty: pen }));
      if (!r.ok) { if (!out.length) return { ok: false, reason: r.reason, routes: [] }; break; }
      const key = r.steps.map(s => s.k).join(",");
      for (const s of r.steps) { pen[s.k] += step; const i = s.k % n, j = (s.k - i) / n;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if ((di || dj) && ii >= 0 && jj >= 0 && ii < n && jj < n) pen[jj * n + ii] += step / 2; } }
      if (seen.has(key)) continue; seen.add(key);
      out.push(Object.assign(r, { candidate: out.length + 1 }));   // r'nin olcutleri (cost, darkH, ...) zaten cezasiz hesaplanir
    }
    out.sort((a, b) => (b.feasible - a.feasible) || (a.cost - b.cost));
    out.forEach((r, q) => r.rank = q + 1);
    return { ok: true, routes: out, best: out[0], tried: tries, k };
  }

  const M = { roverAlternatives, hdaOdds, roverRoute, losFrom, landingNodes, landingOdds, erf, bestInRegion, findDates, analyzeRange, refine, windows, sunG, earthG, diskFraction, sunRadiusDeg, loadEphem, analyze, indexOf, why, horizonAt, nextEvents, power, hourly, windowStats, demSample, horizonFromDem,
    basis, azel, SUN_R_DEG };
  if (typeof module !== "undefined") module.exports = M; else g.Model = M;
})(typeof window !== "undefined" ? window : globalThis);
