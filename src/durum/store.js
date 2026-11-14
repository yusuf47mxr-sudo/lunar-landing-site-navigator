// Zustand deposu — CLAUDE.md bölüm 6.
// Türetilmiş değerler (f, c, P, ortalamalar, puan, geri sayım) SAKLANMAZ;
// useOlcutler() bunları her render'da, gerekirse yeniden hesaplar.

import { useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { alanOnbellekte, alanYukle } from '../core/veri.js'
import { geriSayim, guc, gunesOrani, iletisimDurumu, olcutler } from '../core/hesap.js'

export const MODLAR = ['temel', 'orta', 'ileri']
export const GOREV_SURELERI = [7, 30, 90, 180]
export const DIREK_YUKSEKLIKLERI = [0, 2, 10]
export const YONELIMLER = ['izleyen', 'dikey', 'yatay']
export const KARSILASTIRMA_EN_FAZLA = 3

const izinli = (deger, liste, eski) => (liste.includes(deger) ? deger : eski)

export const useDurum = create((set) => ({
  // Mod
  mod: 'temel',

  // Bağımsız değişkenler
  seciliAlan: 'Malapert Massif',
  ozelNokta: null, // { lat, lon } veya null
  karsilastirma: [], // en fazla 3 alan adı
  t: 0, // zaman dizisindeki indeks
  tL: 0, // iniş tarihi indeksi
  D: 30, // görev süresi (gün) — 7, 30, 90 veya 180

  // Mühendislik parametreleri
  hm: 2, // direk yüksekliği (m) — 0, 2 veya 10
  epsilon: 2, // iletişim güvenlik payı (derece)
  S: 1, // panel alanı (m²)
  eta: 0.3, // panel verimi
  yonelim: 'izleyen',
  w1: 1,
  w2: 1,
  w3: 1,

  // Oynatma
  oynatiliyor: false,
  hiz: 1,

  // --- Eylemler -----------------------------------------------------------
  modSec: (mod) => set((s) => ({ mod: izinli(mod, MODLAR, s.mod) })),
  alanSec: (seciliAlan) => set({ seciliAlan, ozelNokta: null }),
  ozelNoktaSec: (ozelNokta) => set({ ozelNokta }),
  karsilastirmaDegistir: (site) =>
    set((s) => {
      if (s.karsilastirma.includes(site)) {
        return { karsilastirma: s.karsilastirma.filter((x) => x !== site) }
      }
      if (s.karsilastirma.length >= KARSILASTIRMA_EN_FAZLA) return {}
      return { karsilastirma: [...s.karsilastirma, site] }
    }),
  tAyarla: (t) => set({ t }),
  tLAyarla: (tL) => set({ tL }),
  DAyarla: (D) => set((s) => ({ D: izinli(D, GOREV_SURELERI, s.D) })),
  hmAyarla: (hm) => set((s) => ({ hm: izinli(hm, DIREK_YUKSEKLIKLERI, s.hm) })),
  yonelimAyarla: (yonelim) => set((s) => ({ yonelim: izinli(yonelim, YONELIMLER, s.yonelim) })),
  /** epsilon, S, eta, w1, w2, w3 gibi serbest sayısal parametreler için. */
  parametreAyarla: (ad, deger) => set({ [ad]: deger }),
  oynatDegistir: () => set((s) => ({ oynatiliyor: !s.oynatiliyor })),
  hizAyarla: (hiz) => set({ hiz }),
}))

// --- Veri kancası ----------------------------------------------------------

/** Alan verisini veri.js önbelleğinden okur; yoksa yükler. */
export function useAlanVerisi(site) {
  const [durum, setDurum] = useState(() => ({ site, alan: alanOnbellekte(site) ?? null, hata: null }))

  useEffect(() => {
    let iptal = false
    const onbellek = alanOnbellekte(site)
    if (onbellek) {
      setDurum({ site, alan: onbellek, hata: null })
      return
    }
    setDurum({ site, alan: null, hata: null })
    alanYukle(site).then(
      (alan) => !iptal && setDurum({ site, alan, hata: null }),
      (hata) => !iptal && setDurum({ site, alan: null, hata }),
    )
    return () => {
      iptal = true
    }
  }, [site])

  // Alan değiştiği render'da eski alanın verisi dönmesin
  const gecerli = durum.site === site
  return {
    alan: gecerli ? durum.alan : null,
    hata: gecerli ? durum.hata : null,
    yukleniyor: !gecerli || (!durum.alan && !durum.hata),
  }
}

// --- Ölçüt kancası ---------------------------------------------------------

/**
 * Seçili alanın verisini ve depodaki parametreleri okuyup hesap.js'i çağırır.
 * Hesaplar katmanlıdır; sadece bağımlı olduğu parametre değişen katman
 * yeniden çalışır (ör. t değişince f/c/P yeniden hesaplanmaz).
 *
 * Not: ozelNokta henüz bağlı değil (ozelNokta.js yazılınca eklenecek).
 */
export function useOlcutler() {
  const p = useDurum(
    useShallow((s) => ({
      seciliAlan: s.seciliAlan,
      t: s.t,
      tL: s.tL,
      D: s.D,
      hm: s.hm,
      epsilon: s.epsilon,
      S: s.S,
      eta: s.eta,
      yonelim: s.yonelim,
      w1: s.w1,
      w2: s.w2,
      w3: s.w3,
    })),
  )

  const { alan, yukleniyor, hata } = useAlanVerisi(p.seciliAlan)
  const horizon = alan?.horizon[String(p.hm)] ?? null
  const dt = alan?.dt_hours ?? 1

  const f = useMemo(
    () => (alan && horizon ? gunesOrani(alan.sun_alt, alan.sun_az, horizon) : null),
    [alan, horizon],
  )
  const c = useMemo(
    () => (alan && horizon ? iletisimDurumu(alan.earth_alt, alan.earth_az, horizon, p.epsilon) : null),
    [alan, horizon, p.epsilon],
  )
  const P = useMemo(
    () => (alan && f ? guc(f, alan.sun_alt, p.eta, p.S, p.yonelim) : null),
    [alan, f, p.eta, p.S, p.yonelim],
  )
  const sonuc = useMemo(
    () => (f && c ? olcutler(f, c, P, p.tL, p.D, dt, p.w1, p.w2, p.w3) : null),
    [f, c, P, p.tL, p.D, dt, p.w1, p.w2, p.w3],
  )
  const sayim = useMemo(() => {
    if (!f || !c) return null
    const t = Math.min(Math.max(0, p.t), f.length - 1)
    return geriSayim(f, c, t, dt)
  }, [f, c, p.t, dt])

  return { alan, yukleniyor, hata, f, c, P, olcutler: sonuc, geriSayim: sayim }
}
