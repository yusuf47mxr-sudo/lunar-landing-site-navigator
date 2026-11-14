// Gök ve ışık: Güneş (yönlü ışık + parlak disk), Dünya (mavi-beyaz küre,
// gerçek boyutun ~3 katı; c = 0 iken içi boş halka), çok zayıf ortam ışığı,
// Dünya görünürken hafif mavi dolgu (earthshine) ve sönük yıldızlar.
//
// Güneş ışığının şiddeti f ile ölçeklenir: disk uzak arazinin arkasına
// girdikçe sahne kararır (Ay'da atmosfer yok, gölgeler zifiri).
// Yalnız Güneş diski ton eşlemesinden muaf ve çok parlaktır; Bloom eşiği
// (AraziSahnesi) onun dışındaki hiçbir şeyi parlatmaz.

import { Billboard, Stars } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DERECE, DUNYA_DISK_DERECE, GOK_UZAKLIK, GUNES_DISK_DERECE, YILDIZ_YARICAP, yonVektoru } from './sahne.js'

const GUNES_SIDDET = 2.4
/** Ay'da atmosfer yok: ortam çok zayıf; yalnız sahne tamamen kaybolmasın diye */
const ORTAM_SIDDET = 0.12
const GUNES_RENK = '#fff4e0'
/** Ton eşlemesiz, Bloom eşiğinin (AraziSahnesi BLOOM_ESIK) çok üstünde */
export const GUNES_DISK_RENK = [9, 7.6, 5.6]
const DUNYA_RENK = '#5b9be6'
const DUNYA_GECE = '#060d1c'
export const DUNYA_HALKA_RENK = '#22d3ee'

/**
 * @param {number} props.sunAlt, props.sunAz, props.earthAlt, props.earthAz  (°)
 * @param {number} props.f  Güneş diskinin görünen oranı (0–1)
 * @param {0|1}    props.c  iletişim durumu
 * @param {number} props.golgeYari  gölge kamerasının yarı genişliği (m); araziyi sıkı sarar
 */
export default function Gok({ sunAlt, sunAz, earthAlt, earthAz, f, c, golgeYari }) {
  const isik = useRef()
  const gunesYon = useMemo(() => yonVektoru(sunAlt, sunAz), [sunAlt, sunAz])
  const dunyaYon = useMemo(() => yonVektoru(earthAlt, earthAz), [earthAlt, earthAz])
  const gunesKonum = useMemo(() => gunesYon.clone().multiplyScalar(GOK_UZAKLIK), [gunesYon])
  const dunyaKonum = useMemo(() => dunyaYon.clone().multiplyScalar(GOK_UZAKLIK), [dunyaYon])
  const gunesR = GOK_UZAKLIK * Math.tan(GUNES_DISK_DERECE * DERECE)
  const dunyaR = GOK_UZAKLIK * Math.tan(DUNYA_DISK_DERECE * DERECE)
  // Dünya'nın gece yarısı: Güneş'in tersine bakan yarım küre
  const geceHedef = useMemo(() => dunyaKonum.clone().sub(gunesYon), [dunyaKonum, gunesYon])

  // Işığın hedefi sahne merkezi; hedef nesnesi sahneye eklenmeli
  useFrame(() => {
    if (isik.current) isik.current.target.updateMatrixWorld()
  })

  // Disk yalnız geometrik ufkun üstündeyken çizilir (sunAlt + ρ > 0): yüksek
  // kameradan ufuk şeridinin üstü görülebildiği için ufkun altındaki Güneş
  // yoksa "sızar". Uzak arazinin arkasındaysa (f = 0, alt > 0) parlaması
  // sırtın üstünden görünür; bu istenen etki.
  const gunesUfkunUstunde = sunAlt + 0.266 > 0

  return (
    <>
      <ambientLight color="#aab4c8" intensity={ORTAM_SIDDET} />
      {/* Earthshine: Dünya görünürken çok hafif mavi dolgu */}
      {c === 1 && <directionalLight color="#7fb0ff" intensity={0.09} position={dunyaKonum} />}
      <directionalLight
        ref={isik}
        color={GUNES_RENK}
        intensity={GUNES_SIDDET * f}
        position={gunesYon.clone().multiplyScalar(20000)}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-radius={4}
        shadow-bias={-0.00015}
        shadow-normalBias={3}
        shadow-camera-left={-golgeYari}
        shadow-camera-right={golgeYari}
        shadow-camera-top={golgeYari}
        shadow-camera-bottom={-golgeYari}
        shadow-camera-near={20000 - golgeYari - 500}
        shadow-camera-far={20000 + golgeYari + 500}
      />

      {gunesUfkunUstunde && (
        <Billboard position={gunesKonum}>
          <mesh>
            <circleGeometry args={[gunesR, 48]} />
            <meshBasicMaterial color={GUNES_DISK_RENK} toneMapped={false} />
          </mesh>
        </Billboard>
      )}

      {c === 1 ? (
        <group position={dunyaKonum}>
          <mesh>
            <sphereGeometry args={[dunyaR, 48, 32]} />
            <meshBasicMaterial color={DUNYA_RENK} />
          </mesh>
          <GeceYarisi hedef={geceHedef} r={dunyaR} />
        </group>
      ) : (
        <Billboard position={dunyaKonum}>
          <mesh>
            <ringGeometry args={[dunyaR * 0.9, dunyaR, 64]} />
            <meshBasicMaterial color={DUNYA_HALKA_RENK} transparent opacity={0.55} />
          </mesh>
        </Billboard>
      )}

      <Stars radius={YILDIZ_YARICAP} depth={30000} count={3500} factor={900} saturation={0} fade speed={0} />
    </>
  )
}

/** Dünya'nın karanlık yarısı: +z yarım küre, Güneş'in tersine çevrilir. */
function GeceYarisi({ hedef, r }) {
  const ref = useRef()
  useFrame(() => {
    if (ref.current) ref.current.lookAt(hedef)
  })
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[r * 1.004, 48, 32, 0, Math.PI]} />
        <meshBasicMaterial color={DUNYA_GECE} transparent opacity={0.9} />
      </mesh>
    </group>
  )
}
