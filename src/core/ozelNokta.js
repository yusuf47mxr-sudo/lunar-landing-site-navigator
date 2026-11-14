// Özel koordinat için yaklaşık alan verisi — CLAUDE.md bölüm 5.8.
// Güneş ve Dünya konumu efemeris.json'daki alt-noktalardan hesaplanır.
// Arazi hesaba katılmaz: bütün ufuk dizileri 0, sonuç `yaklasik: true`.

import { altAzDizi } from './efemeris.js'
import { UFUK_YON_SAYISI } from './sabitler.js'

export const OZEL_NOKTA_UYARISI =
  'Arazi hesaba katılmadı — ufuk düz kabul edildi. Gerçek değerler farklı olabilir.'

const DIREK_YUKSEKLIKLERI = [0, 2, 10]

/** Özel noktanın görünen adı, ör. "Özel nokta (0.67°, 23.47°)". */
export function ozelNoktaAdi(lat, lon) {
  return `Özel nokta (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`
}

/**
 * @param {number} lat enlem (derece, [-90, 90])
 * @param {number} lon boylam (derece; [0, 360)'a indirgenir)
 * @param {object} efemeris veri.js efemerisYukle() çıktısı (Float32Array alt-noktalar)
 * @returns bölüm 4.1 yapısında alan nesnesi (diziler Float32Array) + yaklasik: true
 */
export function ozelNoktaOlustur(lat, lon, efemeris) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new RangeError(`Geçersiz enlem: ${lat}`)
  if (!Number.isFinite(lon)) throw new RangeError(`Geçersiz boylam: ${lon}`)
  const boylam = ((lon % 360) + 360) % 360

  const gunes = altAzDizi(lat, boylam, efemeris.sun_sub_lat, efemeris.sun_sub_lon)
  const dunya = altAzDizi(lat, boylam, efemeris.earth_sub_lat, efemeris.earth_sub_lon)

  const horizon = {}
  for (const hm of DIREK_YUKSEKLIKLERI) horizon[String(hm)] = new Float32Array(UFUK_YON_SAYISI)

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
  }
}
