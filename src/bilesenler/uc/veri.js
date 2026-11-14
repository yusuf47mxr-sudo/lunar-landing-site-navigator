// 3B arazi verisi: public/veri/3b/<file>.json yükleme, önbellek ve geometri.
//
// Dosya biçimi (scripts/ucBoyutVeriHazirla.mjs):
//   { site, source_id, dem, n, spacing_m, z0_m, dz_m[n*n],
//     never_lit: { n, spacing_m, values[n*n], note } | null }
// Sıra k = j·n + i; j güneyden kuzeye, i batıdan doğuya. dz_m merkez zemine göre (m).
//
// Sahne eksenleri (three.js, Y yukarı): +x doğu, −z kuzey, +y yukarı. Birim metre.

import { useEffect, useState } from 'react'

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
        if (!y.ok) throw new Error(`3B arazi yüklenemedi (HTTP ${y.status})`)
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
    duz: false,
  }
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
    araziYukle(dosya).then(
      (arazi) => !iptal && setDurum({ dosya, arazi, hata: null }),
      (hata) => !iptal && setDurum({ dosya, arazi: null, hata }),
    )
    return () => {
      iptal = true
    }
  }, [dosya])
  return durum.dosya === dosya ? durum : { dosya, arazi: null, hata: null }
}
