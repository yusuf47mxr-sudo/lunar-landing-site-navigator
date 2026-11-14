// 3B sahnenin ortak sabitleri ve yön hesabı.
// Eksenler: +x doğu, −z kuzey, +y yukarı; birim metre. Merkez = iniş noktası.

import { Vector3 } from 'three'

export const DERECE = Math.PI / 180

/** Gerçek arazinin (LOLA) yarıçapı (m): 10×10 km karenin içine sığan daire. */
export const ARAZI_YARICAP = 4975
/**
 * Uzak ufuk çizgisinin yarıçapı (m): etek burada R·tan(H(az))'ya ulaşır;
 * merkezden bakınca ufuk profili tam olarak 2B görünümdeki H(A)'dır.
 */
export const UFUK_YARICAP = 9000
/**
 * Ufuktan dışarı uzanan koni sacağın dış yarıçapı (m). Sacak her azimutta
 * ufuk açısındadır (y = r·tan H); gök küresinin ötesine uzandığı için ufkun
 * altındaki Güneş/Dünya her kameradan derinlik testiyle örtülür.
 */
export const SACAK_YARICAP = 20000
/** Güneş ve Dünya'nın durduğu gök küresi: ufukla aynı merkezli, 1.1 katı. */
export const GOK_YARICAP = UFUK_YARICAP * 1.1
export const YILDIZ_YARICAP = 150000
/** Kamera uzak düzlemi: yıldızların ötesi. */
export const KAMERA_UZAK = 400000

/**
 * Güneş diskinin çizilen açısal yarıçapı (°). Gerçek 0.266°; biraz büyük ki
 * görünsün, ama çok büyük değil: f ≤ 0.5 iken diskin çoğu silüetin arkasında kalsın.
 */
export const GUNES_DISK_DERECE = 0.45
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

/** Sahne noktasının azimutu (°, [0, 360)). */
export function azimut(x, z) {
  const a = Math.atan2(x, -z) / DERECE
  return a < 0 ? a + 360 : a
}
