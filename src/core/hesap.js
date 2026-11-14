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
  const aralik = gorevAraligi(f.length, tL, D, dt)
  if (!aralik) return null
  const { adim, son } = aralik

  let fTop = 0
  let cTop = 0
  let pTop = 0
  for (let k = tL; k < son; k++) {
    fTop += f[k]
    cTop += c[k]
    if (P) pTop += P[k]
  }

  const fBar = fTop / adim
  const cBar = cTop / adim
  const tauMax = enUzunSifir(f, tL, son).adim * dt
  const sigmaMax = enUzunSifir(c, tL, son).adim * dt
  return {
    fBar,
    cBar,
    tauMax,
    sigmaMax,
    E: P ? pTop * dt : null,
    puan: w1 * fBar + w2 * cBar - w3 * (tauMax / (D * 24)),
  }
}

/** Görev aralığı [tL, son): adım sayısı ve bitiş indeksi; veri dışına taşarsa null. */
function gorevAraligi(n, tL, D, dt) {
  const adim = Math.round((D * 24) / dt)
  const son = tL + adim
  if (tL < 0 || adim <= 0 || son > n) return null
  return { adim, son }
}

/**
 * [bas, son) içinde dizi[k] === 0 olan en uzun ardışık dizi.
 * Eşit uzunlukta birden çok dizi varsa ilki. Hiç yoksa { bas: null, adim: 0 }.
 * olcutler() (tauMax, sigmaMax) ve enUzunAraliklar() bunu ortak kullanır.
 */
function enUzunSifir(dizi, bas, son) {
  let kosuBas = 0
  let kosu = 0
  let enBas = null
  let enAdim = 0
  for (let k = bas; k < son; k++) {
    if (dizi[k] === 0) {
      if (kosu === 0) kosuBas = k
      if (++kosu > enAdim) {
        enAdim = kosu
        enBas = kosuBas
      }
    } else kosu = 0
  }
  return { bas: enBas, adim: enAdim }
}

/**
 * Görev aralığında en uzun karanlık (f == 0) ve en uzun iletişim kesintisi
 * (c == 0). bas: dizideki başlangıç indeksi (yoksa null), uzunluk: saat.
 * Uzunluklar olcutler().tauMax / sigmaMax ile aynıdır.
 * @returns {null | {karanlik: {bas, uzunluk}, kesinti: {bas, uzunluk}}}
 */
export function enUzunAraliklar(f, c, tL, D, dtHours) {
  const aralik = gorevAraligi(f.length, tL, D, dtHours)
  if (!aralik) return null
  const k = enUzunSifir(f, tL, aralik.son)
  const s = enUzunSifir(c, tL, aralik.son)
  return {
    karanlik: { bas: k.bas, uzunluk: k.adim * dtHours },
    kesinti: { bas: s.bas, uzunluk: s.adim * dtHours },
  }
}

// --- Süre biçimleme -------------------------------------------------------

/**
 * Saat cinsinden süreyi okunur metne çevirir.
 *   79 → "3 g 7 sa",  72 → "3 g",  11 → "11 sa",  11.5 → "11 sa 30 dk",  0.75 → "45 dk"
 * null / geçersiz değer → null (arayüz "veri aralığında değişmiyor" gösterir).
 */
export function saatBicimle(saat) {
  if (saat === null || saat === undefined || !Number.isFinite(saat) || saat < 0) return null
  const dakika = Math.round(saat * 60)
  if (dakika < 60) return `${dakika} dk`
  const gun = Math.floor(dakika / 1440)
  const sa = Math.floor((dakika % 1440) / 60)
  const dk = dakika % 60
  if (gun > 0) return sa > 0 ? `${gun} g ${sa} sa` : `${gun} g`
  return dk > 0 ? `${sa} sa ${dk} dk` : `${sa} sa`
}

/** Yükseklik açısı: +2.3° / −1.1° / 0.0° (bir ondalık, işaretli). Geçersizse "—". */
export function dereceBicimle(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  const y = Math.round(v * 10) / 10
  return `${y > 0 ? '+' : y < 0 ? '−' : ''}${Math.abs(y).toFixed(1)}°`
}

/** 0…1 oranı → "%82" */
export const yuzdeBicimle = (v) => `%${Math.round(v * 100)}`

/** Saat → "62 sa" (güne çevrilmez; tabloda karşılaştırması kolay) */
export const tamSaatBicimle = (v) => `${Math.round(v)} sa`

// --- Panorama merkezi -----------------------------------------------------

/** Açıların döngüsel ortalaması: atan2(ortalama sin, ortalama cos), [0, 360). */
export function donguselOrtalama(acilar) {
  let s = 0
  let c = 0
  for (let k = 0; k < acilar.length; k++) {
    s += Math.sin(acilar[k] * DERECE)
    c += Math.cos(acilar[k] * DERECE)
  }
  const ort = Math.atan2(s, c) / DERECE
  return ort < 0 ? ort + 360 : ort
}

/**
 * Panoramanın ortalanacağı azimut: Dünya'nın döngüsel ortalama azimutu,
 * en yakın 30°'ye yuvarlanmış. Dünya hiç ufkun üstüne çıkmıyorsa 0 (K).
 * Alan başına bir kez hesaplanır; zamana bağlı değildir.
 */
export function panoramaMerkezi(earthAz, earthAlt) {
  let gorunur = false
  for (let k = 0; k < earthAlt.length; k++) {
    if (earthAlt[k] > 0) {
      gorunur = true
      break
    }
  }
  if (!gorunur) return 0
  return (Math.round(donguselOrtalama(earthAz) / 30) * 30) % 360
}
