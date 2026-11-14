// Alan listesi — bolgeler.json'dan, kategorilere göre gruplu kartlar.
// yerlesim='yatay': yatay kaydırılabilir şerit (Temel)
// yerlesim='dikey' : üstte arama kutusu, altında en fazla 320px yüksek,
//                    kendi içinde kayan liste (Orta, sol sütun)

import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useBolgeler, useDurum } from '../durum/store.js'

export const KATEGORILER = [
  { anahtar: 'artemis', baslik: 'Artemis' },
  { anahtar: 'clps', baslik: 'CLPS' },
  { anahtar: 'apollo', baslik: 'Apollo' },
  { anahtar: 'uluslararasi', baslik: 'Uluslararası' },
]

/** Arama için sadeleştirme: küçük harf, Türkçe/aksanlı harfler ve noktalama yok. */
export function aramaDuzle(s) {
  return s
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[-\s]+/g, ' ')
    .trim()
}

export default function AlanListesi({ yerlesim = 'yatay', className = '' }) {
  const { bolgeler, hata } = useBolgeler()
  const { seciliAlan, ozelNokta, alanSec } = useDurum(
    useShallow((s) => ({ seciliAlan: s.seciliAlan, ozelNokta: s.ozelNokta, alanSec: s.alanSec })),
  )
  const yatay = yerlesim === 'yatay'
  const [arama, setArama] = useState('')
  const seritRef = useRef(null)
  const kartRef = useRef(new Map())
  const ilkKaydirma = useRef(true)

  // Seçili kartı görünür alana getir. Sadece şeridin/listenin kendi kaydırması
  // değişir; sayfa kaymaz.
  useEffect(() => {
    if (!bolgeler) return
    const serit = seritRef.current
    const kart = kartRef.current.get(seciliAlan)
    if (!serit || !kart) return
    const behavior = ilkKaydirma.current ? 'auto' : 'smooth'
    ilkKaydirma.current = false
    if (yatay) {
      const sol = kart.offsetLeft - serit.clientWidth / 2 + kart.clientWidth / 2
      serit.scrollTo({ left: Math.max(0, sol), behavior })
      return
    }
    // Dikey: zaten görünüyorsa dokunma (listeden tıklandığında liste oynamasın)
    const k = kart.getBoundingClientRect()
    const s = serit.getBoundingClientRect()
    if (k.top >= s.top && k.bottom <= s.bottom) return
    const ust = serit.scrollTop + (k.top - s.top) - serit.clientHeight / 2 + k.height / 2
    serit.scrollTo({ top: Math.max(0, ust), behavior })
  }, [yatay, bolgeler, seciliAlan])

  if (hata) return <p className="text-uyari text-sm">Alan listesi yüklenemedi.</p>
  if (!bolgeler) return <div className={`h-[92px] ${className}`} aria-busy="true" />

  const aranan = yatay ? '' : aramaDuzle(arama)
  const eslesir = (b) => !aranan || aramaDuzle(`${b.site} ${b.aciklama ?? ''}`).includes(aranan)
  const gruplar = KATEGORILER.map((k) => ({
    ...k,
    alanlar: bolgeler.filter((b) => b.kategori === k.anahtar && eslesir(b)),
  })).filter((g) => g.alanlar.length > 0)

  const liste = (
    <nav
      ref={seritRef}
      aria-label="İniş alanları"
      className={
        yatay
          ? `relative flex gap-8 overflow-x-auto pb-3 ince-kaydirma kenar-solma ${className}`
          : 'relative flex max-h-[320px] flex-col gap-4 overflow-y-auto pr-2 ince-kaydirma'
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
          <ul className={yatay ? 'flex gap-3' : 'flex flex-col gap-1.5'}>
            {g.alanlar.map((b) => {
              const secili = !ozelNokta && b.site === seciliAlan
              return (
                <li key={b.site}>
                  <button
                    ref={(el) => (el ? kartRef.current.set(b.site, el) : kartRef.current.delete(b.site))}
                    onClick={() => alanSec(b.site)}
                    aria-pressed={secili}
                    className={`block text-left border transition-colors duration-300
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60
                      ${yatay ? 'w-48 rounded-xl px-4 py-3' : 'w-full rounded-lg px-3 py-2'}
                      ${secili ? 'border-gunes bg-yuzey-acik' : 'border-cizgi bg-yuzey hover:bg-yuzey-acik'}`}
                  >
                    <span
                      className={`block truncate font-light tracking-wide text-metin ${yatay ? 'text-[15px]' : 'text-sm'}`}
                    >
                      {b.site}
                    </span>
                    <span className="mt-0.5 block text-xs text-metin-solgun truncate">{b.aciklama}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {gruplar.length === 0 && <p className="py-4 text-sm text-metin-solgun">Eşleşen alan yok.</p>}
    </nav>
  )

  if (yatay) return liste
  return (
    <div className={className}>
      <input
        type="search"
        value={arama}
        onChange={(e) => setArama(e.target.value)}
        placeholder="Alan ara (ad veya açıklama)"
        aria-label="Alan ara"
        className="mb-3 w-full rounded-lg border border-cizgi bg-zemin px-3 py-2 text-sm text-metin
          placeholder:text-metin-solgun/70 focus:border-iletisim/60 focus:outline-none"
      />
      {liste}
    </div>
  )
}
