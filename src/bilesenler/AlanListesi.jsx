// Alan listesi — bolgeler.json'dan, kategorilere göre gruplu kartlar.
// yerlesim='yatay': yatay kaydırılabilir şerit (Temel). Kenarlarda solma
//                    maskesi yalnızca o yönde gizli içerik varken görünür.
// yerlesim='dikey' : üstte arama kutusu, altında kendi içinde kayan liste;
//                    ikisi birlikte en fazla 240px (Orta, sol sütun)

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useDil } from '../dil/index.js'
import { useBolgeler, useDurum } from '../durum/store.js'

/** "Artemis III aday bölgesi · bölgedeki en iyi nokta" → "Artemis III aday bölgesi" */
export const kisaAciklama = (a) => (a ?? '').split(' · ')[0]

/** Kategori sırası; başlık sözlükte: t(`kategori.${anahtar}`). */
export const KATEGORILER = [{ anahtar: 'artemis' }, { anahtar: 'clps' }, { anahtar: 'apollo' }, { anahtar: 'uluslararasi' }]

const SOLMA = 40 // şerit kenarındaki solma genişliği (px)

/** Şeridin kenar maskesi: yalnızca o yönde gizli içerik varken solar. */
function solmaMaskesi({ sol, sag }) {
  if (!sol && !sag) return undefined
  const m = `linear-gradient(to right, ${sol ? `transparent, #000 ${SOLMA}px` : '#000'}, ${
    sag ? `#000 calc(100% - ${SOLMA}px), transparent` : '#000'
  })`
  return { WebkitMaskImage: m, maskImage: m }
}

/** Arama için sadeleştirme: küçük harf, Türkçe/aksanlı harfler ve noktalama yok. */
export function aramaDuzle(s) {
  return s
    .toLocaleLowerCase('tr')
    .replace(/\u0131/g, 'i') // noktasız ı → i
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
  const { t, ad, aciklama } = useDil()
  const yatay = yerlesim === 'yatay'
  const [arama, setArama] = useState('')
  const seritRef = useRef(null)
  const kartRef = useRef(new Map())
  const ilkKaydirma = useRef(true)
  const [kenar, setKenar] = useState({ sol: false, sag: false }) // gizli içerik var mı

  // Yatay şerit: kaydırma ve boyut değişince kenar maskelerini güncelle
  useLayoutEffect(() => {
    const serit = seritRef.current
    if (!yatay || !serit) return
    const guncelle = () => {
      const sol = serit.scrollLeft > 1
      const sag = serit.scrollLeft + serit.clientWidth < serit.scrollWidth - 1
      setKenar((k) => (k.sol === sol && k.sag === sag ? k : { sol, sag }))
    }
    guncelle()
    serit.addEventListener('scroll', guncelle, { passive: true })
    const ro = new ResizeObserver(guncelle)
    ro.observe(serit)
    return () => {
      serit.removeEventListener('scroll', guncelle)
      ro.disconnect()
    }
  }, [yatay, bolgeler])

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
      if (behavior === 'auto') {
        // İlk açılış: şerit mümkünse başta kalır. Seçili kart sağdaki solmanın
        // dışında görünüyorsa hiç kaydırma; değilse yalnızca görünecek kadar kaydır.
        const sagUc = kart.offsetLeft + kart.clientWidth
        const gorunurSon = serit.clientWidth - (serit.scrollWidth > serit.clientWidth ? SOLMA : 0)
        serit.scrollTo({ left: sagUc <= gorunurSon ? 0 : sagUc - serit.clientWidth + SOLMA + 8, behavior })
        return
      }
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

  if (hata) return <p className="text-uyari text-sm">{t('alanListesi.yuklenemedi')}</p>
  if (!bolgeler) return <div className={`h-[92px] ${className}`} aria-busy="true" />

  const aranan = yatay ? '' : aramaDuzle(arama)
  // Arama her iki dilde de iki adla (site, site_en) ve aktif dildeki açıklamayla eşleşir
  const eslesir = (b) =>
    !aranan || aramaDuzle(`${b.site} ${b.site_en ?? ''} ${aciklama(b) ?? ''}`).includes(aranan)
  const gruplar = KATEGORILER.map((k) => ({
    ...k,
    alanlar: bolgeler.filter((b) => b.kategori === k.anahtar && eslesir(b)),
  })).filter((g) => g.alanlar.length > 0)

  const liste = (
    <nav
      ref={seritRef}
      aria-label={t('alanListesi.liste')}
      style={yatay ? solmaMaskesi(kenar) : undefined}
      className={
        yatay
          ? `relative flex gap-8 overflow-x-auto pb-3 ince-kaydirma ${className}`
          : 'relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-2 ince-kaydirma'
      }
    >
      {gruplar.map((g) => (
        <section key={g.anahtar} className="shrink-0">
          {/* Yatay şeritte başlık, grup kaydırılırken solda yapışık kalır */}
          <h3
            className={`mb-2 text-[11px] uppercase tracking-[0.18em] text-metin-solgun ${yatay ? 'sticky left-0 w-max' : ''}`}
          >
            {t(`kategori.${g.anahtar}`)}
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
                      {ad(b.site)}
                    </span>
                    {/* Kartta yalnız kısa açıklama ("·" öncesi); tamamı başlık altındaki satırda */}
                    <span className="mt-0.5 block text-xs text-metin-solgun truncate">{kisaAciklama(aciklama(b))}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {gruplar.length === 0 && <p className="py-4 text-sm text-metin-solgun">{t('alanListesi.eslesmeYok')}</p>}
    </nav>
  )

  if (yatay) return liste
  return (
    <div className={`flex max-h-[240px] flex-col ${className}`}>
      <input
        type="search"
        value={arama}
        onChange={(e) => setArama(e.target.value)}
        placeholder={t('alanListesi.aramaIpucu')}
        aria-label={t('alanListesi.aramaEtiket')}
        className="mb-3 w-full shrink-0 rounded-lg border border-cizgi bg-zemin px-3 py-2 text-sm text-metin
          placeholder:text-metin-solgun/70 focus:border-iletisim/60 focus:outline-none"
      />
      {liste}
    </div>
  )
}
