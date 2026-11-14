// CLAUDE.md bölüm 5 — tarayıcıda (ve Node'da) çalışan hesap modülü.
// Bütün diziler Float32Array; sıcak döngülerde ara nesne yaratılmaz.
// Fonksiyonlar isteğe bağlı bir `cikti` dizisi alır; verilirse yeni
// bellek ayrılmaz, sonuç onun içine yazılır.

export const GUNES_YARICAP = 0.266 // derece (ρ)
export const GUNES_CAP = 2 * GUNES_YARICAP // 0.532
export const P0 = 1361 // W/m²

const DERECE = Math.PI / 180

const diziHazirla = (cikti, n) => (cikti && cikti.length === n ? cikti : new Float32Array(n))

// --- 5.7 Ufuk okuma -------------------------------------------------------

/**
 * Ufuk profilinden H(A): iki komşu derece arasında döngüsel doğrusal ara değer.
 * @param {ArrayLike<number>} horizon 360 eleman, 0°'dan 1° adımla
 * @param {number} azimut derece (herhangi bir değer; [0, 360)'a indirgenir)
 */
export function ufukOku(horizon, azimut) {
  let a = azimut % 360
  if (a < 0) a += 360
  const i0 = Math.floor(a)
  const kesir = a - i0
  const h0 = horizon[i0 % 360] // a 359.9999…→ i0 = 359; güvenlik için mod
  const h1 = horizon[(i0 + 1) % 360]
  return h0 + (h1 - h0) * kesir
}

// --- 5.2 Güneş diskinin görünen oranı -------------------------------------

/** f(t) ∈ [0, 1] */
export function gunesOrani(sunAlt, sunAz, horizon, cikti) {
  const n = sunAlt.length
  const f = diziHazirla(cikti, n)
  for (let k = 0; k < n; k++) {
    const v = (sunAlt[k] + GUNES_YARICAP - ufukOku(horizon, sunAz[k])) / GUNES_CAP
    f[k] = v <= 0 ? 0 : v >= 1 ? 1 : v
  }
  return f
}

// --- 5.3 İletişim durumu --------------------------------------------------

/** c(t) ∈ {0, 1} */
export function iletisimDurumu(earthAlt, earthAz, horizon, epsilon, cikti) {
  const n = earthAlt.length
  const c = diziHazirla(cikti, n)
  for (let k = 0; k < n; k++) {
    c[k] = earthAlt[k] > ufukOku(horizon, earthAz[k]) + epsilon ? 1 : 0
  }
  return c
}

// --- 5.4 Anlık güç --------------------------------------------------------

/**
 * P(t) [W]. yonelim: 'izleyen' | 'yatay' | 'dikey'.
 * Yatay/dikey panelde negatif sonuç 0 alınır.
 */
export function guc(f, sunAlt, eta, S, yonelim, cikti) {
  const n = f.length
  const P = diziHazirla(cikti, n)
  const k0 = P0 * eta * S
  if (yonelim === 'yatay') {
    for (let k = 0; k < n; k++) {
      const v = k0 * f[k] * Math.sin(sunAlt[k] * DERECE)
      P[k] = v > 0 ? v : 0
    }
  } else if (yonelim === 'dikey') {
    for (let k = 0; k < n; k++) {
      const v = k0 * f[k] * Math.cos(sunAlt[k] * DERECE)
      P[k] = v > 0 ? v : 0
    }
  } else {
    for (let k = 0; k < n; k++) P[k] = k0 * f[k]
  }
  return P
}

// --- 5.5 Geri sayım -------------------------------------------------------

/** t'den ileri, koşulun ilk sağlandığı indekse kadar geçen adım; yoksa null. */
function ilkGecis(dizi, t, aranan0) {
  for (let k = t + 1; k < dizi.length; k++) {
    if ((dizi[k] > 0) !== aranan0) return k - t
  }
  return null
}

/**
 * t anından ileriye geri sayım (saat). Geçiş yoksa ilgili değer null.
 * @returns {{gunesGorunuyor: boolean, gunBatimi: number|null, gunDogumu: number|null,
 *            dunyaGorunuyor: boolean, dunyaBatisi: number|null, dunyaDogusu: number|null}}
 */
export function geriSayim(f, c, t, dt = 1) {
  const gunesGorunuyor = f[t] > 0
  const dunyaGorunuyor = c[t] > 0
  const gunesAdim = ilkGecis(f, t, gunesGorunuyor)
  const dunyaAdim = ilkGecis(c, t, dunyaGorunuyor)
  const saat = (adim) => (adim === null ? null : adim * dt)
  return {
    gunesGorunuyor,
    gunBatimi: gunesGorunuyor ? saat(gunesAdim) : null,
    gunDogumu: gunesGorunuyor ? null : saat(gunesAdim),
    dunyaGorunuyor,
    dunyaBatisi: dunyaGorunuyor ? saat(dunyaAdim) : null,
    dunyaDogusu: dunyaGorunuyor ? null : saat(dunyaAdim),
  }
}

// --- 5.6 Dönem ölçütleri --------------------------------------------------

/**
 * [tL, tL + D) aralığında ölçütler. Aralık D*24/dt adımdır.
 * @param {Float32Array} f
 * @param {Float32Array} c
 * @param {Float32Array|null} P  null ise E = null
 * @param {number} tL  iniş indeksi
 * @param {number} D   görev süresi (gün)
 * @param {number} dt  adım (saat)
 * @returns {null | {fBar, cBar, tauMax, sigmaMax, E, puan}}
 *          Aralık veri sonunu aşarsa null. tauMax/sigmaMax saat, E Wh.
 */
export function olcutler(f, c, P, tL, D, dt, w1 = 1, w2 = 1, w3 = 1) {
  const adim = Math.round((D * 24) / dt)
  const son = tL + adim
  if (tL < 0 || adim <= 0 || son > f.length) return null

  let fTop = 0
  let cTop = 0
  let pTop = 0
  let tauKosu = 0
  let tauMax = 0
  let sigmaKosu = 0
  let sigmaMax = 0

  for (let k = tL; k < son; k++) {
    const fk = f[k]
    const ck = c[k]
    fTop += fk
    cTop += ck
    if (P) pTop += P[k]

    if (fk === 0) {
      if (++tauKosu > tauMax) tauMax = tauKosu
    } else tauKosu = 0

    if (ck === 0) {
      if (++sigmaKosu > sigmaMax) sigmaMax = sigmaKosu
    } else sigmaKosu = 0
  }

  const fBar = fTop / adim
  const cBar = cTop / adim
  tauMax *= dt
  sigmaMax *= dt
  return {
    fBar,
    cBar,
    tauMax,
    sigmaMax,
    E: P ? pTop * dt : null,
    puan: w1 * fBar + w2 * cBar - w3 * (tauMax / (D * 24)),
  }
}
