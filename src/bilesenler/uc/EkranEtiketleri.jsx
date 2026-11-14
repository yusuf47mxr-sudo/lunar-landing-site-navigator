// Sahnedeki noktaların ekran etiketleri. drei Html yerine: Canvas içinde her
// karede noktalar ekrana izdüşürülür ve kapsayıcıdaki (AraziSahnesi'nin kendi
// DOM'u) span'ların transform'u doğrudan yazılır. React durumu değişmez,
// ayrı React kökü açılmaz (React 19'da Html'in kaldırılma hatası yaşanmaz).

import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'

const v = new Vector3()

/**
 * @param {Array<{id: string, konum: number[]}>} props.noktalar
 * @param {React.MutableRefObject<Record<string, HTMLElement>>} props.spanlar  id → span
 */
export default function EkranEtiketleri({ noktalar, spanlar }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useFrame(() => {
    for (const n of noktalar) {
      const el = spanlar.current[n.id]
      if (!el) continue
      v.set(n.konum[0], n.konum[1], n.konum[2]).project(camera)
      const gorunur = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1
      if (!gorunur) {
        el.style.opacity = '0'
        continue
      }
      const x = ((v.x + 1) / 2) * size.width
      const y = ((1 - v.y) / 2) * size.height
      el.style.opacity = '1'
      el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
    }
  })
  return null
}
