// Isı haritası — alan × iniş haftası ızgarası; hücre rengi görev puanı.
// Canvas 2D. Veri public/veri/ozet.json'dan gelir (ε = 2° ile önceden
// hesaplanmış f_bar, c_bar, tau_max_h); puan tarayıcıda hesaplanır:
//   puan = w1·f_bar + w2·c_bar − w3·(tau_max_h / (D·24))        (bölüm 5.6)
// Renk ölçeği o anki hm, D ve ağırlıklarda BÜTÜN alanların en düşük–en yüksek
// puanıdır; kategori filtresi ölçeği değiştirmez, alanlar kıyaslanabilir kalır.
// Hücreye tıklamak alanı ve iniş tarihini birlikte seçer (t = tL olur).

import { useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { saatBicimle, yuzdeBicimle } from '../core/hesap.js'
import { useBolgeler, useDurum, useOzet, useSeciliAlanVerisi } from '../durum/store.js'
import { KATEGORILER } from './AlanListesi.jsx'
import { AY_KISA } from './ZamanCizelgesi.jsx'
import { gunBicimle } from './ZamanKaydirici.jsx'
import { VARSAYILAN_RENK, YAZI, YAZI_KUCUK, renkleriOku, rgb } from './tuval.js'

const ETIKET = 170 // soldaki alan adı sütunu (px)
const SAG = 2
const UST = 2
const SATIR = 18 // satır yüksekliği, 1px boşluk dahil
const GRUP_BOSLUK = 8 // kategori grupları arasındaki boşluk
const ALT = 22 // ay kısaltmaları
const BOSLUK = 1 // hücreler arası
const GECIS_MS = 300
const VARSAYILAN_FILTRE = ['artemis', 'clps']
const SAAT_MS = 3600e3

const puanBicimle = (p) => p.toFixed(2).replace('-', '−')
const yumusat = (k) => 1 - (1 - k) ** 3

/** İnce çapraz tarama: görev yıl sonunu aştığı için boş kalan hücre. */
function tara(ctx, x, y, w, h, renk) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.strokeStyle = renk
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let k = -h; k < w; k += 5) {
    ctx.moveTo(x + k, y + h)
    ctx.lineTo(x + k + h, y)
  }
  ctx.stroke()
  ctx.restore()
}

export default function IsiHaritasi({ className = '' }) {
  const { ozet, hata } = useOzet()
  const { bolgeler } = useBolgeler()
  const { alan } = useSeciliAlanVerisi()
  const { seciliAlan, ozelNokta, tL, D, hm, epsilon, w1, w2, w3, alanSec, inisSec } = useDurum(
    useShallow((s) => ({
      seciliAlan: s.seciliAlan,
      ozelNokta: s.ozelNokta,
      tL: s.tL,
      D: s.D,
      hm: s.hm,
      epsilon: s.epsilon,
      w1: s.w1,
      w2: s.w2,
      w3: s.w3,
      alanSec: s.alanSec,
      inisSec: s.inisSec,
    })),
  )
  const [filtre, setFiltre] = useState(VARSAYILAN_FILTRE)
  const [fare, setFare] = useState(null) // { satir, sutun } veya null
  const [boyut, setBoyut] = useState({ w: 0, dpr: 1 })
  const kapRef = useRef(null)
  const canvasRef = useRef(null)
  const renkRef = useRef(VARSAYILAN_RENK)
  const gosterilenRef = useRef(new Map()) // site → Float32Array (0…1; NaN = boş)

  const sutunSayisi = ozet?.landing_count ?? 52
  const adimSaat = ozet?.landing_step_h ?? 168
  const t0ms = useMemo(() => (ozet ? Date.parse(ozet.t0) : 0), [ozet])
  // Zaman dizilerinin adımı bütün alanlarda aynıdır (ortak efemeris)
  const dt = alan?.dt_hours ?? 1

  // --- Puanlar ve renk ölçeği: bütün alanlar üzerinden ----------------------
  const { hucreler, enAz, enCok } = useMemo(() => {
    const hucreler = new Map() // site → { d, puan: (number|null)[], enIyi }
    let enAz = Infinity
    let enCok = -Infinity
    if (!ozet) return { hucreler, enAz: 0, enCok: 1 }
    for (const [site, alanOzeti] of Object.entries(ozet.sites)) {
      const d = alanOzeti[String(hm)]?.[String(D)]
      if (!d) continue
      let enIyi = -1
      const puan = d.f_bar.map((fBar, i) => {
        if (fBar == null) return null
        const p = w1 * fBar + w2 * d.c_bar[i] - w3 * (d.tau_max_h[i] / (D * 24))
        if (p < enAz) enAz = p
        if (p > enCok) enCok = p
        return p
      })
      puan.forEach((p, i) => {
        if (p != null && (enIyi < 0 || p > puan[enIyi])) enIyi = i
      })
      hucreler.set(site, { d, puan, enIyi })
    }
    if (enAz > enCok) return { hucreler, enAz: 0, enCok: 1 }
    return { hucreler, enAz, enCok }
  }, [ozet, hm, D, w1, w2, w3])

  // --- Satırlar: seçili kategoriler, kategoriye göre gruplu -----------------
  const { satirlar, yukseklik } = useMemo(() => {
    const satirlar = []
    let y = UST
    for (const k of KATEGORILER) {
      if (!filtre.includes(k.anahtar)) continue
      const grup = (bolgeler ?? []).filter((b) => b.kategori === k.anahtar && hucreler.has(b.site))
      if (grup.length === 0) continue
      if (satirlar.length > 0) y += GRUP_BOSLUK
      for (const b of grup) {
        satirlar.push({ site: b.site, y })
        y += SATIR
      }
    }
    return { satirlar, yukseklik: y + ALT }
  }, [bolgeler, hucreler, filtre])

  const seciliSite = ozelNokta ? null : seciliAlan
  const seciliSutunHam = (tL * dt) / adimSaat
  const seciliSutun = Number.isInteger(seciliSutunHam) && seciliSutunHam < sutunSayisi ? seciliSutunHam : -1

  const hucreW = boyut.w > 0 ? (boyut.w - ETIKET - SAG) / sutunSayisi : 0

  // --- Çizim ---------------------------------------------------------------
  const ciz = () => {
    const canvas = canvasRef.current
    const { w, dpr } = boyut
    if (!canvas || w < ETIKET + 60) return
    const ctx = canvas.getContext('2d')
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const R = renkRef.current
    const dusuk = rgb(R.zemin)
    const yuksek = rgb(R.gunes)
    const h = SATIR - BOSLUK
    const xOf = (i) => ETIKET + i * hucreW

    ctx.textBaseline = 'middle'
    for (const s of satirlar) {
      // Alan adı
      ctx.font = YAZI
      ctx.textAlign = 'right'
      ctx.fillStyle = s.site === seciliSite ? R.metin : R.metinSolgun
      ctx.fillText(s.site, ETIKET - 10, s.y + h / 2 + 0.5, ETIKET - 12)

      const u = gosterilenRef.current.get(s.site)
      const { enIyi } = hucreler.get(s.site)
      for (let i = 0; i < sutunSayisi; i++) {
        const x = Math.round(xOf(i))
        const cw = Math.round(xOf(i + 1)) - x - BOSLUK
        const v = u ? u[i] : NaN
        if (Number.isNaN(v)) {
          tara(ctx, x, s.y, cw, h, R.cizgi)
          continue
        }
        const r = Math.round(dusuk[0] + (yuksek[0] - dusuk[0]) * v)
        const g = Math.round(dusuk[1] + (yuksek[1] - dusuk[1]) * v)
        const b = Math.round(dusuk[2] + (yuksek[2] - dusuk[2]) * v)
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        ctx.fillRect(x, s.y, cw, h)
        if (i === enIyi) {
          // Satırın en iyi haftası: beyaz nokta (parlak hücrede de seçilsin diye koyu halka)
          ctx.beginPath()
          ctx.arc(x + cw / 2, s.y + h / 2, 2.5, 0, Math.PI * 2)
          ctx.fillStyle = '#FFFFFF'
          ctx.fill()
          ctx.lineWidth = 1
          ctx.strokeStyle = R.zemin
          ctx.stroke()
        }
      }
    }

    // Fare altındaki ve seçili hücrenin çerçevesi
    const cerceve = (satir, sutun, renk, kalinlik) => {
      const x = Math.round(xOf(sutun))
      const cw = Math.round(xOf(sutun + 1)) - x - BOSLUK
      ctx.strokeStyle = renk
      ctx.lineWidth = kalinlik
      ctx.strokeRect(x - 0.5, satir.y - 0.5, cw + 1, h + 1)
    }
    if (fare && satirlar[fare.satir]) cerceve(satirlar[fare.satir], fare.sutun, R.metinSolgun, 1)
    const seciliSatir = satirlar.find((s) => s.site === seciliSite)
    if (seciliSatir && seciliSutun >= 0) cerceve(seciliSatir, seciliSutun, '#FFFFFF', 2)

    // Ay kısaltmaları: her ayın ilk gününün düştüğü yerde
    if (satirlar.length > 0 && t0ms) {
      const altY = yukseklik - ALT
      const bitis = t0ms + sutunSayisi * adimSaat * SAAT_MS
      const ilk = new Date(t0ms)
      ctx.font = YAZI_KUCUK
      ctx.textAlign = 'left'
      ctx.fillStyle = R.metinSolgun
      ctx.strokeStyle = R.cizgi
      ctx.lineWidth = 1
      for (let m = 0; m < 14; m++) {
        const ay = Date.UTC(ilk.getUTCFullYear(), ilk.getUTCMonth() + m, 1)
        if (ay < t0ms) continue
        if (ay >= bitis) break
        const x = Math.round(ETIKET + ((ay - t0ms) / (adimSaat * SAAT_MS)) * hucreW) + 0.5
        ctx.beginPath()
        ctx.moveTo(x, altY + 3)
        ctx.lineTo(x, altY + 9)
        ctx.stroke()
        ctx.fillText(AY_KISA[new Date(ay).getUTCMonth()], x + 4, altY + 13)
      }
    }
  }
  const cizRef = useRef(ciz)
  cizRef.current = ciz

  // Kapsayıcıya göre boyutlan
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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = Math.round(boyut.w * boyut.dpr)
    canvas.height = Math.round(yukseklik * boyut.dpr)
    cizRef.current()
  }, [boyut, yukseklik])

  // hm, D veya ağırlık değişince renkler eski değerden yenisine akar
  useEffect(() => {
    const aralik = enCok - enAz || 1
    const hedef = new Map()
    for (const [site, { puan }] of hucreler) {
      hedef.set(site, Float32Array.from(puan, (p) => (p == null ? NaN : (p - enAz) / aralik)))
    }
    const baslangic = gosterilenRef.current
    if (baslangic.size === 0) {
      gosterilenRef.current = hedef
      cizRef.current()
      return
    }
    let kare = 0
    const t0 = performance.now()
    const adim = (simdi) => {
      const k = yumusat(Math.min(1, (simdi - t0) / GECIS_MS))
      const ara = new Map()
      for (const [site, son] of hedef) {
        const ilk = baslangic.get(site)
        ara.set(
          site,
          son.map((v, i) => (ilk && !Number.isNaN(ilk[i]) && !Number.isNaN(v) ? ilk[i] + (v - ilk[i]) * k : v)),
        )
      }
      gosterilenRef.current = ara
      cizRef.current()
      if (k < 1) kare = requestAnimationFrame(adim)
    }
    kare = requestAnimationFrame(adim)
    return () => {
      cancelAnimationFrame(kare)
      gosterilenRef.current = hedef
    }
  }, [hucreler, enAz, enCok])

  useEffect(() => {
    cizRef.current()
  }, [satirlar, fare, seciliSite, seciliSutun])

  // --- Fare ----------------------------------------------------------------
  const hucreBul = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    if (x < ETIKET || hucreW <= 0) return null
    const sutun = Math.floor((x - ETIKET) / hucreW)
    if (sutun < 0 || sutun >= sutunSayisi) return null
    const satir = satirlar.findIndex((s) => y >= s.y && y < s.y + SATIR)
    return satir < 0 ? null : { satir, sutun }
  }
  const fareOynadi = (e) => {
    const h = hucreBul(e)
    setFare((f) => (f?.satir === h?.satir && f?.sutun === h?.sutun ? f : h))
  }
  const tiklandi = (e) => {
    const h = hucreBul(e)
    if (!h) return
    alanSec(satirlar[h.satir].site)
    inisSec(Math.round((h.sutun * adimSaat) / dt))
  }

  const kategoriDegistir = (anahtar) => {
    setFare(null)
    setFiltre((f) => (f.includes(anahtar) ? f.filter((k) => k !== anahtar) : [...f, anahtar]))
  }

  // Fare altındaki hücrenin bilgisi
  let ipucu = null
  if (fare && satirlar[fare.satir]) {
    const satir = satirlar[fare.satir]
    const { d, puan } = hucreler.get(satir.site)
    const i = fare.sutun
    ipucu = {
      site: satir.site,
      tarih: gunBicimle(new Date(t0ms + i * adimSaat * SAAT_MS)),
      bos: puan[i] == null,
      fBar: d.f_bar[i],
      cBar: d.c_bar[i],
      tau: d.tau_max_h[i],
      puan: puan[i],
      x: Math.min(Math.max(ETIKET + (i + 0.5) * hucreW, 100), Math.max(100, boyut.w - 100)),
      y: satir.y,
    }
  }

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-metin-solgun">Isı haritası</h2>
          <p className="text-xs tabular-nums text-metin-solgun/80">
            Görev: {D} gün · Direk: {hm} m
          </p>
        </div>
        <p className="flex items-center gap-2 text-xs text-metin-solgun" aria-label="Renk ölçeği: koyu düşük puan, parlak yüksek puan">
          düşük
          <span
            aria-hidden="true"
            className="inline-block h-2 w-24 rounded-sm border border-cizgi"
            style={{ background: 'linear-gradient(to right, var(--zemin), var(--gunes))' }}
          />
          yüksek
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div role="group" aria-label="Kategori filtresi" className="flex flex-wrap gap-1.5">
          {KATEGORILER.map((k) => {
            const acik = filtre.includes(k.anahtar)
            return (
              <button
                key={k.anahtar}
                type="button"
                aria-pressed={acik}
                onClick={() => kategoriDegistir(k.anahtar)}
                className={`rounded-md border px-2.5 py-1 text-xs tracking-wide transition-colors duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60
                  ${acik ? 'border-gunes/70 bg-yuzey-acik text-metin' : 'border-cizgi text-metin-solgun hover:text-metin'}`}
              >
                {k.baslik}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-metin-solgun/80">
          Her sütun bir iniş haftası. Parlak hücre: daha çok güneş ve iletişim, daha kısa karanlık. Beyaz nokta:
          satırın en iyi haftası.
        </p>
      </div>

      <div ref={kapRef} className="relative">
        {hata ? (
          <p className="py-6 text-sm text-uyari">Isı haritası verisi yüklenemedi.</p>
        ) : !ozet || !bolgeler ? (
          <p className="py-6 text-sm text-metin-solgun">Yükleniyor…</p>
        ) : satirlar.length === 0 ? (
          <p className="py-6 text-sm text-metin-solgun">Gösterilecek alan yok — yukarıdan bir kategori seçin.</p>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={`Isı haritası: ${satirlar.length} alan, ${sutunSayisi} haftalık iniş tarihi. Hücreye tıklamak alanı ve iniş tarihini seçer.`}
              className="block"
              style={{ width: boyut.w, height: yukseklik, cursor: fare ? 'pointer' : 'default' }}
              onPointerMove={fareOynadi}
              onPointerLeave={() => setFare(null)}
              onClick={tiklandi}
            />
            {ipucu && (
              <div
                className="pointer-events-none absolute z-10 w-[190px] rounded-lg border border-cizgi bg-yuzey-acik px-3 py-2 text-xs shadow-lg"
                style={{ left: ipucu.x, top: ipucu.y, transform: 'translate(-50%, calc(-100% - 8px))' }}
              >
                <p className="truncate text-sm text-metin">{ipucu.site}</p>
                <p className="mb-1.5 text-metin-solgun">İniş: {ipucu.tarih}</p>
                {ipucu.bos ? (
                  <p className="text-metin-solgun">Görev veri aralığının dışına taşıyor.</p>
                ) : (
                  <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 tabular-nums">
                    <dt className="text-metin-solgun">Aydınlanma</dt>
                    <dd className="text-right text-metin">{yuzdeBicimle(ipucu.fBar)}</dd>
                    <dt className="text-metin-solgun">İletişim</dt>
                    <dd className="text-right text-metin">{yuzdeBicimle(ipucu.cBar)}</dd>
                    <dt className="text-metin-solgun">En uzun karanlık</dt>
                    <dd className="text-right text-metin">{saatBicimle(ipucu.tau)}</dd>
                    <dt className="text-metin-solgun">Puan</dt>
                    <dd className="text-right text-metin">{puanBicimle(ipucu.puan)}</dd>
                  </dl>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {ozet && epsilon !== ozet.epsilon_deg && (
        <p className="mt-2 text-xs text-metin-solgun">
          Isı haritası ε = {ozet.epsilon_deg}° ile önceden hesaplanmıştır.
        </p>
      )}
    </div>
  )
}
