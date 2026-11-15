// Zustand deposu — CLAUDE.md bölüm 6.
// Türetilmiş değerler (f, c, P, ortalamalar, puan, geri sayım) SAKLANMAZ;
// useOlcutler() bunları her render'da, gerekirse yeniden hesaplar.

import { useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import {
  alanOnbellekte,
  alanYukle,
  bolgeleriYukle,
  bolgelerOnbellekte,
  efemerisOnbellekte,
  efemerisYukle,
  ozetOnbellekte,
  ozetYukle,
} from '../core/veri.js'
import { kabaUfuklar, kabaUfukVar, ozelNoktaOlustur } from '../core/ozelNokta.js'
import { kabaUfukAraclariOnbellekte, kabaUfukAraclariYukle } from '../core/kutupDem.js'
import {
  AYDINLIK_ESIGI,
  enUzunAraliklar,
  gecisler,
  geriSayim,
  guc,
  gunesOrani,
  iletisimDurumu,
  olcutler,
  panoramaMerkezi,
} from '../core/hesap.js'
import { BASLANGIC_T, KUTUP_SINIRI, VARSAYILAN } from '../core/sabitler.js'

export const MODLAR = ['temel', 'orta', 'ileri']
export const GOREV_SURELERI = [7, 30, 90, 180]
export const DIREK_YUKSEKLIKLERI = [0, 2, 10]
export const YONELIMLER = ['izleyen', 'dikey', 'yatay']
export const KARSILASTIRMA_EN_FAZLA = 3

/** Karşılaştırmada seçili alanın yanında gösterilen alanlar (seçili alanın kendisi hariç). */
export const karsilastirmaSutunlari = (s) =>
  s.ozelNokta ? s.karsilastirma : s.karsilastirma.filter((x) => x !== s.seciliAlan)

const izinli = (deger, liste, eski) => (liste.includes(deger) ? deger : eski)

export const useDurum = create((set) => ({
  // Mod
  mod: 'temel',

  // Bağımsız değişkenler
  seciliAlan: 'Malapert Massif',
  ozelNokta: null, // { lat, lon } veya null
  karsilastirma: [], // en fazla 3 alan adı
  // Zaman dizisindeki indeks. Alan değişince sıfırlanmaz (alanSec t'ye dokunmaz):
  // kullanıcı aynı anda başka bir alana bakabilsin.
  t: BASLANGIC_T,

  // Görev ve mühendislik parametreleri — varsayılanlar sabitler.js'te:
  // tL (iniş indeksi), D (7/30/90/180 gün), hm (0/2/10 m), epsilon (°),
  // S (m²), eta, yonelim, w1, w2, w3
  ...VARSAYILAN,

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
  /**
   * Karşılaştırmaya alan ekler (yer varsa). Seçili alan zaten ilk sütundur,
   * eklenmez. enFazla: seçili alan dışındaki sütun sayısı (Orta 1, İleri 2).
   */
  karsilastirmaEkle: (site, enFazla = KARSILASTIRMA_EN_FAZLA - 1) =>
    set((s) => {
      const mevcut = karsilastirmaSutunlari(s).slice(0, enFazla)
      if ((!s.ozelNokta && site === s.seciliAlan) || mevcut.includes(site)) return {}
      if (mevcut.length >= enFazla) return {}
      return { karsilastirma: [...mevcut, site] }
    }),
  karsilastirmaCikar: (site) => set((s) => ({ karsilastirma: s.karsilastirma.filter((x) => x !== site) })),
  tAyarla: (t) => set({ t }),
  tLAyarla: (tL) => set({ tL }),
  /** İniş tarihi seçimi: görev başlangıcı değişir ve zaman oraya atlar. */
  inisSec: (tL) => set({ tL, t: tL }),
  DAyarla: (D) => set((s) => ({ D: izinli(D, GOREV_SURELERI, s.D) })),
  hmAyarla: (hm) => set((s) => ({ hm: izinli(hm, DIREK_YUKSEKLIKLERI, s.hm) })),
  yonelimAyarla: (yonelim) => set((s) => ({ yonelim: izinli(yonelim, YONELIMLER, s.yonelim) })),
  /** epsilon, S, eta, w1, w2, w3 gibi serbest sayısal parametreler için. */
  parametreAyarla: (ad, deger) => set({ [ad]: deger }),
  /** Adı verilen parametreleri varsayılana döndürür. tL dönerse zaman da oraya atlar (inisSec gibi). */
  varsayilanaDon: (adlar) =>
    set(() => {
      const yeni = {}
      for (const ad of adlar) if (ad in VARSAYILAN) yeni[ad] = VARSAYILAN[ad]
      if ('tL' in yeni) yeni.t = yeni.tL
      return yeni
    }),
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

/** bolgeler.json: bütün alanların listesi. */
export function useBolgeler() {
  const { veri, hata, yukleniyor } = useYuklenen(
    'bolgeler',
    () => bolgeleriYukle(),
    () => bolgelerOnbellekte(),
  )
  return { bolgeler: veri, hata, yukleniyor }
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

/** ozet.json: ısı haritası için önceden hesaplanmış dönem ölçütleri (bölüm 4.4). */
export function useOzet() {
  const { veri, hata, yukleniyor } = useYuklenen(
    'ozet',
    () => ozetYukle(),
    () => ozetOnbellekte(),
  )
  return { ozet: veri, hata, yukleniyor }
}

/**
 * Seçili alanın verisi. ozelNokta doluysa seçili alan yerine efemeris ve
 * ozelNoktaOlustur() ile yaklaşık bir alan üretir (alan.yaklasik === true).
 * 80°G'nin güneyinde kutup DEM'i yüklenir ve kaba ufuk kullanılır
 * (alan.ufukKaynagi 'dem400'); DEM gelene kadar sonuç yüklenmiyor sayılır,
 * düz ufuklu ara sonuç gösterilmez. DEM yüklenemezse düz ufka düşülür.
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
  const kabaGerek = ozel && kabaUfukVar(lat)
  const { veri: araclar, hata: demHata, yukleniyor: demYukleniyor } = useYuklenen(
    kabaGerek ? 'kabaUfuk' : null,
    () => kabaUfukAraclariYukle(),
    () => kabaUfukAraclariOnbellekte(),
  )
  const ozelSonuc = useMemo(() => {
    if (!ozel || !efemeris) return { alan: null, hata: null }
    if (kabaGerek && !araclar && !demHata) return { alan: null, hata: null } // DEM bekleniyor
    try {
      const kaba = kabaGerek && araclar ? kabaUfuklar(araclar.Model, araclar.dem, lat, lon) : null
      return { alan: ozelNoktaOlustur(lat, lon, efemeris, kaba), hata: null }
    } catch (hata) {
      return { alan: null, hata }
    }
  }, [ozel, efemeris, lat, lon, kabaGerek, araclar, demHata])

  if (!ozel) return liste
  return { alan: ozelSonuc.alan, hata: efHata ?? ozelSonuc.hata, yukleniyor: efYukleniyor || demYukleniyor }
}

// --- f(t) ve c(t) önbelleği -------------------------------------------------
// Birden çok bileşen aynı alan + ufuk + epsilon için f ve c ister; dizi
// başına bir kez hesaplanır. Anahtar alan nesnesi (özel noktalar dahil her
// alan ayrı nesnedir), sonra ufuk dizisi, sonra epsilon.

const goruOnbellek = new WeakMap() // alan → Map(horizon → { f, c: Map(eps → c) })

function goruKaydi(alan, horizon) {
  let m = goruOnbellek.get(alan)
  if (!m) goruOnbellek.set(alan, (m = new Map()))
  let k = m.get(horizon)
  if (!k) m.set(horizon, (k = { f: null, c: new Map() }))
  return k
}

/** Güneş diskinin görünen oranı f(t), önbellekli. */
export function fDizisi(alan, horizon) {
  const k = goruKaydi(alan, horizon)
  if (!k.f) k.f = gunesOrani(alan.sun_alt, alan.sun_az, horizon, alan.sun_au ?? null)
  return k.f
}

/** İletişim durumu c(t), önbellekli. */
export function cDizisi(alan, horizon, epsilon) {
  const k = goruKaydi(alan, horizon)
  if (!k.c.has(epsilon)) k.c.set(epsilon, iletisimDurumu(alan.earth_alt, alan.earth_az, horizon, epsilon))
  return k.c.get(epsilon)
}

/** Seçili alan için f ve c dizileri (hm ve epsilon depodan). */
export function useGorunurluk() {
  const { hm, epsilon } = useDurum(useShallow((s) => ({ hm: s.hm, epsilon: s.epsilon })))
  const { alan, yukleniyor, hata } = useSeciliAlanVerisi()
  const horizon = alan?.horizon[String(hm)] ?? null
  const f = useMemo(() => (alan && horizon ? fDizisi(alan, horizon) : null), [alan, horizon])
  const c = useMemo(
    () => (alan && horizon ? cDizisi(alan, horizon, epsilon) : null),
    [alan, horizon, epsilon],
  )
  return { alan, horizon, f, c, yukleniyor, hata }
}

/** t anından ileriye geri sayım (hesap.js geriSayim); veri yoksa null. */
export function useGeriSayim() {
  const t = useDurum((s) => s.t)
  const { alan, f, c } = useGorunurluk()
  return useMemo(() => {
    if (!alan || !f || !c) return null
    const i = Math.min(Math.max(0, Math.round(t)), f.length - 1)
    return geriSayim(f, c, i, alan.dt_hours)
  }, [alan, f, c, t])
}

/**
 * t anından sonraki batış ve doğuşlar, Güneş ve Dünya için ayrı ayrı
 * (hesap.js gecisler); veri yoksa null.
 * @returns {null | {gunes: {sonrakiBatis, sonrakiDogus}, dunya: {sonrakiBatis, sonrakiDogus}}}
 */
export function useGecisler() {
  const t = useDurum((s) => s.t)
  const { alan, f, c } = useGorunurluk()
  return useMemo(() => {
    if (!alan || !f || !c) return null
    const i = Math.min(Math.max(0, Math.round(t)), f.length - 1)
    return { gunes: gecisler(f, i, alan.dt_hours, AYDINLIK_ESIGI), dunya: gecisler(c, i, alan.dt_hours) }
  }, [alan, f, c, t])
}

/**
 * Görev aralığı [tL, tL + D) içinde en uzun karanlık ve iletişim kesintisi
 * (hesap.js enUzunAraliklar). Aralık veri sonunu aşarsa null.
 */
export function useEnUzunAraliklar() {
  const { tL, D } = useDurum(useShallow((s) => ({ tL: s.tL, D: s.D })))
  const { alan, f, c } = useGorunurluk()
  return useMemo(
    () => (alan && f && c ? enUzunAraliklar(f, c, tL, D, alan.dt_hours) : null),
    [alan, f, c, tL, D],
  )
}

// --- Anlık durum kancası -------------------------------------------------

/**
 * Seçili alanda t anındaki ham konumlar ve gökyüzü görünümünün ihtiyaç
 * duyduğu her şey. Hesap yapmaz; sadece dizilerden okur.
 * Veri yoksa alan null döner, diğer değerler null/varsayılan olur.
 */
export function useAnlikDurum() {
  const { t, hm, epsilon } = useDurum(
    useShallow((s) => ({ t: s.t, hm: s.hm, epsilon: s.epsilon })),
  )
  const { alan, yukleniyor, hata } = useSeciliAlanVerisi()
  // Alan başına bir kez; zaman ilerleyince yeniden hesaplanmaz
  const merkezAz = useMemo(() => (alan ? panoramaMerkezi(alan.earth_az, alan.earth_alt) : 0), [alan])

  return useMemo(() => {
    if (!alan) {
      return {
        alan: null, yukleniyor, hata, t: 0, zaman: null, horizon: null, epsilon,
        sunAlt: null, sunAz: null, earthAlt: null, earthAz: null, kutup: false, yaklasik: false,
        merkezAz,
      }
    }
    const i = Math.min(Math.max(0, Math.round(t)), alan.n - 1)
    return {
      alan,
      yukleniyor,
      hata,
      t: i,
      zaman: new Date(Date.parse(alan.t0) + i * alan.dt_hours * 3600e3),
      horizon: alan.horizon[String(hm)] ?? null,
      epsilon,
      sunAlt: alan.sun_alt[i],
      sunAz: alan.sun_az[i],
      earthAlt: alan.earth_alt[i],
      earthAz: alan.earth_az[i],
      kutup: Math.abs(alan.lat) >= KUTUP_SINIRI,
      yaklasik: alan.yaklasik === true,
      merkezAz, // panorama merkezi (Dünya'nın ortalama azimutu, 30°'ye yuvarlı)
    }
  }, [alan, yukleniyor, hata, t, hm, epsilon, merkezAz])
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

  const f = useMemo(() => (alan && horizon ? fDizisi(alan, horizon) : null), [alan, horizon])
  const c = useMemo(
    () => (alan && horizon ? cDizisi(alan, horizon, p.epsilon) : null),
    [alan, horizon, p.epsilon],
  )
  const P = useMemo(
    () => (alan && f ? guc(f, alan.sun_alt, p.eta, p.S, p.yonelim, alan.sun_au ?? null) : null),
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
