// Yerde pusula: merkez çevresinde ince halka, kuzey oku ve Dünya yönü
// çizgisi araziye oturur (abartılı yükseklik dahil). K/D/G/B harfleri ve
// "Dünya yönü" yazısı DOM etiketidir (EkranEtiketleri); pusulaEtiketleri()
// noktalarını verir. Yarıçap kamera kipine göre: yerden 400 m, kuş bakışında
// 1500 m (uzaktan okunabilsin).

import { useMemo } from 'react'
import { DoubleSide, Shape } from 'three'
import { DERECE, yatayYon } from './sahne.js'
import { yukseklik } from './veri.js'

export const PUSULA_YARICAP = { yerden: 400, kus: 1500 }
const YUKARI = 2 // halka ve ok arazinin bu kadar üstünde (m)
const HARFLER = [
  ['K', 0],
  ['D', 90],
  ['G', 180],
  ['B', 270],
]

function kuzeyOku(r) {
  const s = new Shape()
  s.moveTo(0, r * 0.55)
  s.lineTo(-r * 0.08, r * 0.3)
  s.lineTo(r * 0.08, r * 0.3)
  s.closePath()
  return s
}

/** Azimut ve yarıçaptan arazi üstündeki nokta. */
function yerNoktasi(arazi, abarti, az, r) {
  const d = yatayYon(az).multiplyScalar(r)
  return [d.x, yukseklik(arazi, d.x, d.z) * abarti + YUKARI, d.z]
}

/** Ekran etiketleri: harfler ve Dünya yönü. [{ id, konum, metin, sinif }] */
export function pusulaEtiketleri(arazi, abarti, earthAz, r, dunyaGorunur) {
  const liste = HARFLER.map(([harf, az]) => ({
    id: `yon-${harf}`,
    konum: yerNoktasi(arazi, abarti, az, r * 1.12),
    metin: harf,
    sinif: 'text-[13px] font-light tracking-[0.2em] text-metin/85',
  }))
  liste.push({
    id: 'dunya-yonu',
    konum: yerNoktasi(arazi, abarti, earthAz, r * 1.18),
    metin: `Dünya yönü${dunyaGorunur ? '' : ' (ufkun altında / engelli)'}`,
    sinif: 'text-[11px] tracking-wide text-iletisim',
  })
  return liste
}

/**
 * @param {number} props.yaricap  halka yarıçapı (m)
 */
export default function Pusula({ arazi, abarti, earthAz, yaricap = PUSULA_YARICAP.kus }) {
  const r = yaricap
  const merkezY = yukseklik(arazi, 0, 0) * abarti + YUKARI
  const ok = useMemo(() => kuzeyOku(r), [r])
  const kalinlik = Math.max(3, r * 0.006)

  return (
    <group>
      <mesh position={[0, merkezY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r - kalinlik, r + kalinlik, 128]} />
        <meshBasicMaterial color="#8a97ac" transparent opacity={0.55} side={DoubleSide} depthWrite={false} />
      </mesh>
      {/* Kuzey oku: XY düzlemindeki şekil yere yatırılır; şeklin +y ekseni → −z (kuzey) */}
      <mesh position={[0, merkezY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <shapeGeometry args={[ok]} />
        <meshBasicMaterial color="#e6edf7" transparent opacity={0.8} side={DoubleSide} depthWrite={false} />
      </mesh>
      {/* Dünya yönü: halka üstünde ince çizgi */}
      <group position={yerNoktasi(arazi, abarti, earthAz, r)} rotation-y={-earthAz * DERECE}>
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[kalinlik * 2.5, r * 0.22]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.9} side={DoubleSide} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}
