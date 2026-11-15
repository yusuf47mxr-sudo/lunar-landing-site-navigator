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
import { ozelNoktaNotu } from '../core/ozelNokta.js'
import { AnimatePresence, motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { geriSayim, olcutler, panoramaMerkezi } from '../core/hesap.js'
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
import { useDil } from '../dil/index.js'
import AkanSayi from './AkanSayi.jsx'
import { KATEGORILER } from './AlanListesi.jsx'
import { AkanSure, geriSayimSatirlari } from './GeriSayim.jsx'
import GokyuzuGorunumu from './GokyuzuGorunumu.jsx'
import { IZ_SAAT, izKes } from './GokyuzuKutusu.jsx'
import { inisTarihleri } from './ParametrePaneli.jsx'
import Secenekler from './Secenekler.jsx'

const SEKMELER = ['alan', 'tarih']
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

// --- Sonuç cümlesi ve ölçüt satırları --------------------------------------

// Ölçüt satırları. yuvarla: gösterilen hassasiyet (kıyas buna göre yapılır,
// ekranda aynı görünen iki değerden biri "en iyi" diye boyanmasın).
// bicim: useDil().b içindeki biçimlendiricinin adı ya da 'puan'.
const OLCUT_SATIRLARI = [
  { anahtar: 'fBar', bicim: 'yuzde', yuvarla: (v) => Math.round(v * 100), yuksekIyi: true },
  { anahtar: 'cBar', bicim: 'yuzde', yuvarla: (v) => Math.round(v * 100), yuksekIyi: true },
  { anahtar: 'tauMax', bicim: 'tamSaat', yuvarla: Math.round, yuksekIyi: false },
  { anahtar: 'sigmaMax', bicim: 'tamSaat', yuvarla: Math.round, yuksekIyi: false },
  { anahtar: 'puan', bicim: 'puan', yuvarla: (v) => Math.round(v * 100), yuksekIyi: true },
]

/**
 * Puanı en yüksek sütunu, sıradaki en iyi seçenekle kıyaslar ve puan farkına
 * en çok katkı yapan ölçütü tek cümleyle söyler.
 * @param sutunlar [{ adlar, olcut }]  adlar: { tur: 'alan'|'tarih', ad, ozel, gun } — cümledeki
 *                 özne / tamlayan / bulunma biçimlerini sözlük üretir (karsilastirma.ozne vb.)
 * @param t        useDil().t
 */
function sonucCumlesi(sutunlar, D, { w1, w2, w3 }, kip, t) {
  if (sutunlar.length < 2) {
    return t(kip === 'alan' ? 'karsilastirma.cumle.alanEkle' : 'karsilastirma.cumle.tarihSec')
  }
  const gecerli = sutunlar.filter((s) => s.olcut)
  if (gecerli.length < 2) return t('karsilastirma.cumle.tasiyor')
  const sirali = [...gecerli].sort((a, b) => b.olcut.puan - a.olcut.puan)
  const [iyi, diger] = sirali
  const a = iyi.olcut
  const b = diger.olcut
  const farkYok = t('karsilastirma.cumle.farkYok')
  if (a.puan - b.puan < BELIRGIN_FARK) return farkYok

  // Puan farkının bileşenleri (5.6'daki puanın terimleri)
  const katkilar = [
    { tur: 'gunes', deger: w1 * (a.fBar - b.fBar) },
    { tur: 'iletisim', deger: w2 * (a.cBar - b.cBar) },
    { tur: 'karanlik', deger: (w3 * (b.tauMax - a.tauMax)) / (D * 24) },
  ].sort((x, y) => y.deger - x.deger)
  const enBuyuk = katkilar[0]
  if (!(enBuyuk.deger > 0)) return farkYok

  const adlar = { iyi: iyi.adlar, diger: diger.adlar }
  // Kazananın değeri 0 ise "…saatten 0 saate indiriyor" yerine doğrudan söyle
  if (enBuyuk.tur === 'karanlik') {
    if (Math.round(a.tauMax) === 0) return t('karsilastirma.cumle.hicKaranlik', { ...adlar, saat: Math.round(b.tauMax) })
    return t('karsilastirma.cumle.karanlik', { ...adlar, once: Math.round(b.tauMax), sonra: Math.round(a.tauMax) })
  }
  if (enBuyuk.tur === 'iletisim' && Math.round(a.sigmaMax) === 0 && Math.round(b.sigmaMax) > 0) {
    return t('karsilastirma.cumle.hicKesinti', { ...adlar, saat: Math.round(b.sigmaMax) })
  }
  const [x, y] = enBuyuk.tur === 'gunes' ? [a.fBar, b.fBar] : [a.cBar, b.cBar]
  const fark = Math.round(x * 100) - Math.round(y * 100)
  if (fark <= 0) return farkYok
  return t(`karsilastirma.cumle.${enBuyuk.tur}`, { ...adlar, D, fark, x, y })
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
  const { t: ceviri } = useDil()
  const i = Math.min(Math.max(0, Math.round(t) + kayma), alan.n - 1)
  const kutup = Math.abs(alan.lat) >= KUTUP_SINIRI
  const merkezAz = useMemo(() => panoramaMerkezi(alan.earth_az, alan.earth_alt), [alan])
  const sunTrail = useMemo(() => izKes(alan.sun_az, alan.sun_alt, i, IZ_SAAT, alan.dt_hours), [alan, i])
  const earthTrail = useMemo(() => izKes(alan.earth_az, alan.earth_alt, i, IZ_SAAT, alan.dt_hours), [alan, i])
  const satirlar = useMemo(() => geriSayimSatirlari(geriSayim(f, c, i, alan.dt_hours), ceviri), [f, c, i, alan, ceviri])

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
              {s.saat === null ? ceviri(k === 0 ? 'ortak.gunes' : 'ortak.dunya') : s.onEk}
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
  const { t } = useDil()
  const fark = useDurum((s) => Math.floor(((Math.round(s.t) - s.tL) * dt) / 24))
  return (
    <p className="text-xs tabular-nums text-metin-solgun">
      {fark >= 0 ? t('karsilastirma.gorevGunu', { n: fark + 1 }) : t('karsilastirma.inisKalan', { n: -fark })}
    </p>
  )
}

function AlanEkle({ bolgeler, gizli, onEkle }) {
  const { t, ad } = useDil()
  const gruplar = KATEGORILER.map((k) => ({
    ...k,
    alanlar: bolgeler.filter((b) => b.kategori === k.anahtar && !gizli.includes(b.site)),
  })).filter((g) => g.alanlar.length > 0)
  return (
    <div className="grid min-h-[120px] place-items-center rounded-xl border border-dashed border-cizgi p-4">
      <select
        aria-label={t('karsilastirma.alanEkleAria')}
        value=""
        onChange={(e) => e.target.value && onEkle(e.target.value)}
        style={{ colorScheme: 'dark' }}
        className="max-w-full rounded-lg border border-gunes/70 bg-zemin px-3 py-2 text-sm text-gunes
          focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60"
      >
        <option value="">{t('karsilastirma.alanEkle')}</option>
        {gruplar.map((g) => (
          <optgroup key={g.anahtar} label={t(`kategori.${g.anahtar}`)}>
            {g.alanlar.map((b) => (
              <option key={b.site} value={b.site}>
                {ad(b.site)}
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
  const { t, b, ad, aciklama } = useDil()
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
  const tarihler = useMemo(() => inisTarihleri(secili.alan?.t0, dt, b), [secili.alan?.t0, dt, b])
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
    // Cümledeki adlar (özne / tamlayan / bulunma biçimlerini sözlük üretir)
    const adlar =
      kip === 'alan'
        ? { tur: 'alan', ad: ad(alan?.site ?? s.site ?? '') ?? '', ozel: !!alan?.yaklasik }
        : { tur: 'tarih', gun: alan ? b.gunAy(new Date(Date.parse(alan.t0) + s.tL * alan.dt_hours * 3600e3)) : '' }
    return { ...s, alan, horizon, f, c, olcut, adlar, ozne: t('karsilastirma.ozne', adlar), hazir: !!(alan && f && c) }
  })

  // Ölçüt satırlarının sütunlar arası kıyası (en iyi / en kötü renklendirme)
  const olcutSatirlari = OLCUT_SATIRLARI.map((satir) => ({
    satir,
    degerler: sutunlar.map((s) => (s.olcut ? s.olcut[satir.anahtar] : null)),
  }))

  const hepsiHazir = sutunlar.every((s) => s.hazir)
  const cumle = hepsiHazir ? sonucCumlesi(sutunlar, p.D, p, kip, t) : ' '
  const eklenebilir = kip === 'alan' && sutunlar.length < maks && !!bolgeler
  const gizli = [...ekAdlar, ...(ozel || !secili.alan ? [] : [secili.alan.site])]
  const izgara = `grid grid-cols-1 gap-4 ${SUTUN_SINIFI[Math.min(3, sutunlar.length + (eklenebilir ? 1 : 0))]}`

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-metin-solgun">{t('karsilastirma.baslik')}</h2>
        <Secenekler
          secenekler={SEKMELER.map((deger) => ({ deger, etiket: t(`karsilastirma.sekme.${deger}`) }))}
          deger={kip}
          onSec={setKip}
          etiket={t('karsilastirma.turEtiket')}
          kucuk
        />
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
                    <h3 className="truncate font-light tracking-wide text-metin">{ad(s.alan?.site ?? s.site) ?? ' '}</h3>
                    {s.alan?.yaklasik ? (
                      <span className="mt-1 inline-block rounded border border-uyari/60 px-1.5 py-0.5 text-[11px] text-uyari">
                        {ozelNoktaNotu(s.alan, t).kisa}
                      </span>
                    ) : (
                      <p className="truncate text-xs text-metin-solgun">
                        {aciklama(bolgeler?.find((k) => k.site === s.alan?.site)) ?? ' '}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <select
                      aria-label={t('karsilastirma.tarihAria', { sira: s.tarihSirasi + 1 })}
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
                          {t('karsilastirma.inisSecenek', { gun: o.etiket })}
                        </option>
                      ))}
                    </select>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2">
                      <GorevGunu dt={dt} />
                      {s.alan?.yaklasik && <span className="text-[11px] text-uyari">{ozelNoktaNotu(s.alan, t).kisa}</span>}
                    </div>
                  </>
                )}
              </div>
              {kip === 'alan' && s.site && (
                <button
                  type="button"
                  onClick={() => p.karsilastirmaCikar(s.site)}
                  aria-label={t('karsilastirma.kaldirAria', { ad: ad(s.site) })}
                  title={t('karsilastirma.kaldir')}
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
                  {t(s.veri.hata ? 'karsilastirma.yuklenemedi' : 'uygulama.yukleniyor')}
                </p>
                {/* Geri sayım satırlarının yeri: ölçütler öbür sütunlarla hizalı kalsın */}
                <div className="mt-3 h-14" aria-hidden="true" />
              </>
            )}

            {/* Görev aralığı ölçütleri — geri sayım satırlarının devamı */}
            <section aria-label={t('karsilastirma.olcutAria', { ozne: s.ozne, D: p.D })} className="mt-1 border-t border-cizgi/60 pt-1 text-sm">
              <h4 className="flex h-7 items-center text-xs font-normal text-metin-solgun/80">{t('karsilastirma.gorevBaslik', { D: p.D })}</h4>
              <dl>
                {olcutSatirlari.map(({ satir, degerler }) => (
                  <div key={satir.anahtar} className={`${SATIR} border-t border-cizgi/40`}>
                    <dt className="min-w-0 truncate text-metin-solgun" title={t(`karsilastirma.olcut.${satir.anahtar}`)}>
                      {t(`karsilastirma.olcut.${satir.anahtar}`)}
                    </dt>
                    <dd className={`shrink-0 tabular-nums transition-colors duration-300 ${hucreSinifi(satir, degerler, i)}`}>
                      {degerler[i] == null ? '—' : <AkanSayi deger={degerler[i]} bicim={satir.bicim === 'puan' ? puanBicimle : b[satir.bicim]} />}
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
