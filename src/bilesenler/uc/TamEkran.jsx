// Tam ekran: Fullscreen API ile 3B paneli tüm ekranı kaplar; API yoksa ya da
// reddedilirse (ör. iOS) sabit konumlu "sahte" tam ekran. F tuşu ve ESC.
// Üst katman: köşelerde yarı saydam bilgiler, altta mevcut zaman çubuğu
// (ZamanKaydirici) ve rozetler (DurumGostergesi) — kopya değil, aynı bileşen.
// Fare 3 sn hareketsiz kalınca katman solar, hareketle geri gelir. Dil seçici
// (TR | EN) de katmanda: tam ekrandan çıkmadan dil değiştirilebilir.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDil } from '../../dil/index.js'
import { useAnlikDurum, useBolgeler } from '../../durum/store.js'
import DilSecici from '../DilSecici.jsx'
import DurumGostergesi from '../DurumGostergesi.jsx'
import ZamanKaydirici from '../ZamanKaydirici.jsx'

const SOLMA_MS = 3000

const yaziAlaniMi = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName ?? '')

/**
 * @param {React.RefObject<HTMLElement>} ref  tam ekrana alınacak öğe
 * @returns {{ tamEkran: boolean, sahte: boolean, degistir: () => void }}
 */
export function useTamEkran(ref) {
  const [tamEkran, setTamEkran] = useState(false)
  const [sahte, setSahte] = useState(false)

  useEffect(() => {
    const dinle = () => {
      const acik = document.fullscreenElement === ref.current && ref.current !== null
      setTamEkran(acik)
      if (!acik) setSahte(false)
    }
    document.addEventListener('fullscreenchange', dinle)
    return () => document.removeEventListener('fullscreenchange', dinle)
  }, [ref])

  const degistir = useCallback(() => {
    const el = ref.current
    if (!el) return
    if (tamEkran) {
      if (sahte) {
        setSahte(false)
        setTamEkran(false)
      } else {
        document.exitFullscreen?.()
      }
      return
    }
    const soz = el.requestFullscreen?.()
    if (soz && typeof soz.then === 'function') {
      soz.catch(() => {
        setSahte(true)
        setTamEkran(true)
      })
    } else {
      setSahte(true)
      setTamEkran(true)
    }
  }, [ref, tamEkran, sahte])

  // Sahte tam ekran (iPhone: Fullscreen API yok): arka sayfa kaymasın, en üste dön
  useEffect(() => {
    if (!sahte) return
    const html = document.documentElement
    const eski = [html.style.overflow, document.body.style.overflow]
    html.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = eski[0]
      document.body.style.overflow = eski[1]
    }
  }, [sahte])

  // F: aç/kapat; ESC: sahte tam ekranı kapat (gerçek olanı tarayıcı kapatır)
  useEffect(() => {
    const tus = (e) => {
      if (yaziAlaniMi(e) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        degistir()
      } else if (e.key === 'Escape' && tamEkran && sahte) {
        setSahte(false)
        setTamEkran(false)
      }
    }
    document.addEventListener('keydown', tus)
    return () => document.removeEventListener('keydown', tus)
  }, [degistir, tamEkran, sahte])

  return { tamEkran, sahte, degistir }
}

/** Fare hareketsizken false; hareketle true. Yalnız tam ekranda sayar. */
export function useKatmanGorunur(etkin, kapsayici) {
  const [gorunur, setGorunur] = useState(true)
  const zamanlayici = useRef(0)
  useEffect(() => {
    if (!etkin) {
      setGorunur(true)
      return
    }
    const el = kapsayici.current
    if (!el) return
    const kur = () => {
      clearTimeout(zamanlayici.current)
      zamanlayici.current = setTimeout(() => setGorunur(false), SOLMA_MS)
    }
    const hareket = () => {
      setGorunur(true)
      kur()
    }
    kur()
    el.addEventListener('pointermove', hareket)
    el.addEventListener('pointerdown', hareket)
    el.addEventListener('keydown', hareket)
    return () => {
      clearTimeout(zamanlayici.current)
      el.removeEventListener('pointermove', hareket)
      el.removeEventListener('pointerdown', hareket)
      el.removeEventListener('keydown', hareket)
    }
  }, [etkin, kapsayici])
  return gorunur
}

/**
 * Tam ekrandaki üst katman: sol üst alan adı + açıklama + tarih, sağ üst dil
 * seçici (büyüt/küçült düğmesinin solunda) ve rozetler, altta zaman çubuğu.
 */
export function TamEkranKatmani({ gorunur }) {
  const anlik = useAnlikDurum()
  const { bolgeler } = useBolgeler()
  const { b, ad, aciklama: aciklamaAl } = useDil()
  const site = anlik.alan?.site
  const aciklama = aciklamaAl(site ? bolgeler?.find((k) => k.site === site) : undefined)
  const sinif = `transition-opacity duration-500 ${gorunur ? 'opacity-100' : 'pointer-events-none opacity-0'}`
  return (
    <>
      {/* Sol üst: gezinti çubuğunun (UcBoyut) altında */}
      <div className={`pointer-events-none absolute left-4 top-14 z-20 max-w-[min(60vw,520px)] ${sinif}`}>
        <p className="text-2xl font-light tracking-wide text-metin drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
          {site ? ad(site) : ''}
        </p>
        {aciklama && <p className="text-sm text-metin-solgun">{aciklama}</p>}
        <p className="mt-1 text-sm tracking-wide text-metin/90 tabular-nums">{anlik.zaman ? b.tarih(anlik.zaman) : ''}</p>
      </div>
      {/* Sağ üst: dil seçici, büyüt/küçült düğmesinin (UcBoyut, right-3 top-3 h-8 w-8) solunda */}
      <div className={`absolute right-14 top-3 z-30 ${sinif}`}>
        <DilSecici className="!bg-zemin/70" />
      </div>
      <div className={`absolute right-4 top-14 z-20 w-[min(44vw,420px)] ${sinif}`}>
        <DurumGostergesi kip="sayisal" />
      </div>
      <div className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-zemin/95 via-zemin/60 to-transparent pt-8 ${sinif}`}>
        <ZamanKaydirici enFazla="max-w-[820px]" className="!border-t-0 !bg-transparent !backdrop-blur-none" surucu={false} />
      </div>
    </>
  )
}
