// Zaman kaydırıcısı — sayfanın altına yapışık; oynat/durdur, tarih ve
// kalın kaydırıcı. Oynatma: saatte 1 adım, saniyede 30 adım; sonda durur.

import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAnlikDurum, useDurum } from '../durum/store.js'

const ADIM_SANIYEDE = 30

const gunBicim = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const saatBicim = new Intl.DateTimeFormat('tr-TR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
})

/** "14 Mart 2027, 08:00 UTC" */
export const tarihBicimle = (d) => `${gunBicim.format(d)}, ${saatBicim.format(d)} UTC`

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

export default function ZamanKaydirici({ className = '' }) {
  const anlik = useAnlikDurum()
  const { alan } = anlik
  const n = alan?.n ?? 0
  const { oynatiliyor, tAyarla, oynatDegistir } = useDurum(
    useShallow((s) => ({ oynatiliyor: s.oynatiliyor, tAyarla: s.tAyarla, oynatDegistir: s.oynatDegistir })),
  )
  useOynatma(n)

  const oynat = () => {
    // Sondayken oynat'a basılırsa baştan başla
    if (!oynatiliyor && anlik.t >= n - 1) tAyarla(0)
    oynatDegistir()
  }
  const dolu = n > 1 ? (anlik.t / (n - 1)) * 100 : 0

  return (
    <div
      className={`sticky bottom-0 z-20 border-t border-cizgi bg-zemin/85 backdrop-blur-md ${className}`}
    >
      <div className="mx-auto max-w-[900px] px-4 sm:px-6 py-3">
        <p className="mb-2 text-center text-sm tracking-wide text-metin tabular-nums" aria-live="off">
          {anlik.zaman ? tarihBicimle(anlik.zaman) : '—'}
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={oynat}
            disabled={!alan}
            aria-label={oynatiliyor ? 'Durdur' : 'Oynat'}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-gunes/70 bg-gunes/10 text-gunes
              transition-colors hover:bg-gunes/20 disabled:opacity-40
              focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60"
          >
            <OynatSimgesi oynatiliyor={oynatiliyor} />
          </button>
          <input
            type="range"
            aria-label="Zaman"
            aria-valuetext={anlik.zaman ? tarihBicimle(anlik.zaman) : undefined}
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
