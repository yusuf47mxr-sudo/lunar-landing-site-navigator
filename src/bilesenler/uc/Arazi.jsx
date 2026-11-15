// Arazi: merkezden ufka kadar kesintisiz, kutupsal (halka × azimut) bir zemin.
//
//   0 … ARAZI_YARICAP      gerçek LOLA arazisi (201×201 ızgaradan ara değer), × düşey abartı
//   ARAZI_YARICAP … UFUK   etek: kenar yüksekliğinden uzak ufka yumuşak geçiş; UFUK'ta
//                          tam olarak R·tan(H(az)) — uzak ufuk "şeridi" eteğin dış kenarıdır
//   UFUK … SACAK_YARICAP   koni sacak: y = r·tan(H(az)); gök küresinin ötesine uzanır
//
// Ufuk ve sacak açısal gerçektir (abartıdan etkilenmez): merkezden bakıldığında
// ufuk profili 2B görünümdeki H(A)'dır. Güneş/Dünya gök küresinde (GOK_YARICAP,
// ufkun biraz dışında) durduğu için ufkun altına inince her kameradan
// derinlik testiyle örtülür. Düşey duvar yok: kuş bakışında yapay görünmesin.
//
// Malzeme regolit: mat, yansıma (specular) bileşeni kapalı — kaba yüzeyin
// alçak Güneş'e karşı parlaması regolitte olmaz. Etek ve sacak uzaklaştıkça
// hafifçe kararır (sis değil, yalnız ton).

import { useMemo } from 'react'
import { BufferAttribute, BufferGeometry, DoubleSide } from 'three'
import { ufukOku } from '../../core/hesap.js'
import { ARAZI_YARICAP, azimut, DERECE, SACAK_YARICAP, UFUK_YARICAP } from './sahne.js'
import { yukseklik } from './veri.js'

const DILIM = 720 // 0.5° azimut adımı
const ARAZI_HALKA = 100 // 50 m radyal adım (ızgarayla aynı)
const ETEK_HALKA = 32
const SACAK_YARICAPLARI = [UFUK_YARICAP, 9600, 10500, 12000, 14000, 17000, SACAK_YARICAP]
/** Etek, kenarın azimutta yumuşatılmış hâline geçer (± bu kadar dilim, 0.5°/dilim) */
const YUMUSATMA = 24
/** Eteğin ilk bu oranında ham kenardan yumuşatılmışa geçilir */
const YUMUSAK_GECIS = 0.35

const RENK_ALCAK = [0.33, 0.32, 0.31]
const RENK_YUKSEK = [0.6, 0.58, 0.56]
const RENK_UZAK = [0.4, 0.39, 0.38] // uzak regolit tonu (ufukta)
/**
 * Etek ufka doğru kararır ve ufukta neredeyse siyah olur: uzak arazi silüete
 * karışır, Güneş'e bakan yükselen etek "dev hilal" gibi parlamaz.
 * karart(s) = UFUK_KARART + (1 − UFUK_KARART)·(1 − s)^ETEK_US
 */
const UFUK_KARART = 0.03
const ETEK_US = 2.2
/** Sacak, ufuktaki tondan dış kenarda bu orana kadar kararır. */
const SACAK_SON = 0.15
const GURULTU = 0.02
/** Kalıcı gölge örtüsünün arazi üstündeki yüksekliği (m, abartısız). */
const ORTU_YUKSEKLIK = 3
export const NEVER_LIT_RENK = '#7fa3c8'

/**
 * Belirleyici gürültü (−1…1). Konuma (50 m ızgara hücresi) bağlıdır, köşe
 * numarasına değil: merkezde sıkışan halkalarda ışınsal desen oluşmasın.
 */
const hucreGurultusu = (x, z) => karistir(Math.round(x / 50) * 4099 + Math.round(z / 50))

/** Belirleyici tamsayı karıştırma (−1…1). */
function karistir(k) {
  let x = (k * 374761393 + 668265263) | 0
  x = (x ^ (x >>> 13)) * 1274126177
  x = (x ^ (x >>> 16)) >>> 0
  return (x / 4294967295) * 2 - 1
}

const duzgun = (t) => t * t * (3 - 2 * t)
const dilimAz = (j) => (j * 360) / DILIM

/** Döngüsel kayan ortalama (± yari dilim). */
function donguselYumusat(dizi, yari) {
  const n = dizi.length
  const cikti = new Float32Array(n)
  let toplam = 0
  for (let k = -yari; k <= yari; k++) toplam += dizi[(k + n) % n]
  for (let j = 0; j < n; j++) {
    cikti[j] = toplam / (2 * yari + 1)
    toplam += dizi[(j + yari + 1) % n] - dizi[(j - yari + n) % n]
  }
  return cikti
}

/** Eteğin oranı s (0 kenar … 1 ufuk) ve azimut dilimi j için y. */
function etekY(zemin, j, s) {
  const a = duzgun(Math.min(1, s / YUMUSAK_GECIS))
  const yk = zemin.kenar[j] * (1 - a) + zemin.kenarYumusak[j] * a
  const b = s * s // ufka doğru hızlanan geçiş: merkezden bakınca ufkun üstüne taşmasın
  return yk * (1 - b) + zemin.tepe[j] * b
}

/**
 * Zemin modeli: azimut başına kenar ve ufuk değerleri + her noktada zeminin
 * y'si (kamera kenetlemesi için). Geometriyle aynı formül.
 */
export function zeminOlustur(arazi, abarti, horizon) {
  const kenar = new Float32Array(DILIM) // arazi kenarı (abartılı)
  const kenarHam = new Float32Array(DILIM) // renk için (abartısız)
  const tepe = new Float32Array(DILIM) // ufuk: R·tan H
  const tanH = new Float32Array(DILIM)
  for (let j = 0; j < DILIM; j++) {
    const az = dilimAz(j)
    const b = az * DERECE
    const h = yukseklik(arazi, ARAZI_YARICAP * Math.sin(b), -ARAZI_YARICAP * Math.cos(b))
    kenarHam[j] = h
    kenar[j] = h * abarti
    tanH[j] = Math.tan((horizon ? ufukOku(horizon, az) : 0) * DERECE)
    tepe[j] = UFUK_YARICAP * tanH[j]
  }
  const zemin = { kenar, kenarHam, kenarYumusak: donguselYumusat(kenar, YUMUSATMA), tepe, tanH }
  const ara = (fn, az) => {
    const u = (az / 360) * DILIM
    const j0 = Math.floor(u) % DILIM
    const k = u - Math.floor(u)
    return fn(j0) * (1 - k) + fn((j0 + 1) % DILIM) * k
  }
  /** Sahne noktası (x, z) → zemin y'si (m). */
  zemin.y = (x, z) => {
    const r = Math.hypot(x, z)
    if (r <= ARAZI_YARICAP) return yukseklik(arazi, x, z) * abarti
    const az = azimut(x, z)
    if (r <= UFUK_YARICAP) {
      const s = (r - ARAZI_YARICAP) / (UFUK_YARICAP - ARAZI_YARICAP)
      return ara((j) => etekY(zemin, j, s), az)
    }
    return r * ara((j) => tanH[j], az)
  }
  return zemin
}

function geometriKur(konum, renk, indeks) {
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(konum, 3))
  g.setAttribute('color', new BufferAttribute(renk, 3))
  g.setIndex(new BufferAttribute(indeks, 1))
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

/** Halkalar arası dörtgenler; (a, b, c) saat yönünün tersi → normal yukarı. */
function halkaIndeksleri(indeks, p, ic, dis) {
  for (let j = 0; j < DILIM; j++) {
    const j1 = (j + 1) % DILIM
    const a = ic + j
    const b = ic + j1
    const c = dis + j
    const d = dis + j1
    indeks[p++] = a
    indeks[p++] = b
    indeks[p++] = c
    indeks[p++] = b
    indeks[p++] = d
    indeks[p++] = c
  }
  return p
}

/** Gerçek arazi + etek: merkez noktası, ARAZI_HALKA + ETEK_HALKA halka. Gölge düşürür ve alır. */
export function zeminGeometrisi(arazi, abarti, zemin) {
  const { enAz, enCok } = arazi
  const aralik = Math.max(1, enCok - enAz)
  const halkaSayisi = ARAZI_HALKA + ETEK_HALKA
  const n = 1 + halkaSayisi * DILIM
  const konum = new Float32Array(n * 3)
  const renk = new Float32Array(n * 3)
  const yukseklikRengi = (h, c) => {
    const t = Math.min(1, Math.max(0, (h - enAz) / aralik))
    return RENK_ALCAK[c] + (RENK_YUKSEK[c] - RENK_ALCAK[c]) * t
  }
  const h0 = yukseklik(arazi, 0, 0)
  konum.set([0, h0 * abarti, 0], 0)
  for (let c = 0; c < 3; c++) renk[c] = yukseklikRengi(h0, c)
  for (let i = 1; i <= halkaSayisi; i++) {
    const etek = i > ARAZI_HALKA
    const s = etek ? (i - ARAZI_HALKA) / ETEK_HALKA : 0
    const r = etek ? ARAZI_YARICAP + (UFUK_YARICAP - ARAZI_YARICAP) * s : (ARAZI_YARICAP * i) / ARAZI_HALKA
    for (let j = 0; j < DILIM; j++) {
      const b = dilimAz(j) * DERECE
      const x = r * Math.sin(b)
      const z = -r * Math.cos(b)
      const k = 1 + (i - 1) * DILIM + j
      if (!etek) {
        const h = yukseklik(arazi, x, z)
        konum.set([x, h * abarti, z], k * 3)
        const g = hucreGurultusu(x, z) * GURULTU
        for (let c = 0; c < 3; c++) renk[k * 3 + c] = yukseklikRengi(h, c) + g
      } else {
        konum.set([x, etekY(zemin, j, s), z], k * 3)
        // Kenar renginden uzak regolit tonuna, uzaklaştıkça hafifçe kararan
        const karart = UFUK_KARART + (1 - UFUK_KARART) * Math.pow(1 - s, ETEK_US)
        const g = hucreGurultusu(x, z) * GURULTU * (1 - s)
        for (let c = 0; c < 3; c++) {
          renk[k * 3 + c] = ((yukseklikRengi(zemin.kenarHam[j], c) + g) * (1 - s) + RENK_UZAK[c] * s) * karart
        }
      }
    }
  }
  const indeks = new Uint32Array(DILIM * 3 + (halkaSayisi - 1) * DILIM * 6)
  let p = 0
  // Merkez yelpazesi: (merkez, j+1, j) → normal yukarı
  for (let j = 0; j < DILIM; j++) {
    indeks[p++] = 0
    indeks[p++] = 1 + ((j + 1) % DILIM)
    indeks[p++] = 1 + j
  }
  for (let i = 1; i < halkaSayisi; i++) p = halkaIndeksleri(indeks, p, 1 + (i - 1) * DILIM, 1 + i * DILIM)
  return geometriKur(konum, renk, indeks)
}

/**
 * Ufuktan dışarı koni sacak: y = r·tan H; ufuktaki koyu tondan dışa doğru
 * düzgünce siyaha kararır. Normaller hep yukarı: H(az) dilimden dilime
 * değiştiği için hesaplanan normaller alçak Güneş'te ışınsal çizgi yapıyordu.
 * Gölge de almaz (gölge kamerasının kenarında akne olmasın).
 */
export function sacakGeometrisi(zemin) {
  const halkalar = SACAK_YARICAPLARI.length
  const konum = new Float32Array(halkalar * DILIM * 3)
  const renk = new Float32Array(halkalar * DILIM * 3)
  SACAK_YARICAPLARI.forEach((r, i) => {
    const u = (r - UFUK_YARICAP) / (SACAK_YARICAP - UFUK_YARICAP)
    const karart = UFUK_KARART * (1 - (1 - SACAK_SON) * Math.pow(u, 0.7))
    for (let j = 0; j < DILIM; j++) {
      const b = dilimAz(j) * DERECE
      const k = i * DILIM + j
      konum.set([r * Math.sin(b), r * zemin.tanH[j], -r * Math.cos(b)], k * 3)
      for (let c = 0; c < 3; c++) renk[k * 3 + c] = RENK_UZAK[c] * karart
    }
  })
  const indeks = new Uint32Array((halkalar - 1) * DILIM * 6)
  let p = 0
  for (let i = 0; i < halkalar - 1; i++) p = halkaIndeksleri(indeks, p, i * DILIM, (i + 1) * DILIM)
  const g = geometriKur(konum, renk, indeks)
  const normal = g.getAttribute('normal')
  for (let k = 0; k < normal.count; k++) normal.setXYZ(k, 0, 1, 0)
  normal.needsUpdate = true
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
      const ilk = konum.length / 3
      for (let v = 0; v <= alt; v++) {
        for (let u = 0; u <= alt; u++) {
          const x = x0 + (u / alt) * hucre
          const z = z0 + (v / alt) * hucre
          konum.push(x, yukseklik(arazi, x, z) + ORTU_YUKSEKLIK, z)
        }
      }
      for (let v = 0; v < alt; v++) {
        for (let u = 0; u < alt; u++) {
          const a = ilk + v * (alt + 1) + u
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
 * Regolit: mat, yansımasız (MeshPhysicalMaterial = Standard + specularIntensity).
 * katman verilirse (MlKatmanlari.katmanShaderEkle) fotoğraf ve tehlike örtüsü
 * malzemenin içinde, dünya konumuna göre çizilir: ayrı ağ yok, delik ya da z
 * çakışması olmaz (logaritmik derinlikte polygonOffset işlemez).
 */
function Regolit({ side, katman }) {
  return (
    <meshPhysicalMaterial
      vertexColors
      roughness={0.95}
      metalness={0}
      specularIntensity={0}
      side={side}
      onBeforeCompile={katman ? (shader) => katman.ekle(shader) : undefined}
      customProgramCacheKey={katman ? () => 'regolit-katman' : undefined}
    />
  )
}

/**
 * @param {object} props.arazi  veri.js araziHazirla() çıktısı
 * @param {number} props.abarti düşey abartı (1, 2, 5)
 * @param {object} props.zemin  zeminOlustur(arazi, abarti, horizon)
 */
export default function Arazi({ arazi, abarti = 1, zemin, katman = null }) {
  const yer = useMemo(() => zeminGeometrisi(arazi, abarti, zemin), [arazi, abarti, zemin])
  const sacak = useMemo(() => sacakGeometrisi(zemin), [zemin])
  const ortu = useMemo(() => neverLitGeometrisi(arazi), [arazi])

  return (
    <group>
      <mesh geometry={yer} castShadow receiveShadow>
        <Regolit katman={katman} />
      </mesh>
      <mesh geometry={sacak}>
        <Regolit side={DoubleSide} />
      </mesh>
      {ortu && (
        <group scale={[1, abarti, 1]}>
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
        </group>
      )}
    </group>
  )
}
