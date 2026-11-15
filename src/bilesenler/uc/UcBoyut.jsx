// 3B kapsayıcı — iki seviye: Ay küresi ve yerel sahne.
//
//   Küre (AyKuresi)  ──işarete tıkla: kamera 2 sn yaklaşır → perde → ──▶  Yerel (AraziSahnesi, açılış uçuşu)
//                    ◀── gezinti çubuğunda "Ay": perde → küre yakından açılıp geri uzaklaşır ──
//
// Her seviyenin kendi Canvas'ı vardır ve aynı anda yalnız biri bağlıdır: kapanan
// seviyenin WebGL bağlamı ve dokuları bırakılır. Tam ekran (F/ESC), üst katman
// (rozetler, zaman çubuğu), gezinti çubuğu ve geçiş perdesi burada; iki seviyede
// de aynı çalışır. Listeden başka alan seçilirse: yerelde yeni alana geçilir,
// kürede kamera o alana döner (seviyeler kendi içinde halleder).

import { useCallback, useEffect, useRef, useState } from 'react'
import { hataOlustur } from '../../core/hata.js'
import { useDil } from '../../dil/index.js'
import { useDurum } from '../../durum/store.js'
import AraziSahnesi from './AraziSahnesi.jsx'
import AyKuresi from './AyKuresi.jsx'
import { webglVar } from './HataSiniri.jsx'
import { TamEkranKatmani, useKatmanGorunur, useTamEkran } from './TamEkran.jsx'

const PERDE_MS = 380

function BuyutSimgesi({ acik }) {
  return acik ? (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * @param {object} props.anlik   useAnlikDurum() çıktısı
 * @param {number} props.f  @param {0|1} props.c
 * @param {(hata: Error) => void} props.onHata
 */
export default function UcBoyut({ anlik, f, c, onHata }) {
  const [seviye, setSeviye] = useState('kure') // 'kure' | 'yerel'
  const [donus, setDonus] = useState(false) // küre yerelden geri dönerek mi açıldı
  const [perde, setPerde] = useState(false)
  const [ucus, setUcus] = useState(null) // { site, sira } — küre üzerinde yaklaşma isteği
  const alanSec = useDurum((s) => s.alanSec)
  const { t, ad } = useDil()
  const zamanlayici = useRef(0)

  const kapsayici = useRef(null)
  const { tamEkran, sahte, degistir } = useTamEkran(kapsayici)
  const katman = useKatmanGorunur(tamEkran, kapsayici)
  const hud = `transition-opacity duration-500 ${!tamEkran || katman ? 'opacity-100' : 'pointer-events-none opacity-0'}`

  useEffect(() => {
    if (!webglVar()) onHata?.(hataOlustur('ucBoyut.hata.webglYok', {}, 'WebGL not available'))
  }, [onHata])
  useEffect(() => () => clearTimeout(zamanlayici.current), [])

  /** Perdeyle seviye değiştir: kararır, seviye değişir, açılır. */
  const perdeyle = useCallback((yeni, donerek) => {
    setPerde(true)
    clearTimeout(zamanlayici.current)
    zamanlayici.current = setTimeout(() => {
      setDonus(donerek)
      setSeviye(yeni)
      setUcus(null)
      setPerde(false)
    }, PERDE_MS)
  }, [])

  /** Küre: işarete tıklandı ya da gezinti çubuğundaki alan adına. */
  const ucusBaslat = useCallback(
    (site) => {
      if (site && site !== useDurum.getState().seciliAlan) alanSec(site)
      setUcus((u) => ({ site: site ?? useDurum.getState().seciliAlan, sira: (u?.sira ?? 0) + 1 }))
    },
    [alanSec],
  )
  const inis = useCallback(() => perdeyle('yerel', false), [perdeyle])
  const geri = useCallback(() => perdeyle('kure', true), [perdeyle])

  const seciliAlan = useDurum((s) => s.seciliAlan)
  const alanAdi = ad(anlik.alan?.site ?? (anlik.yaklasik ? '' : seciliAlan))
  const ozel = anlik.yaklasik

  return (
    <div
      ref={kapsayici}
      className={`overflow-hidden bg-zemin ${sahte ? 'fixed inset-0 z-[100] h-[100dvh] w-screen' : 'relative h-full w-full'}`}
      data-3b-sahne=""
      data-seviye={seviye}
      data-tam-ekran={tamEkran ? '' : undefined}
    >
      {seviye === 'kure' ? (
        <AyKuresi
          tamEkran={tamEkran}
          hud={hud}
          donus={donus}
          ucus={ucus}
          onUcus={ucusBaslat}
          onInis={inis}
          onHata={onHata}
        />
      ) : (
        <AraziSahnesi anlik={anlik} f={f} c={c} onHata={onHata} tamEkran={tamEkran} hud={hud} acilisUcusu />
      )}

      {/* Gezinti çubuğu: Ay › alan */}
      <nav
        aria-label={t('ucBoyut.gezinti')}
        data-gezinti=""
        className={`absolute left-3 top-3 z-30 flex items-center gap-1.5 rounded-md border border-cizgi bg-zemin/70 px-2.5 py-1 text-xs tracking-wide ${hud}`}
      >
        {seviye === 'yerel' ? (
          <button type="button" onClick={geri} className="text-iletisim hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60">
            {t('ortak.ay')}
          </button>
        ) : (
          <span className="text-metin">{t('ortak.ay')}</span>
        )}
        <span className="text-metin-solgun" aria-hidden="true">
          ›
        </span>
        {seviye === 'kure' && !ozel ? (
          <button
            type="button"
            onClick={() => ucusBaslat(null)}
            title={t('ucBoyut.inis')}
            className="text-iletisim hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60"
          >
            {alanAdi}
          </button>
        ) : (
          <span className="text-metin">{alanAdi}</span>
        )}
      </nav>

      {/* Sağ üst: büyüt/küçült — tam ekranda da hep görünür (telefonda çıkış yolu kaybolmasın) */}
      <button
        type="button"
        onClick={degistir}
        aria-label={t(tamEkran ? 'ucBoyut.tamEkranCik' : 'ucBoyut.tamEkran')}
        title={t(tamEkran ? 'ucBoyut.tamEkranCik' : 'ucBoyut.tamEkran')}
        className={`absolute right-3 top-3 z-30 grid h-8 w-8 place-items-center rounded-md border border-cizgi bg-zemin/70 text-metin-solgun
          hover:text-metin focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60`}
      >
        <BuyutSimgesi acik={tamEkran} />
      </button>

      {/* Geçiş perdesi */}
      <div
        aria-hidden="true"
        data-perde={perde ? '' : undefined}
        className={`pointer-events-none absolute inset-0 z-40 bg-black transition-opacity ease-in-out ${perde ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionDuration: `${PERDE_MS}ms` }}
      />

      {tamEkran && <TamEkranKatmani gorunur={katman} />}
    </div>
  )
}
