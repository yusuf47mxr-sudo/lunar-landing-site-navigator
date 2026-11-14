// Yan yana karşılaştırma — challenge'ın iki senaryosu:
//   "Alanları karşılaştır": seçili alan + store.karsilastirma, aynı an ve aynı görev aralığı
//   "Tarihleri karşılaştır": seçili alan, farklı iniş tarihleri, görevin aynı günü
// Her sütun: başlık, küçük gökyüzü, iki satır geri sayım ve onların devamı
// olarak görev aralığı ölçütleri. Satır sırası ve yüksekliği bütün sütunlarda
// aynıdır; değerler kendi gökyüzünün altında durur ve yan yana okunur.
// En üstte tek cümlelik sonuç. Hesaplar hesap.js'ten (olcutler, geriSayim);
// f/c dizileri depodaki önbellekten (fDizisi, cDizisi).
//
// Performans: bu bileşen t'ye abone DEĞİLDİR. Oynatırken yalnızca küçük
// gökyüzleri ve geri sayımlar (SutunAni, GorevGunu) yeniden çizilir; ölçütler
// ve sonuç cümlesi t'ye bağlı olmadığı için yerinde kalır.

import { memo, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { geriSayim, olcutler, panoramaMerkezi, tamSaatBicimle, yuzdeBicimle } from '../core/hesap.js'
import { INIS_ADIM_SAAT, INIS_SAYISI, KUTUP_SINIRI } from '../core/sabitler.js'
import {
  cDizisi,
  fDizisi,
  karsilastirmaSutunlari,
  useAlanVerisi,
  useBolgeler,
  useDurum,
  useSeciliAlanVerisi,
} from '../durum/store.js'
import AkanSayi from './AkanSayi.jsx'
import { KATEGORILER } from './AlanListesi.jsx'
import { AkanSure, geriSayimSatirlari } from './GeriSayim.jsx'
import GokyuzuGorunumu from './GokyuzuGorunumu.jsx'
import { IZ_SAAT, izKes } from './GokyuzuKutusu.jsx'
import { inisTarihleri } from './ParametrePaneli.jsx'
import Secenekler from './Secenekler.jsx'

const SEKMELER = [
  { deger: 'alan', etiket: 'Alanları karşılaştır' },
  { deger: 'tarih', etiket: 'Tarihleri karşılaştır' },
]
const TARIH_ARALIGI_HAFTA = 13 // varsayılan ikinci tarih: bir çeyrek sonrası
const BELIRGIN_FARK = 0.05 // puan farkı bunun altındaysa sonuç cümlesi taraf tutmaz
// Geri sayım ve ölçüt satırları: bütün sütunlarda aynı yükseklik (yan yana okunur)
const SATIR = 'flex h-7 items-center justify-between gap-3'
const SUTUN_SINIFI = {
  1: 'min-[900px]:grid-cols-1',
  2: 'min-[900px]:grid-cols-2',
  3: 'min-[900px]:grid-cols-3',
}

const puanBicimle = (p) => p.toFixed(2).replace('-', '−')
const kisaTarih = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', timeZone: 'UTC' })

// --- Türkçe ekler ----------------------------------------------------------
// Yönelme: "Haworth'a", "Apollo 11'e", "%82'ye". Bulunma: "Haworth'ta", "Apollo 11'de".

const UNLU = /[aeıioöuü]/g
// Sayının okunuşuna göre ek: [sıfır … dokuz], [on … doksan], yüz
const YONELME = {
  rakam: ['a', 'e', 'ye', 'e', 'e', 'e', 'ya', 'ye', 'e', 'a'],
  onluk: ['', 'a', 'ye', 'a', 'a', 'ye', 'a', 'e', 'e', 'a'],
  yuz: 'e',
}
const BULUNMA = {
  rakam: ['da', 'de', 'de', 'te', 'te', 'te', 'da', 'de', 'de', 'da'],
  onluk: ['', 'da', 'de', 'da', 'ta', 'de', 'ta', 'te', 'de', 'da'],
  yuz: 'de',
}

function sayiEki(n, ek = YONELME) {
  const v = Math.abs(Math.round(n))
  if (v % 10 || v === 0) return ek.rakam[v % 10]
  const onluk = Math.floor(v / 10) % 10
  return onluk ? ek.onluk[onluk] : ek.yuz
}

/** Adın son sözcüğü: sayıysa { sayi }, değilse ses bilgisi { kalin, unluSon, sertSon }. */
function sonSozcuk(ad) {
  const son = ad.trim().split(/[\s-]+/).pop()
  if (/^\d+$/.test(son)) return { sayi: Number(son) }
  const k = son.toLowerCase()
  const unluler = k.match(UNLU)
  if (!unluler) return { kalin: false, unluSon: k.length === 1, sertSon: false } // tek harf: "B" → "be"
  return {
    kalin: 'aıou'.includes(unluler[unluler.length - 1]),
    unluSon: 'aeıioöuü'.includes(k[k.length - 1]),
    sertSon: 'fstkçşhp'.includes(k[k.length - 1]),
  }
}

/** Yönelme eki: "Haworth" → "a", "Rim 2" → "ye", "Athena" → "ya". */
function adEki(ad) {
  const s = sonSozcuk(ad)
  if (s.sayi !== undefined) return sayiEki(s.sayi)
  return (s.unluSon ? 'y' : '') + (s.kalin ? 'a' : 'e')
}

/** Bulunma eki: "Haworth" → "ta", "Malapert Massif" → "te", "Rim 2" → "de". */
function bulunmaEki(ad) {
  const s = sonSozcuk(ad)
  if (s.sayi !== undefined) return sayiEki(s.sayi, BULUNMA)
  return (s.sertSon ? 't' : 'd') + (s.kalin ? 'a' : 'e')
}

const yuzdeYonelme = (v) => `${yuzdeBicimle(v)}'${sayiEki(Math.round(v * 100))}`
const basHarfBuyuk = (m) => m.charAt(0).toLocaleUpperCase('tr') + m.slice(1)

// --- Sonuç cümlesi ve ölçüt satırları --------------------------------------

// Ölçüt satırları. yuvarla: gösterilen hassasiyet (kıyas buna göre yapılır,
// ekranda aynı görünen iki değerden biri "en iyi" diye boyanmasın).
const OLCUT_SATIRLARI = [
  { anahtar: 'fBar', etiket: 'Aydınlanma', bicim: yuzdeBicimle, yuvarla: (v) => Math.round(v * 100), yuksekIyi: true },
  { anahtar: 'cBar', etiket: 'İletişim', bicim: yuzdeBicimle, yuvarla: (v) => Math.round(v * 100), yuksekIyi: true },
  { anahtar: 'tauMax', etiket: 'En uzun karanlık', bicim: tamSaatBicimle, yuvarla: Math.round, yuksekIyi: false },
  { anahtar: 'sigmaMax', etiket: 'En uzun iletişim kesintisi', bicim: tamSaatBicimle, yuvarla: Math.round, yuksekIyi: false },
  { anahtar: 'puan', etiket: 'Puan', bicim: puanBicimle, yuvarla: (v) => Math.round(v * 100), yuksekIyi: true },
]

/**
 * Puanı en yüksek sütunu, sıradaki en iyi seçenekle kıyaslar ve puan farkına
 * en çok katkı yapan ölçütü tek cümleyle söyler.
 * @param sutunlar [{ ozne, tamlayan, bulunma, olcut }]  ozne: "Malapert Massif" / "2 Temmuz inişi",
 *                 tamlayan: "Haworth'a" / "1 Ocak inişine", bulunma: "Haworth'ta" / "1 Ocak inişinde"
 */
function sonucCumlesi(sutunlar, D, { w1, w2, w3 }, kip) {
  if (sutunlar.length < 2) {
    return kip === 'alan' ? 'Karşılaştırmak için bir alan daha ekleyin.' : 'Karşılaştırmak için ikinci bir tarih seçin.'
  }
  const gecerli = sutunlar.filter((s) => s.olcut)
  if (gecerli.length < 2) return 'Görev veri aralığının dışına taşıyor; karşılaştırma yapılamıyor.'
  const sirali = [...gecerli].sort((a, b) => b.olcut.puan - a.olcut.puan)
  const [iyi, diger] = sirali
  const a = iyi.olcut
  const b = diger.olcut
  if (a.puan - b.puan < BELIRGIN_FARK) return 'Seçenekler arasında belirgin fark yok.'

  // Puan farkının bileşenleri (5.6'daki puanın terimleri)
  const katkilar = [
    { tur: 'gunes', deger: w1 * (a.fBar - b.fBar) },
    { tur: 'iletisim', deger: w2 * (a.cBar - b.cBar) },
    { tur: 'karanlik', deger: (w3 * (b.tauMax - a.tauMax)) / (D * 24) },
  ].sort((x, y) => y.deger - x.deger)
  const enBuyuk = katkilar[0]
  if (!(enBuyuk.deger > 0)) return 'Seçenekler arasında belirgin fark yok.'

  const gore = `${diger.tamlayan} göre`
  // Kazananın değeri 0 ise "…saatten 0 saate indiriyor" yerine doğrudan söyle
  const hicYok = (durum, olcutAdi, saat) =>
    `${basHarfBuyuk(iyi.bulunma)} görev boyunca ${durum} (${diger.bulunma} en uzun ${olcutAdi} ${Math.round(saat)} saat).`
  if (enBuyuk.tur === 'karanlik') {
    if (Math.round(a.tauMax) === 0) return hicYok('hiç karanlık yaşanmıyor', 'karanlık', b.tauMax)
    return `${iyi.ozne}, ${gore} en uzun karanlığı ${Math.round(b.tauMax)} saatten ${Math.round(a.tauMax)} saate indiriyor.`
  }
  if (enBuyuk.tur === 'iletisim' && Math.round(a.sigmaMax) === 0 && Math.round(b.sigmaMax) > 0) {
    return hicYok('hiç iletişim kesintisi yok', 'iletişim kesintisi', b.sigmaMax)
  }
  const [x, y, fiil] =
    enBuyuk.tur === 'gunes' ? [a.fBar, b.fBar, 'daha fazla güneş alıyor'] : [a.cBar, b.cBar, 'daha fazla iletişim süresi sağlıyor']
  const fark = Math.round(x * 100) - Math.round(y * 100)
  if (fark <= 0) return 'Seçenekler arasında belirgin fark yok.'
  return `${iyi.ozne}, ${D} günlük görevde ${gore} ${fark} puan ${fiil} (${yuzdeYonelme(x)} karşı ${yuzdeBicimle(y)}).`
}

/** Bir satırdaki değerlerin sınıfı: en iyi --gunes, en kötü solgun. Hepsi aynıysa vurgu yok. */
function hucreSinifi(satir, degerler, i) {
  const v = degerler[i]
  if (v == null) return 'text-metin-solgun'
  const dolu = degerler.filter((x) => x != null).map(satir.yuvarla)
  const enCok = Math.max(...dolu)
  const enAz = Math.min(...dolu)
  if (dolu.length < 2 || enCok === enAz) return 'text-metin'
  const y = satir.yuvarla(v)
  const enIyi = satir.yuksekIyi ? enCok : enAz
  const enKotu = satir.yuksekIyi ? enAz : enCok
  return y === enIyi ? 'text-gunes' : y === enKotu ? 'text-metin-solgun' : 'text-metin'
}

// --- t'ye bağlı küçük parçalar --------------------------------------------

/**
 * Sütunun anı: küçük gökyüzü + iki satır geri sayım. t'ye kendisi abone olur.
 * kayma: sütunun anı ile ana kaydırıcı arasındaki fark (adım). Alan
 * karşılaştırmasında 0; tarih karşılaştırmasında sutunTL − tL (görevin aynı günü).
 */
const SutunAni = memo(function SutunAni({ alan, horizon, f, c, epsilon, kayma }) {
  const t = useDurum((s) => s.t)
  const i = Math.min(Math.max(0, Math.round(t) + kayma), alan.n - 1)
  const kutup = Math.abs(alan.lat) >= KUTUP_SINIRI
  const merkezAz = useMemo(() => panoramaMerkezi(alan.earth_az, alan.earth_alt), [alan])
  const sunTrail = useMemo(() => izKes(alan.sun_az, alan.sun_alt, i, IZ_SAAT, alan.dt_hours), [alan, i])
  const earthTrail = useMemo(() => izKes(alan.earth_az, alan.earth_alt, i, IZ_SAAT, alan.dt_hours), [alan, i])
  const satirlar = useMemo(() => geriSayimSatirlari(geriSayim(f, c, i, alan.dt_hours)), [f, c, i, alan])

  return (
    <>
      <div className="grid h-[200px] overflow-hidden rounded-xl border border-cizgi">
        <GokyuzuGorunumu
          horizon={horizon}
          sunAlt={alan.sun_alt[i]}
          sunAz={alan.sun_az[i]}
          earthAlt={alan.earth_alt[i]}
          earthAz={alan.earth_az[i]}
          epsilon={epsilon}
          kutup={kutup}
          sunTrail={sunTrail}
          earthTrail={earthTrail}
          yaklasik={alan.yaklasik === true}
          gorunum="otomatik"
          merkezAz={merkezAz}
        />
      </div>
      <dl className="mt-3 text-sm">
        {satirlar.map((s, k) => (
          <div key={k} className={SATIR}>
            <dt className="min-w-0 truncate text-metin-solgun">
              <span aria-hidden="true" className="mr-1.5">
                {k === 0 ? '☀' : '📡'}
              </span>
              {/* Geçiş yoksa değer uzun bir cümledir; dar sütunda etiket kısalır */}
              {s.saat === null ? (k === 0 ? 'Güneş' : 'Dünya') : s.onEk}
            </dt>
            <dd className="shrink-0 whitespace-nowrap text-right text-metin">
              {s.saat === null ? <span className="text-metin-solgun">{s.yoksa}</span> : <AkanSure saat={s.saat} tur={s.tur} />}
            </dd>
          </div>
        ))}
      </dl>
    </>
  )
})

/** "Görevin 4. günü" — bütün tarih sütunlarında aynıdır (t − tL). */
function GorevGunu({ dt }) {
  const fark = useDurum((s) => Math.floor(((Math.round(s.t) - s.tL) * dt) / 24))
  return (
    <p className="text-xs tabular-nums text-metin-solgun">
      {fark >= 0 ? `Görevin ${fark + 1}. günü` : `İnişe ${-fark} gün var`}
    </p>
  )
}

function AlanEkle({ bolgeler, gizli, onEkle }) {
  const gruplar = KATEGORILER.map((k) => ({
    ...k,
    alanlar: bolgeler.filter((b) => b.kategori === k.anahtar && !gizli.includes(b.site)),
  })).filter((g) => g.alanlar.length > 0)
  return (
    <div className="grid min-h-[120px] place-items-center rounded-xl border border-dashed border-cizgi p-4">
      <select
        aria-label="Karşılaştırmaya alan ekle"
        value=""
        onChange={(e) => e.target.value && onEkle(e.target.value)}
        style={{ colorScheme: 'dark' }}
        className="max-w-full rounded-lg border border-gunes/70 bg-zemin px-3 py-2 text-sm text-gunes
          focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60"
      >
        <option value="">+ Alan ekle</option>
        {gruplar.map((g) => (
          <optgroup key={g.anahtar} label={g.baslik}>
            {g.alanlar.map((b) => (
              <option key={b.site} value={b.site}>
                {b.site}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}

// --- Ana bileşen -----------------------------------------------------------

/** @param {number} [props.maks] en fazla sütun sayısı (Orta 2, İleri 3) */
export default function Karsilastirma({ maks = 2, className = '' }) {
  const p = useDurum(
    useShallow((s) => ({
      karsilastirma: s.karsilastirma,
      seciliAlan: s.seciliAlan,
      ozelNokta: s.ozelNokta,
      tL: s.tL,
      D: s.D,
      hm: s.hm,
      epsilon: s.epsilon,
      w1: s.w1,
      w2: s.w2,
      w3: s.w3,
      inisSec: s.inisSec,
      karsilastirmaEkle: s.karsilastirmaEkle,
      karsilastirmaCikar: s.karsilastirmaCikar,
    })),
  )
  const { bolgeler } = useBolgeler()
  const [kip, setKip] = useState('alan')
  // Tarih kipinde ek sütunların iniş tarihi (dizi indeksi); null → varsayılan
  const [ekTarihler, setEkTarihler] = useState([null, null])

  // Veri: seçili alan + en fazla iki ek alan. Her alan veri.js önbelleğinden
  // gelir; yeni alan eklenince yalnızca o alan indirilir.
  const ozel = p.ozelNokta !== null
  const ekAdlar = karsilastirmaSutunlari(p).slice(0, maks - 1)
  const secili = useSeciliAlanVerisi()
  const ek0 = useAlanVerisi(kip === 'alan' ? (ekAdlar[0] ?? null) : null)
  const ek1 = useAlanVerisi(kip === 'alan' ? (ekAdlar[1] ?? null) : null)

  const dt = secili.alan?.dt_hours ?? 1
  const tarihler = useMemo(() => inisTarihleri(secili.alan?.t0, dt), [secili.alan?.t0, dt])
  const n = secili.alan?.n ?? 0

  // Tarih kipinin sütun tarihleri: [tL, tL + 13 hafta, tL + 26 hafta…];
  // görev yıl sonunu aşıyorsa aynı kadar geriye.
  const haftaAdim = Math.round(INIS_ADIM_SAAT / dt)
  const gorevAdim = Math.round((p.D * 24) / dt)
  const tarihTL = [p.tL]
  for (let k = 1; k < maks; k++) {
    const ileri = p.tL + k * TARIH_ARALIGI_HAFTA * haftaAdim
    const geri = p.tL - k * TARIH_ARALIGI_HAFTA * haftaAdim
    const sigar = ileri + gorevAdim <= n && ileri <= (INIS_SAYISI - 1) * haftaAdim
    const varsayilan = sigar || geri < 0 ? Math.min(ileri, (INIS_SAYISI - 1) * haftaAdim) : geri
    tarihTL.push(ekTarihler[k - 1] ?? varsayilan)
  }

  // --- Sütunlar ------------------------------------------------------------
  const ham =
    kip === 'alan'
      ? [
          { anahtar: 'secili', veri: secili, tL: p.tL },
          ...[ek0, ek1].slice(0, ekAdlar.length).map((veri, k) => ({ anahtar: ekAdlar[k], site: ekAdlar[k], veri, tL: p.tL })),
        ]
      : tarihTL.map((tL, k) => ({ anahtar: `tarih${k}`, veri: secili, tL, tarihSirasi: k }))

  const sutunlar = ham.map((s) => {
    const alan = s.veri.alan
    const horizon = alan?.horizon[String(p.hm)] ?? null
    const f = alan && horizon ? fDizisi(alan, horizon) : null
    const c = alan && horizon ? cDizisi(alan, horizon, p.epsilon) : null
    const olcut = f && c ? olcutler(f, c, null, s.tL, p.D, alan.dt_hours, p.w1, p.w2, p.w3) : null
    let ozne
    let tamlayan
    let bulunma
    if (kip === 'alan') {
      const ad = alan?.yaklasik ? 'Özel nokta' : (alan?.site ?? s.site ?? '')
      ozne = ad
      // "özel nokta" cins ad: kesme işareti yok
      tamlayan = alan?.yaklasik ? 'özel noktaya' : `${ad}'${adEki(ad || 'a')}`
      bulunma = alan?.yaklasik ? 'özel noktada' : `${ad}'${bulunmaEki(ad || 'a')}`
    } else {
      const gun = alan ? kisaTarih.format(new Date(Date.parse(alan.t0) + s.tL * alan.dt_hours * 3600e3)) : ''
      ozne = `${gun} inişi`
      tamlayan = `${gun} inişine`
      bulunma = `${gun} inişinde`
    }
    return { ...s, alan, horizon, f, c, olcut, ozne, tamlayan, bulunma, hazir: !!(alan && f && c) }
  })

  // Ölçüt satırlarının sütunlar arası kıyası (en iyi / en kötü renklendirme)
  const olcutSatirlari = OLCUT_SATIRLARI.map((satir) => ({
    satir,
    degerler: sutunlar.map((s) => (s.olcut ? s.olcut[satir.anahtar] : null)),
  }))

  const hepsiHazir = sutunlar.every((s) => s.hazir)
  const cumle = hepsiHazir ? sonucCumlesi(sutunlar, p.D, p, kip) : ' '
  const eklenebilir = kip === 'alan' && sutunlar.length < maks && !!bolgeler
  const gizli = [...ekAdlar, ...(ozel || !secili.alan ? [] : [secili.alan.site])]
  const izgara = `grid grid-cols-1 gap-4 ${SUTUN_SINIFI[Math.min(3, sutunlar.length + (eklenebilir ? 1 : 0))]}`

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-metin-solgun">Karşılaştırma</h2>
        <Secenekler secenekler={SEKMELER} deger={kip} onSec={setKip} etiket="Karşılaştırma türü" kucuk />
      </div>

      {/* Tek cümlelik sonuç */}
      <div className="mb-4 min-h-[1.75rem]" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={cumle}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="text-base font-light tracking-wide text-metin sm:text-lg"
          >
            {cumle}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Sütunlar */}
      <div className={izgara}>
        {sutunlar.map((s, i) => (
          <article key={s.anahtar} className="min-w-0">
            <header className="mb-2 flex min-h-[3.25rem] items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {kip === 'alan' ? (
                  <>
                    <h3 className="truncate font-light tracking-wide text-metin">{s.alan?.site ?? s.site ?? ' '}</h3>
                    {s.alan?.yaklasik ? (
                      <span className="mt-1 inline-block rounded border border-uyari/60 px-1.5 py-0.5 text-[11px] text-uyari">
                        Arazi hesaba katılmadı
                      </span>
                    ) : (
                      <p className="truncate text-xs text-metin-solgun">
                        {bolgeler?.find((b) => b.site === s.alan?.site)?.aciklama ?? ' '}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <select
                      aria-label={`${s.tarihSirasi + 1}. iniş tarihi`}
                      value={s.tL}
                      disabled={tarihler.length === 0}
                      onChange={(e) => {
                        const tL = Number(e.target.value)
                        if (s.tarihSirasi === 0) return p.inisSec(tL) // ilk sütun ana iniş tarihidir
                        setEkTarihler((eski) => eski.map((v, k) => (k === s.tarihSirasi - 1 ? tL : v)))
                      }}
                      style={{ colorScheme: 'dark' }}
                      className="w-full max-w-[240px] rounded-lg border border-cizgi bg-zemin px-3 py-1.5 text-sm tabular-nums text-metin
                        focus:border-iletisim/60 focus:outline-none disabled:opacity-50"
                    >
                      {tarihler.map((o) => (
                        <option key={o.tL} value={o.tL}>
                          {o.etiket} inişi
                        </option>
                      ))}
                    </select>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2">
                      <GorevGunu dt={dt} />
                      {s.alan?.yaklasik && <span className="text-[11px] text-uyari">Arazi hesaba katılmadı</span>}
                    </div>
                  </>
                )}
              </div>
              {kip === 'alan' && s.site && (
                <button
                  type="button"
                  onClick={() => p.karsilastirmaCikar(s.site)}
                  aria-label={`${s.site} alanını karşılaştırmadan kaldır`}
                  title="Kaldır"
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-metin-solgun transition-colors
                    hover:bg-yuzey-acik hover:text-metin focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60"
                >
                  ×
                </button>
              )}
            </header>
            {s.hazir ? (
              <SutunAni alan={s.alan} horizon={s.horizon} f={s.f} c={s.c} epsilon={p.epsilon} kayma={s.tL - p.tL} />
            ) : (
              <>
                <p
                  className={`grid h-[200px] place-items-center rounded-xl border border-cizgi text-sm ${
                    s.veri.hata ? 'text-uyari' : 'text-metin-solgun'
                  }`}
                >
                  {s.veri.hata ? 'Veri yüklenemedi.' : 'Yükleniyor…'}
                </p>
                {/* Geri sayım satırlarının yeri: ölçütler öbür sütunlarla hizalı kalsın */}
                <div className="mt-3 h-14" aria-hidden="true" />
              </>
            )}

            {/* Görev aralığı ölçütleri — geri sayım satırlarının devamı */}
            <section aria-label={`${s.ozne}: ${p.D} günlük görev ölçütleri`} className="mt-1 border-t border-cizgi/60 pt-1 text-sm">
              <h4 className="flex h-7 items-center text-xs font-normal text-metin-solgun/80">{p.D} günlük görev</h4>
              <dl>
                {olcutSatirlari.map(({ satir, degerler }) => (
                  <div key={satir.anahtar} className={`${SATIR} border-t border-cizgi/40`}>
                    <dt className="min-w-0 truncate text-metin-solgun" title={satir.etiket}>
                      {satir.etiket}
                    </dt>
                    <dd className={`shrink-0 tabular-nums transition-colors duration-300 ${hucreSinifi(satir, degerler, i)}`}>
                      {degerler[i] == null ? '—' : <AkanSayi deger={degerler[i]} bicim={satir.bicim} />}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </article>
        ))}
        {eklenebilir && (
          <AlanEkle bolgeler={bolgeler} gizli={gizli} onEkle={(site) => p.karsilastirmaEkle(site, maks - 1)} />
        )}
      </div>
    </div>
  )
}
