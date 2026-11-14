// Arazi ağı: 201×201 LOLA yükseklik ızgarası, Ay regoliti malzemesi,
// kalıcı gölge (never_lit) örtüsü ve arazinin ötesindeki koyu taban.
//
// Renk yüksekliğe göre hafifçe değişir (alçak koyu, yüksek açık) ve vertex
// başına küçük bir gürültüyle "plastik" görünüm kırılır. Düşey abartı grubun
// y ölçeğiyle uygulanır; normal matrisi three tarafından düzeltilir.

import { useMemo } from 'react'
import { BufferAttribute, BufferGeometry, DoubleSide } from 'three'
import { yukseklik } from './veri.js'

const RENK_ALCAK = [0.33, 0.32, 0.31]
const RENK_YUKSEK = [0.6, 0.58, 0.56]
const GURULTU = 0.035
/** Kalıcı gölge örtüsünün arazi üstündeki yüksekliği (m, abartısız). */
const ORTU_YUKSEKLIK = 3
export const NEVER_LIT_RENK = '#7fa3c8'

/** Belirleyici vertex gürültüsü (−1…1). */
function karistir(k) {
  let x = (k * 374761393 + 668265263) | 0
  x = (x ^ (x >>> 13)) * 1274126177
  x = (x ^ (x >>> 16)) >>> 0
  return (x / 4294967295) * 2 - 1
}

export function araziGeometrisi(arazi) {
  const { n, adim, yariGenislik, dz, enAz, enCok } = arazi
  const konum = new Float32Array(n * n * 3)
  const renk = new Float32Array(n * n * 3)
  const aralik = Math.max(1, enCok - enAz)
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i
      const h = dz[k]
      konum[k * 3] = i * adim - yariGenislik
      konum[k * 3 + 1] = h
      konum[k * 3 + 2] = yariGenislik - j * adim // j güneyden kuzeye → z azalır
      const t = (h - enAz) / aralik
      const g = karistir(k) * GURULTU
      for (let c = 0; c < 3; c++) renk[k * 3 + c] = RENK_ALCAK[c] + (RENK_YUKSEK[c] - RENK_ALCAK[c]) * t + g
    }
  }
  const indeks = new Uint32Array((n - 1) * (n - 1) * 6)
  let p = 0
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i
      const b = a + 1
      const c = a + n
      const d = c + 1
      // Saat yönünün tersi (+y'den bakınca): a (gb), b (gd), c (kb)
      indeks[p++] = a
      indeks[p++] = b
      indeks[p++] = c
      indeks[p++] = b
      indeks[p++] = d
      indeks[p++] = c
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(konum, 3))
  g.setAttribute('color', new BufferAttribute(renk, 3))
  g.setIndex(new BufferAttribute(indeks, 1))
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

/**
 * never_lit = 1 hücrelerinin örtüsü: hücre 100 m, arazi 50 m; her hücre
 * 3×3 köşeyle araziye oturtulur ve ORTU_YUKSEKLIK kadar yukarı alınır.
 */
export function neverLitGeometrisi(arazi) {
  const nl = arazi.neverLit
  if (!nl) return null
  const { n, spacing_m: hucre, values } = nl
  const yari = (n * hucre) / 2
  const alt = 2 // hücre başına bölme (50 m)
  const konum = []
  const indeks = []
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (!values[j * n + i]) continue
      const x0 = i * hucre - yari
      const z0 = yari - (j + 1) * hucre // kuzey = −z
      const taban = konum.length / 3
      for (let v = 0; v <= alt; v++) {
        for (let u = 0; u <= alt; u++) {
          const x = x0 + (u / alt) * hucre
          const z = z0 + (v / alt) * hucre
          konum.push(x, yukseklik(arazi, x, z) + ORTU_YUKSEKLIK, z)
        }
      }
      for (let v = 0; v < alt; v++) {
        for (let u = 0; u < alt; u++) {
          const a = taban + v * (alt + 1) + u
          indeks.push(a, a + 1, a + alt + 1, a + 1, a + alt + 2, a + alt + 1)
        }
      }
    }
  }
  if (!konum.length) return null
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(Float32Array.from(konum), 3))
  g.setIndex(indeks)
  g.computeVertexNormals()
  return g
}

/**
 * @param {object} props.arazi  veri.js araziHazirla() çıktısı
 * @param {number} props.abarti düşey abartı (1, 2, 5)
 */
export default function Arazi({ arazi, abarti = 1 }) {
  const geometri = useMemo(() => araziGeometrisi(arazi), [arazi])
  const ortu = useMemo(() => neverLitGeometrisi(arazi), [arazi])
  const tabanY = (arazi.enAz - 60) * abarti

  return (
    <group>
      <group scale={[1, abarti, 1]}>
        <mesh geometry={geometri} castShadow receiveShadow>
          <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
        </mesh>
        {ortu && (
          <mesh geometry={ortu} renderOrder={2}>
            <meshBasicMaterial
              color={NEVER_LIT_RENK}
              transparent
              opacity={0.45}
              depthWrite={false}
              side={DoubleSide}
              polygonOffset
              polygonOffsetFactor={-2}
            />
          </mesh>
        )}
      </group>
      {/* Arazinin ötesi: ufuk şeridine kadar koyu, düz taban */}
      <mesh position={[0, tabanY, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[12000, 96]} />
        <meshStandardMaterial color="#2a2927" roughness={1} metalness={0} />
      </mesh>
    </group>
  )
}
