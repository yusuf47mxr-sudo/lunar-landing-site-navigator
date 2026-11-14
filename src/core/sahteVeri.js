// Test için fiziksel olarak gerçekçi sahte veri üretimi.
// Çıktı CLAUDE.md bölüm 4'teki veri sözleşmesine birebir uyar.
// Saf JS: hem tarayıcıda hem Node'da çalışır (dosya sistemi kullanmaz).

const DERECE = Math.PI / 180

// --- Sabitler -------------------------------------------------------------

export const T0 = '2027-01-01T00:00:00Z'
export const DT_SAAT = 1
export const N = 8760
export const DIREK_YUKSEKLIKLERI = [0, 2, 10]

// Direk yüksekliğine göre ufuk düşüşü (derece)
const DIREK_DUSUSU = { 0: 0, 2: 0.1, 10: 0.4 }

const GUNES_GUNU = 29.53 // sinodik ay (gün) — Ay'da bir güneş günü
const GUNES_DELTA_GENLIK = 1.54
const GUNES_DELTA_DONEM = 346.62

const DUNYA_DELTA_GENLIK = 6.7
const DUNYA_DELTA_DONEM = 27.21
const DUNYA_LAMBDA_GENLIK = 7.9
const DUNYA_LAMBDA_DONEM = 27.55

// CLAUDE.md bölüm 10. `taban` TEST İÇİN UYDURULMUŞTUR.
export const SAHTE_BOLGELER = [
  { site: 'Peak near Cabeus B', lat: -82.2, lon: 326.0, taban: -2.5 },
  { site: 'Haworth', lat: -87.5, lon: 355.0, taban: 2.0 },
  { site: 'Malapert Massif', lat: -86.0, lon: 2.7, taban: -3.5 },
  { site: 'Mons Mouton', lat: -84.3, lon: 160.0, taban: -3.0 },
  { site: 'Mons Mouton Plateau', lat: -84.6, lon: 161.0, taban: -2.5 },
  { site: 'Nobile Rim 1', lat: -85.4, lon: 32.0, taban: -1.0 },
  { site: 'Nobile Rim 2', lat: -84.8, lon: 50.0, taban: -1.0 },
  { site: 'de Gerlache Rim 2', lat: -88.5, lon: 290.0, taban: -1.5 },
  { site: 'Slater Plain', lat: -88.1, lon: 5.0, taban: 1.0 },
]

// --- Yardımcılar ----------------------------------------------------------

/** Bölge adından dosya adı: küçük harf, boşluk yerine _, yalnız [a-z0-9_]. */
export function dosyaAdi(site) {
  return (
    site
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ı/g, 'i')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '') + '.json'
  )
}

/** Metinden 32 bit tohum (FNV-1a). */
export function metindenTohum(metin) {
  let h = 0x811c9dc5
  for (let i = 0; i < metin.length; i++) {
    h ^= metin.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Tohumlu sözde rastgele üreteç; [0, 1) döndürür. */
export function mulberry32(tohum) {
  let a = tohum >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const aralik = (rng, alt, ust) => alt + (ust - alt) * rng()

/** İki azimut arasındaki döngüsel fark, [-180, 180). */
export function donguselFark(a, b) {
  return ((((a - b + 180) % 360) + 360) % 360) - 180
}

const yuvarla = (x) => {
  const r = Math.round(x * 100) / 100
  return r === 0 ? 0 : r // -0 → 0
}

// --- Gök mekaniği ---------------------------------------------------------

/**
 * Ekvatoral koordinatlardan ufuk koordinatlarına.
 * @param {number} phi   enlem (derece)
 * @param {number} delta yükselim/deklinasyon (derece)
 * @param {number} H     saat açısı (derece)
 * @returns {{alt: number, az: number}} derece; az ∈ [0, 360), 0° = kuzey, saat yönü
 */
export function altAz(phi, delta, H) {
  const p = phi * DERECE
  const d = delta * DERECE
  const h = H * DERECE
  const sinH = Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(h)
  const alt = Math.asin(Math.max(-1, Math.min(1, sinH))) / DERECE
  const kuzey = Math.cos(p) * Math.sin(d) - Math.sin(p) * Math.cos(d) * Math.cos(h)
  const dogu = -Math.cos(d) * Math.sin(h)
  let az = Math.atan2(dogu, kuzey) / DERECE
  az = ((az % 360) + 360) % 360
  return { alt, az }
}

export function gunesKonumu(tGun, lon) {
  return {
    delta: GUNES_DELTA_GENLIK * Math.sin((2 * Math.PI * tGun) / GUNES_DELTA_DONEM),
    H: lon + (360 * tGun) / GUNES_GUNU,
  }
}

export function dunyaKonumu(tGun, lon) {
  const delta = DUNYA_DELTA_GENLIK * Math.sin((2 * Math.PI * tGun) / DUNYA_DELTA_DONEM)
  const lamE = DUNYA_LAMBDA_GENLIK * Math.sin((2 * Math.PI * tGun) / DUNYA_LAMBDA_DONEM)
  return { delta, H: lon - lamE }
}

// --- Ufuk profili ---------------------------------------------------------

/** Bölgeye özgü 3-5 Gauss tümseği (tohumlu). */
export function tumsekUret(site) {
  const rng = mulberry32(metindenTohum(site))
  const adet = 3 + Math.floor(rng() * 3) // 3, 4 veya 5
  const tumsekler = []
  for (let i = 0; i < adet; i++) {
    tumsekler.push({
      a: aralik(rng, 0.5, 4),
      A: aralik(rng, 0, 360),
      s: aralik(rng, 15, 60),
    })
  }
  return tumsekler
}

/** hm = 0 için 360 elemanlı ufuk profili (0°..359°, 1° adım). */
export function ufukProfili(taban, tumsekler) {
  const profil = new Float32Array(360)
  for (let A = 0; A < 360; A++) {
    let h = taban
    for (const { a, A: Ai, s } of tumsekler) {
      const d = donguselFark(A, Ai)
      h += a * Math.exp(-(d * d) / (2 * s * s))
    }
    profil[A] = h
  }
  return profil
}

// --- Bölge verisi ---------------------------------------------------------

/** Bir bölge için sözleşmeye uygun nesne üretir (sayılar 2 ondalık). */
export function bolgeVerisiUret({ site, lat, lon, taban }) {
  const tabanProfil = ufukProfili(taban, tumsekUret(site))
  const horizon = {}
  for (const hm of DIREK_YUKSEKLIKLERI) {
    horizon[String(hm)] = Array.from(tabanProfil, (h) => yuvarla(h - DIREK_DUSUSU[hm]))
  }

  const sun_alt = new Array(N)
  const sun_az = new Array(N)
  const earth_alt = new Array(N)
  const earth_az = new Array(N)

  for (let k = 0; k < N; k++) {
    const tGun = (k * DT_SAAT) / 24

    const g = gunesKonumu(tGun, lon)
    const gs = altAz(lat, g.delta, g.H)
    sun_alt[k] = yuvarla(gs.alt)
    sun_az[k] = yuvarla(gs.az) % 360 // 359.996 → 360 → 0

    const d = dunyaKonumu(tGun, lon)
    const ds = altAz(lat, d.delta, d.H)
    earth_alt[k] = yuvarla(ds.alt)
    earth_az[k] = yuvarla(ds.az) % 360
  }

  return {
    site,
    lat,
    lon,
    mast_heights_m: DIREK_YUKSEKLIKLERI,
    horizon,
    t0: T0,
    dt_hours: DT_SAAT,
    n: N,
    sun_alt,
    sun_az,
    earth_alt,
    earth_az,
  }
}
