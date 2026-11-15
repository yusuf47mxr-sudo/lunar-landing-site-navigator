// Krater kartı için hızlı iniş penceresi hesabı (işçi ve Node doğrulaması ortak).
//
// Paketin landingNodes'u her pencere için 961 düğüm × pencere saatini baştan
// tarar. Kart ise t her değiştiğinde ve öneri taramasında (günlük adım, ≤ 1 yıl)
// yüzlerce pencere ister. Bunun yerine:
//   1) Hedef hücrenin çevresindeki düğümlerin (± KOMSU_YARICAP hücre) bütün yılın
//      saatlik "aydınlık" (f > 0.5) ve "Dünya görünür" bitleri Model.hourly ile bir
//      kez hesaplanır (landingNodes'un kullandığı at() ile aynı; düğüm başına önbellek).
//   2) Her pencere için en uzun karanlık / Dünya'sız koşu bu bitlerden sayılır.
//   3) Model.landingOdds olduğu gibi çağrılır.
// Komşuluk dışındaki düğümler "başarısız" sayılır; σ = 100 m, 100 m hücrede
// 6 hücre ötesinin olasılık kütlesi ~1e-8 — sonuç landingNodes ile aynıdır
// (scripts/inisDogrula.mjs).

export const KOMSU_YARICAP = 6 // hücre; 6σ (σ = 100 m, aralık 100 m)
export const ONERI_GUN = 14
export const ONERI_ADIM_SAAT = 24
export const ONERI_ESIK = 0.5
const EN_COK_TARAMA_SAAT = 8760 // en fazla 1 yıl
const BASARISIZ = 1 << 30

/** Bir düğümün bütün efemeris boyunca saatlik aydınlık / Dünya bitleri. */
export function dugumSaatlik(Model, eph, G, k, margin = 2) {
  const nA = G.n_az
  const hor = new Float32Array(nA)
  for (let a = 0; a < nA; a++) hor[a] = G.horizon_cdeg[k * nA + a] / 100
  const H = Model.hourly(eph, { lat: G.lat[k], lon: G.lon[k], ground_m: G.ground_m[k], mast_m: 2, horizon_deg: hor }, margin)
  const lit = new Uint8Array(eph.n)
  for (let i = 0; i < eph.n; i++) lit[i] = H.f[i] > 0.5 ? 1 : 0
  return { lit, up: H.up }
}

/** [i0, i1) içinde dizi[k] === deger olan en uzun koşu (saat). */
function enUzun(dizi, i0, i1, deger) {
  let en = 0
  let su = 0
  for (let i = i0; i < i1; i++) {
    if (dizi[i] === deger) {
      su++
      if (su > en) en = su
    } else su = 0
  }
  return en
}

/** Hedefin komşuluğundaki düğüm sıra numaraları (ızgara içinde kırpılmış). */
export function komsuDugumler(G, hedef, R = KOMSU_YARICAP) {
  const ks = []
  for (let j = Math.max(0, hedef.j - R); j <= Math.min(G.n - 1, hedef.j + R); j++)
    for (let i = Math.max(0, hedef.i - R); i <= Math.min(G.n - 1, hedef.i + R); i++) ks.push(j * G.n + i)
  return ks
}

/**
 * Model.landingOdds'un beklediği düğüm yapısı ({ dark, noEarth }) — yalnız komşuluk dolu.
 * @param saatlik  k → { lit, up } (önbellekli)
 */
export function pencereDugumleri(G, ks, saatlik, i0, i1) {
  const K = G.n * G.n
  const dark = new Int32Array(K).fill(BASARISIZ)
  const noEarth = new Int32Array(K).fill(BASARISIZ)
  for (const k of ks) {
    const s = saatlik(k)
    dark[k] = enUzun(s.lit, i0, i1, 0)
    noEarth[k] = enUzun(s.up, i0, i1, 0)
  }
  return { dark, noEarth, i0, i1, N: i1 - i0 }
}

/** Tek pencere için iniş olasılığı (landingOdds çıktısının kartta kullanılan kısmı). */
export function pencereOlasiligi(Model, G, ks, saatlik, i0, i1, opt) {
  const r = Model.landingOdds(G, pencereDugumleri(G, ks, saatlik, i0, i1), { ...opt, best: 0 })
  return { pLow: r.pLow, outside: r.outside, reasons: r.reasons, groundUnknown: r.groundUnknown ?? 0 }
}

/**
 * Öneri: bas'tan bir gün sonrasından başlayarak günlük adımlarla, en fazla
 * 1 yıl (ve efemeris sonu) içinde başarısı ≥ %50 olan ilk 14 günlük başlangıç.
 * Adım günlük: Haworth'ta ≥ %50 başlangıçlar ayda yalnız 1–5 günlük dar
 * aralıklarda çıkar; haftalık adım bir yıl boyunca hepsini kaçırır.
 * @returns {{ t, pLow } | null}
 */
export function oneriBul(Model, eph, G, ks, saatlik, bas, opt) {
  const N = ONERI_GUN * 24
  const son = Math.min(eph.n - N, bas + EN_COK_TARAMA_SAAT)
  for (let t = bas + ONERI_ADIM_SAAT; t <= son; t += ONERI_ADIM_SAAT) {
    const r = Model.landingOdds(G, pencereDugumleri(G, ks, saatlik, t, t + N), { ...opt, best: 0 })
    if (r.pLow >= ONERI_ESIK) return { t, pLow: r.pLow }
  }
  return null
}
