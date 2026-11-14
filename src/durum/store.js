// Zustand deposu — CLAUDE.md bölüm 6.
// Türetilmiş değerler (f, c, P, ortalamalar, puan, geri sayım) SAKLANMAZ;
// useOlcutler() bunları her render'da, gerekirse yeniden hesaplar.

import { useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { alanOnbellekte, alanYukle, efemerisOnbellekte, efemerisYukle } from '../core/veri.js'
import { ozelNoktaOlustur } from '../core/ozelNokta.js'
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

// --- Veri kancaları ---------------------------------------------------------

/**
 * veri.js'teki önbellekli bir yükleyiciyi React durumuna bağlar.
 * anahtar null ise hiçbir şey yüklenmez.
 */
function useYuklenen(anahtar, yukle, onbellekte) {
  const [durum, setDurum] = useState(() => ({
    anahtar,
    veri: anahtar === null ? null : (onbellekte(anahtar) ?? null),
    hata: null,
  }))

  useEffect(() => {
    if (anahtar === null) {
      setDurum({ anahtar, veri: null, hata: null })
      return
    }
    let iptal = false
    const onbellek = onbellekte(anahtar)
    if (onbellek) {
      setDurum({ anahtar, veri: onbellek, hata: null })
      return
    }
    setDurum({ anahtar, veri: null, hata: null })
    yukle(anahtar).then(
      (veri) => !iptal && setDurum({ anahtar, veri, hata: null }),
      (hata) => !iptal && setDurum({ anahtar, veri: null, hata }),
    )
    return () => {
      iptal = true
    }
  }, [anahtar]) // eslint-disable-line react-hooks/exhaustive-deps

  // Anahtar değiştiği render'da eski veri dönmesin
  const gecerli = durum.anahtar === anahtar
  const veri = gecerli ? durum.veri : null
  const hata = gecerli ? durum.hata : null
  return { veri, hata, yukleniyor: anahtar !== null && !veri && !hata }
}

/** Listedeki bir alanın verisini yükler (site null ise boş döner). */
export function useAlanVerisi(site) {
  const { veri, hata, yukleniyor } = useYuklenen(site, alanYukle, alanOnbellekte)
  return { alan: veri, hata, yukleniyor }
}

/** Ortak efemeris (etkin değilse yüklenmez). */
export function useEfemeris(etkin = true) {
  const { veri, hata, yukleniyor } = useYuklenen(
    etkin ? 'efemeris' : null,
    () => efemerisYukle(),
    () => efemerisOnbellekte(),
  )
  return { efemeris: veri, hata, yukleniyor }
}

/**
 * Seçili alanın verisi. ozelNokta doluysa seçili alan yerine efemeris ve
 * ozelNoktaOlustur() ile yaklaşık bir alan üretir (alan.yaklasik === true).
 */
export function useSeciliAlanVerisi() {
  const { seciliAlan, ozelNokta } = useDurum(
    useShallow((s) => ({ seciliAlan: s.seciliAlan, ozelNokta: s.ozelNokta })),
  )
  const ozel = ozelNokta !== null
  const liste = useAlanVerisi(ozel ? null : seciliAlan)
  const { efemeris, hata: efHata, yukleniyor: efYukleniyor } = useEfemeris(ozel)

  const lat = ozelNokta?.lat
  const lon = ozelNokta?.lon
  const ozelSonuc = useMemo(() => {
    if (!ozel || !efemeris) return { alan: null, hata: null }
    try {
      return { alan: ozelNoktaOlustur(lat, lon, efemeris), hata: null }
    } catch (hata) {
      return { alan: null, hata }
    }
  }, [ozel, efemeris, lat, lon])

  if (!ozel) return liste
  return { alan: ozelSonuc.alan, hata: efHata ?? ozelSonuc.hata, yukleniyor: efYukleniyor }
}

// --- Ölçüt kancası ---------------------------------------------------------

/**
 * Seçili alanın verisini ve depodaki parametreleri okuyup hesap.js'i çağırır.
 * Hesaplar katmanlıdır; sadece bağımlı olduğu parametre değişen katman
 * yeniden çalışır (ör. t değişince f/c/P yeniden hesaplanmaz).
 * ozelNokta doluysa onun yaklaşık verisi kullanılır (alan.yaklasik).
 */
export function useOlcutler() {
  const p = useDurum(
    useShallow((s) => ({
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

  const { alan, yukleniyor, hata } = useSeciliAlanVerisi()
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
