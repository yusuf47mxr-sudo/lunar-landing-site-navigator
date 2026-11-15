// Yerel sahnede v5 ML katmanları (10 alan): LROC NAC fotoğrafı, ML küçük
// kraterler ve 100 m hücre tehlikesi. Veri paketi rehberi §3, §7.
//
// Çerçeve: fotoğraf kuzey yukarı, kenarı 2·yari_m (3100 m), merkezi ızgara
// merkezi = alan noktası = arazinin merkezi. Kraterler [doğu, kuzey, D] ve
// hücreler (i, j) → ((i − 15)·100, (j − 15)·100) aynı doğu/kuzey çerçevesinde,
// metre. Sahnede +x doğu, −z kuzey (yükseklik y).
//
// Fotoğraf RENK (albedo) olarak kullanılır, gölgeyi sahnedeki Güneş yapar:
// fotoğraftaki gömülü gölgeler yüzünden kontrast %50 azaltılır, ortalama
// regolit tonuna eşlenir; kenarda 150 m'de araziye yumuşak geçiş.
// Tehlike: g (iniş ayağının krater payı) → şeffaf turuncu yoğunluk; null =
// görüntü karanlık, ML göremez → gri taralı "unknown" (asla güvenli gösterilmez).

import { useEffect, useMemo, useRef, useState } from 'react'
import { BufferAttribute, BufferGeometry, CanvasTexture, CircleGeometry, DoubleSide, Matrix4, Quaternion, RepeatWrapping, RingGeometry, SRGBColorSpace, Vector3 } from 'three'
import { yukseklik } from './veri.js'

const tabanYol = () => {
  const taban = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'
  return `${taban.replace(/\/?$/, '/')}veri/3b/`
}

/** Fotoğrafın arazinin üstündeki yüksekliği (m, abartılı yüksekliğe eklenir). */
const FOTO_YUKARI = 1.5
const KRATER_YUKARI = 1.2
const ORTU_YUKARI = 2.5
/** Kenarda araziye geçiş (m). */
const FOTO_GECIS_M = 150
/** Kontrast oranı: gömülü gölgeler yarıya iner. */
const FOTO_KONTRAST = 0.5
/** Regolit ortalama tonu (sRGB 0–255): arazinin orta yükseklik rengi ≈ 0.465 doğrusal. */
const REGOLIT_SRGB = [182, 178, 174]
export const KRATER_RENK = '#ff8a3d'
const TEHLIKE_DOYMA = 0.3 // g ≥ 0.3 en koyu

// --- Veri ---------------------------------------------------------------------

const sozler = new Map()
function jsonYukle(ad) {
  if (!sozler.has(ad)) {
    sozler.set(
      ad,
      fetch(tabanYol() + ad)
        .then((y) => {
          if (!y.ok) throw new Error(`${ad} yüklenemedi (HTTP ${y.status})`)
          return y.json()
        })
        .catch((h) => {
          sozler.delete(ad)
          throw h
        }),
    )
  }
  return sozler.get(ad)
}

/**
 * ML krater dosyası ve kalibrasyon; yalnız etkin olunca (bir katman açılınca) iner.
 * @returns {{ veri: object|null, kalibrasyon: object|null, hata: Error|null }}
 */
export function useMlVerisi(ml, etkin) {
  const [durum, setDurum] = useState({ ad: null, veri: null, kalibrasyon: null, hata: null })
  const ad = ml?.kraterler ?? null
  useEffect(() => {
    if (!ad || !etkin) return
    let iptal = false
    Promise.all([jsonYukle(ad), jsonYukle('ml_calibration.json')]).then(
      ([veri, kalibrasyon]) => !iptal && setDurum({ ad, veri, kalibrasyon, hata: null }),
      (hata) => !iptal && setDurum({ ad, veri: null, kalibrasyon: null, hata }),
    )
    return () => {
      iptal = true
    }
  }, [ad, etkin])
  return durum.ad === ad ? durum : { ad, veri: null, kalibrasyon: null, hata: null }
}

// --- Fotoğraf -----------------------------------------------------------------

const duzgun = (t) => t * t * (3 - 2 * t)

/** NAC fotoğrafını albedo dokusuna çevirir: kontrast, ortalama, kenar saydamlığı. */
function fotoDokusu(img, mPx) {
  const W = img.naturalWidth
  const H = img.naturalHeight
  const tuval = document.createElement('canvas')
  tuval.width = W
  tuval.height = H
  const ctx = tuval.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const veri = ctx.getImageData(0, 0, W, H)
  const d = veri.data
  let toplam = 0
  let sayi = 0
  for (let k = 0; k < d.length; k += 4) {
    if (d[k] > 0) {
      toplam += d[k]
      sayi++
    }
  }
  const ort = sayi ? toplam / sayi : 128
  const gecisPx = FOTO_GECIS_M / mPx
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = (y * W + x) * 4
      const sapma = (d[k] - ort) * FOTO_KONTRAST
      const kenar = Math.min(x, y, W - 1 - x, H - 1 - y)
      for (let c = 0; c < 3; c++) d[k + c] = Math.max(0, Math.min(255, REGOLIT_SRGB[c] + sapma))
      d[k + 3] = Math.round(255 * duzgun(Math.min(1, kenar / gecisPx)))
    }
  }
  ctx.putImageData(veri, 0, 0)
  const t = new CanvasTexture(tuval)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Araziye oturan kare ağ: kenar 2·yari, kuzey yukarı (uv v = 1 kuzey). */
function fotoGeometrisi(arazi, abarti, yari) {
  const adim = 124 // 25 m
  const n = adim + 1
  const konum = new Float32Array(n * n * 3)
  const uv = new Float32Array(n * n * 2)
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const u = i / adim
      const v = j / adim
      const x = -yari + 2 * yari * u
      const z = -(-yari + 2 * yari * v)
      const k = j * n + i
      konum.set([x, yukseklik(arazi, x, z) * abarti + FOTO_YUKARI, z], k * 3)
      uv.set([u, v], k * 2)
    }
  }
  const indeks = []
  for (let j = 0; j < adim; j++) {
    for (let i = 0; i < adim; i++) {
      const a = j * n + i
      indeks.push(a, a + 1, a + n, a + 1, a + n + 1, a + n)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(konum, 3))
  g.setAttribute('uv', new BufferAttribute(uv, 2))
  g.setIndex(indeks)
  g.computeVertexNormals()
  return g
}

export function NacFoto({ arazi, abarti, ml }) {
  const [doku, setDoku] = useState(null)
  useEffect(() => {
    let iptal = false
    let t = null
    const img = new Image()
    img.onload = () => {
      if (iptal) return
      t = fotoDokusu(img, ml.m_px)
      setDoku(t)
    }
    img.src = tabanYol() + ml.foto
    return () => {
      iptal = true
      t?.dispose()
    }
  }, [ml.foto, ml.m_px])
  const geometri = useMemo(() => fotoGeometrisi(arazi, abarti, ml.yari_m), [arazi, abarti, ml.yari_m])
  useEffect(() => () => geometri.dispose(), [geometri])
  if (!doku) return null
  return (
    <mesh geometry={geometri} receiveShadow renderOrder={1}>
      <meshPhysicalMaterial
        map={doku}
        transparent
        depthWrite={false}
        roughness={0.95}
        metalness={0}
        specularIntensity={0}
        polygonOffset
        polygonOffsetFactor={-3}
      />
    </mesh>
  )
}

// --- Kraterler ----------------------------------------------------------------

const _m = new Matrix4()
const _q = new Quaternion()
const _s = new Vector3()
const _p = new Vector3()
const _n = new Vector3()
const YUKARI = new Vector3(0, 1, 0)

/** Halka (ve görünmez disk) dönüşümleri: araziye oturur, eğime göre yatırılır. */
function kraterMatrisleri(arazi, abarti, kraterler) {
  const m = new Float32Array(kraterler.length * 16)
  kraterler.forEach(([e, n, D], k) => {
    const x = e
    const z = -n
    const r = D / 2
    const h = yukseklik(arazi, x, z) * abarti
    const d = Math.max(5, r)
    const gx = ((yukseklik(arazi, x + d, z) - yukseklik(arazi, x - d, z)) * abarti) / (2 * d)
    const gz = ((yukseklik(arazi, x, z + d) - yukseklik(arazi, x, z - d)) * abarti) / (2 * d)
    _n.set(-gx, 1, -gz).normalize()
    _q.setFromUnitVectors(YUKARI, _n)
    _p.set(x, h + KRATER_YUKARI + r * 0.02, z)
    _s.set(r, r, r)
    _m.compose(_p, _q, _s).toArray(m, k * 16)
  })
  return m
}

/**
 * ML kraterleri: InstancedMesh ince halkalar; üzerine gelinen kraterin D'si
 * onUzerinde({ D, x, y }) ile bildirilir (x, y: istemci pikseli).
 */
export function MlKraterler({ arazi, abarti, kraterler, onUzerinde }) {
  const halka = useRef()
  const disk = useRef()
  const halkaGeo = useMemo(() => new RingGeometry(0.86, 1, 40).rotateX(-Math.PI / 2), [])
  const diskGeo = useMemo(() => new CircleGeometry(1, 20).rotateX(-Math.PI / 2), [])
  const matrisler = useMemo(() => kraterMatrisleri(arazi, abarti, kraterler), [arazi, abarti, kraterler])
  useEffect(() => {
    for (const ref of [halka, disk]) {
      const im = ref.current
      if (!im) continue
      im.instanceMatrix.array.set(matrisler)
      im.instanceMatrix.needsUpdate = true
      im.count = kraterler.length
      im.computeBoundingSphere()
    }
  }, [matrisler, kraterler.length])
  useEffect(
    () => () => {
      halkaGeo.dispose()
      diskGeo.dispose()
    },
    [halkaGeo, diskGeo],
  )
  const say = Math.max(1, kraterler.length)
  return (
    <>
      <instancedMesh key={`h${say}`} ref={halka} args={[halkaGeo, undefined, say]} renderOrder={3} frustumCulled={false}>
        <meshBasicMaterial color={KRATER_RENK} transparent opacity={0.92} depthWrite={false} side={DoubleSide} polygonOffset polygonOffsetFactor={-4} />
      </instancedMesh>
      {/* Üzerine gelme için görünmez diskler (ince halkayı yakalamak zor) */}
      <instancedMesh
        key={`d${say}`}
        ref={disk}
        args={[diskGeo, undefined, say]}
        frustumCulled={false}
        onPointerMove={(e) => {
          e.stopPropagation()
          const k = e.instanceId
          if (k != null && kraterler[k]) onUzerinde?.({ D: kraterler[k][2], x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })
        }}
        onPointerOut={() => onUzerinde?.(null)}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} side={DoubleSide} />
      </instancedMesh>
    </>
  )
}

// --- Tehlike örtüsü -----------------------------------------------------------

let taramaDokusu = null
/** Gri çapraz tarama (bilinmeyen hücreler). */
function taramaDokusuAl() {
  if (taramaDokusu) return taramaDokusu
  const b = 32
  const tuval = document.createElement('canvas')
  tuval.width = tuval.height = b
  const ctx = tuval.getContext('2d')
  ctx.fillStyle = 'rgba(120, 128, 140, 0.35)'
  ctx.fillRect(0, 0, b, b)
  ctx.strokeStyle = 'rgba(200, 206, 214, 0.95)'
  ctx.lineWidth = 5
  for (let o = -b; o <= b; o += 16) {
    ctx.beginPath()
    ctx.moveTo(o, b)
    ctx.lineTo(o + b, 0)
    ctx.stroke()
  }
  taramaDokusu = new CanvasTexture(tuval)
  taramaDokusu.wrapS = taramaDokusu.wrapT = RepeatWrapping
  taramaDokusu.colorSpace = SRGBColorSpace
  return taramaDokusu
}

/** 100 m hücreler: bilinen (turuncu, g ile yoğunluk; RGBA köşe rengi) ve bilinmeyen (taralı). */
function tehlikeGeometrileri(arazi, abarti, node) {
  const N = node.n
  const hucre = node.spacing_m
  const alt = 4 // hücre başına bölme (25 m) — araziye otursun
  const yap = (secici, renkFn) => {
    const konum = []
    const renk = []
    const uv = []
    const indeks = []
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const k = j * N + i
        if (!secici(node.haz_frac[k])) continue
        const e0 = (i - (N - 1) / 2) * hucre - hucre / 2
        const n0 = (j - (N - 1) / 2) * hucre - hucre / 2
        const ilk = konum.length / 3
        const rgba = renkFn?.(node.haz_frac[k])
        for (let v = 0; v <= alt; v++) {
          for (let u = 0; u <= alt; u++) {
            const x = e0 + (u / alt) * hucre
            const z = -(n0 + (v / alt) * hucre)
            konum.push(x, yukseklik(arazi, x, z) * abarti + ORTU_YUKARI, z)
            uv.push(x / 25, -z / 25)
            if (rgba) renk.push(...rgba)
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
    g.setAttribute('uv', new BufferAttribute(Float32Array.from(uv), 2))
    if (renk.length) g.setAttribute('color', new BufferAttribute(Float32Array.from(renk), 4))
    g.setIndex(indeks)
    return g
  }
  // Turuncu (#ff8a3d, doğrusal) — saydamlık g ile; bilinen her hücre çok soluk başlar (g = 0 da
  // örtülü kalır: "bakıldı, krater bulunmadı" — delik gibi görünmesin), g ≥ 0.3'te en koyu.
  const bilinen = yap(
    (g) => g != null,
    (g) => [1, 0.25, 0.05, 0.05 + 0.65 * Math.min(1, g / TEHLIKE_DOYMA) ** 1.3],
  )
  const bilinmeyen = yap((g) => g == null)
  return { bilinen, bilinmeyen }
}

export function TehlikeOrtusu({ arazi, abarti, node }) {
  const g = useMemo(() => tehlikeGeometrileri(arazi, abarti, node), [arazi, abarti, node])
  useEffect(
    () => () => {
      g.bilinen?.dispose()
      g.bilinmeyen?.dispose()
    },
    [g],
  )
  return (
    <>
      {g.bilinen && (
        <mesh geometry={g.bilinen} renderOrder={2}>
          <meshBasicMaterial vertexColors transparent depthWrite={false} side={DoubleSide} polygonOffset polygonOffsetFactor={-5} />
        </mesh>
      )}
      {g.bilinmeyen && (
        <mesh geometry={g.bilinmeyen} renderOrder={2}>
          <meshBasicMaterial map={taramaDokusuAl()} transparent depthWrite={false} side={DoubleSide} polygonOffset polygonOffsetFactor={-5} />
        </mesh>
      )}
    </>
  )
}

/** Açıklama kutusundaki ML cümlesi; sayılar ml_calibration.json'dan (kutup kümesi). */
export function mlAciklamasi(veri, kalibrasyon) {
  const p = kalibrasyon?.polar
  const dMin = veri?.d_min_used_m ?? 10
  if (!p) return `ML: YOLOv8, 1 m LROC NAC, D ≥ ${dMin} m. Kalıcı gölgede görüntü yok → bilinmiyor.`
  return `ML: YOLOv8, 1 m LROC NAC, D ≥ ${dMin} m. Bölge ortalamasında güvenilir (ML ${p.ml.toFixed(3)} / uzman ${p.labels.toFixed(3)}), tek hücrede kaba (±${p.mae.toFixed(2)}). Kalıcı gölgede görüntü yok → bilinmiyor.`
}
