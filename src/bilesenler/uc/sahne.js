// 3B sahnenin ortak sabitleri ve yön hesabı.
// Eksenler: +x doğu, −z kuzey, +y yukarı; birim metre.

import { Vector3 } from 'three'

export const DERECE = Math.PI / 180

/** Uzak ufuk şeridinin yarıçapı (m): arazinin (±5 km) dışında, köşelerin ötesinde. */
export const UFUK_YARICAP = 9000
/** Güneş, Dünya ve yıldızların uzaklığı (m); ufuk şeridinin çok ötesinde. */
export const GOK_UZAKLIK = 60000
export const YILDIZ_YARICAP = 150000
/** Kamera uzak düzlemi: yıldızların ötesi. */
export const KAMERA_UZAK = 400000

/** Güneş diskinin görünen açısal yarıçapı (°). Gerçek 0.266°; görünürlük için büyütülmüş. */
export const GUNES_DISK_DERECE = 0.9
/** Dünya'nın görünen açısal yarıçapı (°): gerçek ≈ 0.95°, ~3 katı. */
export const DUNYA_DISK_DERECE = 2.85

export const ABARTILAR = [1, 2, 5]

/** Yükseklik (°) ve azimut (°, kuzeyden saat yönünde) → birim yön vektörü. */
export function yonVektoru(alt, az, hedef = new Vector3()) {
  const a = alt * DERECE
  const b = az * DERECE
  return hedef.set(Math.cos(a) * Math.sin(b), Math.sin(a), -Math.cos(a) * Math.cos(b))
}

/** Yalnız yatay bileşen (yükseklik 0). */
export const yatayYon = (az, hedef) => yonVektoru(0, az, hedef)
