// Tıklanan ML kraterinin kartı: çap, ML güven skoru, bu çaptaki tespitlerin
// isabet oranı (kutup testi), hücre tehlikesi ve "buraya inersen" başarı
// olasılığı (paketin landingNodes + landingOdds'u, işçide; rehber §6, §9).
//
// Kart kraterin yanında durur: KartIzdusum (Canvas içinde) her karede kraterin
// ekran konumunu yazar; ekranın sağ yarısındaysa kart sola geçer, kraterin
// üstüne binmez. Boşa tıklama (Canvas onPointerMissed) ya da ESC kapatır.

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { Vector3 } from 'three'
import { INIS_VARSAYILAN } from './inisOlasiligi.js'
import { guvenRengi, kraterHucresi, kraterIsabeti } from './MlKatmanlari.jsx'

const v = new Vector3()
const PAY = 18 // kraterle kart arası (px)

/** Canvas içinde: kraterin ekran konumunu kart öğesine yazar. */
export function KartIzdusum({ nokta, kart }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useFrame(() => {
    const el = kart.current
    if (!el || !nokta) return
    v.set(nokta[0], nokta[1], nokta[2]).project(camera)
    const gorunur = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1
    el.style.visibility = gorunur ? 'visible' : 'hidden'
    if (!gorunur) return
    const x = ((v.x + 1) / 2) * size.width
    const y = ((1 - v.y) / 2) * size.height
    const w = el.offsetWidth
    const h = el.offsetHeight
    const sola = x > size.width / 2
    const kx = Math.max(8, Math.min(size.width - w - 8, sola ? x - PAY - w : x + PAY))
    const ky = Math.max(8, Math.min(size.height - h - 8, y - h / 2))
    el.style.transform = `translate(${kx.toFixed(1)}px, ${ky.toFixed(1)}px)`
  })
  return null
}

/** "%53'ü", "%62'si" — yüzdenin üçüncü tekil iyelik eki. */
function yuzdeIyelik(n) {
  const ek = n === 100 ? 'ü' : n % 10 ? ['', 'i', 'si', 'ü', 'ü', 'i', 'sı', 'si', 'i', 'u'][n % 10] : { 1: 'u', 2: 'si', 3: 'u', 4: 'ı', 5: 'si', 6: 'ı', 7: 'i', 8: 'i', 9: 'ı', 0: 'ı' }[Math.floor(n / 10)]
  return `%${n}'${ek}`
}

const NEDEN = {
  ground: 'krater',
  slope: 'eğim',
  dark: 'uzun karanlık',
  noEarth: 'iletişim kesintisi',
  outside: 'ızgara dışına düşme',
}

/** reasons + outside'tan en büyük payı (başarısızlığa en çok katkı). */
function enBuyukNeden(sonuc) {
  const adaylar = Object.entries({ ...sonuc.reasons, outside: sonuc.outside }).filter(([, p]) => p > 0.005)
  if (!adaylar.length) return null
  adaylar.sort((a, b) => b[1] - a[1])
  return { ad: NEDEN[adaylar[0][0]] ?? adaylar[0][0], pay: adaylar[0][1] }
}

/**
 * @param {Array} props.krater  [doğu, kuzey, D, güven]
 * @param {object} props.veri   mlcraters dosyası (node, accuracy)
 * @param {string} props.izgara ızgara dosya kökü (izgara_<ad>)
 * @param {number} props.tL, props.D  görev penceresi (depo)
 * @param {object} props.inis   useInisOlasiligi()
 */
export default function KraterKarti({ kartRef, krater, veri, izgara, tL, D, inis, gunBicim, onKapat }) {
  const [e, n, cap, guven] = krater
  const hucre = kraterHucresi(veri.node, krater)
  const g = hucre ? veri.node.haz_frac[hucre.k] : undefined
  const isabet = kraterIsabeti(veri, cap)
  const pencereTasar = tL + D * 24 > 8760

  const [sonuc, setSonuc] = useState({ anahtar: null, deger: null, hata: null })
  const anahtar = hucre ? `${izgara}|${tL}|${D}|${hucre.i},${hucre.j}` : null
  useEffect(() => {
    if (!anahtar || pencereTasar) return
    let iptal = false
    inis.hesapla(izgara, tL, D, { i: hucre.i, j: hucre.j }, veri.node.haz_frac).then(
      (deger) => !iptal && setSonuc({ anahtar, deger, hata: null }),
      (hata) => !iptal && setSonuc({ anahtar, deger: null, hata }),
    )
    return () => {
      iptal = true
    }
  }, [anahtar]) // eslint-disable-line react-hooks/exhaustive-deps
  const guncel = sonuc.anahtar === anahtar ? sonuc : { deger: null, hata: null }
  const neden = guncel.deger ? enBuyukNeden(guncel.deger) : null
  const renk = `rgb(${guvenRengi(guven).join(',')})`

  return (
    <div
      ref={kartRef}
      data-krater-kart=""
      role="dialog"
      aria-label="Krater bilgisi"
      className="pointer-events-auto absolute left-0 top-0 z-20 w-[248px] rounded-lg border border-cizgi bg-zemin/95 px-3 py-2.5 backdrop-blur-sm text-xs leading-snug text-metin shadow-lg"
      style={{ visibility: 'hidden' }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm">
          Krater · D ≈ {cap.toFixed(1)} m
        </p>
        <button
          type="button"
          onClick={onKapat}
          aria-label="Kapat (ESC)"
          className="-mr-1 -mt-0.5 rounded px-1 text-metin-solgun hover:text-metin focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60"
        >
          ×
        </button>
      </div>

      <p className="mt-1.5 flex items-center justify-between tabular-nums">
        <span>ML güven skoru: {guven.toFixed(2)}</span>
      </p>
      <div className="mt-1 h-1.5 w-full rounded-full bg-cizgi" aria-hidden="true">
        <div className="h-full rounded-full" style={{ width: `${Math.round(guven * 100)}%`, background: renk }} />
      </div>
      {isabet != null && (
        <p className="mt-1.5 text-metin-solgun">
          Bu boyuttaki tespitlerin ~{yuzdeIyelik(Math.round(isabet * 100))} gerçek krater (kutup testi, {cap < 20 ? '10–20 m' : '≥ 20 m'})
        </p>
      )}

      <p className="mt-1.5 tabular-nums">
        Hücre tehlikesi{' '}
        {g === undefined ? '—' : g === null ? <span className="text-metin-solgun">bilinmiyor — gölge</span> : <>g = {g.toFixed(2)}</>}
      </p>

      <div className="mt-1.5 border-t border-cizgi pt-1.5" data-inis-sonucu="">
        {pencereTasar ? (
          <p className="text-metin-solgun">Görev penceresi 2027 verisinin dışına taşıyor.</p>
        ) : guncel.hata ? (
          <p className="text-uyari">Hesaplanamadı: {guncel.hata.message}</p>
        ) : guncel.deger ? (
          <>
            <p className="text-sm">
              Buraya inersen: başarı <span className="tabular-nums text-gunes">%{(100 * guncel.deger.pLow).toFixed(1)}</span>
            </p>
            {neden && (
              <p className="text-metin-solgun">
                başarısızlığın çoğu: {neden.ad} (%{Math.round(100 * neden.pay)})
              </p>
            )}
          </>
        ) : (
          <p className="text-metin-solgun">Buraya inersen: başarı hesaplanıyor…</p>
        )}
        <p className="mt-0.5 text-[10px] text-metin-solgun/80">
          Hedef bu 100 m hücre; {gunBicim} + {D} gün, σ {INIS_VARSAYILAN.sigmaM} m, eğim ≤ {INIS_VARSAYILAN.slopeMax}°, batarya{' '}
          {INIS_VARSAYILAN.batteryH} sa, tampon {INIS_VARSAYILAN.bufferH} sa, ML krater riski dahil.
        </p>
      </div>

      <p className="mt-1.5 text-[10px] text-metin-solgun/80">Güven skoru olasılık değildir; model kalibre edilmedi.</p>
    </div>
  )
}
