// Yerel sahnede v5 ML katmanları (10 alan): LROC NAC fotoğrafı, ML küçük
// kraterler ve 100 m hücre tehlikesi. Veri paketi rehberi §3, §7.
//
// Çerçeve: fotoğraf kuzey yukarı, kenarı 2·yari_m (3100 m), merkezi ızgara
// merkezi = alan noktası = arazinin merkezi. Kraterler [doğu, kuzey, D] ve
// hücreler (i, j) → ((i − 15)·100, (j − 15)·100) aynı doğu/kuzey çerçevesinde,
// metre. Sahnede +x doğu, −z kuzey (yükseklik y).
//
// Fotoğraf ve tehlike ayrı ağ değil, arazinin kendi malzemesinde çizilir
// (katmanShader): dünya x/z'den doku koordinatı; araziye tam oturur, delik ve z
// çakışması olmaz (sahne logaritmik derinlik kullanıyor, polygonOffset işlemez).
//   Fotoğraf: kendi parlaklığıyla — %85 öz ışık (sahne ışığından bağımsız) +
//             %15 sahne gölgelemesi (arazi şekli okunsun); kenarda 150 m geçiş.
//   Tehlike:  g → saydamlık ve renk (en fazla %55); hücre içinin %70'i değeri
//             birebir taşır, yalnız kenarlarda 30 m yumuşak geçiş. null = görüntü
//             karanlık → gri, opak olmayan çapraz tarama ("unknown"); asla güvenli
//             gösterilmez, hiçbir renk yeşil değildir.

import { useEffect, useMemo, useRef, useState } from 'react'
import { CanvasTexture, CircleGeometry, DataTexture, DoubleSide, Matrix4, Quaternion, RGBAFormat, RingGeometry, SRGBColorSpace, Vector3 } from 'three'
import { yukseklik } from './veri.js'

const tabanYol = () => {
  const taban = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'
  return `${taban.replace(/\/?$/, '/')}veri/3b/`
}

const KRATER_YUKARI = 1.2
/** Kenarda araziye geçiş (m). */
const FOTO_GECIS_M = 150
export const KRATER_RENK = '#ff8a3d'

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

/** NAC fotoğrafı → doku; kendi parlaklığı korunur, yalnız kenarda 150 m saydamlık geçişi. */
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
  const gecisPx = FOTO_GECIS_M / mPx
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const kenar = Math.min(x, y, W - 1 - x, H - 1 - y)
      d[(y * W + x) * 4 + 3] = Math.round(255 * duzgun(Math.min(1, kenar / gecisPx)))
    }
  }
  ctx.putImageData(veri, 0, 0)
  const t = new CanvasTexture(tuval)
  t.colorSpace = SRGBColorSpace // örneklemede doğrusala çevrilir
  t.anisotropy = 8
  return t
}

/** Fotoğraf dokusu; yalnız açıkken iner, kapanınca bırakılır. */
export function useNacDokusu(ml, acik) {
  const [doku, setDoku] = useState(null)
  const ad = acik && ml ? ml.foto : null
  useEffect(() => {
    if (!ad) return
    let iptal = false
    let t = null
    const img = new Image()
    img.onload = () => {
      if (iptal) return
      t = fotoDokusu(img, ml.m_px)
      setDoku(t)
    }
    img.src = tabanYol() + ad
    return () => {
      iptal = true
      t?.dispose()
      setDoku(null)
    }
  }, [ad]) // eslint-disable-line react-hooks/exhaustive-deps
  return doku
}

// --- Tehlike dokusu -------------------------------------------------------------

/** 31×31 hücre → RGBA8: R = g (0–1), G = 255 bilinen / 0 bilinmeyen (null). Satır j = güneyden kuzeye. */
export function useTehlikeDokusu(node) {
  const doku = useMemo(() => {
    if (!node) return null
    const N = node.n
    const d = new Uint8Array(N * N * 4)
    for (let k = 0; k < N * N; k++) {
      const g = node.haz_frac[k]
      d[k * 4] = g == null ? 0 : Math.round(Math.min(1, Math.max(0, g)) * 255)
      d[k * 4 + 1] = g == null ? 0 : 255
      d[k * 4 + 3] = 255
    }
    const t = new DataTexture(d, N, N, RGBAFormat)
    t.needsUpdate = true
    return t
  }, [node])
  useEffect(() => () => doku?.dispose(), [doku])
  return doku
}

// --- Arazi malzemesine eklenen katman shader'ı ------------------------------------

const BOS_DOKU = (() => {
  const t = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, RGBAFormat)
  t.needsUpdate = true
  return t
})()

const KATMAN_ORTAK = /* glsl */ `
uniform sampler2D uKFoto;
uniform float uKFotoAcik;
uniform sampler2D uKTehlike;
uniform float uKTehlikeAcik;
uniform float uKYari;
uniform float uKHucre;
uniform float uKN;
varying vec3 vKatmanP;

vec4 katmanFoto() {
  vec2 uv = vec2(vKatmanP.x + uKYari, -vKatmanP.z + uKYari) / (2.0 * uKYari);
  if (uKFotoAcik < 0.5 || any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return vec4(0.0);
  return texture2D(uKFoto, uv);
}
vec2 katmanHucre(ivec2 ij) {
  ij = clamp(ij, ivec2(0), ivec2(int(uKN) - 1));
  vec4 t = texelFetch(uKTehlike, ij, 0);
  return vec2(t.r, t.g);
}
// g → doğrusal renk: < 0.10 açık turuncu (neredeyse saydam), 0.10–0.30 açık → turuncu, ≥ 0.30 koyu turuncu-kırmızı
vec3 katmanRenk(float g) {
  vec3 acik = vec3(1.0, 0.45, 0.16);
  vec3 orta = vec3(1.0, 0.19, 0.025);
  vec3 koyu = vec3(0.80, 0.07, 0.015);
  return g < 0.30 ? mix(acik, orta, smoothstep(0.10, 0.30, g)) : mix(orta, koyu, smoothstep(0.30, 0.50, g));
}
float katmanSaydamlik(float g) {
  // 0 → 0.04, 0.10 → 0.10, 0.30 → 0.40, ≥ 0.50 → 0.55 (en fazla %55)
  return g < 0.10 ? mix(0.04, 0.10, g / 0.10) : g < 0.30 ? mix(0.10, 0.40, (g - 0.10) / 0.20) : mix(0.40, 0.55, smoothstep(0.30, 0.50, g));
}
`

/**
 * Arazi malzemesine (Regolit) eklenecek katman: uniform'lar ve shader yaması.
 * Uniform nesneleri kalıcıdır; açık/kapalı ve dokular değişince yeniden derleme olmaz.
 */
export function useKatmanShader() {
  return useMemo(() => {
    const u = {
      uKFoto: { value: BOS_DOKU },
      uKFotoAcik: { value: 0 },
      uKTehlike: { value: BOS_DOKU },
      uKTehlikeAcik: { value: 0 },
      uKYari: { value: 1550 },
      uKHucre: { value: 100 },
      uKN: { value: 31 },
    }
    const ekle = (shader) => {
      Object.assign(shader.uniforms, u)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vKatmanP;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvKatmanP = (modelMatrix * vec4(transformed, 1.0)).xyz;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + KATMAN_ORTAK)
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          vec4 kFoto = katmanFoto();
          // Sahne gölgelemesi ~%15 (arazi şekli okunsun), gerisi öz ışık
          diffuseColor.rgb = mix(diffuseColor.rgb, kFoto.rgb * 0.2, kFoto.a);`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          totalEmissiveRadiance += kFoto.rgb * 0.85 * kFoto.a;`,
        )
        .replace(
          '#include <opaque_fragment>',
          `#include <opaque_fragment>
          if (uKTehlikeAcik > 0.5) {
            vec2 hc = vec2(vKatmanP.x + uKYari, -vKatmanP.z + uKYari);
            float icerde = step(0.0, hc.x) * step(0.0, hc.y) * step(hc.x, 2.0 * uKYari) * step(hc.y, 2.0 * uKYari);
            vec2 c = hc / uKHucre - 0.5;
            vec2 i0 = floor(c);
            // Hücre içinin %70'i kendi değeri; kenarda 30 m geçiş (değerler değişmez)
            vec2 w = smoothstep(0.35, 0.65, c - i0);
            ivec2 a = ivec2(i0);
            vec2 v00 = katmanHucre(a), v10 = katmanHucre(a + ivec2(1, 0));
            vec2 v01 = katmanHucre(a + ivec2(0, 1)), v11 = katmanHucre(a + ivec2(1, 1));
            float bilinen = mix(mix(v00.y, v10.y, w.x), mix(v01.y, v11.y, w.x), w.y);
            float gb = mix(mix(v00.x * v00.y, v10.x * v10.y, w.x), mix(v01.x * v01.y, v11.x * v11.y, w.x), w.y);
            float g = bilinen > 0.001 ? gb / bilinen : 0.0;
            // Bilinmeyen: gri çapraz tarama, opak değil. 40 m aralık; çizgi kenarı ekran
            // türeviyle yumuşatılır, uzakta (çizgi pikselden inceyse) düz soluk griye söner — titreşmez
            float u = (vKatmanP.x - vKatmanP.z) / 40.0;
            float fw = fwidth(u);
            float d = abs(fract(u) - 0.5);
            float cizgi = (1.0 - smoothstep(0.18 - fw, 0.18 + fw, d)) * (1.0 - smoothstep(0.08, 0.3, fw));
            float ta = (1.0 - bilinen) * icerde * (0.16 + 0.3 * cizgi);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.42, 0.45, 0.5), ta);
            float ha = katmanSaydamlik(g) * bilinen * icerde;
            gl_FragColor.rgb = mix(gl_FragColor.rgb, katmanRenk(g), ha);
          }`,
        )
    }
    return { u, ekle }
  }, [])
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

/** Açıklama kutusundaki ML cümlesi; sayılar ml_calibration.json'dan (kutup kümesi). */
export function mlAciklamasi(veri, kalibrasyon) {
  const p = kalibrasyon?.polar
  const dMin = veri?.d_min_used_m ?? 10
  if (!p) return `ML: YOLOv8, 1 m LROC NAC, D ≥ ${dMin} m. Kalıcı gölgede görüntü yok → bilinmiyor.`
  return `ML: YOLOv8, 1 m LROC NAC, D ≥ ${dMin} m. Bölge ortalamasında güvenilir (ML ${p.ml.toFixed(3)} / uzman ${p.labels.toFixed(3)}), tek hücrede kaba (±${p.mae.toFixed(2)}). Kalıcı gölgede görüntü yok → bilinmiyor.`
}
