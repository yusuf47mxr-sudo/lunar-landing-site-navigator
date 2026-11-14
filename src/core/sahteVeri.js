// Test için fiziksel olarak gerçekçi sahte veri üretimi.
// Çıktılar CLAUDE.md bölüm 4'teki veri sözleşmesine birebir uyar.
// Saf JS: hem tarayıcıda hem Node'da çalışır (dosya sistemi kullanmaz).

import { altAzDizi } from './efemeris.js'
import { KUTUP_SINIRI } from './sabitler.js'

// --- Sabitler -------------------------------------------------------------

export const T0 = '2027-01-01T00:00:00Z'
export const DT_SAAT = 1
export const N = 8760
export const DIREK_YUKSEKLIKLERI = [0, 2, 10]
export { KUTUP_SINIRI }

// Direk yüksekliğine göre ufuk düşüşü (derece)
const DIREK_DUSUSU = { 0: 0, 2: 0.1, 10: 0.4 }

const GUNES_GUNU = 29.53 // sinodik ay (gün) — Ay'da bir güneş günü
const GUNES_ENLEM_GENLIK = 1.54
const GUNES_ENLEM_DONEM = 346.62

const DUNYA_ENLEM_GENLIK = 6.7
const DUNYA_ENLEM_DONEM = 27.21
const DUNYA_BOYLAM_GENLIK = 7.9
const DUNYA_BOYLAM_DONEM = 27.55

// CLAUDE.md bölüm 10. `taban` TEST İÇİN UYDURULMUŞTUR.
const ARTEMIS = 'Artemis III aday bölgesi'
export const SAHTE_BOLGELER = [
  // artemis
  { site: 'Peak near Cabeus B', kategori: 'artemis', aciklama: ARTEMIS, lat: -82.2, lon: 326.0, taban: -2.5 },
  { site: 'Haworth', kategori: 'artemis', aciklama: ARTEMIS, lat: -87.5, lon: 355.0, taban: 2.0 },
  { site: 'Malapert Massif', kategori: 'artemis', aciklama: ARTEMIS, lat: -86.0, lon: 2.7, taban: -5.0 },
  { site: 'Mons Mouton', kategori: 'artemis', aciklama: ARTEMIS, lat: -84.6, lon: 31.0, taban: -3.0 },
  { site: 'Mons Mouton Plateau', kategori: 'artemis', aciklama: ARTEMIS, lat: -84.3, lon: 28.0, taban: -2.5 },
  { site: 'Nobile Rim 1', kategori: 'artemis', aciklama: ARTEMIS, lat: -85.4, lon: 38.0, taban: -1.0 },
  { site: 'Nobile Rim 2', kategori: 'artemis', aciklama: ARTEMIS, lat: -84.8, lon: 60.0, taban: -1.0 },
  { site: 'de Gerlache Rim 2', kategori: 'artemis', aciklama: ARTEMIS, lat: -88.5, lon: 290.0, taban: -1.5 },
  { site: 'Slater Plain', kategori: 'artemis', aciklama: ARTEMIS, lat: -88.1, lon: 105.0, taban: 1.0 },
  // apollo
  { site: 'Apollo 11', kategori: 'apollo', aciklama: 'İlk insanlı iniş, 1969', lat: 0.674, lon: 23.473, taban: 0 },
  { site: 'Apollo 12', kategori: 'apollo', aciklama: 'Oceanus Procellarum, 1969', lat: -3.012, lon: 336.578, taban: 0 },
  { site: 'Apollo 14', kategori: 'apollo', aciklama: 'Fra Mauro, 1971', lat: -3.645, lon: 342.529, taban: 0 },
  { site: 'Apollo 15', kategori: 'apollo', aciklama: 'Hadley-Apennine, 1971', lat: 26.132, lon: 3.634, taban: 0 },
  { site: 'Apollo 16', kategori: 'apollo', aciklama: 'Descartes, 1972', lat: -8.973, lon: 15.5, taban: 0 },
  { site: 'Apollo 17', kategori: 'apollo', aciklama: 'Taurus-Littrow, 1972', lat: 20.191, lon: 30.772, taban: 0 },
  // clps
  { site: 'IM-1 Odysseus', kategori: 'clps', aciklama: 'Malapert A yakını, 2024', lat: -80.13, lon: 1.44, taban: -2.0 },
  { site: 'IM-2 Athena', kategori: 'clps', aciklama: 'Mons Mouton, 2025', lat: -84.8, lon: 29.2, taban: -2.5 },
  { site: 'Blue Ghost 1', kategori: 'clps', aciklama: 'Mare Crisium, 2025', lat: 18.56, lon: 61.81, taban: 0 },
  // uluslararasi
  { site: "Chang'e 3", kategori: 'uluslararasi', aciklama: 'Mare Imbrium, Çin, 2013', lat: 44.12, lon: 340.49, taban: 0 },
  { site: "Chang'e 4", kategori: 'uluslararasi', aciklama: 'Uzak yüz, Çin, 2019', lat: -45.44, lon: 177.6, taban: 1.0 },
  { site: "Chang'e 5", kategori: 'uluslararasi', aciklama: 'Mons Rümker yakını, Çin, 2020', lat: 43.06, lon: 308.08, taban: 0 },
  { site: "Chang'e 6", kategori: 'uluslararasi', aciklama: 'Uzak yüz, Çin, 2024', lat: -41.63, lon: 206.01, taban: 0 },
  { site: 'Chandrayaan-3', kategori: 'uluslararasi', aciklama: 'Güney kutbu yakını, Hindistan, 2023', lat: -69.37, lon: 32.32, taban: 0 },
  { site: 'SLIM', kategori: 'uluslararasi', aciklama: 'Shioli krateri, Japonya, 2024', lat: -13.3, lon: 25.25, taban: 0 },
]

// --- Yardımcılar ----------------------------------------------------------

/**
 * Bölge adından dosya adı: küçük harf, boşluk ve tire yerine _,
 * kesme işareti ve Türkçe karakter yok. "Chang'e 4" → "change_4.json"
 */
export function dosyaAdi(site) {
  return (
    site
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ı/g, 'i')
      .replace(/['’]/g, '')
      .replace(/[\s-]+/g, '_')
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

/** [0, 360) aralığına getirir; yuvarlamadan sonra 360 çıkarsa 0 yapar. */
const tamTur = (x) => {
  const r = yuvarla(((x % 360) + 360) % 360)
  return r >= 360 ? 0 : r
}

// --- Efemeris (alt-noktalar) ----------------------------------------------

/**
 * Güneş ve Dünya alt-noktaları, tam duyarlıkta (Float64Array).
 * Boylamlar: Güneş [0, 360), Dünya [-180, 180).
 */
export function altNoktalarUret() {
  const sunSubLat = new Float64Array(N)
  const sunSubLon = new Float64Array(N)
  const earthSubLat = new Float64Array(N)
  const earthSubLon = new Float64Array(N)
  for (let k = 0; k < N; k++) {
    const tGun = (k * DT_SAAT) / 24
    sunSubLat[k] = GUNES_ENLEM_GENLIK * Math.sin((2 * Math.PI * tGun) / GUNES_ENLEM_DONEM)
    sunSubLon[k] = ((((-360 * tGun) / GUNES_GUNU) % 360) + 360) % 360
    earthSubLat[k] = DUNYA_ENLEM_GENLIK * Math.sin((2 * Math.PI * tGun) / DUNYA_ENLEM_DONEM)
    earthSubLon[k] = DUNYA_BOYLAM_GENLIK * Math.sin((2 * Math.PI * tGun) / DUNYA_BOYLAM_DONEM)
  }
  return { sunSubLat, sunSubLon, earthSubLat, earthSubLon }
}

/** efemeris.json içeriği (bölüm 4.3), sayılar 2 ondalık. */
export function efemerisVerisiUret(altNoktalar = altNoktalarUret()) {
  const { sunSubLat, sunSubLon, earthSubLat, earthSubLon } = altNoktalar
  return {
    t0: T0,
    dt_hours: DT_SAAT,
    n: N,
    sun_sub_lat: Array.from(sunSubLat, yuvarla),
    sun_sub_lon: Array.from(sunSubLon, tamTur),
    earth_sub_lat: Array.from(earthSubLat, yuvarla),
    earth_sub_lon: Array.from(earthSubLon, yuvarla),
  }
}

// --- Ufuk profili ---------------------------------------------------------

/**
 * Bölgeye özgü Gauss tümsekleri (tohumlu).
 * Kutup alanı: 3-5 tümsek, a 0.5-4°, s 15-60°.
 * Kutup dışı:  2-4 tümsek, a 0.2-1.5°, s 20-60°.
 */
export function tumsekUret(site, lat) {
  const rng = mulberry32(metindenTohum(site))
  const kutup = Math.abs(lat) >= KUTUP_SINIRI
  const adet = kutup ? 3 + Math.floor(rng() * 3) : 2 + Math.floor(rng() * 3)
  const tumsekler = []
  for (let i = 0; i < adet; i++) {
    tumsekler.push(
      kutup
        ? { a: aralik(rng, 0.5, 4), A: aralik(rng, 0, 360), s: aralik(rng, 15, 60) }
        : { a: aralik(rng, 0.2, 1.5), A: aralik(rng, 0, 360), s: aralik(rng, 20, 60) },
    )
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

/**
 * Bir bölge için sözleşmeye uygun nesne üretir (sayılar 2 ondalık).
 * Güneş ve Dünya yükseklik/azimutu, tam duyarlıklı alt-noktalardan hesaplanır.
 */
export function bolgeVerisiUret({ site, lat, lon, taban }, altNoktalar = altNoktalarUret()) {
  const tabanProfil = ufukProfili(taban, tumsekUret(site, lat))
  const horizon = {}
  for (const hm of DIREK_YUKSEKLIKLERI) {
    horizon[String(hm)] = Array.from(tabanProfil, (h) => yuvarla(h - DIREK_DUSUSU[hm]))
  }

  const gunes = altAzDizi(lat, lon, altNoktalar.sunSubLat, altNoktalar.sunSubLon)
  const dunya = altAzDizi(lat, lon, altNoktalar.earthSubLat, altNoktalar.earthSubLon)

  return {
    site,
    lat,
    lon,
    mast_heights_m: DIREK_YUKSEKLIKLERI,
    horizon,
    t0: T0,
    dt_hours: DT_SAAT,
    n: N,
    sun_alt: Array.from(gunes.alt, yuvarla),
    sun_az: Array.from(gunes.az, tamTur),
    earth_alt: Array.from(dunya.alt, yuvarla),
    earth_az: Array.from(dunya.az, tamTur),
  }
}
