// Alan listesi — bolgeler.json'dan, kategorilere göre gruplu kartlar.
// yerlesim='yatay': yatay kaydırılabilir şerit (Temel)
// yerlesim='dikey' : alt alta liste (Orta, sol sütun)

import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useBolgeler, useDurum } from '../durum/store.js'

export const KATEGORILER = [
  { anahtar: 'artemis', baslik: 'Artemis' },
  { anahtar: 'clps', baslik: 'CLPS' },
  { anahtar: 'apollo', baslik: 'Apollo' },
  { anahtar: 'uluslararasi', baslik: 'Uluslararası' },
]

export default function AlanListesi({ yerlesim = 'yatay', className = '' }) {
  const { bolgeler, hata } = useBolgeler()
  const { seciliAlan, ozelNokta, alanSec } = useDurum(
    useShallow((s) => ({ seciliAlan: s.seciliAlan, ozelNokta: s.ozelNokta, alanSec: s.alanSec })),
  )
  const yatay = yerlesim === 'yatay'
  const seritRef = useRef(null)
  const kartRef = useRef(new Map())
  const ilkKaydirma = useRef(true)

  // Yatay şeritte seçili kartı görünür alana ortala (sayfa dikeyde kaymaz)
  useEffect(() => {
    if (!yatay || !bolgeler) return
    const serit = seritRef.current
    const kart = kartRef.current.get(seciliAlan)
    if (!serit || !kart) return
    const sol = kart.offsetLeft - serit.clientWidth / 2 + kart.clientWidth / 2
    serit.scrollTo({ left: Math.max(0, sol), behavior: ilkKaydirma.current ? 'auto' : 'smooth' })
    ilkKaydirma.current = false
  }, [yatay, bolgeler, seciliAlan])

  if (hata) return <p className="text-uyari text-sm">Alan listesi yüklenemedi.</p>
  if (!bolgeler) return <div className={`h-[92px] ${className}`} aria-busy="true" />

  const gruplar = KATEGORILER.map((k) => ({
    ...k,
    alanlar: bolgeler.filter((b) => b.kategori === k.anahtar),
  })).filter((g) => g.alanlar.length > 0)

  return (
    <nav
      ref={seritRef}
      aria-label="İniş alanları"
      className={
        yatay
          ? `relative flex gap-8 overflow-x-auto pb-3 ince-kaydirma kenar-solma ${className}`
          : `relative flex flex-col gap-6 ${className}`
      }
    >
      {gruplar.map((g) => (
        <section key={g.anahtar} className="shrink-0">
          {/* Yatay şeritte başlık, grup kaydırılırken solda yapışık kalır */}
          <h3
            className={`mb-2 text-[11px] uppercase tracking-[0.18em] text-metin-solgun ${yatay ? 'sticky left-0 w-max' : ''}`}
          >
            {g.baslik}
          </h3>
          <ul className={yatay ? 'flex gap-3' : 'flex flex-col gap-2'}>
            {g.alanlar.map((b) => {
              const secili = !ozelNokta && b.site === seciliAlan
              return (
                <li key={b.site}>
                  <button
                    ref={(el) => (el ? kartRef.current.set(b.site, el) : kartRef.current.delete(b.site))}
                    onClick={() => alanSec(b.site)}
                    aria-pressed={secili}
                    className={`block text-left rounded-xl border px-4 py-3 transition-colors duration-300
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60
                      ${yatay ? 'w-48' : 'w-full'}
                      ${secili ? 'border-gunes bg-yuzey-acik' : 'border-cizgi bg-yuzey hover:bg-yuzey-acik'}`}
                  >
                    <span className="block font-light tracking-wide text-[15px] text-metin truncate">{b.site}</span>
                    <span className="mt-0.5 block text-xs text-metin-solgun truncate">{b.aciklama}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </nav>
  )
}
