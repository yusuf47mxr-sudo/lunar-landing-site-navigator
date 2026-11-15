// Zaman çizelgesi — bütün yıl için aydınlanma (f) ve iletişim (c) şeritleri.
// Orta ve İleri sayfalarda kullanılır.
//
// İki katmanlı canvas:
//   alt katman  : şeritler, görev aralığı, en uzun karanlık/kesinti, aylar.
//                 Sadece f, c, tL, D, araliklar veya boyut değişince çizilir.
//   üst katman  : seçili an çizgisi ve fare kılavuzu. Oynatırken sadece bu
//                 katman temizlenip yeniden çizilir (birkaç çizgi), şeritler
//                 yeniden hesaplanmaz.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useDil } from '../dil/index.js'
import { VARSAYILAN_RENK, YAZI, YAZI_KUCUK, renkleriOku, rgb, saydam, yuvarlakDikdortgen } from './tuval.js'

// Yerleşim (CSS pikseli)
const SERIT_H = 28
const BOSLUK = 6
const SOL = 84 // şerit etiketleri için
const SAG = 8
const Y_GUNES = 26 // üstte: seçili an üçgeni + en uzun karanlık etiketi
const Y_ILET = Y_GUNES + SERIT_H + BOSLUK
const Y_ALT = Y_ILET + SERIT_H // iletişim şeridinin alt kenarı
const Y_AY = Y_ALT + 24 // ay etiketlerinin ortası (altında kesinti etiketi için yer var)
const YUKSEKLIK = Y_AY + 12
const DIS_SOLUKLUK = 0.7 // görev dışı: zemin %70 örtülür → şerit %30 görünür

/** Önek toplamı: i..j ortalaması = (P[j] - P[i]) / (j - i). */
function onEkToplam(dizi) {
  const P = new Float64Array(dizi.length + 1)
  for (let i = 0; i < dizi.length; i++) P[i + 1] = P[i] + dizi[i]
  return P
}

/** "14 Mar, 08:00" / "Mar 14, 08:00" */
const kisaTarih = (ms, t) => t('zamanCizelgesi.kisaTarih', { d: new Date(ms) })

/**
 * Her piksel sütunu için dizinin o sütuna düşen aralığının ortalaması.
 * Sütun sayısı diziden büyükse her sütun tek örneğe denk gelir.
 */
function sutunOrtalamalari(P, n, sutun) {
  const sonuc = new Float32Array(sutun)
  for (let j = 0; j < sutun; j++) {
    const bas = Math.floor((j * n) / sutun)
    const son = Math.max(bas + 1, Math.floor(((j + 1) * n) / sutun))
    sonuc[j] = (P[son] - P[bas]) / (son - bas)
  }
  return sonuc
}

/** Tek satırlık bir renk şeridini aygıt pikseli çözünürlüğünde çizer. */
function seritCiz(ctx, degerler, renk0, renk1, x, y, w, h) {
  const sutun = degerler.length
  const ara = document.createElement('canvas')
  ara.width = sutun
  ara.height = 1
  const actx = ara.getContext('2d')
  const img = actx.createImageData(sutun, 1)
  const [r0, g0, b0] = renk0
  const [r1, g1, b1] = renk1
  for (let j = 0; j < sutun; j++) {
    const u = degerler[j]
    const k = j * 4
    img.data[k] = r0 + (r1 - r0) * u
    img.data[k + 1] = g0 + (g1 - g0) * u
    img.data[k + 2] = b0 + (b1 - b0) * u
    img.data[k + 3] = 255
  }
  actx.putImageData(img, 0, 0)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(ara, x, y, w, h)
}

/**
 * @param {object} props
 * @param {Float32Array} props.f        güneş diskinin görünen oranı, tam yıl
 * @param {Float32Array} props.c        iletişim durumu, tam yıl
 * @param {string} props.t0             ISO zaman başlangıcı
 * @param {number} props.dtHours
 * @param {number} props.tSecili        seçili an (indeks)
 * @param {number} props.tL             görev başlangıcı (indeks)
 * @param {number} props.D              görev süresi (gün)
 * @param {object|null} props.araliklar enUzunAraliklar() sonucu
 * @param {(t: number) => void} props.onZamanSec
 */
export default function ZamanCizelgesi({
  f,
  c,
  t0,
  dtHours = 1,
  tSecili = 0,
  tL = 0,
  D = 30,
  araliklar = null,
  onZamanSec,
  className = '',
}) {
  const { t, b } = useDil()
  const kapRef = useRef(null)
  const altRef = useRef(null)
  const ustRef = useRef(null)
  const [boyut, setBoyut] = useState({ w: 0, dpr: 1 })
  const renkRef = useRef(VARSAYILAN_RENK)
  const fareRef = useRef(null) // fare x (CSS px) veya null
  const surukleRef = useRef(false)
  const sonSecilenRef = useRef(null)

  const n = f?.length ?? 0
  const t0ms = useMemo(() => (t0 ? Date.parse(t0) : 0), [t0])
  const fOnEk = useMemo(() => (f ? onEkToplam(f) : null), [f])
  const cOnEk = useMemo(() => (c ? onEkToplam(c) : null), [c])

  // Dinamik katmanın okuduğu son değerler (fare olayları React render'ı beklemez)
  const canliRef = useRef(null)
  canliRef.current = { tSecili, n, t0ms, dtHours, onZamanSec, w: boyut.w, dpr: boyut.dpr, t }

  const xOf = (i, w) => SOL + (i / n) * (w - SOL - SAG)

  // --- Boyut ----------------------------------------------------------------
  useEffect(() => {
    renkRef.current = renkleriOku()
    const kap = kapRef.current
    const olc = () => {
      const w = Math.max(1, Math.floor(kap.getBoundingClientRect().width))
      const dpr = window.devicePixelRatio || 1
      setBoyut((b) => (b.w === w && b.dpr === dpr ? b : { w, dpr }))
    }
    const ro = new ResizeObserver(olc)
    ro.observe(kap)
    olc()
    return () => ro.disconnect()
  }, [])

  // --- Alt katman: şeritler (pahalı kısım, seyrek) ----------------------------
  useEffect(() => {
    const canvas = altRef.current
    const { w, dpr } = boyut
    if (!canvas || w < SOL + SAG + 10) return
    boyutla(canvas, w, dpr)
    const ctx = canvas.getContext('2d')
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const R = renkRef.current
    const x0 = SOL
    const x1 = w - SAG
    const W = x1 - x0

    // Şerit etiketleri
    ctx.font = YAZI
    ctx.fillStyle = R.metinSolgun
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(t('zamanCizelgesi.aydinlanma'), x0 - 10, Y_GUNES + SERIT_H / 2, x0 - 12)
    ctx.fillText(t('zamanCizelgesi.iletisim'), x0 - 10, Y_ILET + SERIT_H / 2, x0 - 12)

    if (fOnEk && cOnEk && n > 0) {
      // Şeritler: aygıt pikseli başına bir sütun, sütun aralığının ortalaması
      const sutun = Math.max(1, Math.round(W * dpr))
      const zemin = rgb(R.zemin)
      seritCiz(ctx, sutunOrtalamalari(fOnEk, n, sutun), zemin, rgb(R.gunes), x0, Y_GUNES, W, SERIT_H)
      seritCiz(ctx, sutunOrtalamalari(cOnEk, n, sutun), zemin, rgb(R.iletisim), x0, Y_ILET, W, SERIT_H)

      // Görev aralığı dışı soluk
      const adim = Math.round((D * 24) / dtHours)
      const xa = xOf(tL, w)
      const xb = xOf(Math.min(n, tL + adim), w)
      ctx.fillStyle = saydam(R.zemin, DIS_SOLUKLUK)
      for (const y of [Y_GUNES, Y_ILET]) {
        if (xa > x0) ctx.fillRect(x0, y, xa - x0, SERIT_H)
        if (xb < x1) ctx.fillRect(xb, y, x1 - xb, SERIT_H)
      }

      // Şerit çerçeveleri (boş şerit de görünsün)
      ctx.strokeStyle = R.cizgi
      ctx.lineWidth = 1
      ctx.strokeRect(x0 + 0.5, Y_GUNES + 0.5, W - 1, SERIT_H - 1)
      ctx.strokeRect(x0 + 0.5, Y_ILET + 0.5, W - 1, SERIT_H - 1)

      // Görev aralığının uçları
      ctx.strokeStyle = R.metinSolgun
      ctx.beginPath()
      for (const x of [xa, xb]) {
        const xp = Math.round(x) + 0.5
        ctx.moveTo(xp, Y_GUNES - 4)
        ctx.lineTo(xp, Y_ALT + 4)
      }
      ctx.stroke()

      // En uzun karanlık (üstte) ve en uzun iletişim kesintisi (altta)
      if (araliklar) {
        enUzunCiz(ctx, R, araliklar.karanlik, Y_GUNES - 3, Y_GUNES - 13, w)
        enUzunCiz(ctx, R, araliklar.kesinti, Y_ALT + 3, Y_ALT + 13, w)
      }

      // Aylar
      ayEtiketleri(ctx, R, w)
    }

    function enUzunCiz(ctx, R, aralik, yCizgi, yEtiket, w) {
      if (!aralik || aralik.bas === null || !(aralik.uzunluk > 0)) return
      const xa = xOf(aralik.bas, w)
      const xb = Math.max(xa + 2, xOf(aralik.bas + aralik.uzunluk / dtHours, w))
      ctx.strokeStyle = R.uyari
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(xa, yCizgi)
      ctx.lineTo(xb, yCizgi)
      ctx.stroke()
      const metin = b.tamSaat(aralik.uzunluk)
      ctx.font = '500 10px Inter, ui-sans-serif, system-ui, sans-serif'
      const yari = ctx.measureText(metin).width / 2
      const xm = Math.max(SOL + yari, Math.min(w - SAG - yari, (xa + xb) / 2))
      ctx.fillStyle = R.uyari
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(metin, xm, yEtiket)
    }

    function ayEtiketleri(ctx, R, w) {
      const adimMs = dtHours * 3600e3
      const bitisMs = t0ms + n * adimMs
      const d = new Date(t0ms)
      let yil = d.getUTCFullYear()
      let ay = d.getUTCMonth()
      ctx.font = YAZI_KUCUK
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.strokeStyle = R.cizgi
      ctx.lineWidth = 1
      for (;;) {
        const basMs = Date.UTC(yil, ay, 1)
        if (basMs >= bitisMs) break
        const sonMs = Date.UTC(yil, ay + 1, 1)
        const ia = Math.max(0, (basMs - t0ms) / adimMs)
        const ib = Math.min(n, (sonMs - t0ms) / adimMs)
        const xa = xOf(ia, w)
        const xb = xOf(ib, w)
        // Ay başı çentiği
        const xp = Math.round(xa) + 0.5
        ctx.beginPath()
        ctx.moveTo(xp, Y_AY - 6)
        ctx.lineTo(xp, Y_AY - 2)
        ctx.stroke()
        if (xb - xa > 18) {
          ctx.fillStyle = R.metinSolgun
          ctx.fillText(b.ayKisa(new Date(basMs)), (xa + xb) / 2, Y_AY + 1)
        }
        ay += 1
        if (ay > 11) {
          ay = 0
          yil += 1
        }
      }
    }
  }, [boyut, fOnEk, cOnEk, n, tL, D, araliklar, t0ms, dtHours, t, b]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Üst katman: seçili an ve fare (ucuz, sık) -----------------------------
  const ustCiz = () => {
    const canvas = ustRef.current
    const { tSecili, n, t0ms, dtHours, w, dpr, t } = canliRef.current
    if (!canvas || w < SOL + SAG + 10) return
    boyutla(canvas, w, dpr)
    const ctx = canvas.getContext('2d')
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!n) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const R = renkRef.current

    // Fare kılavuzu + tarih etiketi
    const fx = fareRef.current
    if (fx !== null && fx >= SOL && fx <= w - SAG) {
      const i = indeksBul(fx, w, n)
      const x = Math.round(fx) + 0.5
      ctx.strokeStyle = saydam(R.metin, 0.35)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, Y_GUNES)
      ctx.lineTo(x, Y_ALT)
      ctx.stroke()
      const metin = kisaTarih(t0ms + i * dtHours * 3600e3, t)
      ctx.font = YAZI
      const gen = ctx.measureText(metin).width + 12
      const lx = Math.max(SOL, Math.min(w - SAG - gen, fx - gen / 2))
      ctx.fillStyle = saydam(R.zemin, 0.9)
      ctx.strokeStyle = R.cizgi
      yuvarlakDikdortgen(ctx, lx, 1, gen, 18, 4)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = R.metin
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(metin, lx + 6, 10.5)
    }

    // Seçili an: iki şeridi kesen beyaz çizgi + üstünde üçgen
    const xs = xOf(Math.min(Math.max(0, tSecili), n - 1), w)
    ctx.strokeStyle = R.metin
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(xs, Y_GUNES - 1)
    ctx.lineTo(xs, Y_ALT + 1)
    ctx.stroke()
    ctx.fillStyle = R.metin
    ctx.beginPath()
    ctx.moveTo(xs, Y_GUNES - 1)
    ctx.lineTo(xs - 4.5, Y_GUNES - 8)
    ctx.lineTo(xs + 4.5, Y_GUNES - 8)
    ctx.closePath()
    ctx.fill()
  }
  const ustCizRef = useRef(ustCiz)
  ustCizRef.current = ustCiz

  useEffect(() => {
    ustCizRef.current()
  }, [tSecili, boyut, n, t0ms, dtHours, t])

  // --- Etkileşim --------------------------------------------------------------
  const yerelX = (e) => e.clientX - ustRef.current.getBoundingClientRect().left
  const sec = (x) => {
    const { n, w, onZamanSec } = canliRef.current
    if (!n || !onZamanSec) return
    const i = indeksBul(x, w, n)
    if (i === sonSecilenRef.current) return
    sonSecilenRef.current = i
    onZamanSec(i)
  }
  const basildi = (e) => {
    if (e.button !== 0) return
    surukleRef.current = true
    sonSecilenRef.current = null
    e.currentTarget.setPointerCapture(e.pointerId)
    sec(yerelX(e))
  }
  const hareket = (e) => {
    fareRef.current = yerelX(e)
    if (surukleRef.current) sec(fareRef.current)
    ustCizRef.current()
  }
  const birakti = (e) => {
    surukleRef.current = false
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }
  const cikti = () => {
    if (surukleRef.current) return
    fareRef.current = null
    ustCizRef.current()
  }
  const tus = (e) => {
    const { n, tSecili, onZamanSec } = canliRef.current
    if (!n || !onZamanSec) return
    const adim = e.shiftKey ? 24 : 1
    const yeni =
      e.key === 'ArrowRight' ? tSecili + adim
        : e.key === 'ArrowLeft' ? tSecili - adim
          : e.key === 'Home' ? 0
            : e.key === 'End' ? n - 1
              : null
    if (yeni === null) return
    e.preventDefault()
    onZamanSec(Math.min(n - 1, Math.max(0, yeni)))
  }

  return (
    <div
      ref={kapRef}
      className={`relative w-full select-none ${className}`}
      style={{ height: YUKSEKLIK }}
      role="slider"
      tabIndex={0}
      aria-label={t('zamanCizelgesi.aria')}
      aria-valuemin={0}
      aria-valuemax={Math.max(0, n - 1)}
      aria-valuenow={tSecili}
      aria-valuetext={n ? kisaTarih(t0ms + tSecili * dtHours * 3600e3, t) : undefined}
      onKeyDown={tus}
    >
      <canvas ref={altRef} className="absolute inset-0 block" aria-hidden="true" />
      <canvas
        ref={ustRef}
        className="absolute inset-0 block cursor-pointer"
        style={{ touchAction: 'pan-y' }}
        aria-hidden="true"
        onPointerDown={basildi}
        onPointerMove={hareket}
        onPointerUp={birakti}
        onPointerCancel={birakti}
        onPointerLeave={cikti}
      />
    </div>
  )
}

/** Canvas'ı CSS genişliği w ve sabit yüksekliğe, DPR'a göre boyutlar (değiştiyse). */
function boyutla(canvas, w, dpr) {
  const gw = Math.round(w * dpr)
  const gh = Math.round(YUKSEKLIK * dpr)
  if (canvas.width !== gw) canvas.width = gw
  if (canvas.height !== gh) canvas.height = gh
  canvas.style.width = `${w}px`
  canvas.style.height = `${YUKSEKLIK}px`
}

/** CSS x → zaman indeksi, [0, n-1]'e sıkıştırılmış. */
function indeksBul(x, w, n) {
  const u = (x - SOL) / (w - SOL - SAG)
  return Math.min(n - 1, Math.max(0, Math.round(u * n)))
}
