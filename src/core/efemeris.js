// Alt-noktadan yükseklik ve azimut hesabı (CLAUDE.md bölüm 5.1).
// Gözlemci (phi, lam) ve Güneş/Dünya alt-noktası (subLat, subLon) derece cinsinden.
// Saat açısı H = lam - subLon.

const DERECE = Math.PI / 180

/**
 * @param {number} phi    gözlemci enlemi (derece)
 * @param {number} lam    gözlemci boylamı (derece)
 * @param {number} subLat alt-nokta enlemi (derece)
 * @param {number} subLon alt-nokta boylamı (derece)
 * @returns {{alt: number, az: number}} derece; az ∈ [0, 360), 0° = kuzey, saat yönü
 */
export function altAz(phi, lam, subLat, subLon) {
  const p = phi * DERECE
  const d = subLat * DERECE
  const h = (lam - subLon) * DERECE
  const sinP = Math.sin(p)
  const cosP = Math.cos(p)
  const sinD = Math.sin(d)
  const cosD = Math.cos(d)
  const cosH = Math.cos(h)
  const sinAlt = sinP * sinD + cosP * cosD * cosH
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DERECE
  const kuzey = cosP * sinD - sinP * cosD * cosH
  const dogu = -cosD * Math.sin(h)
  let az = Math.atan2(dogu, kuzey) / DERECE
  az = ((az % 360) + 360) % 360
  return { alt, az }
}

/**
 * altAz'ın dizi sürümü: bütün zaman adımları için tek geçişte hesaplar.
 * @returns {{alt: Float32Array, az: Float32Array}}
 */
export function altAzDizi(phi, lam, subLatDizi, subLonDizi) {
  const n = subLatDizi.length
  const alt = new Float32Array(n)
  const az = new Float32Array(n)
  for (let k = 0; k < n; k++) {
    const s = altAz(phi, lam, subLatDizi[k], subLonDizi[k])
    alt[k] = s.alt
    az[k] = s.az
  }
  return { alt, az }
}
