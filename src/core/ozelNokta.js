// Özel koordinat için yaklaşık alan verisi — CLAUDE.md bölüm 5.8.
// Güneş ve Dünya konumu efemeris.json'daki alt-noktalardan hesaplanır.
// Ufuk iki seviyeli (paket rehberi §5):
//   80°G'nin güneyi: 400 m kutup DEM'inden kaba ufuk (paketin model.js
//                    horizonFromDem'i; 0/2/10 m direk, 720 yön) — ufukKaynagi 'dem400'
//   diğer yerler:    düz ufuk (bütün diziler 0) — ufukKaynagi 'duz'
// Her iki durumda `yaklasik: true` ve görünür uyarı.

import { altAzDizi } from './efemeris.js'
import { KUTUP_DEM_ENLEM } from './kutupDem.js'
import { UFUK_YON_SAYISI } from './sabitler.js'

export const OZEL_NOKTA_UYARISI =
  'Arazi hesaba katılmadı — ufuk düz kabul edildi. Gerçek değerler farklı olabilir.'

/**
 * Kaba ufuk uyarısı. Sayılar paketin ENTEGRASYON_REHBERI §5'inden: Haworth
 * ızgarasında 14 günlük pencerede kaba hesap Güneş %'sini ortalama +7.9 puan
 * fazla buluyor, RMSE 11.7 puan.
 */
export const KABA_UFUK_UYARISI = 'Kaba tahmin: 400 m arazi; Güneş % ortalama +8 puan fazla çıkabilir (RMSE 12).'

/** Özel nokta için kısa etiket ve uzun uyarı (ufuk kaynağına göre). */
export function ozelNoktaNotu(alan) {
  return alan?.ufukKaynagi === 'dem400'
    ? { kisa: 'Kaba ufuk (400 m arazi)', uzun: KABA_UFUK_UYARISI, csv: '# Kaba ufuk: 400 m kutup DEM (Güneş % ort. +8 puan fazla, RMSE 12)' }
    : { kisa: 'Arazi hesaba katılmadı', uzun: OZEL_NOKTA_UYARISI, csv: '# Arazi hesaba katılmadı' }
}

/** Bu enlemde kaba ufuk hesaplanabilir mi (kutup DEM'inin içinde). */
export const kabaUfukVar = (lat) => Number.isFinite(lat) && lat <= KUTUP_DEM_ENLEM

/**
 * 400 m DEM'den 0/2/10 m direk için 720 yönlü ufuk (paketin model.js
 * horizonFromDem'i; Model ana pakete girmesin diye dışarıdan, dinamik yüklenip verilir).
 * @returns {{ horizon: Record<string, Float32Array>, ground_m: number } | null} DEM dışında null
 */
export function kabaUfuklar(Model, dem, lat, lon) {
  const horizon = {}
  let ground = null
  for (const hm of DIREK_YUKSEKLIKLERI) {
    const s = Model.horizonFromDem(dem, lat, lon, { mast: hm, nAz: 720 })
    if (!s) return null
    horizon[String(hm)] = Float32Array.from(s.horizon_deg)
    ground = s.ground_m
  }
  return { horizon, ground_m: ground }
}

const DIREK_YUKSEKLIKLERI = [0, 2, 10]

/** Özel noktanın görünen adı, ör. "Özel nokta (0.67°, 23.47°)". */
export function ozelNoktaAdi(lat, lon) {
  return `Özel nokta (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`
}

/**
 * @param {number} lat enlem (derece, [-90, 90])
 * @param {number} lon boylam (derece; [0, 360)'a indirgenir)
 * @param {object} efemeris veri.js efemerisYukle() çıktısı (Float32Array alt-noktalar)
 * @param {object|null} [kaba] kabaUfuklar() sonucu; verilirse düz ufuk yerine kullanılır
 * @returns bölüm 4.1 yapısında alan nesnesi (diziler Float32Array) + yaklasik: true + ufukKaynagi
 */
export function ozelNoktaOlustur(lat, lon, efemeris, kaba = null) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new RangeError(`Geçersiz enlem: ${lat}`)
  if (!Number.isFinite(lon)) throw new RangeError(`Geçersiz boylam: ${lon}`)
  const boylam = ((lon % 360) + 360) % 360

  const gunes = altAzDizi(lat, boylam, efemeris.sun_sub_lat, efemeris.sun_sub_lon)
  const dunya = altAzDizi(lat, boylam, efemeris.earth_sub_lat, efemeris.earth_sub_lon)

  let horizon = kaba?.horizon
  if (!horizon) {
    horizon = {}
    for (const hm of DIREK_YUKSEKLIKLERI) horizon[String(hm)] = new Float32Array(UFUK_YON_SAYISI)
  }

  return {
    site: ozelNoktaAdi(lat, boylam),
    lat,
    lon: boylam,
    mast_heights_m: DIREK_YUKSEKLIKLERI,
    horizon,
    t0: efemeris.t0,
    dt_hours: efemeris.dt_hours,
    n: efemeris.n,
    sun_alt: gunes.alt,
    sun_az: gunes.az,
    earth_alt: dunya.alt,
    earth_az: dunya.az,
    sun_au: efemeris.sun_au ?? null,
    yaklasik: true,
    ufukKaynagi: kaba ? 'dem400' : 'duz',
    ground_m: kaba?.ground_m ?? null,
  }
}
