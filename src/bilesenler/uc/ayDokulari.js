// Ay küresinin dokuları: renk (2k; tam ekranda 4k), displacement ve normal haritası.
//
// Kaynak public/veri/3b/moon/ (NASA SVS CGI Moon Kit; kredi zorunlu):
//   moon_color_2k.jpg / moon_color_4k.jpg  LROC WAC renk, eşdikdörtgen
//   moon_height_1440.png                   LOLA, 16 bit; km = min + v/65535·(max − min)
//   moon_textures.json                     min/max ve açıklamalar
// Yükseklik 16 bit okunur (png16.js); displacement 8 bit yeter (köşe başına),
// normal haritası 16 bitten hesaplanır (denizlerde basamak oluşmasın).
// Ham yükseklikler modülde saklanır (2 MB); GPU dokuları sahne kapanınca bırakılır.

import { useEffect, useState } from 'react'
import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RedFormat, RepeatWrapping, RGBAFormat, SRGBColorSpace, TextureLoader } from 'three'
import { png16Coz } from './png16.js'
import { AY_YARICAP_KM, KURE_ABARTI } from './kure.js'

const tabanYol = () => {
  const taban = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'
  return `${taban.replace(/\/?$/, '/')}veri/3b/moon/`
}

const YUKSEKLIK_DOSYASI = 'moon_height_1440.png'

/** Normal haritasında eğimin ek abartısı (KURE_ABARTI ile çarpılır); 1 = displacement ile aynı. */
const NORMAL_ABARTI = 0.8

let yukseklikSozu = null // { genislik, yukseklik, km: Float32Array, min, max }

/** Yükseklik haritasını (km, Float32) bir kez okur ve saklar. */
function yukseklikYukle() {
  if (!yukseklikSozu) {
    yukseklikSozu = (async () => {
      const [bilgi, png] = await Promise.all([
        fetch(tabanYol() + 'moon_textures.json').then((y) => y.json()),
        fetch(tabanYol() + YUKSEKLIK_DOSYASI).then((y) => {
          if (!y.ok) throw new Error(`Ay yükseklik haritası yüklenemedi (HTTP ${y.status})`)
          return y.arrayBuffer()
        }),
      ])
      const { genislik, yukseklik, veri } = await png16Coz(png)
      const min = bilgi.height_km_min
      const max = bilgi.height_km_max
      const km = new Float32Array(veri.length)
      for (let k = 0; k < veri.length; k++) km[k] = min + (veri[k] / 65535) * (max - min)
      return { genislik, yukseklik, km, min, max }
    })().catch((h) => {
      yukseklikSozu = null
      throw h
    })
  }
  return yukseklikSozu
}

/** three DataTexture satır 0 = v 0 = güney; görüntü satır 0 = kuzey → satırlar ters yazılır. */
const tersSatir = (y, H) => H - 1 - y

/** Displacement: 0…255, min…max yüksekliğe doğrusal. */
function displacementDokusu({ genislik: W, yukseklik: H, km, min, max }) {
  const d = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    const hedef = tersSatir(y, H) * W
    for (let x = 0; x < W; x++) d[hedef + x] = Math.round(((km[y * W + x] - min) / (max - min)) * 255)
  }
  const t = new DataTexture(d, W, H, RedFormat)
  t.wrapS = RepeatWrapping
  t.magFilter = LinearFilter
  t.minFilter = LinearFilter
  t.needsUpdate = true
  return t
}

/**
 * Teğet uzayı normal haritası: x doğu (+u), y kuzey (+v), z dışarı.
 * Eğim: doğu-batı adımı 2πR·cos(enlem)/W (kutba doğru daralır), kuzey-güney πR/H.
 * Kutba yakın doğu-batı komşuları birbirine çok yaklaşır ve fark gürültüsü
 * büyür (ışınsal çizgiler); bu yüzden türev adımı ≈ 1/cos(enlem) piksele
 * genişletilir, yatay mesafe kuzey-güney adımıyla aynı kalır.
 */
function normalDokusu({ genislik: W, yukseklik: H, km }) {
  const d = new Uint8Array(W * H * 4)
  const dy = (Math.PI * AY_YARICAP_KM) / H
  const k = KURE_ABARTI * NORMAL_ABARTI
  for (let y = 0; y < H; y++) {
    const enlem = (90 - ((y + 0.5) * 180) / H) * (Math.PI / 180)
    const cos = Math.max(0.01, Math.cos(enlem))
    const adim = Math.min(W / 8, Math.max(1, Math.round(1 / cos)))
    const dx = (2 * Math.PI * AY_YARICAP_KM * cos * adim) / W
    const yK = Math.max(0, y - 1)
    const yG = Math.min(H - 1, y + 1)
    const hedef = tersSatir(y, H) * W
    for (let x = 0; x < W; x++) {
      const xD = (x + adim) % W
      const xB = (x - adim + W) % W
      const gx = (km[y * W + xD] - km[y * W + xB]) / (2 * dx)
      const gy = (km[yK * W + x] - km[yG * W + x]) / ((yG - yK) * dy)
      let nx = -gx * k
      let ny = -gy * k
      const nz = 1
      const l = Math.hypot(nx, ny, nz)
      nx /= l
      ny /= l
      const i = (hedef + x) * 4
      d[i] = Math.round((nx * 0.5 + 0.5) * 255)
      d[i + 1] = Math.round((ny * 0.5 + 0.5) * 255)
      d[i + 2] = Math.round(((nz / l) * 0.5 + 0.5) * 255)
      d[i + 3] = 255
    }
  }
  const t = new DataTexture(d, W, H, RGBAFormat)
  t.wrapS = RepeatWrapping
  t.magFilter = LinearFilter
  t.minFilter = LinearMipmapLinearFilter
  t.generateMipmaps = true
  t.anisotropy = 8
  t.needsUpdate = true
  return t
}

function renkYukle(ad) {
  return new Promise((coz, red) => {
    new TextureLoader().load(
      tabanYol() + ad,
      (t) => {
        t.colorSpace = SRGBColorSpace
        t.wrapS = RepeatWrapping
        t.anisotropy = 8
        coz(t)
      },
      undefined,
      () => red(new Error(`Ay dokusu yüklenemedi: ${ad}`)),
    )
  })
}

/** Displacement ölçeği ve kayması (küre yarıçapı 1, km → birim, abartılı). */
export function displacementAyari(min, max) {
  return { olcek: ((max - min) / AY_YARICAP_KM) * KURE_ABARTI, kayma: (min / AY_YARICAP_KM) * KURE_ABARTI }
}

/**
 * Ay dokuları. tamEkran true iken 4k renk de yüklenir ve kullanılır; false
 * olunca 4k bırakılır. Bileşen kapanınca bütün GPU dokuları bırakılır.
 * @returns {{ renk, yer, normal, ayar, hazir: boolean, hata: Error|null }}
 */
export function useAyDokulari(tamEkran) {
  const [temel, setTemel] = useState({ renk: null, yer: null, normal: null, ayar: null, hata: null })
  const [renk4k, setRenk4k] = useState(null)

  useEffect(() => {
    let iptal = false
    let dokular = []
    Promise.all([renkYukle('moon_color_2k.jpg'), yukseklikYukle()]).then(
      ([renk, yk]) => {
        const yer = displacementDokusu(yk)
        const normal = normalDokusu(yk)
        dokular = [renk, yer, normal]
        if (iptal) return dokular.forEach((t) => t.dispose())
        setTemel({ renk, yer, normal, ayar: displacementAyari(yk.min, yk.max), hata: null })
      },
      (hata) => !iptal && setTemel((s) => ({ ...s, hata })),
    )
    return () => {
      iptal = true
      dokular.forEach((t) => t.dispose())
    }
  }, [])

  useEffect(() => {
    if (!tamEkran) return
    let iptal = false
    let doku = null
    renkYukle('moon_color_4k.jpg').then(
      (t) => {
        doku = t
        if (iptal) return t.dispose()
        setRenk4k(t)
      },
      () => {}, // 4k yüklenemezse 2k ile devam
    )
    return () => {
      iptal = true
      doku?.dispose()
      setRenk4k(null)
    }
  }, [tamEkran])

  return { ...temel, renk: renk4k ?? temel.renk, hazir: !!(temel.renk && temel.yer && temel.normal) }
}
