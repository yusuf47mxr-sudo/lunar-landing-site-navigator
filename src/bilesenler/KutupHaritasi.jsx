// Kutup haritası — güney kutbu merkezli stereografik harita, 75°G'ye kadar.
// 0° boylam yukarıda (Dünya'ya bakan taraf), 90°D sağda.
// Noktaya tıklamak o alanı seçer; boş yere tıklamak orayı özel nokta yapar.

import { useMemo, useRef, useState } from 'react'
import { geoStereographic } from 'd3-geo'
import { useShallow } from 'zustand/react/shallow'
import { KUTUP_SINIRI } from '../core/sabitler.js'
import { useDil } from '../dil/index.js'
import { useBolgeler, useDurum } from '../durum/store.js'

const BOYUT = 340 // viewBox kenarı; SVG sütun genişliğine ölçeklenir
const ORTA = BOYUT / 2
const YARICAP = 138 // 75°G halkasının yarıçapı
const YAKALAMA = 10 // imleç bir noktaya bu kadar yakınsa o nokta sayılır (viewBox birimi)
const DERECE = Math.PI / 180

// Stereografik: r = ölçek · tan(c / 2), c = kutuptan açısal uzaklık
const projeksiyon = geoStereographic()
  .rotate([0, 90, 0])
  .translate([ORTA, ORTA])
  .scale(YARICAP / Math.tan(((90 - KUTUP_SINIRI) / 2) * DERECE))

const halkaR = (enlem) => ORTA - projeksiyon([0, enlem])[1]
const HALKALAR = [-80, -85].map((enlem) => ({ enlem, r: halkaR(enlem) }))
const MERIDYENLER = Array.from({ length: 12 }, (_, k) => projeksiyon([k * 30, -KUTUP_SINIRI]))
// metin: t → gösterilen yazı (yön harfleri dile göre: 90°D / 90°E)
const YON_ETIKETLERI = [
  { anahtar: 'kuzey', metin: (t) => t('kutupHaritasi.dunyaYonu'), x: ORTA, y: ORTA - YARICAP - 10, hiza: 'middle' },
  { anahtar: 'dogu', metin: (t) => `90°${t('ortak.yonler.D')}`, x: ORTA + YARICAP + 6, y: ORTA, hiza: 'start' },
  { anahtar: 'guney', metin: () => '180°', x: ORTA, y: ORTA + YARICAP + 11, hiza: 'middle' },
  { anahtar: 'bati', metin: (t) => `90°${t('ortak.yonler.B')}`, x: ORTA - YARICAP - 6, y: ORTA, hiza: 'end' },
]

const iki = (v) => Math.round(v * 100) / 100

export default function KutupHaritasi({ className = '' }) {
  const { t, ad } = useDil()
  const { bolgeler } = useBolgeler()
  const { seciliAlan, ozelNokta, alanSec, ozelNoktaSec } = useDurum(
    useShallow((s) => ({
      seciliAlan: s.seciliAlan,
      ozelNokta: s.ozelNokta,
      alanSec: s.alanSec,
      ozelNoktaSec: s.ozelNoktaSec,
    })),
  )
  const svgRef = useRef(null)
  const [uzerinde, setUzerinde] = useState(null) // fare altındaki alan adı
  const [icinde, setIcinde] = useState(false) // imleç harita dairesinin içinde mi

  const noktalar = useMemo(
    () =>
      (bolgeler ?? [])
        .filter((b) => b.lat <= -KUTUP_SINIRI)
        .map((b) => {
          const [x, y] = projeksiyon([b.lon, b.lat])
          return { site: b.site, x, y }
        }),
    [bolgeler],
  )

  /** Fare olayı → viewBox koordinatı */
  const konum = (e) => {
    const r = svgRef.current.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * BOYUT, ((e.clientY - r.top) / r.height) * BOYUT]
  }
  /** İmlece en yakın alan (YAKALAMA içinde); yoksa null. Üst üste binen noktaları ayırır. */
  const enYakin = (x, y) => {
    let en = null
    let enUzaklik = YAKALAMA
    for (const n of noktalar) {
      const u = Math.hypot(n.x - x, n.y - y)
      if (u < enUzaklik) {
        enUzaklik = u
        en = n
      }
    }
    return en
  }
  const daireIcinde = (x, y) => Math.hypot(x - ORTA, y - ORTA) <= YARICAP

  const fareOynadi = (e) => {
    const [x, y] = konum(e)
    setUzerinde(enYakin(x, y)?.site ?? null)
    setIcinde(daireIcinde(x, y))
  }
  const fareCikti = () => {
    setUzerinde(null)
    setIcinde(false)
  }
  const tiklandi = (e) => {
    const [x, y] = konum(e)
    const n = enYakin(x, y)
    if (n) return alanSec(n.site)
    if (!daireIcinde(x, y)) return
    const [lon, lat] = projeksiyon.invert([x, y])
    ozelNoktaSec({ lat: Math.max(-90, iki(lat)), lon: iki(((lon % 360) + 360) % 360) % 360 })
  }

  // Haritada gösterilemeyen seçim için not
  const seciliEnlem = ozelNokta ? ozelNokta.lat : bolgeler?.find((b) => b.site === seciliAlan)?.lat
  const not =
    seciliEnlem == null || seciliEnlem <= -KUTUP_SINIRI
      ? null
      : seciliEnlem >= KUTUP_SINIRI
        ? t('kutupHaritasi.kuzeyde')
        : t('kutupHaritasi.kutupDisi')

  const seciliNokta = ozelNokta ? null : noktalar.find((n) => n.site === seciliAlan)
  const uzerindeNokta = noktalar.find((n) => n.site === uzerinde)
  const ozelXY = ozelNokta && ozelNokta.lat <= -KUTUP_SINIRI ? projeksiyon([ozelNokta.lon, ozelNokta.lat]) : null

  return (
    <div className={className}>
      <p className="mb-1 min-h-[1.25rem] text-xs text-metin-solgun" aria-live="polite">
        {not}
      </p>
      {/* Tek sütunda (dar ekran) harita sayfayı kaplamasın */}
      <div className="relative mx-auto max-w-[420px]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${BOYUT} ${BOYUT}`}
          role="img"
          aria-label={t('kutupHaritasi.aria', { enlem: KUTUP_SINIRI })}
          className="block aspect-square w-full select-none"
          style={{ cursor: uzerinde ? 'pointer' : icinde ? 'crosshair' : 'default' }}
          onPointerMove={fareOynadi}
          onPointerLeave={fareCikti}
          onClick={tiklandi}
        >
          {/* Izgara */}
          <g fill="none" stroke="var(--cizgi)" strokeWidth="1">
            <circle cx={ORTA} cy={ORTA} r={YARICAP} fill="var(--zemin)" strokeWidth="1.5" />
            {HALKALAR.map((h) => (
              <circle key={h.enlem} cx={ORTA} cy={ORTA} r={h.r} />
            ))}
            {MERIDYENLER.map(([x, y], k) => (
              <line key={k} x1={ORTA} y1={ORTA} x2={x} y2={y} />
            ))}
          </g>
          <g fill="var(--metin-solgun)" fontSize="10" style={{ pointerEvents: 'none' }}>
            {YON_ETIKETLERI.map((e) => (
              <text key={e.anahtar} x={e.x} y={e.y} textAnchor={e.hiza} dominantBaseline="middle">
                {e.metin(t)}
              </text>
            ))}
            {/* Enlem halkalarının adları, 135° meridyeni boyunca */}
            {[...HALKALAR, { enlem: -KUTUP_SINIRI, r: YARICAP }].map((h) => {
              const [x, y] = projeksiyon([135, h.enlem])
              return (
                <text key={h.enlem} x={x + 3} y={y - 4} fontSize="9" opacity="0.8">
                  {-h.enlem}°{t('ortak.yonler.G')}
                </text>
              )
            })}
          </g>

          {/* Alanlar: önce diğerleri, en üstte seçili olan */}
          <g style={{ pointerEvents: 'none' }}>
            {noktalar.map((n) =>
              n === seciliNokta ? null : (
                <circle
                  key={n.site}
                  cx={n.x}
                  cy={n.y}
                  r={n.site === uzerinde ? 4.5 : 3}
                  fill="var(--metin)"
                  opacity={n.site === uzerinde ? 1 : 0.75}
                  style={{ transition: 'r 150ms, opacity 150ms' }}
                />
              ),
            )}
            {seciliNokta && (
              <>
                <circle cx={seciliNokta.x} cy={seciliNokta.y} r="11" fill="var(--gunes)" opacity="0.18" />
                <circle
                  cx={seciliNokta.x}
                  cy={seciliNokta.y}
                  r="6"
                  fill="var(--gunes)"
                  stroke="var(--zemin)"
                  strokeWidth="1.5"
                />
              </>
            )}
            {ozelXY && (
              <path
                d={`M${ozelXY[0] - 6},${ozelXY[1]}h12M${ozelXY[0]},${ozelXY[1] - 6}v12`}
                stroke="var(--uyari)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </g>
        </svg>

        {uzerindeNokta && (
          <span
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border border-cizgi bg-yuzey-acik px-2 py-1 text-xs text-metin"
            style={{
              left: `${(uzerindeNokta.x / BOYUT) * 100}%`,
              top: `${(uzerindeNokta.y / BOYUT) * 100}%`,
              transform: 'translate(-50%, calc(-100% - 10px))',
            }}
          >
            {ad(uzerindeNokta.site)}
          </span>
        )}
      </div>
    </div>
  )
}
