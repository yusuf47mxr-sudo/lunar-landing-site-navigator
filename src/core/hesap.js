// CLAUDE.md bölüm 5 — tarayıcıda (ve Node'da) çalışan hesap modülü.
// Bütün diziler Float32Array; sıcak döngülerde ara nesne yaratılmaz.
// Fonksiyonlar isteğe bağlı bir `cikti` dizisi alır; verilirse yeni
// bellek ayrılmaz, sonuç onun içine yazılır.

// Tanımlar veri paketiyle (Plan B, web/js/model.js ve pipeline/physics.py) aynıdır:
//   f        ufkun üstünde kalan Güneş diski oranı (daire dilimi), yarıçap Güneş uzaklığından
//   aydınlık f > 0.5 — geri sayım, en uzun karanlık ve "Güneş görünür" bu eşikle
//   güç      P0 · (1 AB / uzaklık)² · η · S · f · yön çarpanı

/** Ortalama Güneş açısal yarıçapı (°); uzaklık bilinmiyorsa (model.js SUN_R_DEG). */
export const GUNES_YARICAP = 0.2666
export const P0 = 1361 // W/m², 1 AB'de
/** Aydınlık eşiği: f bundan büyükse Güneş "görünür" (diskin yarısından fazlası ufkun üstünde). */
export const AYDINLIK_ESIGI = 0.5

const DERECE = Math.PI / 180
const R_GUNES_KM = 695700
const AB_KM = 149597870.7

/** Güneş'in açısal yarıçapı (°), uzaklık AB cinsinden: asin(R☉ / d). */
export function gunesYaricapi(au) {
  return au ? Math.asin(R_GUNES_KM / (au * AB_KM)) / DERECE : GUNES_YARICAP
}

/**
 * Ufkun üstünde kalan disk oranı (daire dilimi). d = (yükseklik − ufuk) / ρ.
 * model.js diskFraction ile aynı.
 */
export function diskOrani(yukseklik, ufuk, rho) {
  const d = Math.max(-1, Math.min(1, (yukseklik - ufuk) / rho))
  return 1 - (Math.acos(d) - d * Math.sqrt(1 - d * d)) / Math.PI
}

const diziHazirla = (cikti, n) => (cikti && cikti.length === n ? cikti : new Float32Array(n))

// --- 5.7 Ufuk okuma -------------------------------------------------------

/**
 * Ufuk profilinden H(A): komşu iki örnek arasında döngüsel doğrusal ara değer.
 * Profil 0°'dan başlar, n = horizon.length eşit adımla (adım 360/n; veride
 * n = 720, 0.5°). model.js horizonAt ile aynı. Ufku okuyan her yer bunu kullanır.
 * @param {ArrayLike<number>} horizon n eleman
 * @param {number} azimut derece (herhangi bir değer; [0, 360)'a indirgenir)
 */
export function ufukOku(horizon, azimut) {
  const n = horizon.length
  let a = azimut % 360
  if (a < 0) a += 360
  const x = (a / 360) * n
  const i0 = Math.floor(x)
  const kesir = x - i0
  const h0 = horizon[i0 % n] // a 359.9999… için güvenlik
  const h1 = horizon[(i0 + 1) % n]
  return h0 + (h1 - h0) * kesir
}

// --- 5.2 Güneş diskinin görünen oranı -------------------------------------

/**
 * f(t) ∈ [0, 1]: ufkun üstünde kalan disk oranı (daire dilimi).
 * @param {ArrayLike<number>|null} sunAu  Güneş uzaklığı (AB), her adım için; null ise ortalama yarıçap
 */
export function gunesOrani(sunAlt, sunAz, horizon, sunAu = null, cikti) {
  const n = sunAlt.length
  const f = diziHazirla(cikti, n)
  for (let k = 0; k < n; k++) {
    f[k] = diskOrani(sunAlt[k], ufukOku(horizon, sunAz[k]), gunesYaricapi(sunAu ? sunAu[k] : null))
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
 * Yatay/dikey panelde negatif sonuç 0 alınır. sunAu verilirse × (1 AB / uzaklık)².
 */
export function guc(f, sunAlt, eta, S, yonelim, sunAu = null, cikti) {
  const n = f.length
  const P = diziHazirla(cikti, n)
  const k0 = P0 * eta * S
  for (let k = 0; k < n; k++) {
    const yon = yonelim === 'yatay' ? Math.sin(sunAlt[k] * DERECE) : yonelim === 'dikey' ? Math.cos(sunAlt[k] * DERECE) : 1
    const au = sunAu ? sunAu[k] : 1
    const v = (k0 * f[k] * yon) / (au * au)
    P[k] = v > 0 ? v : 0
  }
  return P
}

// --- 5.5 Geri sayım -------------------------------------------------------

/**
 * t anından sonraki ilk batış (dizi > esik → ≤ esik) ve ilk doğuş (tersi).
 * Cisim şu an görünüyorsa önce batış, sonra doğuş gelir; görünmüyorsa tersi.
 * f (Güneş, esik AYDINLIK_ESIGI) ve c (Dünya, esik 0) için kullanılır.
 * @param {ArrayLike<number>} dizi
 * @param {number} t   başlangıç indeksi
 * @param {number} dt  adım (saat)
 * @param {number} esik görünürlük eşiği: dizi[k] > esik
 * @returns {{sonrakiBatis: number|null, sonrakiDogus: number|null}} saat; veri
 *          aralığında o geçiş yoksa null
 */
export function gecisler(dizi, t, dt = 1, esik = 0) {
  let sonrakiBatis = null
  let sonrakiDogus = null
  let gorunuyor = dizi[t] > esik
  for (let k = t + 1; k < dizi.length; k++) {
    const simdi = dizi[k] > esik
    if (simdi === gorunuyor) continue
    gorunuyor = simdi
    if (simdi) {
      if (sonrakiDogus === null) sonrakiDogus = (k - t) * dt
    } else if (sonrakiBatis === null) sonrakiBatis = (k - t) * dt
    if (sonrakiBatis !== null && sonrakiDogus !== null) break
  }
  return { sonrakiBatis, sonrakiDogus }
}

/**
 * t anından ileriye geri sayım (saat): şu anki duruma göre sıradaki geçiş.
 * Görünen cisim için batış, görünmeyen için doğuş; geçiş yoksa null.
 * @returns {{gunesGorunuyor: boolean, gunBatimi: number|null, gunDogumu: number|null,
 *            dunyaGorunuyor: boolean, dunyaBatisi: number|null, dunyaDogusu: number|null}}
 */
export function geriSayim(f, c, t, dt = 1) {
  const gunesGorunuyor = f[t] > AYDINLIK_ESIGI
  const dunyaGorunuyor = c[t] > 0
  const gunes = gecisler(f, t, dt, AYDINLIK_ESIGI)
  const dunya = gecisler(c, t, dt)
  return {
    gunesGorunuyor,
    gunBatimi: gunesGorunuyor ? gunes.sonrakiBatis : null,
    gunDogumu: gunesGorunuyor ? null : gunes.sonrakiDogus,
    dunyaGorunuyor,
    dunyaBatisi: dunyaGorunuyor ? dunya.sonrakiBatis : null,
    dunyaDogusu: dunyaGorunuyor ? null : dunya.sonrakiDogus,
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
  const tauMax = enUzunKosu(f, tL, son, AYDINLIK_ESIGI).adim * dt
  const sigmaMax = enUzunKosu(c, tL, son, 0).adim * dt
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
 * [bas, son) içinde dizi[k] <= esik olan en uzun ardışık dizi (karanlık: f ≤ 0.5;
 * iletişim kesintisi: c ≤ 0). Eşit uzunlukta birden çok dizi varsa ilki.
 * Hiç yoksa { bas: null, adim: 0 }. olcutler() ve enUzunAraliklar() ortak kullanır.
 */
function enUzunKosu(dizi, bas, son, esik) {
  let kosuBas = 0
  let kosu = 0
  let enBas = null
  let enAdim = 0
  for (let k = bas; k < son; k++) {
    if (dizi[k] <= esik) {
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
 * Görev aralığında en uzun karanlık (f ≤ 0.5) ve en uzun iletişim kesintisi
 * (c == 0). bas: dizideki başlangıç indeksi (yoksa null), uzunluk: saat.
 * Uzunluklar olcutler().tauMax / sigmaMax ile aynıdır.
 * @returns {null | {karanlik: {bas, uzunluk}, kesinti: {bas, uzunluk}}}
 */
export function enUzunAraliklar(f, c, tL, D, dtHours) {
  const aralik = gorevAraligi(f.length, tL, D, dtHours)
  if (!aralik) return null
  const k = enUzunKosu(f, tL, aralik.son, AYDINLIK_ESIGI)
  const s = enUzunKosu(c, tL, aralik.son, 0)
  return {
    karanlik: { bas: k.bas, uzunluk: k.adim * dtHours },
    kesinti: { bas: s.bas, uzunluk: s.adim * dtHours },
  }
}

// --- Biçimleme -------------------------------------------------------------
// Süre, yüzde ve tarih dile bağlıdır: src/dil/index.js bicim(dil) (b.sure, b.yuzde, b.tamSaat, b.tarih).

/** Yükseklik açısı: +2.3° / −1.1° / 0.0° (bir ondalık, işaretli). Geçersizse "—". */
export function dereceBicimle(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  const y = Math.round(v * 10) / 10
  return `${y > 0 ? '+' : y < 0 ? '−' : ''}${Math.abs(y).toFixed(1)}°`
}

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
