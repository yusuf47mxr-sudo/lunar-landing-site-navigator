// Yerdeki işaretler: araziye oturan ince pusula halkası, merkezde küçük iniş
// aracı (4 bacaklı basit model; ekranda hep aynı boyutta kalır) ve etiket
// noktaları. Etiketler DOM'dadır (EkranEtiketleri): K/D/G/B, "Dünya yönü"
// (ok + yazı tek parça), "İniş noktası", "Güneş +1.6°", "Dünya −2.1°".
// Halka yarıçapı kamera kipine göre: yerden 400 m, kuş bakışında 1500 m.

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, DoubleSide, Quaternion, Vector3 } from 'three'
import { dereceBicimle } from '../../core/hesap.js'
import { DUNYA_DISK_YARICAP, GUNES_DISK_YARICAP } from './Gok.jsx'
import { DERECE, GOK_YARICAP, yatayYon, yonVektoru } from './sahne.js'
import { yukseklik } from './veri.js'

export const PUSULA_YARICAP = { yerden: 400, kus: 1500 }
const YUKARI = 3 // halka arazinin bu kadar üstünde (m, abartılı yüksekliğe eklenir)
const HALKA_DILIM = 256
const HARFLER = [
  ['K', 0],
  ['D', 90],
  ['G', 180],
  ['B', 270],
]
/** İniş aracının ekrandaki boyutu: kameraya uzaklığın bu oranı (m / m). */
const ARAC_OLCEK = 0.011

const GOLGE = '[text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_0_6px_rgba(0,0,0,0.8)]'

/** Azimut ve yarıçaptan arazi üstündeki nokta. */
function yerNoktasi(arazi, abarti, az, r, yukari = YUKARI) {
  const d = yatayYon(az).multiplyScalar(r)
  return [d.x, yukseklik(arazi, d.x, d.z) * abarti + yukari, d.z]
}

/** Araziye oturan şerit halka: iç/dış kenar her köşede arazi yüksekliğinde. */
function halkaGeometrisi(arazi, abarti, r, kalinlik) {
  const konum = new Float32Array((HALKA_DILIM + 1) * 2 * 3)
  for (let k = 0; k <= HALKA_DILIM; k++) {
    const b = (k / HALKA_DILIM) * 2 * Math.PI
    for (let s = 0; s < 2; s++) {
      const rr = r + (s ? kalinlik : -kalinlik)
      const x = rr * Math.sin(b)
      const z = -rr * Math.cos(b)
      konum.set([x, yukseklik(arazi, x, z) * abarti + YUKARI, z], (k * 2 + s) * 3)
    }
  }
  const indeks = []
  for (let k = 0; k < HALKA_DILIM; k++) {
    const a = k * 2
    indeks.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(konum, 3))
  g.setIndex(indeks)
  return g
}

/**
 * Ekran etiketleri. Her biri: { id, konum, metin, sinif, ofset?, capa?, yaricapM?, ok?, ikinci? }
 * (EkranEtiketleri ve AraziSahnesi'ndeki çizim bunları kullanır).
 * t: dil/ çeviri fonksiyonu (useDil().t); çağıran useMemo bağımlılığına koyar, dil değişince yenilenir.
 */
export function sahneEtiketleri({ arazi, abarti, r, kip, earthAz, earthAlt, sunAz, sunAlt, c, t }) {
  const liste = HARFLER.map(([harf, az]) => ({
    id: `yon-${harf}`,
    konum: yerNoktasi(arazi, abarti, az, r * 1.14, 20),
    metin: t(`ortak.yonler.${harf}`),
    sinif: `text-[13px] font-medium tracking-[0.15em] ${harf === 'K' ? 'text-white' : 'text-metin-solgun'} ${GOLGE}`,
  }))
  // Dünya yönü: halkanın içinde, okun ucu Dünya azimutuna bakar
  liste.push({
    id: 'dunya-yonu',
    konum: yerNoktasi(arazi, abarti, earthAz, r * 0.6, 20),
    yonKonum: yerNoktasi(arazi, abarti, earthAz, r, 20),
    ok: true,
    kacin: true, // harflerle ve iniş etiketiyle çakışırsa ekranda kayar
    metin: t('pusula.dunyaYonu'),
    ikinci: c === 1 ? null : t('pusula.ufkunAltinda'),
    sinif: `text-[11px] tracking-wide text-iletisim ${GOLGE}`,
  })
  if (kip !== 'yerden') {
    liste.push({
      id: 'inis',
      konum: [0, yukseklik(arazi, 0, 0) * abarti, 0],
      ofset: [0, 26],
      metin: t('pusula.inisNoktasi'),
      sinif: `text-[11px] tracking-wide text-metin ${GOLGE}`,
    })
  }
  const g = yonVektoru(sunAlt, sunAz).multiplyScalar(GOK_YARICAP)
  liste.push({
    id: 'gunes',
    konum: g.toArray(),
    capa: 'sol',
    ofset: [8, 0],
    yaricapTan: (GUNES_DISK_YARICAP * 2.5) / GOK_YARICAP, // parlama payı
    metin: `${t('ortak.gunes')} ${dereceBicimle(sunAlt)}`,
    sinif: `text-[11px] tracking-wide text-gunes ${GOLGE}`,
  })
  const d = yonVektoru(earthAlt, earthAz).multiplyScalar(GOK_YARICAP)
  liste.push({
    id: 'dunya',
    konum: d.toArray(),
    capa: 'sol',
    ofset: [8, 0],
    yaricapTan: DUNYA_DISK_YARICAP / GOK_YARICAP,
    metin: `${t('ortak.dunya')} ${dereceBicimle(earthAlt)}`,
    sinif: `text-[11px] tracking-wide text-iletisim ${GOLGE}`,
  })
  return liste
}

/** İniş aracının bacakları: gövdeden ayaklara eğik çubuklar (sabit). */
const BACAKLAR = [45, 135, 225, 315].map((a) => {
  const b = a * DERECE
  const ust = new Vector3(Math.sin(b) * 0.9, 1.1, -Math.cos(b) * 0.9)
  const ayak = new Vector3(Math.sin(b) * 2.1, 0.1, -Math.cos(b) * 2.1)
  const orta = ust.clone().add(ayak).multiplyScalar(0.5)
  const uzunluk = ust.distanceTo(ayak)
  const donus = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), ust.clone().sub(ayak).normalize())
  return { a, orta, uzunluk, donus, ayak }
})

/** Basit iniş aracı: sekizgen gövde, üst güverte, anten çanağı, 4 bacak ve ayak. ~4 m. */
function InisAraci() {
  const ref = useRef()
  const v = useMemo(() => new Vector3(), [])
  // Ekranda sabit boyut: ölçek kameraya uzaklıkla büyür
  useFrame(({ camera }) => {
    const g = ref.current
    if (!g) return
    g.getWorldPosition(v)
    g.scale.setScalar(Math.max(1, camera.position.distanceTo(v) * ARAC_OLCEK))
  })
  return (
    <group ref={ref}>
      <mesh position={[0, 1.7, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 1.2, 8]} />
        <meshStandardMaterial color="#c9a24a" metalness={0.5} roughness={0.45} emissive="#4a3610" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 2.45, 0]}>
        <boxGeometry args={[1.4, 0.3, 1.4]} />
        <meshStandardMaterial color="#d9dde3" roughness={0.6} emissive="#2a2d33" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0.35, 3.0, 0]} rotation={[0, 0, -0.5]}>
        <coneGeometry args={[0.45, 0.35, 16, 1, true]} />
        <meshStandardMaterial color="#e6edf7" roughness={0.5} side={DoubleSide} emissive="#2a2d33" emissiveIntensity={0.6} />
      </mesh>
      {BACAKLAR.map((b) => (
        <group key={b.a}>
          <mesh position={b.orta} quaternion={b.donus}>
            <cylinderGeometry args={[0.07, 0.07, b.uzunluk, 6]} />
            <meshStandardMaterial color="#9aa3ad" roughness={0.5} emissive="#22262c" emissiveIntensity={0.6} />
          </mesh>
          <mesh position={b.ayak}>
            <cylinderGeometry args={[0.28, 0.32, 0.1, 10]} />
            <meshStandardMaterial color="#9aa3ad" roughness={0.5} emissive="#22262c" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/**
 * @param {number} props.yaricap  halka yarıçapı (m)
 * @param {boolean} props.aracGorunur  iniş aracı (yerden kipte gizli: kamera onun üstünde)
 */
export default function Pusula({ arazi, abarti, yaricap = PUSULA_YARICAP.kus, aracGorunur = true }) {
  const r = yaricap
  const kalinlik = Math.max(1.5, r * 0.0022)
  const halka = useMemo(() => halkaGeometrisi(arazi, abarti, r, kalinlik), [arazi, abarti, r, kalinlik])
  const merkezY = yukseklik(arazi, 0, 0) * abarti

  return (
    <group>
      <mesh geometry={halka} renderOrder={3}>
        <meshBasicMaterial
          color="#c7d0dd"
          transparent
          opacity={0.6}
          side={DoubleSide}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-4}
        />
      </mesh>
      {aracGorunur && (
        <group position={[0, merkezY, 0]}>
          <InisAraci />
        </group>
      )}
    </group>
  )
}
