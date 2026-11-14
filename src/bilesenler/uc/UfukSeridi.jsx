// Uzak ufuk şeridi: arazinin çevresinde, her azimutta yüksekliği
// R·tan(H(az)) olan koyu bir duvar. Sahne merkezinden bakıldığında tam
// olarak ufuk profilini (2B görünümdekiyle aynı H(A)) verir; Güneş ya da
// Dünya uzak dağın arkasına girince 3B'de de kaybolur ve rozetle aynı şeyi
// söyler. Düşey abartıdan etkilenmez (açısal gerçek).
//
// Renk: altta koyu, üstte hafif açık (sisli, uzak izlenimi). Işıktan
// etkilenmez; silüet gibi durur.

import { useMemo } from 'react'
import { BufferAttribute, BufferGeometry, DoubleSide } from 'three'
import { ufukOku } from '../../core/hesap.js'
import { DERECE, UFUK_YARICAP } from './sahne.js'

const DILIM = 720 // 0.5° adım
// Doğrusal renk (ton eşlemesinden önce): gökten biraz açık, silüet gibi
const RENK_ALT = [0.008, 0.009, 0.013]
const RENK_UST = [0.03, 0.033, 0.045]

export function ufukGeometrisi(horizon, tabanY) {
  const R = UFUK_YARICAP
  const konum = new Float32Array((DILIM + 1) * 2 * 3)
  const renk = new Float32Array((DILIM + 1) * 2 * 3)
  for (let k = 0; k <= DILIM; k++) {
    const az = (k * 360) / DILIM
    const H = horizon ? ufukOku(horizon, az) : 0
    const ust = R * Math.tan(H * DERECE)
    const x = R * Math.sin(az * DERECE)
    const z = -R * Math.cos(az * DERECE)
    const a = k * 2
    konum.set([x, tabanY, z], a * 3)
    konum.set([x, ust, z], (a + 1) * 3)
    renk.set(RENK_ALT, a * 3)
    renk.set(RENK_UST, (a + 1) * 3)
  }
  const indeks = []
  for (let k = 0; k < DILIM; k++) {
    const a = k * 2
    // İçeriden (merkezden) bakınca ön yüz; DoubleSide ile yine de güvenli
    indeks.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(konum, 3))
  g.setAttribute('color', new BufferAttribute(renk, 3))
  g.setIndex(indeks)
  return g
}

/**
 * @param {Float32Array|null} props.horizon  seçili direk yüksekliğinin ufuk dizisi (360, °)
 * @param {number} props.tabanY  duvarın alt kenarı (m); tabanın altında kalsın
 */
export default function UfukSeridi({ horizon, tabanY }) {
  const geometri = useMemo(() => ufukGeometrisi(horizon, tabanY), [horizon, tabanY])
  return (
    <mesh geometry={geometri}>
      <meshBasicMaterial vertexColors side={DoubleSide} />
    </mesh>
  )
}
