// Parametre paneli.
// kapsam='gorev' : iniş tarihi, görev süresi, direk yüksekliği (Orta)
// kapsam='tam'   : katlanabilir bölümler — Konum, Harita, Görev, Donanım,
//                  Puanlama (İleri). Bölüm başlığında varsayılandan farklı
//                  parametre sayısı ve "Varsayılana dön" bağlantısı görünür.
// Varsayılanlar sabitler.js'teki VARSAYILAN'dan okunur.

import { useEffect, useId, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { INIS_ADIM_SAAT, INIS_SAYISI, VARSAYILAN } from '../core/sabitler.js'
import { DIREK_YUKSEKLIKLERI, GOREV_SURELERI, useDurum, useSeciliAlanVerisi } from '../durum/store.js'
import AlanListesi from './AlanListesi.jsx'
import KutupHaritasi from './KutupHaritasi.jsx'
import OzelKoordinat from './OzelKoordinat.jsx'
import Secenekler from './Secenekler.jsx'
import { gunBicimle } from './ZamanKaydirici.jsx'

const SURE_SECENEKLERI = GOREV_SURELERI.map((d) => ({ deger: d, etiket: `${d} gün` }))
const DIREK_SECENEKLERI = DIREK_YUKSEKLIKLERI.map((h) => ({ deger: h, etiket: `${h} m` }))
const YONELIM_SECENEKLERI = [
  { deger: 'izleyen', etiket: 'İzleyen' },
  { deger: 'dikey', etiket: 'Dikey' },
  { deger: 'yatay', etiket: 'Yatay' },
]

// Bölümlerin parametreleri (rozet sayımı ve "Varsayılana dön" için)
const GOREV_PARAMETRELERI = ['tL', 'D', 'hm']
const DONANIM_PARAMETRELERI = ['epsilon', 'S', 'eta', 'yonelim']
const PUAN_PARAMETRELERI = ['w1', 'w2', 'w3']

const S_SINIR = { min: 0.1, max: 100 }

const ayni = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-9 : a === b)
const farkliSayisi = (p, adlar) => adlar.filter((ad) => !ayni(p[ad], VARSAYILAN[ad])).length

/**
 * Haftalık iniş tarihleri: t0'dan başlar, ozet.json'daki ızgarayla aynıdır.
 * @returns {Array<{tL: number, etiket: string}>}  tL zaman dizisindeki indeks
 */
export function inisTarihleri(t0, dt = 1) {
  if (!t0) return []
  const t0ms = Date.parse(t0)
  return Array.from({ length: INIS_SAYISI }, (_, k) => ({
    tL: Math.round((k * INIS_ADIM_SAAT) / dt),
    etiket: gunBicimle(new Date(t0ms + k * INIS_ADIM_SAAT * 3600e3)),
  }))
}

/** Etiket + (isteğe bağlı) sağda güncel değer, altında kontrol. */
function Satir({ etiket, deger = null, degisti = false, children }) {
  return (
    <div>
      <p className="mb-1.5 flex items-baseline justify-between gap-3 text-xs text-metin-solgun">
        <span>{etiket}</span>
        {deger !== null && (
          <span className={`tabular-nums transition-colors duration-300 ${degisti ? 'text-gunes' : 'text-metin'}`}>{deger}</span>
        )}
      </p>
      {children}
    </div>
  )
}

/** İnce kaydırıcı; güncel değer ve birim etiketin yanında yazar. */
function Kaydirici({ etiket, ad, deger, min, max, adim, bicim, onDegis }) {
  const dolu = ((deger - min) / (max - min)) * 100
  return (
    <Satir etiket={etiket} deger={bicim(deger)} degisti={!ayni(deger, VARSAYILAN[ad])}>
      <input
        type="range"
        aria-label={etiket}
        aria-valuetext={bicim(deger)}
        className="kaydirici kaydirici-ince w-full"
        style={{ '--dolu': `${dolu}%` }}
        min={min}
        max={max}
        step={adim}
        value={deger}
        onChange={(e) => onDegis(ad, Number(e.target.value))}
      />
    </Satir>
  )
}

/**
 * Panel alanı girişi (m²). Yazılan metin yerelde durur; geçerli ve aralıktaki
 * değer anında depoya yazılır, geçersizken depo değişmez ve kutu kırmızı olur.
 * Odak çıkınca metin depodaki değere döner.
 */
function AlanGirisi({ deger, onDegis }) {
  const [metin, setMetin] = useState(String(deger))
  const [odakta, setOdakta] = useState(false)
  // Depo başka yerden değişirse (Varsayılana dön) kutu onu göstersin
  useEffect(() => {
    if (!odakta) setMetin(String(deger))
  }, [deger, odakta])

  const sayi = Number(metin.trim().replace(',', '.'))
  const gecerli = metin.trim() !== '' && Number.isFinite(sayi) && sayi >= S_SINIR.min && sayi <= S_SINIR.max

  return (
    <Satir etiket="Panel alanı S" deger={`${deger} m²`} degisti={!ayni(deger, VARSAYILAN.S)}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          aria-label="Panel alanı (m²)"
          aria-invalid={gecerli ? undefined : 'true'}
          min={S_SINIR.min}
          max={S_SINIR.max}
          step={0.1}
          value={metin}
          onFocus={() => setOdakta(true)}
          onBlur={() => setOdakta(false)}
          onChange={(e) => {
            setMetin(e.target.value)
            const v = Number(e.target.value.trim().replace(',', '.'))
            if (e.target.value.trim() !== '' && Number.isFinite(v) && v >= S_SINIR.min && v <= S_SINIR.max) {
              onDegis('S', Math.round(v * 100) / 100)
            }
          }}
          style={{ colorScheme: 'dark' }}
          className={`w-full rounded-lg border bg-zemin px-3 py-1.5 text-sm tabular-nums text-metin focus:outline-none
            ${gecerli ? 'border-cizgi focus:border-iletisim/60' : 'border-uyari'}`}
        />
        <span className="shrink-0 text-xs text-metin-solgun">m²</span>
      </div>
      {!gecerli && (
        <p role="alert" className="mt-1 text-xs text-uyari">
          {S_SINIR.min} ile {S_SINIR.max} m² arasında olmalı.
        </p>
      )}
    </Satir>
  )
}

/** Katlanabilir bölüm. farkli > 0 ise başlıkta rozet ve "Varsayılana dön". */
function Bolum({ baslik, farkli = 0, onSifirla = null, acikBaslar = true, children }) {
  const [acik, setAcik] = useState(acikBaslar)
  const kimlik = useId()
  return (
    <section className="border-b border-cizgi last:border-b-0">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          aria-expanded={acik}
          aria-controls={kimlik}
          onClick={() => setAcik((a) => !a)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-[11px] uppercase tracking-[0.18em] text-metin-solgun
            transition-colors hover:text-metin focus:outline-none focus-visible:text-metin"
        >
          <svg
            viewBox="0 0 12 12"
            aria-hidden="true"
            className={`h-2.5 w-2.5 shrink-0 transition-transform duration-200 ${acik ? 'rotate-90' : ''}`}
          >
            <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="truncate">{baslik}</span>
          {farkli > 0 && (
            <span
              title={`${farkli} parametre varsayılandan farklı`}
              aria-label={`${farkli} parametre varsayılandan farklı`}
              className="grid h-4 min-w-4 place-items-center rounded-full bg-gunes/20 px-1 text-[10px] tabular-nums tracking-normal text-gunes"
            >
              {farkli}
            </span>
          )}
        </button>
        {farkli > 0 && onSifirla && (
          <button
            type="button"
            onClick={onSifirla}
            className="shrink-0 text-xs text-iletisim underline-offset-2 hover:underline focus:outline-none focus-visible:underline"
          >
            Varsayılana dön
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {acik && (
          <motion.div
            id={kimlik}
            key="icerik"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 px-3 pb-3 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

/** İniş tarihi, görev süresi, direk yüksekliği — iki kapsamda da aynı satırlar (kucuk: dar sütun). */
function GorevSatirlari({ p, tarihler, kucuk = false }) {
  return (
    <>
      <Satir etiket="İniş tarihi">
        <select
          aria-label="İniş tarihi"
          value={p.tL}
          disabled={tarihler.length === 0}
          onChange={(e) => p.inisSec(Number(e.target.value))}
          style={{ colorScheme: 'dark' }}
          className="w-full rounded-lg border border-cizgi bg-zemin px-3 py-2 text-sm tabular-nums text-metin
            focus:border-iletisim/60 focus:outline-none disabled:opacity-50"
        >
          {tarihler.map((s) => (
            <option key={s.tL} value={s.tL}>
              {s.etiket}
            </option>
          ))}
        </select>
      </Satir>
      <Satir etiket="Görev süresi">
        <Secenekler secenekler={SURE_SECENEKLERI} deger={p.D} onSec={p.DAyarla} etiket="Görev süresi" esnek kucuk={kucuk} />
      </Satir>
      <Satir etiket="Direk yüksekliği">
        <Secenekler secenekler={DIREK_SECENEKLERI} deger={p.hm} onSec={p.hmAyarla} etiket="Direk yüksekliği" esnek kucuk={kucuk} />
      </Satir>
    </>
  )
}

const dereceBicim = (v) => `${v.toFixed(1)}°`
const verimBicim = (v) => `%${Math.round(v * 100)}`
const agirlikBicim = (v) => v.toFixed(1)

/** @param {'gorev'|'tam'} [props.kapsam] */
export default function ParametrePaneli({ kapsam = 'gorev', className = '' }) {
  const { alan } = useSeciliAlanVerisi()
  const p = useDurum(
    useShallow((s) => ({
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
      inisSec: s.inisSec,
      DAyarla: s.DAyarla,
      hmAyarla: s.hmAyarla,
      yonelimAyarla: s.yonelimAyarla,
      parametreAyarla: s.parametreAyarla,
      varsayilanaDon: s.varsayilanaDon,
    })),
  )

  const t0 = alan?.t0
  const dt = alan?.dt_hours ?? 1
  const tarihler = useMemo(() => inisTarihleri(t0, dt), [t0, dt])

  if (kapsam !== 'tam') {
    return (
      <div className={`flex flex-col gap-4 ${className}`}>
        <GorevSatirlari p={p} tarihler={tarihler} />
      </div>
    )
  }

  return (
    <div className={className}>
      <Bolum baslik="Konum">
        <AlanListesi yerlesim="dikey" />
        <OzelKoordinat />
      </Bolum>

      <Bolum baslik="Kutup haritası" acikBaslar={false}>
        <KutupHaritasi />
      </Bolum>

      <Bolum
        baslik="Görev"
        farkli={farkliSayisi(p, GOREV_PARAMETRELERI)}
        onSifirla={() => p.varsayilanaDon(GOREV_PARAMETRELERI)}
      >
        <GorevSatirlari p={p} tarihler={tarihler} kucuk />
      </Bolum>

      <Bolum
        baslik="Donanım"
        farkli={farkliSayisi(p, DONANIM_PARAMETRELERI)}
        onSifirla={() => p.varsayilanaDon(DONANIM_PARAMETRELERI)}
      >
        <Kaydirici
          etiket="İletişim güvenlik payı ε"
          ad="epsilon"
          deger={p.epsilon}
          min={0}
          max={10}
          adim={0.5}
          bicim={dereceBicim}
          onDegis={p.parametreAyarla}
        />
        <AlanGirisi deger={p.S} onDegis={p.parametreAyarla} />
        <Kaydirici
          etiket="Panel verimi η"
          ad="eta"
          deger={p.eta}
          min={0.1}
          max={0.45}
          adim={0.01}
          bicim={verimBicim}
          onDegis={p.parametreAyarla}
        />
        <Satir
          etiket="Panel yönelimi"
          deger={YONELIM_SECENEKLERI.find((y) => y.deger === p.yonelim)?.etiket ?? ''}
          degisti={p.yonelim !== VARSAYILAN.yonelim}
        >
          <Secenekler
            secenekler={YONELIM_SECENEKLERI}
            deger={p.yonelim}
            onSec={p.yonelimAyarla}
            etiket="Panel yönelimi"
            esnek
            kucuk
          />
        </Satir>
      </Bolum>

      <Bolum
        baslik="Puanlama"
        farkli={farkliSayisi(p, PUAN_PARAMETRELERI)}
        onSifirla={() => p.varsayilanaDon(PUAN_PARAMETRELERI)}
      >
        <Kaydirici etiket="w1 · Aydınlanma" ad="w1" deger={p.w1} min={0} max={2} adim={0.1} bicim={agirlikBicim} onDegis={p.parametreAyarla} />
        <Kaydirici etiket="w2 · İletişim" ad="w2" deger={p.w2} min={0} max={2} adim={0.1} bicim={agirlikBicim} onDegis={p.parametreAyarla} />
        <Kaydirici etiket="w3 · Karanlık cezası" ad="w3" deger={p.w3} min={0} max={2} adim={0.1} bicim={agirlikBicim} onDegis={p.parametreAyarla} />
        <p className="text-xs tabular-nums text-metin-solgun/80">puan = w1·aydınlanma + w2·iletişim − w3·(en uzun karanlık ÷ görev süresi)</p>
      </Bolum>
    </div>
  )
}
