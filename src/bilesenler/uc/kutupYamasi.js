// Ay küresinin güney kutbu yaması (80°G içi): küresel 1440×720 yükseklik
// haritası kutupta çok kaba (iniş uçuşunda bloklu); burada paketin 400 m
// kutup DEM'i (dem_south_400m.bin, LOLA LDEM_80S_80MPP_ADJ, 5×5 blok ortalaması)
// kullanılır.
//
// Dikiş: yama hazırken küre 80°G'de kesilir (kesikKureGeometrisi). Yamanın dış
// halkası kürenin kenar köşeleriyle aynı yükseklikte: 768 dilim = 256 × 3,
// her 3. köşe kürenin kenar köşesinin tam yüksekliği (aynı 8 bit displacement,
// aynı çift doğrusal örnekleme), aradakiler doğrusal — çatlak olmaz. İçe doğru
// 4°'de küresel yükseklikten DEM'e yumuşakça geçilir (ayrıntı farkı sınırda seçilmesin).
// Renk aynı eşdikdörtgen dokudan (u = boylam, v = enlem); dikiş ±180°'de
// yinelenen köşe sütunuyla.
// Işık: küre radyal normal + normal haritasıyla aydınlanır, yama geometrik
// normallerle. Kenarda ikisi aynı görünsün diye geçiş bölgesinde köşe normali,
// kürenin normal haritasından hesaplanan normalle karıştırılır (dış halkada
// tamamen o, içe doğru DEM'in geometrik normali).

import { useEffect, useState } from 'react'
import { BufferAttribute, BufferGeometry, SphereGeometry } from 'three'
import { AY_YARICAP_KM, DERECE, KURE_ABARTI, enlemBoylamVektoru } from './kure.js'

export const YAMA_ENLEM = -80
const KURE_DILIM = 256
const KURE_YUKSEKLIK_DILIM = 128
const YAMA_DILIM = KURE_DILIM * 3
const YAMA_HALKA = 240 // 10° / 240 ≈ 1.26 km
const GECIS_DERECE = 4 // dış halkadan içe küresel → DEM geçişi (kabartma farkı sınırda seçilmesin)

const tabanYol = () => {
  const taban = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'
  return `${taban.replace(/\/?$/, '/')}veri/3b/`
}

let demSozu = null
/** Kutup DEM'i (Int16, metre, 1520×1520, 400 m, kutup stereografik); bir kez okunur. */
function demYukle() {
  if (!demSozu) {
    demSozu = Promise.all([
      fetch(tabanYol() + 'dem_south_400m.json').then((y) => y.json()),
      fetch(tabanYol() + 'dem_south_400m.bin').then((y) => {
        if (!y.ok) throw new Error(`Kutup DEM'i yüklenemedi (HTTP ${y.status})`)
        return y.arrayBuffer()
      }),
    ])
      .then(([bilgi, tampon]) => ({ ...bilgi, z: new Int16Array(tampon) }))
      .catch((h) => {
        demSozu = null
        throw h
      })
  }
  return demSozu
}

/** model.js demSample ile aynı: enlem/boylam → DEM yüksekliği (m), çift doğrusal; dışında NaN. */
function demOrnek(D, enlem, boylam) {
  const R = AY_YARICAP_KM * 1000
  const rho = 2 * R * Math.tan(Math.PI / 4 + (enlem * DERECE) / 2)
  const x = rho * Math.sin(boylam * DERECE)
  const y = rho * Math.cos(boylam * DERECE)
  const c = (x - D.x0) / D.pixel_m - 0.5
  const r = (D.y0 - y) / D.pixel_m - 0.5
  const c0 = Math.floor(c)
  const r0 = Math.floor(r)
  if (c0 < 0 || r0 < 0 || c0 + 1 >= D.width || r0 + 1 >= D.height) return NaN
  const fx = c - c0
  const fy = r - r0
  const z = D.z
  const w = D.width
  return (z[r0 * w + c0] * (1 - fx) + z[r0 * w + c0 + 1] * fx) * (1 - fy) + (z[(r0 + 1) * w + c0] * (1 - fx) + z[(r0 + 1) * w + c0 + 1] * fx) * fy
}

/**
 * Kürenin displacement dokusundan (DataTexture, satır 0 = güney) GPU'nun
 * yaptığı gibi çift doğrusal örnek: u yinelenir, v kenara kenetlenir.
 * @returns yüzey yarıçapı − 1 (birim)
 */
function kureYukseklik(yer, ayar, u, v) {
  const { data, width: W, height: H } = yer.image
  const x = u * W - 0.5
  const y = Math.min(H - 1, Math.max(0, v * H - 0.5))
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const sx = (i) => ((i % W) + W) % W
  const y1 = Math.min(H - 1, y0 + 1)
  const ornek = (xx, yy) => data[yy * W + sx(xx)]
  const val = (ornek(x0, y0) * (1 - fx) + ornek(x0 + 1, y0) * fx) * (1 - fy) + (ornek(x0, y1) * (1 - fx) + ornek(x0 + 1, y1) * fx) * fy
  return (val / 255) * ayar.olcek + ayar.kayma
}

const duzgun = (t) => t * t * (3 - 2 * t)

/**
 * Kürenin normal haritasından (teğet uzayı: x doğu, y kuzey) dünya normali —
 * GPU'nun kürede yaptığının CPU karşılığı (çift doğrusal örnek).
 */
function haritaNormali(normal, enlem, boylam, u, v, hedef) {
  const { data, width: W, height: H } = normal.image
  const x = u * W - 0.5
  const y = Math.min(H - 1, Math.max(0, v * H - 0.5))
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const y1 = Math.min(H - 1, y0 + 1)
  const sx = (i) => ((i % W) + W) % W
  const t = [0, 0, 0]
  for (const [xx, yy, a] of [[x0, y0, (1 - fx) * (1 - fy)], [x0 + 1, y0, fx * (1 - fy)], [x0, y1, (1 - fx) * fy], [x0 + 1, y1, fx * fy]]) {
    const i = (yy * W + sx(xx)) * 4
    for (let c = 0; c < 3; c++) t[c] += ((data[i + c] / 255) * 2 - 1) * a
  }
  const p = enlem * DERECE
  const l = boylam * DERECE
  // Doğu (T), kuzey (B), dışarı (N) — enlemBoylamVektoru ile aynı eksenler
  const T = [-Math.sin(l), 0, -Math.cos(l)]
  const B = [-Math.sin(p) * Math.cos(l), Math.cos(p), Math.sin(p) * Math.sin(l)]
  const N = [Math.cos(p) * Math.cos(l), Math.sin(p), -Math.cos(p) * Math.sin(l)]
  for (let c = 0; c < 3; c++) hedef[c] = T[c] * t[0] + B[c] * t[1] + N[c] * t[2]
  const k = Math.hypot(hedef[0], hedef[1], hedef[2]) || 1
  hedef[0] /= k
  hedef[1] /= k
  hedef[2] /= k
  return hedef
}

/** Kutup yaması ağı (80°G → 90°G). */
export function kutupYamasiGeometrisi(D, yer, ayar, normalHaritasi) {
  const sutun = YAMA_DILIM + 1 // ±180° dikişi için son sütun yinelenir
  const n = YAMA_HALKA * sutun + 1
  const konum = new Float32Array(n * 3)
  const uv = new Float32Array(n * 2)
  const v = (enlem) => (enlem + 90) / 180
  const demYuk = (enlem, boylam) => {
    const m = demOrnek(D, enlem, boylam)
    return Number.isFinite(m) ? ((m / 1000) * KURE_ABARTI) / AY_YARICAP_KM : null
  }
  // Dış halka: kürenin kenar köşeleri (her 3. köşe) ve aralarında doğrusal
  const kenar = new Float32Array(KURE_DILIM + 1)
  for (let j = 0; j <= KURE_DILIM; j++) kenar[j] = kureYukseklik(yer, ayar, j / KURE_DILIM, v(YAMA_ENLEM))
  const kenarYuk = (j) => {
    const a = Math.floor(j / 3)
    const k = (j % 3) / 3
    return kenar[a] * (1 - k) + kenar[Math.min(KURE_DILIM, a + 1)] * k
  }
  const p = enlemBoylamVektoru(0, 0)
  for (let i = 0; i < YAMA_HALKA; i++) {
    const enlem = YAMA_ENLEM - (10 * i) / YAMA_HALKA
    const w = duzgun(Math.min(1, (YAMA_ENLEM - enlem) / GECIS_DERECE))
    for (let j = 0; j < sutun; j++) {
      const u = j / YAMA_DILIM
      const boylam = u * 360 - 180
      let h
      if (i === 0) h = kenarYuk(j)
      else {
        const kure = kureYukseklik(yer, ayar, u, v(enlem))
        const dem = demYuk(enlem, boylam)
        h = dem === null ? kure : kure * (1 - w) + dem * w
      }
      enlemBoylamVektoru(enlem, boylam, p).multiplyScalar(1 + h)
      const k = i * sutun + j
      konum.set([p.x, p.y, p.z], k * 3)
      uv.set([u, v(enlem)], k * 2)
    }
  }
  // Kutup noktası
  const kutup = n - 1
  const hk = demYuk(-90, 0) ?? kureYukseklik(yer, ayar, 0.5, 0)
  konum.set([0, -(1 + hk), 0], kutup * 3)
  uv.set([0.5, 0], kutup * 2)

  const indeks = []
  for (let i = 0; i < YAMA_HALKA - 1; i++) {
    for (let j = 0; j < YAMA_DILIM; j++) {
      const a = i * sutun + j // kuzey (dış), batı
      const b = a + 1 // dış, doğu
      const c = a + sutun // iç (güney), batı
      const d = c + 1
      // Dışarı bakan yüz: (a, c, b) ve (b, c, d)
      indeks.push(a, c, b, b, c, d)
    }
  }
  const son = (YAMA_HALKA - 1) * sutun
  for (let j = 0; j < YAMA_DILIM; j++) indeks.push(son + j, kutup, son + j + 1)

  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(konum, 3))
  g.setAttribute('uv', new BufferAttribute(uv, 2))
  g.setIndex(indeks)
  g.computeVertexNormals()
  // ±180° dikişindeki yinelenen sütunların normallerini ortala (gölgelemede çizgi kalmasın)
  const nor = g.getAttribute('normal')
  for (let i = 0; i < YAMA_HALKA; i++) {
    const a = i * sutun
    const b = a + YAMA_DILIM
    const x = nor.getX(a) + nor.getX(b)
    const y = nor.getY(a) + nor.getY(b)
    const z = nor.getZ(a) + nor.getZ(b)
    const l = Math.hypot(x, y, z) || 1
    nor.setXYZ(a, x / l, y / l, z / l)
    nor.setXYZ(b, x / l, y / l, z / l)
  }
  // Geçiş bölgesi: kürenin (normal haritalı) normaliyle karıştır
  if (normalHaritasi) {
    const h = [0, 0, 0]
    for (let i = 0; i < YAMA_HALKA; i++) {
      const enlem = YAMA_ENLEM - (10 * i) / YAMA_HALKA
      const w = duzgun(Math.min(1, (YAMA_ENLEM - enlem) / GECIS_DERECE))
      if (w >= 1) break
      for (let j = 0; j < sutun; j++) {
        const u = j / YAMA_DILIM
        haritaNormali(normalHaritasi, enlem, u * 360 - 180, u, v(enlem), h)
        const k = i * sutun + j
        const x = h[0] * (1 - w) + nor.getX(k) * w
        const y = h[1] * (1 - w) + nor.getY(k) * w
        const z = h[2] * (1 - w) + nor.getZ(k) * w
        const l = Math.hypot(x, y, z) || 1
        nor.setXYZ(k, x / l, y / l, z / l)
      }
    }
  }
  nor.needsUpdate = true
  g.computeBoundingSphere()
  return g
}

/**
 * 80°G'de kesilmiş küre. three SphereGeometry kısmi kürede v'yi açıya değil
 * dilim sırasına göre verir (alt kenar v = 0 olur); doku kaymasın diye uv.y
 * enlemden yeniden yazılır.
 */
export function kesikKureGeometrisi() {
  const teta = ((90 - YAMA_ENLEM) * Math.PI) / 180 // kuzey kutbundan 170°
  const dilim = Math.round((KURE_YUKSEKLIK_DILIM * (90 - YAMA_ENLEM)) / 180)
  const g = new SphereGeometry(1, KURE_DILIM, dilim, 0, Math.PI * 2, 0, teta)
  const pos = g.getAttribute('position')
  const uv = g.getAttribute('uv')
  for (let k = 0; k < pos.count; k++) {
    const y = Math.max(-1, Math.min(1, pos.getY(k)))
    uv.setY(k, 1 - Math.acos(y) / Math.PI)
  }
  uv.needsUpdate = true
  return g
}

/**
 * Kutup yaması: etkin olunca (bir kez tetiklenir) DEM yüklenir ve ağ kurulur.
 * @returns {{ yama: BufferGeometry|null, kure: BufferGeometry|null }} kure: kesik küre
 */
export function useKutupYamasi(etkin, yer, ayar, normal) {
  const [durum, setDurum] = useState({ yama: null, kure: null })
  useEffect(() => {
    if (!etkin || !yer || !ayar) return
    let iptal = false
    let kurulan = null
    demYukle().then(
      (D) => {
        if (iptal) return
        kurulan = { yama: kutupYamasiGeometrisi(D, yer, ayar, normal), kure: kesikKureGeometrisi() }
        setDurum(kurulan)
      },
      () => {}, // DEM yoksa küresel harita ile devam
    )
    return () => {
      iptal = true
      kurulan?.yama.dispose()
      kurulan?.kure.dispose()
    }
  }, [etkin, yer, ayar, normal])
  return durum
}
