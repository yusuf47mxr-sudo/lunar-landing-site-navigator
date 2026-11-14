// Gökyüzü görünümü — azimut (yatay) × yükseklik (dikey) düzleminde ufuk
// profili, iletişim eşiği, Güneş ve Dünya. Canvas 2D ile elle çizilir.
//
// Eksen sınırları sadece `kutup` bayrağına bağlıdır; zaman ilerledikçe
// oynamaz (CLAUDE.md bölüm 11).

import { useEffect, useRef } from 'react'
import { GUNES_YARICAP, ufukOku } from '../core/hesap.js'

const GECIS_MS = 150
const GUNES_R = 10
const DUNYA_R = 8
const SOLUK = 0.25

// Kenar boşlukları (CSS pikseli): sol = yükseklik etiketleri, alt = yön etiketleri
const KENAR = { sol: 40, sag: 10, ust: 10, alt: 26 }

const VARSAYILAN_RENK = {
  zemin: '#070B14',
  yuzeyAcik: '#16203A',
  cizgi: '#1F2B45',
  metin: '#E6EDF7',
  metinSolgun: '#8A97AC',
  gunes: '#F5A524',
  iletisim: '#22D3EE',
  uyari: '#EF4444',
}

const YAZI = '400 11px Inter, ui-sans-serif, system-ui, sans-serif'
const YAZI_KUCUK = '400 10px Inter, ui-sans-serif, system-ui, sans-serif'

/** CSS değişkenlerinden paleti okur; bulunamazsa varsayılanlar. */
function renkleriOku() {
  if (typeof document === 'undefined') return VARSAYILAN_RENK
  const st = getComputedStyle(document.documentElement)
  const oku = (ad, yedek) => st.getPropertyValue(ad).trim() || yedek
  const r = VARSAYILAN_RENK
  return {
    zemin: oku('--zemin', r.zemin),
    yuzeyAcik: oku('--yuzey-acik', r.yuzeyAcik),
    cizgi: oku('--cizgi', r.cizgi),
    metin: oku('--metin', r.metin),
    metinSolgun: oku('--metin-solgun', r.metinSolgun),
    gunes: oku('--gunes', r.gunes),
    iletisim: oku('--iletisim', r.iletisim),
    uyari: oku('--uyari', r.uyari),
  }
}

/** #RRGGBB → rgba(...) */
function saydam(hex, a) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

const mod360 = (a) => ((a % 360) + 360) % 360
/** a'dan b'ye en kısa döngüsel fark, (-180, 180] */
const donguselFark = (a, b) => {
  const d = mod360(b - a)
  return d > 180 ? d - 360 : d
}
const yumusat = (u) => 1 - (1 - u) ** 3 // ease-out cubic

/** Eksen tanımı: sadece kutup bayrağına bağlı. */
function eksen(kutup) {
  return kutup ? { min: -15, max: 15, adim: 5 } : { min: -90, max: 90, adim: 15 }
}

const isaretli = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v))}°`

/**
 * @param {object} props
 * @param {ArrayLike<number>} props.horizon  360 eleman, derece
 * @param {number} props.sunAlt
 * @param {number} props.sunAz
 * @param {number} props.earthAlt
 * @param {number} props.earthAz
 * @param {number} props.epsilon  iletişim güvenlik payı (derece)
 * @param {boolean} props.kutup   |lat| >= 75
 * @param {Array<[number, number]>} [props.sunTrail]   [az, alt] çiftleri, eskiden yeniye
 * @param {Array<[number, number]>} [props.earthTrail]
 * @param {boolean} [props.yaklasik]
 * @param {string} [props.className]
 */
export default function GokyuzuGorunumu({
  horizon,
  sunAlt,
  sunAz,
  earthAlt,
  earthAz,
  epsilon = 2,
  kutup = false,
  sunTrail = null,
  earthTrail = null,
  yaklasik = false,
  className = '',
}) {
  const kapRef = useRef(null)
  const canvasRef = useRef(null)

  // Çizimin okuduğu her şey ref'te; böylece rAF döngüsü React render'ına bağlı kalmaz.
  const propsRef = useRef(null)
  propsRef.current = { horizon, epsilon, kutup, sunTrail, earthTrail, yaklasik }

  const boyutRef = useRef({ w: 0, h: 0, dpr: 1 })
  const fareRef = useRef(null) // { x, y } CSS pikseli veya null
  const renkRef = useRef(VARSAYILAN_RENK)
  const cerceveRef = useRef(0)

  // Konum geçişi: gorunen = şu an ekrandaki, hedef = son gelen değer
  const gecisRef = useRef(null)
  // { bas: {sunAz,...}, hedef: {...}, baslangic: ms }

  /** Şu anki (ara değerli) cisim konumları. */
  function anlikKonum(simdi) {
    const g = gecisRef.current
    if (!g) return null
    // rAF zaman damgası, geçişin başladığı performance.now()'dan önce olabilir → sıkıştır
    const u = Math.max(0, Math.min(1, (simdi - g.baslangic) / GECIS_MS))
    const k = yumusat(u)
    const { bas, hedef } = g
    return {
      sunAz: mod360(bas.sunAz + donguselFark(bas.sunAz, hedef.sunAz) * k),
      sunAlt: bas.sunAlt + (hedef.sunAlt - bas.sunAlt) * k,
      earthAz: mod360(bas.earthAz + donguselFark(bas.earthAz, hedef.earthAz) * k),
      earthAlt: bas.earthAlt + (hedef.earthAlt - bas.earthAlt) * k,
      bitti: u >= 1,
    }
  }

  function ciz(simdi) {
    const canvas = canvasRef.current
    const { w, h, dpr } = boyutRef.current
    if (!canvas || w < 2 || h < 2) return true
    const ctx = canvas.getContext('2d')
    const R = renkRef.current
    const p = propsRef.current
    const ek = eksen(p.kutup)
    const konum = anlikKonum(simdi)

    const x0 = KENAR.sol
    const x1 = w - KENAR.sag
    const y0 = KENAR.ust
    const y1 = h - KENAR.alt
    const gx = (az) => x0 + (az / 360) * (x1 - x0)
    const gy = (alt) => y1 - ((alt - ek.min) / (ek.max - ek.min)) * (y1 - y0)
    const yKirp = (y) => Math.max(y0 - 2, Math.min(y1 + 2, y))

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // 1. Zemin
    ctx.fillStyle = R.zemin
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.beginPath()
    ctx.rect(x0, y0, x1 - x0, y1 - y0)
    ctx.clip()

    // 2. Izgara
    ctx.strokeStyle = R.cizgi
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let az = 0; az <= 360; az += 30) {
      const x = Math.round(gx(az)) + 0.5
      ctx.moveTo(x, y0)
      ctx.lineTo(x, y1)
    }
    for (let alt = ek.min; alt <= ek.max; alt += ek.adim) {
      if (alt === 0) continue
      const y = Math.round(gy(alt)) + 0.5
      ctx.moveTo(x0, y)
      ctx.lineTo(x1, y)
    }
    ctx.stroke()

    // 4. Ufuk profili H(A): aşağısı tamamen dolu
    const hz = p.horizon
    if (hz && hz.length === 360) {
      ctx.beginPath()
      ctx.moveTo(x0, y1 + 2)
      for (let az = 0; az <= 360; az++) ctx.lineTo(gx(az), yKirp(gy(hz[az % 360])))
      ctx.lineTo(x1, y1 + 2)
      ctx.closePath()
      ctx.fillStyle = R.yuzeyAcik
      ctx.fill()
    }

    // 3. Ufuk çizgisi (yükseklik 0) — profilin üstünde de görünsün
    ctx.strokeStyle = saydam(R.metinSolgun, 0.55)
    ctx.lineWidth = 1
    ctx.beginPath()
    const ySifir = Math.round(gy(0)) + 0.5
    ctx.moveTo(x0, ySifir)
    ctx.lineTo(x1, ySifir)
    ctx.stroke()

    if (hz && hz.length === 360) {
      // Profilin üst kenarı
      ctx.strokeStyle = R.cizgi
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let az = 0; az <= 360; az++) {
        const x = gx(az)
        const y = yKirp(gy(hz[az % 360]))
        az === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()

      // 5. İletişim eşiği H(A) + ε
      ctx.strokeStyle = saydam(R.iletisim, 0.7)
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      for (let az = 0; az <= 360; az++) {
        const x = gx(az)
        const y = yKirp(gy(hz[az % 360] + p.epsilon))
        az === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }

    // 9. İzler
    izCiz(ctx, p.sunTrail, R.gunes, gx, gy)
    izCiz(ctx, p.earthTrail, R.iletisim, gx, gy)

    // Fare: dikey kılavuz
    const fare = fareRef.current
    let fareAz = null
    if (fare && fare.x >= x0 && fare.x <= x1 && fare.y >= y0 && fare.y <= y1) {
      fareAz = mod360(((fare.x - x0) / (x1 - x0)) * 360)
      if (fare.x >= x1) fareAz = 360
      ctx.strokeStyle = saydam(R.metin, 0.18)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(Math.round(fare.x) + 0.5, y0)
      ctx.lineTo(Math.round(fare.x) + 0.5, y1)
      ctx.stroke()
    }

    // 6–7. Cisimler
    if (konum && hz && hz.length === 360) {
      const dunyaGorunur = konum.earthAlt > ufukOku(hz, konum.earthAz) + p.epsilon
      cisimCiz(ctx, konum.earthAz, konum.earthAlt, DUNYA_R, R.iletisim, dunyaGorunur ? 1 : SOLUK, false, gx, gy)
      const gunesGorunur = konum.sunAlt + GUNES_YARICAP > ufukOku(hz, konum.sunAz)
      cisimCiz(ctx, konum.sunAz, konum.sunAlt, GUNES_R, R.gunes, gunesGorunur ? 1 : SOLUK, true, gx, gy)
    }

    ctx.restore() // kırpma bitti

    // 8. Eksen dışı cisimler: kenarda ok + etiket
    if (konum) {
      tasmaCiz(ctx, konum.earthAz, konum.earthAlt, R.iletisim, ek, gx, y0, y1, x0, x1)
      tasmaCiz(ctx, konum.sunAz, konum.sunAlt, R.gunes, ek, gx, y0, y1, x0, x1)
    }

    // Çerçeve
    ctx.strokeStyle = R.cizgi
    ctx.lineWidth = 1
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 - 1)

    // Eksen etiketleri
    ctx.font = YAZI
    ctx.fillStyle = R.metinSolgun
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let alt = ek.min; alt <= ek.max; alt += ek.adim) {
      ctx.fillText(isaretli(alt), x0 - 6, gy(alt))
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const yonler = { 0: 'K', 90: 'D', 180: 'G', 270: 'B', 360: 'K' }
    for (let az = 0; az <= 360; az += 30) {
      const yon = yonler[az]
      if (yon) {
        ctx.font = '500 11px Inter, ui-sans-serif, system-ui, sans-serif'
        ctx.fillStyle = R.metin
        ctx.fillText(yon, gx(az), y1 + 7)
      } else {
        ctx.font = YAZI_KUCUK
        ctx.fillStyle = saydam(R.metinSolgun, 0.7)
        ctx.fillText(`${az}°`, gx(az), y1 + 8)
      }
    }

    // 10. Açıklama (sağ üst)
    aciklamaCiz(ctx, R, x1, y0)

    // 11. Yaklaşık veri uyarısı (sol üst)
    if (p.yaklasik) {
      ctx.font = '500 11px Inter, ui-sans-serif, system-ui, sans-serif'
      const metin = 'Arazi hesaba katılmadı'
      const gen = ctx.measureText(metin).width
      const bx = x0 + 8
      const by = y0 + 8
      ctx.fillStyle = saydam(R.uyari, 0.15)
      ctx.strokeStyle = saydam(R.uyari, 0.6)
      yuvarlakDikdortgen(ctx, bx, by, gen + 16, 20, 4)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = R.uyari
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(metin, bx + 8, by + 10.5)
    }

    // Fare etiketi: o azimuttaki ufuk yüksekliği
    if (fareAz !== null && hz && hz.length === 360) {
      const H = ufukOku(hz, fareAz)
      const Hy = Math.round(H * 10) / 10 // "−0.0°" çıkmasın
      const metin = `Az ${fareAz.toFixed(0)}° · ufuk ${Hy >= 0 ? '+' : '−'}${Math.abs(Hy).toFixed(1)}°`
      ctx.font = YAZI
      const gen = ctx.measureText(metin).width + 14
      const hy = gy(H)
      let lx = fare.x + 10
      if (lx + gen > x1 - 4) lx = fare.x - 10 - gen
      let ly = Math.max(y0 + 4, Math.min(y1 - 24, (hy > y1 || hy < y0 ? fare.y : hy) - 28))
      ctx.fillStyle = saydam(R.zemin, 0.85)
      ctx.strokeStyle = R.cizgi
      yuvarlakDikdortgen(ctx, lx, ly, gen, 20, 4)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = R.metin
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(metin, lx + 7, ly + 10.5)
      if (hy >= y0 && hy <= y1) {
        ctx.fillStyle = R.metin
        ctx.beginPath()
        ctx.arc(fare.x, hy, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    return !konum || konum.bitti
  }

  // Tek bir rAF kuyruğu: geçiş sürerken kendini yeniden ister.
  const cizIste = () => {
    if (cerceveRef.current) return
    cerceveRef.current = requestAnimationFrame(() => {
      cerceveRef.current = 0
      const bitti = ciz(performance.now()) // geçişle aynı saat
      if (!bitti) cizIste()
    })
  }
  const cizIsteRef = useRef(cizIste)
  cizIsteRef.current = cizIste

  // Cisim konumu değişti → 150 ms geçiş başlat
  useEffect(() => {
    const hedef = { sunAz, sunAlt, earthAz, earthAlt }
    if (![sunAz, sunAlt, earthAz, earthAlt].every(Number.isFinite)) return
    const simdi = performance.now()
    const onceki = anlikKonum(simdi)
    gecisRef.current = { bas: onceki ?? hedef, hedef, baslangic: onceki ? simdi : simdi - GECIS_MS }
    cizIsteRef.current()
  }, [sunAz, sunAlt, earthAz, earthAlt]) // eslint-disable-line react-hooks/exhaustive-deps

  // Alan (ufuk) ya da eksen değişti → geçiş yapmadan yerine otur
  useEffect(() => {
    const g = gecisRef.current
    if (g) gecisRef.current = { bas: g.hedef, hedef: g.hedef, baslangic: -Infinity }
    cizIsteRef.current()
  }, [horizon, kutup])

  // Diğer görsel girdiler değişince yeniden çiz
  useEffect(() => {
    cizIsteRef.current()
  }, [epsilon, sunTrail, earthTrail, yaklasik])

  // Boyut + DPR
  useEffect(() => {
    renkRef.current = renkleriOku()
    const kap = kapRef.current
    const canvas = canvasRef.current
    const boyutla = () => {
      const r = kap.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const w = Math.max(1, Math.floor(r.width))
      const h = Math.max(1, Math.floor(r.height))
      boyutRef.current = { w, h, dpr }
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      // Boyut değişince canvas temizlenir; aynı karede yeniden çiz
      ciz(performance.now())
      cizIsteRef.current()
    }
    const ro = new ResizeObserver(boyutla)
    ro.observe(kap)
    boyutla()

    // Tarayıcı yakınlaştırması / ekran değişimi DPR'ı değiştirir
    let mq = null
    const dprDinle = () => {
      mq?.removeEventListener('change', dprDegisti)
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      mq.addEventListener('change', dprDegisti)
    }
    function dprDegisti() {
      boyutla()
      dprDinle()
    }
    dprDinle()

    return () => {
      ro.disconnect()
      mq?.removeEventListener('change', dprDegisti)
      if (cerceveRef.current) cancelAnimationFrame(cerceveRef.current)
      cerceveRef.current = 0
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fareHareket = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    fareRef.current = { x: e.clientX - r.left, y: e.clientY - r.top }
    cizIste()
  }
  const fareCikti = () => {
    fareRef.current = null
    cizIste()
  }

  return (
    <div ref={kapRef} className={`relative w-full h-full min-h-[160px] overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block cursor-crosshair"
        onMouseMove={fareHareket}
        onMouseLeave={fareCikti}
        role="img"
        aria-label={`Gökyüzü görünümü: Güneş yüksekliği ${fmt(sunAlt)}, azimut ${fmt(sunAz)}; Dünya yüksekliği ${fmt(earthAlt)}, azimut ${fmt(earthAz)}`}
      />
    </div>
  )
}

const fmt = (v) => (Number.isFinite(v) ? `${v.toFixed(1)}°` : '—')

// --- Yardımcı çizimler --------------------------------------------------------

function yuvarlakDikdortgen(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * Eskiden yeniye [az, alt] noktalarını soluk ve incelen bir çizgiyle bağlar.
 * Ardışık iki nokta 0°/360° sınırının iki yanındaysa çizgi grafiğin bir
 * ucundan öbürüne çekilmez: segment sınırda kesilir, iki parçası kendi
 * kenarına kadar çizilir.
 */
function izCiz(ctx, iz, renk, gx, gy) {
  if (!iz || iz.length < 2) return
  const n = iz.length
  ctx.lineCap = 'round'
  for (let i = 1; i < n; i++) {
    const [azA, altA] = iz[i - 1]
    const [azB, altB] = iz[i]
    if (![azA, altA, azB, altB].every(Number.isFinite)) continue
    const u = i / (n - 1) // 0 = en eski, 1 = en yeni
    ctx.strokeStyle = saydam(renk, 0.05 + 0.5 * u)
    ctx.lineWidth = 0.5 + 2 * u
    const d = azB - azA
    ctx.beginPath()
    if (Math.abs(d) <= 180) {
      ctx.moveTo(gx(azA), gy(altA))
      ctx.lineTo(gx(azB), gy(altB))
    } else {
      // Sınır geçişi: B'yi A'nın tarafına aç, kesişme yüksekliğini bul
      const azBAcik = d > 0 ? azB - 360 : azB + 360 // A=1°, B=359° → B=-1°
      const sinir = d > 0 ? 0 : 360 // A'nın yakın olduğu kenar
      const k = (sinir - azA) / (azBAcik - azA)
      const altSinir = altA + (altB - altA) * k
      ctx.moveTo(gx(azA), gy(altA))
      ctx.lineTo(gx(sinir), gy(altSinir))
      ctx.moveTo(gx(360 - sinir), gy(altSinir))
      ctx.lineTo(gx(azB), gy(altB))
    }
    ctx.stroke()
  }
  ctx.lineCap = 'butt'
}

function cisimCiz(ctx, az, alt, r, renk, opak, parlama, gx, gy) {
  // 0°/360° kenarındaki cisim yarım görünmesin: karşı kenara da çiz
  const xler = [gx(az)]
  if (az < 3) xler.push(gx(az + 360))
  if (az > 357) xler.push(gx(az - 360))
  const y = gy(alt)
  for (const x of xler) {
    if (parlama) {
      const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 3.2)
      g.addColorStop(0, saydam(renk, 0.45 * opak))
      g.addColorStop(1, saydam(renk, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r * 3.2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = saydam(renk, opak)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Cisim eksen sınırını aşıyorsa kenarda küçük ok ve "+23°" etiketi. */
function tasmaCiz(ctx, az, alt, renk, ek, gx, y0, y1, x0, x1) {
  const ust = alt > ek.max
  const alt_ = alt < ek.min
  if (!ust && !alt_) return
  const x = Math.max(x0 + 8, Math.min(x1 - 8, gx(az)))
  const uc = ust ? y0 + 3 : y1 - 3 // okun ucu
  const yon = ust ? 1 : -1 // içeri doğru
  ctx.fillStyle = renk
  ctx.beginPath()
  ctx.moveTo(x, uc)
  ctx.lineTo(x - 5, uc + 7 * yon)
  ctx.lineTo(x + 5, uc + 7 * yon)
  ctx.closePath()
  ctx.fill()
  ctx.font = '500 10px Inter, ui-sans-serif, system-ui, sans-serif'
  ctx.textAlign = x > x1 - 40 ? 'right' : 'left'
  ctx.textBaseline = 'middle'
  const lx = ctx.textAlign === 'right' ? x - 8 : x + 8
  ctx.fillText(isaretli(alt), lx, uc + 4 * yon)
}

function aciklamaCiz(ctx, R, x1, y0) {
  ctx.font = YAZI
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  const ogeler = [
    ['Güneş', R.gunes],
    ['Dünya', R.iletisim],
  ]
  const genislikler = ogeler.map(([ad]) => ctx.measureText(ad).width + 18)
  const toplam = genislikler.reduce((a, b) => a + b, 0) + 10
  let x = x1 - toplam - 4
  const y = y0 + 14
  ctx.fillStyle = saydam(R.zemin, 0.7)
  yuvarlakDikdortgen(ctx, x - 4, y - 10, toplam + 4, 20, 4)
  ctx.fill()
  ogeler.forEach(([ad, renk], i) => {
    ctx.fillStyle = renk
    ctx.beginPath()
    ctx.arc(x + 5, y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = R.metinSolgun
    ctx.fillText(ad, x + 13, y + 0.5)
    x += genislikler[i]
  })
}
