// Zaman kaydırıcısı — sayfanın altına yapışık; oynat/durdur, tarih ve
// kalın kaydırıcı. Oynatma: saatte 1 adım, saniyede 30 adım; sonda durur.
// Tarih satırının iki yanında kalıcı geri sayım (CLAUDE.md §8.2 "Zaman her
// zaman görünür"): solda Güneş, sağda Dünya. Temel'deki büyük GeriSayim'in
// özetidir; aynı satır içeriği (geriSayimSatirlari) ve renk kuralı (AkanSure).
// 640px altında tarih üstte, iki geri sayım altında yan yana.

import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useDil } from '../dil/index.js'
import { useAnlikDurum, useDurum, useGeriSayim } from '../durum/store.js'
import { AkanSure, geriSayimSatirlari } from './GeriSayim.jsx'

const ADIM_SANIYEDE = 30

/** Oynatılırken t'yi saniyede ADIM_SANIYEDE × hiz adım ilerletir; sonda durur. */
function useOynatma(n) {
  const { oynatiliyor, hiz } = useDurum(useShallow((s) => ({ oynatiliyor: s.oynatiliyor, hiz: s.hiz })))
  useEffect(() => {
    if (!oynatiliyor || !n) return
    let kare = 0
    let onceki = performance.now()
    let birikim = 0
    const dongu = (simdi) => {
      birikim += ((simdi - onceki) / 1000) * ADIM_SANIYEDE * hiz
      onceki = simdi
      const adim = Math.floor(birikim)
      if (adim > 0) {
        birikim -= adim
        const s = useDurum.getState()
        const yeni = s.t + adim
        if (yeni >= n - 1) {
          s.tAyarla(n - 1)
          if (s.oynatiliyor) s.oynatDegistir()
          return
        }
        s.tAyarla(yeni)
      }
      kare = requestAnimationFrame(dongu)
    }
    kare = requestAnimationFrame(dongu)
    return () => cancelAnimationFrame(kare)
  }, [oynatiliyor, hiz, n])
}

function OynatSimgesi({ oynatiliyor }) {
  return oynatiliyor ? (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-[1px]" aria-hidden="true">
      <path d="M7 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L8.5 4.64A1 1 0 0 0 7 5.5z" fill="currentColor" />
    </svg>
  )
}

/** Çubuktaki tek geri sayım: simge + ifade + süre (veya "Bu dönemde batmıyor"). */
function KucukSayim({ simge, simgeEtiket, satir, className = '' }) {
  return (
    <p className={`min-w-0 truncate text-xs tracking-wide text-metin-solgun sm:text-sm ${className}`}>
      <span role="img" aria-label={simgeEtiket} className="mr-1.5">
        {simge}
      </span>
      {satir.saat === null ? (
        satir.yoksa
      ) : (
        <>
          {satir.onEk} <AkanSure saat={satir.saat} tur={satir.tur} />
        </>
      )}
    </p>
  )
}

/**
 * @param {string} [props.enFazla] iç genişlik sınırı (sayfanın sütun genişliğiyle aynı olmalı)
 * @param {boolean} [props.surucu] oynatma döngüsünü bu örnek çalıştırır. Sayfada ikinci
 *        bir çubuk varsa (3B tam ekran katmanı) o false verir; yoksa t iki kat hızlanır.
 */
export default function ZamanKaydirici({ className = '', enFazla = 'max-w-[900px]', surucu = true }) {
  const anlik = useAnlikDurum()
  const { alan } = anlik
  const n = alan?.n ?? 0
  const { oynatiliyor, tAyarla, oynatDegistir } = useDurum(
    useShallow((s) => ({ oynatiliyor: s.oynatiliyor, tAyarla: s.tAyarla, oynatDegistir: s.oynatDegistir })),
  )
  useOynatma(surucu ? n : 0)
  const { t, b } = useDil()

  const oynat = () => {
    // Sondayken oynat'a basılırsa baştan başla
    if (!oynatiliyor && anlik.t >= n - 1) tAyarla(0)
    oynatDegistir()
  }
  const dolu = n > 1 ? (anlik.t / (n - 1)) * 100 : 0
  const sayim = useGeriSayim()
  const [gunes, dunya] = sayim ? geriSayimSatirlari(sayim, t) : [null, null]

  return (
    <div
      className={`sticky bottom-0 z-20 border-t border-cizgi bg-zemin/85 backdrop-blur-md ${className}`}
    >
      <div className={`mx-auto ${enFazla} px-4 py-3 sm:px-6`}>
        <div className="mb-2 grid grid-cols-2 items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <p
            className="col-span-2 text-center text-sm tracking-wide text-metin tabular-nums sm:col-span-1 sm:col-start-2 sm:row-start-1"
            aria-live="off"
          >
            {anlik.zaman ? b.tarih(anlik.zaman) : '—'}
          </p>
          {gunes && (
            <KucukSayim simge="☀" simgeEtiket={t('ortak.gunes')} satir={gunes} className="sm:col-start-1 sm:row-start-1" />
          )}
          {dunya && (
            <KucukSayim
              simge="📡"
              simgeEtiket={t('geriSayim.dunyaIletisim')}
              satir={dunya}
              className="text-right sm:col-start-3 sm:row-start-1"
            />
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={oynat}
            disabled={!alan}
            aria-label={t(oynatiliyor ? 'zamanKaydirici.durdur' : 'zamanKaydirici.oynat')}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-gunes/70 bg-gunes/10 text-gunes
              transition-colors hover:bg-gunes/20 disabled:opacity-40
              focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60"
          >
            <OynatSimgesi oynatiliyor={oynatiliyor} />
          </button>
          <input
            type="range"
            aria-label={t('zamanKaydirici.zaman')}
            aria-valuetext={anlik.zaman ? b.tarih(anlik.zaman) : undefined}
            className="kaydirici flex-1"
            style={{ '--dolu': `${dolu}%` }}
            min={0}
            max={Math.max(0, n - 1)}
            step={1}
            value={anlik.t}
            onChange={(e) => tAyarla(Number(e.target.value))}
            disabled={!alan}
          />
        </div>
      </div>
    </div>
  )
}
