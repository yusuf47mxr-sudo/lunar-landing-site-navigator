// 3B arazi verisi: public/veri/3b/<file>.json yükleme, önbellek ve geometri.
//
// Dosya biçimi (scripts/ucBoyutVeriHazirla.mjs):
//   { site, source_id, dem, n, spacing_m, z0_m, dz_m[n*n],
//     never_lit: { n, spacing_m, values[n*n], note } | null }
// Sıra k = j·n + i; j güneyden kuzeye, i batıdan doğuya. dz_m merkez zemine göre (m).
//
// Sahne eksenleri (three.js, Y yukarı): +x doğu, −z kuzey, +y yukarı. Birim metre.

import { useEffect, useState } from 'react'
import { hataOlustur } from '../../core/hata.js'
import { kutupDemYukle } from '../../core/kutupDem.js'

const tabanYol = () => {
  const taban = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'
  return `${taban.replace(/\/?$/, '/')}veri/3b/`
}

const sozler = new Map()

/** Alan dosya adıyla (bolgeler.json "file") arazi verisini yükler; önbellekli. */
export function araziYukle(dosya) {
  if (!sozler.has(dosya)) {
    const soz = fetch(tabanYol() + dosya)
      .then((y) => {
        if (!y.ok) throw hataOlustur('sahne.araziYuklenemedi', { durum: y.status }, `3D terrain could not be loaded (HTTP ${y.status})`)
        return y.json()
      })
      .then(araziHazirla)
      .catch((h) => {
        sozler.delete(dosya)
        throw h
      })
    sozler.set(dosya, soz)
  }
  return sozler.get(dosya)
}

/** Ham JSON → sahnenin kullandığı yapı (Float32 yükseklik, aralık, ızgara boyutu). */
export function araziHazirla(ham) {
  const dz = Float32Array.from(ham.dz_m)
  let enAz = Infinity
  let enCok = -Infinity
  for (let k = 0; k < dz.length; k++) {
    if (dz[k] < enAz) enAz = dz[k]
    if (dz[k] > enCok) enCok = dz[k]
  }
  return {
    site: ham.site,
    n: ham.n,
    adim: ham.spacing_m,
    yariGenislik: ((ham.n - 1) * ham.spacing_m) / 2, // merkezden kenara (m)
    dz,
    enAz,
    enCok,
    neverLit: ham.never_lit ?? null,
    ml: ham.ml ?? null, // { kraterler, foto, yari_m, m_px } — ML taraması olan 10 alanda
    duz: false,
  }
}

/**
 * 80°G içi özel nokta: 400 m kutup DEM'inden 10×10 km kaba arazi (50 m'ye
 * çift doğrusal). Kutup stereografik düzlemde yerel doğu = (cos λ, −sin λ),
 * kuzey = (sin λ, cos λ) (kuzey kutuptan uzaklaşmaktır); ölçek kutup
 * yakınında ≈ 1. Yükseklik merkeze göre (dz).
 */
export function kabaArazi(D, enlem, boylam) {
  const n = 201
  const adim = 50
  const R = 1737400
  const l = (boylam * Math.PI) / 180
  const rho = 2 * R * Math.tan(Math.PI / 4 + (enlem * Math.PI) / 360)
  const xs = rho * Math.sin(l)
  const ys = rho * Math.cos(l)
  const ornek = (x, y) => {
    const c = (x - D.x0) / D.pixel_m - 0.5
    const r = (D.y0 - y) / D.pixel_m - 0.5
    const c0 = Math.min(D.width - 2, Math.max(0, Math.floor(c)))
    const r0 = Math.min(D.height - 2, Math.max(0, Math.floor(r)))
    const fx = Math.min(1, Math.max(0, c - c0))
    const fy = Math.min(1, Math.max(0, r - r0))
    const z = D.z
    const w = D.width
    return (z[r0 * w + c0] * (1 - fx) + z[r0 * w + c0 + 1] * fx) * (1 - fy) + (z[(r0 + 1) * w + c0] * (1 - fx) + z[(r0 + 1) * w + c0 + 1] * fx) * fy
  }
  const yari = ((n - 1) * adim) / 2
  const dz = new Float32Array(n * n)
  const z0 = ornek(xs, ys)
  for (let j = 0; j < n; j++) {
    const ku = j * adim - yari
    for (let i = 0; i < n; i++) {
      const do_ = i * adim - yari
      dz[j * n + i] = ornek(xs + do_ * Math.cos(l) + ku * Math.sin(l), ys - do_ * Math.sin(l) + ku * Math.cos(l)) - z0
    }
  }
  return { ...araziHazirla({ site: null, n, spacing_m: adim, dz_m: dz, never_lit: null }), kaba: true }
}

/** Arazi verisi olmayan alan (özel koordinat): düz 10 km plaka. */
export function duzArazi() {
  const n = 2
  return { site: null, n, adim: 10000, yariGenislik: 5000, dz: new Float32Array(n * n), enAz: 0, enCok: 0, neverLit: null, duz: true }
}

/**
 * Sahne koordinatında (x doğu, z güney yönü pozitif) arazi yüksekliği (m, abartısız);
 * iki yönlü doğrusal ara değer. Izgara dışında kenar değeri.
 */
export function yukseklik(arazi, x, z) {
  const { n, adim, yariGenislik, dz } = arazi
  const u = Math.min(Math.max((x + yariGenislik) / adim, 0), n - 1)
  const v = Math.min(Math.max((-z + yariGenislik) / adim, 0), n - 1) // j güneyden kuzeye; kuzey = −z
  const i0 = Math.min(Math.floor(u), n - 2)
  const j0 = Math.min(Math.floor(v), n - 2)
  const fu = u - i0
  const fv = v - j0
  const h00 = dz[j0 * n + i0]
  const h10 = dz[j0 * n + i0 + 1]
  const h01 = dz[(j0 + 1) * n + i0]
  const h11 = dz[(j0 + 1) * n + i0 + 1]
  return (h00 * (1 - fu) + h10 * fu) * (1 - fv) + (h01 * (1 - fu) + h11 * fu) * fv
}

/**
 * Alan dosya adına göre arazi. dosya null → düz arazi (özel koordinat);
 * "kaba:<enlem>,<boylam>" → 400 m DEM'den kaba arazi (80°G içi özel koordinat);
 * undefined → henüz bilinmiyor (bolgeler.json yüklenmedi), arazi null kalır.
 * @returns {{ arazi: object|null, hata: Error|null }}
 */
export function useArazi(dosya) {
  const [durum, setDurum] = useState({ dosya, arazi: null, hata: null })
  useEffect(() => {
    if (dosya === undefined) {
      setDurum({ dosya, arazi: null, hata: null })
      return
    }
    if (dosya === null) {
      setDurum({ dosya, arazi: duzArazi(), hata: null })
      return
    }
    let iptal = false
    setDurum({ dosya, arazi: null, hata: null })
    // "kaba:<enlem>,<boylam>" → 400 m DEM'den kaba arazi (80°G içi özel nokta)
    const kaba = /^kaba:(-?[\d.]+),(-?[\d.]+)$/.exec(dosya)
    const yukleme = kaba
      ? kutupDemYukle().then((D) => kabaArazi(D, Number(kaba[1]), Number(kaba[2])))
      : araziYukle(dosya)
    yukleme.then(
      (arazi) => !iptal && setDurum({ dosya, arazi, hata: null }),
      (hata) => !iptal && setDurum({ dosya, arazi: null, hata }),
    )
    return () => {
      iptal = true
    }
  }, [dosya])
  return durum.dosya === dosya ? durum : { dosya, arazi: null, hata: null }
}
