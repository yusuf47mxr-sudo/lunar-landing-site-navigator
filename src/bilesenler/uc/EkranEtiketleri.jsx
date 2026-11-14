// Sahnedeki noktaların ekran etiketleri. drei Html yerine: Canvas içinde her
// karede noktalar ekrana izdüşürülür ve kapsayıcıdaki (AraziSahnesi'nin kendi
// DOM'u) öğelerin transform'u doğrudan yazılır. React durumu değişmez,
// ayrı React kökü açılmaz (React 19'da Html'in kaldırılma hatası yaşanmaz).
//
// Etiket alanları (Pusula.sahneEtiketleri):
//   konum      dünya noktası [x, y, z]
//   capa       'merkez' (varsayılan) ya da 'sol' (etiket noktanın sağında başlar)
//   ofset      [dx, dy] piksel
//   yaricapTan noktadaki diskin açısal yarıçapının tanjantı (disk kameradan sabit
//              açıda çizilir); ekrandaki karşılığı kadar yana kayar
//   yonKonum   verilirse öğedeki [data-ok] bu noktaya dönük çevrilir
//   kacin      diğer etiketlerle ekranda çakışırsa dikeyde kayar
// 'sol' çapalı etiket kapsayıcının sağına taşacaksa noktanın soluna geçer.

import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'

const v = new Vector3()
const w = new Vector3()
const sag = new Vector3()
const PAY = 4 // çakışma payı (px)

const kesisir = (a, b) =>
  a.x < b.x + b.w + PAY && b.x < a.x + a.w + PAY && a.y < b.y + b.h + PAY && b.y < a.y + a.h + PAY

/**
 * @param {Array<object>} props.noktalar
 * @param {React.MutableRefObject<Record<string, HTMLElement>>} props.ogeler  id → öğe
 */
export default function EkranEtiketleri({ noktalar, ogeler }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useFrame(() => {
    const kutular = [] // görünen etiketlerin kutuları (sol üst köşe, px)
    const kacanlar = []
    for (const n of noktalar) {
      const el = ogeler.current[n.id]
      if (!el) continue
      v.set(n.konum[0], n.konum[1], n.konum[2]).project(camera)
      if (!(v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15)) {
        el.style.opacity = '0'
        continue
      }
      const nx = ((v.x + 1) / 2) * size.width
      const ny = ((1 - v.y) / 2) * size.height
      let x = nx + (n.ofset?.[0] ?? 0)
      const y = ny + (n.ofset?.[1] ?? 0)
      const gen = el.offsetWidth
      const yuk = el.offsetHeight
      let kutu
      if (n.capa === 'sol') {
        // Diskin ekrandaki yarıçapı: noktayı kameranın sağ ekseni boyunca kaydırıp izdüşür
        // (kenarlarda perspektif diski uzatır; sabit bir piksel payı yetmez)
        let kayma = 0
        if (n.yaricapTan) {
          w.set(n.konum[0], n.konum[1], n.konum[2])
          const uzaklik = w.distanceTo(camera.position)
          sag.setFromMatrixColumn(camera.matrixWorld, 0)
          w.addScaledVector(sag, uzaklik * n.yaricapTan * 1.15).project(camera)
          kayma = Math.abs(((w.x + 1) / 2) * size.width - nx)
        }
        x += kayma
        // Sağa taşıyorsa noktanın soluna geç
        if (x + gen > size.width - 8) x = nx - kayma - (n.ofset?.[0] ?? 0) - gen
        kutu = { x, y: y - yuk / 2, w: gen, h: yuk }
      } else {
        kutu = { x: x - gen / 2, y: y - yuk / 2, w: gen, h: yuk }
      }
      const kayit = { n, el, kutu }
      if (n.kacin) {
        kacanlar.push(kayit)
        continue
      }
      kutular.push(kutu)
      yaz(kayit)
    }
    // Kaçan etiketler: ilk çakıştığı kutuya göre yön seçer (altına ya da üstüne),
    // sonraki engellerde aynı yönde kaymayı sürdürür
    for (const k of kacanlar) {
      let asagi = null
      for (let deneme = 0; deneme < 6; deneme++) {
        const engel = kutular.find((b) => kesisir(k.kutu, b))
        if (!engel) break
        if (asagi === null) asagi = k.kutu.y + k.kutu.h / 2 >= engel.y + engel.h / 2
        k.kutu.y = asagi ? engel.y + engel.h + PAY : engel.y - k.kutu.h - PAY
      }
      kutular.push(k.kutu)
      yaz(k)
    }
  })

  /** Öğeyi kutusuna yerleştirir; okluysa oku yön noktasına çevirir. */
  function yaz({ n, el, kutu }) {
    el.style.opacity = '1'
    el.style.transform = `translate(${kutu.x.toFixed(1)}px, ${kutu.y.toFixed(1)}px)`
    if (n.yonKonum) {
      const ok = el.querySelector('[data-ok]')
      v.set(n.konum[0], n.konum[1], n.konum[2]).project(camera)
      w.set(n.yonKonum[0], n.yonKonum[1], n.yonKonum[2]).project(camera)
      const aci = Math.atan2(-(w.y - v.y) * size.height, (w.x - v.x) * size.width)
      if (ok) ok.style.transform = `rotate(${aci.toFixed(3)}rad)`
    }
  }
  return null
}
