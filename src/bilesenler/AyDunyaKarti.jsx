// Ay–Dünya karşılaştırma kartı — seçili alanın bir yıllık verisinden
// hesaplanan, çocuğun anlayacağı kısa bilgiler.

import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { KUTUP_SINIRI } from '../core/sabitler.js'
import { useDil } from '../dil/index.js'
import { useEfemeris, useSeciliAlanVerisi } from '../durum/store.js'

const R_DUNYA_KM = 6371.0 // ortalama yarıçap
const R_GUNES_KM = 695700
const AB_KM = 149597870.7

/**
 * Ay'dan görünen açısal çaplar (°), efemerisin yıllık ortalama uzaklıklarından:
 * Dünya 2·asin(R⊕ / d⊕), Güneş 2·asin(R☉ / d☉).
 */
export function acisalCaplar(efemeris) {
  let dDunya = 0
  let dGunes = 0
  const n = efemeris.earth_dist_km.length
  for (let i = 0; i < n; i++) {
    dDunya += efemeris.earth_dist_km[i]
    dGunes += efemeris.sun_au[i] * AB_KM
  }
  const derece = (r, d) => (2 * Math.asin(r / d) * 180) / Math.PI
  return { dunya: derece(R_DUNYA_KM, dDunya / n), gunes: derece(R_GUNES_KM, dGunes / n) }
}

function enKucukEnBuyuk(dizi) {
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < dizi.length; i++) {
    const v = dizi[i]
    if (v < min) min = v
    if (v > max) max = v
  }
  return { min, max }
}

const bir = (v) => (Math.round(v * 10) / 10).toFixed(1)

/**
 * Alan verisinden kartın cümleleri.
 * @param t  useDil().t (sayılar nokta ondalıklı, iki dilde aynı)
 */
export function ayDunyaBilgileri(alan, caplar, t) {
  const gunes = enKucukEnBuyuk(alan.sun_alt)
  const dunya = enKucukEnBuyuk(alan.earth_alt)
  const bilgiler = [
    {
      simge: '🌗',
      metin: t('ayDunya.gun'),
    },
    {
      simge: '☀',
      metin: t('ayDunya.gunesYukselir', { derece: bir(gunes.max) }),
    },
    dunya.max < 0
      ? {
          simge: '🌍',
          metin: t('ayDunya.dunyaGorunmez'),
        }
      : {
          simge: '🌍',
          metin: t('ayDunya.dunyaSalinir', { derece: bir((dunya.max - dunya.min) / 2) }),
        },
  ]
  if (caplar) {
    const oran = caplar.dunya / caplar.gunes
    bilgiler.push({
      simge: '🔭',
      metin: t('ayDunya.buyukluk', { oran: Math.round(oran), dunya: caplar.dunya.toFixed(1), gunes: caplar.gunes.toFixed(2) }),
    })
  }
  if (Math.abs(alan.lat) >= KUTUP_SINIRI) {
    bilgiler.push({
      simge: '⛰',
      metin: t('ayDunya.tepe'),
    })
  }
  return bilgiler
}

export default function AyDunyaKarti({ className = '' }) {
  const { alan } = useSeciliAlanVerisi()
  const { t } = useDil()
  const { efemeris } = useEfemeris(true)
  const caplar = useMemo(() => (efemeris?.earth_dist_km ? acisalCaplar(efemeris) : null), [efemeris])
  const bilgiler = useMemo(() => (alan ? ayDunyaBilgileri(alan, caplar, t) : null), [alan, caplar, t])

  return (
    <section className={`rounded-2xl border border-cizgi bg-yuzey px-6 py-6 sm:px-8 ${className}`}>
      <h2 className="text-lg font-light tracking-wide text-metin">{t('ayDunya.baslik')}</h2>
      <AnimatePresence mode="wait" initial={false}>
        {bilgiler && (
          <motion.ul
            key={alan.site}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-4 flex flex-col gap-4"
          >
            {bilgiler.map((b) => (
              <li key={b.metin} className="flex gap-4 text-[15px] leading-relaxed text-metin/90">
                <span aria-hidden="true" className="w-6 shrink-0 text-center text-lg leading-7">
                  {b.simge}
                </span>
                <span>{b.metin}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  )
}
