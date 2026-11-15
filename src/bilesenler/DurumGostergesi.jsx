// Durum göstergesi — Güneş ve iletişim için iki büyük rozet.
// kip='sozel'  : sadece durum cümlesi (Temel)
// kip='sayisal': daha küçük, hep yan yana; altında yükseklik açısı da yazar (Orta, İleri)

import { AnimatePresence, motion } from 'framer-motion'
import { dereceBicimle as derece } from '../core/hesap.js'
import { useDil } from '../dil/index.js'
import { useAnlikDurum, useGorunurluk } from '../durum/store.js'

// Framer Motion renkleri ara değerleyebilsin diye hepsi rgba
const GRI = { zemin: 'rgba(22, 32, 58, 0.55)', kenar: 'rgba(31, 43, 69, 1)', metin: 'rgba(138, 151, 172, 1)', nokta: 'rgba(138, 151, 172, 0.5)' }
const STIL = {
  gunesGorunur: { zemin: 'rgba(245, 165, 36, 0.13)', kenar: 'rgba(245, 165, 36, 0.9)', metin: 'rgba(245, 165, 36, 1)', nokta: 'rgba(245, 165, 36, 1)' },
  gunesKismen: { zemin: 'rgba(107, 74, 18, 0.28)', kenar: 'rgba(107, 74, 18, 1)', metin: 'rgba(245, 165, 36, 0.62)', nokta: 'rgba(245, 165, 36, 0.5)' },
  golgede: GRI,
  baglanti: { zemin: 'rgba(34, 211, 238, 0.11)', kenar: 'rgba(34, 211, 238, 0.9)', metin: 'rgba(34, 211, 238, 1)', nokta: 'rgba(34, 211, 238, 1)' },
  baglantiYok: GRI,
}

const GECIS = { duration: 0.45, ease: 'easeOut' }

function Rozet({ etiket, durum, metin, ek, kucuk }) {
  const s = STIL[durum]
  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={false}
      animate={{ backgroundColor: s.zemin, borderColor: s.kenar }}
      transition={GECIS}
      className={`flex flex-col justify-center border ${
        kucuk ? 'min-h-[76px] gap-1 rounded-xl px-4 py-3' : 'min-h-[100px] gap-1.5 rounded-2xl px-5 py-4'
      }`}
    >
      <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-metin-solgun">
        <motion.span
          className="inline-block h-2 w-2 rounded-full"
          initial={false}
          animate={{ backgroundColor: s.nokta }}
          transition={GECIS}
        />
        {etiket}
      </span>
      <motion.span
        className={`relative block font-light tracking-wide ${kucuk ? 'text-base' : 'text-[20px]'}`}
        initial={false}
        animate={{ color: s.metin }}
        transition={GECIS}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={metin}
            className="block"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
          >
            {metin}
          </motion.span>
        </AnimatePresence>
      </motion.span>
      {ek && <span className="text-sm text-metin-solgun tabular-nums">{ek}</span>}
    </motion.div>
  )
}

export default function DurumGostergesi({ kip = 'sozel', className = '' }) {
  const anlik = useAnlikDurum()
  const { f, c } = useGorunurluk()
  const sayisal = kip === 'sayisal'
  const { t } = useDil()
  if (!f || !c || !anlik.alan) {
    return <div className={`${sayisal ? 'min-h-[76px]' : 'min-h-[100px]'} ${className}`} aria-busy="true" />
  }

  const fT = f[anlik.t]
  const cT = c[anlik.t]
  // Durum anahtarı hem stil hem metin anahtarı (durum.*)
  const gunesDurum = fT > 0.5 ? 'gunesGorunur' : fT > 0 ? 'gunesKismen' : 'golgede'
  const iletisimDurum = cT === 1 ? 'baglanti' : 'baglantiYok'
  const gunes = { durum: gunesDurum, metin: t(`durum.${gunesDurum}`) }
  const iletisim = { durum: iletisimDurum, metin: t(`durum.${iletisimDurum}`) }

  return (
    <div className={`grid ${sayisal ? 'grid-cols-2 gap-3' : 'grid-cols-1 gap-4 sm:grid-cols-2'} ${className}`}>
      <Rozet
        etiket={t('ortak.gunes')}
        {...gunes}
        kucuk={sayisal}
        ek={sayisal ? t('durum.yukseklik', { deger: derece(anlik.sunAlt) }) : null}
      />
      <Rozet
        etiket={t('durum.iletisim')}
        {...iletisim}
        kucuk={sayisal}
        ek={sayisal ? t('durum.dunyaYukseklik', { deger: derece(anlik.earthAlt) }) : null}
      />
    </div>
  )
}
