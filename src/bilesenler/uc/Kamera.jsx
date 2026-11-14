// Kamera ve yörünge denetimi.
//
// İki kip:
//   yerden — merkezde, zeminin 2 m üstünde; Güneş azimutuna, ufkun 3° altına
//            bakar (FOV 60°): ufuk silüeti ve alçak Güneş birlikte kadrajda.
//            Sürükleme etrafa bakar.
//   kus    — Güneş'in karşı tarafından merkeze bakan yörünge (FOV 55°); yakınlaşma açık.
// "Güneş'e bak" ve "Dünya'ya bak" kipi korur: yerden → doğrudan o nesneye
// döner; kuş bakışında → nesnenin karşı tarafına geçer, nesne arazinin
// üstünde karşıdan görünür.
//
// Geçişler ~1 sn (smoothstep), FOV da ara değerlenir. Sayfa oturumunda 3B ilk
// açıldığında kamera yüksekten alana 2 sn'lik bir uçuşla iner (bir kez).
// Kamera yerin altına inemez (zemin.y'ye kenetlenir); kaydırma kapalı.

import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { yatayYon, yonVektoru } from './sahne.js'

const GECIS_SURE = 1.0 // sn
const ACILIS_SURE = 2.0 // sn
const GOZ_YUKSEKLIK = 2 // m
const YERDEN_EGIM = -3 // ° (ufka hafif aşağı)
const KUS_UZAKLIK = 6500
const KUS_YUKSEKLIK = 3200
const ACILIS_YUKSEKLIK = 30000
const EN_AZ_YER_PAYI = 2.5
export const FOV = { yerden: 60, kus: 55 }

const KIP_SINIRLARI = {
  yerden: { minDistance: 1, maxDistance: 1, enableZoom: false, rotateSpeed: -0.35, minPolarAngle: 0.3, maxPolarAngle: Math.PI / 2 + 0.3 },
  kus: { minDistance: 400, maxDistance: 14000, enableZoom: true, rotateSpeed: 0.6, minPolarAngle: 0.08, maxPolarAngle: Math.PI / 2 - 0.06 },
}

/** Sayfa oturumunda açılış uçuşu yapıldı mı (3B kapatılıp açılınca tekrarlanmaz). */
let acilisYapildi = false

const yumusak = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) // ease-in-out
const duzgun = (t) => t * t * (3 - 2 * t)

/**
 * @param {object} props.komut  { tip: 'yerden'|'kus'|'gunes'|'dunya', sira }
 *        sira değişince komut yeniden uygulanır (aynı tip tekrar seçilebilsin).
 * @param {object} props.zemin  Arazi.zeminOlustur() çıktısı (zemin.y(x, z))
 * @param {number} props.sunAlt, props.sunAz, props.earthAlt, props.earthAz
 */
export default function Kamera({ komut, zemin, sunAlt, sunAz, earthAlt, earthAz }) {
  const camera = useThree((s) => s.camera)
  const denetim = useRef()
  const kip = useRef('kus')
  const gecis = useRef(null) // { basPoz, basHedef, basFov, sonPoz, sonHedef, sonFov, t, sure, acilis }
  const guncel = useRef({ zemin, sunAlt, sunAz, earthAlt, earthAz })
  guncel.current = { zemin, sunAlt, sunAz, earthAlt, earthAz }

  const merkezY = () => guncel.current.zemin.y(0, 0)

  /** Komut → hedef konum, bakış noktası ve FOV */
  const hedefHesapla = (tip) => {
    const g = guncel.current
    if (tip === 'yerden' || tip === 'kus') kip.current = tip
    if (kip.current === 'yerden') {
      const poz = new Vector3(0, merkezY() + GOZ_YUKSEKLIK, 0)
      let bakis
      if (tip === 'gunes') bakis = yonVektoru(g.sunAlt, g.sunAz)
      else if (tip === 'dunya') bakis = yonVektoru(g.earthAlt, g.earthAz)
      else bakis = yonVektoru(YERDEN_EGIM, g.sunAz)
      return { poz, hedef: poz.clone().add(bakis), fov: FOV.yerden }
    }
    const az = tip === 'dunya' ? g.earthAz : g.sunAz
    const poz = yatayYon(az).multiplyScalar(-KUS_UZAKLIK)
    poz.y = merkezY() + KUS_YUKSEKLIK
    return { poz, hedef: new Vector3(0, merkezY(), 0), fov: FOV.kus }
  }

  // Komut değişince geçişi başlat
  useEffect(() => {
    const d = denetim.current
    if (!d) return
    const { poz, hedef, fov } = hedefHesapla(komut.tip)
    const acilis = !acilisYapildi && kip.current === 'kus'
    if (acilis) {
      // Yüksekten, Güneş'in karşı tarafından hafif eğik iniş
      camera.position.copy(yatayYon(guncel.current.sunAz).multiplyScalar(-4000))
      camera.position.y = merkezY() + ACILIS_YUKSEKLIK
      d.target.set(0, merkezY(), 0)
    }
    gecis.current = {
      basPoz: camera.position.clone(),
      basHedef: d.target.clone(),
      basFov: camera.fov,
      sonPoz: poz,
      sonHedef: hedef,
      sonFov: fov,
      t: 0,
      sure: acilis ? ACILIS_SURE : GECIS_SURE,
      acilis,
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
      // Sekme arka plandayken birikmiş büyük dt adımı atlatmasın
      g.t = Math.min(1, g.t + Math.min(dt, 0.1) / g.sure)
      const s = g.acilis ? yumusak(g.t) : duzgun(g.t)
      camera.position.lerpVectors(g.basPoz, g.sonPoz, s)
      d.target.lerpVectors(g.basHedef, g.sonHedef, s)
      camera.fov = g.basFov + (g.sonFov - g.basFov) * s
      camera.updateProjectionMatrix()
      camera.lookAt(d.target)
      if (g.t >= 1) {
        gecis.current = null
        if (g.acilis) acilisYapildi = true
        Object.assign(d, KIP_SINIRLARI[kip.current])
        d.enabled = true
        d.update()
      }
      return
    }
    // Yerin altına inme (kuş bakışı). Yerden kipinde kamera zaten merkezde
    // GOZ_YUKSEKLIK'te durur ve 1 m yarıçaplı küre içinde döner; kenetleme
    // orada bakışı aşağı eğer, bu yüzden uygulanmaz.
    if (kip.current === 'kus') {
      const taban = guncel.current.zemin.y(camera.position.x, camera.position.z) + EN_AZ_YER_PAYI
      if (camera.position.y < taban) camera.position.y = taban
    }
  })

  return <OrbitControls ref={denetim} makeDefault enablePan={false} enableDamping dampingFactor={0.12} />
}
