// Gök ve ışık: Güneş (yönlü ışık + parlak disk), Dünya (mavi-beyaz küre,
// gerçek boyutun ~3 katı; c = 0 iken içi boş halka), çok zayıf ortam ışığı,
// Dünya görünürken hafif mavi dolgu (earthshine) ve sönük yıldızlar.
//
// Güneş ve Dünya sonsuzda değil, uzak ufukla aynı merkezli gök küresinde
// (GOK_YARICAP = ufuk × 1.1). Ufkun altına indiklerinde etek ve sacak onları
// derinlik testiyle örter; elle gizleme yok. Işığın yönü aynıdır.
// Disk ve küreler her kameradan aynı açısal boyutta görünür (kameraya
// uzaklıkla ölçeklenir); kuş bakışında yakın kalan Dünya dev görünmez.
// Güneş'in çevresinde soluk bir hale vardır (yine derinlik testli): Güneş
// sırtın hemen arkasındayken halenin üst kısmı silüeti belli eder.
//
// Güneş ışığının şiddeti f ile ölçeklenir (Ay'da atmosfer yok, gölgeler zifiri).
// Yalnız Güneş diski ton eşlemesiz ve çok parlaktır; Bloom eşiği (AraziSahnesi)
// onun dışındaki hiçbir şeyi parlatmaz.

import { Billboard, Stars } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture, SRGBColorSpace, Vector3 } from 'three'
import { DERECE, DUNYA_DISK_DERECE, GOK_YARICAP, GUNES_DISK_DERECE, SACAK_YARICAP, YILDIZ_YARICAP, yonVektoru } from './sahne.js'

const GUNES_SIDDET = 2.4
/** Ay'da atmosfer yok: ortam çok zayıf; yalnız sahne tamamen kaybolmasın diye */
const ORTAM_SIDDET = 0.12
/**
 * Yıldız ışığı: f ≤ 0.5 iken (Güneş arazinin arkasında ya da ufkun altında)
 * gökten gelen çok zayıf dolgu; arazinin silüeti seçilebilsin. f 0.5 → 0
 * arasında yumuşakça açılır; Güneş görünürken kapalı.
 */
const YILDIZ_ISIGI = 0.3
const GUNES_RENK = '#fff4e0'
/** Ton eşlemesiz, Bloom eşiğinin (AraziSahnesi BLOOM_ESIK) çok üstünde */
export const GUNES_DISK_RENK = [9, 7.6, 5.6]
const DUNYA_RENK = '#5b9be6'
/** Dünya'nın gece yüzü: koyu lacivert değil, çok soluk gri-mavi disk. */
const DUNYA_GECE = '#2a3240'
export const DUNYA_HALKA_RENK = '#22d3ee'
const ISIK_UZAKLIK = 20000

const HALE_DERECE = 5
const HALE_OPAKLIK = 0.4

export const GUNES_DISK_YARICAP = GOK_YARICAP * Math.tan(GUNES_DISK_DERECE * DERECE)
export const DUNYA_DISK_YARICAP = GOK_YARICAP * Math.tan(DUNYA_DISK_DERECE * DERECE)

/**
 * Hale, kameradan Güneş'e giden ışın üzerinde, Güneş'in bu kadar gerisinde
 * çizilir: ekranda hep Güneş'le aynı yerdedir, ama önündeki her zemin (sacak
 * dahil) onu derinlik testiyle örter; yalnız gökyüzüne karşı görünür.
 */
const HALE_ARKA = SACAK_YARICAP * 1.5
const HALE_TAN = Math.tan(HALE_DERECE * DERECE)
const _isin = new Vector3()

/** Halenin dokusu: merkezde sıcak beyaz, kenara doğru üstel sönen ışıma. */
let haleDokusu = null
function haleDokusuAl() {
  if (haleDokusu) return haleDokusu
  const boyut = 256
  const tuval = document.createElement('canvas')
  tuval.width = tuval.height = boyut
  const ctx = tuval.getContext('2d')
  const g = ctx.createRadialGradient(boyut / 2, boyut / 2, 0, boyut / 2, boyut / 2, boyut / 2)
  // Sıcak beyaz, düşük doygunluk; kenarda tam sıfır (ekran kenarında ya da
  // ufukta kesilince turuncu leke kalmasın)
  g.addColorStop(0, 'rgba(255, 244, 228, 0.9)')
  g.addColorStop(0.08, 'rgba(255, 238, 215, 0.4)')
  g.addColorStop(0.3, 'rgba(255, 232, 205, 0.1)')
  g.addColorStop(0.65, 'rgba(255, 230, 200, 0.02)')
  g.addColorStop(1, 'rgba(255, 230, 200, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, boyut, boyut)
  haleDokusu = new CanvasTexture(tuval)
  haleDokusu.colorSpace = SRGBColorSpace
  return haleDokusu
}

/** Çocukları, kameradan bakınca merkezden görülen açısal boyutta tutar. */
function SabitAci({ position, children }) {
  const ref = useRef()
  useFrame(({ camera }) => {
    const g = ref.current
    if (g) g.scale.setScalar(camera.position.distanceTo(g.position) / GOK_YARICAP)
  })
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  )
}

/** Güneş halesi: her karede ışın üzerine konur, kameraya döner, sabit açıda kalır. */
function Hale({ gunesKonum }) {
  const ref = useRef()
  useFrame(({ camera }) => {
    const m = ref.current
    if (!m) return
    _isin.copy(gunesKonum).sub(camera.position)
    const uzaklik = _isin.length() + HALE_ARKA
    m.position.copy(camera.position).addScaledVector(_isin.normalize(), uzaklik)
    m.quaternion.copy(camera.quaternion)
    m.scale.setScalar(uzaklik * HALE_TAN)
  })
  return (
    <mesh ref={ref} renderOrder={1}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial map={haleDokusuAl()} transparent opacity={HALE_OPAKLIK} blending={AdditiveBlending} depthWrite={false} />
    </mesh>
  )
}

/**
 * @param {number} props.sunAlt, props.sunAz, props.earthAlt, props.earthAz  (°)
 * @param {number} props.f  Güneş diskinin görünen oranı (0–1)
 * @param {0|1}    props.c  iletişim durumu
 * @param {number} props.golgeYari  gölge kamerasının yarı genişliği (m); araziyi sıkı sarar
 * @param {number} props.golgeBoyut gölge haritası (4096; yavaş cihazda 2048)
 */
export default function Gok({ sunAlt, sunAz, earthAlt, earthAz, f, c, golgeYari, golgeBoyut = 4096 }) {
  const isik = useRef()
  const gunesYon = useMemo(() => yonVektoru(sunAlt, sunAz), [sunAlt, sunAz])
  const dunyaYon = useMemo(() => yonVektoru(earthAlt, earthAz), [earthAlt, earthAz])
  const gunesKonum = useMemo(() => gunesYon.clone().multiplyScalar(GOK_YARICAP), [gunesYon])
  const dunyaKonum = useMemo(() => dunyaYon.clone().multiplyScalar(GOK_YARICAP), [dunyaYon])
  // Dünya'nın gece yarısı: Güneş'in tersine bakan yarım küre
  const geceHedef = useMemo(() => dunyaKonum.clone().sub(gunesYon), [dunyaKonum, gunesYon])

  // Işığın hedefi sahne merkezi; hedef nesnesi sahneye eklenmeli
  useFrame(() => {
    if (isik.current) isik.current.target.updateMatrixWorld()
  })

  // Gölge haritası boyutu değişince eski harita bırakılır; three yenisini kurar
  useEffect(() => {
    const golge = isik.current?.shadow
    if (!golge) return
    golge.mapSize.set(golgeBoyut, golgeBoyut)
    if (golge.map && golge.map.width !== golgeBoyut) {
      golge.map.dispose()
      golge.map = null
    }
  }, [golgeBoyut])

  return (
    <>
      <ambientLight color="#aab4c8" intensity={ORTAM_SIDDET} />
      <hemisphereLight
        args={['#8fa3c7', '#000000']}
        intensity={YILDIZ_ISIGI * (1 - Math.min(1, Math.max(0, f / 0.5)) ** 2)}
      />
      {/* Earthshine: Dünya görünürken çok hafif mavi dolgu */}
      {c === 1 && <directionalLight color="#7fb0ff" intensity={0.09} position={dunyaKonum} />}
      <directionalLight
        ref={isik}
        color={GUNES_RENK}
        intensity={GUNES_SIDDET * f}
        position={gunesYon.clone().multiplyScalar(ISIK_UZAKLIK)}
        castShadow
        shadow-mapSize={[golgeBoyut, golgeBoyut]}
        shadow-radius={4}
        shadow-bias={-0.00015}
        shadow-normalBias={3}
        shadow-camera-left={-golgeYari}
        shadow-camera-right={golgeYari}
        shadow-camera-top={golgeYari}
        shadow-camera-bottom={-golgeYari}
        shadow-camera-near={ISIK_UZAKLIK - golgeYari - 500}
        shadow-camera-far={ISIK_UZAKLIK + golgeYari + 500}
      />

      <Hale gunesKonum={gunesKonum} />
      <SabitAci position={gunesKonum}>
        <Billboard>
          <mesh>
            <circleGeometry args={[GUNES_DISK_YARICAP, 48]} />
            <meshBasicMaterial color={GUNES_DISK_RENK} toneMapped={false} />
          </mesh>
        </Billboard>
      </SabitAci>

      {c === 1 ? (
        <SabitAci position={dunyaKonum}>
          <mesh>
            <sphereGeometry args={[DUNYA_DISK_YARICAP, 48, 32]} />
            <meshBasicMaterial color={DUNYA_RENK} />
          </mesh>
          <GeceYarisi hedef={geceHedef} r={DUNYA_DISK_YARICAP} />
        </SabitAci>
      ) : (
        <SabitAci position={dunyaKonum}>
          <Billboard>
            <mesh>
              <ringGeometry args={[DUNYA_DISK_YARICAP * 0.9, DUNYA_DISK_YARICAP, 64]} />
              <meshBasicMaterial color={DUNYA_HALKA_RENK} transparent opacity={0.55} />
            </mesh>
          </Billboard>
        </SabitAci>
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
        <meshBasicMaterial color={DUNYA_GECE} transparent opacity={0.94} />
      </mesh>
    </group>
  )
}
