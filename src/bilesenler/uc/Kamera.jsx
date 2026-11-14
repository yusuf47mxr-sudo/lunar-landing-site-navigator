// Kamera ve yörünge denetimi.
//
// İki kip: "yerden" (merkezde, 2 m yükseklikte; sürükleme etrafa bakar) ve
// "kuş bakışı" (merkeze bakan yörünge; yakınlaşma açık). "Güneş'e bak" ve
// "Dünya'ya bak" kipi korur: yerden → o yöne döner; kuş bakışında → nesnenin
// karşı tarafına geçer, nesne arazinin üstünde karşıdan görünür.
// Her geçiş ~1 sn yumuşak ara değerle (smoothstep). Kamera yerin altına
// inemez (her karede arazi yüksekliğine kenetlenir); kaydırma kapalı.

import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { yatayYon, yonVektoru } from './sahne.js'
import { yukseklik } from './veri.js'

const GECIS_SURE = 1.0 // sn
const GOZ_YUKSEKLIK = 2 // m
const KUS_UZAKLIK = 6500
const KUS_YUKSEKLIK = 3200
const EN_AZ_YER_PAYI = 2.5

const KIP_SINIRLARI = {
  yerden: { minDistance: 1, maxDistance: 1, enableZoom: false, rotateSpeed: -0.35, minPolarAngle: 0.3, maxPolarAngle: Math.PI / 2 + 0.3 },
  kus: { minDistance: 400, maxDistance: 60000, enableZoom: true, rotateSpeed: 0.6, minPolarAngle: 0.08, maxPolarAngle: Math.PI / 2 - 0.06 },
}

const duzgun = (t) => t * t * (3 - 2 * t)

/**
 * @param {object} props.komut  { tip: 'yerden'|'kus'|'gunes'|'dunya', sira }
 *        sira değişince komut yeniden uygulanır (aynı tip tekrar seçilebilsin).
 * @param {object} props.arazi, props.abarti
 * @param {number} props.sunAlt, props.sunAz, props.earthAlt, props.earthAz
 */
export default function Kamera({ komut, arazi, abarti, sunAlt, sunAz, earthAlt, earthAz }) {
  const camera = useThree((s) => s.camera)
  const denetim = useRef()
  const kip = useRef('kus')
  const gecis = useRef(null) // { basPoz, basHedef, sonPoz, sonHedef, t }
  const guncel = useRef({ arazi, abarti, sunAlt, sunAz, earthAlt, earthAz })
  guncel.current = { arazi, abarti, sunAlt, sunAz, earthAlt, earthAz }

  const merkezY = () => yukseklik(guncel.current.arazi, 0, 0) * guncel.current.abarti

  /** Komut → hedef konum ve bakış noktası */
  const hedefHesapla = (tip) => {
    const g = guncel.current
    const yon = tip === 'dunya' ? yonVektoru(g.earthAlt, g.earthAz) : yonVektoru(g.sunAlt, g.sunAz)
    const az = tip === 'dunya' ? g.earthAz : g.sunAz
    if (tip === 'yerden' || tip === 'kus') kip.current = tip
    if (kip.current === 'yerden') {
      const poz = new Vector3(0, merkezY() + GOZ_YUKSEKLIK, 0)
      // Çok alçak/yüksek hedefte bakış biraz yere yakın tutulur
      const bakis = yon.clone()
      bakis.y = Math.max(-0.35, Math.min(0.6, bakis.y))
      return { poz, hedef: poz.clone().add(bakis.normalize()) }
    }
    const poz = yatayYon(az).multiplyScalar(-KUS_UZAKLIK)
    poz.y = merkezY() + KUS_YUKSEKLIK
    return { poz, hedef: new Vector3(0, merkezY(), 0) }
  }

  // Komut değişince geçişi başlat
  useEffect(() => {
    const d = denetim.current
    if (!d) return
    const { poz, hedef } = hedefHesapla(komut.tip)
    gecis.current = {
      basPoz: camera.position.clone(),
      basHedef: d.target.clone(),
      sonPoz: poz,
      sonHedef: hedef,
      t: 0,
    }
    d.enabled = false
    d.minDistance = 0
    d.maxDistance = Infinity
    d.minPolarAngle = 0
    d.maxPolarAngle = Math.PI
  }, [komut.sira]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    const d = denetim.current
    if (!d) return
    const g = gecis.current
    if (g) {
      g.t = Math.min(1, g.t + dt / GECIS_SURE)
      const s = duzgun(g.t)
      camera.position.lerpVectors(g.basPoz, g.sonPoz, s)
      d.target.lerpVectors(g.basHedef, g.sonHedef, s)
      camera.lookAt(d.target)
      if (g.t >= 1) {
        gecis.current = null
        Object.assign(d, KIP_SINIRLARI[kip.current])
        d.enabled = true
        d.update()
      }
      return
    }
    // Yerin altına inme (kuş bakışı). Yerden kipinde kamera zaten merkezde
    // GOZ_YUKSEKLIK'te durur ve 1 m yarıçaplı küre içinde döner; kenetleme
    // orada 1 m uzaktaki hedefe göre bakışı aşağı eğer, bu yüzden uygulanmaz.
    if (kip.current === 'kus') {
      const taban = yukseklik(guncel.current.arazi, camera.position.x, camera.position.z) * guncel.current.abarti + EN_AZ_YER_PAYI
      if (camera.position.y < taban) camera.position.y = taban
    }
  })

  return <OrbitControls ref={denetim} makeDefault enablePan={false} enableDamping dampingFactor={0.12} />
}
