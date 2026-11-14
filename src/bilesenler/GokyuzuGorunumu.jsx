// Gökyüzü görünümü — azimut (yatay) × yükseklik (dikey) düzleminde ufuk
// profili, iletişim eşiği, Güneş ve Dünya. Canvas 2D ile elle çizilir.
//
// Eksen sınırları sadece `kutup` bayrağına bağlıdır; zaman ilerledikçe
// oynamaz (CLAUDE.md bölüm 11).
//
// Çizim sırası (iki kipte de): ızgara → izler → Güneş → Dünya → arazi dolgusu
// → iletişim eşiği → etiketler, oklar, lejant, rozet. Cisimler hep tam opak
// çizilir; örtmeyi arazinin kendisi yapar: kısmen batan disk arazinin
// siluetiyle kesilir, tamamen arkada kalan cisim arazinin arasından soluk görünür.
//
// İSTİSNA (yalnızca kubbe): kubbede arazi halkası Güneş diskinden ince olduğu
// için örtmeyi gösteremez. Bu yüzden kubbede f = 0 iken (Güneş tamamen
// arazinin arkasında) disk %25 opaklıkla çizilir; rozet "Gölgede" derken
// resim aksini söylemesin. Panoramada bu istisna yoktur.
//
// Dünya iki kipte de iletişim durumunu gösterir: c = 1 dolu disk, c = 0 içi
// boş halka (2px kenar, --iletisim).

import { useEffect, useRef } from 'react'
import { GUNES_YARICAP, ufukOku } from '../core/hesap.js'
import { VARSAYILAN_RENK, YAZI, YAZI_KUCUK, renkleriOku, saydam, yuvarlakDikdortgen } from './tuval.js'

const GECIS_MS = 150
const GUNES_R = 10
const DUNYA_R = 8
const ARAZI_OPAK = 0.8 // arkasındaki cisim %20 görünür
const KUBBE_GOLGE_OPAK = 0.25 // kubbe istisnası: f = 0 iken Güneş diski
const HALKA_KALINLIK = 2 // c = 0 iken Dünya halkasının kenarı (px)

/** f(t) > 0 ile aynı koşul (hesap.js gunesOrani): diskin bir kısmı ufkun üstünde. */
const gunesGorunur = (hz, az, alt) => !hz || alt + GUNES_YARICAP > ufukOku(hz, az)
/** c(t) = 1 ile aynı koşul (hesap.js iletisimDurumu). */
const dunyaBagli = (hz, az, alt, eps) => !hz || alt > ufukOku(hz, az) + eps
const DERECE = Math.PI / 180

// Kenar boşlukları (CSS pikseli): sol = yükseklik etiketleri, alt = yön etiketleri
const KENAR = { sol: 40, sag: 10, ust: 10, alt: 26 }

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
 * @param {'otomatik'|'panorama'|'kubbe'} [props.gorunum]  otomatik: kutup → panorama, değilse kubbe
 * @param {number} [props.merkezAz]  panoramanın ortasındaki azimut (derece). 180 → eksen 0…360.
 *        Kesme (0/360 atlaması) bunun tam karşısındaki azimutta olur. Kubbeyi etkilemez.
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
  gorunum = 'otomatik',
  merkezAz = 180,
  className = '',
}) {
  const kapRef = useRef(null)
  const canvasRef = useRef(null)

  // Çizimin okuduğu her şey ref'te; böylece rAF döngüsü React render'ına bağlı kalmaz.
  const propsRef = useRef(null)
  propsRef.current = { horizon, epsilon, kutup, sunTrail, earthTrail, yaklasik, gorunum, merkezAz }

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

    if (kubbeMi(p.gorunum, p.kutup)) {
      kubbeCiz(ctx, { w, h, dpr, R, p, konum, fare: fareRef.current })
      return !konum || konum.bitti
    }

    const x0 = KENAR.sol
    const x1 = w - KENAR.sag
    const y0 = KENAR.ust
    const y1 = h - KENAR.alt
    // Ekran azimutu s ∈ [0, 360]: sol kenar = merkezin tam karşısı. x, s'ye göre
    // doğrusaldır; izlerdeki 0/360 kesmesi de s uzayında yapılır, yani kesme
    // gerçekte merkezin karşısındaki azimuta düşer.
    const sol = mod360((Number.isFinite(p.merkezAz) ? p.merkezAz : 180) - 180)
    const ekr = (az) => mod360(az - sol)
    const gercek = (sx) => mod360(sol + sx)
    const ilkIzgara = (30 - (sol % 30)) % 30 // gerçek azimutu 30'un katı olan ilk s
    const gx = (sx) => x0 + (sx / 360) * (x1 - x0)
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
    for (let sx = ilkIzgara; sx <= 360; sx += 30) {
      const x = Math.round(gx(sx)) + 0.5
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

    // 3. Ufuk çizgisi (yükseklik 0). Burada gökyüzü kısmı için çizilir; arazinin
    // önünde kalan kısmı 6. adımda dolgunun üstüne yeniden çizilir.
    const ufukCizgisi = () => {
      ctx.strokeStyle = saydam(R.metinSolgun, 0.55)
      ctx.lineWidth = 1
      ctx.beginPath()
      const ySifir = Math.round(gy(0)) + 0.5
      ctx.moveTo(x0, ySifir)
      ctx.lineTo(x1, ySifir)
      ctx.stroke()
    }
    ufukCizgisi()

    // 4. İzler
    const izEkr = (iz) => (iz ? iz.map(([a, h]) => [ekr(a), h]) : iz)
    izCiz(ctx, izEkr(p.sunTrail), R.gunes, gx, gy)
    izCiz(ctx, izEkr(p.earthTrail), R.iletisim, gx, gy)

    // 5. Cisimler — önce Güneş, sonra Dünya: Ay'dan bakınca Dünya önde durur
    const hz = p.horizon && p.horizon.length === 360 ? p.horizon : null
    if (konum) {
      cisimCiz(ctx, ekr(konum.sunAz), konum.sunAlt, GUNES_R, R.gunes, { parlama: true }, gx, gy)
      const halka = !dunyaBagli(hz, konum.earthAz, konum.earthAlt, p.epsilon)
      cisimCiz(ctx, ekr(konum.earthAz), konum.earthAlt, DUNYA_R, R.iletisim, { halka }, gx, gy)
    }

    if (hz) {
      // 6. Arazi: H(A)'nın altı dolu; cisimlerin ÜSTÜNE çizilir
      const profil = (ek_ = 0) => {
        for (let sx = 0; sx <= 360; sx++) {
          const x = gx(sx)
          const y = yKirp(gy(ufukOku(hz, gercek(sx)) + ek_))
          sx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
      }
      const araziYolu = () => {
        ctx.beginPath()
        profil()
        ctx.lineTo(x1, y1 + 2)
        ctx.lineTo(x0, y1 + 2)
        ctx.closePath()
      }
      araziYolu()
      ctx.fillStyle = saydam(R.yuzeyAcik, ARAZI_OPAK)
      ctx.fill()

      // Yükseklik 0 çizgisi arazinin yüzünde de okunsun
      ctx.save()
      araziYolu()
      ctx.clip()
      ufukCizgisi()
      ctx.restore()

      // Profilin üst kenarı
      ctx.strokeStyle = R.cizgi
      ctx.lineWidth = 1.5
      ctx.beginPath()
      profil()
      ctx.stroke()

      // 7. İletişim eşiği H(A) + ε
      ctx.strokeStyle = saydam(R.iletisim, 0.7)
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      profil(p.epsilon)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Fare: dikey kılavuz
    const fare = fareRef.current
    let fareAz = null
    if (fare && fare.x >= x0 && fare.x <= x1 && fare.y >= y0 && fare.y <= y1) {
      fareAz = gercek(((fare.x - x0) / (x1 - x0)) * 360)
      ctx.strokeStyle = saydam(R.metin, 0.18)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(Math.round(fare.x) + 0.5, y0)
      ctx.lineTo(Math.round(fare.x) + 0.5, y1)
      ctx.stroke()
    }

    ctx.restore() // kırpma bitti

    // 8. Eksen dışı cisimler: kenarda ok + etiket
    if (konum) {
      tasmaCiz(ctx, ekr(konum.sunAz), konum.sunAlt, R.gunes, ek, gx, y0, y1, x0, x1)
      tasmaCiz(ctx, ekr(konum.earthAz), konum.earthAlt, R.iletisim, ek, gx, y0, y1, x0, x1)
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
    const yonler = { 0: 'K', 90: 'D', 180: 'G', 270: 'B' }
    // Dar görünümde (karşılaştırma sütunları) derece etiketleri üst üste biner:
    // yalnızca yön harfleri yazılır
    const dereceSigar = (x1 - x0) / 12 >= 30
    for (let sx = ilkIzgara; sx <= 360; sx += 30) {
      const az = Math.round(gercek(sx)) % 360
      const yon = yonler[az]
      if (!yon && !dereceSigar) continue
      if (yon) {
        ctx.font = '500 11px Inter, ui-sans-serif, system-ui, sans-serif'
        ctx.fillStyle = R.metin
        ctx.fillText(yon, gx(sx), y1 + 7)
      } else {
        ctx.font = YAZI_KUCUK
        ctx.fillStyle = saydam(R.metinSolgun, 0.7)
        ctx.fillText(`${az}°`, gx(sx), y1 + 8)
      }
    }

    // 9. Açıklama (sağ üst)
    aciklamaCiz(ctx, R, x1, y0)

    // 10. Yaklaşık veri uyarısı (sol üst)
    if (p.yaklasik) rozetCiz(ctx, R, x0, y0)

    // Fare etiketi: o azimuttaki ufuk yüksekliği
    if (fareAz !== null && hz) {
      const H = ufukOku(hz, fareAz)
      const Hy = Math.round(H * 10) / 10 // "−0.0°" çıkmasın
      const metin = `Az ${Math.round(fareAz) % 360}° · ufuk ${Hy >= 0 ? '+' : '−'}${Math.abs(Hy).toFixed(1)}°`
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
  }, [horizon, kutup, gorunum, merkezAz])

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

function cisimCiz(ctx, az, alt, r, renk, secenek, gx, gy) {
  // 0°/360° kenarındaki cisim yarım görünmesin: karşı kenara da çiz
  const xler = [gx(az)]
  if (az < 3) xler.push(gx(az + 360))
  if (az > 357) xler.push(gx(az - 360))
  const y = gy(alt)
  for (const x of xler) diskCiz(ctx, x, y, r, renk, 1, secenek)
}

/**
 * Daire. parlama: etrafında yumuşak ışık (Güneş). halka: içi boş, yalnızca
 * HALKA_KALINLIK kenar (iletişim yokken Dünya); dış çapı dolu diskle aynı.
 */
function diskCiz(ctx, x, y, r, renk, opak, { parlama = false, halka = false } = {}) {
  if (parlama) {
    const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 3.2)
    g.addColorStop(0, saydam(renk, 0.45 * opak))
    g.addColorStop(1, saydam(renk, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r * 3.2, 0, Math.PI * 2)
    ctx.fill()
  }
  if (halka) {
    ctx.strokeStyle = saydam(renk, opak)
    ctx.lineWidth = HALKA_KALINLIK
    ctx.beginPath()
    ctx.arc(x, y, r - HALKA_KALINLIK / 2, 0, Math.PI * 2)
    ctx.stroke()
    return
  }
  ctx.fillStyle = saydam(renk, opak)
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
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

/** Sol üstte "Arazi hesaba katılmadı" rozeti (iki kipte de aynı yerde). */
function rozetCiz(ctx, R, x0, y0) {
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

// --- Gök kubbesi --------------------------------------------------------------
// Yukarı bakan gözlemcinin gördüğü gökyüzü haritası: merkez = tepe noktası
// (90°), dış kenar = altMin. Kuzey yukarıda, Doğu solda, Batı sağda.
//
// Dış kenar 0° değil altMin'dir: kutup alanında −15° (panorama ekseniyle aynı),
// diğerlerinde −5°. Böylece ufka yakın, arazinin üstündeki ama 0°'nin altındaki
// cisimler kubbenin içinde görünür. r = Rk · (90 − alt) / (90 − altMin); altMin
// yalnızca kutup bayrağına bağlıdır, zamanla oynamaz (CLAUDE.md bölüm 11).
// 0° çemberi ayrıca ince bir çizgi ve "0°" etiketiyle gösterilir.

const KUBBE_PAY = 40 // kenar dışındaki etiketler için boşluk (px)
const KUBBE_DIS_R = 5 // ufkun altındaki cisim için kenar dışı nokta yarıçapı
const KUBBE_DIS_OPAK = 0.4

/** Kubbenin dış kenarındaki yükseklik (derece). */
export const kubbeAltMin = (kutup) => (kutup ? -15 : -5)

/** gorunum + kutup → kubbe mi çizilecek? */
export function kubbeMi(gorunum, kutup) {
  if (gorunum === 'kubbe') return true
  if (gorunum === 'panorama') return false
  return !kutup
}

/** Yükseklik → merkezden uzaklık (px). alt = altMin → Rk; altMin'in altı r > Rk. */
const kubbeR = (g, alt) => (g.Rk * (90 - alt)) / (90 - g.altMin)

/** Yükseklik/azimut → ekran. */
function kubbeXY(g, az, alt) {
  const r = kubbeR(g, alt)
  const a = az * DERECE
  return [g.cx - r * Math.sin(a), g.cy - r * Math.cos(a)]
}

/** Kenara göre yarıçap ile ekran noktası (kenar dışı öğeler için). */
function kubbeKenarXY(g, az, r) {
  const a = az * DERECE
  return [g.cx - r * Math.sin(a), g.cy - r * Math.cos(a)]
}

const isaretli1 = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}°`

/** H(A) gibi 360 elemanlı bir profilden kapalı eğri çizer (alt = fn(az)). */
function kapaliEgri(ctx, g, fn) {
  for (let az = 0; az < 360; az++) {
    const [x, y] = kubbeXY(g, az, fn(az))
    az === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function kubbeCiz(ctx, { w, h, dpr, R, p, konum, fare }) {
  const g = { cx: w / 2, cy: h / 2, Rk: Math.max(10, Math.min(w, h) / 2 - KUBBE_PAY), altMin: kubbeAltMin(p.kutup) }
  const { cx, cy, Rk, altMin } = g
  const hz = p.horizon && p.horizon.length === 360 ? p.horizon : null
  const TAM = Math.PI * 2

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = R.zemin
  ctx.fillRect(0, 0, w, h)

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, Rk + 0.5, 0, TAM)
  ctx.clip()

  // Izgara: 30° ve 60° yükseklik çemberleri, her 30° azimutta merkeze çizgi
  ctx.strokeStyle = R.cizgi
  ctx.lineWidth = 1
  ctx.beginPath()
  for (const alt of [30, 60]) {
    const r = kubbeR(g, alt)
    ctx.moveTo(cx + r, cy)
    ctx.arc(cx, cy, r, 0, TAM)
  }
  for (let az = 0; az < 360; az += 30) {
    const [x, y] = kubbeKenarXY(g, az, Rk)
    ctx.moveTo(cx, cy)
    ctx.lineTo(x, y)
  }
  ctx.stroke()

  // İzler (altMin'in altındaki parçalar çizilmez)
  kubbeIzCiz(ctx, g, p.sunTrail, R.gunes)
  kubbeIzCiz(ctx, g, p.earthTrail, R.iletisim)

  // altMin'in üstündeki cisimler, kubbenin içinde (kenar çemberiyle kırpılır).
  // Önce Güneş, sonra Dünya: Ay'dan bakınca Dünya önde durur
  // Kubbe istisnası: f = 0 iken Güneş %25 opak (dosya başındaki yoruma bakın)
  const sunOpak = konum && !gunesGorunur(hz, konum.sunAz, konum.sunAlt) ? KUBBE_GOLGE_OPAK : 1
  const dunyaHalka = konum ? !dunyaBagli(hz, konum.earthAz, konum.earthAlt, p.epsilon) : false
  if (konum) {
    if (konum.sunAlt >= altMin) diskCiz(ctx, ...kubbeXY(g, konum.sunAz, konum.sunAlt), GUNES_R, R.gunes, sunOpak, { parlama: true })
    if (konum.earthAlt >= altMin) diskCiz(ctx, ...kubbeXY(g, konum.earthAz, konum.earthAlt), DUNYA_R, R.iletisim, 1, { halka: dunyaHalka })
  }

  if (hz) {
    // Arazi halkası: dış kenar (altMin) ile H(A) arası dolu; altMin'in altındaki
    // H kenarda kalır. İçerideki cisimlerin ÜSTÜNE çizilir.
    const profil = (az) => Math.max(hz[az], altMin)
    ctx.beginPath()
    ctx.arc(cx, cy, Rk, 0, TAM)
    kapaliEgri(ctx, g, profil)
    ctx.fillStyle = saydam(R.yuzeyAcik, ARAZI_OPAK)
    ctx.fill('evenodd')

    // Yükseklik 0 çemberi arazinin yüzünde de okunsun (panoramadaki gibi)
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, Rk, 0, TAM)
    kapaliEgri(ctx, g, profil)
    ctx.clip('evenodd')
    sifirCemberi(ctx, g, R)
    ctx.restore()

    ctx.strokeStyle = R.cizgi
    ctx.lineWidth = 1.5
    ctx.beginPath()
    kapaliEgri(ctx, g, profil)
    ctx.stroke()

    // İletişim eşiği H(A) + ε
    ctx.strokeStyle = saydam(R.iletisim, 0.7)
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    kapaliEgri(ctx, g, (az) => Math.max(hz[az] + p.epsilon, altMin))
    ctx.stroke()
    ctx.setLineDash([])
  }

  ctx.restore()

  // Yükseklik 0 çemberi (gökyüzü kısmı; arazinin üstündeki kısmı yukarıda)
  sifirCemberi(ctx, g, R)
  ctx.font = YAZI_KUCUK
  ctx.fillStyle = R.metinSolgun
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  {
    // Etiket güneyde (alt), çemberin hemen içinde, G çizgisinin sağında.
    // Kutup alanlarında Dünya hep kuzeyde durur; burada cisimle çakışması az.
    const [x, y] = kubbeKenarXY(g, 180, kubbeR(g, 0))
    ctx.fillText('0°', x + 4, y - 3)
  }

  // Dış kenar (altMin)
  ctx.strokeStyle = R.cizgi
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(cx, cy, Rk, 0, TAM)
  ctx.stroke()

  // Kenar dışı: 30° işaretleri ve K / D / G / B
  ctx.strokeStyle = saydam(R.metinSolgun, 0.5)
  ctx.beginPath()
  for (let az = 0; az < 360; az += 30) {
    const [xa, ya] = kubbeKenarXY(g, az, Rk + 1)
    const [xb, yb] = kubbeKenarXY(g, az, Rk + (az % 90 === 0 ? 8 : 5))
    ctx.moveTo(xa, ya)
    ctx.lineTo(xb, yb)
  }
  ctx.stroke()
  ctx.font = '500 11px Inter, ui-sans-serif, system-ui, sans-serif'
  ctx.fillStyle = R.metin
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const [az, yon] of [[0, 'K'], [90, 'D'], [180, 'G'], [270, 'B']]) {
    const [x, y] = kubbeKenarXY(g, az, Rk + 22)
    ctx.fillText(yon, x, y + 0.5)
  }

  // altMin'in altındaki cisimler: kenarın hemen dışında işaret + yükseklik etiketi
  if (konum) {
    if (konum.sunAlt < altMin) kubbeDisIsaret(ctx, g, konum.sunAz, konum.sunAlt, R.gunes)
    if (konum.earthAlt < altMin) kubbeDisIsaret(ctx, g, konum.earthAz, konum.earthAlt, R.iletisim, dunyaHalka)
  }

  // Lejant ve yaklaşık uyarısı panoramadaki yerlerinde
  aciklamaCiz(ctx, R, w - KENAR.sag, KENAR.ust)
  if (p.yaklasik) rozetCiz(ctx, R, KENAR.sol, KENAR.ust)

  // Fare: imlecin altındaki noktanın azimut ve yüksekliği
  if (fare) {
    const dx = fare.x - cx
    const dy = fare.y - cy
    const r = Math.hypot(dx, dy)
    if (r <= Rk) {
      const alt = 90 - ((90 - altMin) * r) / Rk
      const az = mod360(Math.atan2(-dx, -dy) / DERECE)
      const metin = `Az ${Math.round(az) % 360}° · yük. ${isaretli1(Math.round(alt * 10) / 10)}`
      ctx.font = YAZI
      const gen = ctx.measureText(metin).width + 14
      let lx = fare.x + 12
      if (lx + gen > w - 4) lx = fare.x - 12 - gen
      const ly = Math.max(4, Math.min(h - 24, fare.y - 30))
      ctx.fillStyle = saydam(R.zemin, 0.85)
      ctx.strokeStyle = R.cizgi
      ctx.lineWidth = 1
      yuvarlakDikdortgen(ctx, lx, ly, gen, 20, 4)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = R.metin
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(metin, lx + 7, ly + 10.5)
    }
  }
}

/** Yükseklik 0 çemberi: ince ama belirgin. */
function sifirCemberi(ctx, g, R) {
  ctx.strokeStyle = saydam(R.metinSolgun, 0.7)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(g.cx, g.cy, kubbeR(g, 0), 0, Math.PI * 2)
  ctx.stroke()
}

/** altMin'in altındaki cisim: kenarın hemen dışında küçük soluk nokta + yükseklik etiketi. */
function kubbeDisIsaret(ctx, g, az, alt, renk, halka = false) {
  const [x, y] = kubbeKenarXY(g, az, g.Rk + 6 + KUBBE_DIS_R)
  diskCiz(ctx, x, y, KUBBE_DIS_R, renk, KUBBE_DIS_OPAK, { halka })
  ctx.font = '500 10px Inter, ui-sans-serif, system-ui, sans-serif'
  ctx.fillStyle = saydam(renk, 0.8)
  ctx.textBaseline = 'middle'
  const sag = x >= g.cx
  ctx.textAlign = sag ? 'left' : 'right'
  // Doğu/Batı yakınında etiket "D"/"B" harfinin üstüne binmesin: harfin ötesine kaydır
  const harfPayi = Math.abs(Math.sin(az * DERECE)) > 0.97 ? 16 : 0
  const metin = isaretli1(Math.round(alt * 10) / 10)
  const tx = x + (sag ? 1 : -1) * (KUBBE_DIS_R + 4 + harfPayi)
  const gen = ctx.measureText(metin).width
  if (sag ? tx + gen > g.cx * 2 - 2 : tx - gen < 2) {
    // Dar tuvalde yana sığmıyor: işaretin altına (kubbenin alt yarısında üstüne) yaz
    ctx.textAlign = 'center'
    ctx.fillText(metin, x, y + (y >= g.cy ? -1 : 1) * (KUBBE_DIS_R + 8))
    return
  }
  ctx.fillText(metin, tx, y + 0.5)
}

/**
 * Kutupsal koordinatta sürekli iz. 0°/360° kesmesine gerek yok; altMin'in
 * altına inen segment altMin'de kesilir.
 */
function kubbeIzCiz(ctx, g, iz, renk) {
  if (!iz || iz.length < 2) return
  const n = iz.length
  ctx.lineCap = 'round'
  for (let i = 1; i < n; i++) {
    let [azA, altA] = iz[i - 1]
    let [azB, altB] = iz[i]
    if (![azA, altA, azB, altB].every(Number.isFinite)) continue
    const m = g.altMin
    if (altA < m && altB < m) continue
    if (altA < m || altB < m) {
      // altMin kesişimi; azimut kısa yoldan ara değer
      const k = (altA - m) / (altA - altB)
      const az0 = azA + donguselFark(azA, azB) * k
      if (altA < m) [azA, altA] = [az0, m]
      else [azB, altB] = [az0, m]
    }
    const u = i / (n - 1)
    ctx.strokeStyle = saydam(renk, 0.05 + 0.5 * u)
    ctx.lineWidth = 0.5 + 2 * u
    const [xa, ya] = kubbeXY(g, azA, altA)
    const [xb, yb] = kubbeXY(g, azB, altB)
    ctx.beginPath()
    ctx.moveTo(xa, ya)
    ctx.lineTo(xb, yb)
    ctx.stroke()
  }
  ctx.lineCap = 'butt'
}
