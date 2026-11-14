// Ay küresinin ortak sabitleri ve koordinat dönüşümü.
//
// Küre yarıçapı 1. three.js SphereGeometry dokuyu u = 0'da −x'ten başlatır;
// eşdikdörtgen Ay dokusunda u = 0 boylam −180°, u = 0.5 boylam 0° olduğu için:
//   boylam 0° → +x, 90°D → −z, 90°B → +z, 180° → −x;  kuzey kutbu → +y.
// Seçenografik (X: 0° boylam, Y: 90°D, Z: kuzey) → three (X, Z, −Y).

import { Vector3 } from 'three'

export const DERECE = Math.PI / 180
export const AY_YARICAP_KM = 1737.4
/** Yükseklik haritası ve displacement için düşey abartı. */
export const KURE_ABARTI = 4

/** Enlem/boylam (°) → küre üzerinde birim vektör (three eksenleri). */
export function enlemBoylamVektoru(enlem, boylam, hedef = new Vector3()) {
  const p = enlem * DERECE
  const l = boylam * DERECE
  return hedef.set(Math.cos(p) * Math.cos(l), Math.sin(p), -Math.cos(p) * Math.sin(l))
}

/**
 * Bir alan için kamera konumu. 'genel': alana dönük, güney kutbu hafif öne
 * eğik (enlem 15° aşağı, −60…30 arası; bakış merkeze). 'yakin': iniş öncesi
 * yaklaşma — alanın 12° kuzeyinden, alçaktan; bakış alanın kendisine
 * (yakinBakis). Kutupta tam tepeye çıkılmaz, kamera "yukarı"sı tanımlı kalır.
 */
export function kameraDurusu(enlem, boylam, tur) {
  if (tur === 'yakin') return enlemBoylamVektoru(Math.max(-74, Math.min(74, enlem + 12)), boylam).multiplyScalar(1.42)
  return enlemBoylamVektoru(Math.max(-60, Math.min(30, enlem - 15)), boylam).multiplyScalar(3.1)
}

/** Yaklaşmada kameranın baktığı nokta: alanın yüzeydeki konumu. */
export const yakinBakis = (enlem, boylam) => enlemBoylamVektoru(enlem, boylam)
